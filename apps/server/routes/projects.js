import { Router } from 'express';
import crypto from 'node:crypto';
import { db, files } from '../lib/store/index.js';
import { createProject, updateProjectForUser } from '../lib/db/projects.js';
import { assertProjectOwner, sendOwnershipError } from '../lib/security/project-access.js';
import { logger } from '../lib/logger.js';

const router = Router();

function hasFiles(snapshot) {
    const value = snapshot?.files;
    if (!value) return false;
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === 'object' && Object.keys(value).length > 0;
}

function handleError(res, err, label) {
    if (err?.name === 'OwnershipError') return sendOwnershipError(res, err);
    logger.error('Projects', `${label} failed`, { error: err?.message });
    return res.status(500).json({ success: false, error: 'Internal server error.' });
}

// List projects that have at least one saved build, newest first.
router.get('/', async (req, res) => {
    const { data, error } = await db
        .from('projects')
        .select('id, name, prompt, build_status, thumbnail_url, created_at, updated_at')
        .eq('user_id', req.user.id)
        .eq('is_committed', true)
        .order('updated_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, projects: data });
});

// Create a project. Safe to call twice with the same buildId.
router.post('/init', async (req, res) => {
    try {
        const { prompt, buildId } = req.body || {};
        const projectId = buildId || crypto.randomUUID();

        if (buildId) {
            const { data: existing } = await db.from('projects').select('id').eq('id', buildId).maybeSingle();
            if (existing) {
                return res.json({ success: true, projectId: buildId, message: 'Project already exists.' });
            }
        }

        const savedId = await createProject({ userId: req.user.id, prompt, buildId: projectId });
        res.json({ success: true, projectId: savedId || projectId, message: 'Project initialized.' });
    } catch (err) {
        handleError(res, err, 'init');
    }
});

// Load a project with its latest non-empty snapshot.
router.get('/get', async (req, res) => {
    try {
        const { projectId } = req.query;
        if (!projectId) return res.status(400).json({ success: false, error: 'projectId is required' });

        const project = await assertProjectOwner(projectId, req.user.id, { select: '*' });

        // A sandbox that timed out can leave an empty snapshot behind, so look
        // a few snapshots back for the newest one that still has files.
        const { data: snapshots } = await db
            .from('snapshots')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(5);

        res.json({ success: true, project, latestSnapshot: snapshots?.find(hasFiles) || null });
    } catch (err) {
        handleError(res, err, 'get');
    }
});

// Identical updates arrive in bursts while a build streams; drop the repeats.
const IDEMPOTENCY_WINDOW_MS = 1000;
const recentUpdates = new Map();

router.post('/update', async (req, res) => {
    try {
        const { buildId, updates } = req.body || {};
        if (!buildId) return res.status(400).json({ success: false, error: 'buildId is required' });

        const cleanUpdates = updates && typeof updates === 'object' ? { ...updates } : {};
        delete cleanUpdates.user_id;
        delete cleanUpdates.id;

        const now = Date.now();
        const key = crypto.createHash('sha256').update(`${buildId}|${JSON.stringify(cleanUpdates)}`).digest('hex');
        const lastSeenAt = recentUpdates.get(key);
        if (lastSeenAt && now - lastSeenAt < IDEMPOTENCY_WINDOW_MS) {
            return res.json({ success: true, deduped: true });
        }
        recentUpdates.set(key, now);
        for (const [k, ts] of recentUpdates.entries()) {
            if (ts < now - IDEMPOTENCY_WINDOW_MS * 20) recentUpdates.delete(k);
        }

        await updateProjectForUser(buildId, req.user.id, cleanUpdates);
        res.json({ success: true });
    } catch (err) {
        handleError(res, err, 'update');
    }
});

// Rename a project.
router.patch('/:id', async (req, res) => {
    try {
        const name = String(req.body?.name || '').trim().slice(0, 120);
        if (!name) return res.status(400).json({ success: false, error: 'name is required' });
        await updateProjectForUser(req.params.id, req.user.id, { name });
        res.json({ success: true });
    } catch (err) {
        handleError(res, err, 'rename');
    }
});

// Delete a project with its snapshots, agent history and stored files.
router.delete('/:id', async (req, res) => {
    try {
        const projectId = req.params.id;
        await assertProjectOwner(projectId, req.user.id);

        const { data: sessions } = await db.from('agent_sessions').select('id').eq('project_id', projectId);
        const sessionIds = (sessions || []).map((session) => session.id);
        if (sessionIds.length > 0) {
            await db.from('agent_messages').delete().in('session_id', sessionIds);
            await db.from('agent_tool_events').delete().in('session_id', sessionIds);
            for (const sessionId of sessionIds) files.remove('reference-images', sessionId);
        }
        await db.from('agent_turns').delete().eq('project_id', projectId);
        await db.from('agent_undo_snapshots').delete().eq('project_id', projectId);
        await db.from('agent_memory').delete().eq('project_id', projectId);
        await db.from('agent_sessions').delete().eq('project_id', projectId);
        await db.from('snapshots').delete().eq('project_id', projectId);
        await db.from('projects').delete().eq('id', projectId);
        files.remove('project-thumbnails', projectId);

        res.json({ success: true });
    } catch (err) {
        handleError(res, err, 'delete');
    }
});

export default router;
