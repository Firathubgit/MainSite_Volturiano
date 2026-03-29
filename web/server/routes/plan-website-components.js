// AI_STABILITY_FIX_V3: Force-Flattened Paths & JSX Enforcement
import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '../lib/provider-helpers.js';
import { createManifest, updateManifest, log } from '../lib/build-manifest.js';
import { AIBuildNarrator } from '../shared/sse-events.js';
import { getOpenAIClient } from '../lib/openai-client.js';
import path from 'node:path';
import { selectComponentsV2 } from '../lib/select-components-v2.js';
import { recordComponentSelections } from '../lib/retention-tracker.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';

const componentSchema = z.object({
  name: z.string(),
  refId: z.string().describe('Unique reference ID for this component (e.g. "cmp_hero_01")'),
  exportName: z.string().describe('PascalCase export name (e.g. "HeroSection")'),
  path: z.string().describe('The file path. MUST be flat: "src/components/Name.jsx"'),
  description: z.string(),
  designFocus: z.string(),
  keyContent: z.string().nullable().describe('Key copy/content for this component. Required but can be null if none.'),
  source: z.enum(['premium', 'generated']).describe('Whether this component comes from the premium catalog or is LLM-generated'),
  bundleId: z.string().nullable().describe('If source is "premium", the exact component ID from the catalog. Null otherwise.'),
  props: z.record(z.string()).nullable().describe('If source is "premium", simple key-value prop overrides (strings only).'),
  role: z.enum(['header', 'hero', 'feature', 'footer']).describe('Strict functional role of this component'),
});

const pageAssignment = z.object({
  pagePath: z.string().describe('URL path like "/" or "/about"'),
  pageLabel: z.string().describe('Navigation label like "Home" or "About Us"'),
  pageComponent: z.string().describe('PascalCase component name like "Home" or "About"'),
  navVisible: z.boolean().describe('Whether this page appears in the main navigation'),
  componentRefIds: z.array(z.string()).describe('Ordered list of component refIds assigned to this page'),
});

const planSchema = z.object({
  complexity: z.enum(['simple', 'medium', 'complex']).describe('Complexity level of the request'),
  components: z.array(componentSchema).min(1).max(30),
  globalStyle: z.string(),
  appImports: z.array(z.string()),
  requiredPackages: z.array(z.string()).describe('List of NPM packages needed for these components (e.g. ["react-router-dom", "framer-motion"])'),
  appComposition: z.object({
    order: z.array(z.object({
      refId: z.string(),
    })),
  }),
  isMultiPage: z.boolean().default(false).describe('Whether this site needs multi-page routing. Only true if user explicitly requests multiple pages.'),
  pages: z.array(pageAssignment).optional().describe('Page definitions with routes. Only present when isMultiPage is true.'),
  sharedComponentRefIds: z.array(z.string()).optional().describe('RefIds of components shared across ALL pages (e.g. header, footer). Only present when isMultiPage is true.'),
});

export default async function planWebsiteComponents(req, res) {
  // premiumMode: 'off' | 'hybrid' | 'strict' (default: 'hybrid')
  // If 'off', the frontend shouldn't have sent selectionContext, but we handle it anyway.
  const {
    prompt,
    images = [],
    model = 'google/gemini-3.1-pro-preview',
    selectionContext,
    designSystem = null,
    buildId,
    generateNarration = false,
    premiumMode = 'hybrid',
    manualSelectionIds = [],
    strictMode = false
  } = req.body;
  console.log(`[plan-website-components] ROUTE HIT | BuildId: ${buildId} | Model: ${model} | PremiumMode: ${premiumMode}`);

  try {
    if (!prompt) return res.status(400).json({ success: false, error: 'prompt is required' });

    createManifest(buildId, 'initial');
    log(buildId, `[plan-website-components] Planning for: ${prompt.substring(0, 80)}...`);

    const content = [{ type: 'text', text: prompt }];

    // Dynamic fairness rule based on mode
    let fairnessRule = '';
    if (premiumMode === 'strict') {
      fairnessRule = `CRITICAL ASSIGNMENT RULE (STRICT MODE):
      1. You are FORBIDDEN from generating a custom component if a Premium Component is available in the selection context.
      2. You MUST use the 'bundleId' and set 'source': 'premium' for any component where a Premium option exists in the context.
      3. VIOLATION: Generating a component when a premium one exists will cause a system failure.
      4. Only use 'source': 'generated' if explicitly NO premium component exists for that specific role in the provided context.`;
    } else if (premiumMode === 'off') {
      fairnessRule = `STRICT GENERATION RULE (PREMIUM MODE OFF):
      1. You are FORBIDDEN from using any premium components.
      2. Set 'source': 'generated' and 'bundleId': null for ALL components.
      3. Focus entirely on original, creative LLM-generation to suit the user's specific request.
      4. IGNORE any SELECTION CONTEXT provided; it is for premium modes only.`;
    } else {
      // Hybrid / Default
      fairnessRule = `fairness_rule: "Treat 'premium' and 'generated' choices equally based on fit. A generated footer is just as valid as a premium one if it fits the prompt better."`;
    }

    const SYSTEM_PROMPT = `You are a senior web architect planning a premium, production-quality website.
You are an API. You MUST output ONLY raw JSON that matches the provided schema perfectly. NO conversation. NO preamble. NO markdown blocks.

COMPLEXITY ANALYSIS & COMPONENT COUNTS(STRICT):
  1. First, determine the complexity of the request:
  - "Simple"(Landing page, Portfolio, Coming Soon, single product): 5 - 6 components
    - "Medium"(Small business, Agency, Blog, Info site): 6 - 7 components
      - "Complex"(SaaS Dashboard, E - commerce, Web App, Massive Platform): 8 - 9 components
  2. Set the 'complexity' field to one of these values.
3. GENERATE THE EXACT NUMBER OF COMPONENTS for that complexity level.

    COMPLETENESS & ORDERING RULES(STRICT):
  1. ** HEADER(Mandatory, Role: 'header') **: Must be the VERY FIRST component.
2. ** HERO(Mandatory, Role: 'hero') **: Must be the SECOND component.
3. ** CONTENT(Variable, Role: 'feature') **: 3 - 6 sections between Hero and Footer.
4. ** FOOTER(Mandatory, Role: 'footer') **: Must be the VERY LAST component.

    NOTE: You MUST include a Header and Footer even if not explicitly asked.It is required for a complete website.

      ${fairnessRule}

COMPONENT NAMING — use FUNCTIONAL names, not thematic names:
  - GOOD: HeroSection, FeaturesGrid, TestimonialsCarousel, PricingTable, FooterSection, CTABanner
    - BAD: BrainrotPage, CognitiveLoadMeter, SpiralModal, NoiseConsentToggle, DetoxChapter
      - The component name should describe WHAT IT DOES for the user, not the topic of the website

FORBIDDEN COMPONENT TYPES:
  - No joke / meme components(e.g. "CognitiveLoadMeter", "NoiseConsentToggle")
    - No meta - commentary components that break the 4th wall
      - No experimental UX that serves the theme over usability
        - No audio / noise generators, no "chaos" components
          - No duplicate functionality(don't plan a "BrainrotPage" AND a "HeroSection" — just plan HeroSection)

PER - COMPONENT REQUIREMENTS:
            - description: must describe the visual layout, not just the topic(e.g. "3-column card grid with gradient borders and icon headers" not "shows features")
          - designFocus: must reference real design patterns(e.g. "glassmorphism cards with blur-20 backdrop", "bento grid layout", "alternating image-text rows")
          - keyContent: must contain REAL sample copy, not placeholders.Write "Reclaim Your Attention" not "Headline goes here"

TECHNICAL RULES:
            - All paths MUST be flat: "src/components/Name.jsx"(NO subfolders)
          - All files MUST have.jsx extension
          - NEVER plan imports from './cn', './utils', './hooks', './Modal', './Button'
          - Every component MUST be self - contained or import ONLY from this planned list
            - UI LIBS BANNED: @headlessui/react, @chakra-ui/react, @radix - ui, shadcn, react - intersection - observer, class- variance - authority
              - Use ONLY: Vanilla React + Tailwind CSS + Framer Motion
                - TAILWIND: No escaped quotes in classNames.Use font - ['Font_Name'] with single quotes
                  - ICONS: Use 'lucide-react' only.NEVER 'react-icons/lucide'.Use correct names: Plus(not Add), Trash2(not Delete), ExternalLink(not Link)
                    - Dependencies: ONLY framer - motion, lucide - react, react - router - dom, react - icons, clsx, tailwind - merge

CONTENT FIDELITY(CRITICAL):
  - ALL component descriptions, keyContent, and designFocus MUST relate to the user's ACTUAL TOPIC
  - If the user wants a "brainrot" site, features must be about brainrot(e.g. "screen time tracking", "dopamine detox") — NOT about "AI Revolution", "Cybersecurity", "Quantum Computing"
  - Do NOT pad components with generic tech / business buzzwords from unrelated industries
  - Every mock data entry must feel like it belongs on THIS specific website

PREMIUM COMPONENT TEXT CUSTOMIZATION:
When you include a premium component (source: 'premium'), you MUST customize
its props with REAL content relevant to the user's website:
- title: Industry-specific headline (NOT "Welcome to Our Website")
- subtitle: Specific supporting copy
- features: Real feature list based on the business type
- stats: Realistic, rounded numbers appropriate for the industry
- ctaText: Action-oriented text matching the conversion goal

DESIGN COHERENCE — "LESS IS MORE":
  - ALL components must use the SAME color palette from the design system below
    - Do NOT invent new colors per component.Use ONLY the provided palette.
- Prefer clean, minimal layouts.One visual motif per section, not five competing effects.
- Consistent typography: same heading font, same body font throughout${designSystem ? `

DESIGN SYSTEM (USE THESE EXACT COLORS AND FONTS):
- Background: ${designSystem.colorPalette?.background || 'dark'}
- Surface/Cards: ${designSystem.colorPalette?.surface || 'inherit'}
- Primary: ${designSystem.colorPalette?.primary || '#000'}
- Accent: ${designSystem.colorPalette?.accent || '#000'}
- Text: ${designSystem.colorPalette?.text || '#fff'}
- Text Muted: ${designSystem.colorPalette?.textSecondary || 'inherit'}
- Gradient: ${designSystem.colorPalette?.gradient || 'none'}
- Mode: ${designSystem.colorPalette?.mode || 'dark'}
- Heading Font: ${designSystem.typography?.headingFont || 'Inter'}
- Body Font: ${designSystem.typography?.bodyFont || 'Inter'}
- Card Style: ${designSystem.layoutPreferences?.cardStyle || 'glass'}
- Border Radius: ${designSystem.layoutPreferences?.borderRadius || '0.75rem'}
- Section Padding: ${designSystem.layoutPreferences?.sectionPadding || 'py-20'}` : ''
      }

MULTI-PAGE PLANNING RULES:
1. Default to Multi-Page Application (set isMultiPage: true). Generate a "Home" page ("/") and at least one other page (e.g., "/about" or "/contact").
2. "Single Page Override": If the user explicitly asks for a "single page website", "landing page", or specifically mentions "one-page website", you MUST set isMultiPage: false.
3. When isMultiPage is true:
   - Header and Footer components are ALWAYS shared (add their refIds to sharedComponentRefIds)
   - Each page gets its OWN set of content components via the pages array
   - The Home page ("/") gets the primary hero and main content sections
   - Secondary pages get focused content appropriate to their purpose
   - Every page referenced in the header nav MUST have a matching page entry
4. When isMultiPage is false (single page mode):
   - Do NOT include pages or sharedComponentRefIds fields
   - Plan components as a flat vertical stack (e.g. Hero, Features, Pricing, Footer) in the root components array

${premiumMode === 'off' ? '<!-- Premium selection disabled -->' : `SELECTION CONTEXT: ${JSON.stringify(selectionContext)}`} `;

    // =========================================================================
    // V2 PIPELINE INTEGRATION
    // =========================================================================

    let planData;
    let aiNarration = null;

    if (premiumMode === 'strict' || premiumMode === 'hybrid') {
      // 🚀 USE NEW PHASE S8 V2 PIPELINE (for both strict & hybrid)
      console.log(`[plan-website-components] ⚡ Redirecting to ULTRA V2 Pipeline... (mode: ${premiumMode})`);

      const v2Context = {
        industry: designSystem?.industryCategory || '',
        colorMode: designSystem?.colorPalette?.mode || 'dark',
        warmth: 'neutral', // default, could derive from ds
      };

      // Propagation of EXPLICIT_COMPONENTS from enhance-prompt
      const explicitMatch = prompt.match(/EXPLICIT_COMPONENTS:\s*\[(.*?)\]/i);
      const explicitNames = explicitMatch && explicitMatch[1] ? explicitMatch[1].split(',').map(s => s.trim().replace(/['"`]/g, '')).filter(Boolean) : [];

      // CRITICAL: Also propagate V1 selection results as mandatory components
      // V1 select-components already did a full-catalog LLM selection — V2 must respect it
      const v1ComponentIds = [];
      if (selectionContext?.selections?.length > 0) {
        selectionContext.selections.forEach(s => {
          if (s.componentId && s.confidence >= 0.7) {
            v1ComponentIds.push(s.componentId);
          }
        });
        console.log(`[plan-website-components] 🎯 V1 selected ${v1ComponentIds.length} components to propagate: ${v1ComponentIds.join(', ')}`);
      }

      // Merge: explicit user requests + Manual selections = true mandatory for V2
      // (V1 selections are deliberately excluded from mandatory so they don't overpower the user's 6-10 cap)
      let allMandatory;
      if (strictMode && manualSelectionIds.length > 0) {
        console.log(`[plan-website-components] 🔒 STRICT MODE + MANUAL SELECTION: Only using ${manualSelectionIds.length} user-selected components.`);
        allMandatory = manualSelectionIds;
      } else {
        allMandatory = [...new Set([...explicitNames, ...manualSelectionIds])];
      }

      const v2Result = await selectComponentsV2(prompt, v2Context, allMandatory, strictMode);

      // Map V2 components (DB rows) into the exact V1 shape the frontend expects
      const mappedComponents = v2Result.components.map((dbComp, idx) => {
        // Derive clean export name, e.g. "ui_hero_01" -> "UiHero01" -> "HeroSection" (fallback)
        let safeExportName = dbComp.name.replace(/[^a-zA-Z0-9]/g, '');
        if (!safeExportName) safeExportName = `Component${idx}`;

        // Ensure path looks like what the frontend expects for premium injection
        let fakePath = `src/components/premium/${dbComp.component_id}.jsx`;

        return {
          name: dbComp.name,
          refId: dbComp.component_id,
          exportName: safeExportName,
          path: fakePath,
          description: dbComp.description || dbComp.visual_description || 'Premium component',
          designFocus: dbComp.mood_tone || 'modern',
          keyContent: '',
          source: 'premium',
          bundleId: dbComp.component_id,
          props: {},
          role: dbComp.category === 'header' ? 'header' : (dbComp.category === 'hero' ? 'hero' : (dbComp.category === 'footer' ? 'footer' : 'feature'))
        };
      });

      // ═══════════════════════════════════════════════════════════════════
      // HYBRID MODE: Add AI-generated components for uncovered categories
      // V2 selects the BEST premium components, but in hybrid mode the LLM
      // also identified customComponentsNeeded (from V1 select-components).
      // We add placeholder "generated" components for those here so the
      // downstream generate-single-component step will create them from scratch.
      // ═══════════════════════════════════════════════════════════════════
      if (premiumMode === 'hybrid') {
        const coveredRoles = new Set(mappedComponents.map(c => c.role));
        const customNeeded = selectionContext?.customComponentsNeeded || [];
        
        // Determine which standard roles are missing
        const standardRoles = ['header', 'hero', 'feature', 'footer'];
        const missingRoles = standardRoles.filter(r => !coveredRoles.has(r));
        
        // Also add components for any custom needs identified by V1 selection
        const generatedAdditions = [];
        
        // Add missing standard roles as generated components
        missingRoles.forEach(role => {
          const roleNames = { header: 'HeaderSection', hero: 'HeroSection', feature: 'FeaturesSection', footer: 'FooterSection' };
          const name = roleNames[role] || `${role.charAt(0).toUpperCase() + role.slice(1)}Section`;
          generatedAdditions.push({
            name,
            refId: `gen_${role}_01`,
            exportName: name,
            path: `src/components/${name}.jsx`,
            description: `AI-generated ${role} section tailored to the user's specific request`,
            designFocus: 'modern, responsive, visually cohesive with premium components',
            keyContent: '',
            source: 'generated',
            bundleId: null,
            props: null,
            role
          });
        });

        // Add extra AI-generated sections for custom needs (e.g. "Testimonials", "Specs Table")
        customNeeded.forEach((desc, idx) => {
          const safeName = desc.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
          if (!mappedComponents.some(c => c.exportName === safeName) && !generatedAdditions.some(c => c.exportName === safeName)) {
            generatedAdditions.push({
              name: safeName || `CustomSection${idx}`,
              refId: `gen_custom_${idx}`,
              exportName: safeName || `CustomSection${idx}`,
              path: `src/components/${safeName || `CustomSection${idx}`}.jsx`,
              description: desc,
              designFocus: 'modern, matches design system',
              keyContent: '',
              source: 'generated',
              bundleId: null,
              props: null,
              role: 'feature'
            });
          }
        });

        if (generatedAdditions.length > 0) {
          console.log(`[plan-website-components] 🔀 HYBRID: Adding ${generatedAdditions.length} AI-generated components alongside ${mappedComponents.length} premium ones:`);
          generatedAdditions.forEach(c => console.log(`  └─ [GENERATED] ${c.exportName} (${c.role}): ${c.description}`));
          mappedComponents.push(...generatedAdditions);
        } else {
          console.log(`[plan-website-components] 🔀 HYBRID: V2 covered all needed categories. No extra AI components needed.`);
        }
      }

      // Force Header first, Footer last visually
      mappedComponents.sort((a, b) => {
        const roleOrder = { 'header': 0, 'hero': 1, 'feature': 2, 'footer': 3 };
        return (roleOrder[a.role] ?? 2) - (roleOrder[b.role] ?? 2);
      });
      console.log(`[plan-website-components] ✍️ Starting Master Copywriter & MPA Architect for ${mappedComponents.length} components...`);

      let copyResult = { components: [], isMultiPage: true, pages: [], sharedComponentRefIds: [] };
      try {
        const copyPrompt = `You are a world-class web architect and conversion copywriter. 
        The user wants a website for: "${prompt}"
        The design system is: ${JSON.stringify(designSystem)}
        
        I have selected ${mappedComponents.length} components for this site. 
        Your job is TWO-FOLD:
        PART A - ARCHITECTURE: The user STRONGLY PREFERS MULTI-PAGE WEBSITES (isMultiPage: true). You must distribute the components below across multiple logical pages (e.g., Home, About, Pricing, etc). Share the header/navbar and footer via 'sharedComponentRefIds'.
        PART B - COPYWRITING: Generate high-converting, contextually perfect copy (TEXT) for each component.
        
        COMPONENTS REQUIRING ATTENTION:
        ${mappedComponents.map(c => `- NAME: ${c.name} | REF_ID: ${c.refId} | ROLE: ${c.role} | DESC: ${c.description}`).join('\n')}
        
        RULES:
        1. Default to isMultiPage: true. Group components into 'pages'. 
        2. Keep 'header' and 'footer' role components in 'sharedComponentRefIds' so they render on all pages.
        3. Assign EVERY single one of the remaining refIds to at least one page.
        4. For each component, generate 'keyContent' and 'props' (key-value strings) matching the tone: ${designSystem?.mood || 'professional'}.
        5. Common props: 'title', 'subtitle', 'description', 'primaryBtnText', 'features'.`;

        const { object } = await generateObject({
          model: getModel(model),
          schema: z.object({
            components: z.array(z.object({
              name: z.string(),
              keyContent: z.string(),
              props: z.record(z.string())
            })),
            isMultiPage: z.boolean().describe("Default to true. Only false if user explicitly demands a single scrolling page."),
            pages: z.array(z.object({
              pagePath: z.string(),
              pageLabel: z.string(),
              pageComponent: z.string(),
              navVisible: z.boolean(),
              componentRefIds: z.array(z.string())
            })).optional(),
            sharedComponentRefIds: z.array(z.string()).optional()
          }),
          prompt: copyPrompt,
          temperature: 0.2
        });
        copyResult = object;
      } catch (copyErr) {
        console.warn('[plan-website-components] Copywriter/Architect failed, using single-page default:', copyErr);
      }

      // Merge copy back into mapped components
      const finalComponents = mappedComponents.map(c => {
        const copy = copyResult.components?.find(cc => cc.name === c.name);
        return {
          ...c,
          keyContent: copy?.keyContent || c.description,
          props: copy?.props || {}
        };
      });

      planData = {
        components: finalComponents,
        complexity: finalComponents.length <= 6 ? 'simple' : (finalComponents.length <= 9 ? 'medium' : 'complex'),
        globalStyle: `/* Design System Globals */
        :root {
          --primary: ${designSystem?.colorPalette?.primary || '#3b82f6'};
          --accent: ${designSystem?.colorPalette?.accent || '#6366f1'};
        }`,
        appImports: [],
        requiredPackages: [],
        appComposition: {
          order: finalComponents.map(c => ({ refId: c.refId }))
        },
        isMultiPage: copyResult.isMultiPage ?? true,
        pages: copyResult.pages || [
          { pagePath: '/', pageLabel: 'Home', pageComponent: 'Home', navVisible: true, componentRefIds: finalComponents.map(c => c.refId) }
        ],
        sharedComponentRefIds: copyResult.sharedComponentRefIds || []
      };

      // V2 Narration
      if (generateNarration) {
        try {
          const narrator = new AIBuildNarrator(getOpenAIClient());
          aiNarration = await narrator.narrate('planning', {
            prompt,
            componentCount: mappedComponents.length,
            premiumCount: mappedComponents.length,
            customCount: 0,
            premiumMode
          });
        } catch (e) { }
      }

      // Record AI selections for usage feedback loop
      recordComponentSelections(buildId, mappedComponents.map(c => ({
        componentId: c.refId,
        confidence: 0.8 // Using 0.8 as baseline confidence for V2 selections
      })));

      // ─── TEMPLATE USAGE TRACKING (Phase S10 Mega Prompt 5) ───
      if (v2Result.templateUsed) {
        console.group('[Template Usage Tracking] ════════════════════════════════');
        const tpl = v2Result.templateUsed;
        console.log('[Template Usage] 📦 Template was used by AI pipeline!');
        console.log('[Template Usage] Template ID:', tpl.templateId);
        console.log('[Template Usage] Confidence:', tpl.confidence);
        console.log('[Template Usage] Reasoning:', tpl.reasoning);

        // 1. Increment template usage_count
        console.log('[Template Usage] 📊 Step 1: Incrementing usage_count...');
        try {
          console.log('[Template Usage] Trying RPC: increment_template_usage...');
          const { error: rpcErr } = await supabaseAdmin.rpc('increment_template_usage', { p_template_id: tpl.templateId });

          if (rpcErr) {
            console.warn('[Template Usage] ⚠️ RPC increment_template_usage failed:', rpcErr.message);
            console.log('[Template Usage] 💡 RPC may not exist yet — falling back to manual increment');

            // Fallback: manual read + increment
            console.log('[Template Usage] Reading current usage_count from templates table...');
            const { data: tplData, error: readErr } = await supabaseAdmin
              .from('templates')
              .select('usage_count')
              .eq('id', tpl.templateId)
              .single();

            if (readErr) {
              console.error('[Template Usage] ❌ Failed to read template:', readErr.message);
            } else if (tplData) {
              const oldCount = tplData.usage_count || 0;
              const newCount = oldCount + 1;
              console.log('[Template Usage] Current usage_count:', oldCount, '→ new:', newCount);

              const { error: updateErr } = await supabaseAdmin
                .from('templates')
                .update({ usage_count: newCount })
                .eq('id', tpl.templateId);

              if (updateErr) {
                console.error('[Template Usage] ❌ Failed to update usage_count:', updateErr.message);
              } else {
                console.log('[Template Usage] ✅ usage_count updated to', newCount);
              }
            } else {
              console.error('[Template Usage] ❌ Template not found in DB for id:', tpl.templateId);
            }
          } else {
            console.log('[Template Usage] ✅ RPC increment_template_usage succeeded');
          }
        } catch (e) {
          console.error('[Template Usage] 💥 usage_count tracking EXCEPTION:', e.message);
          console.error('[Template Usage] Stack:', e.stack);
        }

        // 2. Award reputation to template author (+3 points per AI usage)
        console.log('[Template Usage] 🏆 Step 2: Awarding reputation...');
        try {
          console.log('[Template Usage] Fetching template author_id...');
          const { data: template, error: authorErr } = await supabaseAdmin
            .from('templates')
            .select('author_id')
            .eq('id', tpl.templateId)
            .single();

          if (authorErr) {
            console.error('[Template Usage] ❌ Failed to fetch template author:', authorErr.message);
          } else if (!template?.author_id) {
            console.warn('[Template Usage] ⚠️ Template has no author_id — cannot award reputation');
            console.log('[Template Usage] Template data:', JSON.stringify(template));
          } else {
            console.log('[Template Usage] Author found:', template.author_id);
            console.log('[Template Usage] Calling RPC: increment_reputation(user:', template.author_id, ', points: 3)');
            const { error: repErr } = await supabaseAdmin.rpc('increment_reputation', {
              p_user_id: template.author_id,
              p_points: 3,
            });
            if (repErr) {
              console.error('[Template Usage] ❌ Reputation RPC failed:', repErr.message);
              console.log('[Template Usage] 💡 The increment_reputation RPC function may not exist');
            } else {
              console.log('[Template Usage] ✅ +3 reputation awarded to template author:', template.author_id);
            }
          }
        } catch (e) {
          console.error('[Template Usage] 💥 Reputation award EXCEPTION:', e.message);
          console.error('[Template Usage] Stack:', e.stack);
        }

        console.groupEnd();
      } else {
        console.log('[plan-website-components] 📦 No template was used — v2Result.templateUsed is', v2Result.templateUsed === undefined ? 'undefined' : v2Result.templateUsed === null ? 'null' : 'falsy');
      }

    } else {
      // 🐢 FALLBACK TO V1 (HUGE JSON GENERATION) FOR CUSTOM/OFF MODE
      console.log('[plan-website-components] 🐢 Using V1 Legacy Pipeline (JSON GenerateObject)');

      let result;
      try {
        console.log(`[plan-website-components] Attempting generation with model: ${model}`);
        result = await generateObject({
          model: getModel(model),
          schema: planSchema,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content }],
          temperature: 0,
        });
      } catch (err) {
        console.warn(`[plan-website-components] Model ${model} failed, retrying with gpt-5.2. Error:`, err.message);
        result = await generateObject({
          model: getModel('openai/gpt-5.2'),
          schema: planSchema,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content }],
          temperature: 0,
        });
      }

      planData = result.object;

      // V1 Narration
      if (generateNarration) {
        try {
          const narrator = new AIBuildNarrator(getOpenAIClient());
          aiNarration = await narrator.narrate('planning', {
            prompt,
            componentCount: planData.components.length,
            premiumCount: planData.components.filter(c => c.source === 'premium').length,
            customCount: planData.components.filter(c => c.source === 'generated').length,
            premiumMode
          });
        } catch (e) { }
      }

      // Record AI selections for usage feedback loop
      const premiumComponents = planData.components.filter(c => c.source === 'premium' && c.bundleId);
      if (premiumComponents.length > 0) {
        recordComponentSelections(buildId, premiumComponents.map(c => ({
          componentId: c.bundleId,
          confidence: 0.6 // Lower baseline confidence for V1 fallback
        })));
      }
    }

    // =========================================================================
    // END V2 PIPELINE INTEGRATION
    // =========================================================================


    // HARDENING: Force-correct all paths locally before returning
    // This stops AI "sub-folder hallucinations" from reaching the client
    // V4.0: Also allows src/pages/ paths for multi-page sites
    const flattenedComponents = planData.components.map(c => {
      const baseName = path.basename(c.path).trim();
      let flatPath = `src/components/${baseName}`;

      // Preserve specialized premium subfolder paths if coming from V2 pipeline
      if (c.path.includes('src/components/premium/')) {
        flatPath = c.path;
      } else if (c.path.includes('src/pages/')) {
        // V4.0: Allow page-level paths for MPA sites
        flatPath = c.path;
      } else {
        // Clean up potential double extensions or spaces
        flatPath = flatPath.replace(/\.jsx\s*\.jsx$/, '.jsx');
        if (flatPath.endsWith('.js') || flatPath.endsWith('.tsx')) {
          flatPath = flatPath.replace(/\.(js|tsx)$/, '.jsx');
        } else if (!flatPath.endsWith('.jsx')) {
          flatPath += '.jsx';
        }
      }
      return { ...c, path: flatPath };
    });

    // HARDENING: STRICT ORDERING ENFORCEMENT
    // We explicitly sort the components to ensure the user's desired structure:
    // 1. Header
    // 2. Hero
    // 3. Features (Content)
    // 4. Footer
    const roleOrder = { 'header': 0, 'hero': 1, 'feature': 2, 'footer': 3 };
    flattenedComponents.sort((a, b) => {
      const orderA = roleOrder[a.role] ?? 2; // Default to 'feature' (2) if undefined
      const orderB = roleOrder[b.role] ?? 2;
      return orderA - orderB;
    });

    // Double-check mandatory components
    const hasHeader = flattenedComponents.some(c => c.role === 'header');
    const hasHero = flattenedComponents.some(c => c.role === 'hero');
    const hasFooter = flattenedComponents.some(c => c.role === 'footer');

    // If missing, we warn (or theoretically could inject default placeholders, but for now we trust the LLM with the prompt strictness)
    if (!hasHeader || !hasHero || !hasFooter) {
      console.warn('[plan-website-components] Warning: Component plan missing mandatory roles!', { hasHeader, hasHero, hasFooter });
    }

    // Calculate component counts and packages
    const premiumCount = flattenedComponents.filter(c => c.source === 'premium').length;
    const generatedCount = flattenedComponents.filter(c => c.source === 'generated').length;

    // Merge AI planned packages with selection context packages
    const requiredPackages = new Set([
      ...(planData.requiredPackages || []),
      ...(selectionContext?.requiredPackages || []),
      'framer-motion',
      'lucide-react',
      'react-router-dom', // Force mandatory
      'react-icons', // Force mandatory
      'clsx',
      'tailwind-merge'
    ]);

    if (planData.appImports) {
      planData.appImports.forEach(pkg => {
        if (pkg.includes('lucide')) requiredPackages.add('lucide-react');
        if (pkg.includes('motion')) requiredPackages.add('framer-motion');
        if (pkg.includes('router')) requiredPackages.add('react-router-dom');
      });
    }

    // Sync appComposition with the enforced sort order
    const validAppComposition = {
      order: flattenedComponents.map(c => ({ refId: c.refId || c.name }))
    };

    console.log(`[plan-website-components] SUCCESS. Returning ${flattenedComponents.length} components.`);
    res.json({
      success: true,
      plan: { ...planData, components: flattenedComponents, appComposition: validAppComposition },
      components: flattenedComponents, // legacy support
      globalStyle: planData.globalStyle,
      appImports: planData.appImports,
      appComposition: validAppComposition,
      requiredPackages: Array.from(requiredPackages),
      aiNarration, // Include AI plan explanation
      // V4.0: Multi-page support fields
      isMultiPage: planData.isMultiPage || false,
      pages: planData.pages || [],
      sharedComponentRefIds: planData.sharedComponentRefIds || [],
    });

  } catch (error) {
    console.error('[plan-website-components] CRITICAL ERROR:', error.message || error);
    if (error.stack) console.error(error.stack);

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
