/**
 * Auth middleware for VolturianoBuilder backend routes.
 *
 * Verifies the JWT from the Authorization header against the
 * VolturianoBuilder Supabase project. Supports two modes:
 *
 * 1. requireAuth  — Returns 401 if no valid token
 * 2. optionalAuth — Attaches user if token present, continues as guest otherwise
 */
import { supabaseAdmin } from '../lib/supabase-admin.js';

/**
 * Strict auth — route fails with 401 if no valid token.
 */
export function requireAuth(req, res, next) {
    return handleAuth(req, res, next, { required: true });
}

/**
 * Optional auth — route proceeds as guest if no token, but attaches user if present.
 */
export function optionalAuth(req, res, next) {
    return handleAuth(req, res, next, { required: false });
}

async function handleAuth(req, res, next, { required }) {
    // Clear user from previous middleware
    req.user = null;
    req.userId = null;
    req.isGuest = true;

    if (!supabaseAdmin) {
        // Supabase not configured — in dev, let everything through
        console.warn('[AuthMiddleware] Supabase admin client not configured, skipping auth.');
        if (required) {
            return res.status(503).json({ error: 'Auth service unavailable' });
        }
        return next();
    }

    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7); // Remove "Bearer "
    } else if (req.query.token) {
        // Fallback for EventSource (SSE) which cannot send headers natively
        token = req.query.token;
    }

    if (!token) {
        if (required) {
            return res.status(401).json({ error: 'Authentication required. Please sign in.' });
        }
        // Guest mode
        return next();
    }

    try {
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        const user = data?.user;

        if (error || !user) {
            console.warn('[AuthMiddleware] Token verification failed:', error?.message);
            if (required) {
                return res.status(401).json({ error: 'Invalid or expired token. Please sign in again.' });
            }
            return next();
        }

        // Attach user to request
        req.user = user;
        req.userId = user.id;
        req.isGuest = false;

        next();
    } catch (err) {
        console.error('[AuthMiddleware] Unexpected error:', err);
        if (required) {
            return res.status(500).json({ error: 'Authentication check failed' });
        }
        next();
    }
}

export default { requireAuth, optionalAuth };
