import { Sandbox } from '@e2b/code-interpreter';
import { SandboxProvider } from '../types.js';
import { appConfig } from '../../../config/app.config.js';

export class E2BProvider extends SandboxProvider {
  constructor(config = {}) {
    super(config);
    this.existingFiles = new Set();
  }

  async reconnect(sandboxId) {
    try {
      console.log(`[E2BProvider] Reconnecting to sandbox ${sandboxId}...`);
      if (this.sandbox) this.sandbox = null;

      this.sandbox = await Sandbox.connect(sandboxId, {
        apiKey: this.config.e2b?.apiKey || process.env.E2B_API_KEY
      });

      const host = this.sandbox.getHost(appConfig.e2b.vitePort);
      this.sandboxInfo = {
        sandboxId,
        url: `https://${host}`,
        provider: 'e2b',
        createdAt: new Date()
      };
      console.log(`[E2BProvider] Reconnected to ${sandboxId}`);
      return true;
    } catch (error) {
      console.error(`[E2BProvider] Reconnect failed:`, error.message);
      return false;
    }
  }

  async keepAlive() {
    if (this.sandbox) {
      try {
        const timeoutMs = this.config.e2b?.timeoutMs || appConfig.e2b.timeoutMs;
        await this.sandbox.setTimeout(timeoutMs);
        console.log(`[E2BProvider] Extended sandbox ${this.sandbox.sandboxId} timeout by ${timeoutMs}ms`);
      } catch (e) {
        console.error(`[E2BProvider] Failed to keep alive ${this.sandbox.sandboxId}:`, e.message);
      }
    }
  }

  async createSandbox() {
    try {
      if (this.sandbox) {
        try { await this.sandbox.kill(); } catch (e) { /* ignore */ }
        this.sandbox = null;
      }
      this.existingFiles.clear();

      console.log('[E2BProvider] Creating sandbox...');
      this.sandbox = await Sandbox.create({
        apiKey: this.config.e2b?.apiKey || process.env.E2B_API_KEY,
        timeoutMs: this.config.e2b?.timeoutMs || appConfig.e2b.timeoutMs
      });

      const sandboxId = this.sandbox.sandboxId;
      const host = this.sandbox.getHost(appConfig.e2b.vitePort);

      this.sandboxInfo = {
        sandboxId,
        url: `https://${host}`,
        provider: 'e2b',
        createdAt: new Date()
      };

      console.log(`[E2BProvider] Sandbox created: ${sandboxId}, URL: https://${host}`);
      return this.sandboxInfo;
    } catch (error) {
      console.error('[E2BProvider] createSandbox error:', error.message);
      throw error;
    }
  }

  async runCommand(command) {
    if (!this.sandbox) throw new Error('No active sandbox');
    console.log(`[E2BProvider] runCommand: ${command}`);

    try {
      const result = await this.sandbox.commands.run(command, {
        cwd: appConfig.e2b.workingDirectory,
        timeoutMs: 60000
      });
      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode ?? 0,
        success: result.exitCode === 0
      };
    } catch (error) {
      console.error('[E2BProvider] runCommand error:', error.message);
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.exitCode || 1,
        success: false
      };
    }
  }

  async writeFile(path, content) {
    if (!this.sandbox) throw new Error('No active sandbox');
    const fullPath = path.startsWith('/') ? path : `/home/user/app/${path}`;

    console.log(`[E2BProvider] writeFile: ${fullPath} (${content.length} bytes)`);

    try {
      // Base64 encode the content in Node before sending to python to perfectly preserve
      // newlines, backticks, quotes, and unicode characters inside JSX files.
      const base64Content = Buffer.from(content, 'utf-8').toString('base64');

      await this.sandbox.runCode(`
import os, base64
full_path = "${fullPath}"
os.makedirs(os.path.dirname(full_path), exist_ok=True)
with open(full_path, 'wb') as f:
    f.write(base64.b64decode("${base64Content}"))
print(f"Written: {full_path}")
      `);

      this.existingFiles.add(path);
      console.log(`[E2BProvider] writeFile OK: ${fullPath}`);
    } catch (error) {
      console.error(`[E2BProvider] writeFile error for ${fullPath}:`, error.message);
      throw error;
    }
  }

  async writeFileAtomic(path, content, buildId) {
    if (!this.sandbox) throw new Error('No active sandbox');
    // We previously used a temp file + mv, but mv can fail in certain shell envs.
    // Instead, we trust E2B's writeFile implementation, which handles atomic writes cleanly via the SDK.
    try {
      await this.writeFile(path, content);
      this.existingFiles.add(path);
    } catch (error) {
      console.error(`[E2BProvider] writeFileAtomic error for ${path}:`, error.message);
      throw error;
    }
  }

  async readFile(path) {
    if (!this.sandbox) throw new Error('No active sandbox');
    const fullPath = path.startsWith('/') ? path : `/home/user/app/${path}`;

    try {
      const content = await this.sandbox.files.read(fullPath);
      return typeof content === 'string' ? content : content.toString();
    } catch (error) {
      console.error(`[E2BProvider] readFile error for ${fullPath}:`, error.message);
      throw error;
    }
  }

  async downloadFile(path) {
    if (!this.sandbox) throw new Error('No active sandbox');
    const fullPath = path.startsWith('/') ? path : `/home/user/app/${path}`;

    try {
      console.log(`[E2BProvider] downloadFile (binary): ${fullPath}`);
      return await this.sandbox.files.download(fullPath);
    } catch (error) {
      console.error(`[E2BProvider] downloadFile error for ${fullPath}:`, error.message);
      throw error;
    }
  }

  async listFiles(directory = '/home/user/app') {
    if (!this.sandbox) throw new Error('No active sandbox');

    try {
      const result = await this.sandbox.commands.run(
        `find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" | head -200`,
        { cwd: directory, timeoutMs: 15000 }
      );
      const files = (result.stdout || '').split('\n').filter(Boolean).map(f => f.replace(/^\.\//, ''));
      return files;
    } catch (error) {
      console.error('[E2BProvider] listFiles error:', error.message);
      return [];
    }
  }

  // Install packages WITHOUT restarting Vite (caller handles Vite restart)
  async installPackagesOnly(packages) {
    if (!this.sandbox) throw new Error('No active sandbox');
    const packageList = packages.join(' ');
    const flags = appConfig.packages.useLegacyPeerDeps ? '--legacy-peer-deps' : '';

    console.log(`[E2BProvider] Installing packages (no Vite restart): ${packageList}`);

    try {
      // Stop Vite first so npm can update node_modules cleanly
      await this.sandbox.runCode(`
import subprocess
subprocess.run(['pkill', '-f', 'vite'], capture_output=True)
import time; time.sleep(1)
print('Vite stopped')
      `);

      // Install packages
      const result = await this.sandbox.runCode(`
import subprocess, os

os.chdir('/home/user/app')
print(f'Installing: ${packageList}')
result = subprocess.run(
    ['npm', 'install', ${flags ? `'${flags}',` : ''} ${packages.map(p => `'${p}'`).join(', ')}],
    capture_output=True,
    text=True,
    cwd='/home/user/app',
    timeout=90
)
print(f'Exit code: {result.returncode}')
if result.stdout:
    print(f'stdout: {result.stdout[:300]}')
if result.stderr:
    print(f'stderr: {result.stderr[:300]}')
      `);

      const output = this._getOutput(result);
      console.log('[E2BProvider] Install output:', output.substring(0, 300));
      return { stdout: output, stderr: '', exitCode: result.error ? 1 : 0, success: !result.error };
    } catch (error) {
      console.error('[E2BProvider] installPackagesOnly error:', error.message);
      return { stdout: '', stderr: error.message, exitCode: 1, success: false };
    }
  }

  // Install packages WITH Vite restart (for chat edits)
  async installPackages(packages) {
    const result = await this.installPackagesOnly(packages);
    if (result.success) {
      await this.restartViteServer();
    }
    return result;
  }

  async setupViteApp() {
    if (!this.sandbox) throw new Error('No active sandbox');
    console.log('[E2BProvider] Setting up Vite React app...');

    // Use Python to write all files at once (most reliable bulk-write approach)
    const setupScript = `
import os, json

print('Setting up React app with Vite and Tailwind...')
os.makedirs('/home/user/app/src', exist_ok=True)

package_json = {
    "name": "sandbox-app", "version": "1.0.0", "type": "module",
    "scripts": {"dev": "vite --host", "build": "vite build", "preview": "vite preview"},
    "dependencies": {
        "react": "^18.2.0", 
        "react-dom": "^18.2.0", 
        "react-router-dom": "^6.20.0", 
        "three": "^0.160.0", 
        "@react-three/fiber": "^8.15.11", 
        "@react-three/drei": "^9.88.16", 
        "framer-motion": "^10.16.0",
        "react-icons": "^5.0.1",
        "lucide-react": "^0.344.0",
        "@radix-ui/react-icons": "^1.3.0",
        "clsx": "^2.1.0",
        "tailwind-merge": "^2.2.1"
    },
    "devDependencies": {
        "@vitejs/plugin-react": "^4.0.0", "vite": "^4.3.9",
        "tailwindcss": "^3.3.0", "postcss": "^8.4.31", "autoprefixer": "^10.4.16"
    }
}
with open('/home/user/app/package.json', 'w') as f:
    json.dump(package_json, f, indent=2)
print('OK: package.json')

vite_config = """import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { 
    host: '0.0.0.0', 
    port: 5173, 
    strictPort: true, 
    hmr: { clientPort: 443 }, 
    watch: { usePolling: true },
    allowedHosts: ['.e2b.app', '.e2b.dev', '.vercel.run', 'localhost'] 
  }
})"""
with open('/home/user/app/vite.config.js', 'w') as f:
    f.write(vite_config)
print('OK: vite.config.js')

tailwind_config = """import flattenColorPalette from 'tailwindcss/lib/util/flattenColorPalette';

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      animation: {
        aurora: "aurora 60s linear infinite",
      },
      keyframes: {
        aurora: {
          from: { backgroundPosition: "50% 50%, 50% 50%" },
          to: { backgroundPosition: "350% 50%, 350% 50%" },
        },
      },
    },
  },
  plugins: [addVariablesForColors],
};

function addVariablesForColors({ addBase, theme }) {
  let allColors = flattenColorPalette(theme("colors"));
  let newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => ["--" + key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(), val])
  );
  addBase({ ":root": newVars });
}"""
with open('/home/user/app/tailwind.config.js', 'w') as f:
    f.write(tailwind_config)
print('OK: tailwind.config.js')

postcss_config = """export default { plugins: { tailwindcss: {}, autoprefixer: {} } }"""
with open('/home/user/app/postcss.config.js', 'w') as f:
    f.write(postcss_config)
print('OK: postcss.config.js')

index_html = """<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Sandbox App</title>
<script>
  (function() {
    const oldLog = console.log;
    const oldErr = console.error;
    const oldWarn = console.warn;
    const oldInfo = console.info;
    
    function send(type, args) {
      try {
        // safely serialize args
        const safeArgs = args.map(a => {
          try {
            if (a instanceof Error) return a.stack || a.message;
            if (typeof a === 'object') return JSON.stringify(a);
            return String(a);
          } catch (e) { return '[Circular/Unserializable]'; }
        });
        window.parent.postMessage({ type: 'sandbox-console', level: type, args: safeArgs, timestamp: Date.now() }, '*');
      } catch (e) { /* ignore */ }
    }

    console.log = (...args) => { oldLog(...args); send('log', args); };
    console.error = (...args) => { oldErr(...args); send('error', args); };
    console.warn = (...args) => { oldWarn(...args); send('warn', args); };
    console.info = (...args) => { oldInfo(...args); send('info', args); };
    
    window.onerror = (msg, url, line, col, error) => {
      send('error', [msg, \`at \${url}: \${line}: \${col}\`, error || '']);
    };
  })();
</script>
</head>
<body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>"""
with open('/home/user/app/index.html', 'w') as f:
    f.write(index_html)
print('OK: index.html')

main_jsx = """import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>)"""
with open('/home/user/app/src/main.jsx', 'w') as f:
    f.write(main_jsx)
print('OK: main.jsx')

user_component_jsx = """function UserComponent() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <p className="text-lg text-gray-400">Sandbox Ready</p>
    </div>
  )
}
export default UserComponent"""
with open('/home/user/app/src/UserComponent.jsx', 'w') as f:
    f.write(user_component_jsx)
print('OK: UserComponent.jsx')

app_jsx = """import React from 'react';
import UserComponent from './UserComponent.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Sandbox Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-900/20 text-red-500 p-8 flex flex-col items-start justify-start font-mono">
          <h2 className="text-xl font-bold mb-4">Runtime Error</h2>
          <pre className="whitespace-pre-wrap">{this.state.error && this.state.error.toString()}</pre>
        </div>
      );
    }
    return <UserComponent />;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <UserComponent />
    </ErrorBoundary>
  );
}"""
with open('/home/user/app/src/App.jsx', 'w') as f:
    f.write(app_jsx)
print('OK: App.jsx')

index_css = """@tailwind base;
@tailwind components;
@tailwind utilities;
html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: rgb(17 24 39); }
#root { width: 100vw; min-height: 100vh; display: flex; flex-direction: column; }"""
with open('/home/user/app/src/index.css', 'w') as f:
    f.write(index_css)
print('OK: index.css')

print('All files created!')
`;

    try {
      const setupResult = await this.sandbox.runCode(setupScript);
      const setupOut = this._getOutput(setupResult);
      console.log('[E2BProvider] Setup output:', setupOut);

      if (setupResult.error) {
        console.error('[E2BProvider] Setup error:', setupResult.error);
      }
    } catch (error) {
      console.error('[E2BProvider] Setup script failed:', error.message);
      throw error;
    }

    // npm install using Python subprocess (reliable in E2B)
    console.log('[E2BProvider] Running npm install...');
    try {
      const installResult = await this.sandbox.runCode(`
import subprocess
print('Installing npm packages...')
result = subprocess.run(
    ['npm', 'install'],
    cwd='/home/user/app',
    capture_output=True,
    text=True,
    timeout=120
)
if result.returncode == 0:
    print('OK: Dependencies installed successfully')
else:
    print(f'WARN: npm install exit code {result.returncode}')
    print(f'stderr: {result.stderr[:500]}')
      `);
      const installOut = this._getOutput(installResult);
      console.log('[E2BProvider] npm install output:', installOut);
    } catch (error) {
      console.error('[E2BProvider] npm install failed:', error.message);
    }

    // Start Vite dev server using Python Popen (the ONLY reliable way in E2B)
    console.log('[E2BProvider] Starting Vite dev server...');
    try {
      await this.sandbox.runCode(`
import subprocess, os, time

os.chdir('/home/user/app')

# Kill any existing Vite processes
subprocess.run(['pkill', '-f', 'vite'], capture_output=True)
time.sleep(1)

# Start Vite in background with Popen (detached process)
env = os.environ.copy()
env['FORCE_COLOR'] = '0'

process = subprocess.Popen(
    ['npx', 'vite', '--host'],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    cwd='/home/user/app',
    env=env
)

print(f'OK: Vite dev server started with PID: {process.pid}')
print('Waiting for server to be ready...')
      `);

      console.log('[E2BProvider] Waiting for Vite to bind to port...');
      await new Promise(r => setTimeout(r, appConfig.e2b.viteStartupDelay));
      console.log('[E2BProvider] Vite should be ready now');
    } catch (error) {
      console.error('[E2BProvider] Vite start error:', error.message);
    }

    // Track initial files
    ['src/App.jsx', 'src/main.jsx', 'src/index.css', 'index.html', 'package.json', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js']
      .forEach(f => this.existingFiles.add(f));

    console.log('[E2BProvider] Setup complete!');
  }

  async restartViteServer() {
    if (!this.sandbox) throw new Error('No active sandbox');
    console.log('[E2BProvider] Restarting Vite...');

    try {
      await this.sandbox.runCode(`
import subprocess, time, os

os.chdir('/home/user/app')

# Kill existing Vite process
subprocess.run(['pkill', '-f', 'vite'], capture_output=True)
time.sleep(2)

# Start Vite dev server as background process
env = os.environ.copy()
env['FORCE_COLOR'] = '0'

process = subprocess.Popen(
    ['npx', 'vite', '--host'],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    cwd='/home/user/app',
    env=env
)

print(f'OK: Vite restarted with PID: {process.pid}')
      `);

      await new Promise(r => setTimeout(r, appConfig.e2b.viteStartupDelay));
      console.log('[E2BProvider] Vite restarted');
    } catch (error) {
      console.error('[E2BProvider] Vite restart error:', error.message);
    }
  }

  // Helper: safely extract text output from runCode result
  _getOutput(result) {
    if (!result) return '';
    // v2: result.logs.stdout is an array of OutputMessage objects or strings
    if (result.logs?.stdout) {
      const items = result.logs.stdout;
      if (Array.isArray(items)) {
        return items.map(item => {
          if (typeof item === 'string') return item;
          if (item?.line) return item.line;
          if (item?.text) return item.text;
          return String(item);
        }).join('\n');
      }
    }
    // Fallback: result.text
    if (result.text) return result.text;
    return '';
  }

  getSandboxUrl() { return this.sandboxInfo?.url || null; }
  getSandboxInfo() { return this.sandboxInfo; }

  async terminate() {
    if (this.sandbox) {
      try { await this.sandbox.kill(); } catch (e) { console.error('Terminate error:', e.message); }
      this.sandbox = null;
      this.sandboxInfo = null;
    }
  }

  isAlive() { return !!this.sandbox; }
}
