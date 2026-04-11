import puppeteer from 'puppeteer';
import { supabaseAdmin } from './supabase-admin.js';

export async function captureAndUploadScreenshot(url, projectId) {
    if (!supabaseAdmin || !url || !projectId) return null;
    let browser = null;
    try {
        console.log(`\n[Screenshot Agent] 📸 STARTING JOB for Project: ${projectId}`);
        console.log(`[Screenshot Agent] ⏳ Sandboxing URL: ${url}`);
        console.log(`[Screenshot Agent] ⏳ Waiting 8s for Vite server to boot up safely...`);
        
        // Wait 8 full seconds before even launching browser to ensure Vite server in the newly created E2B sandbox is fully running
        await new Promise(resolve => setTimeout(resolve, 8000));

        console.log(`[Screenshot Agent] 🌐 8s elapsed. Launching Headless Chromium...`);
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });
        
        console.log(`[Screenshot Agent] 🚀 Navigating to ${url}...`);
        // Go to the website and wait for the network to be mostly idle.
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => {
            console.warn(`[Screenshot Agent] ⚠️ Navigation warning (may still work): ${e.message}`);
        });
        
        console.log(`[Screenshot Agent] ⌛ Page loaded. Waiting 4s for React rendering & animations to finish...`);
        // Wait an additional 4 seconds to allow initial React rendering, animations, and heavy fonts/lazy images to appear
        await new Promise(resolve => setTimeout(resolve, 4000));
        
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
 * Lightweight DOM check after `vite build` passes — catches blank/near-empty renders.
 * Does not upload; optional base64 for future VLM use.
 * @returns {Promise<{ hasContent: boolean, scrollHeight: number, textLen: number, bodyChildCount: number, mediaCount: number, screenshotBase64?: string, skipped?: boolean, reason?: string }>}
 */
export async function captureForVerification(sandboxUrl, options = {}) {
    const { captureImage = false } = options;
    if (!sandboxUrl || typeof sandboxUrl !== 'string') {
        return { skipped: true, reason: 'no_url', hasContent: null };
    }

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });

        await page.goto(sandboxUrl, { waitUntil: 'networkidle2', timeout: 45000 }).catch((e) => {
            console.warn(`[visual-verify] Navigation warning: ${e.message}`);
        });
        await new Promise((r) => setTimeout(r, 2500));

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
            return { scrollHeight, textLen, mediaCount, bodyChildCount, hasContent };
        });

        let screenshotBase64;
        if (captureImage) {
            const buf = await page.screenshot({ type: 'jpeg', quality: 85 });
            screenshotBase64 = Buffer.from(buf).toString('base64');
        }

        return {
            hasContent: metrics.hasContent,
            scrollHeight: metrics.scrollHeight,
            textLen: metrics.textLen,
            bodyChildCount: metrics.bodyChildCount,
            mediaCount: metrics.mediaCount,
            ...(screenshotBase64 ? { screenshotBase64 } : {})
        };
    } catch (err) {
        console.warn('[visual-verify] captureForVerification failed (non-fatal):', err.message);
        return { skipped: true, reason: err.message, hasContent: null };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}
