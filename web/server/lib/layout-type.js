/**
 * Layout archetypes for adaptive component counts and structural rules (Phase 2 roadmap).
 */
export const LAYOUT_TYPES = [
  'marketing-landing',
  'business-site',
  'web-app',
  'portfolio',
  'e-commerce'
];

/**
 * Heuristic fallback when the LLM does not set `layoutType` (V2 pipeline, guards).
 */
export function inferLayoutTypeFromPrompt(prompt = '') {
  const p = String(prompt).toLowerCase();

  if (
    /\b(dashboard|admin panel|control panel|saas platform|web app|webapp|internal tool|workspace app|money management|budget app|expense tracker|banking app|fintech|crm|analytics dashboard|data table|sidebar nav)\b/.test(
      p
    )
  ) {
    return 'web-app';
  }
  if (/\b(e-?commerce|online store|shop|marketplace|product grid|shopping cart|checkout|catalog)\b/.test(p)) {
    return 'e-commerce';
  }
  if (/\b(portfolio|photographer|resume|cv|showcase|case studies)\b/.test(p)) {
    return 'portfolio';
  }
  if (/\b(agency|multi-?page|small business|restaurant|local business|blog|corporate site)\b/.test(p)) {
    return 'business-site';
  }
  return 'marketing-landing';
}
