import { supabaseAdmin } from './supabase-admin.js';
import { sandboxManager } from './sandbox/sandbox-manager.js';
import { verifySandboxBuild } from '../lib/verify-sandbox-build.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Auto-republish: If a project already has a published site,
 * rebuild from the sandbox and re-upload to Supabase Storage
 * so the live link always serves the latest code.
 *
 * This runs as fire-and-forget after each snapshot save.
 */
export async function autoRepublishIfNeeded(projectId, sandboxId) {
    if (!supabaseAdmin || !projectId || !sandboxId) return;

    try {
        // 1. Check if project has a published site
        const { data: publishedSite, error: fetchErr } = await supabaseAdmin
            .from('published_sites')
            .select('*')
            .eq('project_id', projectId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (fetchErr || !publishedSite) {
            console.log(`[Auto-Republish] No active published site for project ${projectId}. Skipping.`);
            return;
        }

        const slug = publishedSite.slug;
        console.log(`\n[Auto-Republish] 🔄 DETECTED live site "${slug}" for project ${projectId}. Starting auto-republish...`);

        // 2. Resolve sandbox provider
        const provider = sandboxManager.getProvider(sandboxId) || global.activeSandboxProvider;
        if (!provider) {
            console.warn(`[Auto-Republish] ⚠️ Sandbox provider not found for ${sandboxId}. Cannot republish.`);
            return;
        }

        // 3. Production build
        console.log(`[Auto-Republish] 🔨 Running production build...`);
        const buildResult = await verifySandboxBuild(sandboxId);
        if (!buildResult.success) {
            console.warn(`[Auto-Republish] ⚠️ Build failed. Live site NOT updated. Logs: ${buildResult.logs?.substring(0, 100)}`);
            return;
        }
        console.log(`[Auto-Republish] ✅ Build successful.`);

        // 4. Extract dist artifacts
        console.log(`[Auto-Republish] 📦 Extracting build artifacts...`);
        const tarResult = await provider.runCommand('cd /home/user/app && tar -czf /tmp/dist.tar.gz -C dist .');
        if (!tarResult.success) {
            console.warn(`[Auto-Republish] ⚠️ Tar extraction failed.`);
            return;
        }

        const base64Result = await provider.runCommand('base64 /tmp/dist.tar.gz');
        const archiveBuffer = Buffer.from(base64Result.stdout.replace(/\s/g, ''), 'base64');

        // 5. Temporary local extraction
        const tempDir = path.join(__dirname, '..', 'temp_extract', `republish_${slug}`);
        await fs.mkdir(tempDir, { recursive: true });
        const archivePath = path.join(tempDir, 'dist.tar.gz');
        await fs.writeFile(archivePath, archiveBuffer);

        const tar = await import('tar');
        await tar.extract({ file: archivePath, cwd: tempDir });
        await fs.unlink(archivePath);

        // 6. Recursive file listing
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

        // 7. Re-upload to Supabase Storage (upsert overwrites existing files)
        console.log(`[Auto-Republish] 📤 Re-uploading ${absoluteFiles.length} files to published-sites/${slug}/...`);
        for (const fullPath of absoluteFiles) {
            const relativePath = path.relative(tempDir, fullPath).replace(/\\/g, '/');
            let fileBuffer = await fs.readFile(fullPath);
            totalSize += fileBuffer.length;

            // Sanitize index.html (remove sandbox console hack)
            if (relativePath === 'index.html') {
                let html = fileBuffer.toString('utf-8');
                const sandboxScriptRegex = /<script>\s*\(function\(\)\s*\{\s*const oldLog = console\.log;[\s\S]*?\}\)\(\);\s*<\/script>/i;
                if (sandboxScriptRegex.test(html)) {
                    html = html.replace(sandboxScriptRegex, '');
                    fileBuffer = Buffer.from(html, 'utf-8');
                }
            }

            const contentType = relativePath.endsWith('.html') ? 'text/html' :
                relativePath.endsWith('.js') ? 'application/javascript' :
                    relativePath.endsWith('.css') ? 'text/css' :
                        relativePath.endsWith('.svg') ? 'image/svg+xml' :
                            relativePath.endsWith('.png') ? 'image/png' :
                                relativePath.endsWith('.jpg') || relativePath.endsWith('.jpeg') ? 'image/jpeg' :
                                    'application/octet-stream';

            const { error: uploadErr } = await supabaseAdmin.storage
                .from('published-sites')
                .upload(`${slug}/${relativePath}`, fileBuffer, {
                    contentType,
                    upsert: true
                });

            if (uploadErr) {
                console.warn(`[Auto-Republish] ⚠️ Failed to upload ${relativePath}:`, uploadErr.message);
            } else {
                uploadedCount++;
            }
        }

        // 8. Update published_sites DB record with new size/count
        await supabaseAdmin
            .from('published_sites')
            .update({
                file_count: uploadedCount,
                total_size_bytes: totalSize,
                updated_at: new Date().toISOString()
            })
            .eq('id', publishedSite.id);

        // 9. Cleanup temp dir
        await fs.rm(tempDir, { recursive: true, force: true });

        console.log(`[Auto-Republish] 🎉 SUCCESS! Live site "${slug}" updated with ${uploadedCount} files (${(totalSize / 1024).toFixed(1)} KB)`);
        console.log(`[Auto-Republish] 🔗 Live at: /sites/${slug}/\n`);

    } catch (err) {
        console.error(`[Auto-Republish] ❌ Error during auto-republish:`, err.message);
        // Silently fail — we don't want to break the snapshot flow
    }
}
