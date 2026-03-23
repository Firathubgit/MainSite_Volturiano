import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkRLS() {
    console.log('[Check] Checking RLS policies for profiles table...');

    // We can't directly query pg_policies via the client easily, 
    // but we can try a simple query and check the error or timeout.

    // Better yet, let's try to fetch a profile and see if it times out
    const start = Date.now();
    console.log('[Check] Attempting to fetch a profile...');
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    const duration = Date.now() - start;
    console.log(`[Check] Fetch attempt took ${duration}ms`);

    if (error) {
        console.error('[Error]', error.message);
        if (error.code === 'PGRST301') console.log('TIP: Check RLS or connection.');
    } else {
        console.log('[Success] Profiles are accessible.', data);
    }
}

checkRLS();
