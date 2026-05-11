import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './PublishToVercelModal.module.css';

// ─── Inline brand SVGs ───
function GitHubIcon({ className }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path
                fill="currentColor"
                d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.18c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.74 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17a10.96 10.96 0 0 1 5.74 0c2.18-1.48 3.14-1.17 3.14-1.17.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.7 5.36-5.27 5.65.41.36.78 1.06.78 2.14v3.18c0 .31.21.67.8.55A11.5 11.5 0 0 0 12 .5Z"
            />
        </svg>
    );
}
function VercelIcon({ className }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path fill="currentColor" d="M12 2 23 21H1L12 2Z" />
        </svg>
    );
}

// ─── Helpers ───
function kebab(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/[^a-z0-9-_.]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '')
        .slice(0, 80) || '';
}

const REPO_NAME_REGEX = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Modal walks through five states:
 *   loading      -> calling /status + /projects/get
 *   notConnected -> show "Connect GitHub"
 *   ready        -> repo name + visibility, confirm push
 *   pushing      -> spinner + status text
 *   done         -> repo URL + Open in Vercel
 */
export default function PublishToVercelModal({
    isOpen,
    onClose,
    projectId,
    projectName,
    authFetch,
    // Optional: lets the parent (Generation) cache repo metadata so its
    // export dropdown can flip to "Update on GitHub" without waiting for
    // the modal to be opened a second time.
    onPublishMetaChange,
}) {
    const [phase, setPhase] = useState('loading');
    const [conn, setConn] = useState(null);
    const [existingRepo, setExistingRepo] = useState(null); // { owner, repoName } or null
    const [vercelDeployedUrl, setVercelDeployedUrl] = useState(null);
    const [repoName, setRepoName] = useState('');
    const [visibility, setVisibility] = useState('private');
    const [error, setError] = useState(null);
    const [pushResult, setPushResult] = useState(null);
    const [pushStep, setPushStep] = useState(null); // 'creating' | 'pushing'
    const [busy, setBusy] = useState(false);
    const cancelledRef = useRef(false);

    const hasExistingRepo = !!(existingRepo?.owner && existingRepo?.repoName);

    // Declared up-front so refreshStatus (below) can reference it in its
    // dependency array without hitting a temporal-dead-zone error.
    // Auto-detect the live Vercel URL by reading what Vercel writes back
    // to GitHub (Deployments API + repo homepage). Non-blocking and silent
    // on failure — the manual paste field is the last-resort fallback.
    const autoRefreshVercelUrl = useCallback(async () => {
        if (!projectId) return;
        try {
            const res = await authFetch('/api/integrations/github/refresh-vercel-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
            const data = await res.json();
            if (cancelledRef.current) return;
            if (data?.success && data.vercelDeployedUrl) {
                setVercelDeployedUrl(data.vercelDeployedUrl);
            }
        } catch (_) { /* non-fatal — silent failure, link just stays empty */ }
    }, [authFetch, projectId]);

    // ─── Status + project-meta load ───
    const refreshStatus = useCallback(async () => {
        try {
            const [statusRes, projectRes] = await Promise.all([
                authFetch('/api/integrations/github/status'),
                projectId
                    ? authFetch(`/api/projects/get?projectId=${encodeURIComponent(projectId)}`)
                    : Promise.resolve(null),
            ]);

            const statusData = await statusRes.json();
            if (cancelledRef.current) return;
            if (!statusData.success) throw new Error(statusData.error || 'Status check failed');

            let projectHasRepo = false;
            if (projectRes) {
                try {
                    const projectData = await projectRes.json();
                    if (projectData?.success && projectData.project) {
                        const p = projectData.project;
                        if (p.github_repo_owner && p.github_repo_name) {
                            setExistingRepo({ owner: p.github_repo_owner, repoName: p.github_repo_name });
                            setRepoName(p.github_repo_name);
                            projectHasRepo = true;
                            if (onPublishMetaChange) {
                                onPublishMetaChange({
                                    owner: p.github_repo_owner,
                                    repoName: p.github_repo_name,
                                });
                            }
                        } else {
                            setExistingRepo(null);
                            setRepoName((prev) => prev || kebab(projectName || p.name || ''));
                            if (onPublishMetaChange) onPublishMetaChange(null);
                        }
                        setVercelDeployedUrl(p.vercel_deployed_url || null);
                    }
                } catch (_) { /* non-fatal — modal still works for create-new */ }
            } else if (!repoName) {
                setRepoName(kebab(projectName || ''));
            }

            if (statusData.connected) {
                setConn({
                    githubUsername: statusData.githubUsername,
                    connectedAt: statusData.connectedAt,
                });
                setPhase('ready');

                // Once we know the project has an existing repo and we're
                // connected, auto-fetch the live URL via GitHub Deployments.
                // Vercel writes this back on every successful build, so the
                // user gets the URL automatically without ever pasting it.
                if (projectHasRepo) autoRefreshVercelUrl();
            } else {
                setConn(null);
                setPhase('notConnected');
            }
        } catch (err) {
            setError(err.message || 'Failed to check GitHub connection');
            setPhase('notConnected');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authFetch, projectId, projectName, autoRefreshVercelUrl, onPublishMetaChange]);

    useEffect(() => {
        if (!isOpen) return;
        cancelledRef.current = false;
        setError(null);
        setPushResult(null);
        setPushStep(null);
        setPhase('loading');
        refreshStatus();

        // If we just landed back from the OAuth callback, surface the toast
        // and clean the URL so a refresh doesn't re-trigger this branch.
        try {
            const url = new URL(window.location.href);
            const flag = url.searchParams.get('github');
            const reason = url.searchParams.get('reason');
            if (flag === 'error' && reason) {
                setError(`GitHub connection failed (${reason}). Please try again.`);
            }
            if (flag === 'connected' || flag === 'error') {
                url.searchParams.delete('github');
                url.searchParams.delete('username');
                url.searchParams.delete('reason');
                window.history.replaceState({}, '', url.toString());
            }
        } catch (_) { /* non-browser env */ }

        return () => { cancelledRef.current = true; };
    }, [isOpen, refreshStatus]);

    // Close on Escape.
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, busy, onClose]);

    // Auto-close after a successful update push. The user explicitly asked
    // for this: when there is already a repo, an update should feel like a
    // single confirmation rather than a multi-step modal — push, brief
    // success, gone.
    useEffect(() => {
        if (phase === 'done' && pushResult?.isUpdate) {
            const t = setTimeout(() => onClose(), 1600);
            return () => clearTimeout(t);
        }
    }, [phase, pushResult, onClose]);


    // ─── Connect GitHub ───
    // We open the OAuth flow in a popup window so the main tab keeps its
    // sandbox + project state. The callback page postMessages back to us
    // and self-closes; we re-fetch /status and stay on the same modal.
    // If the popup is blocked, we fall back to a full-page redirect — the
    // modal auto-reopens via the `?github=connected` URL flag, but the
    // user will need to reload their project (we surface a hint for that).
    const handleConnect = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await authFetch('/api/integrations/github/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            });
            const data = await res.json();
            if (!data.success || !data.url) {
                throw new Error(data.error || 'Could not start GitHub OAuth');
            }

            // Try popup first. width/height keeps GitHub's auth screen comfortable.
            const w = 720;
            const h = 820;
            const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
            const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
            const features = `popup=yes,width=${w},height=${h},left=${Math.round(left)},top=${Math.round(top)},scrollbars=yes,resizable=yes,noopener=no`;
            const popup = window.open(data.url, 'volturiano-gh-publish', features);

            if (!popup || popup.closed || typeof popup.closed === 'undefined') {
                // Popup blocked. Fall back to a full-page redirect — we'll
                // pick up the result via the URL flag on the next mount.
                window.location.href = data.url;
                return;
            }

            // Listen for the postMessage from the callback HTML.
            // Backend serves the callback from the API origin (e.g.
            // localhost:3001), so we accept messages whose origin matches
            // *any* of the configured trusted origins. We additionally
            // require the message `type` flag as a defense-in-depth marker.
            const apiOriginGuess = (() => {
                try { return new URL(data.url).origin; } catch { return null; }
            })();

            const cleanup = () => {
                window.removeEventListener('message', onMessage);
                clearInterval(pollClosed);
                setBusy(false);
            };

            const onMessage = (event) => {
                // Trust check: same-origin, or our API origin (dev cross-port).
                const trustedOrigins = new Set([
                    window.location.origin,
                    apiOriginGuess,
                ].filter(Boolean));
                if (!trustedOrigins.has(event.origin)) return;
                const msg = event.data;
                if (!msg || msg.type !== 'volturiano-gh-publish') return;

                cleanup();
                if (msg.status === 'connected') {
                    setError(null);
                    refreshStatus();
                } else {
                    setError(`GitHub connection failed (${msg.reason || 'unknown'}). Please try again.`);
                }
                try { popup.close(); } catch (_) { /* already closed */ }
            };
            window.addEventListener('message', onMessage);

            // If the user closes the popup manually without authorizing,
            // recover gracefully so the button isn't stuck in busy state.
            const pollClosed = setInterval(() => {
                if (popup.closed) {
                    cleanup();
                    // Re-check status — they might have completed in another tab.
                    refreshStatus();
                }
            }, 600);
        } catch (err) {
            setError(err.message || 'Failed to start GitHub OAuth');
            setBusy(false);
        }
    }, [authFetch, refreshStatus]);

    // ─── Disconnect ───
    const handleDisconnect = useCallback(async () => {
        if (!window.confirm('Disconnect GitHub? You will need to reconnect to publish again.')) return;
        setBusy(true);
        setError(null);
        try {
            await authFetch('/api/integrations/github/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            });
        } catch (_) { /* even if it fails server-side, fall through to refresh */ }
        finally {
            setBusy(false);
            refreshStatus();
        }
    }, [authFetch, refreshStatus]);

    // ─── Push ───
    const handlePush = useCallback(async () => {
        const name = repoName.trim();
        if (!REPO_NAME_REGEX.test(name)) {
            setError('Repo name must be 1–100 chars: letters, numbers, dots, dashes, or underscores.');
            return;
        }
        if (!projectId) {
            setError('No project to publish. Open the project in the Builder first.');
            return;
        }
        setBusy(true);
        setError(null);
        setPhase('pushing');
        setPushStep(hasExistingRepo ? 'pushing' : 'creating');

        try {
            // The backend handles "create vs update" itself based on payload +
            // existing project metadata; we just hint the local UI.
            const res = await authFetch('/api/integrations/github/push-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    repoName: name,
                    visibility,
                    isUpdate: hasExistingRepo,
                }),
            });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Publish failed');
            }
            setPushResult(data);
            setPhase('done');
            // First publish? Tell the parent so its export dropdown can
            // flip from "Publish to Vercel" to "Update on GitHub" right
            // away (and the next push runs through the simplified card).
            if (!data.isUpdate && data.owner && data.repo && onPublishMetaChange) {
                onPublishMetaChange({ owner: data.owner, repoName: data.repo });
                setExistingRepo({ owner: data.owner, repoName: data.repo });
            }
            // Fire-and-forget: poll GitHub Deployments to pick up the new
            // production URL once the host (Vercel/etc.) finishes building.
            // Silent on failure — the next modal open will catch it.
            autoRefreshVercelUrl();
        } catch (err) {
            setError(err.message || 'Publish failed');
            setPhase('ready');
        } finally {
            setBusy(false);
            setPushStep(null);
        }
    }, [authFetch, projectId, repoName, visibility, hasExistingRepo, autoRefreshVercelUrl, onPublishMetaChange]);

    const repoUrlPreview = useMemo(() => {
        if (!conn?.githubUsername || !repoName) return null;
        return `github.com/${conn.githubUsername}/${repoName.trim()}`;
    }, [conn?.githubUsername, repoName]);

    if (!isOpen) return null;

    // ─── Title + icon vary by phase ───
    // Configure (create new) / pushing → "Publish to Github" with GH logo.
    // First-publish success → "Publish to Vercel" with Vercel triangle (the
    //   moment we're handing the user off to Vercel).
    // Update flow + update success → "Update on Github" with GH logo.
    let HeaderIcon = GitHubIcon;
    let headerLabel = 'Publish to Github';
    if (phase === 'pushing') {
        HeaderIcon = GitHubIcon;
        headerLabel = hasExistingRepo ? 'Pushing to github...' : 'Pushing to github...';
    } else if (phase === 'done' && pushResult && !pushResult.isUpdate) {
        HeaderIcon = VercelIcon;
        headerLabel = 'Publish to Vercel';
    } else if (hasExistingRepo) {
        HeaderIcon = GitHubIcon;
        headerLabel = 'Update on Github';
    }

    return (
        <div className={styles.overlay} onClick={!busy ? onClose : undefined}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.headerRow}>
                    <div className={styles.titleGroup}>
                        <HeaderIcon className={styles.titleIcon} />
                        <h3 className={styles.title}>{headerLabel}</h3>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} disabled={busy} aria-label="Close">
                        ×
                    </button>
                </div>

                {phase === 'loading' && (
                    <div className={styles.checkingRow}>
                        <span className={styles.spinner} /> Checking your GitHub connection...
                    </div>
                )}

                {/* ─── NOT CONNECTED — primary "Connect GitHub" CTA ─── */}
                {phase === 'notConnected' && (
                    <>
                        <div className={styles.consentBanner}>
                            <strong>Volturiano will create or update a GitHub repository on your behalf.</strong>{' '}
                            We&apos;ll only act when you click Publish. You can disconnect at any time, and your code is yours.
                        </div>
                        {error && <div className={styles.errorBox}>{error}</div>}
                        <button
                            className={styles.primaryBtn}
                            onClick={handleConnect}
                            disabled={busy}
                        >
                            {busy
                                ? <span className={`${styles.spinner} ${styles.dark}`} />
                                : <GitHubIcon className={styles.primaryBtnIcon} />}
                            Connect GitHub
                        </button>
                        <button className={styles.cancelBtn} onClick={onClose} disabled={busy}>
                            Not now
                        </button>
                    </>
                )}

                {/* ─── READY (UPDATE) — simplified card matching UpdateOnGithubFigma ─── */}
                {phase === 'ready' && conn && hasExistingRepo && (
                    <>
                        <a
                            href={`https://github.com/${existingRepo.owner}/${existingRepo.repoName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.repoUrlLine}
                        >
                            https://github.com/{existingRepo.owner}/{existingRepo.repoName}
                        </a>

                        <div className={styles.liveUrlGroup}>
                            <div className={styles.liveUrlHeader}>
                                <span className={styles.liveUrlLabel}>LIVE URL</span>
                                <button
                                    className={styles.liveUrlRefresh}
                                    onClick={autoRefreshVercelUrl}
                                    disabled={busy}
                                    title="Re-check GitHub Deployments"
                                >
                                    refresh
                                </button>
                            </div>
                            {vercelDeployedUrl ? (
                                <a
                                    href={vercelDeployedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.liveUrlValue}
                                >
                                    {vercelDeployedUrl.replace(/^https?:\/\//, '')}
                                </a>
                            ) : (
                                <span className={styles.liveUrlEmpty}>
                                    not detected yet — once Vercel finishes the build it&apos;ll appear here
                                </span>
                            )}
                        </div>

                        <div className={styles.connectedAs}>
                            <span>
                                Connected as <strong>@{conn.githubUsername}</strong>
                            </span>
                            <button className={styles.disconnectLink} onClick={handleDisconnect} disabled={busy}>
                                Disconnect
                            </button>
                        </div>

                        {error && <div className={styles.errorBox}>{error}</div>}

                        <button
                            className={styles.primaryBtn}
                            onClick={handlePush}
                            disabled={busy}
                        >
                            <GitHubIcon className={styles.primaryBtnIcon} />
                            Update
                        </button>
                        <button className={styles.cancelBtn} onClick={onClose} disabled={busy}>
                            Cancel
                        </button>
                    </>
                )}

                {/* ─── READY (CREATE NEW) — matches FirstPostPublishToVercelButtonPressFigma ─── */}
                {phase === 'ready' && conn && !hasExistingRepo && (
                    <>
                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>Repository Name</label>
                            <input
                                className={styles.input}
                                value={repoName}
                                onChange={(e) => setRepoName(e.target.value)}
                                placeholder="my-awesome-site"
                                spellCheck={false}
                                autoCapitalize="off"
                                autoCorrect="off"
                                disabled={busy}
                            />
                            {repoUrlPreview && (
                                <span className={styles.urlPreview}>{repoUrlPreview}</span>
                            )}
                        </div>

                        <div className={styles.connectedAs}>
                            <span>
                                Connected as <strong>@{conn.githubUsername}</strong>
                            </span>
                            <button className={styles.disconnectLink} onClick={handleDisconnect} disabled={busy}>
                                Disconnect
                            </button>
                        </div>

                        <div className={styles.visibilityRow}>
                            {[
                                { id: 'private', label: 'Private' },
                                { id: 'public', label: 'Public' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    className={`${styles.visibilityOption} ${visibility === opt.id ? styles.visibilityOptionActive : ''}`}
                                    onClick={() => setVisibility(opt.id)}
                                    disabled={busy}
                                    type="button"
                                >
                                    <span className={styles.visibilityRadio} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {error && <div className={styles.errorBox}>{error}</div>}

                        <button
                            className={styles.primaryBtn}
                            onClick={handlePush}
                            disabled={busy || !repoName.trim()}
                        >
                            <GitHubIcon className={styles.primaryBtnIcon} />
                            Create Github Repo
                        </button>
                        <button className={styles.cancelBtn} onClick={onClose} disabled={busy}>
                            Cancel
                        </button>
                    </>
                )}

                {/* ─── PUSHING — matches PushingToGithubWaitingLoadingFigma ─── */}
                {phase === 'pushing' && (
                    <>
                        <p className={styles.loadingSubtext}>
                            {hasExistingRepo
                                ? 'Pushing your latest sandbox to GitHub. This usually takes 10–30 seconds.'
                                : 'Creating your repo and uploading the project. This usually takes 10–30 seconds.'}
                        </p>
                        <div className={styles.statusList}>
                            <div className={`${styles.statusItem} ${pushStep === 'creating' ? styles.statusItemActive : styles.statusItemDone}`}>
                                <span className={styles.statusBullet}>{pushStep === 'creating' ? '·' : '✓'}</span>
                                {hasExistingRepo ? 'Verifying repo' : 'Creating repo'}
                            </div>
                            <div className={`${styles.statusItem} ${styles.statusItemActive}`}>
                                <span className={styles.spinner} />
                                Uploading files and pushing main
                            </div>
                        </div>
                    </>
                )}

                {/* ─── DONE (UPDATE) — compact confirmation, auto-closes ─── */}
                {phase === 'done' && pushResult?.isUpdate && (
                    <div className={styles.updateDoneCard}>
                        <span className={styles.updateDoneTitle}>Updated</span>
                        <span className={styles.updateDoneSub}>
                            Pushed to{' '}
                            <a href={pushResult.repoUrl} target="_blank" rel="noopener noreferrer">
                                {pushResult.repoUrl.replace(/^https?:\/\//, '')}
                            </a>
                        </span>
                        {vercelDeployedUrl && (
                            <span className={styles.updateDoneSub}>
                                <a href={vercelDeployedUrl} target="_blank" rel="noopener noreferrer">
                                    {vercelDeployedUrl.replace(/^https?:\/\//, '')}
                                </a>{' '}
                                will redeploy automatically.
                            </span>
                        )}
                    </div>
                )}

                {/* ─── DONE (FIRST PUBLISH) — matches PushingToVercelFigma success ─── */}
                {phase === 'done' && pushResult && !pushResult.isUpdate && (
                    <>
                        <div className={styles.successHeader}>
                            <div className={styles.successText}>
                                <h4 className={styles.successTitle}>Repo successfully created</h4>
                                <a
                                    href={pushResult.repoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.repoUrlLine}
                                >
                                    {pushResult.repoUrl}
                                </a>
                            </div>
                            <svg
                                className={styles.successBadgeIcon}
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    fill="currentColor"
                                    d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.18c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.74 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17a10.96 10.96 0 0 1 5.74 0c2.18-1.48 3.14-1.17 3.14-1.17.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.7 5.36-5.27 5.65.41.36.78 1.06.78 2.14v3.18c0 .31.21.67.8.55A11.5 11.5 0 0 0 12 .5Z"
                                />
                            </svg>
                        </div>

                        <button
                            className={styles.primaryBtn}
                            onClick={() => window.open(pushResult.vercelImportUrl, '_blank', 'noopener,noreferrer')}
                        >
                            <VercelIcon className={styles.primaryBtnIcon} />
                            Open in Vercel
                        </button>
                        <button className={styles.cancelBtn} onClick={onClose}>
                            Close
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
