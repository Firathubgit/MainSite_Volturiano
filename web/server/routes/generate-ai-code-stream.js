import { renderAppTemplate } from '../lib/render-app-template.js';
import { streamText } from 'ai';
import { getModel } from '../lib/provider-helpers.js';
import { appConfig } from '../config/app.config.js';
import { getCatalogForPromptAsync } from '../lib/registry/registry.js';
import { sandboxManager } from '../lib/sandbox/sandbox-manager.js';

export default async function generateAiCodeStream(req, res) {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const { prompt, images = [], model = 'google/gemini-3.1-pro-preview', context = {}, isEdit = false } = req.body;

    if (!prompt) {
      send({ type: 'error', message: 'prompt is required' });
      return res.end();
    }

    send({ type: 'status', message: isEdit ? 'Editing code...' : 'Generating code...' });

    // Always inject catalog context — initial gen for selection, edit mode for swaps/additions
    let catalogString = '';
    {
      console.log('[generate-ai-code-stream] Fetching component catalog context for prompt...');
      const catalogContext = await getCatalogForPromptAsync(prompt.split(/\s+/), 20);
      console.log(`[generate-ai-code-stream] Supabase SUCCESS: Fetched metadata for ${catalogContext.components.length} components.`);

      catalogString = catalogContext.components
        .map(c => `- NAME: "${c.name}", ID: "${c.id}", DESCRIPTION: "${c.description}"`)
        .join('\n');
    }

    // Build system prompt
    let systemPrompt = `You are an expert Full-Stack React Developer working in the Volturiano Builder environment.
Generate complete, production-ready React code.
${catalogString ? `\nCOMPONENT CATALOG (Available Premium Components in our registry):\n${catalogString}\n` : ''}

CRITICAL OUTPUT RULES:
- Output files wrapped in <file path="relative/path">...code...</file> tags
- Create complete, working files with all imports
- Use Tailwind CSS for styling
- NEVER output vite.config.js, package.json, or tailwind.config.js (already exist in sandbox)
- ALWAYS create src/index.css first (using standard @tailwind base; @tailwind components; @tailwind utilities; directives)
- ALWAYS create src/App.jsx second
- Then create all imported components
- Export default every component
- NO markdown code fences, NO explanation text between file blocks
- COMPLETE code only - no ellipsis, no "// rest of code"

ATOMIC SECTION RULES:
- If you are creating a file in "src/components/" (like About.jsx), it is a single SECTION.
- SECTION files must NOT import or render the Header, Hero, or Footer.
- Global layout (Header -> Hero -> Sections -> Footer) happens ONLY in src/App.jsx.
- Focus sections ONLY on specialized content (text, features, testimonials).
- SANDBOX REALITY: Do NOT invent sub-pages, external routes, or site-wide structures that are not shown in the "Current file structure". Use "#" for links to pages that do not exist. Only "apply" what is in the current sandbox or catalog.

APP.JSX COMPOSITION RULES (CRITICAL):
1. COMPOSITION ONLY: src/App.jsx is for assembling components ONLY.
2. NO INLINE UI: Do NOT write visible HTML/text (headings, paragraphs, buttons) inside App.jsx. Only use simple layout wrappers (e.g. <div className="min-h-screen bg-black">...</div>).
3. RENDER EVERYTHING: You MUST import and render ALL the components you created. Do not leave any out.
4. VERTICAL STACK: Render components in a logical vertical order (Header -> Hero -> content sections -> Footer).
5. NO ROUTING: Unless explicitly asked, stack everything on one page. Do NOT use React Router for simple landing pages.
6. NO CONDITIONAL RENDERING: Do not hide components behind state or conditions. Show them all.

DESIGN STANDARDS (CRITICAL — components that violate these have FAILED):
- TAILWIND ONLY: Use Tailwind CSS for ALL styling. NEVER use inline style={{}} attributes except for truly dynamic values (calculated transforms, dynamic percentages)
- VISUAL HIERARCHY: Every section needs a bold heading (text-3xl md:text-5xl font-bold tracking-tight), muted subtext, and proper spacing (py-16 md:py-24)
- LAYOUT: Use grid/flexbox (grid grid-cols-1 md:grid-cols-3 gap-8). NEVER use bare <div> stacks with no layout classes
- DEPTH: rounded-2xl, shadow-xl, border border-white/10, backdrop-blur-xl, bg-gradient-to-br
- RESPONSIVE: mobile-first with sm: md: lg: breakpoints
- POLISH: transition-all duration-300, hover:scale-105, hover:shadow-lg on interactive elements
- ANIMATIONS: Use framer-motion for entrance animations (whileInView) and staggered children
- CONTAINERS: max-w-6xl mx-auto px-6 on every section

CONTENT FIDELITY (CRITICAL):
- ALL text, headings, data arrays MUST be about the user's ACTUAL TOPIC
- If the user wants a "brainrot" site, content must be about screen time, dopamine, social media — NOT "AI Revolution", "Cybersecurity", or "Green Energy"
- Do NOT pad sections with generic buzzword content from unrelated industries
- Every piece of content must feel written by someone passionate about THIS topic

DESIGN COHERENCE — "LESS IS MORE":
- Use a tight, consistent color palette throughout ALL components (3-4 colors max)
- Do NOT invent new random colors per component
- Prefer clean, minimal layouts. One visual motif per section.
- White space is a design tool, not wasted space

ANTI-PATTERNS — generating these means FAILURE:
- Bare <section><h2>Title</h2><p>Text</p></section> with no styling
- style={{ padding: '40px', textAlign: 'center' }} instead of Tailwind classes
- Content about unrelated industries (AI on a restaurant site, Cybersecurity on a brainrot site)
- Using random colors not consistent with the rest of the site
- Buttons with no visual styling
- Mixing inline styles and Tailwind in the same file

IMAGES & MEDIA:
- NEVER use placeholder paths like "path-to-image.jpg" or "your-image.jpg"
- ALWAYS use real working URLs from https://images.unsplash.com or https://picsum.photos for images
- For icons/logos, use inline SVGs or emoji
- For videos, use real working URLs from Unsplash, Pexels, or free stock video sites. Do NOT invent URLs.

LIBRARY COMPATIBILITY:
- Do NOT use react-leaflet or leaflet (React 18 context bugs)
- For premium WebGL components, use three.js, @react-three/fiber, and @react-three/drei.
- For maps, use: <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=..." width="100%" height="400" />
`;

    // Add context for edits
    if (isEdit && context.conversationContext?.appliedCode?.length > 0) {
      systemPrompt += `\n\n═══════════════════════════════════════════
EDIT MODE — THINK BEFORE YOU CODE
═══════════════════════════════════════════

You are modifying an EXISTING application. Before generating ANY code, follow this workflow:

STEP 1 — INTENT ANALYSIS (What is the user actually asking?):
  • THEME CHANGE: "Make it X themed" or "change the vibe to Y" → Update text, colors, imagery in MOST/ALL component files. Do NOT remove or restructure components. Do NOT drop any components from App.jsx.
  • CONTENT EDIT: "Change the hero title" or "update the pricing" → Edit ONLY the specific text/data in 1-2 files. Do NOT touch other files.
  • ADD FEATURE: "Add a gallery section" or "add testimonials" → Create ONE new component file, update App.jsx to include it, keep everything else unchanged.
  • REMOVE FEATURE: "Remove the pricing section" → Only remove that component's import and render from App.jsx. Keep all other components.
  • STRUCTURAL CHANGE: "Completely redo/rewrite the website" → Full regeneration of all files (this is RARE — only if user says "rewrite" or "redo entirely").

STEP 2 — PER-FILE EDIT PLAN:
  Before writing code, mentally list which files you will output and what changes each gets:
  - For THEME CHANGE: output EVERY component file with updated text/colors/images + index.css for palette + App.jsx only if imports change
  - For CONTENT EDIT: output ONLY the 1-2 files that contain the text being changed
  - For ADD FEATURE: output the new component file + App.jsx (with all existing imports PLUS the new one)
  - For REMOVE FEATURE: output ONLY App.jsx (with the removed import/render, keeping all others)

STEP 3 — PRESERVATION CHECK:
  After planning, verify:
  ✓ Does every existing component still appear in App.jsx? (unless explicitly removed)
  ✓ For theme changes: did I update ALL component files, not just 2-3?
  ✓ Am I accidentally dropping components?

CRITICAL RULES:
1. SURGICAL OUTPUT: Output ONLY the files that actually need to change (to save tokens).
2. FORCE CODE OUTPUT: You MUST output at least one <file> block for every request. DO NOT just explain or say it's ready. If you changed something, output the code.
3. THEME CHANGES (EXCEPTION): If the user asks for a theme/vibe change ("make it futuristic", "nature themed"), you MUST output ALL component files with updated content.
4. NO COMPONENT DROPPING: If you output src/App.jsx, it MUST keep ALL existing imports and renders unless the user explicitly asked to remove one.
5. PRESERVE INTENT: Always find a way to improve the styling or content to match the user's intent. Never say "no changes needed."`;

      // ═══════════════════════════════════════════════════════════
      // LIVE SANDBOX FILE FETCH — get the REAL file list from the sandbox
      // This replaces the unreliable global.sandboxState.fileCache
      // ═══════════════════════════════════════════════════════════
      let sandboxFileList = [];
      let currentAppJsx = '';
      let sandboxFileContents = {};
      const sandboxId = context.sandboxId;

      if (sandboxId) {
        try {
          const provider = sandboxManager.getProvider(sandboxId) || global.activeSandboxProvider;
          if (provider) {
            // Get the file tree
            const allFiles = await provider.listFiles('/home/user/app');
            sandboxFileList = allFiles.filter(f => {
              const ext = f.split('.').pop();
              return ['jsx', 'js', 'tsx', 'ts', 'css'].includes(ext);
            });

            // Read the current App.jsx so the AI can see what it's modifying
            try {
              currentAppJsx = await provider.readFile('src/App.jsx');
            } catch (_) {
              // App.jsx might not exist yet
            }

            // Read ALL component files for context (so AI knows what exists)
            for (const filePath of sandboxFileList) {
              if (filePath.endsWith('.jsx') || filePath.endsWith('.css')) {
                try {
                  const content = await provider.readFile(filePath);
                  if (content && content.length < 50000) {
                    sandboxFileContents[filePath] = content;
                  }
                } catch (_) { /* skip unreadable files */ }
              }
            }

            console.log(`[generate-ai-code-stream] Fetched ${sandboxFileList.length} files from sandbox, App.jsx: ${currentAppJsx ? 'found' : 'not found'}`);
          }
        } catch (e) {
          console.warn('[generate-ai-code-stream] Could not fetch sandbox files:', e.message);
        }
      }

      // ═══════════════════════════════════════════════════════════
      // BUILD COMPONENT MANIFEST — explicit list of ALL components
      // ═══════════════════════════════════════════════════════════
      const componentFiles = sandboxFileList.filter(f =>
        f.endsWith('.jsx') &&
        !f.includes('App.jsx') &&
        !f.includes('main.jsx') &&
        (f.includes('components/') || f.includes('premium/'))
      );

      if (componentFiles.length > 0) {
        const manifestLines = componentFiles.map(f => {
          // Extract component name from filename
          const fileName = f.split('/').pop().replace(/\.(jsx|tsx)$/, '');
          // Build the import path relative to App.jsx (src/App.jsx)
          const importPath = './' + f.replace(/^src\//, '').replace(/\.(jsx|tsx)$/, '');
          return `- ${fileName} → import ${fileName} from '${importPath}';`;
        });

        systemPrompt += `\n\nCOMPONENT MANIFEST — ALL EXISTING COMPONENTS IN THE SANDBOX:
${manifestLines.join('\n')}

APP.JSX PRESERVATION (CRITICAL):
1. If you output App.jsx, you MUST keep ALL the component imports listed above.
2. You may ADD new components. You may only REMOVE a component if the user EXPLICITLY asks to remove it by name.
3. The new App.jsx must render ALL components — existing ones AND any new ones — in a logical vertical stack.
4. If you DON'T need to change App.jsx, then DON'T output it. Only output files you actually changed.
5. NEVER drop components just because you didn't edit them. They must stay in App.jsx.`;
      }

      // Inject current App.jsx content so AI can make surgical edits
      if (currentAppJsx) {
        systemPrompt += `\n\nCURRENT App.jsx (PRESERVE THIS STRUCTURE):\n--- src/App.jsx ---\n${currentAppJsx}`;
      }

      // Inject file structure
      if (sandboxFileList.length > 0) {
        systemPrompt += `\n\nCurrent file structure:\n${sandboxFileList.map(f => `  ${f}`).join('\n')}`;
      } else if (context.structure) {
        systemPrompt += `\n\nCurrent file structure: \n${context.structure} `;
      }

      // App.jsx Strict Render Order - PRE-CALCULATED GOLDEN COPY
      // We use the deterministic render to ensure the AI follows the plan exactly.
      const plannedComponents = context.plan?.components;

      if (plannedComponents && Array.isArray(plannedComponents) && plannedComponents.length > 0) {
        try {
          // renderAppTemplate is imported at top level (added via previous edit or implicit)
          // WAIT: I need to make sure I imported it. 
          // actually I can't easily add import at top with replace_file_content if I am editing middle...
          // I will add the import in a separate tool call if needed or assume I did it?
          // The previous tool call attempted to add import at top AND this logic? 
          // No, previous tool call targeted line 1.

          const goldenAppJsx = renderAppTemplate({ components: plannedComponents });

          systemPrompt += `\n\nAPP.JSX CONTENT (MANDATORY):
You MUST output the following code for src/App.jsx EXACTLY as written below. 
Do not add, remove, or reorder any components in App.jsx.
use this EXACT code:

<file path="src/App.jsx">
${goldenAppJsx}
</file>
`;
        } catch (e) {
          console.warn('[generate-ai-code-stream] Failed to pre-render App.jsx:', e);
        }
      }

      // Add premium component awareness
      if (context.premiumComponents && context.premiumComponents.length > 0) {
        systemPrompt += `\n\nPREMIUM COMPONENTS (pre-installed, DO NOT simplify or rewrite these):
${context.premiumComponents.map(pc => {
          return `- ${pc.name} at ${pc.path}`;
        }).join('\n')}`;
      }

      // Add all sandbox file contents so the AI can see what it's working with
      const fileEntries = Object.entries(sandboxFileContents);
      if (fileEntries.length > 0) {
        systemPrompt += '\n\nCurrent file contents:';
        for (const [path, content] of fileEntries) {
          if (content && content.length < 50000) {
            systemPrompt += `\n\n--- ${path} ---\n${content}`;
          }
        }
      } else if (global.sandboxState?.fileCache?.files) {
        // Fallback to cache if sandbox read failed
        const cacheEntries = Object.entries(global.sandboxState.fileCache.files);
        if (cacheEntries.length > 0) {
          systemPrompt += '\n\nCurrent file contents (from cache):';
          for (const [path, info] of cacheEntries) {
            const content = typeof info === 'string' ? info : info.content;
            if (content && content.length < 50000) {
              systemPrompt += `\n\n--- ${path} ---\n${content}`;
            }
          }
        }
      }
    }

    // Update system prompt with iteration preservation rules
    systemPrompt += `
ITERATION RULES:
1. PRESERVE PREMIUM QUALITY: When editing an existing component (like a Hero or Feature), do NOT simplify the code. Preserve the complex animations, glassmorphism, and responsive structures.
2. SURGICAL EDITS: If the user asks to "change a headline", only change the specific text or props. Do not rewrite the entire component from scratch if it already exists.
3. COMPONENT INTEGRITY: Keep the existing imports and exports unless specifically asked to change them.
`;

    // Build messages
    const messages = [{ role: 'system', content: systemPrompt }];

    // Add recent conversation context
    if (context.recentMessages?.length > 0) {
      for (const msg of context.recentMessages.slice(-10)) {
        if (msg.type === 'user') {
          // Check if message has images in metadata
          if (msg.metadata?.images?.length > 0) {
            const content = [{ type: 'text', text: msg.content }];
            msg.metadata.images.forEach(img => {
              const base64Data = typeof img === 'string' ? img.split(',').pop() : img.data;
              const mimeType = typeof img === 'string' ? (img.match(/data:([^;]+);/) || [])[1] || 'image/png' : img.mimeType;
              content.push({ type: 'image', image: base64Data, mimeType });
            });
            messages.push({ role: 'user', content });
          } else {
            messages.push({ role: 'user', content: msg.content });
          }
        }
        else if (msg.type === 'ai') messages.push({ role: 'assistant', content: msg.content });
      }
    }

    // Current message parts
    const currentContent = [{ type: 'text', text: prompt }];
    images.forEach(img => {
      const base64Data = typeof img === 'string' ? img.split(',').pop() : img.data;
      const mimeType = typeof img === 'string' ? (img.match(/data:([^;]+);/) || [])[1] || 'image/png' : img.mimeType;
      currentContent.push({ type: 'image', image: base64Data, mimeType });
    });

    messages.push({ role: 'user', content: currentContent });

    send({ type: 'status', message: 'AI is generating...' });

    // Stream the response
    const result = streamText({
      model: getModel(model),
      messages,
      maxTokens: appConfig.ai.maxTokens,
      temperature: model.includes('gemini-3.1') ? 1.0 : appConfig.ai.defaultTemperature,
    });

    let generatedCode = '';
    let currentFile = '';

    for await (const textPart of result.textStream) {
      generatedCode += textPart;

      // Detect file tags for progress
      const fileMatch = textPart.match(/<file path="([^"]+)">/);
      if (fileMatch) {
        currentFile = fileMatch[1];
        send({ type: 'component', name: currentFile.split('/').pop(), path: currentFile });
      }

      send({ type: 'stream', text: textPart, raw: true });
    }

    // Extract packages from imports
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
    const packages = new Set();
    let m;
    while ((m = importRegex.exec(generatedCode)) !== null) {
      const pkg = m[1];
      if (!pkg.startsWith('.') && !pkg.startsWith('/') && !['react', 'react-dom'].includes(pkg)) {
        packages.add(pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0]);
      }
    }

    send({
      type: 'complete',
      generatedCode,
      packages: [...packages],
      explanation: 'Code generated successfully.'
    });

    res.end();
  } catch (error) {
    console.error('[generate-ai-code-stream] Error:', error);
    try {
      send({ type: 'error', message: error.message || 'AI generation failed' });
    } catch (sendErr) {
      console.error('[generate-ai-code-stream] Failed to send error event:', sendErr);
    }
    res.end();
  }
}
