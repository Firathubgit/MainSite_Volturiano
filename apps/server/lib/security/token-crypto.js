/**
 * AES-256-GCM helper for encrypting third-party access tokens at rest.
 *
 * Used for the GitHub publishing OAuth flow (routes/integrations/github.js).
 * The encryption key lives in GITHUB_TOKEN_ENCRYPTION_KEY (64 hex chars / 32 bytes).
 *
 * On-disk format (single base64 string):
 *   base64( [12-byte IV] || [16-byte auth tag] || [ciphertext] )
 *
 * That layout keeps everything self-contained in one DB column and lets us
 * rotate the key later by detecting decrypt failures and re-prompting the user
 * to reconnect.
 */
import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

let cachedKey = null;

function loadKey() {
    if (cachedKey) return cachedKey;

    const hex = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
    if (!hex || typeof hex !== 'string') {
        throw new Error(
            '[token-crypto] GITHUB_TOKEN_ENCRYPTION_KEY is not set. ' +
            'Generate one with: node -e "console.log(require(\\"crypto\\").randomBytes(32).toString(\\"hex\\"))"'
        );
    }
    if (!/^[0-9a-fA-F]{64}$/.test(hex.trim())) {
        throw new Error('[token-crypto] GITHUB_TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes).');
    }

    cachedKey = Buffer.from(hex.trim(), 'hex');
    return cachedKey;
}

/**
 * Encrypts a string (e.g. a GitHub access token).
 * Returns a single base64 string suitable for direct DB storage.
 */
export function encryptToken(plaintext) {
    if (typeof plaintext !== 'string' || plaintext.length === 0) {
        throw new Error('[token-crypto] encryptToken requires a non-empty string.');
    }

    const key = loadKey();
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const ciphertext = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

/**
 * Decrypts a string previously produced by encryptToken().
 * Throws on tampering or key mismatch.
 */
export function decryptToken(packed) {
    if (typeof packed !== 'string' || packed.length === 0) {
        throw new Error('[token-crypto] decryptToken requires a non-empty string.');
    }

    const key = loadKey();
    const buf = Buffer.from(packed, 'base64');
    if (buf.length < IV_LEN + TAG_LEN + 1) {
        throw new Error('[token-crypto] Ciphertext blob is too short.');
    }

    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = buf.subarray(IV_LEN + TAG_LEN);

    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);

    const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
    ]);
    return plaintext.toString('utf8');
}

/**
 * Optional eager startup check — call once at boot so misconfiguration
 * fails loudly rather than the first time a user clicks Connect.
 */
export function assertTokenCryptoConfigured() {
    loadKey();
}

/**
 * HMAC-SHA256 helper used for signing OAuth `state` payloads. Reuses the same
 * key material — this is fine because the key is only ever used server-side
 * and HMAC + GCM derivations don't interfere.
 */
export function signState(payload) {
    const key = loadKey();
    const json = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', key).update(json).digest('base64url');
    const body = Buffer.from(json, 'utf8').toString('base64url');
    return `${body}.${sig}`;
}

export function verifyState(token) {
    if (typeof token !== 'string' || !token.includes('.')) return null;
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;

    const key = loadKey();
    let json;
    try {
        json = Buffer.from(body, 'base64url').toString('utf8');
    } catch {
        return null;
    }
    const expected = crypto.createHmac('sha256', key).update(json).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    try {
        const parsed = JSON.parse(json);
        if (parsed.exp && Date.now() > parsed.exp) return null;
        return parsed;
    } catch {
        return null;
    }
}
