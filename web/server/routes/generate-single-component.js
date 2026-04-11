// AI_STABILITY_FIX_V4: Definitive Export & Vision Hardening
import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/provider-helpers.js';
import { resolveCrossProviderFallback } from '../lib/llm-lightweight.js';
import path from 'node:path';

export default async function generateSingleComponent(req, res) {
  try {
    const { component, designSystem = null, prompt, model = 'google/gemini-3.1-pro-preview' } = req.body;
    console.log(`[generate-single-component] ROUTE HIT | Component: ${component?.name} | Model: ${model}`);

    if (!component?.path || !component?.name) {
      return res.status(400).json({ success: false, error: 'component with path and name required' });
    }

    const { name, path: filePath, description, designFocus, keyContent, exportName } = component;
    const finalExportName = exportName || name.replace(/\s+/g, '');

    const schema = z.object({
      path: z.string().describe('The file path, exactly as provided in the prompt.'),
      content: z.string().describe('The complete code for the file.'),
      exportName: z.string().describe('The name of the exported component (e.g. HeroSection).'),
      imports: z.array(z.string()).describe('List of imports used in the file.')
    });

    const isPage = filePath && filePath.startsWith('src/pages/');
    const pageInstructions = isPage 
      ? `\nMPA PAGE AWARENESS (CRITICAL): You are generating a FULL PAGE component located at ${filePath}. 
- Do NOT render a Header, Navbar, or Footer. Those are handled by the shared layout in App.jsx.
- If you import other custom sections, your import path must be relative to src/components/ (e.g., '../components/Hero' or '../components/premium/Contact').` 
      : `\nMPA SECTION AWARENESS: You are generating a reusable UI section located at ${filePath}.`;

    const SYSTEM_PROMPT = `You are a senior React developer who builds award-winning, visually stunning components.
You are an API. You MUST output ONLY raw JSON that matches the provided schema perfectly. NO conversation. NO preamble. NO markdown fences.

CURRENT VISION (STAY FOCUSED): "${prompt}"
You are building the component "${name}" for the website about: "${prompt}".
${pageInstructions}

CRITICAL RULES:
1. EXPORT DEFAULT (MANDATORY): You MUST include \`export default function ${finalExportName}() { ... }\` at the end of the file. NEVER skip the export statement.
2. TAILWIND ONLY: Use only Tailwind utility classes. No inline styles (style={{}}).
3. ICONS: Use 'lucide-react'. Import correctly: import { IconName } from 'lucide-react'.
4. ANIMATIONS: Use 'framer-motion' for fluid entrance animations (initial, whileInView).
5. CONTEXTUAL FIDELITY: Every heading, paragraph, and image alt text MUST relate to "${prompt}".
6. ANTI-BRAINWASHING (CRITICAL): You will see references to other brands (Rivelon, Atelier, Qyvora, SolarScope, Zenity) in the provided design system or industry context. IGNORE THEM. 
   Your theme and ONLY theme is: "${prompt}". 
   DO NOT let generic luxury or tech branding leak into your copy. 
   If the prompt is about "Coffee", do not write about "Quantum Energy" or "Solar Solutions" just because the component had a tech demo name.
7. NO PLACEHOLDERS: Generate real, high-quality copy for the "${prompt}" industry.

MANDATORY DESIGN SYSTEM (DO NOT DEVIATE):
- Primary Color: ${designSystem?.colorPalette?.primary || '#000'}
- Secondary Color: ${designSystem?.colorPalette?.secondary || '#000'}
- Accent Color: ${designSystem?.colorPalette?.accent || '#000'}
- Background: ${designSystem?.colorPalette?.background || '#000'}
- Text Color: ${designSystem?.colorPalette?.text || '#fff'}
- Gradient: ${designSystem?.colorPalette?.gradient || 'none'}
- Heading Font: ${designSystem?.typography?.headingFont || 'Inter'}
- Body Font: ${designSystem?.typography?.bodyFont || 'Inter'}
- Border Radius: ${designSystem?.layoutPreferences?.borderRadius || '0.5rem'}
- Card Style: ${designSystem?.layoutPreferences?.cardStyle || 'flat'}

YOU MUST USE THESE EXACT COLORS. Do NOT invent your own palette.
Import Google Fonts via @import url() at the top of the component.

IMAGE GUIDANCE:
- Search Unsplash for: ${designSystem?.imagery?.unsplashKeywords?.join(', ') || 'aesthetic'}
- Photography style: ${designSystem?.imagery?.style || 'modern'}
- Subjects: ${designSystem?.imagery?.subjects?.join(', ') || 'abstract'}

COMPONENT SPEC:
- Description: ${description}
- Design Focus: ${designFocus}
- Key Content: ${keyContent}

FINAL REMINDER: The user's goal is "${prompt}". Ensure the code is complete with an EXPORT DEFAULT. Or Else.
`;

    let object;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s component generation timeout

    try {
      console.log(`[generate-single-component] Attempting ${name} with ${model}...`);
      const { object: resultObject } = await generateObject({
        model: getModel(model),
        system: SYSTEM_PROMPT,
        prompt: `Create the ${name} component for the "${prompt}" website. Export it as ${finalExportName}.`,
        schema: schema,
        temperature: 0,
        abortSignal: controller.signal
      });
      clearTimeout(timeoutId);
      object = resultObject;
    } catch (err) {
      const fallbackModel = resolveCrossProviderFallback(model);
      console.warn(`[generate-single-component] Model ${model} failed, retrying with ${fallbackModel}. Error:`, err.message);
      try {
        const { object: resultObject } = await generateObject({
          model: getModel(fallbackModel),
          system: SYSTEM_PROMPT,
          prompt: `Create the ${name} component for the "${prompt}" website. Export it as ${finalExportName}.`,
          schema: schema,
          temperature: 0,
        });
        object = resultObject;
      } catch (fallbackErr) {
        console.error(`[generate-single-component] Fallback model also failed.`, fallbackErr.message);
        throw fallbackErr; // Throw to the outer catch block to be handled by the 503 logic
      }
    }

    // FORCE FLAT PATH: Ensure App.jsx can find the component
    const baseFileName = path.basename(filePath);
    let finalPath = `src/components/${baseFileName}`;
    if (!finalPath.endsWith('.jsx')) {
      finalPath = finalPath.replace(/\.[a-z]+$/, '') + '.jsx';
    }

    console.log(`\n=== GENERATED ${object.exportName} ===\n${object.content.substring(0, 500)}...\n`);

    res.json({
      success: true,
      path: finalPath,
      name: object.exportName,
      content: object.content,
      imports: object.imports
    });

  } catch (error) {
    console.error('[generate-single-component] CRITICAL ERROR:', error.message || error);

    // Check if it's an AI SDK RetryError or APICallError indicating quota/demand issues
    if (error.name === 'AI_RetryError' || error.message?.includes('maxRetriesExceeded') || error.message?.includes('429') || error.message?.includes('503')) {
      return res.status(503).json({
        success: false,
        error: 'AI Provider is currently unavailable due to high demand or quota limits. Please try again later or check your API keys.'
      });
    }

    res.status(500).json({ success: false, error: error.message });
  }
}
