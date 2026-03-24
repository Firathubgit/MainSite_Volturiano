import { checkAndDeductUserCredit, createProject } from '../lib/db/projects.js';
import crypto from 'crypto';
import { logger } from '../lib/logger.js';

export default async function initProject(req, res) {
    const userId = req.user?.id;
    logger.info('API', '/projects/init called', { userId });
    
    try {
        const { prompt, buildId } = req.body;
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
        logger.error('API', '/projects/init error', { error: err.message, userId });
        res.status(500).json({ success: false, error: 'Internal server error initializing project.' });
    }
}
