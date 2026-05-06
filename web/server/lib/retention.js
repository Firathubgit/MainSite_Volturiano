const DEFAULT_RETENTION_DAYS = {
    agentMessages: 30,
    agentToolEvents: 14,
    agentMemory: 180,
    snapshots: 90
};

const ENV_KEYS = {
    agentMessages: 'AGENT_MESSAGE_RETENTION_DAYS',
    agentToolEvents: 'AGENT_TOOL_EVENT_RETENTION_DAYS',
    agentMemory: 'AGENT_MEMORY_RETENTION_DAYS',
    snapshots: 'SNAPSHOT_RETENTION_DAYS'
};

export const RETENTION_DAYS = Object.fromEntries(
    Object.entries(DEFAULT_RETENTION_DAYS).map(([key, fallback]) => [
        key,
        readRetentionDays(ENV_KEYS[key], fallback)
    ])
);

export function retentionUntil(days) {
    const normalizedDays = Number.isFinite(Number(days)) && Number(days) > 0
        ? Number(days)
        : DEFAULT_RETENTION_DAYS.agentMessages;
    return new Date(Date.now() + normalizedDays * 24 * 60 * 60 * 1000).toISOString();
}

function readRetentionDays(envKey, fallback) {
    const raw = process.env[envKey];
    if (!raw) return fallback;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
}
