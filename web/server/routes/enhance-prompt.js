import { generateText } from 'ai';
import { getModel } from '../lib/provider-helpers.js';
import { log } from '../lib/build-manifest.js';

/**
 * Deterministically extract component names that look like named references.
 * Catches patterns like "VortexNeonPricing", "HeroBeams", "Dark Agency Landing" etc.
 * This does NOT rely on the LLM — it parses the raw user input directly.
 */
function extractExplicitComponentNames(rawPrompt) {
  const names = [];

  // Pattern 1: "Use the XYZ component" / "use XYZ from the community"
  const usePatterns = [
    /use\s+(?:the\s+)?["']?([A-Z][A-Za-z0-9]+(?:\s*[A-Z][A-Za-z0-9]*)*)["']?\s+(?:component|from|for|in)/gi,
    /(?:include|add|incorporate)\s+(?:the\s+)?["']?([A-Z][A-Za-z0-9]+(?:\s*[A-Z][A-Za-z0-9]*)*)["']?\s+(?:component|from|for|in|section)/gi,
  ];

  for (const pattern of usePatterns) {
    let match;
    while ((match = pattern.exec(rawPrompt)) !== null) {
      const name = match[1].trim();
      // Filter out generic words that aren't component names
      if (name.length > 3 && !['The', 'This', 'That', 'React', 'Tailwind', 'Vite'].includes(name)) {
        names.push(name);
      }
    }
  }

  // Pattern 2: PascalCase compound words (VortexNeonPricing, HeroBeams, etc.)
  const pascalCasePattern = /\b([A-Z][a-z]+(?:[A-Z][a-z]+){1,})\b/g;
  let pcMatch;
  while ((pcMatch = pascalCasePattern.exec(rawPrompt)) !== null) {
    const name = pcMatch[1];
    // Exclude common non-component words
    if (!['LandingPage', 'WebApp', 'WebSite', 'HomePage', 'ReactApp'].includes(name)) {
      if (!names.includes(name)) names.push(name);
    }
  }

  return [...new Set(names)];
}

export default async function enhancePrompt(req, res) {
  const ENHANCE_MODEL = 'google/gemini-2.5-flash';  // Fast stable model — avoids RPM collision with pro-preview
  const TIMEOUT_MS = 15_000;                         // 15s hard timeout — never block the pipeline

  try {
    const { prompt, images = [], mode = 'prompt-only', buildId } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }

    log(buildId, `[enhance-prompt] Enhancing: ${prompt.substring(0, 80)}... ${images.length ? `(with ${images.length} images)` : ''}`);

    // STEP 1: Deterministically extract any explicitly named components from the RAW user prompt
    const explicitComponents = extractExplicitComponentNames(prompt);
    if (explicitComponents.length > 0) {
      console.log(`[enhance-prompt] 🎯 Deterministically extracted explicit components: ${explicitComponents.join(', ')}`);
    }

    const systemPrompt = `You are a senior UX strategist at a top-tier design agency. You transform vague
client briefs into detailed creative specifications that win Awwwards.

CRITICAL CONTEXT RULES:
1. ANALYZE the user's industry/niche FIRST:
   - What business is this? (e.g., dog grooming, SaaS, restaurant, race cars)
   - Who is the target audience? (demographics, expectations)
   - What is the emotional goal? (trust, excitement, comfort, prestige)

2. PRODUCE INDUSTRY-SPECIFIC COPY:
   - For a dog grooming site: "Where Every Pup Gets the Royal Treatment"
   - For a fintech app: "Banking Infrastructure for the AI Era"
   - For a restaurant: "Farm to Table. Heart to Plate."
   - For a race car company: "Engineered for the Edge. Built for the Apex."
   - NEVER: "Welcome to Our Website" or "Your Trusted Partner"

3. SPECIFY DESIGN DIRECTION (MANDATORY):
   - Color mood: warm earth tones, cool corporate blues, vibrant neons
   - Typography feel: rounded and friendly, sharp and modern, elegant serif
   - Layout style: open and airy, dense and information-rich, bold and dramatic
   - Animation mood: subtle and professional, playful bounces, cinematic reveals

4. INCLUDE SECTION-BY-SECTION DIRECTION:
   For each major section (Hero, Features, CTA, etc.) specify:
   - Headline copy (specific to the industry, not generic)
   - Supporting copy (2-3 sentences)
   - Visual direction (what image/video/animation)
   - Emotional goal of the section

5. OUTPUT FORMAT: Structured specification, 250-500 words, no preamble. Use Markdown headers.

6. NO GENERIC BRANDING: Use the user's specific topic for ALL copy. Never invent brand names unless part of the user request.

7. IF the user names specific UI components, mention them naturally in the relevant section.`;

    const userPrompt = `ORIGINAL REQUEST:\n${prompt}\n\nTransform this into a premium website specification. Follow the mandatory output structure. Write real copy, not placeholders. Provide actionable design direction.`;

    // Prepare content parts for multi-modal support
    const content = [{ type: 'text', text: userPrompt }];
    images.forEach((img) => {
      const base64Data = typeof img === 'string' ? img.split(',').pop() : img.data;
      const mimeType = typeof img === 'string' ? (img.match(/data:([^;]+);/) || [])[1] || 'image/png' : img.mimeType;
      content.push({ type: 'image', image: base64Data, mimeType });
    });

    // AbortController: hard 15s timeout so the pipeline NEVER hangs
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let enhancedPrompt;
    try {
      const result = await generateText({
        model: getModel(ENHANCE_MODEL),
        system: systemPrompt,
        messages: [{ role: 'user', content }],
        maxTokens: 800,
        abortSignal: controller.signal,
      });
      enhancedPrompt = result.text;
    } finally {
      clearTimeout(timeout);
    }

    if (!enhancedPrompt?.trim()) {
      log(buildId, `[enhance-prompt] Empty response, using original prompt`);
      return res.json({ success: true, enhancedPrompt: prompt, wasEnhanced: false });
    }

    // STEP 2: Deterministically append the EXPLICIT_COMPONENTS tag
    // This is NEVER left to the LLM — we always append it ourselves.
    let finalOutput = enhancedPrompt.trim();
    if (explicitComponents.length > 0) {
      finalOutput += `\n\nEXPLICIT_COMPONENTS: [${explicitComponents.join(', ')}]`;
      console.log(`[enhance-prompt] ✅ Appended EXPLICIT_COMPONENTS tag: [${explicitComponents.join(', ')}]`);
    }

    log(buildId, `[enhance-prompt] Enhanced successfully, length: ${finalOutput.length}`);
    res.json({ success: true, enhancedPrompt: finalOutput, wasEnhanced: true });
  } catch (error) {
    // Graceful degradation: ALWAYS return the original prompt so the pipeline continues
    const isAbort = error.name === 'AbortError' || error.message?.includes('aborted');
    const isRateLimit = error.name === 'AI_RetryError' || error.message?.includes('429') || error.message?.includes('503');

    if (isAbort) {
      console.warn(`[enhance-prompt] ⏱ Timed out after ${TIMEOUT_MS}ms, falling back to original prompt`);
    } else if (isRateLimit) {
      console.warn(`[enhance-prompt] 🚦 Rate limited, falling back to original prompt`);
    } else {
      console.error('[enhance-prompt] Error:', error.message || error);
    }

    // NEVER block the pipeline — return the original prompt as-is
    const originalPrompt = req.body?.prompt || '';
    res.json({ success: true, enhancedPrompt: originalPrompt, wasEnhanced: false });
  }
}
