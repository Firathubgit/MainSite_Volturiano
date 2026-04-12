import { generateText } from 'ai';
import { getModel, generateFast } from '../lib/provider-helpers.js';
import { parseFileBlocks } from '../lib/file-blocks.js';
import { llmLog } from '../lib/llm-logger.js';
import { resolveLightweightModel } from '../lib/llm-lightweight.js';
import { log } from '../lib/build-manifest.js';

const MAX_FILE_CHARS = 200_000;

const SYSTEM_PROMPT = `You are a senior copy editor for production React sites. You receive one component file plus PLAN DATA: keyContent, props, designSystem, and siteVision (the user's full brief).

Your job is to make every user-visible string in this file appropriate for THAT client and THAT brief — not merely to strip "demo" names. Ground headlines, body copy, buttons, nav labels, quotes, stats, and image alt text in siteVision and keyContent; apply props as literal overrides where they map to visible text. Match tone to designSystem (mood, industry) when relevant.

Rewrite baked-in catalog examples (any fictional brand, "Acme", generic testimonials, placeholder emails, or template-specific names) into coherent, on-brief copy. Do not leave obvious template filler if the brief gives you enough to say something specific.

Preserve ALL code structure: imports, exports, function signatures, TypeScript types, CSS class names, Tailwind tokens, animations, shaders, WebGL, Three.js, Framer Motion props, and layout. Do not rename components or change file structure.

Output format (required — downstream parsing depends on this exact shape):
Return the COMPLETE file in exactly ONE block, using double quotes around the path attribute:
<file path="USE_THE_FILE_NAME_FROM_THE_REQUEST">
...full file source...
</file>

No markdown fences. No commentary before or after the block.`;

/**
 * POST /api/hydrate-premium-copy
 * Body: { fileContent, fileName?, keyContent?, props?, designSystem?, prompt? (siteVision), model?, buildId? }
 * Runs when keyContent, props, or prompt (non-empty) — prompt alone can drive client-specific JSX copy.
 */
export default async function hydratePremiumCopy(req, res) {
  try {
    const {
      fileContent,
      fileName = '',
      keyContent = '',
      props = {},
      designSystem = null,
      prompt = '',
      model: heavyModel,
      buildId
    } = req.body || {};

    if (typeof fileContent !== 'string' || !fileContent.length) {
      return res.status(400).json({ success: false, error: 'fileContent is required' });
    }
    if (fileContent.length > MAX_FILE_CHARS) {
      return res.status(400).json({ success: false, error: `fileContent exceeds ${MAX_FILE_CHARS} characters` });
    }

    const propsObj = props && typeof props === 'object' && !Array.isArray(props) ? props : {};
    const hasKey = typeof keyContent === 'string' && keyContent.trim().length > 0;
    const hasProps = Object.keys(propsObj).length > 0;
    const hasVision = typeof prompt === 'string' && prompt.trim().length > 0;
    if (!hasKey && !hasProps && !hasVision) {
      console.log('[BUILDER-VERIFY] hydrate: skipped no keyContent/props/siteVision file=%s', fileName || '?');
      return res.json({ success: true, hydratedContent: fileContent, skipped: true });
    }

    const lm = resolveLightweightModel(heavyModel || 'google/gemini-2.5-flash');
    console.log(
      '[BUILDER-VERIFY] hydrate: start file=%s chars=%d model=%s hasKey=%s propKeys=%d',
      fileName || '?',
      fileContent.length,
      lm.id,
      hasKey,
      Object.keys(propsObj).length
    );
    const payload = {
      fileName: fileName || '(unknown)',
      keyContent: keyContent || '',
      props: propsObj,
      designSystem,
      siteVision: typeof prompt === 'string' ? prompt : ''
    };

    const userMessage = `PLAN DATA (JSON):
${JSON.stringify(payload, null, 2)}

--- SOURCE FILE (${fileName || 'component'}) ---
${fileContent}`;

    if (buildId) {
      log(buildId, `[hydrate-premium-copy] ${fileName || 'file'} (${fileContent.length} chars) model=${lm.id}`);
    }

    const startMs = Date.now();
    llmLog.request('HYDRATE-PREMIUM-COPY', {
      model: lm.id,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: userMessage.slice(0, 8000) + (userMessage.length > 8000 ? '\n…[truncated for log]' : ''),
      temperature: 0
    });

    let text = '';
    if (lm.useFast) {
      text = await generateFast(SYSTEM_PROMPT, userMessage);
    } else {
      const out = await generateText({
        model: getModel(lm.id),
        system: SYSTEM_PROMPT,
        prompt: userMessage,
        temperature: 0,
        maxRetries: 2,
        maxTokens: 65536
      });
      text = out.text || '';
    }

    llmLog.response('HYDRATE-PREMIUM-COPY', {
      response: (text || '').slice(0, 4000),
      durationMs: Date.now() - startMs,
      fileCount: parseFileBlocks(text).length
    });

    const parsed = parseFileBlocks(text);
    if (parsed.length === 0) {
      console.warn('[hydrate-premium-copy] No <file> block in model output; keeping original.');
      console.log('[BUILDER-VERIFY] hydrate: done file=%s skipped=no_file_block', fileName || '?');
      return res.json({
        success: true,
        hydratedContent: fileContent,
        skipped: true,
        reason: 'no_file_block'
      });
    }

    const want = (fileName || '').replace(/^\/+/, '');
    let block =
      (want && parsed.find((p) => p.path === want)) ||
      parsed.find((p) => want && (want.endsWith(p.path) || p.path.endsWith(want))) ||
      parsed[0];

    if (!block?.content?.length) {
      console.log('[BUILDER-VERIFY] hydrate: done file=%s skipped=empty_block', fileName || '?');
      return res.json({ success: true, hydratedContent: fileContent, skipped: true, reason: 'empty_block' });
    }

    console.log(
      '[BUILDER-VERIFY] hydrate: done file=%s outChars=%d skipped=false',
      fileName || '?',
      block.content.length
    );
    return res.json({ success: true, hydratedContent: block.content });
  } catch (e) {
    console.error('[hydrate-premium-copy]', e);
    return res.status(500).json({ success: false, error: e.message || 'hydrate failed' });
  }
}
