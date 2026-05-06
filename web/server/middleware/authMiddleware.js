/**
 * Auth middleware for VolturianoBuilder backend routes.
 *
 * Verifies the JWT from the Authorization header against the
 * VolturianoBuilder Supabase project. Tokens are accepted only
 * via the Authorization header to avoid leaks through query
 * strings, browser history, server access logs, and referrers.
 *
 * Modes:
 *   1. requireAuth         — Returns 401 if no valid token
 *   2. optionalAuth        — Attaches user if token present, continues as guest otherwise
 *   3. requireUnrestricted — Blocks AI/data-mutating routes when the user has restricted processing
 */
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { errorControl, logControl, warnControl } from '../lib/security/control-log.js';

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
        warnControl('AuthControl', 'Supabase admin client not configured for auth check', req, {
            required
        });
        if (required) {
            return res.status(503).json({ error: 'Auth service unavailable' });
        }
        return next();
    }

    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7); // Remove "Bearer "
    }

    // Reject any token passed via querystring. Tokens in URLs leak through
    // browser history, server access logs, referrer headers, and shared links.
    if (!token && req.query?.token) {
        warnControl('AuthControl', 'Query-string token rejected (auth tokens must use Authorization header)', req, {
            required
        });
        if (required) {
            return res.status(401).json({
                error: 'Auth tokens must be sent via the Authorization header, not the URL.'
            });
        }
        return next();
    }

    if (!token) {
        if (required) {
            warnControl('AuthControl', 'Authentication required but no bearer token was provided', req);
            return res.status(401).json({ error: 'Authentication required. Please sign in.' });
        }
        // Guest mode
        logControl('AuthControl', 'Optional auth continued as guest', req);
        return next();
    }

    try {
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        const user = data?.user;

        if (error || !user) {
            warnControl('AuthControl', 'Token verification failed', req, {
                required,
                error: error?.message || 'No user returned'
            });
            if (required) {
                return res.status(401).json({ error: 'Invalid or expired token. Please sign in again.' });
            }
            return next();
        }

        // Attach user to request
        req.user = user;
        req.userId = user.id;
        req.isGuest = false;

        logControl('AuthControl', 'Authenticated request verified', req, {
            authMode: 'bearer',
            required
        });

        next();
    } catch (err) {
        errorControl('AuthControl', 'Unexpected auth verification error', req, {
            required,
            error: err?.message || String(err)
        });
        if (required) {
            return res.status(500).json({ error: 'Authentication check failed' });
        }
        next();
    }
}

/**
 * Middleware to enforce GDPR processing restrictions.
 * Returns 403 if the user has active processing restrictions.
 */
export async function requireUnrestricted(req, res, next) {
    if (!req.userId) {
        // Fallback for optionalAuth if not logged in
        return next();
    }

    try {
        logControl('GdprControl', 'Processing restriction check started', req);
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('processing_restricted')
            .eq('id', req.userId)
            .single();

        if (error) {
            warnControl('GdprControl', 'Processing restriction check could not read profile', req, {
                error: error.message
            });
            return next(); // Proceed if we can't verify (availability over restriction)
        }

        if (profile?.processing_restricted) {
            warnControl('GdprControl', 'Processing restriction blocked action', req);
            return res.status(403).json({
                success: false,
                error: 'Processing is restricted on your account. Please remove the restriction in Settings to continue.',
                code: 'PROCESSING_RESTRICTED'
            });
        }

        logControl('GdprControl', 'Processing restriction check passed', req);
        next();
    } catch (err) {
        errorControl('GdprControl', 'Fatal processing restriction check error', req, {
            error: err?.message || String(err)
        });
        next();
    }
}

export default {
    requireAuth,
    optionalAuth,
    requireUnrestricted
};
