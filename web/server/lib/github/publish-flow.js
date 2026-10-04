/**
 * Pushes the current contents of the active E2B sandbox to a GitHub
 * repo via shell `git`, using the user's OAuth token only as a runtime env
 * var (never written to disk, never logged).
 *
 * Strategy:
 *   - First push (`isUpdate=false`): orphan commit, plain push to a brand
 *     new branch. The repo we're pushing to was just created via REST and
 *     is empty, so there's nothing to parent against.
 *   - Update push (`isUpdate=true`): we still wipe `.git` for a clean
 *     working state, BUT we then `git fetch` the remote `main` and
 *     `git reset --soft FETCH_HEAD` before staging. That makes the new
 *     commit a proper child of the previous remote tip — so GitHub shows
 *     real commit history (2, 3, 4 commits over time, not "1 Commit"
 *     forever) and Vercel sees a normal incremental update instead of a
 *     non-fast-forward force-push.
 */

const SANDBOX_ROOT = '/home/user/app';

/**
 * The .gitignore mirrors the exclusion patterns from /api/create-zip plus
 * `.env*` so users don't accidentally publish their own secrets.
 */
const GITIGNORE_BODY = [
    'node_modules/',
    '.next/',
    'dist/',
    'build/',
    'out/',
    '*.log',
    '.DS_Store',
    '.env',
    '.env.*',
    '!.env.example',
    '.vercel/',
].join('\n');

function redact(s) {
    return String(s || '')
        .replace(/x-access-token:[^@\s]+/gi, 'x-access-token:[REDACTED]')
        .replace(/gh[opsu]_[A-Za-z0-9_]{20,}/g, '[REDACTED_GH_TOKEN]');
}

async function runOrThrow(provider, label, command, opts = {}) {
    const result = await provider.runCommand(command, opts);
    if (!result.success) {
        const stderr = redact(result.stderr || result.stdout || '').slice(0, 800);
        throw new Error(`[publish-flow] ${label} failed (exit ${result.exitCode}): ${stderr}`);
    }
    return result;
}

/**
 * Build the GitHub no-reply email for a connected user. This format
 * (`{id}+{username}@users.noreply.github.com`) makes commits show up on
 * the user's GitHub profile and contribution graph, survives username
 * changes (because the numeric id is stable), and respects their email
 * privacy settings.
 *
 * Falls back to `{username}@users.noreply.github.com` if the numeric id
 * isn't available, and finally to a generic publisher email.
 */
export function buildGithubNoreplyEmail({ githubUserId, githubUsername }) {
    if (githubUsername && githubUserId) {
        return `${githubUserId}+${githubUsername}@users.noreply.github.com`;
    }
    if (githubUsername) {
        return `${githubUsername}@users.noreply.github.com`;
    }
    return 'volturiano-agent@users.noreply.github.com';
}

/**
 * Pushes the sandbox contents to {owner}/{repo}. Caller is responsible
 * for having created the repo (or confirming it exists) before invoking.
 *
 * @param {object} opts
 * @param {boolean} opts.isUpdate    True if the repo already has a `main`
 *                                   we should parent the new commit on.
 * @returns {Promise<{ commitSha: string, branch: string }>}
 */
export async function publishProjectToGithub({
    sandboxProvider,
    token,
    owner,
    repo,
    isUpdate = false,
    commitAuthorEmail = 'volturiano-agent@users.noreply.github.com',
    commitAuthorName = 'Volturiano Agent',
    commitMessage = 'Publish from Volturiano Agent',
}) {
    if (!sandboxProvider) throw new Error('publish-flow: sandboxProvider is required');
    if (!token) throw new Error('publish-flow: token is required');
    if (!owner || !repo) throw new Error('publish-flow: owner and repo are required');

    const branch = 'main';
    // Authenticated remote URL — the literal `$GH_TOKEN` here is expanded
    // by the shell at runtime from `envs`, so the token never appears in
    // the command string we hand to provider.runCommand.
    const remoteUrl = `https://x-access-token:\${GH_TOKEN}@github.com/${owner}/${repo}.git`;

    // 1) Write .gitignore (idempotent — we always overwrite).
    //    base64 round-trip avoids shell-escaping issues for user content.
    const ignoreB64 = Buffer.from(GITIGNORE_BODY, 'utf8').toString('base64');
    await runOrThrow(
        sandboxProvider,
        'write .gitignore',
        `cd ${SANDBOX_ROOT} && printf '%s' '${ignoreB64}' | base64 -d > .gitignore`
    );

    // 2) Clean any prior .git, init a fresh repo, identify the publisher.
    //    No token in this command — it stays in the clean log stream.
    await runOrThrow(
        sandboxProvider,
        'init repo',
        [
            `cd ${SANDBOX_ROOT}`,
            'rm -rf .git',
            `git init -b ${branch}`,
            `git config user.email ${shellQuote(commitAuthorEmail)}`,
            `git config user.name ${shellQuote(commitAuthorName)}`,
        ].join(' && ')
    );

    // 3) Update path: fetch the existing remote `main` and reset --soft to
    //    its tip. After this, our index reflects the previous commit; when
    //    we add+commit below the new commit will be a proper child of it,
    //    so GitHub shows real history (1, 2, 3, ... commits) and Vercel
    //    sees an incremental fast-forward instead of a force-push.
    if (isUpdate) {
        const fetchScript = [
            `cd ${SANDBOX_ROOT}`,
            `git fetch "${remoteUrl}" ${branch}`,
            'git reset --soft FETCH_HEAD',
        ].join(' && ');
        await runOrThrow(sandboxProvider, 'fetch + reset', fetchScript, {
            envs: { GH_TOKEN: token },
            silent: true,
            timeoutMs: 120000,
        });
    }

    // 4) Stage everything and commit. `--allow-empty` covers the case
    //    where the sandbox content is identical to the remote tip — git
    //    would otherwise refuse and a "nothing to commit" failure would
    //    surface as a confusing publish error.
    await runOrThrow(
        sandboxProvider,
        'add + commit',
        [
            `cd ${SANDBOX_ROOT}`,
            'git add -A',
            `git commit --allow-empty -m ${shellQuote(commitMessage)}`,
        ].join(' && ')
    );

    // 5) Push. For first-push the remote main doesn't exist yet, so this
    //    creates it. For update we've already reset to the remote tip, so
    //    the new commit is a fast-forward — no --force needed, history is
    //    preserved on GitHub.
    const pushScript = [
        `cd ${SANDBOX_ROOT}`,
        `git push "${remoteUrl}" HEAD:${branch}`,
    ].join(' && ');
    await runOrThrow(sandboxProvider, 'push', pushScript, {
        envs: { GH_TOKEN: token },
        silent: true,
        timeoutMs: 120000,
    });

    // 6) Capture the new HEAD sha for projects.github_last_commit_sha.
    const sha = await runOrThrow(
        sandboxProvider,
        'rev-parse HEAD',
        `cd ${SANDBOX_ROOT} && git rev-parse HEAD`
    );
    const commitSha = (sha.stdout || '').trim().slice(0, 40);

    return { commitSha, branch };
}

// Tiny POSIX-shell quoter for the commit message + author identity.
// Wraps in single quotes and escapes embedded single quotes.
function shellQuote(s) {
    return `'${String(s).replace(/'/g, `'\\''`)}'`;
}
