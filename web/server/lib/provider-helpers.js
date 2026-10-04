import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  getProviderFromModelId,
  normalizeModelId,
  resolveModelRole,
  toProviderModelName
} from '../shared/model-registry.js';

const isUsingAIGateway = !!process.env.AI_GATEWAY_API_KEY;
const aiGatewayBaseURL = 'https://ai-gateway.vercel.sh/v1';

const groq = createGroq({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.GROQ_API_KEY,
  baseURL: isUsingAIGateway ? aiGatewayBaseURL : undefined,
});

const anthropic = createAnthropic({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.ANTHROPIC_API_KEY,
  baseURL: isUsingAIGateway ? aiGatewayBaseURL : undefined,
});

const openai = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY,
  baseURL: isUsingAIGateway ? aiGatewayBaseURL : process.env.OPENAI_BASE_URL,
});

const googleGenerativeAI = createGoogleGenerativeAI({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.GEMINI_API_KEY,
  baseURL: isUsingAIGateway ? aiGatewayBaseURL : undefined,
});

export function getModel(model) {
  const rawModel = String(model || '').trim();
  if (rawModel && !rawModel.includes('/') && !/^(gemini-|gpt-|o|claude-)/.test(rawModel)) {
    return groq(rawModel);
  }
  const normalizedModel = normalizeModelId(model);
  const provider = getProviderFromModelId(normalizedModel);
  const providerModelName = toProviderModelName(normalizedModel);

  console.log(`[provider-helpers] Resolving model: ${model} -> ${normalizedModel}`);
  try {
    if (provider === 'anthropic') {
      return anthropic(providerModelName);
    }
    if (provider === 'openai') {
      return providerModelName.includes('gpt-oss') ? groq(normalizedModel) : openai(providerModelName);
    }
    if (provider === 'google') {
      return googleGenerativeAI(providerModelName);
    }
    return groq(normalizedModel);
  } catch (error) {
    console.error(`[provider-helpers] Error resolving model ${normalizedModel}, falling back to groq default:`, error.message);
    return groq('llama-3.1-70b-versatile');
  }
}

// ----------------------------------------------------------------------
// NATIVE OPENAI RESPONSES API WRAPPER
// Minimal implementation as per OpenAI's current model guidance: GPT-5.5
// is the main frontier model, preferring Responses API for correct reasoning
// ----------------------------------------------------------------------
import OpenAI from "openai";

// Created on first use so importing this module never requires an API key.
let nativeOpenAIClient = null;
function getNativeOpenAIClient() {
  if (!nativeOpenAIClient) {
    nativeOpenAIClient = new OpenAI({
      apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY,
      baseURL: isUsingAIGateway ? aiGatewayBaseURL : process.env.OPENAI_BASE_URL,
    });
  }
  return nativeOpenAIClient;
}

export async function generateWithQuality(systemPrompt, userPrompt) {
  const res = await getNativeOpenAIClient().responses.create({
    model: toProviderModelName(resolveModelRole('nativeOpenAIQuality')),
    reasoning: { effort: "medium" },
    input: [
      { role: "system", content: systemPrompt || "You are a senior architect." },
      { role: "user", content: userPrompt },
    ],
  });
  return res.output_text;
}

export async function generateFast(systemPrompt, userPrompt) {
  const res = await getNativeOpenAIClient().responses.create({
    model: toProviderModelName(resolveModelRole('nativeOpenAIFast')),
    reasoning: { effort: "low" },
    input: [
      { role: "system", content: systemPrompt || "You are a fast precision assistant." },
      { role: "user", content: userPrompt },
    ],
  });
  return res.output_text;
}

export { groq, anthropic, openai, googleGenerativeAI };
