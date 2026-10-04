import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MODEL_IDS, resolveModelForProviders } from '../shared/model-registry.js';
import {
  describeProviderSetup,
  getAvailableProviders,
  resolveAvailableModelId,
} from '../lib/provider-helpers.js';

const KEYS = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'E2B_API_KEY'];
let saved;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('provider fallback', () => {
  it('keeps a model whose provider is available', () => {
    expect(resolveModelForProviders(MODEL_IDS.GPT_55, ['openai', 'google'])).toBe(MODEL_IDS.GPT_55);
  });

  it('swaps to the same tier on another provider', () => {
    expect(resolveModelForProviders(MODEL_IDS.GEMINI_35_FLASH, ['openai'])).toBe(MODEL_IDS.GPT_55);
    expect(resolveModelForProviders(MODEL_IDS.GEMINI_31_FLASH_LITE, ['openai'])).toBe(MODEL_IDS.GPT_55_MINI);
    expect(resolveModelForProviders(MODEL_IDS.GPT_55_MINI, ['anthropic'])).toBe(MODEL_IDS.CLAUDE_HAIKU_45);
    expect(resolveModelForProviders(MODEL_IDS.CLAUDE_OPUS_47, ['google'])).toBe(MODEL_IDS.GEMINI_35_FLASH);
  });

  it('leaves the model alone when no provider is configured', () => {
    expect(resolveModelForProviders(MODEL_IDS.GPT_55, [])).toBe(MODEL_IDS.GPT_55);
  });

  it('reads available providers from the environment', () => {
    expect([...getAvailableProviders()]).toEqual([]);

    process.env.ANTHROPIC_API_KEY = 'test-key';
    expect([...getAvailableProviders()]).toEqual(['anthropic']);
    expect(resolveAvailableModelId(MODEL_IDS.GEMINI_35_FLASH)).toBe(MODEL_IDS.CLAUDE_OPUS_47);
  });

  it('routes every internal role to a usable model with a single key', () => {
    process.env.OPENAI_API_KEY = 'test-key';
    for (const id of Object.values(MODEL_IDS)) {
      expect(resolveAvailableModelId(id).startsWith('openai/')).toBe(true);
    }
  });

  it('describes missing setup in plain words', () => {
    const lines = describeProviderSetup().join('\n');
    expect(lines).toContain('No model provider key found');
    expect(lines).toContain('E2B_API_KEY is missing');
  });
});
