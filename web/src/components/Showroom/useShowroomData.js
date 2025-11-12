import { useEffect, useState } from 'react';
import { showroomLocal } from './showroomData';
import { supabase } from '../../lib/supabaseClient';

function normaliseStatus(status) {
  return (status ?? '').toString().toLowerCase().replace(/[\s_]+/g, '-');
}

function mapVehicle(row) {
  const status = normaliseStatus(row.status);
  const defaultPrimaryKey = status === 'available' ? 'showroom:cta.explore' : 'showroom:cta.waitlist';
  const defaultSecondaryKey = status === 'available' ? 'showroom:cta.configure' : null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status,
    image: row.hero_image_url,
    cta: {
      primaryLabelKey: defaultPrimaryKey,
      primaryLabel: row.primary_label ?? null,
      primaryTo: row.primary_to ?? '/models',
      secondaryLabelKey: defaultSecondaryKey,
      secondaryLabel: row.secondary_label ?? null,
      secondaryTo: row.secondary_to ?? (status === 'available' ? '/configurator' : null)
    },
    sortOrder: row.sort_order ?? 9999
  };
}

export function useShowroomData() {
  const [items, setItems] = useState(showroomLocal);
  const [loading, setLoading] = useState(false); // Start with false to show local data immediately
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId = null;

    async function load() {
      if (!supabase) {
        // No Supabase, use local data only
        setLoading(false);
        return;
      }

      // Set loading only if we're actually fetching
      setLoading(true);

      try {
        // Add timeout to prevent hanging
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('[Showroom] Query timeout, using local data');
            setLoading(false);
            // Keep local data as fallback
          }
        }, 5000); // 5 second timeout

        // Try vehicles_catalog first, fallback to vehicles
        const { data, error: queryError } = await supabase
          .from('vehicles_catalog')
          .select('id, slug, name, status, hero_image_url, primary_label, primary_to, secondary_label, secondary_to, sort_order')
          .order('sort_order', { ascending: true });

        // Clear timeout if query completed
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!mounted) return;

        // If vehicles_catalog doesn't exist, try vehicles table
        if (queryError && queryError.code === 'PGRST116') {
          console.log('[Showroom] vehicles_catalog not found, trying vehicles table');
          const { data: vehiclesData, error: vehiclesError } = await supabase
            .from('vehicles')
            .select('id, slug, name, hero_image_url')
            .order('created_at', { ascending: true })
            .limit(10);

          if (!mounted) return;

          if (vehiclesError) {
            console.warn('[Showroom] Error fetching vehicles:', vehiclesError);
            setError(vehiclesError);
            setLoading(false);
            return;
          }

          // Map vehicles to showroom format
          const mapped = (vehiclesData ?? []).map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            status: 'available',
            image: row.hero_image_url,
            cta: {
              primaryLabelKey: 'showroom:cta.explore',
              primaryLabel: null,
              primaryTo: '/models',
              secondaryLabelKey: 'showroom:cta.configure',
              secondaryLabel: null,
              secondaryTo: '/configurator'
            },
            sortOrder: 9999
          }));

          if (mapped.length > 0) {
            setItems(mapped);
          }
          setLoading(false);
          return;
        }

        if (queryError) {
          console.warn('[Showroom] Error fetching vehicles_catalog:', queryError);
          setError(queryError);
          setLoading(false);
          return;
        }

        const mapped = (data ?? []).map(mapVehicle);
        if (mapped.length > 0) {
          setItems(mapped);
        }
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.warn('[Showroom] Fetch error or timeout:', err);
        setError(err);
        setLoading(false);
        // Keep local data as fallback
      }
    }

    load();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return { items, loading, error };
}



