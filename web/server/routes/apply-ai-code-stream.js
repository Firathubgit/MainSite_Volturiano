import { sandboxManager } from '../lib/sandbox/sandbox-manager.js';
import { updateManifest, log } from '../lib/build-manifest.js';
import { parseFileBlocks } from '../lib/file-blocks.js';
import { verifySandboxBuild } from '../lib/verify-sandbox-build.js';
import { attemptRepair } from '../lib/auto-repair.js';
import { SSEWriter, SSE_EVENTS, AIBuildNarrator } from '../shared/sse-events.js';
import { runPolishStep, PREMIUM_PATH_PREFIX, generateDesignSpec } from '../lib/polish-refinement.js';
import { resolveDesignSpecModelId } from '../lib/llm-lightweight.js';
import { runPolishFillers } from '../lib/polish-filler.js';
import { runMiniPolishStep } from '../lib/mini-polish-refinement.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { validateAndFixIdentifiers } from '../lib/validate-identifiers.js';

// ═══════════════════════════════════════════════════════════
// AI_STABILITY_FIX_V4: WHITELIST-ONLY IMPORT ARCHITECTURE
// This is the DEFINITIVE fix for dependency hallucination.
// Instead of blacklisting individual packages (whack-a-mole),
// we WHITELIST the only packages allowed in the sandbox.
// Any import not on this list is stripped from generated code
// BEFORE it reaches the sandbox filesystem.
// ═══════════════════════════════════════════════════════════
const ALLOWED_PACKAGES = new Set([
  // Core React
  'react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime',
  // Approved libraries
  'framer-motion',
  'lucide-react',
  'react-router-dom',
  'react-icons',
  'clsx',
  'tailwind-merge',
  'cobe',
  'color-bits',
  '@radix-ui/react-icons',
  'ogl',
  'three',
  '@react-three/fiber',
  '@react-three/drei'
]);

// Check if a package import is allowed
function isAllowedPackage(pkg) {
  if (pkg.startsWith('.') || pkg.startsWith('/')) return true; // Local imports always OK
  const root = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];
  return ALLOWED_PACKAGES.has(root);
}

// Extract packages from import statements
function extractPackages(code) {
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
  const packages = new Set();
  let m;
  while ((m = importRegex.exec(code)) !== null) {
    const pkg = m[1];
    if (!pkg.startsWith('.') && !pkg.startsWith('/') && !['react', 'react-dom'].includes(pkg)) {
      packages.add(pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0]);
    }
  }
  return [...packages];
}

// Names that are definitely NOT lucide-react icons — AI confuses UI components with icons
const NOT_LUCIDE_ICONS = new Set([
  'Button', 'Modal', 'Card', 'Input', 'Select', 'Dropdown', 'Toggle',
  'Switch', 'Checkbox', 'Radio', 'Slider', 'Dialog', 'Popover', 'Tooltip',
  'Badge', 'Avatar', 'Tab', 'Tabs', 'Accordion', 'Alert', 'Toast',
  'Spinner', 'Skeleton', 'Divider', 'Container', 'Grid', 'Flex',
  'Form', 'Label', 'Textarea', 'Table', 'Header', 'Footer', 'Sidebar',
  'Nav', 'Navbar', 'Link', 'Text', 'Heading', 'Image', 'Icon',
  'Paw', 'Add', 'Close', 'Delete', 'Cart', 'SearchIcon',
]);

// Sanitize generated code: strip illegal imports, require() calls, and bad Lucide imports
function sanitizeImports(code) {
  const lines = code.split('\n');
  const sanitized = [];
  let stripped = 0;
  const parseLucideSpecifier = (raw) => {
    const m = raw.trim().match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
    if (!m) return null;
    return {
      imported: m[1],
      local: m[2] || m[1],
      raw: raw.trim()
    };
  };
  for (const line of lines) {
    // Strip illegal ESM imports
    const importMatch = line.match(/import\s+.*from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      const pkg = importMatch[1];
      if (!isAllowedPackage(pkg)) {
        sanitized.push(`// [STRIPPED] Illegal import removed: ${pkg}`);
        stripped++;
        console.warn(`[sanitizeImports] STRIPPED illegal import: ${pkg}`);
        continue;
      }
      // Validate lucide-react named imports — strip non-icon names
      if (pkg === 'lucide-react') {
        const namedMatch = line.match(/import\s*\{([^}]+)\}\s*from/);
        if (namedMatch) {
          const specs = namedMatch[1].split(',').map(n => n.trim()).filter(Boolean);
          const parsed = specs.map(parseLucideSpecifier);
          const validNames = [];
          const invalidSpecs = [];
          for (let i = 0; i < specs.length; i++) {
            const p = parsed[i];
            if (!p) {
              validNames.push(specs[i]);
              continue;
            }
            if (NOT_LUCIDE_ICONS.has(p.imported)) invalidSpecs.push(p);
            else validNames.push(p.raw);
          }
          const invalidNames = invalidSpecs.map((s) => s.imported);
          if (invalidNames.length > 0) {
            console.warn(`[sanitizeImports] INVALID lucide-react exports: ${invalidNames.join(', ')}`);
            stripped++;
            const fallbackAliases = invalidSpecs.map((spec) => `Sparkles as ${spec.local}`);
            const mergedSpecs = [...validNames, ...fallbackAliases];
            if (mergedSpecs.length === 0) {
              sanitized.push(`// [STRIPPED] All lucide-react imports were invalid: ${invalidNames.join(', ')}`);
            } else {
              sanitized.push(`import { ${mergedSpecs.join(', ')} } from 'lucide-react';`);
              sanitized.push(`// [sanitizeImports] Replaced invalid lucide imports (${invalidNames.join(', ')}) with Sparkles aliases to prevent runtime crashes.`);
            }
            continue;
          }
        }
      }
    }
    // Strip CommonJS require() — illegal in Vite ESM
    if (/\brequire\s*\(/.test(line) && !line.trim().startsWith('//')) {
      sanitized.push(`// [STRIPPED] require() is not allowed in Vite ESM: ${line.trim()}`);
      stripped++;
      console.warn(`[sanitizeImports] STRIPPED require(): ${line.trim()}`);
      continue;
    }
    sanitized.push(line);
  }
  if (stripped > 0) {
    console.log(`[sanitizeImports] Stripped ${stripped} illegal statement(s) from generated code`);
  }
  return sanitized.join('\n');
}

const PROTECTED_FILES = new Set([
  'vite.config.js', 'tailwind.config.js', 'postcss.config.js',
  'package.json', 'package-lock.json', 'tsconfig.json'
]);

export default async function applyAiCodeStream(req, res) {
  const startTime = Date.now();

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // We define a provider ref that will be set later
  let activeProviderRef = null;
  const sse = new SSEWriter(res, () => {
    if (activeProviderRef && typeof activeProviderRef.keepAlive === 'function') {
      activeProviderRef.keepAlive();
    }
  });
  try {
    const {
      response: generatedCode,
      isEdit = false,
      packages: requestedPackages = [],
      sandboxId,
      buildId,
      prompt = '', // Get original prompt if available
      skipPolish = false,
      isResume = false,
      premiumMode = 'hybrid'
    } = req.body;

    const buildModelId = req.body.model || 'google/gemini-3.1-pro-preview';
    /** Optional explicit paths treated as premium (copy-only polish). Defaults to `src/components/premium/` in polish-refinement. */
    const premiumPolishPathsRaw = req.body.premiumPolishPaths;
    const premiumPaths =
      Array.isArray(premiumPolishPathsRaw) && premiumPolishPathsRaw.length > 0
        ? new Set(premiumPolishPathsRaw.filter((p) => typeof p === 'string' && p.trim()))
        : undefined;

    const polishSkipPaths = new Set(
      Array.isArray(req.body.polishSkipPaths)
        ? req.body.polishSkipPaths.filter((p) => typeof p === 'string' && p.trim())
        : []
    );
    if (polishSkipPaths.size) {
      console.log('[BUILDER-VERIFY] apply: polishSkipPaths count=%d', polishSkipPaths.size);
    }

    if (premiumPaths?.size) {
      console.log('[BUILDER-VERIFY] apply: premiumPolishPaths override count=%d', premiumPaths.size);
    }

    const narrator = new AIBuildNarrator();

    log(buildId, `[apply] Start: ${generatedCode?.length || 0} bytes code, isEdit=${isEdit}`);

    // 🚧 FINAL CREDIT CHECK: Gatekeeper (Backend)
    const token = req.headers.authorization?.split(' ')[1];
    if (token && !isResume) {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (user && !authError) {
        // Attempt deduction atomically
        const { data: deductData, error: deductError } = await supabaseAdmin.rpc('deduct_credits_safe', {
          p_user_id: user.id,
          p_amount: 1,
          p_description: isEdit ? 'AI Edit / Polish' : 'AI Initial Build',
          p_project_id: buildId || null
        });

        if (deductError || !deductData || !deductData.success) {
          console.warn(`[apply] Credit deduction failed for user ${user.id}: ${deductError?.message || deductData?.error}`);
          sse.send(SSE_EVENTS.ERROR, { message: '402 Payment Required: Creative Energy Depleted. Please recharge your credits.' });
          return sse.end();
        }
        console.log(`[apply] Successfully deducted 1 credit for user ${user.id}`);
      }
    } else if (isResume) {
      console.log('[apply] Resume operation detected, skipping credit deduction.');
    } else {
      console.log('[apply] No auth token provided, skipping credit check (Guest mode/Local).');
    }

    if (!generatedCode && (!req.body.files || !Array.isArray(req.body.files) || req.body.files.length === 0)) {
      sse.send(SSE_EVENTS.ERROR, { message: 'No generated code or files provided' });
      return sse.end();
    }

    const provider = sandboxId
      ? (sandboxManager.getProvider(sandboxId) || global.activeSandboxProvider)
      : (sandboxManager.getActiveProvider() || global.activeSandboxProvider);

    if (!provider) {
      sse.send(SSE_EVENTS.ERROR, { message: 'No active sandbox. Create one first.' });
      return sse.end();
    }
    
    activeProviderRef = provider;

    // Resolve the actual sandbox ID being used
    const activeSandboxId = sandboxId || provider.getSandboxInfo()?.sandboxId;
    console.log(`[apply] Resolved activeSandboxId: ${activeSandboxId}`);

    // ═══════════════════════════════════════════════════════════
    // STAGE 1: Parse Files
    // ═══════════════════════════════════════════════════════════
    let files = [];
    if (req.body.files && Array.isArray(req.body.files)) {
      files = req.body.files.filter(f => f.path && typeof f.content === 'string');
    } else {
      files = parseFileBlocks(generatedCode);
    }

    files = files.filter(f => {
      const fileName = f.path.split('/').pop();
      return !PROTECTED_FILES.has(fileName);
    });

    // AI_STABILITY_FIX_V4: Sanitize all generated files to strip illegal imports
    files = files.map(f => ({
      ...f,
      content: sanitizeImports(f.content || '')
    }));

    const identifierFixes = validateAndFixIdentifiers(files);
    if (identifierFixes.length > 0) {
      console.log('[BUILDER-VERIFY] validate-identifiers: %d fix(es)', identifierFixes.length);
      for (const f of identifierFixes) {
        console.log('[BUILDER-VERIFY]   %s: %s → %s', f.file, f.from, f.to);
      }
    }

    sse.send(SSE_EVENTS.APPLY_STARTED, {
      buildId,
      files: files.length,
      components: files.map(f => f.path.split('/').pop().replace(/\.(jsx|tsx)$/, ''))
    });

    if (files.length === 0) {
      sse.send(SSE_EVENTS.ERROR, { message: 'No valid file blocks found in generated code' });
      return sse.end();
    }

    /*
    const applyMessage = await narrator.narrate('applying', {
      filesCount: files.length,
      isEdit
    });
    sse.aiMessage(applyMessage);
    */
    sse.send('step', { message: 'Applying files...', filesCount: files.length });

    // ═══════════════════════════════════════════════════════════
    // STAGE 2: Install Packages
    // ═══════════════════════════════════════════════════════════
    // AI_STABILITY_FIX_V4.1: Scan all files for dependencies (crucial for Project Resume)
    const detectedSet = new Set(extractPackages(generatedCode || ''));
    for (const f of files) {
      extractPackages(f.content || '').forEach(p => detectedSet.add(p));
    }
    const detectedPackages = [...detectedSet];
    const allPackages = [...new Set([...requestedPackages, ...detectedPackages])];
    const builtIn = new Set(['react', 'react-dom', 'vite', 'tailwindcss', 'postcss', 'autoprefixer', '@vitejs/plugin-react']);
    // AI_STABILITY_FIX_V4: Only install WHITELISTED packages
    const packagesToInstall = allPackages.filter(p => !builtIn.has(p) && isAllowedPackage(p));
    const blockedPackages = allPackages.filter(p => !builtIn.has(p) && !isAllowedPackage(p));
    if (blockedPackages.length > 0) {
      console.warn(`[apply] BLOCKED illegal packages: ${blockedPackages.join(', ')}`);
    }

    if (packagesToInstall.length > 0) {
      /*
      const installMessage = await narrator.narrate('installing', {
        packages: packagesToInstall
      });
      sse.aiMessage(installMessage);
      */
      sse.send('step', { message: 'Installing dependencies', packages: packagesToInstall });

      try {
        await provider.installPackagesOnly(packagesToInstall);
        sse.send(SSE_EVENTS.PROGRESS, {
          current: packagesToInstall.length,
          total: packagesToInstall.length,
          item: 'packages installed'
        });
      } catch (e) {
        console.error('[apply] Package install error:', e);
        
        // If it's a sandbox death (connection error, timeout, etc.), it's FATAL.
        const isSandboxDeath = e.message?.toLowerCase().includes('sandbox') || 
                              e.message?.toLowerCase().includes('connect') ||
                              e.message?.toLowerCase().includes('dead');
        
        if (isSandboxDeath) {
          sse.send(SSE_EVENTS.ERROR, { message: `Sandbox connection lost: ${e.message}. Please restart the builder.` });
          return sse.end();
        }
        
        sse.send(SSE_EVENTS.WARNING, { message: `Package install warning: ${e.message}` });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STAGE 3: Write Files (Optimized / Direct Write)
    // ═══════════════════════════════════════════════════════════
    const sortedFiles = files.sort((a, b) => {
      // Prioritize CSS then components then App.jsx
      if (a.path.endsWith('.css')) return -1;
      if (b.path.endsWith('.css')) return 1;
      if (a.path.includes('App.jsx')) return 1;
      if (b.path.includes('App.jsx')) return -1;
      return 0;
    });

    const filesCreated = [];

    // Write files directly without complex locking/atomic rename logic
    for (let i = 0; i < sortedFiles.length; i++) {
      const file = sortedFiles[i];
      try {
        await provider.writeFile(file.path, file.content);

        filesCreated.push(file.path);

        sse.send(SSE_EVENTS.FILE_WRITTEN, {
          path: file.path,
          size: file.content.length
        });

        /*
        if (i % 3 === 0 || i === sortedFiles.length - 1) {
          const componentName = file.path.split('/').pop().replace(/\.(jsx|tsx)$/, '');
          const buildMessage = await narrator.narrate('building', {
            componentName,
            current: i + 1,
            total: sortedFiles.length
          });
          sse.aiMessage(buildMessage, { component: componentName }, 'casual');
        }
        */
        const componentName = file.path.split('/').pop().replace(/\.(jsx|tsx)$/, '');
        sse.send('step', { message: `Building ${componentName}...`, component: componentName });

        updateManifest(buildId, { applied: [file.path] });
        if (global.sandboxState?.fileCache) {
          global.sandboxState.fileCache.files[file.path] = { content: file.content, lastModified: Date.now() };
        }
      } catch (e) {
        console.error(`[apply] Failed to write ${file.path}:`, e);
        sse.send(SSE_EVENTS.WARNING, { message: `Failed to write ${file.path}: ${e.message}` });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STAGE 4: Verify Build
    // ═══════════════════════════════════════════════════════════
    sse.send(SSE_EVENTS.VERIFY_STARTED, { cmd: 'npx vite build' });
    sse.aiThinking('verifying');

    let buildPassed = false;
    let buildLogs = '';
    const verifyStartTime = Date.now();

    if (activeSandboxId) {
      const verifyRes = await verifySandboxBuild(activeSandboxId);
      buildPassed = verifyRes.success;
      buildLogs = verifyRes.logs;
      const durationMs = Date.now() - verifyStartTime;

      if (buildPassed) {
        sse.send(SSE_EVENTS.VERIFY_PASSED, { durationMs });
      } else {
        // ═══════════════════════════════════════════════════════════
        // STAGE 5: Auto-Repair
        // ═══════════════════════════════════════════════════════════
        console.log('[apply] Build failed. Attempting auto-repair...');

        // ── SAFETY CHECK: Skip auto-repair for sandbox permission errors ──
        // EACCES/permission errors are sandbox infrastructure issues, NOT code bugs.
        const isPermissionError = buildLogs && (
          buildLogs.includes('EACCES') ||
          buildLogs.includes('permission denied') ||
          buildLogs.includes('EPERM')
        );

        if (isPermissionError) {
          console.warn('[apply] Build failed due to sandbox permission error (EACCES). Skipping auto-repair — code is likely fine.');
          sse.send(SSE_EVENTS.VERIFY_FAILED, {
            excerpt: 'Build verification failed due to sandbox permissions, not code errors. Your code should work fine.',
            logs: buildLogs
          });
        } else {
          // Proceed with auto-repair infinity loop (max 5 attempts)
          const MAX_REPAIR_ATTEMPTS = 5;
          let repairAttempts = 0;
          let repairLog = [];

          while (!buildPassed && repairAttempts < MAX_REPAIR_ATTEMPTS) {
            repairAttempts++;
            console.log(`[apply] Auto-repair attempt ${repairAttempts}/${MAX_REPAIR_ATTEMPTS}...`);

            const failMessage = await narrator.narrate('verifying', {
              passed: false,
              excerpt: buildLogs?.substring(0, 200)
            }, { buildModelId });
            sse.aiMessage(failMessage, {}, 'concerned');

            try {
              // ── CRITICAL FIX: Merge ALL existing sandbox files into repair context ──
              let repairFiles = [...sortedFiles];

              if (activeSandboxId) {
                try {
                  const repairProvider = sandboxManager.getProvider(activeSandboxId) || global.activeSandboxProvider;
                  if (repairProvider) {
                    const allSandboxFiles = await repairProvider.listFiles('/home/user/app');
                    const srcFiles = allSandboxFiles.filter(f => {
                      const ext = f.split('.').pop();
                      return ['jsx', 'js', 'tsx', 'ts', 'css'].includes(ext) && f.startsWith('src/');
                    });

                    // Add any sandbox file NOT already in sortedFiles
                    const existingPaths = new Set(sortedFiles.map(f => f.path));
                    for (const filePath of srcFiles) {
                      if (!existingPaths.has(filePath)) {
                        try {
                          const content = await repairProvider.readFile(filePath);
                          if (content) {
                            repairFiles.push({ path: filePath, content });
                          }
                        } catch (_) { /* skip unreadable */ }
                      }
                    }
                    console.log(`[auto-repair] Merged ${repairFiles.length} total files for repair context`);
                  }
                } catch (e) {
                  console.warn('[auto-repair] Could not fetch sandbox files for repair context:', e.message);
                }
              }

              const repairRes = await attemptRepair({
                files: repairFiles,
                buildErrors: buildLogs,
                repairLog: repairLog,
                buildModel: buildModelId
              });

              if (repairRes.success) {
                repairLog.push({ strategy: repairRes.strategy, fixedFiles: repairRes.fixedFiles.map(f => f.path) });
                updateManifest(buildId, { repairLog });

                sse.send(SSE_EVENTS.REPAIR_STARTED, {
                  strategy: repairRes.strategy,
                  files: repairRes.fixedFiles.map(f => f.path),
                  attempt: repairAttempts,
                  maxAttempts: MAX_REPAIR_ATTEMPTS
                });

                const repairMessage = await narrator.narrate('repairing', {
                  strategy: repairRes.strategy,
                  filesFixed: repairRes.fixedFiles.length,
                  attempt: repairAttempts,
                  maxAttempts: MAX_REPAIR_ATTEMPTS
                }, { buildModelId });
                sse.aiMessage(repairMessage);

                // Apply fixes directly
                for (const file of repairRes.fixedFiles) {
                  await provider.writeFile(file.path, file.content);

                  // Keep our local copy updated for subsequent repair attempts
                  const existingIdx = sortedFiles.findIndex(f => f.path === file.path);
                  if (existingIdx !== -1) {
                    sortedFiles[existingIdx].content = file.content;
                  } else {
                    sortedFiles.push({ path: file.path, content: file.content });
                  }
                }

                const verifyRes2 = await verifySandboxBuild(activeSandboxId);

                if (verifyRes2.success) {
                  buildPassed = true;
                  buildLogs = verifyRes2.logs;
                  sse.send(SSE_EVENTS.VERIFY_PASSED, { durationMs: Date.now() - verifyStartTime });
                  sse.send(SSE_EVENTS.REPAIR_DONE, { changed: repairRes.fixedFiles.map(f => f.path) });

                  const successMessage = await narrator.narrate('repair_success', {}, { buildModelId });
                  sse.aiMessage(successMessage, {}, 'excited');
                  break; // Exit the loop, repair was successful!
                } else {
                  console.log(`[apply] Repair attempt ${repairAttempts} failed. Preparing for next attempt...`);
                  buildLogs = verifyRes2.logs;
                  updateManifest(buildId, { buildErrors: verifyRes2.logs });
                }
              } else {
                console.log(`[apply] Auto-repair engine could not formulate a fix on attempt ${repairAttempts}.`);
                repairLog.push({ strategy: 'Failed to formulate fix', error: repairRes.strategy });
                break; // Break loop if engine gives up
              }
            } catch (repairErr) {
              console.error('[apply] Repair error:', repairErr);
              repairLog.push({ strategy: 'Repair threw exception', error: repairErr.message });
              break; // Break loop on critical exception
            }
          }

          if (!buildPassed) {
            console.error(`[apply] Build failed after ${repairAttempts} overall repair attempt(s). Triggering fallback UX.`);
            sse.send(SSE_EVENTS.VERIFY_FAILED, {
              excerpt: buildLogs?.substring(0, 500),
              logs: buildLogs,
              attempts: repairAttempts
            });
            sse.aiMessage(`I tried ${repairAttempts} times but couldn't resolve all the build errors automatically. Check the logs and we can try a different approach.`, {}, 'error');
          }
        }
      }
    }

    // ── Visual sanity check (Phase 6): build can pass while the preview is blank ──
    if (buildPassed && activeSandboxId) {
      try {
        const visProvider = sandboxManager.getProvider(activeSandboxId) || global.activeSandboxProvider;
        const previewUrl = visProvider?.getSandboxUrl?.() || null;
        if (previewUrl) {
          const { captureForVerification } = await import('../lib/screenshot.js');
          const visual = await captureForVerification(previewUrl);
          if (visual.skipped) {
            console.log('[BUILDER-VERIFY] visual verify skipped:', visual.reason || 'unknown');
          } else if (visual.hasContent === false) {
            console.warn('[apply] Visual check: page looks blank or near-empty.', {
              scrollHeight: visual.scrollHeight,
              textLen: visual.textLen,
              bodyChildCount: visual.bodyChildCount
            });
            console.log(
              '[BUILDER-VERIFY] visual verify hasContent=false scrollHeight=%s textLen=%s media=%s',
              visual.scrollHeight,
              visual.textLen,
              visual.mediaCount
            );
            sse.send(SSE_EVENTS.WARNING, {
              message:
                'Build succeeded, but the live preview may show little or no content. Check App.jsx and the component tree if the screen looks empty.'
            });
          } else {
            console.log(
              '[BUILDER-VERIFY] visual verify ok scrollHeight=%s textLen=%s media=%s',
              visual.scrollHeight,
              visual.textLen,
              visual.mediaCount
            );
          }
        }
      } catch (visErr) {
        console.warn('[apply] Visual verification error (non-fatal):', visErr.message);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STAGE 6: Final Polish (Hidden Refinement)
    // ═══════════════════════════════════════════════════════════
    const shouldRunAsyncPolish = !skipPolish && (!isEdit || premiumMode === 'hybrid' || premiumMode === 'strict');
    if (shouldRunAsyncPolish) {
      console.log('[apply] Starting Final Polish pass...');
      sse.send(SSE_EVENTS.POLISH_STARTED);
      const polishMessage = await narrator.narrate('polishing', { prompt }, { buildModelId });
      sse.aiMessage(polishMessage);

      try {
        const polishProvider = sandboxManager.getProvider(activeSandboxId) || global.activeSandboxProvider;
        let filesToPolish = [...files];
        let fileTree = [];

        if (polishProvider) {
          const allFiles = await polishProvider.listFiles('/home/user/app');
          fileTree = allFiles;
          const currentFiles = [];
          for (const filePath of allFiles) {
            if (filePath.startsWith('src/') && ['jsx', 'js', 'css'].some(ext => filePath.endsWith(ext))) {
              const content = await polishProvider.readFile(filePath);
              currentFiles.push({ path: filePath, content });
            }
          }
          if (currentFiles.length > 0) filesToPolish = currentFiles;
        }

        const modelId = buildModelId;

        const fileContextForSpec = filesToPolish
          .map((f) => `--- FILE: ${f.path} ---\n${f.content}`)
          .join('\n\n');
        let cachedDesignSpec;
        try {
          cachedDesignSpec = await generateDesignSpec(prompt, fileContextForSpec, resolveDesignSpecModelId(modelId));
          console.log('[BUILDER-VERIFY] apply: designSpec pre-cached for polish (repair pass reuses)');
        } catch (e) {
          console.warn('[apply] design spec pre-cache failed:', e.message);
          cachedDesignSpec = undefined;
        }

        const runAndApplyPolish = async (targetFiles, errors = '') => {
          const result = await runPolishStep(targetFiles, prompt, errors, {
            model: modelId,
            fileTree,
            isEdit,
            sandboxId: activeSandboxId,
            premiumPaths,
            designSpec: cachedDesignSpec,
            skipPaths: polishSkipPaths
          });

          if (!result) {
            console.warn('[apply] Polish skipped due to provider overload/error. Keeping existing files.');
            return null;
          }

          if (result.length > 0) {
            console.log(`[apply] Writing ${result.length} polished files...`);
            for (const file of result) {
              await provider.writeFile(file.path, file.content);
              if (global.sandboxState?.fileCache) {
                global.sandboxState.fileCache.files[file.path] = { content: file.content, lastModified: Date.now() };
              }
            }
          } else {
            console.log('[apply] Polish produced no file changes.');
          }
          return result;
        };

        // Keep pre-polish snapshot for safe rollback if polish introduces hard failures.
        const prePolishSnapshot = new Map(filesToPolish.map((f) => [f.path, f.content]));

        // Pass 1: Polish — run alongside filler messages
        const polishCancelToken = { cancelled: false };

        // Fire filler messages async and in parallel — completely independent
        // from the heavy LLM call in runAndApplyPolish. Uses the mini/flash
        // variant of the user's chosen model for speed.
        const fillerPromise = runPolishFillers({
            model: modelId,
            prompt,
            onMessage: (msg) => sse.aiMessage(msg, {}, 'casual'),
            cancelToken: polishCancelToken,
        }).catch(e => {
            // Filler errors are non-fatal — swallow silently
            console.warn('[PolishFiller] Filler loop error (non-fatal):', e.message);
        });

        let polishedFiles;
        try {
            polishedFiles = await runAndApplyPolish(filesToPolish, buildPassed ? '' : buildLogs);
        } finally {
            // Always stop the filler once the polish LLM responds (success or error)
            polishCancelToken.cancelled = true;
        }

        // Filler is now cancelled — let it drain without awaiting it
        // (it checks cancelToken before each message so no stray messages can fire)

        // --- POLISH VERIFICATION LOOP ---
        console.log('[apply] Verifying polish integrity...');
        const polishVerify = await verifySandboxBuild(activeSandboxId);

        if (!polishVerify.success) {
          console.warn('[apply] Polish introduced errors, attempting ONE repair pass...');
          sse.send(SSE_EVENTS.WARNING, { message: 'Final polish needed a small adjustment' });

          // Pass 2: Surgical Repair
          await runAndApplyPolish(polishedFiles?.length ? polishedFiles : filesToPolish, polishVerify.logs);

          const finalVerify = await verifySandboxBuild(activeSandboxId);
          if (finalVerify.success) {
            console.log('[apply] Polish repair successful.');
            buildPassed = true;
          } else {
            console.error('[apply] Polish repair failed. Reverting to pre-polish snapshot.');
            console.log('[BUILDER-VERIFY] apply: polish rollback — pre-polish snapshot restored (copy/polish attempts dropped)');
            sse.send(SSE_EVENTS.WARNING, { message: 'Polish could not be verified and was reverted to keep build stable.' });

            for (const [path, content] of prePolishSnapshot.entries()) {
              await provider.writeFile(path, content);
              if (global.sandboxState?.fileCache) {
                global.sandboxState.fileCache.files[path] = { content, lastModified: Date.now() };
              }
            }

            const rollbackVerify = await verifySandboxBuild(activeSandboxId);
            buildPassed = rollbackVerify.success;
            if (!rollbackVerify.success) {
              console.error('[apply] Build still failing after pre-polish rollback.');
            } else {
              console.log('[apply] Pre-polish rollback restored a clean build.');
            }
          }
        } else {
          console.log('[apply] Polish pass verified clean.');
          buildPassed = true;
        }

        const polishedPathsTouched = new Set();
        if (polishedFiles) {
          for (const f of polishedFiles) {
            const prev = prePolishSnapshot.get(f.path);
            if (prev !== undefined && prev !== f.content) polishedPathsTouched.add(f.path);
          }
        }

        // --- Mini Polish: single fast-model reliability pass (routes, nav, UX sanity) ---
        if (buildPassed) {
          try {
            const miniProvider = sandboxManager.getProvider(activeSandboxId) || global.activeSandboxProvider;
            let filesForMini = [];
            let miniFileTree = fileTree;
            const isMiniPremiumPath = (path) =>
              path.startsWith(PREMIUM_PATH_PREFIX) || Boolean(premiumPaths?.has(path));
            if (miniProvider) {
              const allMini = await miniProvider.listFiles('/home/user/app');
              miniFileTree = allMini;
              for (const fp of allMini) {
                if (
                  fp.startsWith('src/') &&
                  ['jsx', 'js', 'css'].some((ext) => fp.endsWith(ext)) &&
                  !isMiniPremiumPath(fp)
                ) {
                  filesForMini.push({ path: fp, content: await miniProvider.readFile(fp) });
                }
              }
            } else {
              filesForMini = filesToPolish.filter((f) => !isMiniPremiumPath(f.path));
            }

            if (polishedPathsTouched.size > 0) {
              const before = filesForMini.length;
              filesForMini = filesForMini.filter((f) => polishedPathsTouched.has(f.path));
              console.log(
                '[BUILDER-VERIFY] mini-polish: narrowed %d → %d file(s) (only paths changed by main polish)',
                before,
                filesForMini.length
              );
            }

            console.log(
              '[BUILDER-VERIFY] mini-polish: candidateFiles=%d (premium prefix %s + overridePaths=%d excluded)',
              filesForMini.length,
              PREMIUM_PATH_PREFIX,
              premiumPaths?.size || 0
            );

            if (filesForMini.length > 0) {
              sse.aiMessage('Mini polishing...', {}, 'casual');
              const miniResult = await runMiniPolishStep(filesForMini, prompt, {
                model: modelId,
                fileTree: miniFileTree,
                sandboxId: activeSandboxId
              });

              if (miniResult && miniResult.length > 0) {
                const preMini = new Map(
                  miniResult.map((f) => [f.path, filesForMini.find((x) => x.path === f.path)?.content])
                );
                for (const file of miniResult) {
                  await provider.writeFile(file.path, file.content);
                  if (global.sandboxState?.fileCache) {
                    global.sandboxState.fileCache.files[file.path] = {
                      content: file.content,
                      lastModified: Date.now()
                    };
                  }
                }
                const miniVerify = await verifySandboxBuild(activeSandboxId);
                if (!miniVerify.success) {
                  console.warn('[apply] Mini polish broke build; reverting mini-polish files.');
                  sse.send(SSE_EVENTS.WARNING, { message: 'Quick quality pass was reverted to keep the preview working.' });
                  for (const file of miniResult) {
                    const prev = preMini.get(file.path);
                    if (prev !== undefined) {
                      await provider.writeFile(file.path, prev);
                      if (global.sandboxState?.fileCache) {
                        global.sandboxState.fileCache.files[file.path] = {
                          content: prev,
                          lastModified: Date.now()
                        };
                      }
                    }
                  }
                  const reVerify = await verifySandboxBuild(activeSandboxId);
                  buildPassed = reVerify.success;
                  if (!reVerify.success) {
                    console.error('[apply] Build still failing after mini-polish revert.');
                  }
                } else {
                  console.log('[apply] Mini polish applied and verified.');
                }
              }
            }
          } catch (miniErr) {
            console.warn('[apply] Mini polish error (non-fatal):', miniErr.message);
          }
        } else {
          console.log('[apply] Skipping Mini Polish (build not green after polish).');
        }

        sse.send(SSE_EVENTS.POLISH_DONE);
        const polishSuccessMsg = await narrator.narrate('polish_success', {}, { buildModelId });
        sse.aiMessage(polishSuccessMsg);
      } catch (polishErr) {
        console.error('[apply] Polish error:', polishErr);
      }
    } else {
      console.log(`[apply] Skipping Final Polish (isEdit=${isEdit}, skipPolish=${skipPolish}, premiumMode=${premiumMode})`);
    }

    // ═══════════════════════════════════════════════════════════
    // STAGE 7: Restart Vite
    // ═══════════════════════════════════════════════════════════
    console.log('[apply-ai-code-stream] Restarting Vite...');
    try {
      await provider.restartViteServer();
    } catch (e) {
      console.error('[apply-ai-code-stream] Vite restart error:', e.message);
      sse.send(SSE_EVENTS.WARNING, { message: 'Preview server restart had issues' });
    }

    // ═══════════════════════════════════════════════════════════
    // STAGE 8: Complete
    // ═══════════════════════════════════════════════════════════
    const totalDuration = Date.now() - startTime;

    sse.send(SSE_EVENTS.COMPLETE, {
      filesCreated,
      verified: buildPassed,
      durationMs: totalDuration
    });

    // Final AI message
    const completeMessage = await narrator.narrate('complete', {
      filesCreated: filesCreated.length,
      verified: buildPassed,
      components: files.map(f => f.path.split('/').pop().replace(/\.(jsx|tsx)$/, ''))
    }, { buildModelId });
    sse.aiMessage(completeMessage, { filesCreated, verified: buildPassed }, 'excited');

    log(buildId, `[apply] Complete. Files: ${filesCreated.length}, Verified: ${buildPassed}, Duration: ${totalDuration}ms`);

    sse.end();
  } catch (error) {
    console.error('[apply-ai-code-stream] FATAL Error:', error.message);
    try {
      sse.send(SSE_EVENTS.ERROR, { message: error.message });
      sse.end();
    } catch (e) {
      console.error('[apply-ai-code-stream] Could not send error to client');
    }
  }
}
