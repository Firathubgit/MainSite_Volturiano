import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditLogFromRequest, sanitizeAuditMetadata, writeAuditLog } from '../lib/audit/audit-logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const serverRoot = path.resolve(root, 'server');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function testAuditLoggerBestEffort() {
    const inserted = [];
    const okClient = {
        from(table) {
            return {
                insert(payload) {
                    inserted.push({ table, payload });
                    return {
                        select() {
                            return {
                                single: async () => ({ data: { id: 'audit-1' }, error: null })
                            };
                        }
                    };
                }
            };
        }
    };

    const result = await writeAuditLog({
        actorUserId: 'user-1',
        action: 'test_event',
        entityType: 'test_entity',
        entityId: 'entity-1',
        metadata: {
            token: 'secret',
            nested: { authorization: 'bearer abc', safe: true }
        },
        ipAddress: '127.0.0.1',
        userAgent: 'regression'
    }, { client: okClient });

    assert(result?.id === 'audit-1', 'audit logger should return inserted id');
    assert(inserted[0]?.table === 'audit_logs', 'audit logger should write to audit_logs');
    assert(inserted[0].payload.metadata.token === '[REDACTED]', 'audit metadata should redact token fields');
    assert(inserted[0].payload.metadata.nested.authorization === '[REDACTED]', 'audit metadata should redact nested auth fields');

    const failingClient = {
        from() {
            return {
                insert() {
                    return {
                        select() {
                            return {
                                single: async () => ({ data: null, error: new Error('forced failure') })
                            };
                        }
                    };
                }
            };
        }
    };

    const failed = await writeAuditLog({
        action: 'test_failure',
        entityType: 'test_entity'
    }, { client: failingClient });
    assert(failed === null, 'audit logger should be best effort on insert failure');
}

async function testRequestAuditContext() {
    const inserted = [];
    const client = {
        from() {
            return {
                insert(payload) {
                    inserted.push(payload);
                    return {
                        select() {
                            return {
                                single: async () => ({ data: { id: 'audit-2' }, error: null })
                            };
                        }
                    };
                }
            };
        }
    };

    await auditLogFromRequest({
        userId: 'request-user',
        headers: {
            'x-forwarded-for': '203.0.113.10, 198.51.100.1',
            'user-agent': 'audit-test'
        }
    }, {
        action: 'request_event',
        entityType: 'profile',
        entityId: 'request-user'
    }, { client });

    assert(inserted[0].actor_user_id === 'request-user', 'request audit should capture actor user');
    assert(inserted[0].ip_address === '203.0.113.10', 'request audit should capture first forwarded IP');
}

function testMetadataTruncation() {
    const safe = sanitizeAuditMetadata({ large: 'x'.repeat(13000) });
    assert(safe.truncated === true, 'large metadata should be truncated');
}

function testStaticWiring() {
    const migration = read('server/migrations/017_audit_logs_retention.sql');
    assert(migration.includes('CREATE TABLE IF NOT EXISTS public.audit_logs'), 'migration should create audit_logs');
    assert(migration.includes('retention_until'), 'migration should add retention_until columns');
    assert(migration.includes('purge_expired_runtime_data'), 'migration should include purge function');
    assert(migration.includes('public.is_builder_admin()'), 'migration should use admin_role helper');

    const sessionStore = read('server/lib/agent/session-store.js');
    assert(sessionStore.includes('retention_until'), 'session-store should persist retention_until');
    assert(sessionStore.includes('RETENTION_DAYS.agentMessages'), 'agent messages should use retention policy');
    assert(sessionStore.includes('RETENTION_DAYS.agentToolEvents'), 'tool events should use retention policy');

    const memoryManager = read('server/lib/agent/memory-manager.js');
    assert(memoryManager.includes('RETENTION_DAYS.agentMemory'), 'agent memory should use retention policy');

    const projects = read('server/lib/db/projects.js');
    assert(projects.includes('RETENTION_DAYS.snapshots'), 'snapshots should use retention policy');

    const admin = read('server/routes/admin.js');
    assert(admin.includes("from '../lib/security/admin-access.js'"), 'admin routes should use shared admin helper');
    assert(admin.includes('admin_component_status_changed'), 'admin component status changes should be audited');
    assert(admin.includes('admin_template_status_changed'), 'admin template status changes should be audited');

    const dashboard = read('server/routes/dashboard.js');
    assert(dashboard.includes('project_deleted'), 'project delete should be audited');
    assert(dashboard.includes('published_site_unpublished'), 'site unpublish should be audited');
    assert(dashboard.includes('published_site_deleted'), 'site delete should be audited');

    const publish = read('server/routes/publish.js');
    assert(publish.includes('status(410)'), 'legacy local publish route should be retired for new writes');

    const settings = read('server/routes/settings.js');
    assert(settings.includes('account_data_exported'), 'account export should be audited');
    assert(settings.includes('account_delete_requested'), 'account delete should be audited');

    const webhooks = read('server/routes/webhooks.js');
    assert(webhooks.includes('stripe_webhook_processed'), 'Stripe webhook processing should be audited');
}

async function main() {
    await testAuditLoggerBestEffort();
    await testRequestAuditContext();
    testMetadataTruncation();
    testStaticWiring();
    console.log('Audit/retention regression checks passed.');
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
