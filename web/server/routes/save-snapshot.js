import { createSnapshotForUser } from '../lib/db/projects.js';
import { captureAndUploadScreenshot } from '../lib/screenshot.js';
import { updateProjectForUser } from '../lib/db/projects.js';
import { sendOwnershipError } from '../lib/security/project-access.js';

export default async function saveSnapshot(req, res) {
    try {
        const { projectId, chatIndex, text, files, packages, designSystem, componentPlan, sandboxUrl, sandboxId } = req.body;
        const userId = req.user.id; // guaranteed by requireAuth

        if (!projectId) {
            return res.status(400).json({ success: false, error: 'projectId is required' });
        }

        // ── GUARD: Never save a snapshot with 0 files ──
        // Support both object-based (new) and array-based (legacy) file storage
        const hasFiles = files && (
            (Array.isArray(files) && files.length > 0) || 
            (typeof files === 'object' && !Array.isArray(files) && Object.keys(files).length > 0)
        );

        if (!hasFiles) {
            console.warn(`[Snapshot Endpoint] ⚠️ BLOCKED empty snapshot for project ${projectId} at chatIndex ${chatIndex}. Sandbox likely timed out.`);
            return res.status(200).json({ success: true, skipped: true, reason: 'Empty snapshot blocked' });
        }

        await createSnapshotForUser({
            projectId,
            userId,
            chatIndex,
            text,
            files,
            packages,
            designSystem,
            componentPlan
        });

        console.log(`[Snapshot Endpoint] Checking sandbox URL for screenshot trigger:`, sandboxUrl);
        // Fire and forget thumbnail capture
        if (sandboxUrl) {
            console.log(`[Snapshot Endpoint] Firing background screenshot job for url: ${sandboxUrl}`);
            captureAndUploadScreenshot(sandboxUrl, projectId).then(thumbnailUrl => {
                if (thumbnailUrl) {
                    return updateProjectForUser(projectId, userId, { thumbnail_url: thumbnailUrl });
                }
                return null;
            }).catch(e => console.error('[API] Screenshot background job failed:', e));
        } else {
            console.log(`[Snapshot Endpoint] ⚠️ No sandboxUrl provided! Skipping screenshot generation.`);
        }

        return res.status(200).json({ success: true });

    } catch (err) {
        if (err?.name === 'OwnershipError') {
            return sendOwnershipError(res, err);
        }
        console.error('[API] /snapshots error:', err);
        res.status(500).json({ success: false, error: 'Internal server error saving snapshot.' });
    }
}

