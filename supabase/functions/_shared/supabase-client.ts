// Shared Supabase client for Edge Functions
// Creates an authenticated Supabase client using the service role key

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Supabase automatically provides SUPABASE_URL, but we need to use a custom name for the service role key
// because Supabase doesn't allow secrets starting with SUPABASE_ prefix
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SUPABASE_PROJECT_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables. Make sure SERVICE_ROLE_KEY secret is set.');
}

/**
 * Create a Supabase client with service role (bypasses RLS)
 * Use this for server-side operations that need full database access
 */
export function createServiceRoleClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Create a Supabase client with user's JWT token (respects RLS)
 * Use this when you need to operate as the authenticated user
 */
export function createUserClient(authHeader: string) {
  const token = authHeader.replace('Bearer ', '');
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

