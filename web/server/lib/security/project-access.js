import { db } from '../store/index.js';
import { logger } from '../logger.js';

export class OwnershipError extends Error {
    constructor(status, message, code = 'ACCESS_DENIED') {
        super(message);
        this.name = 'OwnershipError';
        this.status = status;
        this.code = code;
    }
}

export function sendOwnershipError(res, error, fallbackMessage = 'Access denied') {
    const normalized = error instanceof OwnershipError
        ? error
        : new OwnershipError(500, error?.message || fallbackMessage, 'ACCESS_CHECK_FAILED');
    return res.status(normalized.status || 500).json({
        success: false,
        error: normalized.message || fallbackMessage,
        code: normalized.code || 'ACCESS_DENIED'
    });
}

/**
 * Build the ownership guard for a given store. Tests pass their own store.
 *
 * With one local user this mostly confirms that the project exists. The
 * user id comparison is kept so that adding real accounts later does not
 * need a new check at every call site.
 */
export function createProjectAccessGuards(client = db) {
    async function assertProjectOwner(projectId, userId, options = {}) {
        const { select = 'id,user_id,name,thumbnail_url' } = options;

        if (!userId) throw new OwnershipError(401, 'A user is required', 'AUTH_REQUIRED');
        if (!projectId) throw new OwnershipError(400, 'projectId is required', 'BAD_REQUEST');

        const { data: project, error } = await client
            .from('projects')
            .select(select)
            .eq('id', projectId)
            .maybeSingle();

        if (error) {
            logger.error('ProjectAccess', 'Project lookup failed', { projectId, error: error.message || error });
            throw new OwnershipError(500, 'Failed to verify project ownership', 'PROJECT_LOOKUP_FAILED');
        }
        if (!project) throw new OwnershipError(404, 'Project not found', 'PROJECT_NOT_FOUND');
        if (project.user_id && project.user_id !== userId) {
            logger.warn('ProjectAccess', 'Blocked access to a project owned by another user', { projectId, userId });
            throw new OwnershipError(403, 'Access denied to this project', 'PROJECT_ACCESS_DENIED');
        }
        return project;
    }

    return { assertProjectOwner };
}

export const { assertProjectOwner } = createProjectAccessGuards();
