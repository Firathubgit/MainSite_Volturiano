import { describe, expect, it } from 'vitest';
import {
  getDefaultAvailableModelIds,
  getDefaultPublicModelId,
  getPublicModels,
  isInternalOnlyModel,
  normalizeModelId,
  resolveModelRole,
} from '../../server/shared/model-registry.js';

describe('model registry', () => {
  it('normalizes previous production model ids', () => {
    expect(normalizeModelId('openai/gpt-5.4')).toBe('openai/gpt-5.5');
    expect(normalizeModelId('openai/gpt-5.4-mini')).toBe('openai/gpt-5.5-mini');
    expect(normalizeModelId('anthropic/claude-sonnet-4-6')).toBe('anthropic/claude-opus-4-7');
    expect(normalizeModelId('anthropic/claude-4.6')).toBe('anthropic/claude-opus-4-7');
    expect(normalizeModelId('anthropic/claude-haiku-4-5')).toBe('anthropic/claude-haiku-4-5-20251001');
    expect(normalizeModelId('google/gemini-3-pro-preview')).toBe('google/gemini-3.1-pro-preview');
    expect(normalizeModelId('google/gemini-3-pro')).toBe('google/gemini-3.1-pro-preview');
  });

  it('exposes only public selectable models in the default list', () => {
    expect(getDefaultPublicModelId()).toBe('google/gemini-3.5-flash');

    const available = getDefaultAvailableModelIds();
    expect(available).not.toContain('anthropic/claude-sonnet-4-6');
    expect(available).toContain('anthropic/claude-opus-4-7');

    const publicIds = getPublicModels().map((model) => model.id);
    expect(publicIds).not.toContain('google/gemini-3.1-pro-preview-customtools');
    expect(publicIds).not.toContain('google/gemini-3.1-flash-lite');
    expect(isInternalOnlyModel('google/gemini-3.1-pro-preview-customtools')).toBe(true);
  });

  it('resolves model roles for current routing policy', () => {
    expect(resolveModelRole('premiumPolish')).toBe('openai/gpt-5.5');
    expect(resolveModelRole('fastPolish')).toBe('openai/gpt-5.5-mini');
    expect(resolveModelRole('agentToolHeavy')).toBe('google/gemini-3.1-pro-preview-customtools');
    expect(resolveModelRole('lightweight')).toBe('google/gemini-3.1-flash-lite');
  });
});
