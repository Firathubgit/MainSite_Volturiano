import { updateProject } from '../lib/db/projects.js';
import { createHash } from 'node:crypto';

const IDEMPOTENCY_WINDOW_MS = 1000;
const recentUpdateHashes = new Map();

function stableNormalize(value) {
    if (Array.isArray(value)) return value.map(stableNormalize);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        const out = {};
        for (const key of Object.keys(value).sort()) {
            out[key] = stableNormalize(value[key]);
        }
        return out;
    }
    return value;
}

function requestHash(userId, buildId, updates) {
    const normalized = stableNormalize(updates || {});
    return createHash('sha256')
        .update(`${userId || 'anonymous'}|${buildId}|${JSON.stringify(normalized)}`)
        .digest('hex');
}

export default async function updateProjectRoute(req, res) {
    console.log('[API] /projects/update called');
    try {
        const { buildId, updates } = req.body;
        const userId = req.user?.id; // from optionalAuth

        if (!buildId) {
            return res.status(400).json({ success: false, error: 'buildId is required' });
        }

        // Optional: We can strictly enforce that updates don't alter user_id
        const cleanUpdates = updates && typeof updates === 'object' ? { ...updates } : {};
        if (cleanUpdates.user_id) {
            delete cleanUpdates.user_id;
        }

        const now = Date.now();
        const dedupeKey = requestHash(userId, buildId, cleanUpdates);
        const lastSeenAt = recentUpdateHashes.get(dedupeKey);
        if (lastSeenAt && now - lastSeenAt < IDEMPOTENCY_WINDOW_MS) {
            console.log('[API] /projects/update deduped (same payload within %dms)', IDEMPOTENCY_WINDOW_MS);
            return res.status(200).json({ success: true, deduped: true, message: 'Duplicate update ignored.' });
        }
        recentUpdateHashes.set(dedupeKey, now);
        const cleanupCutoff = now - (IDEMPOTENCY_WINDOW_MS * 20);
        for (const [key, ts] of recentUpdateHashes.entries()) {
            if (ts < cleanupCutoff) recentUpdateHashes.delete(key);
        }

        // Phase S2: We update the project data dynamically as it generates
        await updateProject(buildId, cleanUpdates);

        return res.status(200).json({ success: true, message: 'Project updated successfully.' });

    } catch (err) {
        console.error('[API] /projects/update error:', err);
        res.status(500).json({ success: false, error: 'Internal server error updating project.' });
    }
}
