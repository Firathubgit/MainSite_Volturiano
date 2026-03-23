import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, 'server', '.env');
const envStr = fs.readFileSync(envPath, 'utf8');
const env = {};
envStr.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: comp } = await supabase.from('components')
        .select('*')
        .eq('submission_id', 'fbb89e65-9c14-4210-b9fa-0d4a7cc231ab')
        .single();

    fs.writeFileSync('comp.json', JSON.stringify(comp, null, 2), 'utf8');
}
run();
