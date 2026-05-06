import { supabaseAdmin } from './supabase-admin.js';
import { logger } from './logger.js';

const TABLE_CHECKS = [
    { table: 'audit_logs', select: 'id', label: 'audit log table' },
    { table: 'consent_events', select: 'id', label: 'consent log table' },
    { table: 'gdpr_requests', select: 'id', label: 'GDPR request table' },
    { table: 'stripe_webhook_events', select: 'id,stripe_event_id,status', label: 'Stripe webhook event ledger' },
    { table: 'refund_requests', select: 'id,status', label: 'refund request table' },
    { table: 'component_reports', select: 'id,status', label: 'component report table' },
    { table: 'copyright_takedown_requests', select: 'id,status', label: 'copyright takedown table' },
    { table: 'agent_messages', select: 'id,retention_until', label: 'agent message retention column' },
    { table: 'agent_tool_events', select: 'id,retention_until', label: 'agent tool retention column' },
    { table: 'agent_memory', select: 'id,retention_until', label: 'agent memory retention column' },
    { table: 'snapshots', select: 'id,retention_until', label: 'snapshot retention column' },
    { table: 'public_profile_summaries', select: 'id,display_name,username,avatar_url', label: 'public profile summary view' }
];

export async function logLaunchReadinessChecks(client = supabaseAdmin) {
    if (!client) {
        logger.warn('LaunchReadiness', 'Database readiness checks skipped: Supabase admin client is not configured');
        return;
    }

    logger.info('LaunchReadiness', 'Database readiness checks started', {
        checks: TABLE_CHECKS.map(check => check.table)
    });

    const results = await Promise.all(TABLE_CHECKS.map(async (check) => {
        try {
            const { error } = await client
                .from(check.table)
                .select(check.select)
                .limit(1);

            if (error) throw error;

            logger.info('LaunchReadiness', 'Database readiness check passed', {
                table: check.table,
                label: check.label
            });
            return { table: check.table, ok: true };
        } catch (error) {
            logger.error('LaunchReadiness', 'Database readiness check failed', {
                table: check.table,
                label: check.label,
                error: error?.message || String(error)
            });
            return { table: check.table, ok: false };
        }
    }));

    const failed = results.filter(result => !result.ok).map(result => result.table);
    if (failed.length > 0) {
        logger.warn('LaunchReadiness', 'Database readiness checks completed with failures', {
            failed
        });
        return;
    }

    logger.info('LaunchReadiness', 'Database readiness checks completed successfully', {
        checked: results.length
    });
}
