/**
 * Minimal GitHub REST helpers used by the publish-to-Vercel flow.
 *
 * We deliberately avoid pulling in @octokit/rest for the MVP — the surface
 * we need is tiny (current user, create repo, exchange OAuth code, revoke
 * token) and a thin fetch wrapper keeps the dependency graph clean.
 *
 * If we ever need the Git Data API (blobs/trees/commits) for proper history
 * preservation, switching to Octokit at that point is the natural upgrade.
 */
const GITHUB_API = 'https://api.github.com';
const GITHUB_OAUTH = 'https://github.com/login/oauth';
const USER_AGENT = 'Volturiano-Builder';

class GithubApiError extends Error {
    constructor(message, { status, body } = {}) {
        super(message);
        this.name = 'GithubApiError';
        this.status = status;
        this.body = body;
    }
}

async function ghFetch(url, { method = 'GET', token, body, headers = {} } = {}) {
    const finalHeaders = {
        Accept: 'application/vnd.github+json',
        'User-Agent': USER_AGENT,
        'X-GitHub-Api-Version': '2022-11-28',
        ...headers,
    };
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
    if (body) finalHeaders['Content-Type'] = 'application/json';

    const res = await fetch(url, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    const text = await res.text();
    if (text) {
        try { data = JSON.parse(text); } catch { data = text; }
    }

    if (!res.ok) {
        const message = (data && data.message) || `GitHub API ${method} ${url} failed (HTTP ${res.status})`;
        throw new GithubApiError(message, { status: res.status, body: data });
    }
    return data;
}

/**
 * Exchange an OAuth `code` for an access token.
 * Uses our publishing client id/secret (separate from Supabase login OAuth).
 */
export async function exchangeOAuthCode({ code, redirectUri, clientId, clientSecret }) {
    const res = await fetch(`${GITHUB_OAUTH}/access_token`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT,
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
        }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.error) {
        const message = data?.error_description || data?.error || `Token exchange failed (HTTP ${res.status})`;
        throw new GithubApiError(message, { status: res.status, body: data });
    }
    return {
        accessToken: data.access_token,
        scopes: data.scope || '',
        tokenType: data.token_type || 'bearer',
    };
}

/**
 * GET /user — returns the GitHub identity associated with the token.
 */
export async function getAuthenticatedUser(token) {
    return ghFetch(`${GITHUB_API}/user`, { token });
}

/**
 * POST /user/repos — creates a new repo under the authenticated user's account.
 * GitHub returns 422 if the name already exists; the caller should surface
 * that to the user as "pick a different name or update the existing repo".
 */
export async function createRepo(token, { name, isPrivate = true, description }) {
    return ghFetch(`${GITHUB_API}/user/repos`, {
        method: 'POST',
        token,
        body: {
            name,
            private: !!isPrivate,
            description: description || 'Generated with Volturiano',
            auto_init: false,
            has_issues: false,
            has_projects: false,
            has_wiki: false,
        },
    });
}

/**
 * GET /repos/:owner/:repo — used to confirm an existing repo is still
 * reachable before an "update" push. Returns null on 404 instead of throwing.
 */
export async function getRepo(token, owner, repo) {
    try {
        return await ghFetch(`${GITHUB_API}/repos/${owner}/${repo}`, { token });
    } catch (err) {
        if (err instanceof GithubApiError && err.status === 404) return null;
        throw err;
    }
}

/**
 * Fetch the live production URL for a repo by reading what Vercel wrote back
 * to GitHub. Vercel publishes a real GitHub Deployment for every build, with
 * environment="Production" and an environment_url on the success status —
 * that's the same data GitHub renders in the right-sidebar "Deployments"
 * section. If no deployment is found we fall back to the repo's `homepage`
 * field, which Vercel also tends to set when it imports a repo.
 *
 * Returns null if neither source has anything (e.g. the user hasn't finished
 * the Vercel import yet, or their host is not Vercel).
 */
export async function getLatestProductionUrl(token, owner, repo) {
    // 1) GitHub Deployments API — most reliable, set per-build by Vercel.
    try {
        const deployments = await ghFetch(
            `${GITHUB_API}/repos/${owner}/${repo}/deployments?environment=Production&per_page=10`,
            { token }
        );
        if (Array.isArray(deployments)) {
            for (const dep of deployments) {
                try {
                    const statuses = await ghFetch(
                        `${GITHUB_API}/repos/${owner}/${repo}/deployments/${dep.id}/statuses?per_page=20`,
                        { token }
                    );
                    if (!Array.isArray(statuses)) continue;
                    // Statuses are returned newest-first by GitHub.
                    const success = statuses.find((s) =>
                        s.state === 'success' &&
                        typeof s.environment_url === 'string' &&
                        s.environment_url.length > 0
                    );
                    if (success?.environment_url) {
                        return success.environment_url;
                    }
                } catch {
                    // Fall through and try the next deployment.
                }
            }
        }
    } catch (err) {
        // 404 here means the deployments resource isn't accessible (private
        // repo, removed, etc.) — fall back to the repo metadata path.
        if (!(err instanceof GithubApiError && err.status === 404)) {
            console.warn('[github-api] deployments lookup failed:', err.message);
        }
    }

    // 2) Fallback: repo `homepage` field. Vercel often sets this on import.
    try {
        const repoData = await getRepo(token, owner, repo);
        const homepage = (repoData?.homepage || '').trim();
        if (homepage && /^https?:\/\//i.test(homepage)) return homepage;
    } catch {
        // Already best-effort.
    }

    return null;
}

/**
 * DELETE /applications/:client_id/grant — revokes the token + the user's
 * grant for our OAuth App entirely. Best-effort; failure is logged but does
 * not block the local disconnect.
 *
 * Note: this endpoint requires Basic auth with the OAuth App's client id +
 * client secret, *not* the user's bearer token.
 */
export async function revokeAuthorizationGrant({ clientId, clientSecret, accessToken }) {
    const url = `${GITHUB_API}/applications/${clientId}/grant`;
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(url, {
        method: 'DELETE',
        headers: {
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT,
            Authorization: `Basic ${basic}`,
        },
        body: JSON.stringify({ access_token: accessToken }),
    });
    // 204 = revoked, 404 = already gone. Anything else surfaces as an error.
    if (res.status !== 204 && res.status !== 404) {
        const text = await res.text().catch(() => '');
        throw new GithubApiError(`Failed to revoke grant (HTTP ${res.status})`, {
            status: res.status,
            body: text,
        });
    }
    return true;
}

export { GithubApiError };
