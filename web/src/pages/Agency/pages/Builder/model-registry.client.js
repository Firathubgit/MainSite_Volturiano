// Client-safe re-export. The server registry is canonical for model policy.
export {
  MODEL_IDS,
  MODEL_REGISTRY,
  getDefaultPublicModelId,
  getDefaultAvailableModelIds,
  getPublicModels,
  isInternalOnlyModel,
  normalizeModelId,
  normalizePublicModelId,
} from '../../../../../server/shared/model-registry.js';
