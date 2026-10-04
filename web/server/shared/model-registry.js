export const MODEL_IDS = {
  GEMINI_35_FLASH: 'google/gemini-3.5-flash',
  GEMINI_25_FLASH: 'google/gemini-2.5-flash',
  GEMINI_31_PRO_PREVIEW: 'google/gemini-3.1-pro-preview',
  GEMINI_31_PRO_CUSTOMTOOLS: 'google/gemini-3.1-pro-preview-customtools',
  GEMINI_31_FLASH_LITE: 'google/gemini-3.1-flash-lite',

  GPT_55: 'openai/gpt-5.5',
  GPT_55_MINI: 'openai/gpt-5.5-mini',

  CLAUDE_OPUS_47: 'anthropic/claude-opus-4-7',
  CLAUDE_HAIKU_45: 'anthropic/claude-haiku-4-5-20251001',
};

export const MODEL_ROLES = {
  defaultPublicModel: MODEL_IDS.GEMINI_35_FLASH,
  defaultPublic: MODEL_IDS.GEMINI_35_FLASH,
  generalGeneration: MODEL_IDS.GEMINI_35_FLASH,
  componentSelection: MODEL_IDS.GEMINI_35_FLASH,
  premiumPolish: MODEL_IDS.GPT_55,
  fastPolish: MODEL_IDS.GPT_55_MINI,
  nativeOpenAIQuality: MODEL_IDS.GPT_55,
  nativeOpenAIFast: MODEL_IDS.GPT_55_MINI,
  premiumCoder: MODEL_IDS.CLAUDE_OPUS_47,
  fastAnthropic: MODEL_IDS.CLAUDE_HAIKU_45,
  agentToolHeavy: MODEL_IDS.GEMINI_31_PRO_CUSTOMTOOLS,
  lightweight: MODEL_IDS.GEMINI_31_FLASH_LITE,
  crossProviderFallbackFromGoogle: MODEL_IDS.GPT_55,
  crossProviderFallbackFromOpenAI: MODEL_IDS.GEMINI_35_FLASH,
  crossProviderFallbackFromAnthropic: MODEL_IDS.GEMINI_35_FLASH,
};

export const MODEL_REGISTRY = [
  {
    id: MODEL_IDS.GEMINI_35_FLASH,
    label: 'Gemini 3.5 Flash',
    provider: 'google',
    tier: 'heavy',
    status: 'stable',
    userSelectable: true,
    internalOnly: false,
    roles: ['defaultPublic', 'generalGeneration', 'componentSelection', 'crossProviderFallbackFromOpenAI', 'crossProviderFallbackFromAnthropic'],
    aliases: [],
  },
  {
    id: MODEL_IDS.GEMINI_25_FLASH,
    label: 'Gemini 2.5 Flash',
    provider: 'google',
    tier: 'light',
    status: 'stable',
    userSelectable: true,
    internalOnly: false,
    roles: ['budget', 'fastFallback'],
    aliases: [],
  },
  {
    id: MODEL_IDS.GEMINI_31_PRO_PREVIEW,
    label: 'Gemini 3.1 Pro Preview',
    provider: 'google',
    tier: 'heavy',
    status: 'preview',
    userSelectable: true,
    internalOnly: false,
    roles: ['advanced'],
    aliases: [
      'google/gemini-3-pro-preview',
      'google/gemini-3-pro',
      'google/gemini-3.1-pro',
    ],
  },
  {
    id: MODEL_IDS.GPT_55,
    label: 'GPT-5.5',
    provider: 'openai',
    tier: 'heavy',
    status: 'stable',
    userSelectable: true,
    internalOnly: false,
    roles: ['premiumPolish', 'nativeOpenAIQuality', 'crossProviderFallbackFromGoogle'],
    aliases: ['openai/gpt-5.4'],
  },
  {
    id: MODEL_IDS.GPT_55_MINI,
    label: 'GPT-5.5 mini',
    provider: 'openai',
    tier: 'light',
    status: 'stable',
    userSelectable: true,
    internalOnly: false,
    roles: ['fastPolish', 'nativeOpenAIFast'],
    aliases: ['openai/gpt-5.4-mini'],
  },
  {
    id: MODEL_IDS.CLAUDE_OPUS_47,
    label: 'Claude Opus 4.7',
    provider: 'anthropic',
    tier: 'heavy',
    status: 'stable',
    userSelectable: true,
    internalOnly: false,
    roles: ['premiumCoder'],
    aliases: [
      'anthropic/claude-sonnet-4-6',
      'anthropic/claude-4.6',
    ],
  },
  {
    id: MODEL_IDS.CLAUDE_HAIKU_45,
    label: 'Claude Haiku 4.5',
    provider: 'anthropic',
    tier: 'light',
    status: 'stable',
    userSelectable: true,
    internalOnly: false,
    roles: ['fastAnthropic'],
    aliases: ['anthropic/claude-haiku-4-5'],
  },
  {
    id: MODEL_IDS.GEMINI_31_PRO_CUSTOMTOOLS,
    label: 'Gemini 3.1 Pro Preview Custom Tools',
    provider: 'google',
    tier: 'heavy',
    status: 'preview',
    userSelectable: false,
    internalOnly: true,
    roles: ['agentToolHeavy'],
    aliases: [],
  },
  {
    id: MODEL_IDS.GEMINI_31_FLASH_LITE,
    label: 'Gemini 3.1 Flash-Lite',
    provider: 'google',
    tier: 'light',
    status: 'stable',
    userSelectable: false,
    internalOnly: true,
    roles: ['lightweight'],
    aliases: [],
  },
];

const MODELS_BY_ID = new Map(MODEL_REGISTRY.map((model) => [model.id, model]));
const ALIAS_TO_ID = new Map(
  MODEL_REGISTRY.flatMap((model) => (model.aliases || []).map((alias) => [alias, model.id]))
);

function withProviderPrefix(value) {
  const id = String(value || '').trim();
  if (!id) return '';
  if (id.includes('/')) return id;
  if (id.startsWith('gemini-')) return `google/${id}`;
  if (id.startsWith('gpt-') || id.startsWith('o')) return `openai/${id}`;
  if (id.startsWith('claude-')) return `anthropic/${id}`;
  return id;
}

export function getPublicModels() {
  return MODEL_REGISTRY.filter((model) => model.userSelectable && !model.internalOnly);
}

export function getModelById(id) {
  return MODELS_BY_ID.get(normalizeModelId(id));
}

export function normalizeModelId(input) {
  const raw = withProviderPrefix(input);
  if (!raw) return getDefaultPublicModelId();
  if (MODELS_BY_ID.has(raw)) return raw;
  if (ALIAS_TO_ID.has(raw)) return ALIAS_TO_ID.get(raw);
  return getDefaultPublicModelId();
}

export function resolveModelRole(role) {
  return MODEL_ROLES[role] || getDefaultPublicModelId();
}

export function getDefaultPublicModelId() {
  return MODEL_IDS.GEMINI_35_FLASH;
}

export function getDefaultAvailableModelIds() {
  return getPublicModels().map((model) => model.id);
}

export function isInternalOnlyModel(id) {
  return getModelById(id)?.internalOnly === true;
}

export function getProviderFromModelId(id) {
  const normalized = normalizeModelId(id);
  const registered = MODELS_BY_ID.get(normalized);
  if (registered?.provider) return registered.provider;
  return normalized.split('/')[0] || '';
}

export function toProviderModelName(id) {
  const normalized = normalizeModelId(id);
  return normalized.includes('/') ? normalized.split('/').slice(1).join('/') : normalized;
}

// The model each provider uses for a tier when another provider's model is
// requested but that provider has no API key.
const PROVIDER_TIER_DEFAULTS = {
  google: { heavy: MODEL_IDS.GEMINI_35_FLASH, light: MODEL_IDS.GEMINI_31_FLASH_LITE },
  openai: { heavy: MODEL_IDS.GPT_55, light: MODEL_IDS.GPT_55_MINI },
  anthropic: { heavy: MODEL_IDS.CLAUDE_OPUS_47, light: MODEL_IDS.CLAUDE_HAIKU_45 },
};
const PROVIDER_PREFERENCE = ['google', 'openai', 'anthropic'];

/**
 * Map a model id onto the providers that are actually usable.
 * Returns the model unchanged when its provider is available (or when no
 * provider is, so the caller surfaces a clear missing-key error).
 */
export function resolveModelForProviders(modelId, availableProviders) {
  const normalized = normalizeModelId(modelId);
  const available = new Set(availableProviders || []);
  if (available.size === 0 || available.has(getProviderFromModelId(normalized))) return normalized;

  const tier = MODELS_BY_ID.get(normalized)?.tier || 'heavy';
  const fallbackProvider = PROVIDER_PREFERENCE.find((provider) => available.has(provider));
  return fallbackProvider ? PROVIDER_TIER_DEFAULTS[fallbackProvider][tier] : normalized;
}

export function normalizePublicModelId(input) {
  const normalized = normalizeModelId(input);
  return isInternalOnlyModel(normalized) ? getDefaultPublicModelId() : normalized;
}
