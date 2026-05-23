import { getProviderFromModelId, normalizeModelId, resolveModelRole } from '../shared/model-registry.js';

/**
 * Maps a "heavy" user-selected model id to a fast/cheap model on the same provider.
 * Used by polish fillers, mini polish, build narrator, design spec, and auto-repair fallback.
 */
export function resolveLightweightModel(heavyModel = '') {
  const provider = getProviderFromModelId(normalizeModelId(heavyModel));
  if (provider === 'openai') return { id: resolveModelRole('fastPolish'), useFast: true };
  if (provider === 'anthropic') return { id: resolveModelRole('fastAnthropic'), useFast: false };
  return { id: resolveModelRole('lightweight'), useFast: false };
}

/** Model id for parallel polish design-spec step (never the full premium model). */
export function resolveDesignSpecModelId(heavyModel = '') {
  return resolveLightweightModel(heavyModel).id;
}

/**
 * When primary generation fails, try another capable model on a different provider.
 */
export function resolveCrossProviderFallback(heavyModel = '') {
  const provider = getProviderFromModelId(normalizeModelId(heavyModel));
  if (provider === 'openai') return resolveModelRole('crossProviderFallbackFromOpenAI');
  if (provider === 'anthropic') return resolveModelRole('crossProviderFallbackFromAnthropic');
  if (provider === 'google') return resolveModelRole('crossProviderFallbackFromGoogle');
  return resolveModelRole('generalGeneration');
}
