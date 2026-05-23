import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { assertPublishedSiteOwner, sendOwnershipError } from '../lib/security/project-access.js';
import { updateProjectForUser } from '../lib/db/projects.js';
import { logAuditEvent } from '../lib/audit/audit-logger.js';

const router = Router();

function isMissingCommitColumnError(error) {
    const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
    return /is_committed|committed_at|schema cache/i.test(message);
}

function isVisibleDashboardProject(project) {
    if (!project) return false;
    if (project.is_committed === true) return true;
    if (project.is_committed === false) return false;

    // Migration fallback: hide abandoned in-flight rows even before the new
    // committed flag exists in a copied/staging database.
    const hasGeneratedFiles = Array.isArray(project.generated_files)
        ? project.generated_files.length > 0
        : project.generated_files && typeof project.generated_files === 'object'
            ? Object.keys(project.generated_files).length > 0
            : Boolean(project.generated_files);

    return ['preview', 'published'].includes(project.build_status)
        || Boolean(project.thumbnail_url)
        || hasGeneratedFiles;
}

// ─────────────────────────────────────────────────────────────
// GET /api/dashboard/projects
// Returns all projects for the authenticated user
// ─────────────────────────────────────────────────────────────
router.get('/projects', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data, error } = await supabaseAdmin
            .from('projects')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, projects: (data || []).filter(isVisibleDashboardProject) });
    } catch (err) {
        console.error('[Dashboard] Error fetching projects:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/dashboard/stats
// Returns summary stats for the dashboard
// ─────────────────────────────────────────────────────────────
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Total visible projects count. In-flight build rows stay hidden
        // until the first successful snapshot commits them.
        let { data: projectRows, error: pError } = await supabaseAdmin
            .from('projects')
            .select('id,is_committed,build_status,thumbnail_url')
            .eq('user_id', userId);

        if (pError && isMissingCommitColumnError(pError)) {
            ({ data: projectRows, error: pError } = await supabaseAdmin
                .from('projects')
                .select('id,build_status,thumbnail_url,generated_files')
                .eq('user_id', userId));
        }

        // 2. Total published sites count
        const { count: publishedCount, error: psError } = await supabaseAdmin
            .from('published_sites')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        // 3. Current credits (remaining)
        const { data: profile, error: profError } = await supabaseAdmin
            .from('profiles')
            .select('total_credits_remaining')
            .eq('id', userId)
            .single();

        if (pError || psError || profError) {
            console.error('[Dashboard] Stats error:', { pError, psError, profError });
        }

        res.json({
            success: true,
            stats: {
                totalProjects: (projectRows || []).filter(isVisibleDashboardProject).length,
                totalPublished: publishedCount || 0,
                credits: profile?.total_credits_remaining || 0
            }
        });
    } catch (err) {
        console.error('[Dashboard] Error fetching stats:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/dashboard/projects/:id
// Securely delete a project if owned by the user, and clean up dependencies
// ─────────────────────────────────────────────────────────────
router.delete('/projects/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const projectId = req.params.id;
        console.log(`\n[Dashboard] 🗑️ INIT DELETION: Project ${projectId} for User ${userId}`);

        // 1. Verify ownership and fetch details for cleanup
        const { data: project, error: fetchErr } = await supabaseAdmin
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (fetchErr || !project) {
            console.warn(`[Dashboard] ❌ DELETION ABORTED: Project not found or bad auth.`);
            return res.status(404).json({ success: false, error: 'Project not found or not owned by user' });
        }
        console.log(`[Dashboard] ✅ Ownership verified. Project Name: "${project.name}"`);

        // 2. Clean up any published site files in storage
        console.log(`[Dashboard] 🧹 PHASE 1: Checking for published site artifacts...`);
        const { data: publishedSites } = await supabaseAdmin
            .from('published_sites')
            .select('*')
            .eq('project_id', projectId);

        if (publishedSites && publishedSites.length > 0) {
            console.log(`[Dashboard] Found ${publishedSites.length} published sites. Preparing to wipe storage.`);
            for (const site of publishedSites) {
                const bucketName = site.storage_bucket || 'published-sites';
                const folderSlug = site.storage_path ? site.storage_path.replace(/\/$/, '') : site.slug;
                try {
                    const { data: files } = await supabaseAdmin.storage.from(bucketName).list(folderSlug);
                    if (files && files.length > 0) {
                        const pathsToRemove = files.map(file => `${folderSlug}/${file.name}`);
                        await supabaseAdmin.storage.from(bucketName).remove(pathsToRemove);
                        console.log(`[Dashboard] 🗑️ Emptied folder /${folderSlug} in bucket '${bucketName}' (${files.length} files)`);
                    }
                    await supabaseAdmin.storage.from(bucketName).remove([folderSlug]);
                    console.log(`[Dashboard] 🗑️ Deleted folder /${folderSlug} in bucket '${bucketName}'`);
                } catch (e) {
                    console.warn(`[Dashboard] ⚠️ Warn: Could not completely clear storage for ${folderSlug}:`, e.message);
                }
            }
        } else {
            console.log(`[Dashboard] No published sites attached to this project. Skipping site file deletion.`);
        }

        // 3. Clean up the project thumbnail image
        console.log(`[Dashboard] 🧹 PHASE 2: Checking for project thumbnail...`);
        if (project.thumbnail_url) {
            try {
                // Determine filename by extracting it from the full public URL string
                const filenameMatch = project.thumbnail_url.match(/\/project-thumbnails\/(.*)$/);
                if (filenameMatch && filenameMatch[1]) {
                    const filename = filenameMatch[1];
                    const { error: thumbErr } = await supabaseAdmin.storage.from('project-thumbnails').remove([filename]);
                    if (!thumbErr) {
                         console.log(`[Dashboard] 🗑️ Deleted thumbnail image: ${filename}`);
                    } else {
                         console.warn(`[Dashboard] ⚠️ Failed to delete thumbnail ${filename}:`, thumbErr.message);
                    }
                }
            } catch (e) {
                console.warn('[Dashboard] ⚠️ Warn: Exception while deleting thumbnail image', e.message);
            }
        } else {
             console.log(`[Dashboard] No thumbnail URL found on project. Skipping thumbnail deletion.`);
        }

        // 4. Delete snapshots
        console.log(`[Dashboard] 🧹 PHASE 3: Wiping conversational snapshots...`);
        const { error: snapErr } = await supabaseAdmin.from('snapshots').delete().eq('project_id', projectId);
        if (snapErr) console.warn('[Dashboard] ⚠️ Failed to delete snapshots:', snapErr.message);
        else console.log(`[Dashboard] 🗑️ Wiped all snapshots associated with the project.`);

        // 5. Delete published site records
        console.log(`[Dashboard] 🧹 PHASE 4: Removing published_sites records from DB...`);
        const { error: pubReqErr } = await supabaseAdmin.from('published_sites').delete().eq('project_id', projectId);
        if (pubReqErr) console.warn('[Dashboard] ⚠️ Failed to delete published_sites db rows:', pubReqErr.message);
        else console.log(`[Dashboard] 🗑️ Removed published_sites row bindings.`);

        // 6. Finally delete the project record itself
        console.log(`[Dashboard] 🧹 PHASE 5: Deleting root project record...`);
        const { error } = await supabaseAdmin
            .from('projects')
            .delete()
            .eq('id', projectId)
            .eq('user_id', userId);

        if (error) {
             console.error(`[Dashboard] ❌ FATAL DELETION ERROR: Could not delete root project:`, error.message);
             throw error;
        }

        console.log(`[Dashboard] ✅ COMPLETE: Project ${projectId} totally vaporized.\n`);
        void logAuditEvent(req, {
            action: 'project_deleted',
            entityType: 'project',
            entityId: projectId,
            projectId,
            metadata: {
                projectName: project.name,
                publishedSiteCount: publishedSites?.length || 0,
                hadThumbnail: Boolean(project.thumbnail_url)
            }
        });
        res.json({ success: true, message: 'Project and all associated data deleted successfully' });
    } catch (err) {
        console.error('\n[Dashboard] ❌ DELETION SEQUENCE FAILED:', err.message);
        res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/dashboard/sites/:id/toggle
// Toggles the active/paused status of a live site
// ─────────────────────────────────────────────────────────────
router.post('/sites/:id/toggle', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const siteId = req.params.id;
        const { status } = req.body;

        const site = await assertPublishedSiteOwner(siteId, userId);

        const { error } = await supabaseAdmin
            .from('published_sites')
            .update({ status })
            .eq('id', siteId)
            .eq('user_id', userId);

        if (error) throw error;

        void logAuditEvent(req, {
            action: status === 'active' ? 'published_site_enabled' : 'published_site_unpublished',
            entityType: 'published_site',
            entityId: siteId,
            projectId: site.project_id || null,
            metadata: { status }
        });
        res.json({ success: true, message: `Site status updated to ${status}` });
    } catch (err) {
        if (err?.name === 'OwnershipError') {
            return sendOwnershipError(res, err);
        }
        console.error('[Dashboard] Error toggling site status:', err.message);
        res.status(500).json({ success: false, error: 'Failed to toggle site status' });
    }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/dashboard/sites/:id
// Completely unpublishes and deletes a live site
// ─────────────────────────────────────────────────────────────
router.delete('/sites/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const siteId = req.params.id;

        // 1. Fetch site and verify ownership
        const site = await assertPublishedSiteOwner(siteId, userId, { select: '*' });

        const bucketName = site.storage_bucket || 'published-sites';
        const folderSlug = site.storage_path ? site.storage_path.replace(/\/$/, '') : site.slug;

        // 2. Delete files from Supabase Storage bucket (Clear the folder)
        try {
            const { data: files } = await supabaseAdmin.storage.from(bucketName).list(folderSlug);
            if (files && files.length > 0) {
                const pathsToRemove = files.map(file => `${folderSlug}/${file.name}`);
                await supabaseAdmin.storage.from(bucketName).remove(pathsToRemove);
            }
            // Remove the empty folder object 
            await supabaseAdmin.storage.from(bucketName).remove([folderSlug]);
        } catch (storageErr) {
            console.warn('[Dashboard] Error clearing files from storage:', storageErr.message);
        }

        // 3. Delete from DB
        const { error: deleteErr } = await supabaseAdmin
            .from('published_sites')
            .delete()
            .eq('id', siteId)
            .eq('user_id', userId);

        if (deleteErr) throw deleteErr;

        // 4. Update the related project record, if it exists
        if (site.project_id) {
            await updateProjectForUser(site.project_id, userId, {
                build_status: 'draft',
                published_url: null,
                published_slug: null
            });
        }

        void logAuditEvent(req, {
            action: 'published_site_deleted',
            entityType: 'published_site',
            entityId: siteId,
            projectId: site.project_id || null,
            metadata: {
                slug: site.slug,
                storageBucket: bucketName,
                storagePath: site.storage_path || null
            }
        });
        res.json({ success: true, message: 'Site unpublished and deleted successfully' });
    } catch (err) {
        if (err?.name === 'OwnershipError') {
            return sendOwnershipError(res, err);
        }
        console.error('[Dashboard] Error deleting live site:', err.message);
        res.status(500).json({ success: false, error: 'Failed to delete site' });
    }
});

export default router;
