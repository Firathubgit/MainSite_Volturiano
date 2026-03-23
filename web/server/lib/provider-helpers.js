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
      if (modelId === 'claude-4.6') modelId = 'claude-3-7-sonnet-20250219'; // Map to real model backend
      return anthropic(modelId);
    }
    if (model.startsWith('openai/')) {
      let modelName = model.replace('openai/', '');
      if (modelName === 'gpt-5.2') modelName = 'gpt-4o'; // Map UI to real model
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

export { groq, anthropic, openai, googleGenerativeAI };
