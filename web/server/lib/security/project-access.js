import { supabaseAdmin } from '../supabase-admin.js';
import { logger } from '../logger.js';

export class OwnershipError extends Error {
    constructor(status, message, code = 'ACCESS_DENIED') {
        super(message);
        this.name = 'OwnershipError';
        this.status = status;
        this.code = code;
    }
}

function requireClient(client) {
    if (!client) {
        logger.error('OwnershipControl', 'Ownership check failed: database client unavailable');
        throw new OwnershipError(503, 'Database not configured', 'DATABASE_UNAVAILABLE');
    }
}

function requireIdentity(userId) {
    if (!userId) {
        logger.warn('OwnershipControl', 'Ownership check failed: missing authenticated user');
        throw new OwnershipError(401, 'Authentication required', 'AUTH_REQUIRED');
    }
}

function requireId(id, label) {
    if (!id) {
        logger.warn('OwnershipControl', 'Ownership check failed: missing scoped id', { label });
        throw new OwnershipError(400, `${label} is required`, 'BAD_REQUEST');
    }
}

function toOwnershipError(error, fallbackMessage = 'Access check failed') {
    if (error instanceof OwnershipError) return error;
    return new OwnershipError(500, error?.message || fallbackMessage, 'ACCESS_CHECK_FAILED');
}

export function sendOwnershipError(res, error, fallbackMessage = 'Access denied') {
    const normalized = toOwnershipError(error, fallbackMessage);
    return res.status(normalized.status || 500).json({
        success: false,
        error: normalized.message || fallbackMessage,
        code: normalized.code || 'ACCESS_DENIED'
    });
}

export function createProjectAccessGuards(client = supabaseAdmin) {
    async function assertProjectOwner(projectId, userId, options = {}) {
        const { allowAnonymous = false, select = 'id,user_id,name,thumbnail_url' } = options;
        requireClient(client);
        requireIdentity(userId);
        requireId(projectId, 'projectId');

        logger.info('OwnershipControl', 'Project ownership check started', {
            projectId,
            userId,
            allowAnonymous
        });

        const { data: project, error } = await client
            .from('projects')
            .select(select)
            .eq('id', projectId)
            .maybeSingle();

        if (error) {
            logger.error('OwnershipControl', 'Project ownership check query failed', {
                projectId,
                userId,
                error: error.message || error
            });
            throw new OwnershipError(500, 'Failed to verify project ownership', 'PROJECT_LOOKUP_FAILED');
        }

        if (!project) {
            logger.warn('OwnershipControl', 'Project ownership check found no project', { projectId, userId });
            throw new OwnershipError(404, 'Project not found', 'PROJECT_NOT_FOUND');
        }

        if (!allowAnonymous && !project.user_id) {
            logger.warn('OwnershipControl', 'Project ownership check blocked unowned project', { projectId, userId });
            throw new OwnershipError(403, 'Project is not owned by the authenticated user', 'PROJECT_UNOWNED');
        }

        if (project.user_id && project.user_id !== userId) {
            logger.warn('OwnershipControl', 'Project ownership check denied cross-user access', {
                projectId,
                userId,
                ownerUserId: project.user_id
            });
            throw new OwnershipError(403, 'Access denied to this project', 'PROJECT_ACCESS_DENIED');
        }

        logger.info('OwnershipControl', 'Project ownership check passed', { projectId, userId });
        return project;
    }

    async function assertSnapshotProjectOwner(projectId, userId, options = {}) {
        return assertProjectOwner(projectId, userId, options);
    }

    async function assertPublishedSiteOwner(siteId, userId, options = {}) {
        const { select = 'id,user_id,project_id,slug,storage_bucket,storage_path,status' } = options;
        requireClient(client);
        requireIdentity(userId);
        requireId(siteId, 'siteId');

        logger.info('OwnershipControl', 'Published site ownership check started', { siteId, userId });

        const { data: site, error } = await client
            .from('published_sites')
            .select(select)
            .eq('id', siteId)
            .maybeSingle();

        if (error) {
            logger.error('OwnershipControl', 'Published site ownership check query failed', {
                siteId,
                userId,
                error: error.message || error
            });
            throw new OwnershipError(500, 'Failed to verify published site ownership', 'SITE_LOOKUP_FAILED');
        }

        if (!site) {
            logger.warn('OwnershipControl', 'Published site ownership check found no site', { siteId, userId });
            throw new OwnershipError(404, 'Site not found', 'SITE_NOT_FOUND');
        }

        if (site.user_id !== userId) {
            logger.warn('OwnershipControl', 'Published site ownership check denied cross-user access', {
                siteId,
                userId,
                ownerUserId: site.user_id
            });
            throw new OwnershipError(403, 'Access denied to this site', 'SITE_ACCESS_DENIED');
        }

        logger.info('OwnershipControl', 'Published site ownership check passed', { siteId, userId });
        return site;
    }

    return {
        assertProjectOwner,
        assertSnapshotProjectOwner,
        assertPublishedSiteOwner
    };
}

const defaultGuards = createProjectAccessGuards();

export const assertProjectOwner = defaultGuards.assertProjectOwner;
export const assertSnapshotProjectOwner = defaultGuards.assertSnapshotProjectOwner;
export const assertPublishedSiteOwner = defaultGuards.assertPublishedSiteOwner;
