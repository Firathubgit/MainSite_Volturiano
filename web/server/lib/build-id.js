import { randomUUID } from 'crypto';

/**
 * Generates a unique Build ID (UUID v4).
 * This ID follows the build request through the entire pipeline:
 * Plan -> Generate -> Apply -> Verify
 * 
 * @returns {string} The unique build ID.
 */
export function createBuildId() {
    return randomUUID();
}
