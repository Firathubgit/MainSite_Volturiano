// ComponentStudio.jsx — 21st.dev-inspired Studio Layout for Component Submission
// 3-panel layout: File tree (left) | Code editor (center) | Live preview (right)

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SandpackProvider, SandpackLayout, SandpackPreview, SandpackCodeEditor, useSandpack } from '@codesandbox/sandpack-react';
import { useBuilderAuth } from '../../../../../contexts/BuilderAuthContext';
import styles from './ComponentStudio.module.css';
import tornadoLogo from '../../../../../assets/Logo/TornadoLogo.png';
import cornerGradient from '../Dashboard/Assets/GradientCornerOne.png';

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
// FILE TREE CONTROLLER — watches Sandpack and switches active file
// ═══════════════════════════════════════════════════════════════
function FileTreeController({ activeFile, onSetActiveFile }) {
    const { sandpack } = useSandpack();

    const handleFileClick = (path) => {
        sandpack.setActiveFile(path);
        onSetActiveFile(path);
    };

    return { handleFileClick, files: sandpack.files };
}

function FileTreeView({ activeFile, onSetActiveFile }) {
    const { sandpack } = useSandpack();

    const handleFileClick = (path) => {
        sandpack.setActiveFile(path);
        onSetActiveFile(path);
    };

    // Build a virtual file tree structure
    const fileTree = [
        { type: 'file', label: 'component.jsx', path: '/App.jsx', depth: 0 },
        { type: 'file', label: 'style.css', path: '/style.css', depth: 0 }
    ];

    const FolderIcon = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.0026 9.3334L5.0026 7.40006C5.11132 7.18416 5.27668 7.00187 5.48101 6.8727C5.68534 6.74352 5.92094 6.67233 6.1626 6.66673H13.3359M13.3359 6.66673C13.5396 6.66637 13.7407 6.71269 13.9237 6.80212C14.1067 6.89155 14.2668 7.02172 14.3917 7.18264C14.5165 7.34356 14.6029 7.53095 14.6441 7.73043C14.6853 7.92991 14.6802 8.13618 14.6293 8.3334L13.6026 12.3334C13.5283 12.6211 13.3601 12.8758 13.1246 13.0569C12.889 13.2381 12.5997 13.3354 12.3026 13.3334H2.66927C2.31565 13.3334 1.97651 13.1929 1.72646 12.9429C1.47641 12.6928 1.33594 12.3537 1.33594 12.0001V3.3334C1.33594 2.97978 1.47641 2.64064 1.72646 2.39059C1.97651 2.14054 2.31565 2.00006 2.66927 2.00006H5.26927C5.49226 1.99788 5.71224 2.05166 5.90907 2.15648C6.1059 2.2613 6.2733 2.41381 6.39594 2.60006L6.93594 3.40006C7.05734 3.58442 7.22262 3.73574 7.41694 3.84047C7.61126 3.94519 7.82853 4.00003 8.04927 4.00006H12.0026C12.3562 4.00006 12.6954 4.14054 12.9454 4.39059C13.1955 4.64064 13.3359 4.97978 13.3359 5.3334V6.66673Z" stroke="#3B82F6" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const FileIcon = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.9974 1.33594H3.9974C3.64377 1.33594 3.30464 1.47641 3.05459 1.72646C2.80454 1.97651 2.66406 2.31565 2.66406 2.66927V13.3359C2.66406 13.6896 2.80454 14.0287 3.05459 14.2787C3.30464 14.5288 3.64377 14.6693 3.9974 14.6693H11.9974C12.351 14.6693 12.6902 14.5288 12.9402 14.2787C13.1903 14.0287 13.3307 13.6896 13.3307 13.3359V4.66927L9.9974 1.33594Z" stroke="#6B7280" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9.33594 1.33594V4.0026C9.33594 4.35623 9.47641 4.69536 9.72646 4.94541C9.97651 5.19546 10.3156 5.33594 10.6693 5.33594H13.3359" stroke="#6B7280" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const renderTree = (items) => {
        return items.map((item, i) => {
            const depthClass = styles[`indent${item.depth}`] || '';
            if (item.type === 'folder') {
                return (
                    <React.Fragment key={`${item.label}-${i}`}>
                        <div className={`${styles.treeItem} ${depthClass}`}>
                            <span className={styles.treeIcon}><FolderIcon /></span>
                            <span className={`${styles.treeLabel} ${styles.treeLabelFolder}`}>{item.label}</span>
                        </div>
                        {item.open && item.children && renderTree(item.children)}
                    </React.Fragment>
                );
            }
            return (
                <div
                    key={`${item.label}-${i}`}
                    className={`${styles.treeItem} ${depthClass} ${activeFile === item.path ? styles.treeItemActive : ''}`}
                    onClick={() => handleFileClick(item.path)}
                >
                    <span className={styles.treeIcon}><FileIcon /></span>
                    <span className={styles.treeLabel}>{item.label}</span>
                </div>
            );
        });
    };

    return <div className={styles.fileTree}>{renderTree(fileTree)}</div>;
}


// ═══════════════════════════════════════════════════════════════
// SECURITY SCAN
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

function scanCode(code) {
    const violations = [];
    for (const p of DANGEROUS_PATTERNS) {
        if (p.regex.test(code)) {
            violations.push({ type: 'pattern', detail: 'Dangerous: ' + p.label });
        }
        p.regex.lastIndex = 0;
    }
    if (code.length > 50 && !/export\s+default\s+/m.test(code)) {
        violations.push({ type: 'structure', detail: 'Missing export default' });
    }
    return violations;
}


// ═══════════════════════════════════════════════════════════════
// SSE PROGRESS STEPPER
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
        setCurrentStep('validate');
        setProgress(25);

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
                    setResult({ status: data.status, qualityScore: data.qualityScore, message: data.message });
                    es.close();
                }
                if (data.step === 'failed' || data.step === 'timeout') {
                    setCurrentStep('failed');
                    setResult({ status: 'failed', message: data.message || 'Processing failed.' });
                    es.close();
                }
            } catch (err) {
                console.warn('SSE parse error:', err);
            }
        };

        es.onerror = () => console.warn('[ComponentStudio] SSE error');

        const screenshotTimer = setTimeout(() => {
            if (!result) { setCurrentStep('screenshot'); setProgress(40); }
        }, 3000);

        return () => {
            clearTimeout(screenshotTimer);
            if (eventSourceRef.current) eventSourceRef.current.close();
        };
    }, [submissionId]);

    function getStepStatus(stepId) {
        const order = ['validate', 'screenshot', 'analyze', 'complete'];
        const ci = order.indexOf(currentStep);
        const si = order.indexOf(stepId);
        if (currentStep === 'failed') return 'failed';
        if (currentStep === 'complete') return 'completed';
        if (si < ci) return 'completed';
        if (si === ci) return 'active';
        return 'pending';
    }

    return (
        <div className={styles.progressOverlay}>
            <div className={styles.progressCard}>
                <h2 className={styles.progressTitle}>Component Submitted!</h2>
                <div className={styles.progressBarTrack}>
                    <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
                </div>
                <div className={styles.stepList}>
                    {STEPS.map((step) => {
                        const status = getStepStatus(step.id);
                        return (
                            <div key={step.id} className={`${styles.step} ${styles[status] || ''}`}>
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
                        <button className={styles.closeButton} onClick={onClose}>Close</button>
                    </>
                )}
            </div>
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════
// MAIN STUDIO COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function ComponentStudio() {
    const navigate = useNavigate();
    const { getAccessToken, user } = useBuilderAuth();

    // State
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
    const [violations, setViolations] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [submissionId, setSubmissionId] = useState(null);
    const [agreedToLicense, setAgreedToLicense] = useState(false);
    const [error, setError] = useState(null);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [activeFile, setActiveFile] = useState('/App.jsx');

    // Resizing State
    const [filePanelWidth, setFilePanelWidth] = useState(264);
    const [editorPanelWidth, setEditorPanelWidth] = useState(600);
    const [isResizingFile, setIsResizingFile] = useState(false);
    const [isResizingEditor, setIsResizingEditor] = useState(false);

    const startResizingFile = useCallback((e) => {
        e.preventDefault();
        setIsResizingFile(true);
    }, []);

    const startResizingEditor = useCallback((e) => {
        e.preventDefault();
        setIsResizingEditor(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizingFile(false);
        setIsResizingEditor(false);
    }, []);

    const resize = useCallback((e) => {
        if (isResizingFile) {
            const newWidth = e.clientX - 8;
            if (newWidth > 180 && newWidth < 500) setFilePanelWidth(newWidth);
        } else if (isResizingEditor) {
            const newWidth = e.clientX - filePanelWidth - 16;
            if (newWidth > 200 && newWidth < window.innerWidth - filePanelWidth - 400) {
                setEditorPanelWidth(newWidth);
            }
        }
    }, [isResizingFile, isResizingEditor, filePanelWidth]);

    useEffect(() => {
        if (isResizingFile || isResizingEditor) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizingFile, isResizingEditor, resize, stopResizing]);

    const debounceRef = useRef(null);
    const updateFileRef = useRef(null);

    // Code scan
    const handleSandpackChange = useCallback((appCode, newCssCode) => {
        setCode(appCode);
        setCssCode(newCssCode);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setViolations(scanCode(appCode));
        }, 500);
    }, []);

    // File upload
    const handleFileUpload = (e, type) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (type === 'thumbnail' && file.size > 5 * 1024 * 1024) { setError('Thumbnail must be under 5MB'); return; }
        if (type === 'video' && file.size > 15 * 1024 * 1024) { setError('Video must be under 15MB'); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'thumbnail') {
                setThumbnailBase64(reader.result);
                setThumbnailPreview(URL.createObjectURL(file));
            } else {
                setVideoBase64(reader.result);
                setVideoPreview(URL.createObjectURL(file));
            }
        };
        reader.readAsDataURL(file);
    };

    // Submit handler
    const handleSubmit = async () => {
        if (!name || !code || violations.length > 0 || submitting) return;
        setSubmitting(true);
        setError(null);

        try {
            const token = getAccessToken();
            const payload = {
                name,
                description: description || undefined,
                categoryHint: categoryHint || undefined,
                code,
                cssCode: cssCode || undefined,
                thumbnail: thumbnailBase64 || undefined,
                video: videoBase64 || undefined,
            };

            let res, data, retryCount = 0;
            const maxRetries = 1;

            while (retryCount <= maxRetries) {
                try {
                    res = await fetch('/api/community/submit-component', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify(payload),
                    });
                    const rawText = await res.text();
                    if (!rawText) throw new Error("Empty response from server");
                    data = JSON.parse(rawText);
                    break;
                } catch (err) {
                    if (retryCount >= maxRetries) {
                        throw new Error(err.message.includes('JSON') ? 'Invalid format from server.' : err.message);
                    }
                    retryCount++;
                    await new Promise(r => setTimeout(r, 1500));
                }
            }

            if (!data.success) {
                setError(data.error || 'Submission failed');
                setSubmitting(false);
                return;
            }
            setSubmissionId(data.submissionId);
            setShowSubmitModal(false);
        } catch (err) {
            setError(err.message || 'Network error');
            setSubmitting(false);
        }
    };

    const isValid = name.trim().length >= 3 && code.length >= 10 && violations.length === 0 && agreedToLicense;

    // Sandpack config
    const sandpackTheme = useMemo(() => ({
        colors: {
            surface1: "#1E1E1E", surface2: "#252525", surface3: "#2F2F2F",
            clickable: "#999999", base: "#808080", disabled: "#4D4D4D",
            hover: "#C5C5C5", accent: "#1f72da", error: "#ff453a", errorSurface: "#ffeceb"
        },
        syntax: {
            plain: "#D4D4D4",
            comment: { color: "#608B4E", fontStyle: "italic" },
            keyword: "#569CD6", tag: "#d28cf6", punctuation: "#D4D4D4",
            definition: "#9CDCFE", property: "#CE9178", static: "#B5CEA8", string: "#CE9178"
        },
        font: {
            body: '"Inter", system-ui, sans-serif',
            mono: '"Consolas", "Fira Mono", "DejaVu Sans Mono", monospace',
            size: "14px", lineHeight: "19px"
        }
    }), []);

    const sandpackOptions = useMemo(() => ({
        externalResources: ["https://cdn.tailwindcss.com"],
        visibleFiles: ["/App.jsx", "/style.css"],
        activeFile: "/App.jsx"
    }), []);

    const [detectedDeps, setDetectedDeps] = useState({});
    const depDetectTimerRef = useRef(null);

    // Debounced dependency detection — scans code for all imports and automatically adds them
    useEffect(() => {
        if (depDetectTimerRef.current) clearTimeout(depDetectTimerRef.current);
        depDetectTimerRef.current = setTimeout(() => {
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

            setDetectedDeps(prev => {
                if (JSON.stringify(prev) === JSON.stringify(deps)) return prev;
                return deps;
            });
        }, 500); // Faster debounce
        return () => { if (depDetectTimerRef.current) clearTimeout(depDetectTimerRef.current); };
    }, [code]);

    const sandpackCustomSetup = useMemo(() => ({
        dependencies: detectedDeps
    }), [detectedDeps]);

    const sandpackFiles = useMemo(() => ({
        "/App.jsx": code || "export default function App() {\n  return (\n    <div className=\"flex flex-col items-center justify-center p-8 text-center\">\n      <h1 className=\"text-4xl font-bold mb-4\">Welcome to Builder</h1>\n      <p className=\"opacity-60\">Start typing to see your component here.</p>\n    </div>\n  );\n}",
        "/style.css": cssCode || "",
        "/index.js": `import React, { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport "./style.css";\n\nimport App from "./App.jsx";\n\nconst root = createRoot(document.getElementById("root"));\ndocument.body.style.backgroundColor = "${bgMode === 'light' ? '#ffffff' : '#000000'}";\ndocument.body.style.color = "${bgMode === 'light' ? '#000000' : '#ffffff'}";\nroot.render(\n  <StrictMode>\n    <div className="${bgMode === 'light' ? 'bg-white' : 'bg-transparent'} min-h-screen w-full">\n      <App />\n    </div>\n  </StrictMode>\n);`
    }), [code, cssCode, bgMode]); // Key fix: must include code/cssCode to prevent reverting on re-renders

    useEffect(() => {
        if (updateFileRef.current) {
            updateFileRef.current("/index.js", `import React, { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport "./style.css";\n\nimport App from "./App.jsx";\n\nconst root = createRoot(document.getElementById("root"));\ndocument.body.style.backgroundColor = "${bgMode === 'light' ? '#ffffff' : '#000000'}";\ndocument.body.style.color = "${bgMode === 'light' ? '#000000' : '#ffffff'}";\nroot.render(\n  <StrictMode>\n    <div className="${bgMode === 'light' ? 'bg-white' : 'bg-transparent'} min-h-screen w-full">\n      <App />\n    </div>\n  </StrictMode>\n);`);
        }
    }, [bgMode]);

    // ── ICONS ──
    const VolturianoLogo = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#vlogo)">
                <path fillRule="evenodd" clipRule="evenodd" d="M14.3333 0C15.2538 0 16 0.746192 16 1.66667V11.8333C16 11.9254 15.9254 12 15.8333 12H10.8333C10.7413 12 10.6667 12.0746 10.6667 12.1667V15.8333C10.6667 15.9254 10.592 16 10.5 16H1.66667C0.746192 16 0 15.2538 0 14.3333V12.1888C0 12.0717 0.0617076 11.9632 0.162109 11.903L6.1504 8.30988C6.28636 8.22832 6.2408 8.02716 6.09504 8.0026L6.06512 8H0.166667C0.0746192 8 2.68441e-09 7.9254 0 7.83332V4.16668C4.29504e-08 4.0746 0.0746192 4 0.166667 4H6.5C6.59204 4 6.66668 3.92538 6.66668 3.83333V0.166667C6.66668 0.0746192 6.74128 4.02664e-09 6.83332 0H14.3333ZM6.83332 4C6.74128 4 6.66668 4.0746 6.66668 4.16668V11.8333C6.66668 11.9254 6.74128 12 6.83332 12H10.5C10.592 12 10.6667 11.9254 10.6667 11.8333V4.16668C10.6667 4.0746 10.592 4 10.5 4H6.83332Z" fill="#F4F4F5" />
            </g>
            <defs><clipPath id="vlogo"><rect width="16" height="16" fill="white" /></clipPath></defs>
        </svg>
    );

    const SunIcon = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#sun)">
                <path d="M8.056 11.886C10.171 11.886 11.886 10.171 11.886 8.056C11.886 5.941 10.171 4.227 8.056 4.227C5.941 4.227 4.227 5.941 4.227 8.056C4.227 10.171 5.941 11.886 8.056 11.886Z" stroke="#F4F4F5" strokeWidth="1.53" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8.053 0.383V1.924M8.053 14.183V15.724M15.724 8.053H14.183M1.924 8.053H0.383M13.481 2.625L12.4 3.706M3.706 12.4L2.625 13.481M13.481 13.481L12.4 12.4M3.706 3.706L2.625 2.625" stroke="#F4F4F5" strokeWidth="1.53" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <defs><clipPath id="sun"><rect width="16" height="16" fill="white" /></clipPath></defs>
        </svg>
    );

    const MoonIcon = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 8.533A6 6 0 117.467 2 4.667 4.667 0 0014 8.533z" stroke="#F4F4F5" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const RefreshIcon = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 8C14 9.187 13.648 10.347 12.989 11.333C12.33 12.32 11.393 13.089 10.296 13.543C9.2 13.997 7.993 14.116 6.829 13.885C5.666 13.653 4.596 13.082 3.757 12.243C2.918 11.404 2.347 10.334 2.115 9.171C1.884 8.007 2.003 6.8 2.457 5.704C2.911 4.608 3.68 3.67 4.667 3.011C5.653 2.352 6.813 2 8 2C9.68 2 11.287 2.667 12.493 3.827L14 5.333" stroke="#F4F4F5" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 2V5.333H10.664" stroke="#F4F4F5" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const ArrowIcon = () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.33594 8H12.6693" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 3.33594L12.6667 8.0026L8 12.6693" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const ChevronDownIcon = () => (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="#F4F4F5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const TutorialIcon = () => (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.91667 2.33594H11.0833M6.41667 6.71094V9.04427L7.875 7.8776L6.41667 6.71094ZM3.5 11.6693H10.5C11.4665 11.6693 12.25 10.8858 12.25 9.91927V5.83594C12.25 4.86944 11.4665 4.08594 10.5 4.08594H3.5C2.5335 4.08594 1.75 4.86944 1.75 5.83594V9.91927C1.75 10.8858 2.5335 11.6693 3.5 11.6693Z" stroke="#878787" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const ReportIcon = () => (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#report_clip)">
                <path d="M2.14844 8.85469V1.47552C2.14844 1.10503 2.44878 0.804688 2.81927 0.804688H11.6283C12.1641 0.804688 12.4837 1.40183 12.1865 1.84763L10.4465 4.45758C10.2963 4.68291 10.2963 4.97647 10.4465 5.2018L12.1865 7.81174C12.4837 8.25758 12.1641 8.85469 11.6283 8.85469H2.14844ZM2.14844 8.85469V12.8797" stroke="#878787" strokeWidth="1.34167" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <defs><clipPath id="report_clip"><rect width="14" height="14" fill="white" /></clipPath></defs>
        </svg>
    );

    return (
        <div className={styles.studioPage}>

            {/* ── HEADER ── */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.logoButton} onClick={() => navigate('/community')} title="Go to Community Hub">
                        <img src={tornadoLogo} alt="Volturiano Logo" className={styles.tornadoLogoImg} />
                    </button>
                </div>

                <div className={styles.headerRight}>
                    <button
                        className={styles.continueBtn}
                        onClick={() => setShowSubmitModal(true)}
                        disabled={!code || code.length < 10 || violations.length > 0}
                    >
                        Continue
                    </button>
                </div>
            </header>

            {/* ── BODY (3-PANEL) ── */}
            <SandpackProvider
                key={JSON.stringify(Object.keys(detectedDeps))} // Force bundler reload when a new package is detected
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

                <div className={`${styles.body} ${(isResizingFile || isResizingEditor) ? styles.bodyResizing : ''}`}>
                    {/* LEFT: File Tree */}
                    <div className={styles.filePanel} style={{ width: filePanelWidth }}>
                        <FileTreeView activeFile={activeFile} onSetActiveFile={setActiveFile} />
                        <img src={cornerGradient} alt="" className={styles.sidebarBottomImage} />
                    </div>

                    <div
                        className={`${styles.separator} ${isResizingFile ? styles.separatorActive : ''}`}
                        onMouseDown={startResizingFile}
                    />

                    {/* CENTER: Code Editor */}
                    <div className={styles.editorPanel} style={{ width: editorPanelWidth }}>
                        <SandpackLayout>
                            <SandpackCodeEditor
                                showTabs={false}
                                showRunButton={false}
                                showLineNumbers={true}
                            />
                        </SandpackLayout>

                        {/* Security badge */}
                        <div className={`${styles.securityBadge} ${violations.length === 0 ? styles.securityPass : styles.securityFail}`}>
                            {violations.length === 0
                                ? '✅ Code is safe'
                                : `⚠ ${violations.length} issue${violations.length > 1 ? 's' : ''} found`}
                        </div>
                        {violations.length > 0 && (
                            <ul className={styles.violationList}>
                                {violations.map((v, i) => (
                                    <li key={i} className={styles.violationItem}>• {v.detail}</li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div
                        className={`${styles.separator} ${isResizingEditor ? styles.separatorActive : ''}`}
                        onMouseDown={startResizingEditor}
                    />

                    {/* RIGHT: Preview */}
                    <div className={styles.previewPanel}>
                        <SandpackLayout>
                            <SandpackPreview
                                showNavigator={false}
                                showOpenInCodeSandbox={false}
                                showRefreshButton={false}
                            />
                        </SandpackLayout>

                        <div className={styles.previewActions}>

                            <button
                                className={`${styles.previewActionBtn} ${bgMode === 'light' ? styles.previewActionBtnActive : ''}`}
                                onClick={() => setBgMode(bgMode === 'dark' ? 'light' : 'dark')}
                                title="Toggle theme"
                            >
                                {bgMode === 'dark' ? <SunIcon /> : <MoonIcon />}
                            </button>
                            <button className={styles.previewActionBtn} title="Refresh preview"
                                onClick={() => {
                                    setBgMode(prev => { const m = prev; setTimeout(() => setBgMode(m), 50); return prev === 'dark' ? 'light' : 'dark'; });
                                }}
                            >
                                <RefreshIcon />
                            </button>
                        </div>
                    </div>
                </div>
            </SandpackProvider>

            {/* ── SUBMIT MODAL ── */}
            {showSubmitModal && (
                <div className={styles.submitOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowSubmitModal(false); }}>
                    <div className={styles.submitModal}>
                        <h2 className={styles.submitModalTitle}>Submit Component</h2>
                        <p className={styles.submitModalSubtitle}>Fill in the details to share your component with the community.</p>

                        <div className={styles.formField}>
                            <label className={styles.formLabel}>
                                Name <span className={styles.formLabelRequired}>*</span>
                            </label>
                            <input
                                type="text"
                                className={styles.formInput}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Gradient Hero Section"
                                maxLength={100}
                            />
                        </div>

                        <div className={styles.formField}>
                            <label className={styles.formLabel}>Description (optional — AI generates)</label>
                            <input
                                type="text"
                                className={styles.formInput}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of the component"
                            />
                        </div>

                        <div className={styles.formField}>
                            <label className={styles.formLabel}>Category (optional — AI classifies)</label>
                            <input
                                type="text"
                                className={styles.formInput}
                                value={categoryHint}
                                onChange={(e) => setCategoryHint(e.target.value)}
                                placeholder="e.g. hero, features, pricing"
                            />
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Thumbnail (optional)</label>
                                <div className={styles.uploadArea}>
                                    <input type="file" accept="image/png, image/jpeg, image/webp"
                                        onChange={(e) => handleFileUpload(e, 'thumbnail')} className={styles.fileInput} />
                                    {thumbnailPreview
                                        ? <img src={thumbnailPreview} alt="Thumb" className={styles.previewMedia} />
                                        : <div className={styles.uploadPlaceholder}><span>Upload thumbnail</span><span className={styles.uploadInfo}>PNG, JPG up to 5MB</span></div>
                                    }
                                </div>
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Preview Video (optional)</label>
                                <div className={styles.uploadArea}>
                                    <input type="file" accept="video/mp4, video/webm"
                                        onChange={(e) => handleFileUpload(e, 'video')} className={styles.fileInput} />
                                    {videoPreview
                                        ? <video src={videoPreview} autoPlay muted loop className={styles.previewMedia} />
                                        : <div className={styles.uploadPlaceholder}><span>Upload video</span><span className={styles.uploadInfo}>MP4, WebM up to 15MB</span></div>
                                    }
                                </div>
                            </div>
                        </div>

                        <label className={styles.licenseRow}>
                            <input type="checkbox" checked={agreedToLicense}
                                onChange={(e) => setAgreedToLicense(e.target.checked)} className={styles.licenseCheckbox} />
                            <span>
                                I agree to the <Link to="/guidelines" className={styles.link}>Community Guidelines</Link> and
                                license my code under the <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer" className={styles.link}>MIT License</a>.
                            </span>
                        </label>

                        {error && <div className={styles.errorMessage}>{error}</div>}

                        <div className={styles.submitModalActions}>
                            <button className={styles.cancelBtn} onClick={() => setShowSubmitModal(false)}>Cancel</button>
                            <button className={styles.submitBtn} disabled={!isValid || submitting} onClick={handleSubmit}>
                                {submitting ? 'Submitting...' : 'Submit Component'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SSE PROGRESS ── */}
            {submissionId && (
                <ProgressStepper
                    submissionId={submissionId}
                    token={getAccessToken()}
                    onClose={() => {
                        setSubmissionId(null);
                        setSubmitting(false);
                        setShowSubmitModal(false);
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
            )}
        </div>
    );
}
