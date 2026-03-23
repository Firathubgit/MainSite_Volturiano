import { checkAndDeductUserCredit, createProject } from '../lib/db/projects.js';
import crypto from 'crypto';

export default async function initProject(req, res) {
    console.log('[API] /projects/init called');
    try {
        const { prompt, buildId } = req.body;
        const userId = req.user?.id;
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';

        const projectId = buildId || crypto.randomUUID();

        // 1. Credit Check (Now mandatory as route is requireAuth)
        const creditCheck = await checkAndDeductUserCredit(userId);
        if (!creditCheck.allowed) {
            return res.status(402).json({
                success: false,
                error: creditCheck.message,
                code: 'PAYMENT_REQUIRED'
            });
        }

        // 2. Initialize the project in Supabase
        const savedId = await createProject({
            userId,
            prompt,
            buildId: projectId
        });

        return res.status(200).json({
            success: true,
            projectId: savedId || projectId, // Fallback to provided ID if DB fails (soft fail)
            message: 'Project initialized successfully.'
        });

    } catch (err) {
        console.error('[API] /projects/init error:', err);
        res.status(500).json({ success: false, error: 'Internal server error initializing project.' });
    }
}
