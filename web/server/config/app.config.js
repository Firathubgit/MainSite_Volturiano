import { getDefaultAvailableModelIds, getDefaultPublicModelId } from '../shared/model-registry.js';

export const appConfig = {
  e2b: {
    timeoutMinutes: 60,
    get timeoutMs() { return this.timeoutMinutes * 60 * 1000; },
    vitePort: 5173,
    viteStartupDelay: 10000,
    workingDirectory: '/home/user/app',
  },
  ai: {
    defaultModel: getDefaultPublicModelId(),
    availableModels: getDefaultAvailableModelIds(),
    defaultTemperature: 0.7,
    maxTokens: 8000,
  },
  codeApplication: {
    defaultRefreshDelay: 2000,
    packageInstallRefreshDelay: 5000,
  },
  ui: {
    showModelSelector: true,
    showStatusIndicator: true,
    maxChatMessages: 100,
    maxRecentMessagesContext: 20,
  },
  packages: {
    useLegacyPeerDeps: true,
    installTimeout: 60000,
    autoRestartVite: true,
  },
  files: {
    excludePatterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.log', '.DS_Store'],
    maxFileSize: 1024 * 1024,
    textFileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json', '.md', '.txt'],
  },
  features: {
    urlClone: false,
    promptOnly: true,
    premiumComponents: true,
  },
  registry: {
    catalogPath: './lib/registry/catalog.json',
    bundlesDir: './lib/registry/bundles',
    templatesDir: './lib/registry/templates',
  },
  selection: {
    confidenceThreshold: 0.72,
    adaptationThreshold: 0.55,
    maxCatalogItemsInPrompt: 80,
  },
};

export default appConfig;
