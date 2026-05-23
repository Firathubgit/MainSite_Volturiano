/**
 * BuilderAuthContext — React context for VolturianoBuilder authentication.
 *
 * This is SEPARATE from the car platform's auth. It connects to the
 * VolturianoBuilder Supabase project and manages builder-specific
 * user sessions, profiles, and auth state.
 *
 * Usage:
 *   import { useBuilderAuth } from '../../contexts/BuilderAuthContext';
 *   const { user, session, profile, loading, signInWithGoogle, signOut } = useBuilderAuth();
 *
 * Design notes (root-cause fixes for the "first load shows no profile" bug):
 *   1. We rely solely on `onAuthStateChange` for the source of truth. We trigger
 *      the initial event once via `getSession()` and never poll in a retry loop.
 *   2. Supabase v2 can briefly emit `INITIAL_SESSION` with `null` when the
 *      stored token needs an immediate refresh, then emit `SIGNED_IN` shortly
 *      after with the real session. We defer "accept null" by ~1.5s so the UI
 *      doesn't flip to logged-out and back, which is what caused the navbar to
 *      render the wrong state on first page load.
 *   3. `ensureServerProfile` is deduped per user, so multiple effect mounts
 *      (StrictMode, INITIAL_SESSION + SIGNED_IN, etc.) share a single in-flight
 *      request instead of triggering 3+ identical calls.
 *   4. `handleSession` is idempotent for the same user: if we've already loaded
 *      the profile for this user id, we just refresh the session token and exit.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { builderSupabase } from '../lib/builderSupabaseClient';
import { withRetry } from '../lib/supabaseUtils';

const BuilderAuthContext = createContext(null);
const LEGAL_CONSENT_VERSION = '2026-05-14.legal-v2';
const PENDING_LEGAL_CONSENT_KEY = 'volturiano_pending_legal_consent';
// How long we wait after an INITIAL_SESSION:null before accepting "logged out"
// as final. Long enough for Supabase's auto-refresh path to fire SIGNED_IN,
// short enough that genuinely-logged-out users don't see a long spinner.
const INITIAL_NULL_GRACE_MS = 1500;

function savePendingLegalConsent(source) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PENDING_LEGAL_CONSENT_KEY, JSON.stringify({
        source,
        version: LEGAL_CONSENT_VERSION,
        acceptedAt: new Date().toISOString()
    }));
}

function readPendingLegalConsent() {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(PENDING_LEGAL_CONSENT_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function clearPendingLegalConsent() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(PENDING_LEGAL_CONSENT_KEY);
}

export function BuilderAuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Dedupe ensureServerProfile across concurrent or repeated handleSession calls.
    const inFlightEnsureRef = useRef({ userId: null, promise: null });
    // At-most-once consent recording per user.
    const consentRecordedRef = useRef(null);
    // Last user id we've fully loaded the profile for.
    const profileLoadedForRef = useRef(null);
    // Stable ref for current session — allows getAccessToken to be a truly
    // stable callback that never triggers downstream effect re-fires.
    const sessionRef = useRef(null);

    const ensureServerProfile = useCallback(async (sessionToUse) => {
        const userId = sessionToUse?.user?.id;
        if (!userId || !sessionToUse?.access_token) return null;

        // If a request is already in flight for this user, share its promise
        // instead of issuing another POST. Without this we saw 3 concurrent
        // calls on first mount (StrictMode + INITIAL_SESSION + SIGNED_IN).
        if (inFlightEnsureRef.current.userId === userId && inFlightEnsureRef.current.promise) {
            return inFlightEnsureRef.current.promise;
        }

        const promise = (async () => {
            const MAX_RETRIES = 3;
            const BASE_DELAY = 800;

            try {
                for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                    try {
                        const response = await fetch('/api/settings/ensure-profile', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${sessionToUse.access_token}`
                            }
                        });

                        const data = await response.json().catch(() => ({}));
                        if (!response.ok || !data.success) {
                            // Server responded but with an error — don't retry,
                            // it's not a connectivity issue.
                            console.warn('[BuilderAuth] Profile bootstrap failed:', data.error || response.statusText);
                            return null;
                        }
                        return data.profile || null;
                    } catch (err) {
                        // Network-level failure (ECONNRESET, fetch refused, etc.)
                        // — the backend is probably still booting. Retry with backoff.
                        const isLastAttempt = attempt === MAX_RETRIES;
                        if (isLastAttempt) {
                            console.warn('[BuilderAuth] Profile bootstrap skipped after retries:', err?.message || err);
                            return null;
                        }
                        const delay = BASE_DELAY * Math.pow(2, attempt); // 800 → 1600 → 3200
                        await new Promise((r) => setTimeout(r, delay));
                    }
                }
                return null;
            } finally {
                if (inFlightEnsureRef.current.userId === userId) {
                    inFlightEnsureRef.current = { userId: null, promise: null };
                }
            }
        })();

        inFlightEnsureRef.current = { userId, promise };
        return promise;
    }, []);

    const fetchProfile = useCallback(async (authUser) => {
        if (!builderSupabase || !authUser?.id) return null;

        const result = await withRetry(async () => {
            return await builderSupabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle();
        }, { maxRetries: 3, delayMs: 800 });

        if (result.error) {
            console.warn('[BuilderAuth] Profile fetch failed after retries:', result.error.message);
            return null;
        }

        if (!result.data) {
            // Synthetic fallback so the UI can render the avatar/display name
            // immediately while the row finishes propagating server-side.
            const meta = authUser.user_metadata || {};
            return {
                id: authUser.id,
                display_name: meta.display_name || meta.full_name || meta.name || authUser.email?.split('@')?.[0] || 'Builder User',
                full_name: meta.full_name || meta.name || null,
                avatar_url: meta.avatar_url || meta.picture || null,
                admin_role: false,
                plan: 'free',
                processing_restricted: false
            };
        }

        return result.data;
    }, []);

    const recordLegalConsent = useCallback(async (sessionToUse, source = 'auth') => {
        if (!builderSupabase || !sessionToUse?.access_token || !sessionToUse?.user?.id) return;
        // At-most-once per user/session — handleSession is called from multiple
        // events; we don't want to re-POST consent on every TOKEN_REFRESHED.
        if (consentRecordedRef.current === sessionToUse.user.id) return;
        consentRecordedRef.current = sessionToUse.user.id;

        const acceptedAt = new Date().toISOString();
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToUse.access_token}`
        };

        const events = [
            { consent_type: 'terms', consent_version: LEGAL_CONSENT_VERSION, accepted: true, metadata: { source, acceptedAt } },
            { consent_type: 'privacy', consent_version: LEGAL_CONSENT_VERSION, accepted: true, metadata: { source, acceptedAt } }
        ];

        try {
            await Promise.all(events.map((body) => fetch('/api/settings/consent', {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            })));
        } catch (err) {
            console.warn('[BuilderAuth] Server consent event skipped:', err?.message || err);
        }

        try {
            const { error: profileError } = await builderSupabase
                .from('profiles')
                .update({
                    gdpr_consent_at: acceptedAt,
                    terms_accepted_at: acceptedAt,
                    privacy_accepted_at: acceptedAt,
                    terms_version: LEGAL_CONSENT_VERSION,
                    privacy_version: LEGAL_CONSENT_VERSION,
                    updated_at: acceptedAt
                })
                .eq('id', sessionToUse.user.id);

            if (profileError) {
                console.warn('[BuilderAuth] Profile consent fields skipped:', profileError.message);
            }
        } catch (err) {
            console.warn('[BuilderAuth] Profile consent update skipped:', err?.message || err);
        }
    }, []);

    const handleSession = useCallback(async (newSession) => {
        // Always update session/user state so consumers see the latest token.
        setSession(newSession);
        sessionRef.current = newSession;

        if (!newSession?.user) {
            setUser(null);
            setProfile(null);
            profileLoadedForRef.current = null;
            consentRecordedRef.current = null;
            setLoading(false);
            return;
        }

        const userId = newSession.user.id;
        setUser(newSession.user);

        // If we already loaded the profile for this user (e.g. TOKEN_REFRESHED
        // fires later), skip the heavy work but make sure loading is cleared.
        if (profileLoadedForRef.current === userId) {
            setLoading(false);
            return;
        }

        // Profile bootstrap (server-side, deduped). This guarantees the
        // profiles row exists for OAuth/magic-link users.
        const ensuredProfile = await ensureServerProfile(newSession);
        if (ensuredProfile) {
            setProfile(ensuredProfile);
        }

        // Detailed profile read via the browser client (RLS-bound). Falls back
        // to ensuredProfile if the row is still propagating.
        const detailedProfile = await fetchProfile(newSession.user);
        setProfile(detailedProfile || ensuredProfile);
        profileLoadedForRef.current = userId;

        setLoading(false);

        // Consent capture is intentionally deferred and runs in the background
        // AFTER setLoading(false). We do NOT block first paint of the avatar /
        // credits on these extra writes — earlier code awaited them, which made
        // first-window/just-signed-up accounts (the same cohort that still has
        // the cookie banner showing) appear stuck until a manual reload.
        // Only clear the pending flag once recording succeeds, so a transient
        // failure can be retried on the next session event instead of being lost.
        const pendingConsent = readPendingLegalConsent();
        if (pendingConsent?.version === LEGAL_CONSENT_VERSION) {
            recordLegalConsent(newSession, pendingConsent.source || 'auth')
                .then(() => clearPendingLegalConsent())
                .catch((err) => console.warn(
                    '[BuilderAuth] Background consent recording failed (will retry on next auth event):',
                    err?.message || err
                ));
        }
    }, [ensureServerProfile, fetchProfile, recordLegalConsent]);

    useEffect(() => {
        if (!builderSupabase) {
            console.warn('[BuilderAuth] Supabase client not available — auth disabled.');
            setLoading(false);
            return;
        }

        let active = true;
        let initialResolved = false;
        let initialNullTimer = null;

        const { data: subscription } = builderSupabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!active) return;
            console.log('[BuilderAuth] Auth state change event:', event, !!newSession);

            // Supabase v2 can emit INITIAL_SESSION with `null` while the SDK
            // is auto-refreshing a stored token, then emit SIGNED_IN with the
            // real session a moment later. Without a grace window, the navbar
            // briefly shows the logged-out UI and the page feels broken
            // until the user reloads. We defer accepting null INITIAL_SESSION.
            if (event === 'INITIAL_SESSION' && !newSession && !initialResolved) {
                if (initialNullTimer) clearTimeout(initialNullTimer);
                initialNullTimer = setTimeout(() => {
                    if (!active || initialResolved) return;
                    initialResolved = true;
                    handleSession(null).catch((err) => console.error('[BuilderAuth] handleSession failed:', err));
                }, INITIAL_NULL_GRACE_MS);
                return;
            }

            // Any other event with a real session resolves the initial window.
            if (newSession?.user) initialResolved = true;
            if (initialNullTimer) {
                clearTimeout(initialNullTimer);
                initialNullTimer = null;
            }

            try {
                await handleSession(newSession);
            } catch (err) {
                console.error('[BuilderAuth] handleSession failed:', err);
                if (active) setLoading(false);
            }
        });

        // Triggers INITIAL_SESSION with the persisted/refreshed session.
        builderSupabase.auth.getSession().catch((err) => {
            console.warn('[BuilderAuth] getSession failed:', err?.message || err);
        });

        return () => {
            active = false;
            if (initialNullTimer) clearTimeout(initialNullTimer);
            subscription?.subscription?.unsubscribe();
        };
    }, [handleSession]);

    // ─── Auth Methods ───

    const signInWithGoogle = useCallback(async (redirectTo, options = {}) => {
        if (!builderSupabase) return { error: { message: 'Supabase not configured' } };
        setError(null);
        if (options.legalAccepted) savePendingLegalConsent('google_oauth');
        const { error: err } = await builderSupabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: redirectTo || window.location.origin + '/builder' },
        });
        if (err) setError(err.message);
        return { error: err };
    }, []);

    const signInWithGithub = useCallback(async (redirectTo, options = {}) => {
        if (!builderSupabase) return { error: { message: 'Supabase not configured' } };
        setError(null);
        if (options.legalAccepted) savePendingLegalConsent('github_oauth');
        const { error: err } = await builderSupabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: redirectTo || window.location.origin + '/builder' },
        });
        if (err) setError(err.message);
        return { error: err };
    }, []);

    const signInWithEmail = useCallback(async (email, options = {}) => {
        if (!builderSupabase) return { error: { message: 'Supabase not configured' } };
        setError(null);
        if (options.legalAccepted) savePendingLegalConsent('magic_link');
        const { error: err } = await builderSupabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin + '/builder' },
        });
        if (err) setError(err.message);
        return { error: err };
    }, []);

    const signInWithPassword = useCallback(async (email, password) => {
        if (!builderSupabase) return { error: { message: 'Supabase not configured' } };
        setError(null);
        const { data, error: err } = await builderSupabase.auth.signInWithPassword({
            email,
            password,
        });
        if (err) setError(err.message);
        return { data, error: err };
    }, []);

    const signUpWithPassword = useCallback(async (email, password, fullName) => {
        if (!builderSupabase) return { error: { message: 'Supabase not configured' } };
        setError(null);
        savePendingLegalConsent('password_signup');
        const acceptedAt = new Date().toISOString();
        const { data, error: err } = await builderSupabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName || '',
                    display_name: fullName || '',
                    gdpr_consent_at: acceptedAt,
                    terms_accepted_at: acceptedAt,
                    privacy_accepted_at: acceptedAt,
                    terms_version: LEGAL_CONSENT_VERSION,
                    privacy_version: LEGAL_CONSENT_VERSION,
                },
                emailRedirectTo: window.location.origin + '/builder',
            },
        });
        if (err) {
            setError(err.message);
        } else if (!data?.user || data?.user?.identities?.length === 0) {
            const customErr = { message: 'An account with this email may already exist. Try signing in instead.' };
            setError(customErr.message);
            return { data, error: customErr };
        }

        if (data?.session?.access_token && data?.user?.id) {
            try {
                const { error: consentError } = await builderSupabase.from('consent_events').insert([
                    {
                        user_id: data.user.id,
                        consent_type: 'terms',
                        consent_version: LEGAL_CONSENT_VERSION,
                        accepted: true,
                        metadata: { source: 'password_signup' }
                    },
                    {
                        user_id: data.user.id,
                        consent_type: 'privacy',
                        consent_version: LEGAL_CONSENT_VERSION,
                        accepted: true,
                        metadata: { source: 'password_signup' }
                    }
                ]);
                if (consentError) {
                    console.warn('[BuilderAuth] Consent event insert skipped:', consentError.message);
                }
            } catch (consentErr) {
                console.warn('[BuilderAuth] Consent event insert skipped:', consentErr?.message || consentErr);
            }
        }
        return { data, error: err };
    }, []);

    const signOut = useCallback(async () => {
        if (!builderSupabase) return;
        setError(null);
        await builderSupabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        profileLoadedForRef.current = null;
        consentRecordedRef.current = null;
    }, []);

    const clearError = useCallback(() => setError(null), []);

    const refreshProfile = useCallback(async () => {
        if (!user?.id) return;
        // Force-reload by clearing the dedupe and re-fetching against the live client.
        profileLoadedForRef.current = null;
        const profileData = await fetchProfile(user);
        if (profileData) setProfile(profileData);
    }, [user, fetchProfile]);

    // Stable reference for backend calls — reads from ref so the callback
    // identity never changes, preventing downstream effect re-fires on every
    // TOKEN_REFRESHED auth event.
    const getAccessToken = useCallback(() => sessionRef.current?.access_token || null, []);

    const value = React.useMemo(() => ({
        session,
        user,
        profile,
        loading,
        error,
        isAuthenticated: !!user,
        isAdmin: !!profile?.admin_role,

        signInWithGoogle,
        signInWithGithub,
        signInWithEmail,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        clearError,
        refreshProfile,
        getAccessToken,
    }), [
        session, user, profile, loading, error,
        signInWithGoogle, signInWithGithub, signInWithEmail,
        signInWithPassword, signUpWithPassword, signOut,
        clearError, refreshProfile, getAccessToken
    ]);

    return (
        <BuilderAuthContext.Provider value={value}>
            {children}
        </BuilderAuthContext.Provider>
    );
}

export function useBuilderAuth() {
    const ctx = useContext(BuilderAuthContext);
    if (!ctx) {
        throw new Error('useBuilderAuth must be used within a <BuilderAuthProvider>');
    }
    return ctx;
}
