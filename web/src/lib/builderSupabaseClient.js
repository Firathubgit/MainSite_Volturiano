/**
 * Supabase client for the VolturianoBuilder project.
 * 
 * This is a SEPARATE Supabase instance from the car platform.
 * - Car platform uses: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * - Builder uses:      VITE_BUILDER_SUPABASE_URL / VITE_BUILDER_SUPABASE_ANON_KEY
 * 
 * This client handles all builder-specific auth, projects, components,
 * published sites, credits, and community features.
 */
import { createClient } from '@supabase/supabase-js';

const builderUrl = import.meta.env.VITE_BUILDER_SUPABASE_URL;
const builderAnonKey = import.meta.env.VITE_BUILDER_SUPABASE_ANON_KEY;

if (!builderUrl || !builderAnonKey) {
    console.warn(
        '[BuilderSupabase] Missing VITE_BUILDER_SUPABASE_URL or VITE_BUILDER_SUPABASE_ANON_KEY — builder auth will be disabled.'
    );
}

export const builderSupabase = builderUrl && builderAnonKey
    ? createClient(builderUrl, builderAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
            storageKey: 'volturiano-builder-auth',
            // No-op lock: immediately execute the callback, skip Navigator Lock API
            // This prevents deadlocks when multiple Supabase clients coexist
            lock: async (name, acquireTimeout, fn) => await fn(),
        },
    })
    : null;
