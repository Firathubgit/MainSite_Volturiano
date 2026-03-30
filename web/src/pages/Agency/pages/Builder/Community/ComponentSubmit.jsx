// ComponentSubmit.jsx — Phase S9.16: Community Component Submission UI
// Split-pane: Code editor (left) + Sandboxed preview (right) + SSE progress stepper

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { SandpackProvider, SandpackLayout, SandpackPreview, SandpackCodeEditor, useSandpack } from '@codesandbox/sandpack-react';
import { useBuilderAuth } from '../../../../../contexts/BuilderAuthContext';
import styles from './ComponentSubmit.module.css';

// ═══════════════════════════════════════════════════════════════
// SANDPACK STATE OBSERVER
// ═══════════════════════════════════════════════════════════════
function SandpackStateObserver({ onCodeChange, bindUpdateFile }) {
    const { sandpack } = useSandpack();
    const appCode = sandpack.files['/App.jsx']?.code || sandpack.files['/App.js']?.code || '';
    const cssCode = sandpack.files['/style.css']?.code || sandpack.files['/styles.css']?.code || '';

    useEffect(() => {
        onCodeChange(appCode, cssCode);
    }, [appCode, cssCode, onCodeChange]);

    useEffect(() => {
        if (bindUpdateFile) {
            bindUpdateFile((path, content) => sandpack.updateFile(path, content));
        }
    }, [sandpack, bindUpdateFile]);

    return null;
}

// ═══════════════════════════════════════════════════════════════
// DANGEROUS PATTERNS (blocked client-side — imports are allowed)
// ═══════════════════════════════════════════════════════════════
const DANGEROUS_PATTERNS = [
    { regex: /\beval\s*\(/g, label: 'eval()' },
    { regex: /document\.cookie/g, label: 'document.cookie' },
    { regex: /fetch\s*\(\s*['"`]https?:/g, label: 'fetch(http...)' },
    { regex: /\.innerHTML\s*=/g, label: 'innerHTML' },
    { regex: /process\.env/g, label: 'process.env' },
    { regex: /new\s+Function\s*\(/g, label: 'new Function()' },
    { regex: /window\.location\s*=/g, label: 'window.location redirect' },
];

// ═══════════════════════════════════════════════════════════════
// CLIENT-SIDE SECURITY SCAN (patterns only — imports are free)
// ═══════════════════════════════════════════════════════════════
function scanCode(code) {
    const violations = [];

    // Check dangerous patterns
    for (const p of DANGEROUS_PATTERNS) {
        if (p.regex.test(code)) {
            violations.push({ type: 'pattern', detail: 'Dangerous: ' + p.label });
        }
        p.regex.lastIndex = 0;
    }

    // Check for export default
    if (code.length > 50 && !/export\s+default\s+/m.test(code)) {
        violations.push({ type: 'structure', detail: 'Missing export default' });
    }

    return violations;
}



// ═══════════════════════════════════════════════════════════════
// SSE PROGRESS STEPS
// ═══════════════════════════════════════════════════════════════
const STEPS = [
    { id: 'validate', label: 'Code validated' },
    { id: 'screenshot', label: 'Screenshot captured' },
    { id: 'analyze', label: 'LLM analyzing metadata' },
];

function ProgressStepper({ submissionId, token, onClose }) {
    const [currentStep, setCurrentStep] = useState('queued');
    const [progress, setProgress] = useState(10);
    const [result, setResult] = useState(null);
    const eventSourceRef = useRef(null);

    useEffect(() => {
        if (!submissionId) return;

        // Step 1 is immediate (we already validated client-side)
        setCurrentStep('validate');
        setProgress(25);
        const setupEventSource = () => {
            const url = `/api/community/submission-status/${submissionId}?token=${token || ''}`;

            const es = new EventSource(url);
            eventSourceRef.current = es;

            es.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.progress) setProgress(data.progress);

                    if (data.step === 'analyzing') {
                        setCurrentStep('analyze');
                        setProgress(data.progress || 65);
                    }

                    if (data.step === 'complete') {
                        setCurrentStep('complete');
                        setProgress(100);
                        setResult({
                            status: data.status,
                            qualityScore: data.qualityScore,
                            message: data.message,
                        });
                        es.close();
                    }

                    if (data.step === 'failed' || data.step === 'timeout') {
                        setCurrentStep('failed');
                        setResult({
                            status: 'failed',
                            message: data.message || 'Processing failed.',
                        });
                        es.close();
                    }
                } catch (err) {
                    console.warn('SSE parse error:', err);
                }
            };

            es.onerror = () => {
                // SSE reconnects automatically, but set a fallback
                console.warn('[ComponentSubmit] SSE connection error');
            };
        };

        setupEventSource();

        // Simulate step 2 (screenshot) after a short delay
        const screenshotTimer = setTimeout(() => {
            if (!result) {
                setCurrentStep('screenshot');
                setProgress(40);
            }
        }, 3000);

        return () => {
            clearTimeout(screenshotTimer);
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [submissionId]);

    function getStepStatus(stepId) {
        const stepOrder = ['validate', 'screenshot', 'analyze', 'complete'];
        const currentIdx = stepOrder.indexOf(currentStep);
        const stepIdx = stepOrder.indexOf(stepId);

        if (currentStep === 'failed') return 'failed';
        if (currentStep === 'complete') return 'completed';
        if (stepIdx < currentIdx) return 'completed';
        if (stepIdx === currentIdx) return 'active';
        return 'pending';
    }

    return (
        <div className={styles.progressOverlay}>
            <div className={styles.progressCard}>
                <h2 className={styles.progressTitle}>Component Submitted!</h2>

                <div className={styles.progressBarTrack}>
                    <div className={styles.progressBarFill} style={{ width: `${progress}% ` }} />
                </div>

                <div className={styles.stepList}>
                    {STEPS.map((step) => {
                        const status = getStepStatus(step.id);
                        return (
                            <div key={step.id} className={`${styles.step} ${styles[status] || ''} `}>
                                <span className={styles.stepIcon}>
                                    {status === 'completed' ? '✓' : status === 'active' ? '◌' : '○'}
                                </span>
                                <span>{step.label}</span>
                            </div>
                        );
                    })}
                </div>

                {result && (
                    <>
                        <div className={`${styles.resultBadge} ${styles.success}`}>
                            {result.message || 'Component successfully published to the community!'}
                        </div>
                        <button className={styles.closeButton} onClick={onClose}>
                            Close
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function ComponentSubmit() {
    const { getAccessToken, user } = useBuilderAuth();
    const [code, setCode] = useState('');
    const [cssCode, setCssCode] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [categoryHint, setCategoryHint] = useState('');
    const [thumbnailBase64, setThumbnailBase64] = useState(null);
    const [videoBase64, setVideoBase64] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);
    const [bgMode, setBgMode] = useState('dark');
    const [zoom, setZoom] = useState(100);
    const [violations, setViolations] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [submissionId, setSubmissionId] = useState(null);
    const [agreedToLicense, setAgreedToLicense] = useState(false);
    const [error, setError] = useState(null);
    const [previewError, setPreviewError] = useState(null);
    const [manualErrorInput, setManualErrorInput] = useState('');
    const [fixing, setFixing] = useState(false);
    const [selectedFixModel, setSelectedFixModel] = useState('google/gemini-3.1-pro-preview');

    const debounceRef = useRef(null);
    const updateFileRef = useRef(null);

    // Debounced code scan triggered by Sandpack Observer
    const handleSandpackChange = useCallback((appCode, newCssCode) => {
        setCode(appCode);
        setCssCode(newCssCode);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            // Client-side security scan
            const v = scanCode(appCode);
            setViolations(v);
        }, 500);
    }, []);

    const handleFileUpload = (e, type) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check size (max 5MB for images, 15MB for video)
        if (type === 'thumbnail' && file.size > 5 * 1024 * 1024) {
            setError('Thumbnail image must be under 5MB');
            return;
        }
        if (type === 'video' && file.size > 15 * 1024 * 1024) {
            setError('Preview video must be under 15MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Str = reader.result;
            if (type === 'thumbnail') {
                setThumbnailBase64(base64Str);
                setThumbnailPreview(URL.createObjectURL(file));
            } else {
                setVideoBase64(base64Str);
                setVideoPreview(URL.createObjectURL(file));
            }
        };
        reader.readAsDataURL(file);
    };

    // Sandpack runs automatically, no need for the 1500ms debounce runPreview timer
    // Submit handler
    const handleSubmit = async () => {
        console.log(`\n\n[DEBUG-SUBMIT] =================================================================`);
        console.log(`[DEBUG-SUBMIT] 🚀 STEP 1: <handleSubmit> TRIGGERED`);
        console.log(`[DEBUG-SUBMIT] -> State: name="${name}", code length=${code?.length}, cssCode length=${cssCode?.length}`);
        console.log(`[DEBUG-SUBMIT] -> Validation: violations count=${violations.length}, submitting flag=${submitting}`);

        if (!name || !code || violations.length > 0 || submitting) {
            console.log('[DEBUG-SUBMIT] ⛔ STEP 1.1: Validation blocked submission.');
            if (!name) console.log('[DEBUG-SUBMIT]    Reason: name is empty');
            if (!code) console.log('[DEBUG-SUBMIT]    Reason: code is empty');
            if (violations.length > 0) console.log('[DEBUG-SUBMIT]    Reason: violations present:', violations);
            if (submitting) console.log('[DEBUG-SUBMIT]    Reason: already submitting');
            console.log(`[DEBUG-SUBMIT] =================================================================\n\n`);
            return;
        }

        console.log('[DEBUG-SUBMIT] ✅ STEP 2: Validation passed. Setting submitting=true.');
        setSubmitting(true);
        setError(null);

        try {
            console.log('[DEBUG-SUBMIT] 📡 STEP 3: Fetching Supabase session for auth token...');
            const startTime = performance.now();

            const token = getAccessToken();
            console.log(`[DEBUG-SUBMIT] 🔑 STEP 4: Token retrieved in ${(performance.now() - startTime).toFixed(1)}ms. Length: ${token?.length || 0} chars. User ID: ${user?.id || 'none'}`);

            console.log('[DEBUG-SUBMIT] 🚀 STEP 5: Executing fetch request to /api/community/submit-component ...');

            const payload = {
                name,
                description: description || undefined,
                categoryHint: categoryHint || undefined,
                code,
                cssCode: cssCode || undefined,
                thumbnail: thumbnailBase64 || undefined,
                video: videoBase64 || undefined,
            };

            console.log(`[DEBUG-SUBMIT] -> Payload JSON length: ${JSON.stringify(payload).length} bytes`);

            let res;
            let data;
            let retryCount = 0;
            const maxRetries = 1;

            while (retryCount <= maxRetries) {
                const fetchStartTime = performance.now();
                try {
                    res = await fetch('/api/community/submit-component', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify(payload),
                    });

                    const fetchDuration = performance.now() - fetchStartTime;
                    console.log(`[DEBUG-SUBMIT] 📥 STEP 6: Fetch returned (Attempt ${retryCount + 1}) in ${fetchDuration.toFixed(1)}ms`);

                    const rawText = await res.text();

                    if (!rawText) {
                        throw new Error("Empty response received from server (connection dropped)");
                    }

                    data = JSON.parse(rawText);
                    break; // Success parsing! Break the retry loop.

                } catch (err) {
                    console.warn(`[DEBUG-SUBMIT] ⚠ Attempt ${retryCount + 1} failed: ${err.message}`);
                    if (retryCount >= maxRetries) {
                        console.error('[DEBUG-SUBMIT] 💥 Max retries reached. Error:', err);
                        throw new Error(err.message.includes('JSON') ? 'Invalid format received from server. The data payload might be too large.' : err.message);
                    }
                    retryCount++;
                    console.log(`[DEBUG-SUBMIT] 🔄 Retrying... (${retryCount}/${maxRetries}) in 1s`);
                    await new Promise(r => setTimeout(r, 1500));
                }
            }

            if (!data.success) {
                console.log(`[DEBUG-SUBMIT] ⛔ STEP 9: Server returned { success: false }. Error message:`, data.error);
                setError(data.error || 'Submission failed');
                setSubmitting(false);
                console.log(`[DEBUG-SUBMIT] =================================================================\n\n`);
                return;
            }

            console.log(`[DEBUG-SUBMIT] 🎉 STEP 10: Submission successful! ID: ${data.submissionId}`);
            setSubmissionId(data.submissionId);
            console.log(`[DEBUG-SUBMIT] =================================================================\n\n`);
        } catch (err) {
            console.error('[DEBUG-SUBMIT] 💥 ERROR BLOCK: Caught unhandled exception during submission:', err);
            setError(err.message || 'Network error');
            setSubmitting(false);
            console.log(`[DEBUG-SUBMIT] =================================================================\n\n`);
        }
    };

    const isValid = name.trim().length >= 3 && code.length >= 10 && violations.length === 0 && agreedToLicense;

    const sandpackTheme = useMemo(() => ({
        colors: {
            surface1: "#151515",
            surface2: "#252525",
            surface3: "#2F2F2F",
            clickable: "#999999",
            base: "#808080",
            disabled: "#4D4D4D",
            hover: "#C5C5C5",
            accent: "#1f72da",
            error: "#ff453a",
            errorSurface: "#ffeceb"
        },
        syntax: {
            plain: "#FFFFFF",
            comment: { color: "#757575", fontStyle: "italic" },
            keyword: "#1f72da",
            tag: "#d28cf6",
            punctuation: "#ffffff",
            definition: "#a5c7f0",
            property: "#1f72da",
            static: "#FF453A",
            string: "#bf5af2"
        },
        font: {
            body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
            mono: '"Fira Mono", "DejaVu Sans Mono", Menlo, Consolas, "Liberation Mono", Monaco, "Lucida Console", monospace',
            size: "13px",
            lineHeight: "20px"
        }
    }), []);

    const sandpackOptions = useMemo(() => ({
        externalResources: ["https://cdn.tailwindcss.com"],
        visibleFiles: ["/App.jsx", "/style.css"],
        activeFile: "/App.jsx"
    }), []);

    const sandpackDependencies = useMemo(() => {
        const deps = {
            "framer-motion": "latest",
            "lucide-react": "latest",
            "clsx": "latest",
            "tailwind-merge": "latest"
        };
        const importRx = /from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRx.exec(code)) !== null) {
            const raw = match[1];
            if (raw.startsWith(".") || raw.startsWith("/")) continue;
            const pkg = raw.startsWith("@")
                ? raw.split("/").slice(0, 2).join("/")
                : raw.split("/")[0];
            
            if (pkg !== "react" && pkg !== "react-dom") {
                deps[pkg] = "latest";
            }
        }
        return deps;
    }, [code]);

    const sandpackCustomSetup = useMemo(() => ({
        dependencies: sandpackDependencies
    }), [sandpackDependencies]);

    const sandpackFiles = useMemo(() => ({
        "/App.jsx": code || "export default function App() {\n  return (\n    <div className=\"flex flex-col items-center justify-center p-8 text-center\">\n      <h1 className=\"text-4xl font-bold mb-4\">Welcome to Builder</h1>\n      <p className=\"opacity-60\">Start typing to see your component here.</p>\n    </div>\n  );\n}",
        "/style.css": cssCode || "",
        "/index.js": `import React, { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport "./style.css";\n\nimport App from "./App.jsx";\n\nconst root = createRoot(document.getElementById("root"));\ndocument.body.style.backgroundColor = "${bgMode === 'light' ? '#ffffff' : '#000000'}";\ndocument.body.style.color = "${bgMode === 'light' ? '#000000' : '#ffffff'}";\nroot.render(\n  <StrictMode>\n    <div className="${bgMode === 'light' ? 'bg-white' : 'bg-transparent'} min-h-screen w-full">\n      <App />\n    </div>\n  </StrictMode>\n);`
    }), [code, cssCode, bgMode]); // Stable key: never reset on toggles!

    // Dynamically update the index background WITHOUT resetting App.jsx
    useEffect(() => {
        if (updateFileRef.current) {
            updateFileRef.current("/index.js", `import React, { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport "./style.css";\n\nimport App from "./App.jsx";\n\nconst root = createRoot(document.getElementById("root"));\ndocument.body.style.backgroundColor = "${bgMode === 'light' ? '#ffffff' : '#000000'}";\ndocument.body.style.color = "${bgMode === 'light' ? '#000000' : '#ffffff'}";\nroot.render(\n  <StrictMode>\n    <div className="${bgMode === 'light' ? 'bg-white' : 'bg-transparent'} min-h-screen w-full">\n      <App />\n    </div>\n  </StrictMode>\n);`);
        }
    }, [bgMode]);

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>Submit a Component</h1>
                <p className={styles.subtitle}>Share your creation with thousands of builders. You can optionally include custom CSS.</p>
            </div>

            {/* Split Pane: Editor + Preview */}
            < SandpackProvider
                key={JSON.stringify(Object.keys(sandpackDependencies))} // Reload bundler on new dependency
                template="react"
                theme={sandpackTheme}
                options={sandpackOptions}
                customSetup={sandpackCustomSetup}
                files={sandpackFiles}
            >
                <SandpackStateObserver
                    onCodeChange={handleSandpackChange}
                    bindUpdateFile={(fn) => { updateFileRef.current = fn; }}
                />
                <div className={styles.sandpackContainer}>
                    <SandpackLayout>
                        <SandpackCodeEditor
                            showTabs={true}
                            showRunButton={false}
                            showLineNumbers={true}
                            style={{ height: 500 }}
                        />
                        <SandpackPreview
                            showNavigator={false}
                            showOpenInCodeSandbox={false}
                            showRefreshButton={true}
                            style={{ height: 500 }}
                            actionsChildren={
                                <div className={`${styles.previewControls} ${bgMode === 'light' ? styles.lightControls : ''}`} style={{ padding: '0 8px', display: 'flex', gap: '8px' }}>
                                    <button
                                        className={`${styles.previewToggle} ${bgMode === 'dark' ? styles.active : ''}`}
                                        onClick={() => setBgMode('dark')}
                                    >
                                        Dark BG
                                    </button>
                                    <button
                                        className={`${styles.previewToggle} ${bgMode === 'light' ? styles.active : ''}`}
                                        onClick={() => setBgMode('light')}
                                    >
                                        Light BG
                                    </button>
                                </div>
                            }
                        />
                    </SandpackLayout>

                    {/* Security badge (applies below the editor bounds) */}
                    <div style={{ marginTop: '16px', borderRadius: '12px', overflow: 'hidden' }}>
                        <div className={`${styles.securityBadge} ${violations.length === 0 ? styles.pass : styles.fail}`}>
                            {violations.length === 0 ? '✅ All imports whitelisted — code is safe' : `⚠ ${violations.length} issue${violations.length > 1 ? 's' : ''} found`}
                        </div>
                        {violations.length > 0 && (
                            <ul className={styles.violationList}>
                                {violations.map((v, i) => (
                                    <li key={i} className={styles.violationItem}>
                                        • {v.detail}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>


            </SandpackProvider >

            {/* Component Details */}
            < div className={styles.detailsSection} >
                <h3 className={styles.sectionLabel}>Component Details</h3>
                <div className={styles.formGrid}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>
                            Name <span className={styles.fieldRequired}>*</span>
                        </label>
                        <input
                            type="text"
                            className={styles.fieldInput}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Gradient Hero Section"
                            maxLength={100}
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Description (optional — AI generates)</label>
                        <input
                            type="text"
                            className={styles.fieldInput}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of the component"
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Category (optional — AI classifies)</label>
                        <input
                            type="text"
                            className={styles.fieldInput}
                            value={categoryHint}
                            onChange={(e) => setCategoryHint(e.target.value)}
                            placeholder="e.g. hero, features, pricing"
                        />
                    </div>
                </div>

                <div className={styles.formGrid}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Custom Thumbnail (optional)</label>
                        <p className={styles.fieldSubtitle}>Skips auto-screenshot generation</p>
                        <div className={styles.uploadArea}>
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                onChange={(e) => handleFileUpload(e, 'thumbnail')}
                                className={styles.fileInput}
                            />
                            {thumbnailPreview ? (
                                <img src={thumbnailPreview} alt="Thumbnail preview" className={styles.previewMedia} />
                            ) : (
                                <div className={styles.uploadPlaceholder}>
                                    <span>Drag & drop or click to upload thumbnail</span>
                                    <span className={styles.uploadInfo}>PNG, JPG up to 5MB</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Hover Preview Video (optional)</label>
                        <p className={styles.fieldSubtitle}>Plays on hover in the component dashboard</p>
                        <div className={styles.uploadArea}>
                            <input
                                type="file"
                                accept="video/mp4, video/webm"
                                onChange={(e) => handleFileUpload(e, 'video')}
                                className={styles.fileInput}
                            />
                            {videoPreview ? (
                                <video src={videoPreview} autoPlay muted loop className={styles.previewMedia} />
                            ) : (
                                <div className={styles.uploadPlaceholder}>
                                    <span>Drag & drop or click to upload video</span>
                                    <span className={styles.uploadInfo}>MP4, WebM up to 15MB</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >

            {/* Submit */}
            < div className={styles.submitRow} >
                <label className={styles.licenseAgreement}>
                    <input
                        type="checkbox"
                        checked={agreedToLicense}
                        onChange={(e) => setAgreedToLicense(e.target.checked)}
                        className={styles.licenseCheckbox}
                    />
                    <span>
                        I agree to the <a href="/guidelines" target="_blank" rel="noopener noreferrer" className={styles.link}>Community Guidelines</a> and license my code under the <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer" className={styles.link}>MIT License</a>.
                    </span>
                </label>
                {error && (
                    <div style={{ color: '#f87171', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>
                        {error}
                    </div>
                )
                }
                <button
                    className={styles.submitButton}
                    disabled={!isValid || submitting}
                    onClick={handleSubmit}
                >
                    {submitting ? 'Submitting...' : 'Add Component to Community'}
                </button>
            </div >

            {/* SSE Progress Overlay */}
            {
                submissionId && (
                    <ProgressStepper
                        submissionId={submissionId}
                        token={getAccessToken()}
                        onClose={() => {
                            setSubmissionId(null);
                            setSubmitting(false);
                            setCode('');
                            setName('');
                            setDescription('');
                            setCategoryHint('');
                            setThumbnailBase64(null);
                            setVideoBase64(null);
                            setThumbnailPreview(null);
                            setVideoPreview(null);
                        }}
                    />
                )
            }
        </div >
    );
}
