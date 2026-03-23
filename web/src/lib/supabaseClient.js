// =====================================================
// CAR PLATFORM SUPABASE CLIENT — DISABLED
// This client was causing Navigator Lock deadlocks with
// the Builder Supabase client. Commented out until the
// car platform needs its own Supabase instance again.
// =====================================================

// import { createClient } from '@supabase/supabase-js';

// const url = import.meta.env.VITE_SUPABASE_URL;
// const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// console.log('[SupabaseClient] Initializing Supabase client...');
// console.log('[SupabaseClient] URL present?', !!url);
// console.log('[SupabaseClient] Anon key present?', !!anon);
// console.log('[SupabaseClient] URL:', url ? `${url.substring(0, 30)}...` : 'MISSING');
// console.log('[SupabaseClient] Anon key:', anon ? `${anon.substring(0, 30)}...` : 'MISSING');

// Keep the named export so the 24+ files that import { supabase } don't crash.
// They will receive null and should handle it gracefully.
export const supabase = null;

// Original client creation (commented out):
// export const supabase = url && anon ? createClient(url, anon, {
//   auth: {
//     persistSession: true,
//     autoRefreshToken: true,
//     detectSessionInUrl: true,
//     storage: typeof window !== 'undefined' ? window.localStorage : undefined,
//     storageKey: 'sb-auth-token',
//     lock: 'no-op',
//   }
// }) : null;

