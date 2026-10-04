import { createSnapshotForUser, updateProjectForUser } from '../lib/db/projects.js';
import { captureAndUploadScreenshot } from '../lib/screenshot.js';
import { sendOwnershipError } from '../lib/security/project-access.js';

export default async function saveSnapshot(req, res) {
    try {
        const { projectId, chatIndex, text, files, packages, designSystem, componentPlan, sandboxUrl } = req.body;
        const userId = req.user.id;

        if (!projectId) {
            return res.status(400).json({ success: false, error: 'projectId is required' });
        }

        // Never store an empty snapshot. It usually means the sandbox timed out,
        // and restoring it later would wipe the project.
        const hasFiles = files && (
            (Array.isArray(files) && files.length > 0) ||
            (typeof files === 'object' && !Array.isArray(files) && Object.keys(files).length > 0)
        );
        if (!hasFiles) {
            console.warn(`[Snapshot] Skipped empty snapshot for project ${projectId} at chat index ${chatIndex}.`);
            return res.json({ success: true, skipped: true, reason: 'Empty snapshot blocked' });
        }

        await createSnapshotForUser({ projectId, userId, chatIndex, text, files, packages, designSystem, componentPlan });

        // The project thumbnail is captured in the background and is optional.
        if (sandboxUrl) {
            captureAndUploadScreenshot(sandboxUrl, projectId)
                .then((thumbnailUrl) => (thumbnailUrl ? updateProjectForUser(projectId, userId, { thumbnail_url: thumbnailUrl }) : null))
                .catch((e) => console.warn('[Snapshot] Thumbnail capture skipped:', e.message));
        }

        return res.json({ success: true });
    } catch (err) {
        if (err?.name === 'OwnershipError') return sendOwnershipError(res, err);
        console.error('[API] /snapshots save failed:', err.message);
        res.status(500).json({ success: false, error: 'Internal server error saving snapshot.' });
    }
}
