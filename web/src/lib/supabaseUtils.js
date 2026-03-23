/**
 * supabaseUtils.js
 * Centralized utility for reliable Supabase queries with retry logic.
 */

/**
 * Executes a Supabase query with automatic retries for transient errors.
 * Suitable for fetching data that "sometimes" fails due to cold starts or network hiccups.
 * 
 * @param {Function} queryFn - Function that returns a Supabase query promise
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.delayMs - Initial delay between retries in ms (default: 500)
 * @param {boolean} options.exponential - Use exponential backoff (default: true)
 */
export async function withRetry(queryFn, { maxRetries = 3, delayMs = 500, exponential = true } = {}) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await queryFn();

            // Supabase returns { data, error }
            if (!result.error) return result;

            lastError = result.error;

            // Only retry on transient/server errors (5xx, 408, 429, etc.)
            const status = result.error.status || (result.error.code ? parseInt(result.error.code) : null);
            const isTransient = !status || status >= 500 || [408, 429].includes(status);

            if (!isTransient) return result; // Don't retry client errors like 404, 403, 401

        } catch (err) {
            lastError = err;
        }

        // Wait before retrying
        const waitTime = exponential ? delayMs * Math.pow(2, i) : delayMs;
        console.warn(`[SupabaseRetry] Attempt ${i + 1} failed. Retrying in ${waitTime}ms...`, lastError);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    return { data: null, error: lastError };
}
