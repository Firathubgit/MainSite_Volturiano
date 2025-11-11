import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const FALLBACK_MODELS = [
  {
    id: 'volturiano-1',
    slug: 'volt-straight-01',
    name: 'Volturiano 1',
    status: 'available',
    image: null
  },
  {
    id: 'volturiano-long',
    slug: 'volt-apex',
    name: 'Long Car',
    status: 'coming-soon',
    image: null
  },
  {
    id: 'volturiano-suv',
    slug: 'VoltBlabla',
    name: 'SUV',
    status: 'coming-soon',
    image: null
  }
];

const resolveImage = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (!supabase) return null;
  const { data } = supabase.storage.from('images').getPublicUrl(path);
  return data?.publicUrl ?? null;
};

export default function useNavModels() {
  const [items, setItems] = useState(FALLBACK_MODELS);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('vehicles_catalog')
        .select('id, slug, name, status, hero_image_url')
        .order('sort_order', { ascending: true });
      if (!mounted) return;
      if (!error && data) {
        setItems(
          data.map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            status: row.status,
            image: resolveImage(row.hero_image_url)
          }))
        );
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { items };
}

