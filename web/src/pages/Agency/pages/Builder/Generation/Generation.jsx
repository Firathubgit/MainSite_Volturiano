import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FiFile, FiChevronRight, FiChevronDown, FiPlus, FiDownload, FiMonitor, FiTablet, FiSmartphone, FiExternalLink, FiRotateCw, FiRotateCcw, FiRefreshCw, FiZap, FiSlash, FiLayers, FiGlobe, FiCheckCircle, FiCamera, FiEdit2, FiSettings, FiMessageSquare } from 'react-icons/fi';
import { BsSend, BsCodeSlash, BsLayoutSidebarInset, BsPhone, BsLaptop, BsTablet, BsCheckLg, BsFileEarmarkCode, BsFolder2Open, BsFolderFill, BsTerminal } from 'react-icons/bs';
import { SiJavascript, SiReact, SiCss3 } from 'react-icons/si';
import { SparklesIcon } from 'lucide-react';
import { AIThinkingIndicator, AIMessage, PlanningRevolver } from './SSEEventHandler';
import ComponentSelector from './ComponentSelector';
import CommunitySelectorPopup from './CommunitySelectorPopup';
import { useRouteTransition } from '../../../../../contexts/RouteTransitionContext';
import { useBuilderAuth } from '../../../../../contexts/BuilderAuthContext';
import useCredits from '../../../../../hooks/useCredits';
import CreditLimitModal from '../../../../../components/Modals/CreditLimitModal';
import { builderSupabase } from '../../../../../lib/builderSupabaseClient';
import styles from './Generation.module.css';
import { OpenAIIcon, AnthropicIcon, GeminiIcon } from '../BuilderIcons2';

// Import project thumbnails for loading carousel
import volturianoLogo from '../../../../../assets/Logo/TornadoLogo.png';
import scaleIntelligenceThumbnail from '../../../../../assets/ScaleIntelegenceMocup.png';
import europaBageriThumbnail from '../../../../../assets/EuropaBageriMockipadpic.png';
import furgloveThumbnail from '../../../../../assets/FurGloveExample.png';
import solarExampleThumbnail from '../../../../../assets/SolarExample.png';
import mathornanThumbnail from '../../../../../assets/Mathörnan.png';
import chockladThumbnail from '../../../../../assets/Chocklad.png';
import qyvoraClimateThumbnail from '../../../../../assets/87shots_so.png';
import rivelonThumbnail from '../../../../../assets/134shots_so.png';
import gradientCorner from '../Dashboard/Assets/GradientCorner.png';
import gradientCornerForCard from '../Dashboard/Assets/GradientCooorrnerForCard.png';
import weirdButtonGradient from '../Dashboard/Assets/WeirdButtonGradient.png';
import coinIcon from '../Dashboard/Assets/SvgIconToken.svg';
import exportButtonImg from '../Dashboard/Assets/ExportButton.png';

const SHOWCASE_SLIDES = [
  { image: rivelonThumbnail, title: 'Turn ideas into reality', desc: 'Describe your vision and watch it come to life in seconds.' },
  { image: scaleIntelligenceThumbnail, title: 'Build software at lightspeed', desc: 'From concept to deployed application with a single prompt.' },
  { image: europaBageriThumbnail, title: 'Design without limits', desc: 'Create stunning, responsive interfaces that look professional out of the box.' },
  { image: solarExampleThumbnail, title: 'Iterate with natural language', desc: 'Simply ask for changes like you would with a human developer.' },
  { image: qyvoraClimateThumbnail, title: 'Full-stack powers included', desc: 'We handle the complex backend logic so you can focus on the product.' },
  { image: furgloveThumbnail, title: 'Production-ready code', desc: 'Clean, maintainable React and Tailwind code that you can export anytime.' },
  { image: mathornanThumbnail, title: 'Your personal AI engineer', desc: 'Available 24/7 to build, refactor, and deploy your next big idea.' },
  { image: chockladThumbnail, title: 'Launch your startup today', desc: 'Skip weeks of development time. Ship faster than ever before.' },
];

// ─── Helpers ────────────────────────────────────────────────
function parseFilesFromCode(code) {
  if (!code) return [];
  const files = [];
  const regex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
  let m;
  while ((m = regex.exec(code)) !== null) {
    let path = m[1].replace(/^\/+/, '');

    // Normalize path to ensure components land in src/components/
    if (!path.startsWith('src/') && !path.startsWith('public/')) {
      const isConfig = path.includes('config.') || path === 'package.json' || path.endsWith('.html');
      if (!isConfig) {
        path = path.startsWith('components/') ? `src/${path}` : `src/components/${path}`;
      }
    }

    let content = m[2].trim();

    // Strip markdown code fences if present
    if (content.startsWith('```')) {
      content = content.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
    }

    files.push({
      path,
      content,
      type: path.endsWith('.css') ? 'css' : (path.endsWith('.json') ? 'json' : 'jsx'),
      completed: true
    });
  }
  return files;
}

function getFileIcon(fileName) {
  if (fileName.endsWith('.jsx') || fileName.endsWith('.tsx')) return <SiReact size={14} />;
  if (fileName.endsWith('.js') || fileName.endsWith('.ts')) return <SiJavascript size={14} />;
  if (fileName.endsWith('.css')) return <SiCss3 size={14} />;
  return <FiFile size={14} />;
}

function getLanguage(path) {
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.html')) return 'html';
  return 'jsx';
}

/** Shorten very long generated filenames so chat lines stay readable (full path in title). */
function truncateMiddle(str, maxLen = 52) {
  if (str == null || str.length <= maxLen) return str;
  const ellipsis = '…';
  const inner = maxLen - ellipsis.length;
  const head = Math.ceil(inner / 2);
  const tail = Math.floor(inner / 2);
  return `${str.slice(0, head)}${ellipsis}${str.slice(-tail)}`;
}

/** Safely parse JSON from a fetch Response. Throws with a clear message if response is not ok or body is invalid. */
async function safeParseJson(res, context = 'response') {
  const text = await res.text();
  if (!res.ok) {
    let errMsg = `Server error (${res.status})`;
    try {
      const parsed = text ? JSON.parse(text) : {};
      if (parsed.error) errMsg = parsed.error;
    } catch (_) { }
    throw new Error(`${context}: ${errMsg}`);
  }
  if (!text || !text.trim()) throw new Error(`${context}: Empty response from server`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${context}: Invalid JSON - server may have returned an error page`);
  }
}

function buildFileTree(files) {
  const tree = {};
  for (const file of files) {
    const parts = file.path.split('/');
    const fileName = parts.pop();
    const dir = parts.join('/') || '.';
    if (!tree[dir]) tree[dir] = [];
    tree[dir].push({ name: fileName, path: file.path, edited: file.edited });
  }
  return tree;
}

const CornerWave = () => (
  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 400, height: 320, zIndex: 30, pointerEvents: 'none' }}>
    <img src={gradientCorner} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
  </div>
);

// ─── Number interpolation utility ───────────
function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    let end = value;
    if (start === end) return;

    let startTime = Date.now();
    let duration = 800; // ms spring duration

    let timer = setInterval(() => {
      let now = Date.now();
      let progress = Math.min((now - startTime) / duration, 1);
      let easeProgress = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(start + (end - start) * easeProgress);
      if (progress === 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value, displayValue]);

  return <>{Math.round(displayValue)}%</>;
}

const NARRATIVE_QUOTES = {
  booting: [
    "Setting up the project environment...",
    "Initializing the core architecture...",
    "Preparing the workspace for your build...",
    "Allocating resources for the site..."
  ],
  enhancing: [
    "Mapping out the best approach...",
    "Structuring the site requirements...",
    "Fleshing out the details of your vision...",
    "Translating ideas into a blueprint..."
  ],
  planning: [
    "Drafting the component hierarchy...",
    "Selecting the best layout structure...",
    "Planning the design system & styles...",
    "Organizing the page flow..."
  ],
  installing: [
    "Sourcing the required dependencies...",
    "Setting up the necessary packages...",
    "Configuring the required libraries...",
    "Installing foundational tools..."
  ],
  generating: [
    "Writing the complex code now...",
    "Building out the React components...",
    "Implementing the main logic...",
    "Structuring the user interfaces..."
  ],
  synthesizing: [
    "Connecting the components together...",
    "Integrating the system components...",
    "Ensuring smooth data flow...",
    "Assembling the final page layout..."
  ],
  verify: [
    "Running final system checks...",
    "Reviewing the code structure...",
    "Validating component functions...",
    "Ensuring responsive layout..."
  ],
  applying: [
    "Deploying code to the sandbox...",
    "Applying generated components...",
    "Injecting the final styling rules...",
    "Setting up the live preview..."
  ],
  polish: [
    "Polishing the final layout details...",
    "Refining the premium design feel...",
    "Adjusting the spacing and typography...",
    "Ensuring smooth UI animations...",
    "Applying final visual touches..."
  ],
  finishing_up: [
    "Hang on, almost finished!",
    "Finalizing the deployment...",
    "Wrapping up the final tasks...",
    "Just a few more seconds..."
  ],
  complete: [
    "Everything looks solid. Done.",
    "Build complete. Ready to preview.",
    "All set! Project is up and running.",
    "Finished! Let's preview the site."
  ],
  fallback: [
    "Working on the next step...",
    "Processing the current task...",
    "Handling tasks in the background..."
  ]
};

function getStageCategory(status) {
  if (!status) return 'fallback';
  const s = status.toLowerCase();

  if (s.includes('starting') || s.includes('booting') || s.includes('deducting')) return 'booting';
  if (s.includes('enhancing') || s.includes('deriving')) return 'enhancing';
  if (s.includes('planning') || s.includes('designing')) return 'planning';
  if (s.includes('dependencies') || s.includes('installing') || s.includes('fetching')) return 'installing';
  if (s.includes('generating') || s.includes('writing') || s.includes('building')) return 'generating';
  if (s.includes('synthesizing')) return 'synthesizing';
  if (s.includes('verify') || s.includes('validating')) return 'verify';
  if (s.includes('applying') || s.includes('injecting')) return 'applying';
  if (s.includes('polish') || s.includes('finalizing')) return 'polish';
  if (s.includes('finishing')) return 'finishing_up';
  if (s.includes('complete') || s.includes('done')) return 'complete';

  return 'fallback';
}

// ─── Shared loading state hook ─────────────
function useLoadingProgress(generationProgress) {
  const [current, setCurrent] = useState(0);
  const [randomBoost, setRandomBoost] = useState(0);
  const [monotonicFill, setMonotonicFill] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent(prev => prev + 1);
    }, 4500);
    return () => clearInterval(interval);
  }, [generationProgress?.status]);

  useEffect(() => {
    if (!generationProgress?.isGenerating) {
      setRandomBoost(0);
      setMonotonicFill(0);
      return;
    }
    setRandomBoost(prev => prev + (Math.random() * 2 + 1));
  }, [generationProgress?.status, generationProgress?.isGenerating]);

  useEffect(() => {
    if (!generationProgress?.isGenerating) return;
    const createTimer = (seconds, minInc, range) => setTimeout(() => {
      setRandomBoost(prev => prev + (Math.random() * range + minInc));
    }, seconds * 1000);
    // Reduced boost values to decrease overall pacing
    const timers = [
      createTimer(5, 1, 1), createTimer(12, 2, 2), createTimer(25, 3, 3),
      createTimer(40, 3, 3), createTimer(60, 2, 2), createTimer(80, 2, 2),
      createTimer(105, 2, 2), createTimer(130, 2, 2), createTimer(160, 2, 2),
      createTimer(190, 2, 2), createTimer(220, 1, 1),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, [generationProgress?.isGenerating]);

  useEffect(() => {
    if (!generationProgress?.isGenerating) return;
    const interval = setInterval(() => {
      // 65% Slower Pacing (14s interval) for a more deliberate and high-end "stretching" effect
      setRandomBoost(prev => prev + (Math.random() * 0.4 + 0.4));
    }, 14000);
    return () => clearInterval(interval);
  }, [generationProgress?.isGenerating]);

  useEffect(() => {
    if (!generationProgress?.isGenerating) return;
    let baseFill = 0;
    const status = (generationProgress?.status || '').toLowerCase();
    if (status.includes('complete') || status.includes('done')) baseFill = 100;
    else if (status.includes('finishing')) baseFill = 75;
    else if (status.includes('polish') || status.includes('finalizing')) baseFill = 50;
    else if (status.includes('verify') || status.includes('validating')) baseFill = 45;
    else if (status.includes('applying') || status.includes('injecting')) baseFill = 40;
    else if (status.includes('synthesizing')) baseFill = 35;
    else if (status.includes('generating') || status.includes('writing') || status.includes('building')) {
      if (generationProgress?.components?.length > 0) {
        const total = generationProgress.components.length;
        const completed = generationProgress.components.filter(c => c.completed).length;
        baseFill = 10 + (20 * (completed / Math.max(1, total)));
      } else baseFill = 10;
    }
    else if (status.includes('dependencies') || status.includes('installing') || status.includes('fetching')) baseFill = 5;
    else if (status.includes('planning') || status.includes('designing')) baseFill = 1.5;
    else if (status.includes('enhancing') || status.includes('deriving')) baseFill = 0.5;
    else if (status.includes('starting') || status.includes('booting') || status.includes('deducting')) baseFill = 0.2;
    else if (status) baseFill = 2;

    // Decreased pacing by reducing the boost damping effect (from 0.8 to 0.5) for a slower final stretch
    const boostDamping = (100 - baseFill) / 100;
    let targetFill = baseFill + (randomBoost * boostDamping * 0.5);
    targetFill = Math.min(97, targetFill);
    if (baseFill >= 100) targetFill = 100;
    setMonotonicFill(prev => {
      const isStarting = status.includes('starting...');
      const actualPrev = isStarting ? 0 : prev;
      return Math.floor(Math.max(actualPrev, targetFill));
    });
  }, [generationProgress, randomBoost]);

  let fillPercentage = 0;
  if (generationProgress?.isGenerating) fillPercentage = monotonicFill;
  else if (monotonicFill >= 85) fillPercentage = 100;

  const currentStage = getStageCategory(generationProgress?.status);
  const activeQuotes = NARRATIVE_QUOTES[currentStage] || NARRATIVE_QUOTES.fallback;
  const currentTitle = activeQuotes[current % activeQuotes.length];

  return { displayFill: fillPercentage, currentTitle, current };
}

// ─── Top Bar Loading Indicator (inline in header) ─────────────
function TopBarLoadingIndicator({ generationProgress }) {
  const { displayFill, currentTitle, current } = useLoadingProgress(generationProgress);
  const isActive = generationProgress?.isGenerating || displayFill > 0;

  if (!isActive) return null;

  return (
    <div className={styles.topBarLoading}>
      <div className={styles.topBarLoadingInner}>
        <AnimatePresence mode="wait">
          <motion.span
            key={current}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2 }}
            className={styles.topBarQuote}
          >
            {currentTitle}
          </motion.span>
        </AnimatePresence>
        <div className={styles.topBarBarRow}>
          <div className={styles.topBarLoadingBarWrap}>
            <div
              className={styles.rectangleLoadingBar}
              style={{ width: '100%', height: 9, borderRadius: 4.5, border: '1.5px solid rgba(255,255,255,0.5)', overflow: 'hidden' }}
            >
              <div className={styles.loadingFill} style={{ width: `${displayFill}%` }} />
            </div>
          </div>
          <span className={styles.topBarPercent}>
            <AnimatedNumber value={displayFill} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Loading Logo (centered in preview area) ─────────────
function LoadingLogoView({ logoState }) {
  return (
    <div className={styles.loadingContainer} style={{ position: 'relative', overflow: 'hidden' }}>
      <CornerWave />
      <div
        data-layer="TornadoLogo"
        className={
          logoState === 1 ? styles.tornadoLogoPulse :
            logoState === 2 ? styles.tornadoLogoTikiTaka :
              logoState === 3 ? styles.tornadoLogoScanner :
                styles.tornadoLogoShimmer
        }
        style={{
          width: 110, height: 110,
          '--logo-url': `url(${volturianoLogo})`
        }}
      />
    </div>
  );
}

const VIEWPORT_SIZES = {
  desktop: { label: 'Desktop', width: '100%', height: '100%', icon: FiMonitor },
  tablet: { label: 'Tablet', width: '553px', height: '667px', icon: FiTablet },
  mobile: { label: 'Mobile', width: '375px', height: '667px', icon: FiSmartphone },
};



// ─── Component ──────────────────────────────────────────────
export default function Generation() {
  const location = useLocation();
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  const chatEndRef = useRef(null);
  const sandboxCreationRef = useRef(null);
  const initStartedRef = useRef(false);

  // Auth Context & Credits
  const { session } = useBuilderAuth();
  const { isOut: outOfCredits, refreshCredits, totalAvailable, monthlyFreeRemaining, signupBonusRemaining, subscriptionRemaining, purchasedRemaining, isUnlimited, plan, subscriptionStatus, subscriptionPeriodEnd } = useCredits();
  const [showLimitModal, setShowLimitModal] = useState(false);

  // ─── Auth-aware fetch wrapper ──────────────
  // Always fetches a FRESH token via getSession() before each request.
  // This prevents the stale-closure bug where a long-running pipeline
  // (enhance → plan → generate → apply) holds on to an expired JWT from
  // the moment the user clicked "Generate".
  const authFetch = useCallback(async (url, options = {}) => {
    // getSession() is cheap: it reads from localStorage and only hits
    // the network if the token is close to expiry (Supabase auto-refresh).
    let freshToken = session?.access_token;
    try {
      if (builderSupabase) {
        const { data } = await builderSupabase.auth.getSession();
        if (data?.session?.access_token) {
          freshToken = data.session.access_token;
        }
      }
    } catch (_) { /* fall back to last-known session token */ }

    const headers = {
      ...(options.headers || {}),
      ...(freshToken ? { 'Authorization': `Bearer ${freshToken}` } : {})
    };
    return fetch(url, { ...options, headers });
  }, [session]);

  // State
  const queryParams = new URLSearchParams(location.search);
  const [sandboxData, setSandboxData] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [chatMessages, setChatMessages] = useState(() => {
    // Smart Welcome: Only show if user didn't come from Builder with a prompt
    if (location.state?.prompt || queryParams.get('import')) return [];
    return [{ content: 'Welcome! Describe what you want to build and I\'ll generate it for you.', type: 'system', timestamp: new Date() }];
  });
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiModel, setAiModel] = useState(queryParams.get('model') || location.state?.model || 'google/gemini-3.1-pro-preview');
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [showMobileSettingsModal, setShowMobileSettingsModal] = useState(false);
  const [aiThinking, setAiThinking] = useState(null);
  const [activeTab, setActiveTab] = useState('preview');
  const [previewMode, setPreviewMode] = useState('desktop');
  const [viewportRotated, setViewportRotated] = useState(false);
  const [premiumMode, setPremiumMode] = useState(queryParams.get('premiumMode') || location.state?.premiumMode || 'hybrid');
  const [allowCommunityComponents] = useState(
    queryParams.get('allowCommunity') !== 'false' && location.state?.allowCommunityComponents !== false
  );
  const [viewportDropdownOpen, setViewportDropdownOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isCommunityPopupOpen, setIsCommunityPopupOpen] = useState(false);
  const viewportDropdownRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef(null);

  const [generationProgress, setGenerationProgress] = useState({
    isGenerating: false, status: '', components: [], streamedCode: '',
    isStreaming: false, isThinking: false, thinkingText: '',
    currentFile: '', files: [], isEdit: false
  });

  const [codeApplicationState, setCodeApplicationState] = useState({ stage: null, packages: [], installedPackages: [], filesGenerated: [] });
  const [conversationContext, setConversationContext] = useState({ appliedCode: [], generatedComponents: [], currentProject: '', lastGeneratedCode: '' });
  const [isTextStreaming, setIsTextStreaming] = useState(false);
  const [pendingComponents, setPendingComponents] = useState([]);
  const [optimisticDeduction, setOptimisticDeduction] = useState(0);
  const [isDeducting, setIsDeducting] = useState(false);

  useEffect(() => {
    const handleDeduction = () => {
      setOptimisticDeduction(prev => prev + 1);
      setIsDeducting(true);
      setTimeout(() => setIsDeducting(false), 1600);
    };
    window.addEventListener('optimistic-credit-deduction', handleDeduction);
    return () => window.removeEventListener('optimistic-credit-deduction', handleDeduction);
  }, []);

  useEffect(() => {
    setOptimisticDeduction(0);
  }, [totalAvailable]);
  // MPA State Tracking
  const [expandedFolders, setExpandedFolders] = useState(new Set(['src', 'src/components', 'src/pages', 'src/app']));
  const [isMultiPageProject, setIsMultiPageProject] = useState(false);
  const [projectPages, setProjectPages] = useState([]);
  const [projectSharedComponents, setProjectSharedComponents] = useState([]);
  const [projectBuildMode, setProjectBuildMode] = useState('single_page_multi_section');
  const [projectRoutingMode, setProjectRoutingMode] = useState('none');
  const [projectChromeProfile, setProjectChromeProfile] = useState('marketing');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isViewportDragging, setIsViewportDragging] = useState(false);
  const [showCreditsPopup, setShowCreditsPopup] = useState(false);
  const dragCounter = useRef(0);
  const isDraggingRef = useRef(false);
  const chatInputAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [sandboxFiles, setSandboxFiles] = useState({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishUrl, setPublishUrl] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  // Template extraction state
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [isExtractingTemplate, setIsExtractingTemplate] = useState(false);
  const [templateResult, setTemplateResult] = useState(null); // { success, message } or null
  const [showSlugModal, setShowSlugModal] = useState(false);
  const [customSlug, setCustomSlug] = useState('');

  // Custom Website Info states
  const [siteTitle, setSiteTitle] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [siteIconFile, setSiteIconFile] = useState(null);
  const [siteIconPreview, setSiteIconPreview] = useState('');
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [publishStep, setPublishStep] = useState(1); // 1 = URL, 2 = Site Info

  const [existingPublishedSlug, setExistingPublishedSlug] = useState(null);
  const [notification, setNotification] = useState(null);
  const [lastPrompt, setLastPrompt] = useState('');
  const lastPromptRef = useRef('');  // Ref for synchronous access in useCallback closures
  const designSystemRef = useRef(null);
  const componentPlanRef = useRef(null);
  const [snapshots, setSnapshots] = useState([]);
  const [strictMode, setStrictMode] = useState(queryParams.get('strictMode') === 'true' || location.state?.strictMode || false);
  const [revertModalData, setRevertModalData] = useState(null); // { snapshot, targetIndex, promptText, components }
  const [logoState, setLogoState] = useState(0); // Shared logo state (0=Resting, 1=Pulse, 2=TikiTaka, 3=Scanner)
  const [hasPlayedCinematic, setHasPlayedCinematic] = useState(false);
  const PROJECT_UPDATE_DEDUPE_WINDOW_MS = 500;
  const PROJECT_UPDATE_FLUSH_MS = 350;
  const projectUpdateDedupRef = useRef({ inFlightByKey: new Map(), lastSentAtByKey: new Map() });
  const projectUpdateQueueRef = useRef({ pendingByProject: new Map(), flushTimer: null, flushInFlight: false });


  const showNotification = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const flushProjectUpdates = useCallback(async () => {
    const queue = projectUpdateQueueRef.current;
    if (queue.flushInFlight) return;
    queue.flushInFlight = true;
    try {
      while (queue.pendingByProject.size > 0) {
        const batch = Array.from(queue.pendingByProject.entries());
        queue.pendingByProject.clear();
        for (const [targetId, updates] of batch) {
          try {
            await authFetch('/api/projects/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ buildId: targetId, updates })
            });
          } catch (e) {
            console.warn('[Persistence] Queued update failed:', e);
          }
        }
      }
    } finally {
      queue.flushInFlight = false;
    }
  }, [session]);

  // Phase S13: Persistence Engine Helper
  const saveProjectUpdates = useCallback(async (updates) => {
    const targetId = updates.buildId || currentProjectId;
    if (!targetId) return;

    try {
      // Small cleanup: exclude buildId from updates object itself
      const { buildId: _, ...cleanUpdates } = updates;
      const canonicalize = (value) => {
        if (Array.isArray(value)) return value.map(canonicalize);
        if (value && typeof value === 'object' && !(value instanceof Date)) {
          const sorted = Object.keys(value).sort().reduce((acc, key) => {
            acc[key] = canonicalize(value[key]);
            return acc;
          }, {});
          return sorted;
        }
        return value;
      };

      const payloadKey = `${targetId}|${JSON.stringify(canonicalize(cleanUpdates))}`;
      const dedupeState = projectUpdateDedupRef.current;
      const now = Date.now();
      const lastSentAt = dedupeState.lastSentAtByKey.get(payloadKey);
      if (lastSentAt && now - lastSentAt < PROJECT_UPDATE_DEDUPE_WINDOW_MS) {
        return;
      }

      if (dedupeState.inFlightByKey.has(payloadKey)) {
        return dedupeState.inFlightByKey.get(payloadKey);
      }

      const persistPromise = (async () => {
        const queue = projectUpdateQueueRef.current;
        const existing = queue.pendingByProject.get(targetId) || {};
        queue.pendingByProject.set(targetId, { ...existing, ...cleanUpdates });
        if (!queue.flushTimer) {
          queue.flushTimer = setTimeout(async () => {
            queue.flushTimer = null;
            await flushProjectUpdates();
          }, PROJECT_UPDATE_FLUSH_MS);
        }
        dedupeState.lastSentAtByKey.set(payloadKey, Date.now());
      })()
        .finally(() => {
          dedupeState.inFlightByKey.delete(payloadKey);
          const cutoff = Date.now() - 60000;
          for (const [key, ts] of dedupeState.lastSentAtByKey.entries()) {
            if (ts < cutoff) dedupeState.lastSentAtByKey.delete(key);
          }
        });

      dedupeState.inFlightByKey.set(payloadKey, persistPromise);
      await persistPromise;
    } catch (e) {
      console.warn('[Persistence] Passive update failed:', e);
    }
  }, [currentProjectId, session, PROJECT_UPDATE_DEDUPE_WINDOW_MS, PROJECT_UPDATE_FLUSH_MS, flushProjectUpdates]);

  const addChatMessage = useCallback((content, type, metadata) => {
    setChatMessages(prev => {
      const newMessages = [...prev, { content, type, timestamp: new Date(), metadata }];
      // Phase S13: Auto-save chat history
      saveProjectUpdates({ chat_history: newMessages });
      return newMessages;
    });
  }, [saveProjectUpdates]);

  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const pauseTimerRef = useRef(null);

  const handleManualScroll = useCallback((e) => {
    const el = e.currentTarget;
    // If user is within 60px of bottom, consider them "at bottom" and keep pinning.
    // If they scroll higher, pause auto-scroll so they can read history without being snapped back.
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 60;

    if (!isAtBottom) {
      if (!autoScrollPaused) setAutoScrollPaused(true);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = setTimeout(() => {
        setAutoScrollPaused(false);
      }, 4000); // Resume pinning after 4s of no scroll activity
    } else {
      if (autoScrollPaused) setAutoScrollPaused(false);
    }
  }, [autoScrollPaused]);

  // 🚀 HIGH-PERFORMANCE AUTO-SCROLL ENGINE
  // This ensures the chat is ALWAYS at the bottom during:
  // 1. New message additions (chatMessages dependency)
  // 2. Status updates / thinking indicators
  // 3. INTERNAL height changes (images loading, logs manifesting)
  // 4. Real-time letter-by-letter streaming animations
  useEffect(() => {
    if (!chatEndRef.current) return;
    const container = chatEndRef.current.parentElement;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (autoScrollPaused) return; // Respect user manual scroll reviews
      container.scrollTop = container.scrollHeight;
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [autoScrollPaused]);

  // Dedicated loop for AI Text Streaming to ensure pixel-perfect tracking of the reveal animation
  useEffect(() => {
    if (!isTextStreaming || !chatEndRef.current) return;
    const container = chatEndRef.current.parentElement;
    if (!container) return;

    let active = true;
    const forceScroll = () => {
      if (!active || autoScrollPaused) return;
      container.scrollTop = container.scrollHeight;
      requestAnimationFrame(forceScroll);
    };

    forceScroll();
    return () => { active = false; };
  }, [isTextStreaming, autoScrollPaused]);

  // Fallback for metadata-driven changes and discrete state swaps
  useEffect(() => {
    if (!chatEndRef.current || autoScrollPaused) return;
    const timer = setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    return () => clearTimeout(timer);
  }, [chatMessages, generationProgress.status, isTextStreaming, aiThinking, autoScrollPaused]);

  const getThumbnailUrl = useCallback((path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const { data } = builderSupabase.storage.from('builder-assets').getPublicUrl(path);
    return data?.publicUrl;
  }, []);

  const [statusDots, setStatusDots] = useState('');
  const [previewLogs, setPreviewLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(322);
  const [isResizing, setIsResizing] = useState(false);

  const [deliveryQueue, setDeliveryQueue] = useState([]);
  const isProcessingQueue = useRef(false);

  // ─── Fetch Sandbox Files ──────────────
  const fetchSandboxFiles = useCallback(async () => {
    if (!sandboxData?.sandboxId) return;
    try {
      const res = await fetch(`/api/get-sandbox-files?sandboxId=${sandboxData.sandboxId}`);
      const data = await res.json();
      if (data.success) setSandboxFiles(data.files || {});
    } catch (e) { console.warn('Failed to fetch sandbox files:', e); }
  }, [sandboxData?.sandboxId]);

  // Listen for console logs from sandbox
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'sandbox-console') {
        setPreviewLogs(prev => [...prev.slice(-99), event.data]); // Keep last 100 logs
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchSnapshots = useCallback(async () => {
    if (!currentProjectId) return;
    try {
      const res = await authFetch(`/api/snapshots?projectId=${currentProjectId}`);
      const data = await res.json();
      if (data.success) setSnapshots(data.snapshots);
    } catch (e) { console.warn('Fetch snapshots failed:', e); }
  }, [currentProjectId, session]);

  useEffect(() => {
    if (currentProjectId) fetchSnapshots();
  }, [currentProjectId, fetchSnapshots]);

  const takeManualSnapshot = useCallback(async () => {
    if (!currentProjectId) return;
    try {
      setAiThinking({ stage: 'Taking state snapshot...' });

      // Get latest files from sandbox to ensure accuracy
      const filesRes = await fetch(`/api/get-sandbox-files?sandboxId=${sandboxData?.sandboxId}`);
      const filesData = await filesRes.json();
      const currentFiles = filesData.success ? filesData.files : sandboxFiles;

      const res = await authFetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          chatIndex: chatMessages.length,
          text: 'Manual Point-in-time Snapshot',
          files: currentFiles,
          designSystem: designSystemRef.current,
          componentPlan: componentPlanRef.current,
          sandboxUrl: sandboxData?.url,
          sandboxId: sandboxData?.sandboxId
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('✅ State snapshot created.');
        fetchSnapshots();
      }
    } catch (e) {
      console.error('Manual snapshot failed:', e);
    } finally {
      setAiThinking(null);
    }
  }, [currentProjectId, sandboxData?.sandboxId, sandboxFiles, chatMessages.length, session, fetchSnapshots, showNotification]);
  useEffect(() => {
    const hasActiveWork = generationProgress.isGenerating || !!aiThinking || !!codeApplicationState.stage;
    if (!hasActiveWork) return;

    const dotsInterval = setInterval(() => {
      setStatusDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => {
      clearInterval(dotsInterval);
    };
  }, [generationProgress.isGenerating, aiThinking, codeApplicationState.stage]);

  // Unified Serial Delivery: Ensures Wrote logs and AI messages follow correct order
  useEffect(() => {
    if (deliveryQueue.length === 0 || isProcessingQueue.current) return;

    const processNext = async () => {
      isProcessingQueue.current = true;
      const [next, ...rest] = deliveryQueue;

      if (next.type === 'log') {
        addChatMessage(next.path, 'log');
        // Randomized delay between 1-3 seconds to make the process feel "deliberate" but snappy
        const logDelay = Math.floor(Math.random() * 2000) + 1000;
        await new Promise(r => setTimeout(r, logDelay));
      } else {
        addChatMessage(next.content, next.chatType || 'ai-narrator', next.metadata);
        await new Promise(r => setTimeout(r, 400)); // Short gap for messages
      }

      setDeliveryQueue(prev => prev.slice(1));
      isProcessingQueue.current = false;
    };

    processNext();
  }, [deliveryQueue, addChatMessage]);

  // Click outside handlers for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Viewport dropdown
      if (viewportDropdownRef.current && !viewportDropdownRef.current.contains(event.target)) {
        setViewportDropdownOpen(false);
      }
      // Model dropdown (Chat Input area)
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        setModelDropdownOpen(false);
      }
      // Export dropdown
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setExportDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUnifiedStatus = useCallback(() => {
    // 1. Technical stage priority
    if (codeApplicationState.stage === 'installing') {
      const pkgList = codeApplicationState.packages?.join(', ') || 'dependencies';
      return `Installing dependencies: ${pkgList}`;
    }
    if (codeApplicationState.stage === 'booting') return 'Preparing environment';
    if (codeApplicationState.stage === 'applying') return 'Finalizing sandbox';
    if (codeApplicationState.stage === 'analyzing') return 'Analyzing code structure';

    // 2. AI Narrator stage priority
    if (aiThinking?.stage) {
      switch (aiThinking.stage) {
        case 'analyzing': return 'Analyzing requirements';
        case 'planning': return 'Designing architecture';
        case 'building': return 'Writing components';
        case 'verifying': return 'Verifying build';
        case 'repairing': return 'Fixing issues';
      }
    }

    return (generationProgress.status || 'Working').replace(/\.\.\.*$/, '');
  }, [codeApplicationState.stage, codeApplicationState.packages, aiThinking, generationProgress.status]);

  // Map AI pipeline steps to logo personality traits
  useEffect(() => {
    if (!generationProgress?.isGenerating && !aiThinking && !codeApplicationState?.stage) {
      setLogoState(0); // Resting (easywork)
      return;
    }

    const stage = aiThinking?.stage || codeApplicationState?.stage;
    const unified = getUnifiedStatus().toLowerCase();

    // 0 = Resting (shimmer)
    // 1 = Pulse (evaluating what to do from here)
    // 2 = TikiTaka (doing stuff)
    // 3 = Scanner (doingstuff/thinking to execute goodly)
    if (stage === 'analyzing' || unified.includes('analyzing') || unified.includes('requirements')) {
      setLogoState(1); // Pulse
    } else if (stage === 'planning' || unified.includes('designing') || unified.includes('plan')) {
      setLogoState(1); // Pulse
    } else if (stage === 'booting' || unified.includes('environment')) {
      setLogoState(0); // Resting
    } else if (stage === 'installing' || unified.includes('dependencies')) {
      setLogoState(2); // TikiTaka
    } else if (stage === 'building' || unified.includes('writing') || unified.includes('synthesizing') || unified.includes('applying') || unified.includes('finalizing')) {
      setLogoState(3); // Scanner
    } else if (stage === 'verifying' || unified.includes('verify')) {
      setLogoState(3); // Scanner
    } else if (stage === 'repairing' || unified.includes('fix')) {
      setLogoState(1); // Pulse
    } else if (generationProgress?.isGenerating) {
      setLogoState(2); // TikiTaka as default for active generation
    } else {
      setLogoState(0); // Resting
    }
  }, [generationProgress?.isGenerating, generationProgress?.status, aiThinking?.stage, codeApplicationState?.stage, getUnifiedStatus]);

  // Sidebar Resizing Logic
  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e) => {
    if (isResizing) {
      const newWidth = e.clientX;
      const BASE = 322;
      const minW = BASE - (window.innerWidth * 0.04); // -4% of screen
      const maxW = BASE + (window.innerWidth * 0.12); // +12% of screen

      if (newWidth >= minW && newWidth <= maxW) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // ─── Helpers ──────────────

  const [pendingImages, setPendingImages] = useState([]);

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    let addedCount = 0;
    const totalPossible = pendingImages.length;

    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        if (totalPossible + addedCount >= 10) {
          showNotification("Maximum of 10 images allowed.");
          return;
        }
        const file = item.getAsFile();
        if (file) {
          addedCount++;
          const reader = new FileReader();
          reader.onload = (event) => {
            setPendingImages(prev => [...prev.slice(0, 10), event.target.result].slice(0, 10));
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }, [pendingImages]);

  const processFiles = useCallback((files) => {
    if (!files) return;

    if (pendingImages.length + files.length > 10) {
      showNotification("Maximum of 10 images allowed.");
      return;
    }

    for (const file of files) {
      if (file.type.indexOf("image") !== -1) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPendingImages(prev => [...prev, event.target.result]);
        };
        reader.readAsDataURL(file);
      }
    }
  }, [pendingImages]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    processFiles(e.dataTransfer?.files);
  }, [processFiles]);

  const removePendingImage = (index) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Create Sandbox ──────────────
  const createSandbox = useCallback(async () => {
    if (sandboxCreationRef.current) return sandboxCreationRef.current;

    const promise = (async () => {
      try {
        const res = await authFetch('/api/create-ai-sandbox-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await safeParseJson(res, 'create-ai-sandbox');
        if (!data.success) throw new Error(data.error || 'Failed to create sandbox');
        setSandboxData({ sandboxId: data.sandboxId, url: data.url });
        return data;
      } finally {
        sandboxCreationRef.current = null;
      }
    })();

    sandboxCreationRef.current = promise;
    return promise;
  }, [session]);

  // ─── Apply Generated Code ──────────────
  const applyGeneratedCode = useCallback(async (generatedCode, isEdit, buildId, explicitFiles = null, skipPolish = false, passedSandboxId = null, isResume = false, passedSandboxUrl = null, options = {}) => {
    let activeSandboxId = passedSandboxId || sandboxData?.sandboxId;
    let activeSandboxUrl = passedSandboxUrl || sandboxData?.url;

    // Phase S13: Ensure proactive sandbox creation on resume
    if (!activeSandboxId) {
      setCodeApplicationState({ stage: 'booting', packages: [], installedPackages: [], filesGenerated: [] });
      try {
        const sb = await createSandbox();
        activeSandboxId = sb.sandboxId;
        activeSandboxUrl = sb.url;
      } catch (sbErr) {
        console.error('[applyGeneratedCode] Sandbox boot failed:', sbErr);
        addChatMessage(`Failed to start preview environment: ${sbErr.message}`, 'error');
        return;
      }
    }

    setCodeApplicationState({ stage: 'analyzing', packages: [], installedPackages: [], filesGenerated: [] });

    try {
      let filesPayload = explicitFiles;

      if (!filesPayload && generatedCode) {
        filesPayload = parseFilesFromCode(generatedCode).map(f => ({
          path: f.path,
          content: f.content
        }));
      }
      const polishSkipPaths = Array.isArray(options?.polishSkipPaths)
        ? [...new Set(options.polishSkipPaths.filter((p) => typeof p === 'string' && p.trim()))]
        : [];

      const response = await authFetch('/api/apply-ai-code-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: generatedCode || '', // Legacy fallback (can be empty if files provided)
          files: filesPayload || [],     // New primary payload
          isEdit,
          packages: [],
          sandboxId: activeSandboxId,
          model: aiModel,
          premiumMode,
          buildId,
          prompt: lastPromptRef.current || lastPrompt || '',  // Ref avoids stale closure, state is fallback
          skipPolish,
          isResume,
          polishSkipPaths
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            const eventType = data.type || data.event; // Handle both legacy and new SSE events

            switch (eventType) {
              case 'start':
              case 'plan_started':
              case 'apply_started':
                setCodeApplicationState(prev => ({ ...prev, stage: 'analyzing' }));
                break;

              case 'ai_thinking':
                setIsTextStreaming(false);
                setAiThinking({ stage: data.stage || 'thinking' });
                break;

              case 'ai_message':
                setAiThinking(null); // Stop thinking
                if (!isResume) {
                  setDeliveryQueue(prev => [...prev, { type: 'message', content: data.message, chatType: 'ai-narrator', metadata: { style: data.style, context: data.context } }]);
                  if (data.message.toLowerCase().includes('polish')) {
                    setGenerationProgress(prev => ({ ...prev, status: 'Polishing...' }));
                  }
                }
                break;

              case 'step':
                setIsTextStreaming(false);
                if (data.message?.includes('Installing')) setCodeApplicationState(prev => ({ ...prev, stage: 'installing', packages: data.packages || prev.packages }));
                else setCodeApplicationState(prev => ({ ...prev, stage: 'applying' }));
                break;

              case 'progress':
              case 'package-progress':
                setCodeApplicationState(prev => ({ ...prev, installedPackages: data.installedPackages || [] }));
                break;

              case 'file_written':
              case 'file-progress': {
                const filePath = data.path || data.fileName;
                setCodeApplicationState(prev => ({ ...prev, stage: 'applying', filesGenerated: [...prev.filesGenerated, filePath] }));
                if (!isResume) {
                  setDeliveryQueue(prev => [...prev, { type: 'log', path: filePath }]);
                }
                break;
              }

              // Build Verification Events
              case 'verify_started':
              case 'verify-start':
                setIsTextStreaming(false);
                setCodeApplicationState(prev => ({ ...prev, stage: 'verifying' }));
                setAiThinking({ stage: 'verifying' });
                setGenerationProgress(prev => ({ ...prev, status: 'Verifying...' }));
                break;

              case 'verify_passed':
              case 'verify-passed':
                setIsTextStreaming(false);
                setCodeApplicationState(prev => ({ ...prev, stage: 'verified' }));
                setAiThinking(null);
                // AI Narrator handles the message, but we keep this for legacy correctness
                if (!data.event && !isResume) setDeliveryQueue(prev => [...prev, { type: 'message', content: 'Build verification passed.', chatType: 'ai' }]);
                break;

              case 'verify_failed':
              case 'verify-failed':
                setIsTextStreaming(false);
                setCodeApplicationState(prev => ({ ...prev, stage: 'verification_failed' }));
                setAiThinking(null);

                // Add a detailed error message if we failed completely (all attempts)
                if (data.attempts >= Object.keys(data).length - 3) { // rudimentary check
                  addChatMessage(`Build verification failed after ${data.attempts} attempts! Check logs.`, 'error');
                } else if (!data.event && !data.attempts) {
                  // Legacy fallback
                  addChatMessage(`Build verification failed! Check logs below.\n\n${data.message}`, 'error');
                }

                if (data.logs) {
                  console.error('[Generation] Build Logs:', data.logs);
                }
                break;

              case 'repair_started':
                setIsTextStreaming(false);
                // AI Narrator handles this visually
                if (data.attempt) {
                  console.log(`[Generation] Starting repair attempt ${data.attempt} / ${data.maxAttempts}`);
                }
                break;

              case 'repair_done':
              case 'repair-done':
                setIsTextStreaming(false);
                // AI Narrator handles this
                if (!data.event) setDeliveryQueue(prev => [...prev, { type: 'message', content: 'Auto-Repair successful! Fixed files: ' + data.changed?.join(', '), chatType: 'ai' }]);
                break;

              case 'rollback_started':
                setIsTextStreaming(false);
                setCodeApplicationState(prev => ({ ...prev, stage: 'rollback' }));
                break;

              case 'rollback_done':
              case 'rollback-done':
                setIsTextStreaming(false);
                setCodeApplicationState(prev => ({ ...prev, stage: 'rollback' }));
                if (!data.event) addChatMessage('Rollback complete. Sandbox restored to previous valid state.', 'warning');
                break;

              case 'polish_started':
                setIsTextStreaming(false);
                setAiThinking({ stage: 'building' });
                setGenerationProgress(prev => ({ ...prev, status: 'Polishing...' }));
                break;

              case 'polish_done':
                setIsTextStreaming(false);
                setAiThinking(null);
                setGenerationProgress(prev => ({ ...prev, status: 'Finalizing...' }));
                break;

              case 'complete':
                setIsTextStreaming(false);
                setCodeApplicationState({ stage: 'complete', packages: [], installedPackages: [], filesGenerated: data.results?.filesCreated || data.filesCreated || [] });
                setAiThinking(null);
                setGenerationProgress(prev => {
                  const newFiles = parseFilesFromCode(generatedCode);
                  const updatedFiles = [...prev.files];
                  newFiles.forEach(newFile => {
                    const idx = updatedFiles.findIndex(f => f.path === newFile.path);
                    if (idx !== -1) {
                      updatedFiles[idx] = { ...updatedFiles[idx], content: newFile.content, type: newFile.type };
                    } else {
                      updatedFiles.push(newFile);
                    }
                  });
                  return { ...prev, status: 'finishing', files: updatedFiles };
                });
                setConversationContext(prev => ({
                  ...prev,
                  appliedCode: [...prev.appliedCode, { files: data.results?.filesCreated || data.filesCreated || [], timestamp: new Date() }],
                  lastGeneratedCode: generatedCode
                }));

                // Phase S2: Sync Generated Files to Supabase Project
                // Phase S2 & S13: Sync Generated Files to Supabase Project
                if (!isResume) {
                  saveProjectUpdates({
                    buildId: buildId,
                    generated_files: data.results?.filesCreated || data.filesCreated || [],
                    total_files: (data.results?.filesCreated || data.filesCreated || []).length,
                    build_status: 'preview'
                  });

                  // Phase S2: Save Snapshot to Supabase
                  try {
                    // Fetch the raw, EXACT files directly from the sandbox (including polish passes)
                    fetch(`/api/get-sandbox-files?sandboxId=${activeSandboxId}`)
                      .then(res => res.json())
                      .then(sandboxFilesData => {
                        if (sandboxFilesData.success) {
                          const fullFilesMap = sandboxFilesData.files || {};

                          return authFetch('/api/snapshots', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              projectId: buildId,
                              chatIndex: chatMessages.length, // Current message will be added after this
                              text: lastPrompt || (generatedCode ? 'Code generated' : 'Files generated'),
                              files: fullFilesMap,
                              packages: data.packages || [],
                              designSystem: designSystemRef.current,
                              componentPlan: componentPlanRef.current,
                              sandboxUrl: activeSandboxUrl,
                              sandboxId: activeSandboxId
                            })
                          });
                        } else {
                          throw new Error('Failed to fetch raw sandbox files');
                        }
                      })
                      .then(() => {
                        // Refresh snapshots after saving
                        fetchSnapshots();
                      })
                      .catch(e => console.warn('Snapshot save failed:', e));

                    // Phase S3: Technical build summary (subtle system message)
                    const technicalSummary = isEdit ? `Iteration applied: ${lastPrompt}` : `Initial build ready: ${lastPrompt}`;
                    addChatMessage(technicalSummary, 'system', {
                      isTechnical: true,
                      chatIndex: chatMessages.length
                    });

                  } catch (e) {
                    console.error('Snapshot prep failed:', e);
                  }
                }

                // Refresh iframe after a delay so Vite picks up new files
                setTimeout(() => {
                  if (iframeRef.current && sandboxData?.url) {
                    iframeRef.current.src = sandboxData.url + '?t=' + Date.now();
                  }
                }, 3000);
                fetchSandboxFiles();
                setTimeout(() => setCodeApplicationState(prev => ({ ...prev, stage: null })), 4000);
                break;
              case 'error':
                setIsTextStreaming(false);
                setAiThinking(null);
                addChatMessage(`Error: ${data.message}`, 'error');
                break;
            }
          } catch (e) { /* skip parse errors */ }
        }
      }
    } catch (error) {
      console.error('[applyGeneratedCode] Error:', error);
      addChatMessage(`Failed to apply code: ${error.message}`, 'error');
      setCodeApplicationState({ stage: null, packages: [], installedPackages: [], filesGenerated: [] });

      // Phase S2 & S13: Sync failure state
      saveProjectUpdates({ buildId: buildId, build_status: 'failed' });

    }
  }, [sandboxData, addChatMessage, chatMessages.length, session, lastPrompt, premiumMode, saveProjectUpdates, currentProjectId, fetchSnapshots]);


  // --- Helper for AI Edits (Shared between Chat and Community Integration) ---
  const handleAIGeneratedEdit = useCallback(async (promptText, buildId, sandbox) => {
    try {
      const res = await authFetch('/api/generate-ai-code-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          model: aiModel,
          isMultiPage: isMultiPageProject,
          currentPages: projectPages,
          siteMap: generationProgress.files.find(f => f.path === 'src/app/siteMap.js')?.content || '',
          context: {
            sandboxId: sandbox.sandboxId,
            conversationContext,
            recentMessages: chatMessages.slice(-10),
            sandboxUrl: sandbox.url,
            buildMode: projectBuildMode,
            routingMode: projectRoutingMode,
            chromeProfile: projectChromeProfile,
            plan: {
              components: componentPlanRef.current || [],
              isMultiPage: isMultiPageProject,
              pages: projectPages || [],
              sharedComponentRefIds: (projectSharedComponents || []).map((c) => c.refId || c.exportName || c.name).filter(Boolean),
              buildMode: projectBuildMode,
              routingMode: projectRoutingMode,
              chromeProfile: projectChromeProfile
            },
            premiumComponents: generationProgress.files
              .filter(f => f.path.includes('components/premium/'))
              .map(f => ({ name: f.path.split('/').pop().replace(/\.(jsx|tsx)$/, ''), path: f.path }))
          },
          isEdit: true,
          buildId
        })
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = `Streaming API error (${res.status})`;
        try { const j = text ? JSON.parse(text) : {}; if (j.message) msg = j.message; } catch (_) { }
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'status') setGenerationProgress(prev => ({ ...prev, status: data.message }));
            else if (data.type === 'component') setGenerationProgress(prev => ({ ...prev, currentFile: data.path }));
            else if (data.type === 'complete' && data.generatedCode) {
              await applyGeneratedCode(data.generatedCode, true, buildId, null, false, sandbox.sandboxId, false, sandbox.url);
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (e) { /* skip */ }
        }
      }
    } catch (e) {
      throw e;
    }
  }, [
    aiModel,
    conversationContext,
    chatMessages,
    generationProgress.files,
    applyGeneratedCode,
    projectBuildMode,
    projectRoutingMode,
    projectChromeProfile,
    isMultiPageProject,
    projectPages,
    projectSharedComponents
  ]);

  // ─── Start Generation (Prompt-only) ──────────────
  const startGeneration = useCallback(async (prompt, templateId = null, initialImages = [], manualSelectionIds = null, providedBuildId = null, strictMode = false, initialComponentsFull = null) => {
    // 🚧 FINAL CREDIT CHECK: Gatekeeper
    if (outOfCredits) {
      setShowLimitModal(true);
      return;
    }

    setLoading(true);
    setLastPrompt(prompt);
    lastPromptRef.current = prompt;  // Synchronous update for polish step
    setDeliveryQueue([]);
    setIsMultiPageProject(false);
    setProjectPages([]);
    setProjectSharedComponents([]);
    setProjectBuildMode('single_page_multi_section');
    setProjectRoutingMode('none');
    setProjectChromeProfile('marketing');

    // Add deducting message to the loading state
    setGenerationProgress(prev => ({ ...prev, isGenerating: true, status: 'Starting... (Deducting 1 Credit)', files: [], streamedCode: '' }));

    const displayPrompt = templateId ? "I want to use this template" : prompt;
    addChatMessage(displayPrompt, 'user', { images: initialImages, stagedComponents: initialComponentsFull });

    // Robust UUID generator
    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };

    let buildId = providedBuildId || generateUUID();
    console.log('[Generation] Starting Build:', buildId);

    try {
      if (!providedBuildId) {
        // 1. Project Init & Rate Limiting Check (Phase S2)
        setGenerationProgress(prev => ({ ...prev, status: 'Initializing project...' }));
        const initRes = await authFetch('/api/projects/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: displayPrompt, buildId })
        });

        const initData = await safeParseJson(initRes, 'project-init');
        if (!initData.success) {
          setGenerationProgress(prev => ({ ...prev, isGenerating: false, status: '' }));
          addChatMessage(initData.error || 'Failed to initialize project. Please try again.', 'error');
          setLoading(false);
          return; // HALT GENERATION
        }

        // If DB returned a specific ID, use it
        if (initData.projectId) {
          buildId = initData.projectId;
          setCurrentProjectId(buildId);
        }
      } else {
        // We are extending an existing project
        setCurrentProjectId(buildId);
      }

      // 1c. Clear the location state so refresh doesn't re-trigger after success
      window.history.replaceState({}, document.title);

      // 1b. Create sandbox if needed
      let sandbox = sandboxData;
      if (!sandbox) {
        setGenerationProgress(prev => ({ ...prev, status: 'Creating sandbox...' }));
        // addChatMessage('Creating sandbox environment...', 'system');
        const createData = await createSandbox();
        sandbox = { sandboxId: createData.sandboxId, url: createData.url };
      }

      // ── TEMPLATE MODE: skip enhance/select/plan, build directly ──
      if (templateId) {
        setGenerationProgress(prev => ({ ...prev, status: `Building template...` }));
        addChatMessage("Alright, I will set up the template for you.", 'ai-narrator', { style: 'planning' });

        const templateRes = await authFetch('/api/build-template', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId, images: initialImages, buildId })
        });
        const templateData = await safeParseJson(templateRes, 'build-template');
        if (!templateData.success) throw new Error(templateData.error || 'Template build failed');

        // addChatMessage(`Template resolved: ${templateData.resolvedComponents.length} premium components`, 'system');

        setGenerationProgress(prev => ({
          ...prev, status: 'Applying template code...', files: parseFilesFromCode(templateData.code)
        }));

        await applyGeneratedCode(templateData.code, false, buildId, null, true, sandbox.sandboxId, false, sandbox.url);
        // addChatMessage('Template built and applied! Check the preview tab.', 'ai');
        setActiveTab('preview');
        return; // Done — template mode exits here
      }

      // ── PROMPT MODE: enhance → select → plan → generate/bundle → apply ──

      // 2. Enhance prompt
      setGenerationProgress(prev => ({ ...prev, status: 'Enhancing prompt...' }));
      let finalPrompt = prompt;
      try {
        const enhanceRes = await authFetch('/api/enhance-prompt', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, images: initialImages, model: aiModel, mode: 'prompt-only', buildId })
        });
        const enhanceData = await safeParseJson(enhanceRes, 'enhance-prompt');
        if (enhanceData.success && enhanceData.wasEnhanced) {
          const ep = enhanceData.enhancedPrompt;
          const refusalLike =
            typeof ep === 'string' &&
            ep.length > 80 &&
            /\brespectfully decline\b/i.test(ep) &&
            /\b(ethical|cannot|unable|policy)\b/i.test(ep);
          finalPrompt = refusalLike ? prompt : ep;
          if (refusalLike) {
            console.warn('[BUILDER-VERIFY] enhance: refusal/safety blob discarded; using original user prompt');
          }
          // Phase S13: Sync enhanced prompt
          saveProjectUpdates({ enhanced_prompt: finalPrompt });
        }
      } catch (e) { console.warn('Enhance failed, using original:', e); }

      let intentClassification = null;
      setGenerationProgress(prev => ({ ...prev, status: 'Classifying intent...' }));
      try {
        const classifyRes = await authFetch('/api/classify-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: finalPrompt,
            rawPrompt: prompt,
            images: initialImages,
            model: aiModel,
            buildId,
            allowCommunityComponents
          })
        });
        const classifyData = await safeParseJson(classifyRes, 'classify-intent');
        if (classifyData.success && classifyData.intentClassification) {
          intentClassification = classifyData.intentClassification;
          console.log(
            '[BUILDER-VERIFY] generation: intent layoutType=%s buildMode=%s routingMode=%s',
            intentClassification.layoutType,
            intentClassification.buildMode,
            intentClassification.routingMode
          );
          if (intentClassification.buildMode) setProjectBuildMode(intentClassification.buildMode);
          if (intentClassification.routingMode) setProjectRoutingMode(intentClassification.routingMode);
          if (intentClassification.chromeProfile) setProjectChromeProfile(intentClassification.chromeProfile);
        }
      } catch (e) {
        console.warn('[Generation] classify-intent failed:', e);
      }

      // 2b. Derive design system (NEW — contextual intelligence engine)
      let designSystem = null;
      setGenerationProgress(prev => ({ ...prev, status: 'Deriving design system...' }));
      try {
        const dsRes = await authFetch('/api/derive-design-system', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enhancedPrompt: finalPrompt, images: initialImages, buildId, model: aiModel })
        });
        const dsData = await safeParseJson(dsRes, 'derive-ds');
        if (dsData.success && dsData.designSystem) {
          designSystem = dsData.designSystem;
          designSystemRef.current = designSystem;
          // Phase S2 & S13: Sync design system
          saveProjectUpdates({
            design_system: designSystem,
            industry: designSystem.industryCategory || 'general',
            build_status: 'generating'
          });
        }
      } catch (e) { console.warn('DS derivation failed, continuing without:', e); }

      // 3. Select premium components (ONLY IF PREMIUM MODE IS ON)
      let selectionContext = null;

      // 3. (Manual Selection Mode) - Build Directly if NO prompt
      // If there IS a prompt, we always want to go through the planner to adapt the components
      const isDumbBuild = !prompt || prompt === "Build from community components" || prompt === "Analyze design and build";
      if (manualSelectionIds && manualSelectionIds.length > 0 && isDumbBuild) {
        if (!providedBuildId) {
          // --- INITIAL BUILD MODE ---
          setGenerationProgress(prev => ({ ...prev, status: `Building from selection (${manualSelectionIds.length})...` }));

          const selectionRes = await authFetch('/api/build-from-selection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ componentIds: manualSelectionIds, buildId })
          });

          const selectionData = await safeParseJson(selectionRes, 'build-from-selection');
          if (!selectionData.success) throw new Error(selectionData.error || 'Manual build failed');

          setGenerationProgress(prev => ({
            ...prev,
            status: 'Applying selection code...',
            files: parseFilesFromCode(selectionData.code)
          }));

          addChatMessage(`Building selection: ${manualSelectionIds.join(', ')}`, 'system');
          if (selectionData.missingComponents && selectionData.missingComponents.length > 0) {
            addChatMessage(`Warning: Could not build components: ${selectionData.missingComponents.join(', ')}`, 'error');
          }
          if (selectionData.resolvedComponents && selectionData.resolvedComponents.length > 0) {
            addChatMessage(`Successfully resolved: ${selectionData.resolvedComponents.join(', ')}`, 'success');
          }

          await applyGeneratedCode(selectionData.code, false, buildId, null, true, sandbox.sandboxId, false, sandbox.url);
          setActiveTab('preview');
          return; // Done - Direct build exits here
        } else {
          // --- APPEND/INTEGRATE MODE (Phase S11) ---
          setGenerationProgress(prev => ({ ...prev, status: `Fetching ${manualSelectionIds.length} community components...` }));
          addChatMessage(`Integrating ${manualSelectionIds.length} new components into your current build...`, 'system');

          // 1. Fetch Bundles
          const bundleResults = await Promise.all(
            manualSelectionIds.map(id =>
              authFetch('/api/component-bundle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, format: 'fileblocks', buildId })
              })
                .then(r => r.json())
                .catch(e => ({ success: false, error: e.message }))
            )
          );

          const successfulBundles = bundleResults.filter(r => r.success);
          if (successfulBundles.length === 0) throw new Error('Failed to fetch any of the selected components.');

          // 2. Extract files and names
          const newFiles = [];
          const componentNames = [];
          successfulBundles.forEach(data => {
            const files = parseFilesFromCode(data.fileBlocks);

            // Extract Name for the prompt
            const exportMatch = data.fileBlocks.match(/export default (?:function |class |const )?(\w+)/);
            const compName = exportMatch ? exportMatch[1] : 'Unknown';
            if (exportMatch) componentNames.push(compName);

            // V4.0 logic: If component is labeled as a page in metadata (or fallback inference)
            const isPage = data.component_type === 'page' || compName.toLowerCase().includes('page');
            const basePath = isPage ? 'src/pages' : 'src/components/premium';

            const updatedFiles = files.map(f => {
              // Route the file to src/pages if it represents a page component
              if (isPage && f.path.includes('src/components/premium/')) {
                const fileName = f.path.split('/').pop();
                return { ...f, path: `${basePath}/${fileName}` };
              }
              return f;
            });

            newFiles.push(...updatedFiles);
          });

          // 3. Apply files to sandbox (Write them silently)
          setGenerationProgress(prev => ({ ...prev, status: 'Injecting files...' }));
          await applyGeneratedCode(null, false, buildId, newFiles, true, sandbox.sandboxId, false, sandbox.url);

          // 4. Trigger Composition Revision (AI Edit)
          setGenerationProgress(prev => ({ ...prev, status: 'Integrating with existing components...' }));

          const hasPages = componentNames.some(n => n.toLowerCase().includes('page'));
          const integrationPrompt = `I have added the following components to the project: ${componentNames.join(', ')}. 
Please UPDATE src/App.jsx to integrate them professionally into the website layout. ${hasPages ? 'As this includes a full page component, please add a new Route in App.jsx and update src/app/siteMap.js.' : ''}
Keep ALL existing components and sections exactly as they are—do NOT remove anything. 
Just position the new components in a logical order (e.g. after the Hero or before the Footer) and ensure all imports are correct.`;

          // Call the edit function (which usually handles chat messages)
          // We bypass UI chat message and call the endpoint directly for a seamless "Processing" feel
          try {
            await handleAIGeneratedEdit(integrationPrompt, buildId, sandbox);
            addChatMessage(`Integration complete! Added: ${componentNames.join(', ')}`, 'success', { style: 'completed' });
          } catch (editError) {
            console.error('[Integration] Revision failed:', editError);
            addChatMessage(`Files added, but auto-integration failed: ${editError.message}. You can manually update App.jsx to include them.`, 'error');
          }

          setLoading(false);
          setGenerationProgress(prev => ({ ...prev, isGenerating: false, status: '' }));
          setActiveTab('preview');
          return;
        }
      } else if (
        premiumMode !== 'off' &&
        allowCommunityComponents &&
        intentClassification?.catalogPosture !== 'codegen_first'
      ) {
        setGenerationProgress(prev => ({ ...prev, status: 'Selecting premium components...' }));
        try {
          const selectRes = await authFetch('/api/select-components', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: finalPrompt,
              rawPrompt: prompt,
              images: initialImages,
              model: aiModel,
              designSystem,
              buildId,
              premiumMode
            })
          });
          const selectData = await selectRes.json();
          if (selectData.success && selectData.selection) {
            selectionContext = selectData.selection;
          }
        } catch (e) {
          console.warn('Selection failed, falling back to full generation:', e);
        }
      }
      else {
        // Premium Mode OFF: Skipping premium selection.
      }

      // 4. Plan components
      setGenerationProgress(prev => ({ ...prev, status: 'Planning components...' }));
      let planData;
      try {
        const planningPrompt = `${finalPrompt || ''} ${prompt || ''}`;
        const explicitMultiPagePrompt = /(^|\b)(multi page|multipage|multiple pages|docs|documentation|routes)(\b|$)/i.test(
          planningPrompt
        );
        const explicitSingleSectionPrompt = /(^|\b)(single component|one component|single widget|one widget|single section)(\b|$)/i.test(
          planningPrompt
        );
        const explicitAppShellPrompt = /(^|\b)(app shell|dashboard|admin panel|workspace|kanban|crm|control panel|internal tool|backoffice|sidebar layout)(\b|$)/i.test(
          planningPrompt
        );
        const userSelectedAdvancedMode = ['multi_page', 'app_shell', 'single_section'].includes(projectBuildMode)
          ? projectBuildMode
          : null;
        let contractBuildMode = 'single_page_multi_section';
        if (explicitMultiPagePrompt) contractBuildMode = 'multi_page';
        else if (explicitSingleSectionPrompt) contractBuildMode = 'single_section';
        else if (explicitAppShellPrompt) contractBuildMode = 'app_shell';
        else if (userSelectedAdvancedMode) contractBuildMode = userSelectedAdvancedMode;

        const contractRoutingMode =
          contractBuildMode === 'multi_page'
            ? 'router'
            : contractBuildMode === 'single_page_multi_section'
              ? 'anchors'
              : 'none';
        const contractChromeProfile =
          contractBuildMode === 'app_shell'
            ? 'app'
            : contractBuildMode === 'single_section'
              ? 'none'
              : 'marketing';

        const planRes = await authFetch('/api/plan-website-components', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: finalPrompt,
            rawPrompt: prompt,
            images: initialImages,
            model: aiModel,
            selectionContext,
            designSystem,
            buildId,
            generateNarration: true,
            premiumMode,
            allowCommunityComponents,
            buildMode: contractBuildMode,
            routingMode: contractRoutingMode,
            chromeProfile: contractChromeProfile,
            catalogPosture: intentClassification?.catalogPosture,
            manualSelectionIds,
            strictMode,
            intentClassification
          })
        });
        planData = await safeParseJson(planRes, 'plan-website-components');

      } catch (planError) {
        console.error('[Generation] Planning failed:', planError);
        addChatMessage(`Planning failed: ${planError.message}. Trying streaming fallback...`, 'system');
        throw planError; // Re-throw to hit the main catch block which handles streaming fallback
      }

      // Phase S2: Sync Component Plan to Supabase Project
      if (planData.success && planData.components) {
        componentPlanRef.current = planData.components; // Store for snapshot
        saveProjectUpdates({
          component_plan: planData.components,
          total_components: planData.components.length
        });
      }

      if (planData.aiNarration) {
        addChatMessage(planData.aiNarration, 'ai-narrator', { style: 'planning' });
      }

      if (!planData.success) throw new Error(planData.error || 'Planning failed');

      if (planData.layoutType) {
        console.log('[BUILDER-VERIFY] generation: plan layoutType=', planData.layoutType);
      }

      const {
        components: rawComponents,
        globalStyle,
        isMultiPage,
        pages,
        sharedComponentRefIds,
        buildMode,
        routingMode,
        chromeProfile
      } = planData;

      if (buildMode) setProjectBuildMode(buildMode);
      if (routingMode) setProjectRoutingMode(routingMode);
      if (chromeProfile) setProjectChromeProfile(chromeProfile);

      // Save MPA state for the renderer and future edit cycles
      if (isMultiPage) {
        setIsMultiPageProject(true);
        setProjectPages(pages || []);

        // Convert shared refIds to actual component objects
        const sharedComps = rawComponents.filter(c => (sharedComponentRefIds || []).includes(c.refId || c.name));
        setProjectSharedComponents(sharedComps);
      } else {
        setIsMultiPageProject(false);
        setProjectPages([]);
        setProjectSharedComponents([]);
      }
      // Deduplicate components by name to prevent multi-file generation errors
      const components = [...new Map(rawComponents.map(item => [item.name, item])).values()];
      const premiumComponents = components.filter(c => c.source === 'premium' && c.bundleId);
      const generatedComponents = components.filter(c => c.source !== 'premium' || !c.bundleId);

      setGenerationProgress(prev => ({
        ...prev, components: components.map(c => ({ name: c.name, path: c.path, completed: false, source: c.source || 'generated' })),
        status: `Generating ${components.length} components (${premiumComponents.length} premium, ${generatedComponents.length} custom)...`
      }));
      /*
      addChatMessage(
        `Planning ${components.length} components: ${premiumComponents.length} premium, ${generatedComponents.length} custom — ${components.map(c => c.name).join(', ')}`,
        'system'
      );
      */

      // 4b. Install dependencies (New Bulletproof Step)
      if (planData.requiredPackages?.length > 0) {
        setGenerationProgress(prev => ({ ...prev, status: `Installing dependencies (${planData.requiredPackages.length})...` }));
        setCodeApplicationState(prev => ({ ...prev, stage: 'installing', packages: planData.requiredPackages }));
        // addChatMessage(`Installing dependencies: ${planData.requiredPackages.join(', ')}`, 'system');

        try {
          await authFetch('/api/install-packages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              packages: planData.requiredPackages,
              sandboxId: sandboxData?.sandboxId,
              buildId
            })
          });
        } catch (e) {
          console.warn('Dependency install failed, continuing anyway:', e);
        }
      }

      // 5. Execute generation in two stages: Premium first (to get real paths), then Custom

      // Stage A: Fetch Premium Bundles (with beefy props)
      const premiumResults = await Promise.all(
        premiumComponents.map(comp =>
          authFetch('/api/component-bundle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: comp.bundleId,
              format: 'fileblocks',
              propsOverrides: comp.props, // Inject the Master Copywriter's text
              buildId
            })
          })
            .then(r => safeParseJson(r, 'premium-bundle'))
            .then(data => {
              if (!data.success) return { success: false, error: data.error, path: comp.path };

              // Extract REAL path from the bundle content (critical for App.jsx imports)
              const match = data.fileBlocks.match(/<file path="([^"]+)">/);
              const realPath = match ? match[1] : comp.path;

              // Extract REAL export name (Maestro Fix)
              // Matches: export default function Name, export default class Name, export default Name
              const exportMatch = data.fileBlocks.match(/export default (?:function |class |const )?(\w+)/);
              const realName = exportMatch ? exportMatch[1] : comp.name;

              setGenerationProgress(prev => ({
                ...prev,
                components: prev.components.map(c => c.name === comp.name ? { ...c, completed: true, path: realPath, name: realName } : c),
                status: `Premium: ${realName} loaded`
              }));

              return {
                success: true,
                fileContent: data.fileBlocks,
                name: realName, // Use the REAL export name
                path: realPath,
                source: 'premium',
                description: comp.description,
                originalRef: comp
              };
            })
            .catch(e => ({ success: false, error: e.message, path: comp.path }))
        )
      );

      const joinFileBlocks = (files) =>
        !files?.length ? '' : files.map((f) => `<file path="${f.path}">\n${f.content}\n</file>`).join('\n\n');

      // Stage A.1: LLM hydration — replace baked-in JSX demo copy (prop regex alone cannot)
      for (let i = 0; i < premiumResults.length; i++) {
        const r = premiumResults[i];
        if (!r.success || !r.fileContent) continue;
        const comp = r.originalRef;
        if (!comp) continue;
        const hasKey = typeof comp.keyContent === 'string' && comp.keyContent.trim().length > 0;
        const hasProps = comp.props && typeof comp.props === 'object' && Object.keys(comp.props).length > 0;
        const hasVision =
          typeof finalPrompt === 'string' && finalPrompt.trim().length > 0;
        if (!hasKey && !hasProps && !hasVision) continue;

        const parsedFiles = parseFilesFromCode(r.fileContent);
        if (parsedFiles.length === 0) continue;

        for (const file of parsedFiles) {
          if (!/\.(jsx|tsx)$/i.test(file.path)) continue;
          try {
            console.log(
              '[BUILDER-VERIFY] generation: hydrate request',
              { bundle: comp.name || comp.refId, path: file.path, hasKey: hasKey, propCount: Object.keys(comp.props || {}).length }
            );
            const hydrateRes = await authFetch('/api/hydrate-premium-copy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileContent: file.content,
                fileName: file.path,
                keyContent: comp.keyContent || '',
                props: comp.props || {},
                designSystem,
                prompt: finalPrompt,
                model: aiModel,
                buildId
              })
            });
            const hData = await safeParseJson(hydrateRes, 'hydrate-premium-copy');
            if (hData?.success && typeof hData.hydratedContent === 'string' && hData.hydratedContent.length > 0) {
              file.content = hData.hydratedContent;
              console.log('[BUILDER-VERIFY] generation: hydrate applied', {
                path: file.path,
                skipped: hData.skipped === true,
                outLen: hData.hydratedContent.length
              });
            }
          } catch (e) {
            console.warn('[Generation] hydrate-premium-copy failed for', file.path, e.message);
          }
        }
        r.fileContent = joinFileBlocks(parsedFiles);
      }

      // Get the successfully loaded premium components with their REAL paths and names
      const loadedPremiumComponents = premiumResults
        .filter(r => r.success)
        .map(r => ({ name: r.name, path: r.path, description: r.description, originalRef: r.originalRef }));

      // Find App.jsx (or App) to generate LAST (Stage C)
      const appComponent = generatedComponents.find(c => c.path.endsWith('App.jsx') || c.name === 'App');
      const standardComponents = generatedComponents.filter(c => c !== appComponent);

      // Stage B: Generate Standard Custom Components (Resilient Sequential Queue)
      const standardResults = [];
      const MAX_RETRIES = 3;

      for (let i = 0; i < standardComponents.length; i++) {
        const comp = standardComponents[i];
        setGenerationProgress(prev => ({
          ...prev,
          status: `Generating component ${i + 1}/${standardComponents.length}: ${comp.name}...`
        }));

        const generateWithRetry = async (retryCount = 0) => {
          try {
            // Add a solid 1000ms buffer between components to prevent burst rate limits
            if (i > 0 && retryCount === 0) {
              await new Promise(r => setTimeout(r, 1000));
            }

            // Exponential Backoff: Wait 2s * retryCount^2
            if (retryCount > 0) {
              const backoffTime = 2000 * Math.pow(2, retryCount - 1);
              console.log(`[Generation] Rate limit backoff for ${comp.name}: waiting ${backoffTime}ms... (Retry ${retryCount}/${MAX_RETRIES})`);
              await new Promise(r => setTimeout(r, backoffTime));
            }

            const r = await authFetch('/api/generate-single-component', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                component: comp,
                globalStyle,
                prompt: finalPrompt,
                overallContext: finalPrompt,
                buildMode: planData?.buildMode || projectBuildMode,
                model: aiModel,
                componentIndex: premiumComponents.length + i + 1,
                totalComponents: components.length,
                premiumComponents: loadedPremiumComponents,
                allComponents: components,
                designSystem,
                buildId
              })
            });

            if (!r.ok) {
              const errorText = await r.text().catch(() => 'No error body');
              console.error(`[Generation] API Error for ${comp.name}: HTTP ${r.status}`, errorText);
              throw new Error(`HTTP ${r.status}: ${errorText.substring(0, 100)}`);
            }

            const data = await safeParseJson(r, `generate-${comp.name}`);

            setGenerationProgress(prev => ({
              ...prev,
              components: prev.components.map(c => c.name === comp.name ? { ...c, completed: true } : c),
              status: `Finished ${data.name || comp.name}`
            }));

            return { ...data, source: 'generated', originalRef: comp };
          } catch (e) {
            if (retryCount < MAX_RETRIES) {
              console.warn(`[Generation] Retrying ${comp.name} (${retryCount + 1}/${MAX_RETRIES}) due to error:`, e.message);
              return generateWithRetry(retryCount + 1);
            }
            console.error(`[Generation] Failed to generate ${comp.name} after ${MAX_RETRIES} retries.`);
            return { success: false, error: e.message, path: comp.path };
          }
        };

        const result = await generateWithRetry();
        standardResults.push(result);
      }

      // Stage C: Deterministic App.jsx Generation (Prompt 5)
      setGenerationProgress(prev => ({ ...prev, status: 'Synthesizing App.jsx...' }));

      // appComponent is already defined above

      const plannerComponents = Array.isArray(planData?.components) ? planData.components : [];
      const plannerByRefId = new Map(
        plannerComponents
          .filter(c => c?.refId)
          .map(c => [String(c.refId).toLowerCase(), c])
      );
      const plannerByName = new Map(
        plannerComponents
          .filter(c => c?.name)
          .map(c => [String(c.name).toLowerCase(), c])
      );
      const plannerByPath = new Map(
        plannerComponents
          .filter(c => c?.path)
          .map(c => [String(c.path).toLowerCase(), c])
      );
      const orderMap = new Map(
        (planData?.appComposition?.order || [])
          .map((entry, idx) => [String(entry?.refId || '').toLowerCase(), idx])
          .filter(([id]) => Boolean(id))
      );
      const resolvePlannerMeta = ({ refId, name, path }) => {
        const byRef = refId ? plannerByRefId.get(String(refId).toLowerCase()) : null;
        const byName = name ? plannerByName.get(String(name).toLowerCase()) : null;
        const byPath = path ? plannerByPath.get(String(path).toLowerCase()) : null;
        const planned = byRef || byName || byPath || null;
        const plannedRef = planned?.refId || refId || name || path || '';
        const orderIndex = orderMap.has(String(plannedRef).toLowerCase())
          ? orderMap.get(String(plannedRef).toLowerCase())
          : Number.MAX_SAFE_INTEGER;
        return {
          role: planned?.role || undefined,
          orderIndex
        };
      };

      // Prepare list of ALL valid components for App.jsx
      const validComponents = [
        ...loadedPremiumComponents.map(c => {
          const refId = c.originalRef?.refId || c.originalRef?.name || c.name;
          const meta = resolvePlannerMeta({ refId, name: c.name, path: c.path });
          return { exportName: c.name, path: c.path, refId, role: meta.role, orderIndex: meta.orderIndex };
        }),
        ...standardResults.filter(r => r.success).map(r => {
          const refId = r.originalRef?.refId || r.originalRef?.name || r.name;
          const meta = resolvePlannerMeta({ refId, name: r.name, path: r.path });
          return { exportName: r.name, path: r.path, refId, role: meta.role, orderIndex: meta.orderIndex };
        })
      ];

      let appJsxCode = '';
      try {
        console.log('[Generation] Rendering App.jsx with components:', validComponents.length);
        const renderRes = await authFetch('/api/render-app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            components: validComponents,
            buildId,
            isMultiPage: planData?.isMultiPage || isMultiPageProject,
            pages: planData?.pages?.length > 0 ? planData.pages : projectPages,
            sharedComponents: planData?.isMultiPage ? planData.components.filter(c => (planData.sharedComponentRefIds || []).includes(c.refId || c.name)) : projectSharedComponents,
            prompt: finalPrompt || '',
            buildMode: planData?.buildMode || projectBuildMode,
            routingMode: planData?.routingMode || projectRoutingMode,
            chromeProfile: planData?.chromeProfile || projectChromeProfile
          })
        });

        const renderData = await renderRes.json();
        if (!renderData.success) throw new Error(renderData.error || 'Failed to render App.jsx');

        appJsxCode = renderData.appJsx;

        // Mark App.jsx as complete if it was in the plan
        if (appComponent) {
          setGenerationProgress(prev => ({
            ...prev,
            components: prev.components.map(c => c.name === appComponent?.name ? { ...c, completed: true } : c),
            status: 'App.jsx Ready'
          }));
        }

      } catch (e) {
        console.error('[Generation] App.jsx rendering failed:', e);
        // Fallback or critical error? For now, critical as per Prompt 5.
        // But we want to preserve at least the components.
        addChatMessage(`Warning: App.jsx generation failed (${e.message}). You may need to create it manually.`, 'error');
      }

      // 6. Combine & Construct Files Payload (Prompt 6)
      const allFiles = [];
      const results = [...premiumResults, ...standardResults];

      // Process component results
      results.forEach(r => {
        if (!r.success) return;

        if (r.content) {
          // Schema-safe content (Prompt 6)
          allFiles.push({ path: r.path, content: r.content });
        } else if (r.fileContent) {
          // Legacy/Premium content (regex parse)
          const parsed = parseFilesFromCode(r.fileContent);
          allFiles.push(...parsed);
        }
      });

      // Append deterministic App.jsx (Prompt 5)
      if (appJsxCode) {
        allFiles.push({ path: 'src/App.jsx', content: appJsxCode });
      }

      if (allFiles.length === 0) throw new Error('No code generated');

      // Reconstruct generatedCode string for legacy support/logging
      let generatedCode = results.filter(r => r.success && r.fileContent).map(r => r.fileContent).join('\n\n');
      if (appJsxCode) {
        generatedCode += `\n\n<file path="src/App.jsx">${appJsxCode}</file>`;
      }

      setGenerationProgress(prev => ({
        ...prev, status: 'Validating imports...', files: allFiles, isStreaming: false
      }));

      // 7a. Validate Imports (Prompt 7)
      try {
        const validateRes = await authFetch('/api/validate-imports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: allFiles, premiumComponents: loadedPremiumComponents })
        });
        const validateData = await validateRes.json();

        if (validateData.success && !validateData.valid) {
          // Issues found! Report and STOP.
          console.warn('[Generation] Validation failed:', validateData.issues);
          const issueList = validateData.issues.map(i => `- ${i.message}`).join('\n');
          addChatMessage(`Build Halted: Import validation failed.\n${issueList}`, 'error');
          setGenerationProgress(prev => ({ ...prev, status: 'Validation Failed' }));
          return; // STOP EXECUTION
        }
      } catch (e) {
        console.error('[Generation] Validator crashed:', e);
        // We allow to proceed if validator crashes, but warn
        addChatMessage('Warning: Import validator skipped due to error.', 'error');
      }

      setGenerationProgress(prev => ({ ...prev, status: 'Applying code...' }));

      // 7b. Apply with explicit files - Pass sandbox reference to ensure closure-safety
      const generatedSinglePaths = standardResults
        .filter((r) => r?.success && typeof r.path === 'string' && r.path.trim())
        .map((r) => r.path);
      await applyGeneratedCode(generatedCode, false, buildId, allFiles, false, sandbox?.sandboxId, false, sandbox?.url, {
        polishSkipPaths: generatedSinglePaths
      });
      setDeliveryQueue(prev => [...prev, { type: 'message', content: 'Code generated and applied! Check the preview tab.', chatType: 'ai' }]);
      setActiveTab('preview');

    } catch (error) {
      console.error('[startGeneration] Fatal Gen Error:', error);

      const isOverloaded = error.message?.toLowerCase().includes('demand') ||
        error.message?.toLowerCase().includes('503') ||
        error.message?.toLowerCase().includes('overload') ||
        error.message?.toLowerCase().includes('quota');

      if (isOverloaded) {
        addChatMessage('Generation failed: The AI Provider is currently experiencing high traffic or is overloaded. Please wait a few moments and try again.', 'error');
        // Phase S2: Sync failure state
        saveProjectUpdates({ buildId, build_status: 'failed' });
      } else if (generationProgress.status.includes('Planning') || generationProgress.status.includes('Selecting')) {
        // Fallback: ONLY if we didn't finish planning and it's NOT a 503
        addChatMessage(`Generation failed: ${error.message}. Switching to streaming fallback...`, 'system');
        try {
          setGenerationProgress(prev => ({ ...prev, status: 'Generating (streaming)...' }));
          const res = await authFetch('/api/generate-ai-code-stream', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              images: initialImages,
              model: aiModel,
              context: {
                sandboxId: sandboxData?.sandboxId,
                buildMode: projectBuildMode,
                routingMode: projectRoutingMode,
                chromeProfile: projectChromeProfile,
                plan: {
                  components: componentPlanRef.current || [],
                  isMultiPage: isMultiPageProject,
                  pages: projectPages || [],
                  sharedComponentRefIds: (projectSharedComponents || []).map((c) => c.refId || c.exportName || c.name).filter(Boolean),
                  buildMode: projectBuildMode,
                  routingMode: projectRoutingMode,
                  chromeProfile: projectChromeProfile
                }
              },
              isEdit: false,
              buildId
            })
          });

          if (!res.ok) throw new Error(`Fallback failed (${res.status})`);

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let streamedCode = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'stream') streamedCode += data.text;
                else if (data.type === 'complete' && data.generatedCode) {
                  await applyGeneratedCode(data.generatedCode, false, buildId, null, false, sandboxData?.sandboxId, false, sandboxData?.url);
                  addChatMessage('Code generated and applied!', 'ai');
                  setActiveTab('preview');
                }
              } catch (e) { /* ignore parse error */ }
            }
          }
        } catch (fallbackError) {
          addChatMessage(`Fallback failed: ${fallbackError.message}`, 'error');
          // Phase S2: Sync failure state
          saveProjectUpdates({ buildId, build_status: 'failed' });
        }
      } else {
        addChatMessage(`Partial success: ${error.message}. Attempting to proceed with available code.`, 'warning');
        // Phase S2: Sync failure state
        saveProjectUpdates({ buildId, build_status: 'failed' });
      }
    } finally {
      refreshCredits(); // SYNC CREDITS: Refresh from DB to reflect deduction
      setLoading(false);
      setGenerationProgress(prev => ({ ...prev, isGenerating: false, status: '' }));
    }
  }, [
    sandboxData,
    aiModel,
    createSandbox,
    applyGeneratedCode,
    addChatMessage,
    conversationContext,
    session,
    refreshCredits,
    saveProjectUpdates,
    allowCommunityComponents,
    projectBuildMode,
    projectRoutingMode,
    projectChromeProfile,
    isMultiPageProject,
    projectPages,
    projectSharedComponents
  ]);


  const sendChatMessage = useCallback(async () => {
    const msg = aiChatInput.trim();
    if (!msg && pendingImages.length === 0 && pendingComponents.length === 0) return;
    if (loading) return;

    // Dispatch optimistic deduction animation for generation edits
    window.dispatchEvent(new CustomEvent('optimistic-credit-deduction'));

    const currentImages = [...pendingImages];
    const currentComponents = [...pendingComponents];
    setAiChatInput('');
    setPendingImages([]);
    setPendingComponents([]);

    const isEdit = conversationContext.appliedCode.length > 0;

    if (!isEdit) {
      // First generation
      await startGeneration(msg || "Build from selection", null, currentImages, currentComponents.map(c => c.id), null, strictMode);
    } else {
      // Edit existing
      setLastPrompt(msg);
      addChatMessage(msg || "Integrating community components", 'user', {
        images: currentImages,
        stagedComponents: currentComponents
      });
      setLoading(true);
      setGenerationProgress(prev => ({ ...prev, isGenerating: true, status: 'Processing...', isEdit: true }));

      try {
        let sandbox = sandboxData;
        if (!sandbox) {
          const createData = await createSandbox();
          sandbox = { sandboxId: createData.sandboxId, url: createData.url };
        }

        const buildId = currentProjectId || crypto.randomUUID();

        // 1. If we have new components, inject them first
        let finalInstruction = msg;
        if (currentComponents.length > 0) {
          setGenerationProgress(prev => ({ ...prev, status: `Injecting ${currentComponents.length} components...` }));

          const bundleResults = await Promise.all(
            currentComponents.map(comp =>
              authFetch('/api/component-bundle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: comp.id, format: 'fileblocks', buildId })
              })
                .then(r => r.json())
                .catch(e => ({ success: false, error: e.message }))
            )
          );

          const successfulBundles = bundleResults.filter(r => r.success);
          if (successfulBundles.length > 0) {
            const newFiles = [];
            const componentNames = [];
            successfulBundles.forEach(data => {
              const files = parseFilesFromCode(data.fileBlocks);

              const exportMatch = data.fileBlocks.match(/export default (?:function |class |const )?(\w+)/);
              const compName = exportMatch ? exportMatch[1] : 'Unknown';
              if (exportMatch) componentNames.push(compName);

              const isPage = data.component_type === 'page' || compName.toLowerCase().includes('page');
              const basePath = isPage ? 'src/pages' : 'src/components/premium';

              const updatedFiles = files.map(f => {
                if (isPage && f.path.includes('src/components/premium/')) {
                  const fileName = f.path.split('/').pop();
                  return { ...f, path: `${basePath}/${fileName}` };
                }
                return f;
              });

              newFiles.push(...updatedFiles);
            });

            // Write files to sandbox
            await applyGeneratedCode(null, false, buildId, newFiles, true, sandbox.sandboxId, false, sandbox.url);

            // Build integration hint
            const hasPages = componentNames.some(n => n.toLowerCase().includes('page'));
            const integrationHint = `[SYSTEM: I have added ${componentNames.join(', ')} to the project. Please integrate them into App.jsx. ${hasPages ? 'As this includes a page component, add a Route in App.jsx and update src/app/siteMap.js.' : ''} Keep existing components. ${msg ? `User Request: ${msg}` : ''}]`;
            finalInstruction = msg ? `${msg}\n\n${integrationHint}` : integrationHint;
          }
        }

        await handleAIGeneratedEdit(finalInstruction, buildId, sandbox);
        addChatMessage('Changes applied!', 'ai');
      } catch (error) {
        const isOverloaded = error.message?.toLowerCase().includes('demand') ||
          error.message?.toLowerCase().includes('503') ||
          error.message?.toLowerCase().includes('overload') ||
          error.message?.toLowerCase().includes('quota');

        if (isOverloaded) {
          addChatMessage('Edit failed: The AI Provider is currently experiencing high traffic or is overloaded. Please wait a few moments and try again.', 'error');
        } else {
          addChatMessage(`Edit failed: ${error.message}`, 'error');
        }
      } finally {
        setLoading(false);
        setGenerationProgress(prev => ({ ...prev, isGenerating: false, status: '', isEdit: false }));
      }
    }
  }, [aiChatInput, pendingImages, pendingComponents, loading, conversationContext, sandboxData, currentProjectId, handleAIGeneratedEdit, createSandbox, addChatMessage, startGeneration, applyGeneratedCode, strictMode]);

  // ─── Restore Snapshot (Silent Time-Travel) ──────────────
  const restoreSnapshot = useCallback(async (snapshot, revertTargetIndex, revertedPromptText, revertedComponents = []) => {
    if (!sandboxData || loading) return;
    setRevertModalData(null); // Close modal

    try {
      const files = typeof snapshot.files === 'string' ? JSON.parse(snapshot.files) : snapshot.files;
      if (Array.isArray(files)) {
        console.error('[Snapshot] Legacy snapshot — file content not available');
        return;
      }

      // Phase 1: Instant visual — truncate chat and move prompt to input
      if (revertTargetIndex !== undefined) {
        setChatMessages(prev => prev.slice(0, revertTargetIndex));
      }
      if (revertedPromptText) {
        setAiChatInput(revertedPromptText);
      }
      if (revertedComponents && Array.isArray(revertedComponents)) {
        setPendingComponents(revertedComponents);
      }

      // Phase 2: Silent background — apply files without any chat messages
      setLoading(true);
      setGenerationProgress(prev => ({ ...prev, isGenerating: true, status: 'Restoring...' }));

      const filesArray = Object.entries(files).map(([path, content]) => ({ path, content }));
      console.log(`[Snapshot] Restoring checkpoint ID: ${snapshot.id} | Chat Index: ${snapshot.chat_message_index} | Files: ${filesArray.length}`);

      await applyGeneratedCode(null, false, currentProjectId, filesArray, true, sandboxData?.sandboxId, false, sandboxData?.url);
      setActiveTab('preview');
    } catch (err) {
      console.error('[Snapshot] Restore failed:', err);
    } finally {
      setLoading(false);
      setGenerationProgress(prev => ({ ...prev, isGenerating: false, status: '' }));
    }
  }, [sandboxData, loading, applyGeneratedCode, currentProjectId]);

  const loadProject = useCallback(async (projectId) => {
    setLoading(true);
    setGenerationProgress(prev => ({ ...prev, isGenerating: true, status: 'Preparing environment...' }));

    try {
      const res = await authFetch(`/api/projects/get?projectId=${projectId}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Failed to load project');

      const { project, latestSnapshot } = data;

      setCurrentProjectId(projectId);

      // Touch updated_at so dashboard sorts by most recently opened
      saveProjectUpdates({ buildId: projectId, updated_at: new Date().toISOString() });

      // 1. Restore Chat History
      if (project.chat_history && Array.isArray(project.chat_history)) {
        const messages = project.chat_history.map(m => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
        }));
        // Show current status in chat but don't pollute history if we can avoid it.
        // For now, simple append is what the user asked for ("a row").
        setChatMessages([...messages, { content: 'Preparing environment...', type: 'system', timestamp: new Date() }]);
        // Aggressive scroll-to-bottom: stagger multiple attempts so we catch the DOM after React renders
        [50, 300, 800].forEach(ms => setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'instant' }), ms));
      } else {
        addChatMessage('Preparing environment...', 'system');
      }

      // 2. Restore Design System & Plan
      if (project.design_system) designSystemRef.current = project.design_system;
      if (project.component_plan) componentPlanRef.current = project.component_plan;
      if (project.build_mode) setProjectBuildMode(project.build_mode);
      if (project.routing_mode) setProjectRoutingMode(project.routing_mode);
      if (project.chrome_profile) setProjectChromeProfile(project.chrome_profile);

      // 3. Restore Files & Sandbox
      if (latestSnapshot && latestSnapshot.files) {
        const snapshotFiles = typeof latestSnapshot.files === 'string' ? JSON.parse(latestSnapshot.files) : latestSnapshot.files;
        // Handle both object-based ({ "path": "content" }) and array-based ([{ path, content }]) formats
        const filesArray = Array.isArray(snapshotFiles)
          ? snapshotFiles.map(f => ({ path: f.path, content: f.content }))
          : Object.entries(snapshotFiles).map(([path, content]) => ({ path, content }));

        setGenerationProgress(prev => ({
          ...prev,
          status: 'Rehydrating sandbox metadata...',
          files: filesArray.map(f => ({ ...f, completed: true }))
        }));

        setConversationContext(prev => ({
          ...prev,
          appliedCode: filesArray,
          currentProject: project.name || project.prompt?.substring(0, 30) || projectId
        }));

        // Restore context for follow-up edits
        if (project.prompt) {
          setLastPrompt(project.prompt);
          lastPromptRef.current = project.prompt;
        }

        // Track if this project is already published
        if (project.published_slug) {
          setExistingPublishedSlug(project.published_slug);
          console.log('[LoadProject] Project has existing published slug:', project.published_slug);
        }

        // Trigger sandbox creation and file application (resumes build env)
        // Pass isResume = true to skip chat logs & credit deduction
        await applyGeneratedCode(null, false, projectId, filesArray, true, null, true);

        // Ensure chat is at bottom after sandbox restoration completes
        [100, 500, 1500].forEach(ms => setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'instant' }), ms));

      } else {
        addChatMessage('No snapshots found for this project. Starting fresh context...', 'system');
      }

    } catch (err) {
      addChatMessage(`Failed to load project trace: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setGenerationProgress(prev => ({ ...prev, isGenerating: false, status: '' }));
      // Final scroll — loading state just changed so DOM will re-render
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'instant' }), 200);
    }
  }, [session, addChatMessage, applyGeneratedCode, saveProjectUpdates, setCurrentProjectId, setChatMessages, setGenerationProgress, setConversationContext]);

  // --- Sandbox Keepalive Polling ---
  useEffect(() => {
    if (!sandboxData?.sandboxId) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await authFetch('/api/sandbox/keepalive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sandboxId: sandboxData.sandboxId })
        });
        if (!res.ok) {
          console.warn('[KeepAlive] Sandbox keepalive failed.');
        } else {
          console.log('[KeepAlive] Extended sandbox timeout.');
        }
      } catch (err) {
        console.error('[KeepAlive] Error:', err);
      }
    }, 180000); // 3 minutes

    return () => clearInterval(intervalId);
  }, [sandboxData, session]);

  useEffect(() => {
    if (initStartedRef.current) return;

    const params = new URLSearchParams(location.search);
    const importIds = params.get('import');
    const projectId = params.get('project') || params.get('projectId');
    const prompt = location.state?.prompt;
    const templateId = location.state?.templateId;
    const initialImages = location.state?.images || [];

    const manualSelectionIds = location.state?.manualSelectionIds;
    const initialComponents = location.state?.initialComponents;
    const strictModeValue = location.state?.strictMode || (params.get('strictMode') === 'true');

    if (projectId) {
      initStartedRef.current = true;
      loadProject(projectId);
    } else if (importIds) {
      initStartedRef.current = true;
      const ids = importIds.split(',');
      startGeneration("Build from community components", null, [], ids, null, strictModeValue);
      // Clean up URL to prevent re-trigger on refresh
      window.history.replaceState({}, document.title, location.pathname);
      setAiChatInput('');
    } else if (templateId) {
      initStartedRef.current = true;
      startGeneration(templateId, templateId, initialImages, null, null, strictModeValue); // template mode
      setAiChatInput('');
      setPendingImages([]);
    } else if (prompt?.trim() || initialImages.length > 0 || manualSelectionIds) {
      initStartedRef.current = true;
      startGeneration(
        prompt?.trim() || (manualSelectionIds ? "Build from community components" : "Analyze design and build"),
        null,
        initialImages,
        manualSelectionIds,
        null,
        strictModeValue,
        initialComponents
      );
      setAiChatInput('');
      setPendingImages([]);
    }
  }, [location.state, location.search, location.pathname, startGeneration, loadProject]); // Added dependencies for safety

  // ─── Sandbox Status Polling ──────────────
  useEffect(() => {
    if (!sandboxData?.sandboxId || sandboxData.sandboxId === 'undefined' || sandboxData.sandboxId === 'null') return;
    const interval = setInterval(async () => {
      if (sandboxCreationRef.current) return;
      try {
        const res = await fetch(`/api/sandbox-status?sandboxId=${sandboxData.sandboxId}`);
        const data = await res.json();
        if (!data.healthy) {
          setSandboxData(null);
        }
      } catch (e) { /* ignore */ }
    }, 15000);
    return () => clearInterval(interval);
  }, [sandboxData?.sandboxId]);

  // ─── Global Drag & Drop Handler ──────────────
  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault();
      if (e.dataTransfer.types.includes('Files')) {
        dragCounter.current++;
        setIsViewportDragging(true);
        isDraggingRef.current = true;
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsViewportDragging(false);
        isDraggingRef.current = false;
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();

      if (isDraggingRef.current && chatInputAreaRef.current) {
        const rect = chatInputAreaRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;

        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxPull = 7; // Slightly reduced for better balance

        const pullX = distance > 0 ? (deltaX / distance) * maxPull : 0;
        const pullY = distance > 0 ? (deltaY / distance) * maxPull : 0;

        chatInputAreaRef.current.style.setProperty('--magnet-x', `${pullX}px`);
        chatInputAreaRef.current.style.setProperty('--magnet-y', `${pullY}px`);
      }
    };

    const handleDropGlobal = (e) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsViewportDragging(false);
      isDraggingRef.current = false;
      if (chatInputAreaRef.current) {
        chatInputAreaRef.current.style.setProperty('--magnet-x', '0px');
        chatInputAreaRef.current.style.setProperty('--magnet-y', '0px');
      }
      // Process files if dropped anywhere in viewport
      if (e.dataTransfer?.files?.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDropGlobal);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDropGlobal);
    };
  }, []);

  // ─── Close viewport dropdown on outside click ──────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (viewportDropdownRef.current && !viewportDropdownRef.current.contains(e.target)) {
        setViewportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── File Tree ──────────────
  const toggleFolder = (name) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const fileTree = buildFileTree(generationProgress.files);

  // ─── Download Project ──────────────
  const downloadProject = useCallback(async () => {
    if (!sandboxData || isDownloading) return;
    setIsDownloading(true);
    addChatMessage('Creating ZIP file of your project...', 'system');
    try {
      const res = await authFetch('/api/create-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId: sandboxData.sandboxId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Download failed');
      const link = document.createElement('a');
      link.href = data.dataUrl;
      link.download = data.fileName || 'volturiano-project.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addChatMessage('Project downloaded! Unzip, run npm install, then npm run dev.', 'system');
    } catch (err) {
      addChatMessage(`Download failed: ${err.message}`, 'error');
    } finally {
      setIsDownloading(false);
    }
  }, [sandboxData, isDownloading, addChatMessage]);

  // ─── Publish Project ──────────────
  const handleOpenSlugModal = useCallback(() => {
    if (!sandboxData || isPublishing) return;

    // If already published, skip the slug modal and go straight to update
    if (existingPublishedSlug) {
      // Don't open the modal — directly trigger the publish as an update
      return 'UPDATE_DIRECTLY';
    }

    // Generate default slug from project name: lowercase, hyphenated, max 40 chars
    const rawProject = conversationContext.currentProject || 'my-site';
    const defaultSlug = rawProject
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40) || 'my-site';
    setCustomSlug(defaultSlug);
    setSiteTitle('');
    setSiteDescription('');
    setSiteIconFile(null);
    setSiteIconPreview('');
    setPublishStep(1);
    setShowSlugModal(true);
    return 'SHOW_MODAL';
  }, [sandboxData, isPublishing, conversationContext, existingPublishedSlug]);

  const confirmPublish = async (overrideSlug = null) => {
    const slugToUse = overrideSlug || customSlug;
    if (!slugToUse || isPublishing) return;

    // Prepare icon
    let iconBase64 = null;
    let iconFileName = null;
    if (siteIconFile) {
      try {
        setIsUploadingIcon(true);
        iconBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(siteIconFile);
        });
        iconFileName = siteIconFile.name;
      } catch (err) {
        console.error('Error reading icon file:', err);
        addChatMessage('Failed to read icon file. Proceeding without icon.', 'error');
      } finally {
        setIsUploadingIcon(false);
      }
    }

    setShowSlugModal(false);

    const isUpdate = !!existingPublishedSlug;
    setIsPublishing(true);
    addChatMessage(`${isUpdate ? 'Updating' : 'Publishing'} your site as "${slugToUse}"... This may take up to 30 seconds.`, 'system');

    console.group('[Publish] ════════════════════════════════════');
    console.log('[Publish] 🚀 Publish started at', new Date().toISOString());
    console.log('[Publish] Parameters:', {
      projectId: currentProjectId,
      sandboxId: sandboxData?.sandboxId,
      slug: slugToUse,
      siteTitle,
      hasAuthToken: !!session?.access_token,
    });

    try {
      const requestBody = {
        sandboxId: sandboxData?.sandboxId,
        slug: slugToUse,
        buildId: currentProjectId,
        siteTitle: siteTitle.trim() || undefined,
        siteDescription: siteDescription.trim() || undefined,
        iconBase64: iconBase64 || undefined,
        iconFileName: iconFileName || undefined
      };
      console.log('[Publish] 📤 Sending POST /api/publish-site');

      const res = await authFetch('/api/publish-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await safeParseJson(res, 'publish-site');

      if (!data.success) {
        if (res.status === 409) {
          console.error('[Publish] ❌ SLUG CONFLICT (409):', data.error);
          addChatMessage(`Publish failed: ${data.error}`, 'error');
          setShowSlugModal(true);
          throw new Error('Name taken');
        }

        if (data.logs) {
          console.error('[Publish] Build Logs:', data.logs);
          addChatMessage(`Build error details:\n${data.logs.substring(0, 500)}`, 'error');
        }
        console.error('[Publish] ❌ PUBLISH FAILED:', data.error);
        throw new Error(data.error || 'Publishing failed');
      }

      // Build the public URL correctly
      let finalUrl;
      if (window.location.hostname === 'localhost') {
        finalUrl = `${window.location.origin}/sites/${data.slug}`;
      } else {
        finalUrl = `https://volturiano.com/sites/${data.slug}`;
      }

      console.log(`[Publish] ✅ SUCCESS — site live at: ${finalUrl}`);
      setPublishUrl(finalUrl);
      setExistingPublishedSlug(data.slug); // Track that this project is now published
      setShowPublishModal(true);
      addChatMessage(`Successfully ${isUpdate ? 'updated' : 'published'}! Your site is live at: ${finalUrl}`, 'success');
    } catch (err) {
      console.error('[Publish] 💥 Fatal Error:', err.message);
      console.error('[Publish] Stack:', err.stack);
      if (err.message !== 'Name taken') {
        addChatMessage(`Publishing failed: ${err.message}`, 'error');
      }
    } finally {
      setIsPublishing(false);
      console.groupEnd();
    }
  };

  // ─── Key handler ──────────────
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendChatMessage();
  };

  // ─── Render ──────────────────────────────
  const { phase, transitionData } = useRouteTransition();
  const isRevealing = phase === 'revealing' || phase === 'idle';
  const cinematicText = transitionData?.cinematicResponse;

  useEffect(() => {
    if (isRevealing && cinematicText && !hasPlayedCinematic && chatMessages.length > 0) {
      setHasPlayedCinematic(true);
      // Reveal chat message shortly after page load
      setTimeout(() => {
        addChatMessage(cinematicText, 'ai-narrator', { style: 'planning' });
      }, 300);
    }
  }, [isRevealing, cinematicText, hasPlayedCinematic, chatMessages.length, addChatMessage]);

  return (
    <div className={styles.page} data-mobile-preview={isMobilePreviewOpen} style={{ cursor: isResizing ? 'col-resize' : 'default', userSelect: isResizing ? 'none' : 'auto', background: 'black' }}>
      <AnimatePresence>
        {showMobileSettingsModal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}
            onClick={() => setShowMobileSettingsModal(false)}
          >
            <div style={{
              background: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', padding: '24px',
              textAlign: 'center', maxWidth: '300px'
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: 'white' }}>Desktop Required</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#a1a1aa' }}>
                Publishing, downloading, viewing code, and advanced features are only available on desktop.
              </p>
              <button onClick={() => setShowMobileSettingsModal(false)} style={{
                background: 'white', color: 'black', border: 'none', padding: '10px 20px', borderRadius: '8px',
                fontWeight: '600', cursor: 'pointer', width: '100%'
              }}>Dismiss</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {!isRevealing ? (
          <motion.div
            key="blackout"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
            style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 9999 }}
          />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', width: '100%', height: '100%' }}
          >
            <style>{`
        html, body, a, button, input, select, textarea {
          cursor: auto !important;
        }
        a, button, [role="button"] {
          cursor: pointer !important;
        }
        input[type="text"], textarea {
          cursor: text !important;
        }
      `}</style>
            {/* ─── SIDEBAR (Chat) ─── */}
            <aside className={styles.sidebar} style={{ width: sidebarWidth }}>
              <div className={styles.sidebarHeader}>
                <button className={styles.backBtn} onClick={() => navigate('/builder')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>
                <img src={volturianoLogo} alt="Volturiano" className={styles.sidebarLogo} />
                <div style={{ position: 'absolute', right: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>


                  <div
                    className={`${styles.creditsContainer} ${isDeducting ? 'anim-deduct' : ''}`}
                    onMouseEnter={() => setShowCreditsPopup(true)}
                    onMouseLeave={() => setShowCreditsPopup(false)}
                    style={{ position: 'relative', right: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <style>{`
                    @keyframes creditPopUpOff {
                      0% { transform: translateY(0) scale(1); filter: brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0)); color: #fff; }
                      40% { transform: translateY(-4px) scale(1.4); filter: brightness(1.6) drop-shadow(0 4px 15px rgba(255,255,255,0.6)); color: #AFFFFC; }
                      75% { transform: translateY(-2px) scale(1.15); filter: brightness(1.2) drop-shadow(0 2px 8px rgba(255,255,255,0.3)); color: #AFFFFC; }
                      100% { transform: translateY(0) scale(1); filter: brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0)); color: #fff; }
                    }
                    .anim-deduct {
                      animation: creditPopUpOff 1.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                    }
                  `}</style>
                    <img src={coinIcon} alt="Credits" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                    <span
                      className={styles.creditsNumber}
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#ffffff',
                        letterSpacing: '0.02em',
                        lineHeight: 1
                      }}
                    >
                      {totalAvailable === Infinity ? '∞' : Math.max(0, totalAvailable - optimisticDeduction)}
                    </span>

                    <AnimatePresence>
                      {showCreditsPopup && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 5px)',
                            right: 0,
                            minWidth: '200px',
                            padding: '14px 16px',
                            background: '#000000',
                            backdropFilter: 'blur(24px)',
                            border: '1px solid #ffffff',
                            borderRadius: '12px',
                            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.05)',
                            zIndex: 10000,
                          }}
                        >
                          {/* Invisible bridge to catch the mouse during the movement gap */}
                          <div style={{
                            position: 'absolute',
                            top: '-15px',
                            left: 0,
                            right: 0,
                            height: '15px',
                            background: 'transparent'
                          }} />

                          <div style={{ padding: '0px' }}>
                            {/* Header */}
                            <div style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: '#e5e7eb',
                              marginBottom: '10px',
                            }}>
                              Creative Energy
                            </div>

                            {/* Plan badge */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#ffffff',
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              marginBottom: '16px',
                            }}>
                              {plan ? (plan.charAt(0).toUpperCase() + plan.slice(1)) : 'Free'} plan
                            </div>

                            {/* Breakdown */}
                            {isUnlimited ? (
                              <div style={{
                                fontSize: '13px',
                                color: '#ffffff',
                                fontWeight: '500',
                              }}>
                                Unlimited builds
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <CreditRow label="Monthly Free" value={monthlyFreeRemaining} color="#e5e7eb" labelColor="#9ca3af" />
                                <CreditRow label="Signup Bonus" value={signupBonusRemaining} color="#e5e7eb" labelColor="#9ca3af" />
                                <CreditRow label="Subscription" value={subscriptionRemaining} color="#e5e7eb" labelColor="#9ca3af" />
                                <CreditRow label="Purchased" value={purchasedRemaining} color="#e5e7eb" labelColor="#9ca3af" />

                                <div style={{
                                  height: '1px',
                                  background: 'rgba(255,255,255,0.1)',
                                  margin: '4px 0',
                                }} />

                                <CreditRow label="Total Available" value={totalAvailable} color="#ffffff" labelColor="#9ca3af" bold />

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowLimitModal(true);
                                    setShowCreditsPopup(false);
                                  }}
                                  style={{
                                    marginTop: '12px',
                                    width: '100%',
                                    padding: '8px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '6px',
                                    color: '#ffffff',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease',
                                    fontFamily: 'inherit',
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                >
                                  Add Credits
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className={styles.mobileHeaderIcons}>
                    <button className={styles.mobileSettingsBtn} onClick={() => setShowMobileSettingsModal(true)}>
                      <FiSettings size={16} />
                    </button>
                    <button className={styles.mobilePreviewBtn} onClick={() => setIsMobilePreviewOpen(true)}>
                      <FiMonitor size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.chatMessages} onScroll={handleManualScroll}>
                {chatMessages.map((msg, i) => {
                  const isLast = i === chatMessages.length - 1;

                  // Special component for planning phases
                  if ((msg.type === 'system' || msg.type === 'ai') && msg.content.includes('Planning') && msg.content.includes('components:')) {
                    return <PlanningRevolver key={i} message={msg.content} isLast={isLast} />;
                  }

                  // File write logs
                  if (msg.type === 'log') {
                    const fileBase = msg.content.split('/').pop() || msg.content;
                    return (
                      <motion.div
                        key={`log-${i}`}
                        className={`${styles.chatMsg} ${styles.chatMsg_log}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className={styles.chatBubble} style={{ border: 'none', background: 'transparent' }}>
                          <div className={styles.generationLogLine}>
                            <BsFileEarmarkCode className={`${styles.fileIcon} ${styles.shimmerText}`} />
                            <span className={styles.shimmerText} style={{ opacity: 0.9, marginRight: '6px', fontWeight: 500, flexShrink: 0 }}>Wrote</span>
                            <span className={`${styles.fileName} ${styles.shimmerText}`} title={fileBase}>{truncateMiddle(fileBase)}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  }

                  if (msg.type === 'user') {
                    // Determine if this is the very first user message — never show revert on it
                    const firstUserMsgIndex = chatMessages.findIndex(m => m.type === 'user');
                    const isFirstUserMsg = firstUserMsgIndex === i;

                    // Find the most relevant snapshot for this user message
                    const nextMsg = chatMessages[i + 1];
                    let snapshot = null;
                    let isEdit = false;

                    if (!isFirstUserMsg) {
                      // Find the snapshot from BEFORE this user message was sent
                      // This represents the state the project was in before this edit
                      // Strategy: find the most recent snapshot with chat_message_index strictly BEFORE this user message
                      const sortedSnapshots = [...snapshots].sort((a, b) => b.chat_message_index - a.chat_message_index);
                      snapshot = sortedSnapshots.find(s => s.chat_message_index < i);

                      // Check if this was an edit via next message metadata
                      if (nextMsg && (nextMsg.type === 'ai' || nextMsg.type === 'ai-narrator')) {
                        isEdit = nextMsg.metadata?.isEdit;
                      }
                    }

                    return (
                      <div key={i} className={styles.chatMsgWrapper}>
                        <div className={`${styles.chatMsg} ${styles.chatMsg_user}`}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '100%' }}>
                            {msg.metadata?.images?.length > 0 && (
                              <div className={styles.messageImages}>
                                {msg.metadata.images.map((img, idx) => (
                                  <img key={idx} src={img} alt="upload" className={styles.msgImage} />
                                ))}
                              </div>
                            )}
                            <div className={styles.chatBubble}>
                              {msg.content}
                              {msg.metadata?.stagedComponents?.length > 0 && (
                                <div className={styles.messageComponents}>
                                  {msg.metadata.stagedComponents.map((comp, idx) => {
                                    const thumbPath = comp.thumbnail_url || comp.preview_image_url || comp.image_url || comp.image || (comp.metadata && comp.metadata.thumbnail_url);
                                    const thumb = getThumbnailUrl(thumbPath);
                                    return (
                                      <div key={idx} className={styles.msgCompBadge}>
                                        {thumb ? (
                                          <img src={thumb} alt="pending" className={styles.msgCompThumbnail} />
                                        ) : (
                                          <FiLayers size={11} />
                                        )}
                                        <span>{typeof comp === 'string' ? comp : comp.name}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={styles.chatActionRow}>
                          {isEdit && <FiEdit2 size={12} className={styles.editIndicator} title="Modified version" />}

                          {/* Revert icon — never appears on the first user message */}
                          {snapshot && (
                            <button
                              className={styles.restoreBtn_underUser}
                              onClick={() => setRevertModalData({
                                snapshot,
                                targetIndex: i,
                                promptText: msg.content,
                                components: msg.metadata?.stagedComponents || []
                              })}
                              title={`Undo to ${new Date(snapshot.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                                <path d="M280-200v-80h284q63 0 109.5-40T720-420q0-60-46.5-100T564-560H312l104 104-56 56-200-200 200-200 56 56-104 104h252q97 0 166.5 63T800-420q0 94-69.5 157T564-200H280Z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (msg.type === 'error') {
                    return (
                      <div key={i} className={styles.chatMsgWrapper}>
                        <div className={`${styles.chatMsg} ${styles.chatMsg_system}`} style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          <div className={styles.chatBubble} style={{ color: '#ef4444' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                              {msg.content}
                            </span>
                          </div>

                          {msg.content.includes('overloaded') && isLast && (
                            <button
                              onClick={() => {
                                // Find the last user message that caused this error
                                const lastUserMsg = chatMessages.slice().reverse().find(m => m.type === 'user');
                                if (lastUserMsg) {
                                  setAiChatInput(lastUserMsg.content || '');
                                  if (lastUserMsg.metadata?.images) setPendingImages([...lastUserMsg.metadata.images]);
                                  if (lastUserMsg.metadata?.stagedComponents) setPendingComponents([...lastUserMsg.metadata.stagedComponents]);
                                }
                                // Pop the error message AND the user message visually
                                setChatMessages(prev => prev.filter(m => m !== msg && m !== lastUserMsg));
                              }}
                              style={{
                                alignSelf: 'flex-start',
                                padding: '8px 16px',
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                borderRadius: '6px',
                                color: '#f87171',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                            >
                              Restore Prompt to Input
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (msg.type === 'ai' || msg.type === 'ai-narrator') {
                    // AI messages no longer show the button internally
                    const metadata = msg.metadata || {};
                    let style = metadata.style || 'casual';
                    if (msg.type === 'ai-narrator' && (msg.content.toLowerCase().includes('generated') || msg.content.toLowerCase().includes('applied'))) {
                      style = 'premium-success';
                    }

                    const isNewlyAdded = msg.timestamp && (Date.now() - new Date(msg.timestamp).getTime() < 10000);

                    return (
                      <AIMessage
                        key={i}
                        message={msg.content}
                        style={style}
                        context={metadata}
                        isStreamingEligible={isLast && isNewlyAdded}
                        onStreamStateChange={setIsTextStreaming}
                      />
                    );
                  }
                })}

                {/* Active Status Indicator */}
                {(aiThinking || generationProgress.isGenerating || codeApplicationState.stage === 'complete' || codeApplicationState.stage) && (
                  <div className={`${styles.chatMsg} ${styles.chatMsg_system}`}>
                    <div className={styles.chatBubble}>
                      <span className={`${styles.typingDots} ${styles.shimmerText}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          className={
                            logoState === 1 ? styles.tornadoLogoPulse :
                              logoState === 2 ? styles.tornadoLogoTikiTaka :
                                logoState === 3 ? styles.tornadoLogoScanner :
                                  styles.tornadoLogoShimmer
                          }
                          style={{
                            width: 18,
                            height: 18,
                            flexShrink: 0,
                            '--logo-url': `url(${volturianoLogo})`,
                            backgroundClip: 'initial',
                            WebkitBackgroundClip: 'initial',
                            WebkitTextFillColor: 'initial',
                            color: 'initial'
                          }}
                        />
                        {`${getUnifiedStatus().replace(/\.\.\.$/, '')}${statusDots}`}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div
                ref={chatInputAreaRef}
                className={styles.chatInputArea}
                onPaste={handlePaste}
                onDragOver={e => e.preventDefault()}
              >
                <div
                  className={`${styles.chatInputWrapper} ${pendingImages.length > 0 ? styles.extended : ''} ${isViewportDragging ? styles.isDragging : ''}`}
                  data-dragging={isViewportDragging}
                >
                  {(pendingImages.length > 0 || pendingComponents.length > 0) && (
                    <div className={styles.pendingItemsArea}>
                      {pendingImages.map((img, idx) => (
                        <div key={idx} className={styles.pendingImageItem}>
                          <img src={img} alt="pending" />
                          <button className={styles.removePendingBtn} onClick={() => removePendingImage(idx)}>×</button>
                        </div>
                      ))}
                      {pendingComponents.map((comp, idx) => {
                        const thumbPath = comp.thumbnail_url || comp.preview_image_url || comp.image_url || comp.image || (comp.metadata && comp.metadata.thumbnail_url);
                        const thumb = getThumbnailUrl(thumbPath);
                        return (
                          <div
                            key={`comp-${comp.id}-${idx}`}
                            className={styles.pendingComponentItem}
                          >
                            {thumb ? (
                              <img src={thumb} alt={comp.name} className={styles.compThumbnail} />
                            ) : (
                              <div className={styles.compIcon}><FiLayers size={16} /></div>
                            )}
                            <span className={styles.compName}>{comp.name}</span>
                            <button
                              className={styles.removePendingCompBtn}
                              onClick={() => setPendingComponents(prev => prev.filter((_, i) => i !== idx))}
                              title="Remove component"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}

                    </div>
                  )}
                  <textarea
                    value={aiChatInput}
                    onChange={e => setAiChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your website or paste images..."
                    className={styles.chatInput}
                    disabled={loading}
                    rows={5}
                  />
                </div>
                <div className={styles.chatActions}>
                  <div className={styles.chatActionsLeft}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      multiple
                      accept="image/*"
                      onChange={(e) => processFiles(e.target.files)}
                    />
                    <button
                      className={styles.actionBtn}
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload images"
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => setIsCommunityPopupOpen(true)}
                      title="Add community components"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="#e3e3e3"><path d="M120-520v-320h320v320H120Zm0 400v-320h320v320H120Zm400-400v-320h320v320H520Zm0 400v-320h320v320H520ZM200-600h160v-160H200v160Zm400 0h160v-160H600v160Zm0 400h160v-160H600v160Zm-400 0h160v-160H200v160Zm400-400Zm0 240Zm-240 0Zm0-240Z"/></svg>
                    </button>
                    <div className={styles.geminiIcon} title={`Current Engine: ${aiModel}`} ref={modelDropdownRef}>
                      <div onClick={() => setModelDropdownOpen(!modelDropdownOpen)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        {aiModel.startsWith('openai/') ? (
                          <OpenAIIcon width="24" height="24" style={{ color: 'white' }} />
                        ) : aiModel.startsWith('anthropic/') ? (
                          <AnthropicIcon width="22" height="22" />
                        ) : (
                          <GeminiIcon width="22" height="22" />
                        )}
                      </div>

                      <AnimatePresence>
                        {modelDropdownOpen && (
                          <motion.div
                            className={styles.modelMenu}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                          >
                            <button
                              className={`${styles.modelOption} ${aiModel === 'google/gemini-3.1-pro-preview' ? styles.modelOptionActive : ''}`}
                              onClick={() => { setAiModel('google/gemini-3.1-pro-preview'); setModelDropdownOpen(false); }}
                            >
                              <GeminiIcon width="22" height="22" />
                              <span>Gemini 3.1 Pro</span>
                            </button>
                            <button
                              className={`${styles.modelOption} ${aiModel === 'google/gemini-2.5-flash' ? styles.modelOptionActive : ''}`}
                              onClick={() => { setAiModel('google/gemini-2.5-flash'); setModelDropdownOpen(false); }}
                            >
                              <GeminiIcon width="22" height="22" />
                              <span>Gemini 2.5 Flash</span>
                            </button>
                            <button
                              className={`${styles.modelOption} ${aiModel === 'openai/gpt-5.4' ? styles.modelOptionActive : ''}`}
                              onClick={() => { setAiModel('openai/gpt-5.4'); setModelDropdownOpen(false); }}
                            >
                              <OpenAIIcon width="22" height="22" style={{ color: 'white' }} />
                              <span>GPT-5.4</span>
                            </button>
                            <button
                              className={`${styles.modelOption} ${aiModel === 'openai/gpt-5.4-mini' ? styles.modelOptionActive : ''}`}
                              onClick={() => { setAiModel('openai/gpt-5.4-mini'); setModelDropdownOpen(false); }}
                            >
                              <OpenAIIcon width="22" height="22" style={{ color: 'white' }} />
                              <span>GPT-5.4 mini</span>
                            </button>
                            <button
                              className={`${styles.modelOption} ${aiModel === 'anthropic/claude-sonnet-4-6' ? styles.modelOptionActive : ''}`}
                              onClick={() => { setAiModel('anthropic/claude-sonnet-4-6'); setModelDropdownOpen(false); }}
                            >
                              <AnthropicIcon width="22" height="22" />
                              <span>Claude 4.6 Sonnet</span>
                            </button>
                            <button
                              className={`${styles.modelOption} ${aiModel === 'anthropic/claude-haiku-4-5-20251001' ? styles.modelOptionActive : ''}`}
                              onClick={() => { setAiModel('anthropic/claude-haiku-4-5-20251001'); setModelDropdownOpen(false); }}
                            >
                              <AnthropicIcon width="22" height="22" />
                              <span>Claude Haiku 4.5</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button
                      onClick={() => {
                        const modes = ['off', 'hybrid', 'strict'];
                        const nextMode = modes[(modes.indexOf(premiumMode) + 1) % modes.length];
                        setPremiumMode(nextMode);
                      }}
                      className={styles.modelSelect}
                      title={`Premium Mode: ${premiumMode === 'strict' ? 'ON' : premiumMode.toUpperCase()}`}
                      style={{ marginLeft: '8px', width: '60px', display: 'none', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '6px 10px', fontSize: '11px', fontWeight: '600' }}
                    >
                      {premiumMode === 'off' && 'OFF'}
                      {premiumMode === 'hybrid' && 'HYBRID'}
                      {premiumMode === 'strict' && 'ON'}
                    </button>
                    <button
                      className={`${styles.actionBtn} ${isSelectorOpen ? styles.actionBtnActive : ''}`}
                      onClick={() => setIsSelectorOpen(true)}
                      title="Manual Component Selection"
                      style={{ display: 'none' }}
                    >
                      <FiZap size={16} />
                    </button>
                  </div>
                  <button onClick={sendChatMessage} disabled={loading || (!aiChatInput.trim() && pendingImages.length === 0)} className={styles.sendBtn}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
                  </button>
                </div>
              </div>
            </aside >

            <ComponentSelector
              isOpen={isSelectorOpen}
              onClose={() => setIsSelectorOpen(false)}
              onConfirm={(ids) => {
                setIsSelectorOpen(false);
                startGeneration(aiChatInput.trim() || "Analyze and build with these components", null, pendingImages, ids);
                setAiChatInput('');
                setPendingImages([]);
              }}
            />

            <CommunitySelectorPopup
              isOpen={isCommunityPopupOpen}
              onClose={() => setIsCommunityPopupOpen(false)}
              maxItems={4}
              initialSelectedItems={pendingComponents}
              onConfirm={(selectedItems) => {
                setIsCommunityPopupOpen(false);
                setPendingComponents(selectedItems); // Synchronize selection
              }}
            />

            <div className={styles.resizeHandle} onMouseDown={startResizing}>
              <div className={styles.resizeLine} />
            </div>

            {/* ─── MAIN AREA ─── */}
            <main className={styles.mainArea}>
              <div className={styles.mobilePreviewHeader}>
                <button className={styles.mobileBackToChatBtn} onClick={() => setIsMobilePreviewOpen(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>
              </div>

              {/* Tabs & Actions (Hidden on mobile) */}
              <div className={`${styles.tabs} ${styles.desktopTabs}`}>
                <div className={styles.tabsGroup}>
                  <button className={`${styles.tab} ${activeTab === 'generation' ? styles.tabActive : ''}`} onClick={() => setActiveTab('generation')}>Code</button>
                  <button className={`${styles.tab} ${activeTab === 'preview' ? styles.tabActive : ''}`} onClick={() => setActiveTab('preview')}>Preview</button>
                </div>

                <TopBarLoadingIndicator generationProgress={generationProgress} />
                <div className={styles.actionsGroup}>


                  {/* Viewport dropdown */}
                  <div className={styles.viewportDropdown} ref={viewportDropdownRef}>
                    <button
                      className={styles.viewportBtn}
                      onClick={() => setViewportDropdownOpen(prev => !prev)}
                      disabled={activeTab !== 'preview'}
                      title="Change preview viewport"
                    >
                      {React.createElement(VIEWPORT_SIZES[previewMode].icon, { size: 16 })}
                      <FiChevronDown size={12} />
                    </button>
                    {viewportDropdownOpen && (
                      <div className={styles.viewportMenu}>
                        {Object.entries(VIEWPORT_SIZES).map(([key, { label, icon: Icon }]) => (
                          <button
                            key={key}
                            className={`${styles.viewportOption} ${previewMode === key ? styles.viewportOptionActive : ''}`}
                            onClick={() => { setPreviewMode(key); setViewportRotated(false); setViewportDropdownOpen(false); }}
                          >
                            <Icon size={16} />
                            <span>{label}</span>
                          </button>
                        ))}

                        {previewMode !== 'desktop' && (
                          <>
                            <div className={styles.viewportMenuSeparator} />
                            <button
                              className={`${styles.viewportOption} ${viewportRotated ? styles.viewportOptionActive : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewportRotated(prev => !prev);
                              }}
                              title="Rotate viewport orientation"
                            >
                              <FiRotateCw size={16} />
                              <span>Rotate</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Refresh preview */}
                  <button
                    className={styles.refreshBtn}
                    onClick={() => {
                      if (iframeRef.current && sandboxData?.url) {
                        iframeRef.current.src = sandboxData.url + '?t=' + Date.now();
                      }
                    }}
                    disabled={activeTab !== 'preview' || !sandboxData}
                    title="Refresh preview"
                  >
                    <FiRefreshCw size={16} />
                  </button>

                  {/* Open in new tab */}
                  <button
                    className={styles.openTabBtn}
                    onClick={() => window.open(sandboxData.url, '_blank')}
                    disabled={!sandboxData}
                    title="Open preview in new tab"
                  >
                    <FiExternalLink size={16} />
                  </button>

                  {/* Export Dropdown */}
                  <div className={styles.exportDropdownContainer} ref={exportDropdownRef}>
                    <button
                      className={styles.exportBtnImage}
                      onClick={() => setExportDropdownOpen(prev => !prev)}
                      title="Export Options"
                    >
                      <img src={exportButtonImg} alt="Export" className={styles.exportImg} />
                    </button>
                    <AnimatePresence>
                      {exportDropdownOpen && (
                        <motion.div
                          className={styles.viewportMenu}
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                          <button
                            className={styles.viewportOption}
                            disabled={isPublishing}
                            onClick={() => {
                              setExportDropdownOpen(false);
                              const result = handleOpenSlugModal();
                              if (result === 'UPDATE_DIRECTLY') {
                                confirmPublish(existingPublishedSlug);
                              }
                            }}
                          >
                            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="16" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            <span>{isPublishing ? 'Publishing...' : (existingPublishedSlug ? 'Update' : 'Publish')}</span>
                          </button>

                          <button
                            className={styles.viewportOption}
                            disabled={!sandboxData || isDownloading}
                            onClick={() => {
                              setExportDropdownOpen(false);
                              downloadProject();
                            }}
                          >
                            <FiDownload size={16} />
                            <span>{isDownloading ? 'Preparing...' : 'Download ZIP'}</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className={styles.tabContent}>
                {activeTab === 'generation' ? (
                  <div className={styles.codeArea}>
                    {/* ... existing code area content ... */}
                    <div className={styles.fileExplorer}>
                      {Object.entries(fileTree).map(([dir, files]) => (
                        <div key={dir}>
                          <div className={styles.folderRow} onClick={() => toggleFolder(dir)}>
                            {expandedFolders.has(dir) ? <BsFolder2Open size={14} /> : <BsFolderFill size={14} />}
                            {expandedFolders.has(dir) ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
                            <span>{dir === '.' ? 'root' : dir}</span>
                          </div>
                          {expandedFolders.has(dir) && files.map((file, idx) => (
                            <motion.div
                              key={file.path}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, delay: idx * 0.035, ease: [0.16, 1, 0.3, 1] }}
                              className={`${styles.fileRow} ${selectedFile === file.path ? styles.fileRowActive : ''}`}
                              onClick={() => setSelectedFile(file.path)}
                            >
                              {getFileIcon(file.name)}
                              <span>{file.name}</span>
                            </motion.div>
                          ))}
                        </div>
                      ))}
                      {generationProgress.files.length === 0 && !generationProgress.isGenerating && (
                        <div className={styles.emptyState}>No code generated yet. Describe your website to get started.</div>
                      )}
                    </div>

                    <div className={styles.codeViewer}>
                      {selectedFile ? (
                        <SyntaxHighlighter
                          language={getLanguage(selectedFile)}
                          style={vscDarkPlus}
                          showLineNumbers
                          customStyle={{ margin: 0, height: '100%', fontSize: '13px', background: '#030304' }}
                        >
                          {generationProgress.files.find(f => f.path === selectedFile)?.content
                            || sandboxFiles[selectedFile]
                            || '// File not found'}
                        </SyntaxHighlighter>
                      ) : (
                        <div className={styles.codeViewerEmpty}>Select a file to view its code</div>
                      )}
                    </div>
                  </div>
                ) : activeTab === 'preview' ? (
                  <div className={styles.previewArea}>
                    {(() => {
                      const vp = VIEWPORT_SIZES[previewMode];
                      const isDevice = previewMode !== 'desktop';
                      const isRotated = viewportRotated && isDevice;
                      const frameWidth = isRotated ? vp.height : vp.width;
                      const frameHeight = isRotated ? vp.width : (isDevice ? vp.height : '100%');
                      return (
                        <div
                          className={`${styles.previewFrame} ${isDevice ? styles.previewFrameDevice : ''}`}
                          style={{ width: frameWidth, height: frameHeight, position: 'relative' }}
                        >
                          <AnimatePresence>
                            {showConsole && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className={styles.consoleOverlay}
                              >
                                <div className={styles.consoleHeader}>
                                  <span>Console Output</span>
                                  <button onClick={() => setPreviewLogs([])} title="Clear">
                                    <FiSlash size={12} />
                                  </button>
                                </div>
                                <div className={styles.consoleLogs}>
                                  {previewLogs.length === 0 ? (
                                    <div className={styles.consoleEmpty}>No logs yet...</div>
                                  ) : (
                                    previewLogs.map((log, i) => (
                                      <div key={i} className={`${styles.consoleLogLine} ${styles[log.level]}`}>
                                        <span className={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                        <span className={styles.logContent}>{log.arguments.join(' ')}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {generationProgress.isGenerating || !sandboxData?.url ? (
                            <LoadingLogoView logoState={logoState} />
                          ) : (
                            <iframe
                              ref={iframeRef}
                              src={sandboxData.url}
                              className={styles.iframe}
                              title="Website Preview"
                              style={{ width: '100%', height: '100%' }}
                            />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : null}
              </div>
            </main>

            {/* Notification Popup */}
            <AnimatePresence>
              {notification && (
                <motion.div
                  initial={{ opacity: 0, y: 20, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={styles.notificationPopup}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {notification}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Slug & Info Entry Modal */}
            <AnimatePresence>
              {showSlugModal && (
                <div className={styles.modalOverlay} onClick={() => { if (!isPublishing && !isUploadingIcon) setShowSlugModal(false); }}>
                  <motion.div
                    className={styles.publishModal}
                    onClick={e => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  >
                    <div className={styles.modalHeader}>
                      <FiExternalLink size={24} color="#2dd4bf" />
                      <h3>Publish to Private URL</h3>
                    </div>

                    {/* Corner Decoration */}
                    <img src={gradientCornerForCard} className={styles.modalCornerDecor} alt="" />

                    {publishStep === 1 ? (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={styles.publishStepContent}
                      >
                        <p>Choose a slug for your website. Your site will be hosted at this address.</p>

                        <div className={styles.slugInputContainer}>
                          <span className={styles.slugPrefix}>
                            {window.location.hostname === 'localhost' ? `${window.location.host}/sites/` : 'volturiano.com/sites/'}
                          </span>
                          <input
                            type="text"
                            value={customSlug}
                            onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                            placeholder="my-site-name"
                            className={styles.slugInput}
                            autoFocus
                          />
                        </div>

                        <div className={styles.modalActions}>
                          <button
                            className={styles.confirmBtn}
                            onClick={() => setPublishStep(2)}
                            disabled={!customSlug}
                          >
                            Next: Website Info
                            <FiChevronRight size={16} style={{ marginLeft: '4px' }} />
                          </button>
                          <button className={styles.closeBtn} onClick={() => setShowSlugModal(false)}>Cancel</button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={styles.publishStepContent}
                      >
                        <p>Customize your website's appearance in browser tabs and search engines.</p>

                        <div className={styles.siteInfoForm}>
                          <div className={styles.siteInfoGroup}>
                            <label>Icon</label>
                            <div className={styles.iconUploader}>
                              <div
                                className={styles.iconPreviewBox}
                                onClick={() => document.getElementById('site-icon-upload').click()}
                                style={{ backgroundImage: siteIconPreview ? `url(${siteIconPreview})` : 'none' }}
                              >
                                {!siteIconPreview && <FiCamera size={20} color="rgba(255,255,255,0.4)" />}
                              </div>
                              <div className={styles.iconUploadTexts}>
                                <span className={styles.iconUploadPrimary}>Upload Icon</span>
                                <span className={styles.iconUploadSecondary}>Recommended: 512x512 PNG or SVG</span>
                              </div>
                              <input
                                id="site-icon-upload"
                                type="file"
                                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    setSiteIconFile(file);
                                    const objectUrl = URL.createObjectURL(file);
                                    setSiteIconPreview(objectUrl);
                                  }
                                }}
                              />
                            </div>
                          </div>

                          <div className={styles.siteInfoGroup}>
                            <label>Title</label>
                            <input
                              type="text"
                              value={siteTitle}
                              onChange={(e) => setSiteTitle(e.target.value)}
                              placeholder="e.g., My Awesome App"
                              className={styles.siteInfoInput}
                            />
                          </div>

                          <div className={styles.siteInfoGroup}>
                            <label>Description</label>
                            <textarea
                              value={siteDescription}
                              onChange={(e) => setSiteDescription(e.target.value)}
                              placeholder="A brief description of your site..."
                              className={styles.siteInfoTextarea}
                              rows={3}
                            />
                          </div>
                        </div>

                        <div className={styles.modalActions}>
                          <button className={styles.closeBtn} onClick={() => setPublishStep(1)}>
                            Back
                          </button>
                          <button
                            className={styles.confirmBtn}
                            onClick={() => confirmPublish()}
                            disabled={!customSlug || isPublishing || isUploadingIcon}
                          >
                            {isUploadingIcon ? 'Uploading...' : isPublishing ? 'Initiating...' : 'Confirm Publish'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Publish Success Modal */}
            <AnimatePresence>
              {showPublishModal && (
                <div className={styles.modalOverlay} onClick={() => { setShowPublishModal(false); setShowTemplateForm(false); setTemplateResult(null); }}>
                  <motion.div
                    className={styles.publishModal}
                    onClick={e => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  >
                    <div className={styles.modalHeader}>
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        style={{ width: 56, height: 56, background: 'rgba(45, 212, 191, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}
                      >
                        <BsCheckLg size={28} color="#2dd4bf" />
                      </motion.div>
                      <h3>Site is Live!</h3>
                    </div>

                    {/* Corner Decoration */}
                    <img src={gradientCornerForCard} className={styles.modalCornerDecor} alt="" />
                    <p>Your website has been successfully deployed and is now public via Volturiano Cloud.</p>
                    <div className={styles.urlDisplay}>
                      <code>{publishUrl}</code>
                      <button onClick={() => { navigator.clipboard.writeText(publishUrl); addChatMessage('URL copied to clipboard!', 'system'); }}>Copy</button>
                    </div>
                    <div className={styles.modalActions}>
                      <button className={styles.visitBtn} onClick={() => window.open(publishUrl, '_blank')}>Visit Site</button>
                      <button className={styles.closeBtn} onClick={() => { setShowPublishModal(false); setShowTemplateForm(false); setTemplateResult(null); }}>Close</button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Revert Confirmation Modal ─── */}
      <AnimatePresence>
        {revertModalData && (
          <motion.div
            className={styles.revertModalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setRevertModalData(null)}
          >
            <motion.div
              className={styles.revertModalCard}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.revertModalTitle}>Confirm Undo</h3>
              <p className={styles.revertModalDesc}>This will revert your project to a previous state. Messages after this point will be removed.</p>
              <div className={styles.revertModalActions}>
                <button
                  className={styles.revertModalBtn}
                  onClick={() => setRevertModalData(null)}
                >
                  Cancel
                </button>
                <button
                  className={`${styles.revertModalBtn} ${styles.revertModalBtnConfirm}`}
                  onClick={() => restoreSnapshot(revertModalData.snapshot, revertModalData.targetIndex, revertModalData.promptText, revertModalData.components)}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreditLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
      />
    </div>
  );
}

function CreditRow({ label, value, color, labelColor, bold = false }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{
        fontSize: '12px',
        color: labelColor || 'rgba(255,255,255,0.45)',
        fontWeight: bold ? '600' : '400',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '13px',
        fontWeight: bold ? '700' : '600',
        fontFamily: "'Inter', sans-serif",
        color: color,
        letterSpacing: '0.02em',
      }}>
        {value}
      </span>
    </div>
  );
}
