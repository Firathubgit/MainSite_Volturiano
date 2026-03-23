import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    console.log('[Check] Fetching components from Supabase...');
    const { data, error } = await supabase
        .from('components')
        .select('component_id, name, bundle_code, status, visual_description, suitable_for');

    if (error) {
        console.error('[Error]', error.message);
        return;
    }

    console.log(`[Check] Found ${data.length} components.`);
    data.forEach(c => {
        const hasBundle = c.bundle_code ? 'YES' : 'NO';
        const hasVisual = c.visual_description ? 'YES' : 'NO';
        console.log(`- ${c.component_id}: Bundle: ${hasBundle} | Metadata: ${hasVisual} | Status: ${c.status}`);
    });
}

check();
