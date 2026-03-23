import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    try {
        const tables = ['components', 'templates', 'profiles', 'projects', 'guest_rate_limits', 'credit_transactions'];
        for (const table of tables) {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            if (error) {
                console.error(`Table ${table} Error:`, error.message);
            } else {
                console.log(`Table ${table} count:`, count);
            }
        }
    } catch (e) {
        console.error('Exception:', e.message);
    }
}

test();
