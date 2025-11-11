import { supabase } from '../lib/supabaseClient';

export async function runSupabaseDebugCheck() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  console.groupCollapsed('🔍 Supabase Debug Check');
  console.log('Supabase URL:', url || '(missing)');
  console.log('Anon key present?', Boolean(anon));

  if (!url || !anon) {
    console.warn('Missing Supabase env vars. Update your .env before continuing.');
    console.groupEnd();
    return;
  }

  if (!supabase) {
    console.error('Supabase client not initialised (check lib/supabaseClient.js).');
    console.groupEnd();
    return;
  }

  try {
    const { data, error, status } = await supabase
      .from('vehicles_catalog')
      .select(
        `
        id,
        slug,
        name,
        status,
        hero_image_url,
        primary_label,
        primary_to,
        secondary_label,
        secondary_to,
        sort_order
      `
      )
      .order('sort_order', { ascending: true });

    console.log('HTTP status:', status);

    if (error) {
      console.error('Supabase error:', error);
    } else {
      console.table(data);
      if (!data || data.length === 0) {
        console.warn('Supabase returned 0 rows from vehicles_catalog.');
      }
    }
  } catch (err) {
    console.error('Unexpected Supabase client error:', err);
  }

  console.groupEnd();
}

