const DATA_URI_RE = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;
const MAX_BASE64_CHARS = 24 * 1024 * 1024;

export function parseDataUriMedia(value, {
    label = 'file',
    allowedTypes = [],
    maxBytes = 1024 * 1024
} = {}) {
    if (!value) return null;
    if (typeof value !== 'string') {
        const err = new Error(`${label} must be a base64 data URI.`);
        err.status = 400;
        throw err;
    }

    if (value.length > MAX_BASE64_CHARS) {
        const err = new Error(`${label} is too large to process.`);
        err.status = 413;
        throw err;
    }

    const match = value.match(DATA_URI_RE);
    if (!match) {
        const err = new Error(`${label} must include a valid data URI content type.`);
        err.status = 400;
        throw err;
    }

    const contentType = match[1].toLowerCase();
    if (allowedTypes.length && !allowedTypes.includes(contentType)) {
        const err = new Error(`${label} type must be one of: ${allowedTypes.join(', ')}.`);
        err.status = 400;
        throw err;
    }

    const base64Data = match[2].replace(/\s+/g, '');
    const sizeBytes = Buffer.byteLength(base64Data, 'base64');
    if (sizeBytes > maxBytes) {
        const err = new Error(`${label} must be under ${Math.round(maxBytes / 1024 / 1024)}MB.`);
        err.status = 400;
        throw err;
    }

    return { contentType, base64Data, sizeBytes };
}

export function decodeDataUriMedia(value, options = {}) {
    const parsed = parseDataUriMedia(value, options);
    if (!parsed) return null;
    return {
        ...parsed,
        buffer: Buffer.from(parsed.base64Data, 'base64')
    };
}
