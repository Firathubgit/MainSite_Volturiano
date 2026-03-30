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
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { builderSupabase } from '../lib/builderSupabaseClient';
import { withRetry } from '../lib/supabaseUtils';

const BuilderAuthContext = createContext(null);

export function BuilderAuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch user profile from the builder's profiles table
    const fetchProfile = useCallback(async (userId) => {
        if (!builderSupabase || !userId) return null;

        // Use withRetry to mitigate intermittent "sometimes fetching" issues
        const result = await withRetry(async () => {
            return await builderSupabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
        }, { maxRetries: 3, delayMs: 800 });

        if (result.error) {
            console.warn('[BuilderAuth] Profile fetch failed after retries:', result.error.message);
            return null;
        }
        return result.data;
    }, []);

    // Handle session changes
    const handleSession = useCallback(async (newSession) => {
        setSession(newSession);
        if (newSession?.user) {
            setUser(newSession.user);
            // Set loading false early so the UI can show the logged-in state 
            // even while the profile is still being fetched.
            setLoading(false);

            const profileData = await fetchProfile(newSession.user.id);
            setProfile(profileData);
        } else {
            setUser(null);
            setProfile(null);
            setLoading(false);
        }
    }, [fetchProfile]);

    // Initialize auth + listen for changes
    // We rely solely on onAuthStateChange — Supabase v2+ fires an INITIAL_SESSION
    // event synchronously on registration, which delivers the existing session.
    // Previously we also called getSession() manually, but that creates a race
    // condition: both getSession() and INITIAL_SESSION call handleSession(),
    // causing duplicate profile fetches and potential state overwrites.
    useEffect(() => {
        if (!builderSupabase) {
            console.warn('[BuilderAuth] Supabase client not available — auth disabled.');
            setLoading(false);
            return;
        }

        let active = true;

        const { data: subscription } = builderSupabase.auth.onAuthStateChange(
            async (event, newSession) => {
                console.log('[BuilderAuth] Auth state change:', event, !!newSession);
                if (active) {
                    try {
                        await handleSession(newSession);
                    } catch (err) {
                        console.error('[BuilderAuth] handleSession failed:', err);
                        if (active) setLoading(false);
                    }
                }
            }
        );

        return () => {
            active = false;
            subscription?.subscription?.unsubscribe();
        };
    }, [handleSession]);

    // --- Auth Methods ---

    const signInWithGoogle = useCallback(async (redirectTo) => {
        if (!builderSupabase) return { error: { message: 'Supabase not configured' } };
        setError(null);
        const { error: err } = await builderSupabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: redirectTo || window.location.origin + '/builder' },
        });
        if (err) setError(err.message);
        return { error: err };
    }, []);

    const signInWithGithub = useCallback(async (redirectTo) => {
        if (!builderSupabase) return { error: { message: 'Supabase not configured' } };
        setError(null);
        const { error: err } = await builderSupabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: redirectTo || window.location.origin + '/builder' },
        });
        if (err) setError(err.message);
        return { error: err };
    }, []);

    const signInWithEmail = useCallback(async (email) => {
        if (!builderSupabase) return { error: { message: 'Supabase not configured' } };
        setError(null);
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
        const { data, error: err } = await builderSupabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName || '',
                    display_name: fullName || '',
                    gdpr_consent_at: new Date().toISOString(),
                },
                emailRedirectTo: window.location.origin + '/builder',
            },
        });
        if (err) {
            setError(err.message);
        } else if (!data?.user || data?.user?.identities?.length === 0) {
            // Protect against Supabase's silent duplicate email return
            const customErr = { message: 'An account with this email may already exist. Try signing in instead.' };
            setError(customErr.message);
            return { data, error: customErr };
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
    }, []);

    const clearError = useCallback(() => setError(null), []);

    const refreshProfile = useCallback(async () => {
        if (user?.id) {
            const profileData = await fetchProfile(user.id);
            setProfile(profileData);
        }
    }, [user, fetchProfile]);

    // Access token for backend calls - stable reference
    const getAccessToken = useCallback(() => session?.access_token || null, [session]);

    const value = React.useMemo(() => ({
        // State
        session,
        user,
        profile,
        loading,
        error,
        isAuthenticated: !!user,

        // Methods
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
