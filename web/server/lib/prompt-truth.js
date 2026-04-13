/**
 * Detect when an "enhanced" prompt is actually model refusal / safety boilerplate
 * (so we do not poison select-components, V2, and planning).
 */
export function isLikelyModelRefusalResponse(text) {
  const t = String(text || '').trim();
  if (t.length < 60) return false;
  const low = t.toLowerCase();
  if (/\brespectfully decline\b/.test(low)) return true;
  if (/\b(i can'?t|i cannot|unable to|won't be able to)\b/.test(low) && /\b(ethical|policy|guidelines|refuse)\b/.test(low)) {
    return true;
  }
  if (/\bdeclin(e|ing)\b/.test(low) && /\b(deception|infidelity|harmful|cannot help)\b/.test(low)) return true;
  return false;
}

export function resolvePrimaryPlanningPrompt(rawPrompt, enhancedOrFinalPrompt) {
  const raw = typeof rawPrompt === 'string' ? rawPrompt.trim() : '';
  const fin = typeof enhancedOrFinalPrompt === 'string' ? enhancedOrFinalPrompt.trim() : '';
  if (raw.length > 0 && isLikelyModelRefusalResponse(fin)) return raw;
  return fin || raw;
}
