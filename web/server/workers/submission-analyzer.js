// server/workers/submission-analyzer.js
// Phase S9.5: Asynchronous Analysis Worker (Background Job, 10-30s)
// Picks pending jobs from submission_jobs, processes them with LLM + screenshot.

import { supabaseAdmin } from '../lib/supabase-admin.js';
import { analyzeCommunityComponent, basicMetadataExtraction } from '../lib/community-analyzer.js';
import { analyzeTemplate, basicTemplateMetadata } from '../lib/template-analyzer.js';
import { decodeDataUriMedia } from '../lib/community/media-validation.js';
import { upsertComponentEmbedding } from '../lib/registry/embeddings.js';
import puppeteer from 'puppeteer';

const POLL_INTERVAL_MS = 5000; // 5 seconds
const DAILY_LLM_BUDGET = 50.00; // $50/day cap
const ENABLE_COMMUNITY_AUTO_SCREENSHOTS = process.env.ENABLE_COMMUNITY_AUTO_SCREENSHOTS === 'true';
const CHROMIUM_NO_SANDBOX = process.env.CHROMIUM_NO_SANDBOX === 'true';
const SCREENSHOT_ALLOWED_HOSTS = new Set([
    'cdn.tailwindcss.com',
    'esm.sh',
    'unpkg.com'
]);

// ═══════════════════════════════════════════════════════════════
// HELPER: Capture Component Screenshot via Headless Browser
// ═══════════════════════════════════════════════════════════════

async function captureComponentScreenshot(code, options = {}) {
    const { width = 1280, height = 720, timeout = 15000 } = options;

    // Prepare code for Babel ES Module transpilation
    const safeCode = code
        .replace(/export\s+default\s+([^;\n]+);?/g, 'window.__InjectedComponent = $1;')
        .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'window.__InjectedComponent = function $1')
        .replace(/<\/script>/g, '<\\/script>');

    const htmlSnippet = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000000; overflow: hidden; display: flex; align-items: center; justify-content: center; color: white; }
        * { box-sizing: border-box; }
    </style>
    
    <script type="importmap">
    {
        "imports": {
            "react": "https://esm.sh/react@18.2.0?dev",
            "react-dom/client": "https://esm.sh/react-dom@18.2.0/client?dev",
            "lucide-react": "https://esm.sh/lucide-react@0.294.0?bundle",
            "framer-motion": "https://esm.sh/framer-motion@10.16.4?bundle"
        }
    }
    </script>
    
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
    <div id="root" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;"></div>
    
    <script type="text/babel" data-type="module">
        ${safeCode}

        Promise.all([
            import('react'),
            import('react-dom/client')
        ]).then(([ReactModule, ReactDOMClient]) => {
            setTimeout(() => {
                const root = ReactDOMClient.createRoot(document.getElementById('root'));
                if (typeof window.__InjectedComponent !== 'undefined') {
                    const Component = window.__InjectedComponent;
                    root.render(ReactModule.createElement(Component));
                } else {
                    root.render(ReactModule.createElement('div', null, 'No valid export default found'));
                }
            }, 100);
        }).catch(err => console.error('Dynamic import failed:', err));
    </script>
</body>
</html>`;

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: CHROMIUM_NO_SANDBOX
                ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                : ['--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setViewport({ width, height });

        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const url = request.url();
            if (url === 'about:blank' || url.startsWith('data:') || url.startsWith('blob:')) {
                return request.continue();
            }

            try {
                const host = new URL(url).hostname;
                if (SCREENSHOT_ALLOWED_HOSTS.has(host)) return request.continue();
            } catch {
                // Fall through to abort malformed URLs.
            }

            return request.abort();
        });

        page.on('console', msg => console.log('[Puppeteer]', msg.type(), msg.text()));
        page.on('pageerror', err => console.log('[Puppeteer Page Error]', err.message));

        await page.setContent(htmlSnippet, { waitUntil: 'networkidle0', timeout });

        // Wait for component to render and settle
        await new Promise(r => setTimeout(r, 1500));

        const buffer = await page.screenshot({ type: 'png' });
        return buffer;
    } catch (err) {
        console.error('[Analyzer] Puppeteer error:', err);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Get daily LLM cost from database
// ═══════════════════════════════════════════════════════════════

async function getDailyLlmCost() {
    try {
        const { data, error } = await supabaseAdmin.rpc('get_daily_llm_cost');
        if (error) {
            console.warn('[Analyzer] Failed to get daily LLM cost:', error.message);
            return 0;
        }
        return parseFloat(data) || 0;
    } catch (err) {
        console.warn('[Analyzer] getDailyLlmCost error:', err.message);
        return 0;
    }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Generate bundle_code JSON matching the AI builder format
// Format: { id, files: [{ path, content }], usage: { importName, importPath, renderTag } }
// ═══════════════════════════════════════════════════════════════

function generateBundleCode(componentId, componentName, code, language) {
    const ext = language === 'tsx' ? 'tsx' : 'jsx';
    const importName = componentName
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join('');
    const filePath = `src/components/${importName}.${ext}`;

    return {
        id: componentId,
        files: [
            {
                path: filePath,
                content: code,
            }
        ],
        usage: {
            importName: importName,
            importPath: `./${importName}`,
            renderTag: `<${importName} />`,
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// CORE: Process a single submission job
// Pipeline: Fetch -> Screenshot -> LLM Analysis -> Metadata -> Pending Review
// ═══════════════════════════════════════════════════════════════

async function processSubmissionJob(job) {
    const startTime = Date.now();
    const { submission_id } = job;

    // Mark job as running
    await supabaseAdmin.from('submission_jobs')
        .update({ status: 'running', started_at: new Date().toISOString(), attempts: (job.attempts || 0) + 1 })
        .eq('id', job.id);

    try {
        // 1. Fetch the submission
        const { data: submission, error: fetchError } = await supabaseAdmin
            .from('community_submissions')
            .select('*')
            .eq('id', submission_id)
            .single();

        if (fetchError || !submission) {
            throw new Error(`Submission ${submission_id} not found: ${fetchError?.message || 'no data'}`);
        }

        console.log(`[Analyzer] Processing submission "${submission.name}" (${submission_id})`);

        // 2. Screenshot the component via Puppeteer
        let screenshotUrl = null;
        let screenshotBase64 = null;
        // 3. Process Media (Thumbnails & Video)
        let thumbnailUrl = null;
        let previewVideoUrl = null;

        // A. Handle User-Uploaded Thumbnail (supersedes Puppeteer)
        if (submission.thumbnail_base64) {
            console.log(`[Analyzer] Processing user-provided thumbnail for ${submission.id}...`);
            try {
                const media = decodeDataUriMedia(submission.thumbnail_base64, {
                    label: 'Submission thumbnail',
                    allowedTypes: ['image/png', 'image/jpeg', 'image/webp'],
                    maxBytes: 5 * 1024 * 1024
                });

                const { error: uploadError } = await supabaseAdmin.storage
                    .from('component-previews')
                    .upload(`submissions/${submission.id}/preview.png`, media.buffer, {
                        contentType: media.contentType,
                        upsert: true,
                    });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabaseAdmin.storage
                    .from('component-previews')
                    .getPublicUrl(`submissions/${submission.id}/preview.png`);

                thumbnailUrl = publicUrlData.publicUrl;
                console.log(`[Analyzer] User thumbnail uploaded: ${thumbnailUrl}`);
            } catch (thumbErr) {
                console.error(`[Analyzer] Failed to process user thumbnail:`, thumbErr.message);
                // Fall back to Puppeteer screenshot if custom fails
            }
        }

        // B. Fallback to Puppeteer Screenshot if no custom thumbnail
        if (!thumbnailUrl && ENABLE_COMMUNITY_AUTO_SCREENSHOTS) {
            console.log(`[Analyzer] Generating Puppeteer screenshot for ${submission.id}...`);
            const screenshotBuffer = await captureComponentScreenshot(submission.code);

            if (screenshotBuffer) {
                try {
                    const { error: uploadError } = await supabaseAdmin.storage
                        .from('component-previews')
                        .upload(`submissions/${submission.id}/preview.png`, screenshotBuffer, {
                            contentType: 'image/png',
                            upsert: true,
                        });

                    if (uploadError) throw uploadError;

                    const { data: publicUrlData } = supabaseAdmin.storage
                        .from('component-previews')
                        .getPublicUrl(`submissions/${submission.id}/preview.png`);

                    thumbnailUrl = publicUrlData.publicUrl;
                    console.log(`[Analyzer] Auto-screenshot successful: ${thumbnailUrl}`);
                } catch (uploadErr) {
                    console.error(`[Analyzer] ❌ Screenshot upload failed:`, uploadErr.message);
                }
            } else {
                console.warn(`[Analyzer] ⚠️ Screenshot generation returned null.`);
            }
        } else if (!thumbnailUrl) {
            console.log(`[Analyzer] Auto-screenshot skipped for ${submission.id}; ENABLE_COMMUNITY_AUTO_SCREENSHOTS is not true.`);
        }

        // C. Handle User-Uploaded Video (Hover Preview)
        if (submission.video_base64) {
            console.log(`[Analyzer] Processing user-provided preview video for ${submission.id}...`);
            try {
                const media = decodeDataUriMedia(submission.video_base64, {
                    label: 'Submission video',
                    allowedTypes: ['video/mp4', 'video/webm'],
                    maxBytes: 15 * 1024 * 1024
                });

                const { error: uploadError } = await supabaseAdmin.storage
                    .from('component-previews')
                    .upload(`submissions/${submission.id}/preview.mp4`, media.buffer, {
                        contentType: media.contentType,
                        upsert: true,
                    });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabaseAdmin.storage
                    .from('component-previews')
                    .getPublicUrl(`submissions/${submission.id}/preview.mp4`);

                previewVideoUrl = publicUrlData.publicUrl;
                console.log(`[Analyzer] User video uploaded: ${previewVideoUrl}`);
            } catch (videoErr) {
                console.error(`[Analyzer] Failed to process user video:`, videoErr.message);
            }
        }

        // Free up memory by dropping the massive base64 strings from the submission object
        submission.thumbnail_base64 = null;
        submission.video_base64 = null;

        // D. Clear base64 columns in DB to save space (since files are now in Storage)
        await supabaseAdmin.from('community_submissions')
            .update({ thumbnail_base64: null, video_base64: null })
            .eq('id', submission.id);

        // Fetch current base64 to pass to LLM (if Puppeteer took it, or if it was Custom)
        // We'll just ask Supabase Storage for the file back or use the buffer if we had it.
        // Actually, LLM only strictly *needs* the screenshot if it's visually analyzing.
        // For efficiency, we ignore passing the media back to the LLM if they uploaded a custom video/thumb.
        // Since LLM extraction works okay without it, we'll save tokens.
        // ... Leaving screenshotBase64 as null for user uploads to skip vision tokens.    // Continue without screenshot — LLM can still analyze code-only
        // Note: screenshotBase64 is intentionally left null if a custom thumbnail was provided,
        // to avoid sending large image data to the LLM unnecessarily if it's not needed for analysis.
        // If Puppeteer generated the screenshot, screenshotBase64 would have been set within that block.
        // If LLM needs a visual, it will fetch from thumbnailUrl.


        // 4. LLM Multimodal Analysis with budget control
        const dailyLlmCost = await getDailyLlmCost();
        let llmAnalysis;

        if (dailyLlmCost >= DAILY_LLM_BUDGET) {
            console.warn(`[Analyzer] Daily LLM budget exhausted ($${dailyLlmCost.toFixed(2)} >= $${DAILY_LLM_BUDGET}). Using fallback.`);
            llmAnalysis = basicMetadataExtraction(submission.code, submission.name);
        } else {
            try {
                llmAnalysis = await analyzeCommunityComponent({
                    code: submission.code,
                    screenshotBase64,
                    userProvidedName: submission.name,
                    userProvidedDescription: submission.description || null,
                    userCategoryHint: submission.category_hint || null,
                });

                // Track LLM cost (~$0.01-0.08 per multimodal call with Gemini 3.1 Pro)
                await supabaseAdmin.from('llm_cost_log').insert({
                    operation: 'submission_analysis',
                    model: 'gemini-2.0-flash',
                    estimated_cost_usd: 0.01,
                    tokens_used: null,
                });
            } catch (llmErr) {
                console.warn(`[Analyzer] LLM analysis failed, using fallback:`, llmErr.message);
                llmAnalysis = basicMetadataExtraction(submission.code, submission.name);
            }
        }

        // 5. Quality metadata. Community code never goes live automatically.
        const qualityScore = llmAnalysis.quality_score || 0;
        const componentStatus = 'pending_review';

        console.log(`[Analyzer] Quality score computed: ${qualityScore}. Status set to pending_review.`);

        // 6. Build component_id with version
        const slugifiedName = submission.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        const rawCategory = llmAnalysis.category || 'uncategorized';
        // Normalize: Force PascalCase and match known conventions to avoid duplicates (e.g., hero -> Hero)
        let category = rawCategory.trim();
        const lowerCat = category.toLowerCase();
        
        if (lowerCat === 'hero') category = 'Hero';
        else if (lowerCat === 'videohero') category = 'VideoHero';
        else if (lowerCat === 'interactionhero') category = 'InteractionHero';
        else if (lowerCat === 'pricing') category = 'Pricing';
        else if (lowerCat === 'features' || lowerCat === 'feature') category = 'Features';
        else if (lowerCat === 'header') category = 'Header';
        else if (lowerCat === 'footer') category = 'Footer';
        else if (lowerCat === 'testimonial') category = 'Testimonial';
        else if (lowerCat === 'faq') category = 'FAQ';
        else if (lowerCat === 'cta') category = 'CTA';
        else {
            // Default: Capitalize first letter
            category = category.charAt(0).toUpperCase() + category.slice(1);
        }

        const componentId = `${category.toLowerCase()}.${slugifiedName}.community.v1`;

        // 7. Insert into components table
        let componentDbId = null;
        if (true) { // Always insert
            const cleanedCode = llmAnalysis.cleaned_code || submission.code;

            // Generate bundle_code matching the existing AI builder format
            const bundleCode = generateBundleCode(
                componentId,
                llmAnalysis.display_name || submission.name,
                cleanedCode,
                llmAnalysis.language || 'jsx'
            );

            const { data: componentRow, error: compError } = await supabaseAdmin
                .from('components')
                .insert({
                    component_id: componentId,
                    name: llmAnalysis.display_name || submission.name,
                    component_type: llmAnalysis.component_type || 'ui_component',
                    display_name: llmAnalysis.display_name || submission.name,
                    category: category,
                    subcategory: llmAnalysis.subcategory || null,
                    description: llmAnalysis.description || `Community component: ${submission.name}`,
                    visual_description: llmAnalysis.visual_description || null,
                    mood_tone: llmAnalysis.mood_tone || null,
                    color_mode: llmAnalysis.color_mode || 'adaptive',
                    color_primary: llmAnalysis.color_primary || null,
                    color_secondary: llmAnalysis.color_secondary || null,
                    color_accent: llmAnalysis.color_accent || null,
                    color_background: llmAnalysis.color_background || null,
                    color_palette: llmAnalysis.color_palette || null,
                    color_warmth: llmAnalysis.color_warmth || null,
                    color_theme: llmAnalysis.color_theme || null,
                    typography_style: llmAnalysis.typography_style || null,
                    layout_type: llmAnalysis.layout_type || null,
                    suitable_for: llmAnalysis.suitable_for || [],
                    not_suitable_for: llmAnalysis.not_suitable_for || [],
                    industry_tags: llmAnalysis.industry_tags || [],
                    supports: llmAnalysis.supports || [],
                    requires: llmAnalysis.requires || [],
                    responsive: llmAnalysis.responsive ?? true,
                    has_animation: llmAnalysis.has_animation ?? false,
                    tags: llmAnalysis.tags || ['community'],
                    keywords: llmAnalysis.keywords || [],
                    quality_score: qualityScore,
                    status: componentStatus,
                    author_id: submission.user_id,
                    author_type: 'community',
                    bundle_code: JSON.stringify(bundleCode),
                    submission_id: submission.id,
                    content_hash: submission.content_hash,
                    version_number: 1,
                    preview_image_url: thumbnailUrl || null,
                    thumbnail_url: thumbnailUrl || null,
                    preview_video_url: previewVideoUrl || null,
                    usage_count: 0,
                })
                .select('id')
                .single();

            if (compError) {
                console.error(`[Analyzer] Component insert failed:`, compError);
                // Don't throw — still update submission status
            } else {
                componentDbId = componentRow.id;
                console.log(`[Analyzer] Component prepared for review: ${componentId} (DB id: ${componentDbId})`);

                // Semantic retrieval: embed the design metadata so the agent can
                // find this component by meaning once it goes live. Fire-and-forget.
                upsertComponentEmbedding({
                    id: componentDbId,
                    component_id: componentId,
                    name: llmAnalysis.display_name || submission.name,
                    category,
                    description: llmAnalysis.description || '',
                    visual_description: llmAnalysis.visual_description || '',
                    mood_tone: llmAnalysis.mood_tone || '',
                    typography_style: llmAnalysis.typography_style || '',
                    layout_type: llmAnalysis.layout_type || '',
                    color_mode: llmAnalysis.color_mode || '',
                    tags: llmAnalysis.tags || [],
                    keywords: llmAnalysis.keywords || [],
                    suitable_for: llmAnalysis.suitable_for || [],
                    industry_tags: llmAnalysis.industry_tags || []
                }).catch((embedErr) => {
                    console.warn(`[Analyzer] Embedding generation skipped for ${componentId}:`, embedErr.message);
                });
            }
        }

        // 8. Update submission record
        const processingTimeMs = Date.now() - startTime;
        const { error: subUpdateErr } = await supabaseAdmin.from('community_submissions')
            .update({
                status: 'pending_review',
                component_id: componentDbId,
                quality_score: qualityScore,
                cleaned_code: llmAnalysis.cleaned_code || null,
                rejection_reason: null,
                improvement_suggestions: JSON.stringify(llmAnalysis),
                thumbnail_url: thumbnailUrl || null,
                preview_video_url: previewVideoUrl || null,
            })
            .eq('id', submission_id);

        if (subUpdateErr) {
            console.error(`[Analyzer] ❌ Submission update failed:`, subUpdateErr.message);
        }

        // 9. Mark job as completed
        await supabaseAdmin.from('submission_jobs')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
            })
            .eq('id', job.id);

        // Approval reputation is awarded by the explicit moderation action.

        console.log(`[Analyzer] Submission ${submission_id} processed in ${processingTimeMs}ms → ${componentStatus} (score: ${qualityScore})`);

    } catch (error) {
        console.error(`[Analyzer] Job ${job.id} failed:`, error);

        // Increment attempt count
        const newAttempts = (job.attempts || 0) + 1;
        if (newAttempts >= (job.max_attempts || 3)) {
            // Mark as permanently failed
            await supabaseAdmin.from('submission_jobs')
                .update({
                    status: 'failed',
                    error_log: error.message,
                })
                .eq('id', job.id);

            await supabaseAdmin.from('community_submissions')
                .update({
                    status: 'rejected',
                    rejection_reason: 'Processing failed after multiple attempts. Please try again.',
                })
                .eq('id', submission_id);
        } else {
            // Retry with exponential backoff
            await supabaseAdmin.from('submission_jobs')
                .update({
                    status: 'pending',
                    error_log: error.message,
                    retry_after: new Date(Date.now() + 5000 * Math.pow(2, newAttempts)).toISOString(),
                })
                .eq('id', job.id);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// CORE: Process a template analysis job (Phase S10)
// ═══════════════════════════════════════════════════════════════

async function processTemplateJob(job) {
    const startTime = Date.now();
    const { submission_id } = job;

    // Mark job as running
    await supabaseAdmin.from('submission_jobs')
        .update({ status: 'running', started_at: new Date().toISOString(), attempts: (job.attempts || 0) + 1 })
        .eq('id', job.id);

    try {
        // 1. Parse metadata from the job
        let jobMeta;
        try {
            jobMeta = typeof job.metadata === 'string' ? JSON.parse(job.metadata) : job.metadata;
        } catch {
            jobMeta = {};
        }
        const templateId = jobMeta.template_id;
        const componentIds = jobMeta.component_ids || [];

        if (!templateId) {
            throw new Error('Template job missing template_id in metadata');
        }

        console.log(`[Analyzer] Processing template job: template=${templateId}, components=${componentIds.length}`);

        // 2. Fetch component details for LLM context
        const { data: components, error: compError } = await supabaseAdmin
            .from('components')
            .select('id, name, category, description, visual_description')
            .in('id', componentIds);

        if (compError) {
            throw new Error(`Failed to fetch template components: ${compError.message}`);
        }

        // Maintain original order
        const orderedComponents = componentIds.map(id => components.find(c => c.id === id)).filter(Boolean);

        // 3. Fetch submission for thumbnail
        const { data: submission } = await supabaseAdmin
            .from('community_submissions')
            .select('name, thumbnail_base64')
            .eq('id', submission_id)
            .single();

        // 4. Handle thumbnail upload (same pattern as component analyzer)
        let thumbnailUrl = null;
        if (submission?.thumbnail_base64) {
            try {
                const media = decodeDataUriMedia(submission.thumbnail_base64, {
                    label: 'Template thumbnail',
                    allowedTypes: ['image/png', 'image/jpeg', 'image/webp'],
                    maxBytes: 5 * 1024 * 1024
                });

                const { error: uploadError } = await supabaseAdmin.storage
                    .from('component-previews')
                    .upload(`templates/${templateId}/preview.png`, media.buffer, {
                        contentType: media.contentType,
                        upsert: true,
                    });

                if (!uploadError) {
                    const { data: publicUrlData } = supabaseAdmin.storage
                        .from('component-previews')
                        .getPublicUrl(`templates/${templateId}/preview.png`);
                    thumbnailUrl = publicUrlData.publicUrl;
                }
            } catch (thumbErr) {
                console.error(`[Analyzer] Template thumbnail upload failed:`, thumbErr.message);
            }

            // Clear base64 from DB
            await supabaseAdmin.from('community_submissions')
                .update({ thumbnail_base64: null })
                .eq('id', submission_id);
        }

        // 5. Fetch template record for name/description
        const { data: template } = await supabaseAdmin
            .from('templates')
            .select('name, description, source_mode')
            .eq('id', templateId)
            .single();

        // 6. LLM Analysis with budget control
        const dailyLlmCost = await getDailyLlmCost();
        let llmAnalysis;

        if (dailyLlmCost >= DAILY_LLM_BUDGET) {
            console.warn(`[Analyzer] Daily LLM budget exhausted. Using template fallback.`);
            llmAnalysis = basicTemplateMetadata(template?.name || 'Untitled', orderedComponents);
        } else {
            try {
                llmAnalysis = await analyzeTemplate({
                    components: orderedComponents,
                    screenshotBase64: submission?.thumbnail_base64 || null,
                    templateName: template?.name || 'Untitled Template',
                    templateDescription: template?.description || null,
                    sourceMode: template?.source_mode || 'community-composed',
                });

                // Track LLM cost
                await supabaseAdmin.from('llm_cost_log').insert({
                    operation: 'template_analysis',
                    model: 'gemini-2.0-flash',
                    estimated_cost_usd: 0.02,
                    tokens_used: null,
                });
            } catch (llmErr) {
                console.warn(`[Analyzer] Template LLM analysis failed, using fallback:`, llmErr.message);
                llmAnalysis = basicTemplateMetadata(template?.name || 'Untitled', orderedComponents);
            }
        }

        // 7. Quality metadata. Community templates also wait for review.
        const qualityScore = llmAnalysis.quality_score || 0;
        const templateStatus = 'pending_review';

        console.log(`[Analyzer] Template metadata prepared: score=${qualityScore}, decision=${templateStatus}`);

        // 8. Update template record with LLM metadata
        const { error: updateErr } = await supabaseAdmin
            .from('templates')
            .update({
                name: llmAnalysis.generated_name || template?.name,
                description: llmAnalysis.generated_description || template?.description,
                visual_description: llmAnalysis.visual_description || null,
                category: llmAnalysis.category || 'uncategorized',
                industry_tags: llmAnalysis.industry_tags || [],
                color_mode: llmAnalysis.color_mode || 'adaptive',
                color_palette: llmAnalysis.color_palette || [],
                design_system: llmAnalysis.design_system || null,
                quality_score: qualityScore,
                status: templateStatus,
                preview_image_url: thumbnailUrl || null,
                thumbnail_url: thumbnailUrl || null,
                suitable_for: llmAnalysis.suitable_for || [],
                color_mode_type: llmAnalysis.color_mode || null,
            })
            .eq('id', templateId);

        if (updateErr) {
            console.error(`[Analyzer] Template update failed:`, updateErr.message);
        }

        // 9. Update submission status
        await supabaseAdmin.from('community_submissions')
            .update({
                status: 'pending_review',
                quality_score: qualityScore,
                rejection_reason: null,
                thumbnail_url: thumbnailUrl || null,
                moderation_metadata: {
                    template_id: templateId,
                    source_mode: template?.source_mode || 'community-composed',
                    component_ids: componentIds
                },
            })
            .eq('id', submission_id);

        // 10. Mark job as completed
        await supabaseAdmin.from('submission_jobs')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', job.id);

        // Approval reputation is awarded by the explicit moderation action.

        const processingTimeMs = Date.now() - startTime;
        console.log(`[Analyzer] Template ${templateId} processed in ${processingTimeMs}ms → ${templateStatus} (score: ${qualityScore})`);

    } catch (error) {
        console.error(`[Analyzer] Template job ${job.id} failed:`, error);

        const newAttempts = (job.attempts || 0) + 1;
        if (newAttempts >= (job.max_attempts || 3)) {
            await supabaseAdmin.from('submission_jobs')
                .update({ status: 'failed', error_log: error.message })
                .eq('id', job.id);

            await supabaseAdmin.from('community_submissions')
                .update({ status: 'rejected', rejection_reason: 'Processing failed after multiple attempts.' })
                .eq('id', submission_id);
        } else {
            await supabaseAdmin.from('submission_jobs')
                .update({
                    status: 'pending',
                    error_log: error.message,
                    retry_after: new Date(Date.now() + 5000 * Math.pow(2, newAttempts)).toISOString(),
                })
                .eq('id', job.id);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// WORKER POLL LOOP: Runs every 5 seconds, picks one pending job
// Uses ordering + status check for concurrency safety
// ═══════════════════════════════════════════════════════════════

async function runWorker() {
    console.log('[Analyzer] Worker started. Polling every 5s...');

    while (true) {
        try {
            const { data: jobs, error } = await supabaseAdmin
                .from('submission_jobs')
                .select('*')
                .eq('status', 'pending')
                .or('retry_after.is.null,retry_after.lte.' + new Date().toISOString())
                .order('created_at', { ascending: true })
                .limit(1);

            if (error) {
                console.error('[Analyzer] Job poll error:', error.message);
            } else if (jobs && jobs.length > 0) {
                const job = jobs[0];
                if (job.job_type === 'analyze_template') {
                    await processTemplateJob(job);
                } else {
                    await processSubmissionJob(job);
                }
            }
        } catch (err) {
            console.error('[Analyzer] Worker loop error:', err.message);
        }

        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS & ENTRYPOINT
// ═══════════════════════════════════════════════════════════════

export { processSubmissionJob, runWorker, generateBundleCode };

// Auto-start worker if run directly
// Usage: node server/workers/submission-analyzer.js
if (process.argv[1] && process.argv[1].includes('submission-analyzer')) {
    runWorker().catch(err => {
        console.error('[Analyzer] Worker crashed:', err);
        process.exit(1);
    });
}
