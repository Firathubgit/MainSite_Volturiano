import { supabaseAdmin } from '../supabase-admin.js';
import { logger } from '../logger.js';

const MAX_METADATA_CHARS = 12000;

export function getRequestAuditContext(req = null) {
    if (!req) return {};

    const forwardedFor = req.headers?.['x-forwarded-for'];
    const ipAddress = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : String(forwardedFor || req.ip || req.socket?.remoteAddress || '').split(',')[0].trim();

    return {
        actorUserId: req.userId || req.user?.id || null,
        ipAddress: ipAddress || null,
        userAgent: req.headers?.['user-agent'] || null
    };
}

export function auditLogFromRequest(req, event = {}, options = {}) {
    const context = getRequestAuditContext(req);
    const requestId = req?.id || req?.requestId || req?.headers?.['x-request-id'] || null;
    return writeAuditLog({
        actorUserId: event.actorUserId ?? context.actorUserId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        projectId: event.projectId,
        metadata: {
            ...(event.metadata || {}),
            ...(requestId ? { request_id: Array.isArray(requestId) ? requestId[0] : String(requestId) } : {})
        },
        ipAddress: event.ipAddress ?? context.ipAddress,
        userAgent: event.userAgent ?? context.userAgent
    }, options);
}

export const logAuditEvent = auditLogFromRequest;

export async function writeAuditLog(event = {}, { client = supabaseAdmin } = {}) {
    if (!client || !event.action || !event.entityType) return null;

    try {
        const payload = {
            actor_user_id: event.actorUserId || null,
            action: String(event.action).slice(0, 120),
            entity_type: String(event.entityType).slice(0, 80),
            entity_id: event.entityId ? String(event.entityId).slice(0, 160) : null,
            project_id: event.projectId || null,
            metadata: sanitizeAuditMetadata(event.metadata || {}),
            ip_address: event.ipAddress ? String(event.ipAddress).slice(0, 120) : null,
            user_agent: event.userAgent ? String(event.userAgent).slice(0, 500) : null
        };

        const { data, error } = await client
            .from('audit_logs')
            .insert(payload)
            .select('id')
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        logger.warn('Audit', 'audit log skipped', {
            action: event.action,
            entityType: event.entityType,
            error: error?.message || error
        });
        return null;
    }
}

export function sanitizeAuditMetadata(value) {
    const scrubbed = scrubSensitive(value);
    try {
        const json = JSON.stringify(scrubbed);
        if (json.length <= MAX_METADATA_CHARS) return scrubbed;
        return {
            truncated: true,
            originalSize: json.length,
            preview: json.slice(0, MAX_METADATA_CHARS)
        };
    } catch {
        return { serializationFailed: true };
    }
}

function scrubSensitive(value) {
    if (Array.isArray(value)) return value.map(scrubSensitive);
    if (!value || typeof value !== 'object') return value;

    const output = {};
    for (const [key, raw] of Object.entries(value)) {
        const lower = key.toLowerCase();
        if (
            lower.includes('token') ||
            lower.includes('secret') ||
            lower.includes('password') ||
            lower.includes('authorization') ||
            lower.includes('cookie') ||
            lower.includes('service_role')
        ) {
            output[key] = '[REDACTED]';
        } else {
            output[key] = scrubSensitive(raw);
        }
    }
    return output;
}
