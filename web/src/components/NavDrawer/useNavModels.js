import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { showroomLocal } from '../Showroom/showroomData';

function resolveImage(slug, remoteUrl) {
  // Map known bad/legacy slugs to valid local assets if needed
  // "tornado-gt" in DB likely maps to our main "volturiano" asset
  if (slug === 'tornado-gt' || slug === 'volturiano') {
    const local = showroomLocal.find(item => item.slug === 'volturiano');
    return local ? local.image : null;
  }
  
  if (slug === 'volturiano-long') {
    const local = showroomLocal.find(item => item.slug === 'volturiano-long');
    return local ? local.image : null;
  }

  if (slug === 'atlas-suv' || slug === 'volturiano-suv') {
    const local = showroomLocal.find(item => item.slug === 'volturiano-suv');
    return local ? local.image : null;
  }

  // Check for known bad domains (CDN that is down) and ignore them
  if (remoteUrl && remoteUrl.includes('cdn.volturiano.com')) {
    const local = showroomLocal.find(item => item.slug === slug);
    return local ? local.image : null;
  }

  if (remoteUrl && remoteUrl.trim() !== '' && !remoteUrl.includes('cdn.volturiano.com')) {
    return remoteUrl;
  }
  
  const local = showroomLocal.find(item => item.slug === slug);
  return local ? local.image : null;
}

export default function useNavModels() {
  const [items, setItems] = useState(showroomLocal.map(item => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    status: item.status,
    image: item.image,
    sortOrder: item.sortOrder
  })));

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!supabase) {
        // No Supabase, use local data only
        return;
      }

      try {
        const { data, error } = await supabase
          .from('vehicles_catalog')
          .select('id, slug, name, status, hero_image_url, sort_order')
          .order('sort_order', { ascending: true });
        
        if (!mounted) return;
        
        if (!error && data) {
          // Merge with local data to ensure all 3 cars are present
          const mergedItems = [...showroomLocal];
          data.forEach(dbItem => {
            const existingIdx = mergedItems.findIndex(local => 
              local.slug === dbItem.slug || 
              (dbItem.slug === 'tornado-gt' && local.slug === 'volturiano') ||
              (dbItem.slug === 'atlas-suv' && local.slug === 'volturiano-suv')
            );
            if (existingIdx >= 0) {
              // Update existing with DB data but use local image
              mergedItems[existingIdx] = { 
                ...mergedItems[existingIdx],
                id: dbItem.id,
                name: dbItem.name,
                status: dbItem.status,
                sortOrder: dbItem.sort_order ?? mergedItems[existingIdx].sortOrder
              };
            } else {
              // Add new item from DB
              mergedItems.push({
                id: dbItem.id,
                slug: dbItem.slug,
                name: dbItem.name,
                status: dbItem.status,
                image: resolveImage(dbItem.slug, dbItem.hero_image_url),
                sortOrder: dbItem.sort_order ?? 9999
              });
            }
          });
          
          // Sort by sortOrder
          mergedItems.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
          
          setItems(mergedItems.map(item => ({
            id: item.id,
            slug: item.slug,
            name: item.name,
            status: item.status,
            image: item.image,
            sortOrder: item.sortOrder
          })));
        }
      } catch (err) {
        console.warn('[NavModels] Error fetching vehicles:', err);
        // Keep local data as fallback
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { items };
}

