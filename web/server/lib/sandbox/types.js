/**
 * Base SandboxProvider class - providers extend this.
 */
export class SandboxProvider {
  constructor(config = {}) {
    this.config = config;
    this.sandbox = null;
    this.sandboxInfo = null;
  }

  async createSandbox() { throw new Error('Not implemented'); }
  async runCommand(command) { throw new Error('Not implemented'); }
  async writeFile(path, content) { throw new Error('Not implemented'); }
  async readFile(path) { throw new Error('Not implemented'); }
  async downloadFile(path) { throw new Error('Not implemented'); }
  async listFiles(directory) { throw new Error('Not implemented'); }
  async installPackages(packages) { throw new Error('Not implemented'); }
  getSandboxUrl() { return null; }
  getSandboxInfo() { return null; }
  async terminate() { throw new Error('Not implemented'); }
  isAlive() { return false; }
  async setupViteApp() { throw new Error('setupViteApp not implemented'); }
  async restartViteServer() { throw new Error('restartViteServer not implemented'); }
}
