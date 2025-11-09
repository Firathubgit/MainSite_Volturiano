import { useEffect, useState } from 'react';
import { showroomLocal } from './showroomData';
import { supabase } from '../../lib/supabaseClient';

function mapVehicle(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    image: row.hero_image_url,
    cta: {
      primaryLabel: row.primary_label ?? (row.status === 'available' ? 'Explore the model' : 'Join waitlist'),
      primaryTo: row.primary_to ?? '/models',
      secondaryLabel: row.secondary_label ?? (row.status === 'available' ? 'Configure now' : null),
      secondaryTo: row.secondary_to ?? (row.status === 'available' ? '/configurator' : null)
    },
    sortOrder: row.sort_order ?? 9999
  };
}

export function useShowroomData() {
  const [items, setItems] = useState(showroomLocal);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, slug, name, status, hero_image_url, primary_label, primary_to, secondary_label, secondary_to, sort_order')
        .order('sort_order', { ascending: true });
      if (!mounted) return;
      if (error) { setError(error); setLoading(false); return; }
      const mapped = (data ?? []).map(mapVehicle);
      if (mapped.length > 0) setItems(mapped);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  return { items, loading, error };
}



