/**
 * Backend Supabase admin client for the VolturianoBuilder project.
 * 
 * Uses the SERVICE_ROLE key — this bypasses Row Level Security.
 * NEVER import this file from frontend code.
 * 
 * Used for:
 * - Publishing sites (write to Storage & published_sites table)
 * - Credit transactions (insert-only via server)
 * - Admin operations
 * - Verifying JWT tokens from frontend
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn(
        '[supabase-admin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Builder DB features will be disabled.'
    );
}

export const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
    : null;
