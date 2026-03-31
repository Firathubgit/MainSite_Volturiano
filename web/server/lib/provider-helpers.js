import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

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
  console.log(`[provider-helpers] Resolving model: ${model}`);
  try {
    if (model.startsWith('anthropic/')) {
      let modelId = model.replace('anthropic/', '');
      // Use exact names requested by user
      if (modelId === 'claude-4.6') modelId = 'claude-sonnet-4-6';
      return anthropic(modelId);
    }
    if (model.startsWith('openai/')) {
      let modelName = model.replace('openai/', '');
      if (modelName === 'gpt-5.2') modelName = 'gpt-4o'; // Old mapping cleanup
      // Use exact names requested by user, bypass o3-mini completely
      if (modelName === 'gpt-5.4') return openai('gpt-5.4');
      if (modelName === 'gpt-5.4-mini') return openai('gpt-5.4-mini');
      return model.includes('gpt-oss') ? groq(model) : openai(modelName);
    }
    if (model.startsWith('google/')) {
      const modelId = model.replace('google/', '');
      return googleGenerativeAI(modelId);
    }
    return groq(model);
  } catch (error) {
    console.error(`[provider-helpers] Error resolving model ${model}, falling back to groq default:`, error.message);
    return groq('llama-3.1-70b-versatile');
  }
}

// ----------------------------------------------------------------------
// NATIVE OPENAI RESPONSES API WRAPPER
// Minimal implementation as per OpenAI's current model guidance: gpt-5.4
// is the main frontier model, preferring Responses API for correct reasoning
// ----------------------------------------------------------------------
import OpenAI from "openai";
const nativeOpenAIClient = new OpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY,
  baseURL: isUsingAIGateway ? aiGatewayBaseURL : process.env.OPENAI_BASE_URL,
});

export async function generateWithQuality(systemPrompt, userPrompt) {
  const res = await nativeOpenAIClient.responses.create({
    model: "gpt-5.4",
    reasoning: { effort: "medium" },
    input: [
      { role: "system", content: systemPrompt || "You are a senior architect." },
      { role: "user", content: userPrompt },
    ],
  });
  return res.output_text;
}

export async function generateFast(systemPrompt, userPrompt) {
  const res = await nativeOpenAIClient.responses.create({
    model: "gpt-5.4-mini",
    reasoning: { effort: "low" },
    input: [
      { role: "system", content: systemPrompt || "You are a fast precision assistant." },
      { role: "user", content: userPrompt },
    ],
  });
  return res.output_text;
}

export { groq, anthropic, openai, googleGenerativeAI };
