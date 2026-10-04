import puppeteer from 'puppeteer';
import { supabaseAdmin } from './supabase-admin.js';

const CHROMIUM_NO_SANDBOX = process.env.CHROMIUM_NO_SANDBOX === 'true';
const chromiumArgs = CHROMIUM_NO_SANDBOX
    ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    : ['--disable-dev-shm-usage'];

export async function captureAndUploadScreenshot(url, projectId) {
    if (!supabaseAdmin || !url || !projectId) return null;
    let browser = null;
    try {
        console.log(`\n[Screenshot Agent] 📸 STARTING JOB for Project: ${projectId}`);
        console.log(`[Screenshot Agent] ⏳ Sandboxing URL: ${url}`);

        // This runs after a build/turn has completed, so the Vite server is
        // already warm — no need for a long pre-launch wait.
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log(`[Screenshot Agent] 🌐 Launching Headless Chromium...`);
        browser = await puppeteer.launch({
            headless: true,
            args: chromiumArgs,
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });
        
        console.log(`[Screenshot Agent] 🚀 Navigating to ${url}...`);
        // domcontentloaded + short settle: networkidle2 stalled on Vite's HMR socket.
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => {
            console.warn(`[Screenshot Agent] ⚠️ Navigation warning (may still work): ${e.message}`);
        });
        
        // Allow initial React render, fonts, and lazy images to settle.
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        console.log(`[Screenshot Agent] 📸 SNAP! Capturing JPEG buffer...`);
        const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 90 });
        
        const filename = `${projectId}_${Date.now()}.jpg`;
        console.log(`[Screenshot Agent] 💾 Uploading to Supabase bucket 'project-thumbnails' as ${filename}...`);
        const { data, error } = await supabaseAdmin.storage
            .from('project-thumbnails')
            .upload(filename, screenshotBuffer, { contentType: 'image/jpeg', upsert: true });
            
        if (error) {
            console.warn('[Screenshot Agent] ⚠️ First upload attempt failed. Trying to ensure bucket exists...', error.message);
            // Attempt to create bucket if it does not exist (we ignore errors here if it already exists)
            await supabaseAdmin.storage.createBucket('project-thumbnails', { public: true }).catch(() => {});
            
            console.log(`[Screenshot Agent] 💾 Retrying upload...`);
            const retry = await supabaseAdmin.storage
                .from('project-thumbnails')
                .upload(filename, screenshotBuffer, { contentType: 'image/jpeg', upsert: true });
            if (retry.error) throw retry.error;
        }

        const { data: publicUrlData } = supabaseAdmin.storage.from('project-thumbnails').getPublicUrl(filename);
        
        console.log(`[Screenshot Agent] 🎉 SUCCESSFULLY GENERATED & SAVED THUMBNAIL!`);
        console.log(`[Screenshot Agent] 🔗 URL: ${publicUrlData.publicUrl}\n`);
        return publicUrlData.publicUrl;
    } catch (err) {
        console.error('\n[Screenshot Agent] ❌ CATASTROPHIC ERROR generating screenshot:', err.message);
        console.error(err);
        return null; // silently fail and return null
    } finally {
        if (browser) {
            console.log(`[Screenshot Agent] 🧹 Closing headless Chromium instance.\n`);
            await browser.close().catch(() => {});
        }
    }
}

/**
 * Capture viewport screenshots of the rendered sandbox for the agent's visual
 * self-review pass. Returns base64 JPEGs sized for model consumption — one per
 * requested viewport. Non-fatal: returns [] on any failure.
 *
 * @param {string} sandboxUrl - public preview URL
 * @param {object} options
 * @param {Array<{label: string, width: number, height: number}>} options.viewports
 * @returns {Promise<Array<{label: string, base64: string, mimeType: string, width: number, height: number}>>}
 */
export async function captureViewportScreenshots(sandboxUrl, options = {}) {
    const {
        viewports = [{ label: 'desktop', width: 1280, height: 800 }],
        quality = 60,
        renderWaitMs = 2500,
        navigationTimeoutMs = 45000
    } = options;

    if (!sandboxUrl || typeof sandboxUrl !== 'string') return [];

    let browser = null;
    const shots = [];
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: chromiumArgs
        });
        const page = await browser.newPage();

        for (const viewport of viewports) {
            try {
                await page.setViewport({ width: viewport.width, height: viewport.height });
                await page.goto(sandboxUrl, { waitUntil: 'networkidle2', timeout: navigationTimeoutMs }).catch((e) => {
                    console.warn(`[visual-judge] Navigation warning (${viewport.label}): ${e.message}`);
                });
                await new Promise((r) => setTimeout(r, renderWaitMs));

                const buffer = await page.screenshot({ type: 'jpeg', quality });
                shots.push({
                    label: viewport.label,
                    base64: Buffer.from(buffer).toString('base64'),
                    mimeType: 'image/jpeg',
                    width: viewport.width,
                    height: viewport.height
                });
            } catch (viewportErr) {
                console.warn(`[visual-judge] Capture failed for ${viewport.label}:`, viewportErr.message);
            }
        }
        return shots;
    } catch (err) {
        console.warn('[visual-judge] captureViewportScreenshots failed (non-fatal):', err.message);
        return shots;
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

/**
 * Lightweight DOM check after `vite build` passes — catches blank/near-empty renders.
 * Does not upload; returns capped browser console context for the agent.
 * @returns {Promise<{ hasContent: boolean, scrollHeight: number, textLen: number, bodyChildCount: number, mediaCount: number, browserConsole?: object, skipped?: boolean, reason?: string }>}
 */
export async function captureForVerification(sandboxUrl, options = {}) {
    const {
        maxConsoleLines = 200,
        maxConsoleChars = 12000,
        // Tuned for speed: the dev server has already compiled by now, so a short
        // settle is enough. networkidle2 used to stall ~45s on Vite's HMR socket.
        renderWaitMs = 1500,
        navigationTimeoutMs = 20000,
        // Capture screenshots in the SAME browser pass so the visual judge does
        // not need a second Chromium launch + navigation.
        captureScreenshot = false,
        captureMobile = false,
        screenshotQuality = 60
    } = options;
    if (!sandboxUrl || typeof sandboxUrl !== 'string') {
        return { skipped: true, reason: 'no_url', hasContent: null };
    }

    let browser = null;
    const consoleEntries = [];
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: chromiumArgs
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        page.on('console', (message) => {
            const location = typeof message.location === 'function'
                ? message.location()
                : message.location;
            pushConsoleEntry(consoleEntries, {
                source: 'console',
                level: normalizeConsoleLevel(message.type()),
                text: message.text(),
                location: formatConsoleLocation(location)
            });
        });

        page.on('pageerror', (error) => {
            pushConsoleEntry(consoleEntries, {
                source: 'pageerror',
                level: 'error',
                text: error?.stack || error?.message || String(error)
            });
        });

        page.on('requestfailed', (request) => {
            const resourceType = request.resourceType();
            // Only the HTML document and JS modules are fatal — if those fail
            // the app can't run. A missing stylesheet/image/font degrades looks
            // but the page still works, so it's a warning, not a build failure.
            const fatal = ['document', 'script'].includes(resourceType);
            if (!['document', 'script', 'stylesheet', 'image', 'font', 'media'].includes(resourceType)) return;
            pushConsoleEntry(consoleEntries, {
                source: fatal ? 'requestfailed' : 'asset',
                level: fatal ? 'error' : 'warn',
                text: `${request.method()} ${request.url()} failed: ${request.failure()?.errorText || 'unknown network error'}`
            });
        });

        // domcontentloaded (not networkidle2): the Vite dev server keeps an open
        // HMR websocket, so the network never goes idle and networkidle2 burned
        // the full timeout on every check.
        await page.goto(sandboxUrl, { waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs }).catch((e) => {
            console.warn(`[visual-verify] Navigation warning: ${e.message}`);
            pushConsoleEntry(consoleEntries, {
                source: 'navigation',
                level: 'error',
                text: e.message
            });
        });
        await new Promise((r) => setTimeout(r, renderWaitMs));

        const metrics = await page.evaluate(() => {
            const body = document.body;
            const scrollHeight = Math.max(
                document.documentElement?.scrollHeight || 0,
                body?.scrollHeight || 0
            );
            const textLen = (body?.innerText || '').replace(/\s+/g, ' ').trim().length;
            const mediaCount = document.querySelectorAll('img, canvas, svg, video').length;
            const bodyChildCount = body ? body.children.length : 0;
            const hasContent = scrollHeight > 80 && (textLen > 5 || mediaCount > 0);

            // Vite renders a compile-error overlay as <vite-error-overlay> with a
            // shadow root. Detecting it lets us treat compile errors as build
            // failures without running a slow production build.
            let viteOverlay = null;
            const overlayEl = document.querySelector('vite-error-overlay');
            if (overlayEl) {
                const root = overlayEl.shadowRoot || overlayEl;
                const message = root.querySelector?.('.message-body, .message')?.textContent
                    || root.textContent
                    || 'Vite compile error';
                const file = root.querySelector?.('.file')?.textContent || '';
                viteOverlay = `${message}`.replace(/\s+/g, ' ').trim().slice(0, 1500) + (file ? ` (${file.trim()})` : '');
            }
            return { scrollHeight, textLen, mediaCount, bodyChildCount, hasContent, viteOverlay };
        });

        if (metrics.viteOverlay) {
            pushConsoleEntry(consoleEntries, {
                source: 'vite_overlay',
                level: 'error',
                text: `Vite compile error: ${metrics.viteOverlay}`
            });
        }

        let screenshot = null;
        let screenshotMobile = null;
        if (captureScreenshot) {
            try {
                const buffer = await page.screenshot({ type: 'jpeg', quality: screenshotQuality });
                screenshot = { label: 'desktop', base64: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
            } catch (shotErr) {
                console.warn('[visual-verify] Desktop screenshot failed:', shotErr.message);
            }
            if (captureMobile) {
                try {
                    await page.setViewport({ width: 390, height: 844 });
                    await new Promise((r) => setTimeout(r, 600));
                    const mobileBuffer = await page.screenshot({ type: 'jpeg', quality: screenshotQuality });
                    screenshotMobile = { label: 'mobile', base64: Buffer.from(mobileBuffer).toString('base64'), mimeType: 'image/jpeg' };
                } catch (shotErr) {
                    console.warn('[visual-verify] Mobile screenshot failed:', shotErr.message);
                }
            }
        }

        return {
            hasContent: metrics.hasContent,
            scrollHeight: metrics.scrollHeight,
            textLen: metrics.textLen,
            bodyChildCount: metrics.bodyChildCount,
            mediaCount: metrics.mediaCount,
            viteOverlay: metrics.viteOverlay || null,
            screenshots: [screenshot, screenshotMobile].filter(Boolean),
            browserConsole: compactConsoleEntries(consoleEntries, {
                maxLines: maxConsoleLines,
                maxChars: maxConsoleChars
            })
        };
    } catch (err) {
        console.warn('[visual-verify] captureForVerification failed (non-fatal):', err.message);
        return { skipped: true, reason: err.message, hasContent: null };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

function normalizeConsoleLevel(type = '') {
    const normalized = String(type || '').toLowerCase();
    if (normalized === 'warning') return 'warn';
    if (['error', 'warn', 'info', 'debug'].includes(normalized)) return normalized;
    return 'log';
}

function formatConsoleLocation(location = {}) {
    const url = location.url ? String(location.url) : '';
    const line = Number.isFinite(location.lineNumber) ? location.lineNumber : null;
    const column = Number.isFinite(location.columnNumber) ? location.columnNumber : null;
    if (!url && line === null) return null;
    return [url, line !== null ? line : null, column !== null ? column : null]
        .filter((part) => part !== null && part !== '')
        .join(':') || null;
}

function pushConsoleEntry(entries, entry) {
    const text = String(entry.text || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    entries.push({
        source: entry.source || 'console',
        level: normalizeConsoleLevel(entry.level),
        text: text.length > 1200 ? `${text.slice(0, 1185)}...[truncated]` : text,
        ...(entry.location ? { location: entry.location } : {})
    });
}

// Console-channel errors that are NOT real code failures: 404s for assets,
// network blips, devtools nags, favicon misses, HMR chatter. These should not
// block build verification — the app still runs.
const BENIGN_CONSOLE_ERROR = /(failed to load resource|net::err_|err_(name_not_resolved|connection|aborted)|the server responded with a status of\s*[45]\d\d|favicon|download the react devtools|googleapis\.com|gstatic\.com|fonts?\.|\.(png|jpe?g|gif|webp|svg|woff2?|ttf|otf|mp4|webm|ico)(\?|$)|x-frame-options|content security policy|preload|manifest)/i;

function isBenignConsoleError(entry) {
    if (entry.source === 'asset') return true;
    if (entry.source !== 'console') return false; // pageerror / navigation / vite_overlay are always fatal
    return BENIGN_CONSOLE_ERROR.test(entry.text || '');
}

export function compactConsoleEntries(entries, { maxLines = 200, maxChars = 12000 } = {}) {
    const counts = entries.reduce((acc, entry) => {
        acc.total += 1;
        const benign = entry.level === 'error' && isBenignConsoleError(entry);
        if (entry.level === 'error' && !benign) acc.errors += 1;
        if (entry.level === 'error' && benign) acc.assetErrors += 1;
        if (entry.level === 'warn') acc.warnings += 1;
        if (entry.source === 'pageerror') acc.pageErrors += 1;
        if (entry.source === 'requestfailed') acc.requestFailures += 1; // only fatal doc/script failures use this source
        return acc;
    }, { total: 0, errors: 0, assetErrors: 0, warnings: 0, pageErrors: 0, requestFailures: 0 });

    const important = entries.filter((entry) => (
        entry.level === 'error' ||
        entry.level === 'warn' ||
        entry.source === 'pageerror' ||
        entry.source === 'requestfailed'
    ));
    const fallback = important.length > 0 ? important : entries;
    const selected = [];
    let chars = 0;

    for (const entry of fallback.slice(-Math.max(1, maxLines))) {
        const serializedLength = JSON.stringify(entry).length;
        if (selected.length > 0 && chars + serializedLength > maxChars) break;
        selected.push(entry);
        chars += serializedLength;
    }

    return {
        total: counts.total,
        // errorCount counts ONLY fatal code errors now; asset 404s are reported
        // separately and do not gate the build.
        errorCount: counts.errors,
        assetErrorCount: counts.assetErrors,
        warningCount: counts.warnings,
        pageErrorCount: counts.pageErrors,
        requestFailureCount: counts.requestFailures,
        returnedLines: selected.length,
        truncated: fallback.length > selected.length || counts.total > fallback.length,
        maxLines,
        entries: selected,
        guidance: selected.length > 0
            ? 'Fatal errors (errorCount, pageErrorCount, requestFailureCount) block the build; assetErrorCount (missing images/fonts/etc.) are warnings you may optionally fix.'
            : 'No browser console warnings or errors were captured during verification.'
    };
}
