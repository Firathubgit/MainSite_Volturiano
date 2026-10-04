import { createProject } from '../lib/db/projects.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import crypto from 'crypto';
import { logger } from '../lib/logger.js';

export default async function initProject(req, res) {
    const userId = req.user?.id;
    logger.info('API', '/projects/init called', { userId });
    
    try {
        const { prompt, buildId } = req.body;
        const projectId = buildId || crypto.randomUUID();

        // 0. Idempotency Check (prevent double-credit deduction on simultaneous clicks)
        if (buildId && supabaseAdmin) {
            const { data: existing } = await supabaseAdmin
                .from('projects')
                .select('id')
                .eq('id', buildId)
                .maybeSingle();

            if (existing) {
                console.log(`[initProject] BuildId ${buildId} already exists`);
                return res.status(200).json({
                    success: true,
                    projectId: buildId,
                    message: 'Project already exists.'
                });
            }
        }

        // Credits are charged once, by /api/agent/initial-build. Project init is free
        // so a single generation never double-deducts (init + build used to charge twice).

        // 1. Initialize the project in Supabase
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
