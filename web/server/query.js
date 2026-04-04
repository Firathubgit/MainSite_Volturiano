import 'dotenv/config';
import { supabaseAdmin } from './lib/supabase-admin.js';
import fs from 'fs';

async function run() {
  const { data } = await supabaseAdmin
      .from('components')
      .select('component_id, name, quality_score, usage_count, suitable_for, description, visual_description, category')
      .ilike('name', '%crystal%');
  fs.writeFileSync('query_results.json', JSON.stringify(data, null, 2), 'utf8');
}

run();
