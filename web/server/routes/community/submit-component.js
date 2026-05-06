// server/routes/community/submit-component.js
// Phase S9.4: Synchronous Submission Handler
// Returns submission_id in <500ms. LLM analysis runs async via job queue.

import { createHash } from 'crypto';
import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { parseDataUriMedia } from '../../lib/community/media-validation.js';

// ═══════════════════════════════════════════════════════════════
// ALLOWED_PACKAGES: Must exactly match apply-ai-code-stream.js (Phase S5)
// ═══════════════════════════════════════════════════════════════
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
    '@react-three/drei',
]);

// ═══════════════════════════════════════════════════════════════
// DANGEROUS PATTERNS: Regex scans for malicious code
// ═══════════════════════════════════════════════════════════════
const DANGEROUS_PATTERNS = [
    { regex: /\beval\s*\(/g, label: 'eval()', fixHint: 'Remove eval() — it allows arbitrary code execution' },
    { regex: /document\.cookie/g, label: 'document.cookie', fixHint: 'Remove document.cookie access — not allowed in sandboxed components' },
    { regex: /fetch\s*\(\s*['"`]https?:/g, label: 'fetch(http...)', fixHint: 'Remove external network requests — components must be self-contained' },
    { regex: /\.innerHTML\s*=/g, label: 'innerHTML assignment', fixHint: 'Use React JSX instead of innerHTML — prevents XSS vulnerabilities' },
    { regex: /process\.env/g, label: 'process.env', fixHint: 'Remove process.env access — environment variables are not available in components' },
    { regex: /new\s+Function\s*\(/g, label: 'new Function()', fixHint: 'Remove dynamic function creation — it allows arbitrary code execution' },
    { regex: /window\.location\s*=/g, label: 'window.location redirect', fixHint: 'Remove navigation redirects — components should not redirect users' },
    { regex: /localStorage|sessionStorage/g, label: 'Storage API', fixHint: 'Remove localStorage/sessionStorage — not available in sandboxed preview' },
];

/**
 * POST /api/community/submit-component
 * 
 * SYNCHRONOUS — Returns submission_id in <500ms.
 * Actual LLM analysis runs asynchronously via job queue.
 * 
 * Body: { name, description?, categoryHint?, code, thumbnail? (base64), video? (base64) }
 * Auth: Required (JWT in Authorization header)
 * Response: { success, submissionId, message, statusEndpoint }
 */
export default async function submitComponent(req, res) {
    console.log(`[submit-component] INCOMING request from user: ${req.user?.id || 'unknown'}`);

    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const {
            name,
            description,
            categoryHint,
            code,
            cssCode,
            thumbnail,
            video,
            ipAttestationAccepted,
            licenseGrantAccepted,
            attestationVersion = 'community-submission-v1'
        } = req.body;

        // ─── VALIDATION (all sync, <50ms) ───

        // 1. Required fields
        if (!name || !code) {
            return res.status(400).json({ success: false, error: 'name and code are required' });
        }
        if (name.length < 3 || name.length > 100) {
            return res.status(400).json({ success: false, error: 'Name must be 3-100 characters' });
        }
        if (code.length < 100) {
            return res.status(400).json({ success: false, error: 'Code must be at least 100 characters' });
        }
        if (code.length > 100000) {
            return res.status(400).json({ success: false, error: 'Code must be under 100KB' });
        }
        if (!ipAttestationAccepted || !licenseGrantAccepted) {
            return res.status(400).json({
                success: false,
                error: 'You must confirm that you own or have rights to submit this component and license it for community reuse.'
            });
        }

        try {
            parseDataUriMedia(thumbnail, {
                label: 'Thumbnail',
                allowedTypes: ['image/png', 'image/jpeg', 'image/webp'],
                maxBytes: 5 * 1024 * 1024
            });
            parseDataUriMedia(video, {
                label: 'Preview video',
                allowedTypes: ['video/mp4', 'video/webm'],
                maxBytes: 15 * 1024 * 1024
            });
        } catch (mediaError) {
            return res.status(mediaError.status || 400).json({
                success: false,
                error: mediaError.message
            });
        }

        // 2. Must contain a valid JSX export
        if (!/export\s+default\s+/m.test(code)) {
            return res.status(400).json({
                success: false,
                error: 'Code must contain an export default statement',
                fixHint: 'Add "export default function YourComponent() { ... }" to your code'
            });
        }

        // 2.5 Strip relative JS/TS imports to prevent whitelist errors
        // We strip these during validation/hashing so they don't trigger "disallowed package" errors
        const relativeImportRegex = /^[ \t]*import\s+(?:[^'"]*?)['"](\.\.?[\\/][^'"]+)['"];?/gm;
        const finalCode = code.replace(relativeImportRegex, (match, path) => {
            if (path.match(/\.(css|scss|sass|less)$/i)) return match;
            return `/* [Auto-removed missing local import] ${match} */`;
        });

        // 3. Import whitelist scan
        const importRegex = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
        let match;
        const violations = [];
        while ((match = importRegex.exec(finalCode)) !== null) {
            const pkg = match[1];
            if (pkg.startsWith('.') || pkg.startsWith('/')) continue; // relative imports OK
            const basePkg = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];
            if (!ALLOWED_PACKAGES.has(basePkg)) {
                violations.push({
                    type: 'disallowed_import',
                    detail: `Disallowed import: "${pkg}"`,
                    fixHint: `Only whitelisted packages are allowed: ${[...ALLOWED_PACKAGES].filter(p => !p.includes('/')).join(', ')}`
                });
            }
        }

        // 4. Dangerous pattern scan
        for (const pattern of DANGEROUS_PATTERNS) {
            if (pattern.regex.test(finalCode)) {
                violations.push({
                    type: 'dangerous_pattern',
                    detail: `Dangerous pattern detected: ${pattern.label}`,
                    fixHint: pattern.fixHint,
                });
            }
            // Reset regex lastIndex (global flag)
            pattern.regex.lastIndex = 0;
        }

        if (violations.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Code contains disallowed patterns',
                violations,
                fixHint: 'Remove disallowed imports and dangerous patterns before submitting.'
            });
        }
        console.log('[submit-component] Step 2: Dangerous patterns passed');

        // 5. Rate limiting — max 10 submissions per user per day
        console.log('[submit-component] Step 3.1: Preparing rate limit query for user:', userId);
        const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString();
        console.log('[submit-component] Step 3.2: Timestamp threshold:', twentyFourHoursAgo);

        console.log('[submit-component] Step 3.3: Executing supabase query...');
        const { count, error: countError } = await supabaseAdmin
            .from('community_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', twentyFourHoursAgo);

        console.log('[submit-component] Step 3.4: Supabase query completed. Error:', countError?.message || 'None', '| Count:', count);

        if (countError) {
            console.error('[submit-component] Rate limit check failed:', countError);
            return res.status(500).json({ success: false, error: 'Failed to check submission rate' });
        }

        if (count >= 10) {
            return res.status(429).json({
                success: false,
                error: 'Daily submission limit reached (10/day). Try again tomorrow.'
            });
        }

        console.log('[submit-component] Step 4: Rate limit passed, preparing to hash content');
        console.log(`[submit-component] Step 4.1: Code length: ${code?.length}, CSS length: ${cssCode?.length}`);

        // 6. Content hashing — SHA-256 deduplication
        console.log('[submit-component] Step 4.2: Normalizing code...');
        const normalizedCode = finalCode.replace(/\s+/g, ' ').trim();
        const normalizedCss = cssCode ? cssCode.replace(/\s+/g, ' ').trim() : '';

        console.log('[submit-component] Step 4.3: Hashing...');
        const contentHash = createHash('sha256').update(normalizedCode + normalizedCss).digest('hex');
        console.log(`[submit-component] Step 4.4: Hash computed: ${contentHash}`);

        console.log('[submit-component] Step 4.5: Checking for duplicates in DB...');
        const { data: existingDupe, error: dupeError } = await supabaseAdmin
            .from('community_submissions')
            .select('id, status')
            .eq('content_hash', contentHash)
            .not('status', 'in', '("rejected","archived")')
            .limit(1)
            .maybeSingle();

        console.log(`[submit-component] Step 4.6: Duplicate check done. Dupe error: ${dupeError?.message || 'None'}`);

        if (existingDupe) {
            return res.status(409).json({
                success: false,
                error: 'A component with identical code already exists in the library',
                existingSubmissionId: existingDupe.id
            });
        }
        console.log('[submit-component] Step 5: Deduplication passed, inserting to DB');

        // ─── INSERT SUBMISSION (status='processing') ───
        const { data: submission, error: insertError } = await supabaseAdmin
            .from('community_submissions')
            .insert({
                user_id: userId,
                submission_type: 'component',
                name: name,
                description: description || null,
                category_hint: categoryHint || null,
                code: code,
                css_code: cssCode || null,
                content_hash: contentHash,
                thumbnail_base64: thumbnail || null,
                video_base64: video || null,
                quality_score: null,
                status: 'processing',
                ip_attestation_accepted_at: new Date().toISOString(),
                license_grant_accepted_at: new Date().toISOString(),
                attestation_version: attestationVersion,
                license_type: 'MIT',
            })
            .select('id')
            .single();

        if (insertError) {
            console.error('[submit-component] Insert failed:', insertError);
            return res.status(500).json({ success: false, error: 'Failed to save submission' });
        }
        console.log('[submit-component] Step 6: Insert successful, enqueueing job');

        // ─── ENQUEUE ASYNC JOB ───
        const { error: jobError } = await supabaseAdmin.from('submission_jobs').insert({
            submission_id: submission.id,
            status: 'pending',
            attempts: 0,
            max_attempts: 3,
        });

        if (jobError) {
            console.error('[submit-component] Job enqueue failed:', jobError);
            // Submission exists but job failed — mark for retry
        }

        // Reputation is awarded only after explicit admin approval.

        console.log(`[submit-component] Submission ${submission.id} created, job enqueued for async analysis`);

        return res.json({
            success: true,
            submissionId: submission.id,
            message: 'Component submitted. Analysis will prepare it for admin review.',
            statusEndpoint: `/api/community/submission-status/${submission.id}`
        });
    } catch (err) {
        console.error('[submit-component] UNHANDLED EXCEPTION:', err);
        return res.status(500).json({ success: false, error: 'Internal server error processing submission.' });
    }
}
