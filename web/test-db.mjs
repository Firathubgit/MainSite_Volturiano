import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env
const envPath = path.join(__dirname, 'server', '.env');
const envStr = fs.readFileSync(envPath, 'utf8');
const env = {};
envStr.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase.from('community_submissions')
        .select('id, name, preview_video_url, thumbnail_url, video_base64')
        .order('created_at', { ascending: false })
        .limit(3);
    console.log(JSON.stringify(data, null, 2));
    if (error) console.log(error);
}
run();
