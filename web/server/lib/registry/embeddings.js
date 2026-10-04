/**
 * Component embeddings — semantic retrieval layer.
 *
 * Embeds the AI-extracted design metadata of every catalog component with
 * Gemini embeddings (768 dims, pgvector). Used by:
 *   - registry.getCatalogForPromptAsync (hybrid semantic + quality ranking)
 *   - workers/submission-analyzer.js (embed on submission analysis)
 *   - scripts/backfill-component-embeddings.js (one-time backfill)
 */

import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMENSIONS = 768;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const googleAI = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

export function embeddingsAvailable() {
  return Boolean(googleAI && supabase);
}

/**
 * Embed arbitrary text. taskType should be 'RETRIEVAL_QUERY' for user prompts
 * and 'RETRIEVAL_DOCUMENT' for component metadata.
 * Returns number[] (length 768) or null on failure.
 */
export async function embedText(text, { taskType = 'RETRIEVAL_QUERY', timeoutMs = 8000 } = {}) {
  if (!googleAI || !text) return null;
  try {
    const response = await Promise.race([
      googleAI.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: String(text).slice(0, 8000),
        config: {
          taskType,
          outputDimensionality: EMBEDDING_DIMENSIONS
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('embedding timeout')), timeoutMs))
    ]);
    const values = response?.embeddings?.[0]?.values || response?.embedding?.values || null;
    if (!Array.isArray(values) || values.length === 0) return null;
    return values;
  } catch (error) {
    console.warn('[embeddings] embedText failed:', error.message);
    return null;
  }
}

/**
 * Canonical embedding text for a components table row (snake_case DB fields).
 */
export function buildComponentEmbeddingText(row = {}) {
  const list = (value) => {
    const parsed = typeof value === 'string' ? safeParse(value) : value;
    return Array.isArray(parsed) ? parsed.join(', ') : '';
  };
  return [
    row.name && `Name: ${row.name}`,
    row.category && `Category: ${row.category}`,
    row.description && `Description: ${row.description}`,
    row.visual_description && `Visual: ${row.visual_description}`,
    row.mood_tone && `Mood: ${row.mood_tone}`,
    row.design_personality && `Personality: ${row.design_personality}`,
    row.typography_style && `Typography: ${row.typography_style}`,
    row.layout_type && `Layout: ${row.layout_type}`,
    row.color_mode && `Color mode: ${row.color_mode}`,
    list(row.tags) && `Tags: ${list(row.tags)}`,
    list(row.keywords) && `Keywords: ${list(row.keywords)}`,
    list(row.suitable_for) && `Suitable for: ${list(row.suitable_for)}`,
    list(row.industry_tags) && `Industries: ${list(row.industry_tags)}`
  ].filter(Boolean).join('\n');
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function hashEmbeddingText(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex');
}

/**
 * Compute and persist the embedding for one components row.
 * Skips work when the metadata hash hasn't changed.
 * Returns true when an embedding was written.
 */
export async function upsertComponentEmbedding(row) {
  if (!supabase || !row?.id) return false;

  const text = buildComponentEmbeddingText(row);
  if (!text) return false;
  const textHash = hashEmbeddingText(text);
  if (row.embedding_text_hash === textHash && row.embedding) return false;

  const vector = await embedText(text, { taskType: 'RETRIEVAL_DOCUMENT', timeoutMs: 15000 });
  if (!vector) return false;

  const { error } = await supabase
    .from('components')
    .update({
      embedding: vector,
      embedding_text_hash: textHash,
      embedding_updated_at: new Date().toISOString()
    })
    .eq('id', row.id);

  if (error) {
    console.warn(`[embeddings] upsert failed for ${row.component_id || row.id}:`, error.message);
    return false;
  }
  return true;
}

/**
 * Semantic search over active components.
 * Returns Map<componentSlug, similarity> (and Map by uuid), or null when
 * embeddings are unavailable / the query can't be embedded.
 */
export async function semanticMatchComponents(promptText, { matchCount = 40 } = {}) {
  if (!embeddingsAvailable() || !promptText?.trim()) return null;

  const queryVector = await embedText(promptText, { taskType: 'RETRIEVAL_QUERY' });
  if (!queryVector) return null;

  try {
    const { data, error } = await supabase.rpc('match_components', {
      query_embedding: queryVector,
      match_count: matchCount
    });
    if (error) {
      console.warn('[embeddings] match_components RPC failed:', error.message);
      return null;
    }
    if (!Array.isArray(data) || data.length === 0) return null;

    const bySlug = new Map();
    const byUuid = new Map();
    for (const row of data) {
      if (row.component_id) bySlug.set(row.component_id, row.similarity);
      if (row.id) byUuid.set(row.id, row.similarity);
    }
    return { bySlug, byUuid };
  } catch (error) {
    console.warn('[embeddings] semanticMatchComponents failed:', error.message);
    return null;
  }
}

/**
 * Load survival-rate stats (agent usage flywheel) for ranking.
 * Returns Map<componentUuid, { installs, survivalRate }> — empty on failure.
 */
export async function loadSurvivalStats() {
  const stats = new Map();
  if (!supabase) return stats;
  try {
    const { data, error } = await supabase
      .from('component_survival_stats')
      .select('component_id, installs, survival_rate');
    if (error || !Array.isArray(data)) return stats;
    for (const row of data) {
      stats.set(row.component_id, {
        installs: row.installs || 0,
        survivalRate: typeof row.survival_rate === 'number' ? row.survival_rate : null
      });
    }
    return stats;
  } catch {
    return stats;
  }
}
