import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[SupabaseClient] Initializing Supabase client...');
console.log('[SupabaseClient] URL present?', !!url);
console.log('[SupabaseClient] Anon key present?', !!anon);
console.log('[SupabaseClient] URL:', url ? `${url.substring(0, 30)}...` : 'MISSING');
console.log('[SupabaseClient] Anon key:', anon ? `${anon.substring(0, 30)}...` : 'MISSING');

// Create Supabase client with Edge Functions support
export const supabase = url && anon ? createClient(url, anon, {
  functions: {
    // Edge Functions are available at /functions/v1/
    // This is the default, but we can configure it explicitly
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'sb-auth-token'
  }
}) : null;

if (supabase) {
  console.log('[SupabaseClient] Client created successfully');
  
  // Log session on initialization
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    console.log('[SupabaseClient] Initial session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      expiresAt: session?.expires_at,
      expiresIn: session?.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) : null,
      error: error?.message
    });
  });
  
  // Monitor auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[SupabaseClient] Auth state changed:', {
      event,
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      expiresAt: session?.expires_at,
      expiresIn: session?.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) : null
    });
  });
} else {
  console.error('[SupabaseClient] Failed to create client - missing URL or anon key');
}

