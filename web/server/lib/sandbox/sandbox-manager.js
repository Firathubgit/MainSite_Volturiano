import { SandboxFactory } from './factory.js';

class SandboxManager {
  constructor() {
    this.sandboxes = new Map();
    this.activeSandboxId = null;
  }

  async getOrCreateProvider(sandboxId) {
    const existing = this.sandboxes.get(sandboxId);
    if (existing) {
      existing.lastAccessed = new Date();
      return existing.provider;
    }

    try {
      const provider = SandboxFactory.create();
      const reconnected = await provider.reconnect(sandboxId);
      if (reconnected) {
        this.sandboxes.set(sandboxId, { sandboxId, provider, createdAt: new Date(), lastAccessed: new Date() });
        this.activeSandboxId = sandboxId;
        return provider;
      }
      return provider;
    } catch (error) {
      console.error(`[SandboxManager] Error reconnecting to sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  registerSandbox(sandboxId, provider) {
    this.sandboxes.set(sandboxId, { sandboxId, provider, createdAt: new Date(), lastAccessed: new Date() });
    this.activeSandboxId = sandboxId;
  }

  getActiveProvider() {
    if (!this.activeSandboxId) return null;
    const sandbox = this.sandboxes.get(this.activeSandboxId);
    if (sandbox) { sandbox.lastAccessed = new Date(); return sandbox.provider; }
    return null;
  }

  getProvider(sandboxId) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox) { sandbox.lastAccessed = new Date(); return sandbox.provider; }
    return null;
  }

  async terminateSandbox(sandboxId) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox) {
      try { await sandbox.provider.terminate(); } catch (e) { console.error(`Error terminating ${sandboxId}:`, e); }
      this.sandboxes.delete(sandboxId);
      if (this.activeSandboxId === sandboxId) this.activeSandboxId = null;
    }
  }

  async terminateAll() {
    const promises = Array.from(this.sandboxes.values()).map(s =>
      s.provider.terminate().catch(err => console.error(`Error terminating ${s.sandboxId}:`, err))
    );
    await Promise.all(promises);
    this.sandboxes.clear();
    this.activeSandboxId = null;
  }

  async cleanup(maxAge = 3600000) {
    const now = Date.now();
    const toDelete = [];
    for (const [id, info] of this.sandboxes.entries()) {
      if (now - info.lastAccessed.getTime() > maxAge) toDelete.push(id);
    }
    for (const id of toDelete) await this.terminateSandbox(id);
  }
}

export const sandboxManager = new SandboxManager();
