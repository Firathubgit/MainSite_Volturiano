import { E2BProvider } from './providers/e2b-provider.js';

export class SandboxFactory {
  static create(provider, config = {}) {
    const selected = provider || process.env.SANDBOX_PROVIDER || 'e2b';
    switch (selected.toLowerCase()) {
      case 'e2b':
        return new E2BProvider(config);
      default:
        throw new Error(`Unknown sandbox provider: ${selected}. Supported: e2b`);
    }
  }

  static isProviderAvailable(provider) {
    if (provider === 'e2b') return !!process.env.E2B_API_KEY;
    return false;
  }
}
