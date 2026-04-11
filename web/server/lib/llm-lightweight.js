/**
 * Maps a "heavy" user-selected model id to a fast/cheap model on the same provider.
 * Used by polish fillers, mini polish, build narrator, design spec, and auto-repair fallback.
 */
export function resolveLightweightModel(heavyModel = '') {
  if (heavyModel.includes('openai/')) return { id: 'openai/gpt-5.4-mini', useFast: true };
  if (heavyModel.includes('anthropic/')) return { id: 'anthropic/claude-haiku-4-5-20251001', useFast: false };
  return { id: 'google/gemini-2.5-flash', useFast: false };
}

/** Model id for parallel polish design-spec step (never the full Sonnet/Gemini Pro). */
export function resolveDesignSpecModelId(heavyModel = '') {
  return resolveLightweightModel(heavyModel).id;
}

/**
 * When primary generation fails, try another capable model on a different provider.
 */
export function resolveCrossProviderFallback(heavyModel = '') {
  if (heavyModel.includes('openai/')) return 'google/gemini-2.5-flash';
  if (heavyModel.includes('anthropic/')) return 'google/gemini-2.5-flash';
  if (heavyModel.includes('google/')) return 'openai/gpt-5.4';
  return 'google/gemini-2.5-flash';
}
