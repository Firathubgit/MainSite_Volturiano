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
    const { data: subs } = await supabase.from('community_submissions')
        .select('id, name, thumbnail_base64, video_base64, preview_video_url')
        .order('created_at', { ascending: false })
        .limit(2);

    // Check if video_base64 is present by just printing true/false to avoid huge logs
    const output = subs.map(s => ({
        id: s.id,
        name: s.name,
        has_thumbnail_base64: !!s.thumbnail_base64,
        has_video_base64: !!s.video_base64,
        preview_video_url: s.preview_video_url
    }));

    fs.writeFileSync('output_subs.json', JSON.stringify(output, null, 2), 'utf8');
}
run();
