import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('--- Checking component_categories ---');
    const { data: catData, error: catError } = await supabase.from('component_categories').select('*').limit(1);
    if (catError) console.log('component_categories error:', catError.message);
    else console.log('component_categories columns:', JSON.stringify(Object.keys(catData[0] || {})));

    console.log('--- Checking templates ---');
    const { data: tData, error: tError } = await supabase.from('templates').select('*').limit(1);
    if (tError) console.log('templates error:', tError.message);
    else console.log('templates columns:', JSON.stringify(Object.keys(tData[0] || {})));
}
test();
