// AI_STABILITY_FIX_V4: Definitive Export & Vision Hardening
import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/provider-helpers.js';
import { resolveCrossProviderFallback } from '../lib/llm-lightweight.js';
import path from 'node:path';

export default async function generateSingleComponent(req, res) {
  try {
    const {
      component,
      designSystem = null,
      prompt,
      overallContext,
      buildMode = 'single_page_multi_section',
      model = 'google/gemini-3.1-pro-preview'
    } = req.body;
    console.log(`[generate-single-component] ROUTE HIT | Component: ${component?.name} | Model: ${model}`);

    if (!component?.path || !component?.name) {
      return res.status(400).json({ success: false, error: 'component with path and name required' });
    }

    const visionPrompt =
      (typeof prompt === 'string' && prompt.trim()) ||
      (typeof overallContext === 'string' && overallContext.trim()) ||
      '';

    const { name, path: filePath, description, designFocus, keyContent, exportName, props: planProps } = component;
    const finalExportName = exportName || name.replace(/\s+/g, '');
    const propsDefaults =
      planProps && typeof planProps === 'object' && !Array.isArray(planProps) && Object.keys(planProps).length > 0
        ? JSON.stringify(planProps, null, 2)
        : '';

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

    const appShellSidebar = /sidebarworkspace|sidebar|leftnav/i.test(finalExportName);
    const appShellMain = /workspacemainpanel|mainpanel|dashboardmain|workspacecontent/i.test(finalExportName);
    const appShellHints =
      appShellSidebar
        ? `\nAPP SHELL — SIDEBAR (LEFT COLUMN):
- Root wrapper MUST be \`h-full min-h-0 w-full min-w-0 flex flex-col overflow-x-hidden\` (fills the aside from App.jsx). Do NOT use \`min-h-screen\`, \`m-4\`, \`mx-auto\`, or outer \`rounded-2xl\`/\`shadow-2xl\` on the root — that creates a “floating card” disconnected from the viewport edge.
- Avoid fixed pixel widths wider than the column; long text should \`truncate\` or wrap. Inner content can use padding (\`p-4\`–\`p-6\`). Do NOT put the primary dashboard grid here.\n`
        : appShellMain
          ? `\nAPP SHELL — MAIN PANEL (RIGHT COLUMN):
- Root wrapper MUST be \`h-full min-h-0 w-full min-w-0 flex flex-col overflow-x-hidden\` and span full width of \`<main>\`. Do NOT add outer horizontal margin or \`max-w-*\` on the root that would inset the whole panel away from the sidebar.
- For multi-column layouts (e.g. grid + right rail), every flex/grid child that should shrink must have \`min-w-0\` (prevents overflow gaps and horizontal scroll at medium widths).
- Include visible dashboard content: stat cards, list/table rows, empty state, CTA. Inner sections may use \`p-4 md:p-6\` but not a second full-page “card” wrapper with gap to the window edge.\n`
          : '';

    const propsInstructions = propsDefaults
      ? `\nPLAN PROPS — copywriter supplied these keys. Destructure with defaults (e.g. const { appName = 'App', ...rest } = props || {}) so the UI never shows the word "undefined":\n${propsDefaults}\n`
      : `\nIf you use dynamic title text, give props default values (e.g. appName = 'App') so the UI never shows the word "undefined".\n`;
    const modeHints =
      buildMode === 'single_page_multi_section'
        ? `\nBUILD MODE CONTRACT: single_page_multi_section. Generate a clean, vertically stackable section that can live in a normal landing page flow. Avoid app-shell-only chrome.`
        : buildMode === 'multi_page'
          ? `\nBUILD MODE CONTRACT: multi_page. This component can be used in routed pages; keep structure reusable and avoid assuming global layout wrappers in this file.`
          : buildMode === 'app_shell'
            ? `\nBUILD MODE CONTRACT: app_shell. Respect app shell constraints and keep layout flush with parent shell containers.`
            : `\nBUILD MODE CONTRACT: single_section. Keep this component focused and self-contained as a standalone section/widget.`;

    const SYSTEM_PROMPT = `You are a senior React developer who builds award-winning, visually stunning components.
You are an API. You MUST output ONLY raw JSON that matches the provided schema perfectly. NO conversation. NO preamble. NO markdown fences.

CURRENT VISION (STAY FOCUSED): "${visionPrompt}"
You are building the component "${name}" for the website about: "${visionPrompt}".
${pageInstructions}
${appShellHints}
${propsInstructions}
${modeHints}

CRITICAL RULES:
1. EXPORT DEFAULT (MANDATORY): You MUST include \`export default function ${finalExportName}(props = {}) { ... }\` (defaults required if using text from props) at the end of the file. NEVER skip the export statement.
2. TAILWIND ONLY: Use only Tailwind utility classes. No inline styles (style={{}}).
3. ICONS: Use 'lucide-react'. Import correctly: import { IconName } from 'lucide-react'.
4. ANIMATIONS: Use 'framer-motion' for fluid entrance animations (initial, whileInView).
5. CONTEXTUAL FIDELITY: Every heading, paragraph, and image alt text MUST relate to "${visionPrompt}".
6. ANTI-BRAINWASHING (CRITICAL): You will see references to other brands (Rivelon, Atelier, Qyvora, SolarScope, Zenity) in the provided design system or industry context. IGNORE THEM. 
   Your theme and ONLY theme is: "${visionPrompt}". 
   DO NOT let generic luxury or tech branding leak into your copy. 
   If the prompt is about "Coffee", do not write about "Quantum Energy" or "Solar Solutions" just because the component had a tech demo name.
7. NO PLACEHOLDERS: Generate real, high-quality copy for the "${visionPrompt}" industry.

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
Load Google Fonts in index.css (@import or @font-face) or inject a <style> tag in the component — NEVER put a raw CSS \`@import\` as line 1 of a .jsx file (it breaks Vite builds).

IMAGE GUIDANCE:
- Search Unsplash for: ${designSystem?.imagery?.unsplashKeywords?.join(', ') || 'aesthetic'}
- Photography style: ${designSystem?.imagery?.style || 'modern'}
- Subjects: ${designSystem?.imagery?.subjects?.join(', ') || 'abstract'}

COMPONENT SPEC:
- Description: ${description}
- Design Focus: ${designFocus}
- Key Content: ${keyContent}

FINAL REMINDER: The user's goal is "${visionPrompt}". Ensure the code is complete with an EXPORT DEFAULT. Or Else.
`;

    let object;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s component generation timeout

    try {
      console.log(`[generate-single-component] Attempting ${name} with ${model}...`);
      const { object: resultObject } = await generateObject({
        model: getModel(model),
        system: SYSTEM_PROMPT,
        prompt: `Create the ${name} component for the "${visionPrompt}" website. Export it as ${finalExportName}.`,
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
          prompt: `Create the ${name} component for the "${visionPrompt}" website. Export it as ${finalExportName}.`,
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
