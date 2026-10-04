/**
 * Backfill semantic embeddings for existing catalog components.
 *
 * Usage:
 *   node scripts/backfill-component-embeddings.js            # embed missing/stale only
 *   node scripts/backfill-component-embeddings.js --force    # re-embed everything
 *
 * Requires migration 024_component_embeddings.sql to be applied and
 * GEMINI_API_KEY + SUPABASE_SERVICE_ROLE_KEY in the environment.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  buildComponentEmbeddingText,
  embeddingsAvailable,
  hashEmbeddingText,
  upsertComponentEmbedding
} from '../lib/registry/embeddings.js';

const BATCH_SIZE = 25;
const FORCE = process.argv.includes('--force');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

async function main() {
  if (!supabase) {
    console.error('Supabase admin client unavailable. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }
  if (!embeddingsAvailable()) {
    console.error('Embeddings unavailable. Set GEMINI_API_KEY.');
    process.exit(1);
  }

  const { data: components, error } = await supabase
    .from('components')
    .select('id, component_id, name, category, description, visual_description, mood_tone, design_personality, typography_style, layout_type, color_mode, tags, keywords, suitable_for, industry_tags, embedding_text_hash, embedding')
    .in('status', ['active', 'pending_review']);

  if (error) {
    console.error('Failed to load components:', error.message);
    process.exit(1);
  }

  const candidates = components.filter((row) => {
    if (FORCE) return true;
    if (!row.embedding) return true;
    const hash = hashEmbeddingText(buildComponentEmbeddingText(row));
    return hash !== row.embedding_text_hash;
  });

  console.log(`Components total: ${components.length}, to embed: ${candidates.length}${FORCE ? ' (forced)' : ''}`);

  let succeeded = 0;
  let failed = 0;
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(async (row) => {
      const target = FORCE ? { ...row, embedding_text_hash: null, embedding: null } : row;
      try {
        return await upsertComponentEmbedding(target);
      } catch (err) {
        console.warn(`  ✗ ${row.component_id}: ${err.message}`);
        return false;
      }
    }));
    succeeded += results.filter(Boolean).length;
    failed += results.filter((result) => !result).length;
    console.log(`  Progress: ${Math.min(i + BATCH_SIZE, candidates.length)}/${candidates.length} (ok: ${succeeded}, skipped/failed: ${failed})`);
  }

  console.log(`Done. Embedded: ${succeeded}, skipped/failed: ${failed}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill crashed:', err);
  process.exit(1);
});
