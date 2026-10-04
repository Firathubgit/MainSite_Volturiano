/**
 * Model provider wiring.
 *
 * The server works with one provider key or several. Model ids look like
 * `google/gemini-3.5-flash`. When a requested model belongs to a provider
 * that has no key, `getModel` swaps in the same tier of model from a
 * provider that does, so every part of the pipeline keeps working with a
 * single key.
 */
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import OpenAI from 'openai';
import {
  getProviderFromModelId,
  normalizeModelId,
  resolveModelForProviders,
  resolveModelRole,
  toProviderModelName
} from '../shared/model-registry.js';

const PROVIDER_KEYS = {
  google: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY'
};

/**
 * Providers that have a key configured.
 */
export function getAvailableProviders() {
  return new Set(
    Object.entries(PROVIDER_KEYS)
      .filter(([, envName]) => Boolean(process.env[envName]))
      .map(([provider]) => provider)
  );
}

/**
 * The model id that will actually be called for a requested model.
 */
export function resolveAvailableModelId(model) {
  const requested = normalizeModelId(model);
  const resolved = resolveModelForProviders(requested, getAvailableProviders());
  if (resolved !== requested) {
    console.log(`[providers] ${requested} has no API key configured, using ${resolved}`);
  }
  return resolved;
}

/** Human-readable startup lines describing which providers are usable. */
export function describeProviderSetup() {
  const available = getAvailableProviders();
  const lines = [];
  if (available.size === 0) {
    lines.push('No model provider key found. Set OPENAI_API_KEY, ANTHROPIC_API_KEY or GEMINI_API_KEY in .env.');
  } else {
    lines.push(`Model providers: ${[...available].join(', ')}`);
  }
  lines.push(process.env.E2B_API_KEY ? 'Sandbox: E2B key found' : 'Sandbox: E2B_API_KEY is missing, builds cannot run.');
  return lines;
}

// Provider clients are created on first use so importing this module never
// requires a key.
const clients = {};

function providerClient(provider) {
  if (clients[provider]) return clients[provider];
  if (provider === 'anthropic') {
    clients.anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  } else if (provider === 'openai') {
    clients.openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
  } else {
    clients.google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return clients[provider] || clients.google;
}

/**
 * Return an AI SDK model handle for a model id, falling back across
 * providers when the requested one has no key.
 */
export function getModel(model) {
  const modelId = resolveAvailableModelId(model);
  const provider = getProviderFromModelId(modelId);
  return providerClient(provider)(toProviderModelName(modelId));
}

// ─── OpenAI Responses API ───────────────────────────────────
// OpenAI's reasoning models are called through the Responses API. When there
// is no OpenAI key these helpers run the same prompt through `getModel`.

let nativeOpenAIClient = null;
function getNativeOpenAIClient() {
  if (!nativeOpenAIClient) {
    nativeOpenAIClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL
    });
  }
  return nativeOpenAIClient;
}

async function generateWithRole(role, effort, systemPrompt, userPrompt) {
  const modelId = resolveAvailableModelId(resolveModelRole(role));

  if (getProviderFromModelId(modelId) !== 'openai') {
    const { text } = await generateText({ model: getModel(modelId), system: systemPrompt, prompt: userPrompt });
    return text;
  }

  const res = await getNativeOpenAIClient().responses.create({
    model: toProviderModelName(modelId),
    reasoning: { effort },
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });
  return res.output_text;
}

export function generateWithQuality(systemPrompt, userPrompt) {
  return generateWithRole('nativeOpenAIQuality', 'medium', systemPrompt || 'You are a senior architect.', userPrompt);
}

export function generateFast(systemPrompt, userPrompt) {
  return generateWithRole('nativeOpenAIFast', 'low', systemPrompt || 'You are a fast precision assistant.', userPrompt);
}
