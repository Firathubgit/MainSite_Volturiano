/**
 * Production-Safe Logger
 * 
 * Provides structured logging with timestamps and log levels.
 * Explicitly scrubs common PII (Personally Identifiable Information) 
 * and secrets from JSON payloads before they are written to disk or console.
 */

const PII_KEYS = [
    'password', 'token', 'secret', 'key', 'authorization', 'cookie'
];

// Values that look like provider or platform keys (OpenAI, Google, E2B, GitHub).
const API_KEY_SHAPE = /\b(sk|pk|rk)[-_][A-Za-z0-9_-]{16,}|\bAIza[0-9A-Za-z_-]{20,}|\be2b_[0-9a-f]{20,}|\bgh[opsu]_[A-Za-z0-9]{20,}/;

const maskString = (str) => {
    if (typeof str !== 'string' || str.length < 5) return '***';
    return `${str.substring(0, 3)}...${str.substring(str.length - 2)}`;
};

const recursivelyScrubObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    // Deep clone to avoid mutating the original object
    const scrubbed = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (PII_KEYS.some(k => key.toLowerCase().includes(k))) {
            scrubbed[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            scrubbed[key] = recursivelyScrubObject(value);
        } else if (typeof value === 'string' && API_KEY_SHAPE.test(value)) {
            // Catch raw API keys hiding in values
            scrubbed[key] = '[KEY_MASKED]';
        } else if (typeof value === 'string' && value.match(/eyJhbGciOi/)) {
            // Catch raw JWTs hiding in values
            scrubbed[key] = '[JWT_MASKED]';
        } else {
            scrubbed[key] = value;
        }
    }
    
    return scrubbed;
};

const formatMessage = (level, context, msg, payload) => {
    const time = new Date().toISOString();
    let logString = `[${time}] [${level}] [${context}] ${msg}`;
    
    if (payload !== undefined) {
        if (typeof payload === 'object') {
            const safePayload = recursivelyScrubObject(payload);
            logString += ` | Payload: ${JSON.stringify(safePayload)}`;
        } else {
            logString += ` | ${payload}`;
        }
    }
    
    return logString;
};

export const logger = {
    info: (context, msg, payload) => console.log(formatMessage('INFO', context, msg, payload)),
    warn: (context, msg, payload) => console.warn(formatMessage('WARN', context, msg, payload)),
    error: (context, msg, payload) => console.error(formatMessage('ERROR', context, msg, payload)),
    debug: (context, msg, payload) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(formatMessage('DEBUG', context, msg, payload));
        }
    }
};

export default logger;
