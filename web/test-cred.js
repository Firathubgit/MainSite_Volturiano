import { supabaseAdmin } from './server/lib/supabase-admin.js';
import fs from 'fs';

async function check() {
  const { data } = await supabaseAdmin.from('profiles').select('id, plan, daily_credits_used, daily_credits_limit, total_credits_purchased').eq('id', '2862bf7e-9fdd-44ef-bbb6-38dfb018ca12');
  fs.writeFileSync('cred-res.json', JSON.stringify(data));
  process.exit(0);
}
check();
