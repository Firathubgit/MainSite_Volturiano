import { sandboxManager } from '../lib/sandbox/sandbox-manager.js';
import { verifySandboxBuild } from '../lib/verify-sandbox-build.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Sanitize and validate a slug string.
 */
function sanitizeSlug(raw) {
    return raw
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 63);
}

/**
 * POST /api/publish-site
 */
export default async function publishSite(req, res) {
    const startTime = Date.now();
    const logPath = path.join(__dirname, '..', 'publish_debug.log');
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

    const log = (msg) => {
        const time = new Date().toISOString();
        console.log(`[Publish][${time}] ${msg}`);
        if (isDev) {
            fs.appendFile(logPath, `[${time}] ${msg}\n`).catch(() => { });
        }
    };

    try {
        log('[Publish] Request received');
        const { buildId, sandboxId, slug: rawSlug, siteTitle, siteDescription, siteIconUrl, iconBase64, iconFileName } = req.body;
        const userId = req.user?.id;

        if (!sandboxId || !rawSlug) {
            log('[Publish] Error: sandboxId/slug missing');
            return res.status(400).json({ success: false, error: 'sandboxId and slug are required' });
        }

        const slug = sanitizeSlug(rawSlug);
        if (slug.length < 2) {
            await log('[Publish] Error: slug too short');
            return res.status(400).json({ success: false, error: 'Slug too short' });
        }

        let finalSiteIconUrl = siteIconUrl || null;
        if (iconBase64 && iconFileName && supabaseAdmin) {
            try {
                let base64Data = iconBase64;
                if (iconBase64.includes(',')) {
                    base64Data = iconBase64.split(',')[1];
                }
                const buffer = Buffer.from(base64Data, 'base64');
                const ext = iconFileName.split('.').pop() || 'png';
                const fileName = `icon_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                const filePath = `site-icons/${fileName}`;

                const { data, error } = await supabaseAdmin.storage
                    .from('components')
                    .upload(filePath, buffer, {
                        contentType: `image/${ext === 'svg' ? 'svg+xml' : ext}`,
                        upsert: true
                    });

                if (error) {
                    await log(`[Publish] Error uploading custom icon: ${error.message}`);
                } else {
                    const { data: publicData } = supabaseAdmin.storage
                        .from('components')
                        .getPublicUrl(filePath);
                    finalSiteIconUrl = publicData.publicUrl;
                    await log(`[Publish] Custom icon uploaded to: ${finalSiteIconUrl}`);
                }
            } catch (iconErr) {
                await log(`[Publish] Exception uploading custom icon: ${iconErr.message}`);
            }
        }

        // 1. Resolve sandbox
        const provider = sandboxManager.getProvider(sandboxId) || global.activeSandboxProvider;
        if (!provider) {
            await log('[Publish] Error: provider not found');
            return res.status(404).json({ success: false, error: 'Sandbox expired. Please regenerate.' });
        }

        // 2. Production Build
        await log(`[Publish] Building ${slug}...`);
        const buildResult = await verifySandboxBuild(sandboxId);
        if (!buildResult.success) {
            const errorMsg = buildResult.logs ? buildResult.logs.substring(0, 500) : 'Build failed with no logs';
            await log(`[Publish] Build failed: ${errorMsg}`);
            return res.status(500).json({ 
                success: false, 
                error: 'Build failed. Check code for errors.', 
                logs: buildResult.logs 
            });
        }

        // 3. Extract artifacts
        await log(`[Publish] Extracting artifacts...`);
        const tarResult = await provider.runCommand('cd /home/user/app && tar -czf /tmp/dist.tar.gz -C dist .');
        if (!tarResult.success) {
            await log('[Publish] Extraction failed');
            return res.status(500).json({ success: false, error: 'Extraction failed' });
        }

        const base64Result = await provider.runCommand('base64 /tmp/dist.tar.gz');
        if (!base64Result.success) {
            await log('[Publish] base64 command failed');
            return res.status(500).json({ success: false, error: 'Failed to read build archive' });
        }
        
        // Optimize: avoid massive string regex if possible. Buffer.from(..., 'base64') 
        // handles whitespaces correctly in Node.js >= 14.
        const archiveBuffer = Buffer.from(base64Result.stdout.trim(), 'base64');
        if (archiveBuffer.length < 100) {
            await log(`[Publish] Archive buffer suspiciously small: ${archiveBuffer.length} bytes`);
            return res.status(500).json({ success: false, error: 'Build archive is corrupt or empty' });
        }

        // 4. Temporary local extraction to get individual files
        const tempDir = path.join(__dirname, '..', 'temp_extract', slug);
        await fs.mkdir(tempDir, { recursive: true });
        const archivePath = path.join(tempDir, 'dist.tar.gz');
        await fs.writeFile(archivePath, archiveBuffer);

        const tar = await import('tar');
        await tar.extract({ file: archivePath, cwd: tempDir });
        await fs.unlink(archivePath);

        // 5. Recursive upload to Supabase Storage
        console.log(`[Publish] Uploading to Storage: published-sites/${slug}/`);
        if (!supabaseAdmin) {
            console.error('[Publish] supabaseAdmin is not initialized');
            return res.status(500).json({ success: false, error: 'Database configuration missing on server.' });
        }

        // Verify/Create bucket just in case (Phase S4 safety)
        try {
            const { data: buckets, error: bucketListErr } = await supabaseAdmin.storage.listBuckets();
            if (bucketListErr) throw bucketListErr;
            
            if (!buckets?.find(b => b.id === 'published-sites')) {
                log('[Publish] Creating published-sites bucket...');
                await supabaseAdmin.storage.createBucket('published-sites', { public: true });
            }
        } catch (e) {
            log(`[Publish] Bucket check/creation warning: ${e.message}`);
        }

        async function getFiles(dir) {
            const subdirs = await fs.readdir(dir);
            const files = await Promise.all(subdirs.map(async (subdir) => {
                const res = path.resolve(dir, subdir);
                return (await fs.stat(res)).isDirectory() ? getFiles(res) : res;
            }));
            return Array.prototype.concat(...files);
        }

        const absoluteFiles = await getFiles(tempDir);
        let uploadedCount = 0;
        let totalSize = 0;

        for (const fullPath of absoluteFiles) {
            const relativePath = path.relative(tempDir, fullPath).replace(/\\/g, '/');
            let fileBuffer = await fs.readFile(fullPath);
            totalSize += fileBuffer.length;

            // --- PRODUCTION SANITIZATION: Remove the Sandbox Console Hack from index.html ---
            if (relativePath === 'index.html') {
                let html = fileBuffer.toString('utf-8');
                // Regex to find and remove the <script> block with the sandbox polyfill
                // It usually looks like <script>(function() { const oldLog = console.log; ... })();</script>
                const sandboxScriptRegex = /<script>\s*\(function\(\)\s*\{\s*const oldLog = console\.log;[\s\S]*?\}\)\(\);\s*<\/script>/i;
                
                if (sandboxScriptRegex.test(html)) {
                    console.log('[Publish] Cleaning up sandbox console script from index.html');
                    html = html.replace(sandboxScriptRegex, '');
                }

                // --- INJECT CUSTOM WEBSITE INFO (Title, Description, Icon) ---
                const escapeHtml = (unsafe) => {
                    if (!unsafe) return '';
                    return unsafe
                         .replace(/&/g, "&amp;")
                         .replace(/</g, "&lt;")
                         .replace(/>/g, "&gt;")
                         .replace(/"/g, "&quot;")
                         .replace(/'/g, "&#039;");
                 };

                // Truncate sizes prevent blob attacks
                if (siteTitle && siteTitle.length > 150) siteTitle = siteTitle.substring(0, 150);
                if (siteDescription && siteDescription.length > 300) siteDescription = siteDescription.substring(0, 300);

                if (siteTitle) {
                    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(siteTitle)}</title>`);
                }
                
                let headInjection = '';
                if (siteDescription) {
                    const cleanDesc = escapeHtml(siteDescription);
                    if (/<meta\s+name=["']description["'].*?>/i.test(html)) {
                       html = html.replace(/<meta\s+name=["']description["'].*?>/i, `<meta name="description" content="${cleanDesc}">`);
                    } else {
                       headInjection += `\n<meta name="description" content="${cleanDesc}">`;
                    }
                }
                
                if (finalSiteIconUrl) {
                    // Remove existing icon links
                    html = html.replace(/<link\s+rel=["'](shortcut icon|icon|apple-touch-icon)["'].*?>/ig, '');
                    headInjection += `\n<link rel="icon" type="image/x-icon" href="${finalSiteIconUrl}">`;
                    headInjection += `\n<link rel="apple-touch-icon" href="${finalSiteIconUrl}">`;
                }
                
                if (headInjection && html.includes('</head>')) {
                    html = html.replace('</head>', `${headInjection}\n</head>`);
                }
                const brandingHtml = `
<style>
  .volturiano-brand-overlay {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    pointer-events: auto;
  }
  .volturiano-stamp {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0; 
    padding: 0px 5px;
    width: 55px; 
    height: 55px; 
    border-radius: 14px;
    text-decoration: none;
    overflow: hidden;
    white-space: nowrap;
    border: 2px solid transparent;
    background-image: 
      linear-gradient(to bottom, #0a0a0a, #141414),
      linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(80,80,80,0.5) 50%, rgba(255,255,255,0.8) 100%);
    background-origin: padding-box, border-box;
    background-clip: padding-box, border-box;
    box-shadow: 0px 4px 30px -5px rgba(255, 255, 255, 0.15);
    transition: width 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), 
                padding 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), 
                box-shadow 0.3s ease, 
                transform 0.3s ease;
    cursor: pointer;
  }
  .volturiano-stamp:hover {
    width: 230px; 
    padding: 0px 20px; 
    box-shadow: 0px 8px 40px -4px rgba(255, 255, 255, 0.35);
    transform: translateY(-2px);
  }
  .stamp-content {
    display: flex;
    align-items: center;
    gap: 15px; 
    opacity: 0;
    max-width: 0; 
    padding-right: 0;
    overflow: hidden;
    transition: max-width 0.5s cubic-bezier(0.25, 0.8, 0.25, 1),
                opacity 0.4s ease-out,
                padding-right 0.5s cubic-bezier(0.25, 0.8, 0.25, 1),
                transform 0.4s ease-out;
    transform: translateX(10px);
  }
  .volturiano-stamp:hover .stamp-content {
    opacity: 1;
    max-width: 200px; 
    padding-right: 15px; 
    transform: translateX(0);
  }
  .stamp-text {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    background: linear-gradient(to bottom, #ffffff 0%, #b0b0b0 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    white-space: nowrap;
  }
  .stamp-separator {
    width: 1.5px;
    height: 24px;
    background: linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.5));
    border-radius: 10px;
    opacity: 0.9;
    margin-top: 2px;
    display: block; 
  }
  .stamp-logo {
    height: 45px;
    width: auto;
    display: block;
    filter: brightness(0) invert(1);
    opacity: 0.95;
    margin-top: -1px;
    flex-shrink: 0;
    margin-left: auto; 
    margin-right: auto;
  }
</style>
<div class="volturiano-brand-overlay">
  <a href="https://volturiano.com" target="_blank" rel="noopener noreferrer" class="volturiano-stamp" aria-label="Powered by Volturiano">
    <div class="stamp-content">
      <span class="stamp-text">POWERED BY</span>
      <div class="stamp-separator"></div>
    </div>
    <img src="https://volturiano.com/TornadoLogo.png" alt="Volturiano" class="stamp-logo" />
  </a>
</div>
`;
                // Append before closing body tag
                if (html.includes('</body>')) {
                    html = html.replace('</body>', `${brandingHtml}</body>`);
                } else {
                    html += brandingHtml;
                }
                
                fileBuffer = Buffer.from(html, 'utf-8');
            }
            // ------------------------------------------------------------------------------

            const contentType = relativePath.endsWith('.html') ? 'text/html' :
                relativePath.endsWith('.js') ? 'application/javascript' :
                    relativePath.endsWith('.css') ? 'text/css' :
                        relativePath.endsWith('.svg') ? 'image/svg+xml' :
                            relativePath.endsWith('.png') ? 'image/png' :
                                relativePath.endsWith('.jpg') || relativePath.endsWith('.jpeg') ? 'image/jpeg' :
                                    'application/octet-stream';

            const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
                .from('published-sites')
                .upload(`${slug}/${relativePath}`, fileBuffer, {
                    contentType,
                    upsert: true
                });

            if (uploadErr) {
                console.error(`[Publish] Upload failed for ${relativePath}:`, uploadErr);
                throw new Error(`Failed to upload ${relativePath}: ${uploadErr.message}`);
            }
            log(`[Publish] Uploaded: ${relativePath} (${fileBuffer.length} bytes)`);
            uploadedCount++;
        }

        // ── SIZE GUARD: Reject publishes exceeding 50MB ──
        if (totalSize > 50 * 1024 * 1024) {
            log(`[Publish] ❌ REJECTED — site too large: ${(totalSize / (1024 * 1024)).toFixed(1)}MB`);
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
            return res.status(413).json({ success: false, error: 'Site is too large to publish (max 50MB).' });
        }

        // 6. DB Registration (supports both initial publish and updates)
        console.log(`[Publish] Registering in DB...`);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const liveUrl = `${frontendUrl}/sites/${slug}/`;

        console.log(`[Publish] Supabase Payload -> Project: ${buildId}, User: ${userId}, Slug: ${slug}, Files: ${uploadedCount}, Size: ${totalSize}`);

        // Get project thumbnail if available
        let projectThumbnail = null;
        if (buildId) {
            const { data: projectData } = await supabaseAdmin.from('projects').select('thumbnail_url').eq('id', buildId).single();
            if (projectData && projectData.thumbnail_url) {
                projectThumbnail = projectData.thumbnail_url;
            }
        }

        // Check if this project already has a published site (update vs insert)
        const { data: existingSite } = await supabaseAdmin
            .from('published_sites')
            .select('id, slug')
            .eq('project_id', buildId)
            .limit(1)
            .single();

        if (existingSite) {
            // UPDATE existing published site
            console.log(`[Publish] 🔄 UPDATING existing site (id: ${existingSite.id}, slug: ${existingSite.slug})`);
            const { error: updateErr } = await supabaseAdmin
                .from('published_sites')
                .update({
                    file_count: uploadedCount,
                    total_size_bytes: totalSize,
                    thumbnail_url: projectThumbnail,
                    site_title: siteTitle || null,
                    site_description: siteDescription || 'Published with Volturiano',
                    site_icon_url: finalSiteIconUrl || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingSite.id);

            if (updateErr) {
                console.error('[Publish] DB Update Failed!', updateErr);
                return res.status(500).json({ success: false, error: `Database error updating site: ${updateErr.message}` });
            }
        } else {
            // INSERT new published site
            console.log(`[Publish] 🆕 INSERTING new site record`);
            const { error: dbErr } = await supabaseAdmin
                .from('published_sites')
                .insert({
                    slug,
                    project_id: buildId || null,
                    user_id: userId,
                    site_name: slug.replace(/-/g, ' '),
                    description: 'Published with Volturiano',
                    storage_bucket: 'published-sites',
                    storage_path: `${slug}/`,
                    file_count: uploadedCount,
                    total_size_bytes: totalSize,
                    status: 'active',
                    thumbnail_url: projectThumbnail,
                    site_title: siteTitle || null,
                    site_description: siteDescription || 'Published with Volturiano',
                    site_icon_url: finalSiteIconUrl || null
                });
            if (dbErr) {
                // If the slug is taken, verify if it actually belongs to THIS project (handling the case where project lost its published_slug state)
                if (dbErr.code === '23505') {
                    const { data: conflictSite } = await supabaseAdmin.from('published_sites').select('id, project_id').eq('slug', slug).single();
                    if (conflictSite && conflictSite.project_id === buildId) {
                        console.log(`[Publish] 🔄 Recovered lost slug connection for ${slug}. Updating instead of inserting.`);
                        const { error: recoveryUpdateErr } = await supabaseAdmin.from('published_sites').update({
                            file_count: uploadedCount,
                            total_size_bytes: totalSize,
                            thumbnail_url: projectThumbnail,
                            site_title: siteTitle || null,
                            site_description: siteDescription || 'Published with Volturiano',
                            site_icon_url: finalSiteIconUrl || null,
                            updated_at: new Date().toISOString()
                        }).eq('id', conflictSite.id);
                        
                        if (recoveryUpdateErr) return res.status(500).json({ success: false, error: 'Database error updating recovered site.' });
                    } else {
                        return res.status(409).json({ success: false, error: 'Slug taken' });
                    }
                } else {
                    console.error('[Publish] Database Registration Failed!', {
                        code: dbErr.code, message: dbErr.message, slug, buildId
                    });
                    return res.status(500).json({ success: false, error: `Database error reserving site slug: ${dbErr.message}` });
                }
            }
        }

        // 7. Update Project record
        if (buildId) {
            await supabaseAdmin.from('projects').update({
                published_url: liveUrl,
                published_slug: slug,
                published_at: new Date().toISOString(),
                build_status: 'published'
            }).eq('id', buildId);
        }

        // 8. Cleanup
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupErr) {
            console.warn('[Publish] Cleanup warning:', cleanupErr.message);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        return res.json({
            success: true,
            url: liveUrl,
            slug,
            filesCount: uploadedCount,
            duration
        });

    } catch (error) {
        log(`[Publish] CRITICAL CATCH: ${error.message}`);
        if (error.stack) log(error.stack);

        console.error('[Publish] Critical Catch-All Error:', error);
        
        // Ensure we always return JSON even if logging fails
        try {
            return res.status(500).json({
                success: false,
                error: process.env.NODE_ENV === 'development' ? (error.message || 'Internal error') : 'Internal server error during publish process.',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        } catch (jsonErr) {
            console.error('[Publish] Failed to send error JSON:', jsonErr);
            if (!res.headersSent) {
                res.status(500).send('{"success":false,"error":"Fatal server error"}');
            }
        }
    }
}
