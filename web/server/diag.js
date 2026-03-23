import 'dotenv/config';
import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

async function diag() {
    console.log('--- START DIAGNOSTICS ---');

    // 1. File system test
    try {
        await fs.writeFile('diag_test.txt', 'test contents ' + new Date().toISOString());
        console.log('[FS] Success: Wrote diag_test.txt');
        await fs.unlink('diag_test.txt');
        console.log('[FS] Success: Deleted diag_test.txt');
    } catch (e) {
        console.error('[FS] FAILED:', e.message);
    }

    // 2. Env check
    console.log('[ENV] SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'MISSING');
    console.log('[ENV] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'MISSING');

    // 3. Supabase connectivity
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
            const { data, error } = await supabase.from('projects').select('id').limit(1);
            if (error) throw error;
            console.log('[SUPABASE] Success: Connected and fetched projects');
        } catch (e) {
            console.error('[SUPABASE] FAILED:', e.message);
        }
    }

    console.log('--- END DIAGNOSTICS ---');
}

diag();
