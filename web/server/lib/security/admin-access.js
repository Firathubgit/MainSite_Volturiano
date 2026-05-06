import { supabaseAdmin } from '../supabase-admin.js';
import { logger } from '../logger.js';
import { errorControl, logControl, warnControl } from './control-log.js';

export async function isBuilderAdmin(userId, client = supabaseAdmin) {
    if (!client || !userId) {
        logger.warn('AdminControl', 'Admin check skipped because client or user id is missing', {
            hasClient: Boolean(client),
            hasUserId: Boolean(userId)
        });
        return false;
    }

    logger.info('AdminControl', 'Admin role lookup started', { userId });

    const { data, error } = await client
        .from('profiles')
        .select('admin_role')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        logger.error('AdminControl', 'Admin role lookup failed', {
            userId,
            error: error.message || error
        });
        return false;
    }

    const allowed = Boolean(data?.admin_role);
    logger.info('AdminControl', 'Admin role lookup completed', { userId, allowed });
    return allowed;
}

export async function requireBuilderAdmin(req, res, next) {
    if (!supabaseAdmin) {
        errorControl('AdminControl', 'Admin verification failed: database not configured', req);
        return res.status(503).json({ error: 'Database not configured' });
    }

    const userId = req.userId || req.user?.id;
    if (!userId) {
        warnControl('AdminControl', 'Admin verification blocked unauthenticated request', req);
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        logControl('AdminControl', 'Admin verification started', req);
        const allowed = await isBuilderAdmin(userId);
        if (!allowed) {
            warnControl('AdminControl', 'Admin verification denied non-admin user', req);
            return res.status(403).json({ error: 'Admin access required' });
        }

        logControl('AdminControl', 'Admin verification passed', req);
        return next();
    } catch (err) {
        errorControl('AdminControl', 'Admin verification failed unexpectedly', req, {
            error: err?.message || String(err)
        });
        return res.status(500).json({ error: 'Admin verification failed' });
    }
}
