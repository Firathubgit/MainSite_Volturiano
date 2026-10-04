import { generateObject } from 'ai';
import { getModel } from '../provider-helpers.js';
import { resolveLightweightModel } from '../llm-lightweight.js';
import { getCatalogForPromptAsync } from '../registry/registry.js';
import { resolveModelRole } from '../../shared/model-registry.js';
import {
  buildComponentRetrievalQuery,
  generatedIntakeSchema,
  normalizePreparedDesignIntake,
  replaceComponentSuggestions,
} from './design-intake.js';

const DESIGN_INTAKE_SYSTEM_PROMPT = `You are the planning architect for a professional AI website builder.
Convert the user's initial request into a short, decision-ready pre-build intake.

The UI handles typography, color, and component choices separately. Your questions must therefore cover only material unknowns that affect site structure, content priority, audience, or conversion.

Rules:
1. Ask exactly 1 or 2 concise questions. Never ask for information the user already supplied.
2. Each question must offer 3 or 4 concrete, mutually distinct options. Mark exactly one as recommended.
3. Avoid generic questions such as "what style do you like?" and never ask about typography or colors.
4. The interpretation is a calm 1-2 sentence response showing that the request was understood.
5. Produce a complete design system with strong contrast and a tight, coherent palette.
6. Produce exactly 3 distinct palette options. The first should be the strongest recommendation. Every palette must be usable as-is and its text colors must remain legible on its background and surface.
7. Do not invent company facts. Decisions that can safely be inferred should be inferred instead of asked.
8. Output only the structured object requested by the schema.`;

export async function prepareDesignIntake({
  prompt,
  images = [],
  modelId = null,
  initialComponents = [],
  allowCommunityComponents = true,
  timeoutMs = 22000,
} = {}) {
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw new Error('A website prompt is required.');

  const effectiveModel = resolveLightweightModel(
    modelId || resolveModelRole('generalGeneration'),
  ).id;

  const content = [
    {
      type: 'text',
      text: `Prepare the pre-build intake for this request:\n\n${cleanPrompt}`,
    },
  ];
  for (const image of (Array.isArray(images) ? images : []).slice(0, 4)) {
    try {
      const base64Data = typeof image === 'string' ? image.split(',').pop() : image?.data || image?.base64;
      const mimeType = typeof image === 'string'
        ? (image.match(/data:([^;]+);/) || [])[1] || 'image/png'
        : image?.mimeType || 'image/png';
      if (base64Data) content.push({ type: 'image', image: base64Data, mimeType });
    } catch {
      // A malformed optional reference image must not block the intake.
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const planPromise = (async () => {
    try {
      const result = await generateObject({
        model: getModel(effectiveModel),
        schema: generatedIntakeSchema,
        maxRetries: 2,
        messages: [
          { role: 'system', content: DESIGN_INTAKE_SYSTEM_PROMPT },
          { role: 'user', content },
        ],
        temperature: 0.2,
        abortSignal: controller.signal,
      });
      return result.object;
    } finally {
      clearTimeout(timeout);
    }
  })();

  const catalogPromise = allowCommunityComponents
    ? getCatalogForPromptAsync(cleanPrompt, 12).then((catalog) => catalog.components || [])
    : Promise.resolve([]);

  const [planResult, catalogResult] = await Promise.allSettled([
    planPromise,
    catalogPromise,
  ]);

  if (planResult.status === 'rejected') {
    console.warn('[design-intake] Structured planning failed; using deterministic defaults:', planResult.reason?.message || planResult.reason);
  }
  if (catalogResult.status === 'rejected') {
    console.warn('[design-intake] Component suggestions unavailable:', catalogResult.reason?.message || catalogResult.reason);
  }

  return normalizePreparedDesignIntake({
    generated: planResult.status === 'fulfilled' ? planResult.value : null,
    catalogComponents: catalogResult.status === 'fulfilled' ? catalogResult.value : [],
    initialComponents,
    prompt: cleanPrompt,
  });
}

export async function refreshDesignIntakeComponents({
  prompt,
  intake,
  answers = [],
  allowCommunityComponents = true,
} = {}) {
  if (!allowCommunityComponents) {
    return replaceComponentSuggestions({ intake, catalogComponents: [] });
  }

  const retrievalQuery = buildComponentRetrievalQuery({ prompt, intake, answers });
  const catalog = await getCatalogForPromptAsync(retrievalQuery, 12);
  return replaceComponentSuggestions({
    intake,
    catalogComponents: catalog.components || [],
  });
}
