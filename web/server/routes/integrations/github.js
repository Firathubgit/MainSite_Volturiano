/**
 * /api/integrations/github/* — GitHub publishing OAuth + repo push.
 *
 * Distinct from the Supabase "Login with GitHub" flow used for sign-in:
 * this OAuth App carries `repo` scope so we can create/update repos on
 * the user's behalf when they click "Publish to Vercel" in the Builder.
 *
 * Endpoints:
 *   POST /connect        Returns { url } — frontend redirects to it.
 *   GET  /callback       GitHub OAuth callback (no app auth, state-verified).
 *   GET  /status         { connected, githubUsername, connectedAt, repo? }
 *   POST /disconnect     Removes the encrypted token + revokes the grant.
 *   POST /push-project   Force-pushes the active sandbox to the repo.
 */
import { Router } from 'express';
import crypto from 'crypto';

import { requireAuth } from '../../middleware/authMiddleware.js';
import { supabaseAdmin } from '../../lib/supabase-admin.js';
import {
    encryptToken,
    decryptToken,
    signState,
    verifyState,
    assertTokenCryptoConfigured,
} from '../../lib/security/token-crypto.js';
import {
    exchangeOAuthCode,
    getAuthenticatedUser,
    createRepo,
    getRepo,
    getLatestProductionUrl,
    revokeAuthorizationGrant,
    GithubApiError,
} from '../../lib/github/api.js';
import { publishProjectToGithub, buildGithubNoreplyEmail } from '../../lib/github/publish-flow.js';

const router = Router();

// ─── Config helpers ───
function readConfig() {
    const clientId = process.env.GITHUB_PUBLISH_CLIENT_ID;
    const clientSecret = process.env.GITHUB_PUBLISH_CLIENT_SECRET;
    const redirectUri = process.env.GITHUB_PUBLISH_REDIRECT_URI;
    const frontendReturn =
        process.env.GITHUB_PUBLISH_FRONTEND_RETURN_URL ||
        process.env.FRONTEND_URL ||
        'http://localhost:5173';

    return { clientId, clientSecret, redirectUri, frontendReturn };
}

function ensureConfigured(res) {
    const { clientId, clientSecret, redirectUri } = readConfig();
    if (!clientId || !clientSecret || !redirectUri) {
        res.status(503).json({
            success: false,
            error: 'GitHub publishing is not configured on this server. Missing GITHUB_PUBLISH_* environment variables.',
        });
        return false;
    }
    try {
        assertTokenCryptoConfigured();
    } catch (err) {
        res.status(503).json({ success: false, error: err.message });
        return false;
    }
    return true;
}

// ─── Connection storage helpers ───
async function loadConnection(userId) {
    if (!userId || !supabaseAdmin) return null;
    const { data, error } = await supabaseAdmin
        .from('github_connections')
        .select('id, github_user_id, github_username, access_token_encrypted, scopes, connected_at, updated_at')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) {
        console.error('[gh-publish] Failed to read github_connections:', error.message);
        return null;
    }
    return data;
}

async function upsertConnection({ userId, githubUserId, githubUsername, accessToken, scopes }) {
    const access_token_encrypted = encryptToken(accessToken);
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
        .from('github_connections')
        .upsert({
            user_id: userId,
            github_user_id: githubUserId,
            github_username: githubUsername,
            access_token_encrypted,
            scopes,
            connected_at: now,
            updated_at: now,
        }, { onConflict: 'user_id' });
    if (error) throw new Error(`Failed to save GitHub connection: ${error.message}`);
}

// Strip any access tokens that might end up in error logs.
function safeMessage(message) {
    return String(message || '')
        .replace(/x-access-token:[^@\s]+/gi, 'x-access-token:[REDACTED]')
        .replace(/gh[opsu]_[A-Za-z0-9_]{20,}/g, '[REDACTED_GH_TOKEN]');
}

// ═══════════════════════════════════════════════════════════════
//  POST /api/integrations/github/connect
//  Returns the GitHub OAuth authorize URL the frontend should redirect to.
// ═══════════════════════════════════════════════════════════════
router.post('/connect', requireAuth, async (req, res) => {
    if (!ensureConfigured(res)) return;
    const { clientId, redirectUri } = readConfig();

    const state = signState({
        v: 1,
        userId: req.user.id,
        nonce: crypto.randomBytes(16).toString('base64url'),
        exp: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('scope', 'repo user:email');
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('allow_signup', 'true');

    res.json({ success: true, url: authorizeUrl.toString() });
});

// ═══════════════════════════════════════════════════════════════
//  GET /api/integrations/github/callback?code=&state=
//
//  Public — state HMAC signature carries the userId.
//
//  Renders a tiny HTML page that postMessages the result back to
//  window.opener (the popup case — primary path; preserves project +
//  sandbox state in the main tab) and falls back to a full-page redirect
//  when the user landed here outside a popup (popup blocked, link in
//  email, etc.). Either way the FE only needs to listen for the message
//  OR read the URL flag — both work.
// ═══════════════════════════════════════════════════════════════
function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderCallbackHtml({ status, username, reason, frontendReturnUrl }) {
    const fallbackUrl = new URL(frontendReturnUrl);
    fallbackUrl.searchParams.set('github', status);
    if (username) fallbackUrl.searchParams.set('username', username);
    if (reason) fallbackUrl.searchParams.set('reason', String(reason).slice(0, 80));

    const targetOrigin = (() => {
        try { return new URL(frontendReturnUrl).origin; } catch { return '*'; }
    })();

    const payload = {
        type: 'volturiano-gh-publish',
        status,
        username: username || null,
        reason: reason || null,
    };

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Volturiano GitHub Publishing</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  html, body { margin:0; padding:0; background:#0a0a0f; color:#e5e7eb;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-height: 100vh; display:flex; align-items:center; justify-content:center; }
  .card { padding: 28px 32px; border:1px solid rgba(255,255,255,0.08);
    border-radius:14px; background:rgba(255,255,255,0.03); text-align:center; max-width: 380px; }
  .ok { color: #2dd4bf; }
  .err { color: #f87171; }
  a { color: #fff; text-decoration: underline; text-underline-offset: 3px; }
  small { display:block; margin-top:10px; opacity:0.6; }
</style>
</head>
<body>
  <div class="card">
    <div class="${status === 'connected' ? 'ok' : 'err'}" style="font-weight:600; font-size: 1.05rem; margin-bottom:8px;">
      ${status === 'connected' ? 'GitHub connected' : 'GitHub connection failed'}
    </div>
    <div style="font-size:0.85rem; opacity:0.75;">
      ${status === 'connected'
        ? `Linked as <strong>@${escapeHtml(username || '')}</strong>. You can close this window.`
        : `Reason: ${escapeHtml(reason || 'unknown')}.`}
    </div>
    <small>If this window does not close on its own, <a href="${escapeHtml(fallbackUrl.toString())}">return to Volturiano</a>.</small>
  </div>
<script>
(function(){
  var payload = ${JSON.stringify(payload)};
  var targetOrigin = ${JSON.stringify(targetOrigin)};
  var fallback = ${JSON.stringify(fallbackUrl.toString())};
  function notifyAndClose(){
    try {
      if (window.opener && !window.opener.closed) {
        // Tell the main tab the OAuth result; it'll re-check /status.
        window.opener.postMessage(payload, targetOrigin);
        // Brief delay so the receiver definitely runs before we close.
        setTimeout(function(){ try { window.close(); } catch(_){} }, 150);
        return;
      }
    } catch(_){}
    // No opener (user navigated here directly) — fall back to redirect.
    window.location.replace(fallback);
  }
  // Guard against rare races where opener exists but isn't ready yet.
  if (document.readyState === 'complete') notifyAndClose();
  else window.addEventListener('load', notifyAndClose);
})();
</script>
</body>
</html>`;
}

router.get('/callback', async (req, res) => {
    const { clientId, clientSecret, redirectUri, frontendReturn } = readConfig();
    if (!clientId || !clientSecret || !redirectUri) {
        return res.status(503).send('GitHub publishing is not configured on this server.');
    }

    const sendResult = (status, extras = {}) => {
        const html = renderCallbackHtml({
            status,
            username: extras.username,
            reason: extras.reason,
            frontendReturnUrl: frontendReturn,
        });
        res.set('Content-Type', 'text/html; charset=utf-8');
        // Don't leak the page (and any state-derived data) into shared caches.
        res.set('Cache-Control', 'no-store');
        res.send(html);
    };

    const { code, state, error: providerError } = req.query;

    if (providerError) {
        return sendResult('error', { reason: String(providerError).slice(0, 80) });
    }
    if (!code || !state) {
        return sendResult('error', { reason: 'missing_params' });
    }

    const decoded = verifyState(state);
    if (!decoded || !decoded.userId) {
        return sendResult('error', { reason: 'invalid_state' });
    }

    try {
        const { accessToken, scopes } = await exchangeOAuthCode({
            code,
            redirectUri,
            clientId,
            clientSecret,
        });

        const ghUser = await getAuthenticatedUser(accessToken);
        await upsertConnection({
            userId: decoded.userId,
            githubUserId: ghUser.id,
            githubUsername: ghUser.login,
            accessToken,
            scopes,
        });

        return sendResult('connected', { username: ghUser.login });
    } catch (err) {
        console.error('[gh-publish] Callback failed:', safeMessage(err.message));
        return sendResult('error', { reason: 'token_exchange_failed' });
    }
});

// ═══════════════════════════════════════════════════════════════
//  GET /api/integrations/github/status
// ═══════════════════════════════════════════════════════════════
router.get('/status', requireAuth, async (req, res) => {
    if (!ensureConfigured(res)) return;
    try {
        const conn = await loadConnection(req.user.id);
        if (!conn) {
            return res.json({ success: true, connected: false });
        }
        return res.json({
            success: true,
            connected: true,
            githubUsername: conn.github_username,
            connectedAt: conn.connected_at,
            scopes: conn.scopes || null,
        });
    } catch (err) {
        console.error('[gh-publish] Status failed:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to read GitHub connection' });
    }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/integrations/github/disconnect
//  Removes the local encrypted token and best-effort revokes the grant
//  on github.com so the user has nothing lingering on either side.
// ═══════════════════════════════════════════════════════════════
router.post('/disconnect', requireAuth, async (req, res) => {
    if (!ensureConfigured(res)) return;
    const { clientId, clientSecret } = readConfig();

    try {
        const conn = await loadConnection(req.user.id);
        if (!conn) {
            return res.json({ success: true, alreadyDisconnected: true });
        }

        let token = null;
        try {
            token = decryptToken(conn.access_token_encrypted);
        } catch (err) {
            console.warn('[gh-publish] Stored token failed to decrypt during disconnect — likely after a key rotation. Proceeding with local delete.');
        }

        if (token) {
            try {
                await revokeAuthorizationGrant({ clientId, clientSecret, accessToken: token });
            } catch (err) {
                console.warn('[gh-publish] Grant revoke failed:', safeMessage(err.message));
            }
        }

        await supabaseAdmin
            .from('github_connections')
            .delete()
            .eq('user_id', req.user.id);

        return res.json({ success: true });
    } catch (err) {
        console.error('[gh-publish] Disconnect failed:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to disconnect GitHub' });
    }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/integrations/github/refresh-vercel-url
//  Auto-detect the live URL by reading what Vercel writes back to
//  GitHub: GitHub Deployments (environment_url) plus the repo's
//  `homepage` field as fallback. Cheap, uses our existing `repo`
//  scope, no second OAuth integration required.
// ═══════════════════════════════════════════════════════════════
router.post('/refresh-vercel-url', requireAuth, async (req, res) => {
    if (!ensureConfigured(res)) return;
    const { projectId } = req.body || {};
    if (!projectId) {
        return res.status(400).json({ success: false, error: 'projectId is required' });
    }

    try {
        const conn = await loadConnection(req.user.id);
        if (!conn) {
            return res.status(409).json({
                success: false,
                error: 'No GitHub connection.',
                code: 'NOT_CONNECTED',
            });
        }

        const { data: project, error: projectError } = await supabaseAdmin
            .from('projects')
            .select('id, user_id, github_repo_owner, github_repo_name, vercel_deployed_url')
            .eq('id', projectId)
            .eq('user_id', req.user.id)
            .maybeSingle();
        if (projectError) throw projectError;
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        if (!project.github_repo_owner || !project.github_repo_name) {
            // Nothing to look up yet — caller should fall through to manual.
            return res.json({
                success: true,
                vercelDeployedUrl: project.vercel_deployed_url || null,
                source: 'cached',
            });
        }

        let token;
        try {
            token = decryptToken(conn.access_token_encrypted);
        } catch {
            return res.status(401).json({
                success: false,
                error: 'Stored GitHub token is unreadable. Please reconnect GitHub.',
                code: 'TOKEN_DECRYPT_FAILED',
            });
        }

        const fetchedUrl = await getLatestProductionUrl(
            token,
            project.github_repo_owner,
            project.github_repo_name
        );

        if (fetchedUrl && fetchedUrl !== project.vercel_deployed_url) {
            await supabaseAdmin
                .from('projects')
                .update({
                    vercel_deployed_url: fetchedUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', projectId)
                .eq('user_id', req.user.id);
        }

        return res.json({
            success: true,
            vercelDeployedUrl: fetchedUrl || project.vercel_deployed_url || null,
            source: fetchedUrl ? 'github' : (project.vercel_deployed_url ? 'cached' : 'none'),
        });
    } catch (err) {
        console.error('[gh-publish] refresh-vercel-url failed:', safeMessage(err.message));
        return res.status(500).json({
            success: false,
            error: 'Failed to refresh Vercel URL',
        });
    }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/integrations/github/vercel-url
//  Manual fallback if the auto-detect via GitHub Deployments doesn't
//  pick anything up (rare — e.g. user disabled Vercel's GitHub
//  integration). Body: { projectId, url }, url='' to clear.
// ═══════════════════════════════════════════════════════════════
router.post('/vercel-url', requireAuth, async (req, res) => {
    const { projectId, url } = req.body || {};
    if (!projectId) {
        return res.status(400).json({ success: false, error: 'projectId is required' });
    }

    let cleanUrl = null;
    if (url && typeof url === 'string') {
        const trimmed = url.trim();
        if (trimmed) {
            const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
            try {
                const parsed = new URL(candidate);
                if (!['http:', 'https:'].includes(parsed.protocol)) {
                    return res.status(400).json({ success: false, error: 'URL must be http(s)' });
                }
                cleanUrl = parsed.toString().replace(/\/+$/, '');
            } catch {
                return res.status(400).json({ success: false, error: 'Invalid URL' });
            }
        }
    }

    try {
        const { error } = await supabaseAdmin
            .from('projects')
            .update({
                vercel_deployed_url: cleanUrl,
                updated_at: new Date().toISOString(),
            })
            .eq('id', projectId)
            .eq('user_id', req.user.id);
        if (error) throw error;
        return res.json({ success: true, vercelDeployedUrl: cleanUrl });
    } catch (err) {
        console.error('[gh-publish] save vercel-url failed:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to save Vercel URL' });
    }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/integrations/github/push-project
//  Body: { projectId, sandboxId?, repoName, visibility?, isUpdate? }
//  Returns: { repoUrl, vercelImportUrl, commitSha, branch, owner, repo }
// ═══════════════════════════════════════════════════════════════
router.post('/push-project', requireAuth, async (req, res) => {
    if (!ensureConfigured(res)) return;
    const { projectId, repoName, visibility = 'private', isUpdate = false } = req.body || {};

    if (!projectId || !repoName) {
        return res.status(400).json({ success: false, error: 'projectId and repoName are required' });
    }
    if (!/^[A-Za-z0-9._-]{1,100}$/.test(repoName)) {
        return res.status(400).json({
            success: false,
            error: 'Repo name must use only letters, numbers, dots, dashes, or underscores (max 100 chars).',
        });
    }

    try {
        const conn = await loadConnection(req.user.id);
        if (!conn) {
            return res.status(409).json({
                success: false,
                error: 'No GitHub connection. Please connect your GitHub account first.',
                code: 'NOT_CONNECTED',
            });
        }

        const { data: project, error: projectError } = await supabaseAdmin
            .from('projects')
            .select('id, user_id, name, github_repo_owner, github_repo_name')
            .eq('id', projectId)
            .eq('user_id', req.user.id)
            .maybeSingle();

        if (projectError) throw projectError;
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const sandboxProvider = global.activeSandboxProvider;
        if (!sandboxProvider) {
            return res.status(409).json({
                success: false,
                error: 'No active sandbox. Open the project in the Builder so we can package its files.',
                code: 'NO_ACTIVE_SANDBOX',
            });
        }

        let token;
        try {
            token = decryptToken(conn.access_token_encrypted);
        } catch (err) {
            return res.status(401).json({
                success: false,
                error: 'Stored GitHub token is unreadable. Please reconnect GitHub.',
                code: 'TOKEN_DECRYPT_FAILED',
            });
        }

        const owner = conn.github_username;
        const wantsUpdate = !!isUpdate || (!!project.github_repo_owner && !!project.github_repo_name);

        // First-push: create the repo. Update: confirm it still exists.
        if (!wantsUpdate) {
            try {
                await createRepo(token, {
                    name: repoName,
                    isPrivate: visibility !== 'public',
                    description: project.name ? `Volturiano build: ${project.name}` : undefined,
                });
            } catch (err) {
                if (err instanceof GithubApiError && err.status === 422) {
                    return res.status(409).json({
                        success: false,
                        error: 'A repo with that name already exists. Pick a different name or update the existing repo.',
                        code: 'REPO_NAME_TAKEN',
                    });
                }
                if (err instanceof GithubApiError && err.status === 401) {
                    return res.status(401).json({
                        success: false,
                        error: 'GitHub rejected the stored token. Please reconnect GitHub.',
                        code: 'TOKEN_REJECTED',
                    });
                }
                throw err;
            }
        } else {
            const existing = await getRepo(token, owner, repoName);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: `Repo ${owner}/${repoName} no longer exists. Pick a different name to create a fresh repo.`,
                    code: 'REPO_GONE',
                });
            }
        }

        // Push the sandbox into the repo. For an update we parent the new
        // commit on the existing remote tip so GitHub shows real history
        // and Vercel sees a normal incremental commit (no force-push).
        // Commit author email is the GitHub no-reply form so commits
        // attribute to the user on github.com without leaking their primary.
        const pushResult = await publishProjectToGithub({
            sandboxProvider,
            token,
            owner,
            repo: repoName,
            isUpdate: wantsUpdate,
            commitAuthorEmail: buildGithubNoreplyEmail({
                githubUserId: conn.github_user_id,
                githubUsername: conn.github_username,
            }),
            commitAuthorName: conn.github_username || 'Volturiano Publisher',
            commitMessage: wantsUpdate ? 'Volturiano publish (update)' : 'Volturiano publish',
        });

        const repoUrl = `https://github.com/${owner}/${repoName}`;
        // /new/import is for importing an existing GitHub repo into a new
        // Vercel project. Don't use /new/clone — that's the "deploy
        // button" flow for *template* repos, which calls Vercel's
        // /api/v1/integrations/push-to-repo to fork the template into a
        // new repo on the user's account. Since we already pushed the
        // user's own repo, that endpoint 404s ("repo already exists").
        const vercelImportUrl =
            `https://vercel.com/new/import?` +
            `s=${encodeURIComponent(repoUrl)}` +
            `&provider=github` +
            `&owner=${encodeURIComponent(owner)}` +
            `&project-name=${encodeURIComponent(repoName)}`;

        await supabaseAdmin
            .from('projects')
            .update({
                github_repo_owner: owner,
                github_repo_name: repoName,
                github_repo_url: repoUrl,
                github_branch: pushResult.branch,
                github_last_commit_sha: pushResult.commitSha,
                github_connected_at: project.github_repo_owner ? undefined : new Date().toISOString(),
                last_github_push_at: new Date().toISOString(),
                github_pushed_at: new Date().toISOString(),
                vercel_import_url: vercelImportUrl,
                publish_status: wantsUpdate ? 'updated' : 'pushed',
                updated_at: new Date().toISOString(),
            })
            .eq('id', projectId)
            .eq('user_id', req.user.id);

        return res.json({
            success: true,
            owner,
            repo: repoName,
            repoUrl,
            branch: pushResult.branch,
            commitSha: pushResult.commitSha,
            vercelImportUrl,
            visibility: visibility === 'public' ? 'public' : 'private',
            isUpdate: wantsUpdate,
        });
    } catch (err) {
        console.error('[gh-publish] push-project failed:', safeMessage(err.message), err.stack ? safeMessage(err.stack) : '');
        if (err instanceof GithubApiError) {
            return res.status(err.status >= 400 && err.status < 600 ? err.status : 500).json({
                success: false,
                error: safeMessage(err.message),
            });
        }
        return res.status(500).json({
            success: false,
            error: safeMessage(err.message || 'Failed to publish to GitHub'),
        });
    }
});

export default router;
