import { supabaseAdmin } from './server/lib/supabase-admin.js';

async function checkSite(slug) {
  const { data, error } = await supabaseAdmin
    .from('published_sites')
    .select('slug, site_title, site_icon_url')
    .eq('slug', slug)
    .single();
    
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Site details:', data);
  }
  process.exit(0);
}

checkSite('iraq');
