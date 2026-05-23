import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FiFile, FiChevronRight, FiChevronDown, FiPlus, FiDownload, FiMonitor, FiTablet, FiSmartphone, FiExternalLink, FiRotateCw, FiRotateCcw, FiRefreshCw, FiZap, FiSlash, FiLayers, FiGlobe, FiCheckCircle, FiEdit2, FiSettings, FiMessageSquare } from 'react-icons/fi';
import { BsSend, BsCodeSlash, BsLayoutSidebarInset, BsPhone, BsLaptop, BsTablet, BsFileEarmarkCode, BsFolder2Open, BsFolderFill, BsTerminal } from 'react-icons/bs';
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
import { useAgentMode } from './useAgentMode';
import { mergeHydratedAgentMessages } from './agentChatHydration';
import { AgentShimmerIcon } from './AgentChatCards';
import PublishToVercelModal from './PublishToVercelModal';
import { getPublicModels, normalizePublicModelId } from '../model-registry.client.js';
import { IMAGE_UPLOAD_LIMITS, formatBytes, optimizeImageFiles } from '../utils/imageOptimizer.js';



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

function normalizeSandboxFilePath(path) {
  return String(path || '')
    .replace(/\\/g, '/')
    .replace(/^\/home\/user\/app\//, '')
    .replace(/^\/+/, '');
}

function getFileType(path) {
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.svg') || path.endsWith('.xml')) return 'xml';
  if (path.endsWith('.yml') || path.endsWith('.yaml')) return 'yaml';
  return 'jsx';
}

function getUnavailableFileContent(file = {}) {
  const path = normalizeSandboxFilePath(file.path);
  const ext = file.extension ? `.${file.extension}` : '';
  const reason = file.readError
    ? `Could not read this file: ${file.readError}`
    : `This ${ext || 'asset'} file is part of the project, but it is not a readable text file.`;

  return [
    `// ${path}`,
    `// ${reason}`,
    '// It will still be included when exporting/downloading the project.'
  ].join('\n');
}

function filesMapToGeneratedFiles(filesMap = {}, manifestFiles = []) {
  const contentFiles = Object.entries(filesMap)
    .map(([path, content]) => ({
      path: normalizeSandboxFilePath(path),
      content: String(content ?? ''),
      type: getFileType(normalizeSandboxFilePath(path)),
      readable: true,
      completed: true
    }))
    .filter(file => file.path && !file.path.includes('node_modules/'));

  const seenPaths = new Set(contentFiles.map(file => file.path));
  const manifestOnlyFiles = (Array.isArray(manifestFiles) ? manifestFiles : [])
    .map(file => ({
      ...file,
      path: normalizeSandboxFilePath(file.path)
    }))
    .filter(file => file.path && !seenPaths.has(file.path) && !file.path.includes('node_modules/'))
    .map(file => ({
      path: file.path,
      content: getUnavailableFileContent(file),
      type: getFileType(file.path),
      readable: Boolean(file.readable),
      binary: Boolean(file.binary),
      completed: true
    }));

  return [...contentFiles, ...manifestOnlyFiles].sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Merge two file lists for the code/file-tree panel.
 *
 * `primaryFiles` is the locally-accumulated state (e.g. the agent's streaming
 * output, or the cached generation history). `incomingFiles` is the freshly
 * fetched authoritative state (e.g. the sandbox listing after a turn).
 *
 * When `authoritativePathSet` is provided, primary entries whose path is NOT
 * in that set are pruned UNLESS they are still streaming. This is what makes
 * file deletions in the sandbox actually disappear from the UI tree — without
 * it, the union would keep the stale entry forever.
 *
 * When `authoritativePathSet` is null (e.g. while a stream is in-flight and
 * we haven't yet refetched the sandbox), the merge is a plain union so we
 * don't drop files mid-stream.
 */
function mergeGeneratedFiles(primaryFiles = [], incomingFiles = [], { authoritativePathSet = null } = {}) {
  const merged = new Map();
  for (const file of primaryFiles) {
    if (!file?.path) continue;
    const path = normalizeSandboxFilePath(file.path);
    if (authoritativePathSet && !authoritativePathSet.has(path)) {
      const isStreaming = file.streaming === true || file.completed === false;
      if (!isStreaming) continue;
    }
    merged.set(path, { ...file, path });
  }
  for (const file of incomingFiles) {
    if (file?.path) {
      const path = normalizeSandboxFilePath(file.path);
      merged.set(path, { ...file, path });
    }
  }
  return [...merged.values()].sort((a, b) => a.path.localeCompare(b.path));
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
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.svg') || path.endsWith('.xml')) return 'xml';
  if (path.endsWith('.yml') || path.endsWith('.yaml')) return 'yaml';
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
  for (const dir of Object.keys(tree)) {
    tree[dir].sort((a, b) => a.name.localeCompare(b.name));
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
        {/* <AnimatePresence mode="wait">
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
        </AnimatePresence> */}

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

// ─── Thinking Row (Chat Component) ─────────────
function ThinkingRow({ status, dots, logoState, volturianoLogo, components = [], isStreaming, boxed = false }) {
  const [activeName, setActiveName] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (components.length === 0 || !boxed) {
      setActiveName(status);
      return;
    }

    const cycle = () => {
      setIndex(prev => (prev + 1) % components.length);
      const nextDelay = Math.random() < 0.7 ? 500 : (Math.random() * 700 + 300);
      return nextDelay;
    };

    let timer;
    const run = () => {
      const delay = cycle();
      timer = setTimeout(run, delay);
    };

    timer = setTimeout(run, 500);
    return () => clearTimeout(timer);
  }, [components, status, boxed]);

  useEffect(() => {
    if (boxed && components.length > 0 && components[index]) {
      setActiveName(`${status === 'Analyzing requirements' ? 'Analyzing' : status}: ${components[index].name}`);
    } else {
      setActiveName(status);
    }
  }, [index, components, status, boxed]);

  if (isStreaming) return null;

  const isFoundComponents = status === 'Found Components!';

  return (
    <div className={styles.thinkingRowMessage}>
      <div className={styles.activityHeader}>
        <div
          className={
            logoState === 1 ? styles.tornadoLogoPulse :
              logoState === 2 ? styles.tornadoLogoTikiTaka :
                logoState === 3 ? styles.tornadoLogoScanner :
                  styles.tornadoLogoShimmer
          }
          style={{
            width: 20, height: 20,
            '--logo-url': `url(${volturianoLogo})`
          }}
        />
        <span className={styles.activityHeaderText}>
          {activeName}{!isFoundComponents ? dots : ''}
        </span>
      </div>
      {boxed && !isFoundComponents && (
          <div className={styles.loadingCircleSegmented} style={{ marginLeft: '12px' }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={styles.segment}
                style={{
                  transform: `rotate(${i * 45}deg) translateY(-6px)`,
                  animationDelay: `${i * 0.125}s`
                }}
              />
            ))}
          </div>
        )}
    </div>
  );
}

function AgentProgressLine({ text, metadata }) {
  if (!text) return null;
  const stats = getAgentProgressStats(metadata);

  return (
    <motion.div
      className={styles.agentProgressLine}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className={styles.agentProgressText}>{text}</span>
      {stats && (
        <span className={styles.agentProgressStats} aria-label={`${stats.added} lines added, ${stats.removed} lines removed`}>
          {stats.added > 0 && <span className={styles.agentProgressAdded}>+{formatAgentStatNumber(stats.added)}</span>}
          {stats.removed > 0 && <span className={styles.agentProgressRemoved}>-{formatAgentStatNumber(stats.removed)}</span>}
        </span>
      )}
    </motion.div>
  );
}

function getAgentProgressStats(metadata) {
  if (metadata?.kind !== 'edit' && metadata?.kind !== 'delete') return null;
  const added = Math.max(0, Number(metadata.linesAdded || 0));
  const removed = Math.max(0, Number(metadata.linesRemoved || 0));
  if (!Number.isFinite(added) || !Number.isFinite(removed)) return null;
  if (added === 0 && removed === 0) return null;
  return { added, removed };
}

function formatAgentStatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function getAgentLiveStatus(text) {
  return String(text || '').replace(/\.\.\.$/, '').trim();
}

function getAgentLiveDots(text, statusDots = '') {
  const value = String(text || '').trim();
  if (!value.endsWith('...')) return '';
  if (value.toLowerCase().startsWith('build failed')) return '...';
  return statusDots;
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
  const agentSessionHydrationRef = useRef(new Set());

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
  const isAgentMode = true;
  const [aiModel, setAiModel] = useState(() => {
    const storedModel = typeof window !== 'undefined' ? localStorage.getItem('volturiano_builder_model') : null;
    return normalizePublicModelId(queryParams.get('model') || location.state?.model || storedModel);
  });
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
  const publicModels = getPublicModels();
  const renderModelIcon = (id, size = 22) => {
    if (id.startsWith('openai/')) return <OpenAIIcon width={size} height={size} style={{ color: 'white' }} />;
    if (id.startsWith('anthropic/')) return <AnthropicIcon width={size} height={size} />;
    return <GeminiIcon width={size} height={size} />;
  };
  useEffect(() => {
    localStorage.setItem('volturiano_builder_model', aiModel);
  }, [aiModel]);
  const modelDropdownRef = useRef(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef(null);

  const [generationProgress, setGenerationProgress] = useState({
    isGenerating: false, status: '', components: [], streamedCode: '',
    isStreaming: false, isThinking: false, thinkingText: '',
    currentFile: '', files: [], isEdit: false
  });

  const [codeApplicationState, setCodeApplicationState] = useState({ stage: null, packages: [], installedPackages: [], filesGenerated: [] });
  const [componentSearchPhase, setComponentSearchPhase] = useState(null);
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
  const [sandboxFileManifest, setSandboxFileManifest] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [publishVercelOpen, setPublishVercelOpen] = useState(() => {
    // Auto-open the Publish modal when we land back from the GitHub OAuth callback,
    // so the user immediately sees "Connected as @username" and can finish the push.
    if (typeof window === 'undefined') return false;
    const flag = new URLSearchParams(window.location.search).get('github');
    return flag === 'connected' || flag === 'error';
  });
  // Cached publish metadata so the export dropdown can flip between
  // "Publish to Vercel" (first time) and "Update on GitHub" (already
  // linked) without having to wait for the modal to open.
  const [publishMeta, setPublishMeta] = useState(null); // { owner, repoName } | null
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
      const nextMessage = { content, type, timestamp: new Date(), metadata };
      let newMessages = null;

      if (type === 'agent-progress' && metadata?.replaceProgressKind) {
        const targetKind = metadata.replaceProgressKind;
        let replaceIndex = -1;
        for (let idx = prev.length - 1; idx >= 0; idx -= 1) {
          if (prev[idx]?.type === 'agent-progress' && prev[idx]?.metadata?.kind === targetKind) {
            replaceIndex = idx;
            break;
          }
        }

        if (replaceIndex >= 0) {
          newMessages = [...prev];
          newMessages[replaceIndex] = nextMessage;
        }
      }

      if (!newMessages) {
        newMessages = [...prev, nextMessage];
      }

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isEdgePulling, setIsEdgePulling] = useState(false);

  const [deliveryQueue, setDeliveryQueue] = useState([]);
  const isProcessingQueue = useRef(false);

  // ─── Fetch Sandbox Files ──────────────
  const syncSandboxFilesToCodePanel = useCallback((filesMap = {}, manifestFiles = []) => {
    const sandboxGeneratedFiles = filesMapToGeneratedFiles(filesMap, manifestFiles);
    if (sandboxGeneratedFiles.length === 0) return;

    // The sandbox listing is authoritative on every refresh: anything we still
    // have in `prev.files` that isn't in this snapshot (and isn't actively
    // streaming) was deleted in the sandbox and must disappear from the UI.
    const authoritativePathSet = new Set(sandboxGeneratedFiles.map(f => f.path));

    setGenerationProgress(prev => ({
      ...prev,
      files: mergeGeneratedFiles(prev.files, sandboxGeneratedFiles, { authoritativePathSet })
    }));

    setSelectedFile(prev => {
      if (prev && authoritativePathSet.has(prev)) return prev;
      return sandboxGeneratedFiles.find(file => file.path === 'src/App.jsx')?.path
        || sandboxGeneratedFiles.find(file => file.path.endsWith('/App.jsx'))?.path
        || sandboxGeneratedFiles[0]?.path
        || null;
    });
  }, []);

  const fetchSandboxFiles = useCallback(async (sandboxIdOverride = null) => {
    const targetSandboxId = sandboxIdOverride || sandboxData?.sandboxId;
    if (!targetSandboxId) return null;
    try {
      const res = await authFetch(`/api/get-sandbox-files?sandboxId=${targetSandboxId}`);
      const data = await res.json();
      if (data.success) {
        const files = data.files || {};
        const manifestFiles = data.manifest?.files || [];
        setSandboxFiles(files);
        setSandboxFileManifest(manifestFiles);
        syncSandboxFilesToCodePanel(files, manifestFiles);
      }
      return data;
    } catch (e) { console.warn('Failed to fetch sandbox files:', e); }
    return null;
  }, [authFetch, sandboxData?.sandboxId, syncSandboxFilesToCodePanel]);

  useEffect(() => {
    if (activeTab !== 'generation' || !sandboxData?.sandboxId) return;
    fetchSandboxFiles(sandboxData.sandboxId);
  }, [activeTab, sandboxData?.sandboxId, fetchSandboxFiles]);

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

  // Pull the project's GitHub publish metadata so the export dropdown
  // can show "Update on GitHub" instead of "Publish to Vercel" once
  // there's already a linked repo.
  useEffect(() => {
    if (!currentProjectId) {
      setPublishMeta(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/projects/get?projectId=${encodeURIComponent(currentProjectId)}`);
        const data = await res.json();
        if (cancelled) return;
        if (data?.success && data.project?.github_repo_owner && data.project?.github_repo_name) {
          setPublishMeta({
            owner: data.project.github_repo_owner,
            repoName: data.project.github_repo_name,
          });
        } else {
          setPublishMeta(null);
        }
      } catch (_) { /* non-fatal; dropdown falls back to "Publish to Vercel" */ }
    })();
    return () => { cancelled = true; };
  }, [currentProjectId, authFetch]);

  const takeManualSnapshot = useCallback(async () => {
    if (!currentProjectId) return;
    try {
      setAiThinking({ stage: 'Taking state snapshot...' });

      // Get latest files from sandbox to ensure accuracy
      const filesRes = await authFetch(`/api/get-sandbox-files?sandboxId=${sandboxData?.sandboxId}`);
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
  }, [authFetch, currentProjectId, sandboxData?.sandboxId, sandboxFiles, chatMessages.length, session, fetchSnapshots, showNotification]);
  useEffect(() => {
    const hasActiveWork = generationProgress.isGenerating || !!aiThinking || !!codeApplicationState.stage;
    if (!hasActiveWork) {
      setStatusDots('');
      return;
    }

    const dotsInterval = setInterval(() => {
      setStatusDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => {
      clearInterval(dotsInterval);
      setStatusDots('');
    };
  }, [generationProgress.isGenerating, aiThinking, codeApplicationState.stage]);

  useEffect(() => {
    if (!componentSearchPhase?.active) return;
    const SEARCH_LABELS = [
      { text: 'Searching for Hero', delay: 400 },
      { text: 'Searching for Header', delay: 400 },
      { text: 'Selecting components...', delay: 800 },
      { text: 'Searching for Features', delay: 400 },
      { text: 'Searching for Pricing', delay: 400 },
      { text: 'Reading component descriptions...', delay: 800 },
      { text: 'Searching for Footer', delay: 400 },
      { text: 'Searching for Gallery', delay: 400 },
      { text: 'Reviewing component codes...', delay: 800 },
      { text: 'Searching for Testimonials', delay: 400 },
      { text: 'Searching for Contact', delay: 400 },
      { text: 'Evaluating design fit...', delay: 800 },
      { text: 'Searching for CTA', delay: 400 },
      { text: 'Searching for Stats', delay: 400 },
      { text: 'Matching components to vision...', delay: 800 },
      { text: 'Searching for Services', delay: 400 },
      { text: 'Searching for FAQ', delay: 400 },
      { text: 'Finalizing component selection...', delay: 800 },
    ];
    let idx = 0;
    let timer;
    const cycle = () => {
      idx = (idx + 1) % SEARCH_LABELS.length;
      setComponentSearchPhase(prev => prev ? { ...prev, currentLabel: SEARCH_LABELS[idx].text } : prev);
      timer = setTimeout(cycle, SEARCH_LABELS[idx].delay);
    };
    timer = setTimeout(cycle, SEARCH_LABELS[0].delay);
    return () => clearTimeout(timer);
  }, [componentSearchPhase?.active]);

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

    return (generationProgress.status || 'Processing').replace(/\.\.\.*$/, '');
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

  // Sidebar Resizing Logic (with snap-collapse & edge-pull-out)
  const BASE_SIDEBAR = 322;
  const getMinW = useCallback(() => BASE_SIDEBAR - (window.innerWidth * 0.04), []);
  const getMaxW = useCallback(() => BASE_SIDEBAR + (window.innerWidth * 0.12), []);

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
      const minW = getMinW();
      const maxW = getMaxW();
      const snapThreshold = minW / 2; // half of min-width = collapse trigger

      if (newWidth < snapThreshold) {
        // User dragged well past half the min → snap-collapse
        setIsSidebarCollapsed(true);
        setIsResizing(false);
      } else if (newWidth >= minW && newWidth <= maxW) {
        setSidebarWidth(newWidth);
      } else if (newWidth < minW) {
        // Clamp to min (normal stop behavior)
        setSidebarWidth(minW);
      }
    }
  }, [isResizing, getMinW, getMaxW]);

  // Edge-pull: drag from left edge of viewport to restore sidebar
  const startEdgePull = useCallback((e) => {
    e.preventDefault();
    setIsEdgePulling(true);
  }, []);

  const edgePullMove = useCallback((e) => {
    if (isEdgePulling) {
      const minW = getMinW();
      // Once the user drags out far enough (past 60px), restore
      if (e.clientX > 60) {
        setIsSidebarCollapsed(false);
        setSidebarWidth(minW);
        setIsEdgePulling(false);
      }
    }
  }, [isEdgePulling, getMinW]);

  const stopEdgePull = useCallback(() => {
    setIsEdgePulling(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
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
  }, [isResizing, resize, stopResizing]);

  useEffect(() => {
    if (isEdgePulling) {
      window.addEventListener('mousemove', edgePullMove);
      window.addEventListener('mouseup', stopEdgePull);
    } else {
      window.removeEventListener('mousemove', edgePullMove);
      window.removeEventListener('mouseup', stopEdgePull);
    }
    return () => {
      window.removeEventListener('mousemove', edgePullMove);
      window.removeEventListener('mouseup', stopEdgePull);
    };
  }, [isEdgePulling, edgePullMove, stopEdgePull]);

  // ─── Helpers ──────────────

  const [pendingImages, setPendingImages] = useState([]);
  const [isOptimizingImages, setIsOptimizingImages] = useState(false);

  const addOptimizedPendingImages = useCallback(async (files) => {
    const inputFiles = Array.from(files || []);
    const imageFiles = inputFiles.filter((file) => file?.type?.startsWith('image/'));
    if (imageFiles.length === 0) return;

    if (pendingImages.length >= IMAGE_UPLOAD_LIMITS.maxImages) {
      showNotification(`Maximum of ${IMAGE_UPLOAD_LIMITS.maxImages} images allowed.`);
      return;
    }

    setIsOptimizingImages(true);
    try {
      const { images: optimizedImages, stats } = await optimizeImageFiles(imageFiles, {
        existingImages: pendingImages,
      });

      if (optimizedImages.length > 0) {
        setPendingImages((prev) => [...prev, ...optimizedImages].slice(0, IMAGE_UPLOAD_LIMITS.maxImages));
      }

      if (stats.optimizedCount > 0) {
        showNotification(
          `Optimized ${stats.optimizedCount} image${stats.optimizedCount === 1 ? '' : 's'} for upload (${formatBytes(stats.originalBytes)} -> ${formatBytes(stats.optimizedBytes)}).`
        );
      } else if (stats.skippedForCount > 0) {
        showNotification(`Maximum of ${IMAGE_UPLOAD_LIMITS.maxImages} images allowed.`);
      } else if (stats.skippedForBudget > 0 || stats.failedCount > 0) {
        showNotification('Some images were too large to prepare. Try fewer images or a smaller screenshot.');
      }
    } finally {
      setIsOptimizingImages(false);
    }
  }, [pendingImages, showNotification]);

  const handlePaste = useCallback((e) => {
    const pastedImages = Array.from(e.clipboardData?.items || [])
      .filter((item) => item.type.indexOf('image') !== -1)
      .map((item) => item.getAsFile())
      .filter(Boolean);

    if (pastedImages.length > 0) {
      addOptimizedPendingImages(pastedImages);
    }
  }, [addOptimizedPendingImages]);

  const processFiles = useCallback((files) => {
    addOptimizedPendingImages(files);
  }, [addOptimizedPendingImages]);

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
                    authFetch(`/api/get-sandbox-files?sandboxId=${activeSandboxId}`)
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
                          }).then(snapshotRes => snapshotRes.json());
                        } else {
                          throw new Error('Failed to fetch raw sandbox files');
                        }
                      })
                      .then((snapshotData) => {
                        if (snapshotData?.success && !snapshotData?.skipped) {
                          saveProjectUpdates({
                            buildId,
                            build_status: 'preview',
                            is_committed: true,
                            committed_at: new Date().toISOString()
                          });
                        }
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
  }, [sandboxData, addChatMessage, chatMessages.length, session, lastPrompt, premiumMode, saveProjectUpdates, currentProjectId, fetchSnapshots, authFetch]);


  // ─── Agent Mode Hook ─────────────────────────────────────
  const {
    agentLoading,
    agentProgressText,
    setAgentProgressText,
    canUndo: agentCanUndo,
    sendAgentMessage,
    sendAgentInitialBuild,
    hydrateAgentSession,
    undoLastTurn: agentUndoLastTurn,
  } = useAgentMode({
    sandboxId: sandboxData?.sandboxId,
    sandboxUrl: sandboxData?.url,
    projectId: currentProjectId,
    model: aiModel,
    addChatMessage,
    authFetch,
    onTurnComplete: async ({ hadMutations, mutationCount, toolCallCount, prompt: agentPrompt, response, isUndo, sandboxId: passedSandboxId, sandboxUrl: passedSandboxUrl, isInitialBuild }) => {
      const activeSandboxId = passedSandboxId || sandboxData?.sandboxId;
      const activeSandboxUrl = passedSandboxUrl || sandboxData?.url;

      // 1. Always refresh the preview iframe
      if (iframeRef.current && activeSandboxUrl) {
        setTimeout(() => {
          iframeRef.current.src = activeSandboxUrl + (activeSandboxUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        }, 800);
      }

      // If this was the initial build, automatically switch to preview tab to show the results
      if (isInitialBuild && activeSandboxUrl) {
        setTimeout(() => {
          setActiveTab('preview');
          setGenerationProgress(prev => ({ ...prev, isGenerating: false, status: 'Build Complete' }));
          setLogoState(0); 
          setLoading(false);
        }, 1200);
      }

      const latestSandboxFilesData = activeSandboxId
        ? await fetchSandboxFiles(activeSandboxId)
        : null;

      // If this was an undo or no mutations occurred, skip persistence
      if (isUndo || !hadMutations) return;

      // 2. Persist project metadata to Supabase
      saveProjectUpdates({
        buildId: currentProjectId,
        build_status: 'preview',
      });

      // 3. Create snapshot via existing /api/snapshots endpoint
      //    This is the SAME flow as the legacy generation pipeline (Phase S2)
      try {
        if (!activeSandboxId) throw new Error('No sandbox ID available for persistence');

        const filesData = latestSandboxFilesData?.success
          ? latestSandboxFilesData
          : await fetchSandboxFiles(activeSandboxId);
        if (filesData?.success) {
          const snapshotRes = await authFetch('/api/snapshots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: currentProjectId,
              chatIndex: chatMessages.length,
              text: agentPrompt || 'Agent edit',
              files: filesData.files,
              designSystem: designSystemRef.current,
              componentPlan: componentPlanRef.current,
              sandboxUrl: activeSandboxUrl,
              sandboxId: activeSandboxId
            })
          });
          const snapshotData = await snapshotRes.json().catch(() => null);
          if (snapshotData?.success && !snapshotData?.skipped) {
            saveProjectUpdates({
              buildId: currentProjectId,
              build_status: 'preview',
              is_committed: true,
              committed_at: new Date().toISOString()
            });
          }
          // 4. Refresh snapshot list so revert arrows appear under user messages
          fetchSnapshots();
        }
      } catch (e) {
        console.warn('[Agent Persistence] Snapshot save failed:', e);
      }
    }
  });

  useEffect(() => {
    if (!isAgentMode || !currentProjectId) return;

    const hydrationKey = `${currentProjectId}:${sandboxData?.sandboxId || 'project-only'}`;
    if (agentSessionHydrationRef.current.has(hydrationKey)) return;
    agentSessionHydrationRef.current.add(hydrationKey);

    let cancelled = false;
    (async () => {
      const data = await hydrateAgentSession({
        projectId: currentProjectId,
        sandboxId: sandboxData?.sandboxId,
        limit: 12
      });

      if (cancelled || !data?.messages?.length) return;
      setChatMessages(prev => mergeHydratedAgentMessages(prev, data.messages));
    })();

    return () => {
      cancelled = true;
    };
  }, [isAgentMode, currentProjectId, sandboxData?.sandboxId, hydrateAgentSession]);

  const sendChatMessage = useCallback(async () => {
    const msg = aiChatInput.trim();
    if (!msg && pendingImages.length === 0 && pendingComponents.length === 0) return;
    if (loading || agentLoading) return;
    if (isOptimizingImages) {
      showNotification('Finishing image optimization before sending.');
      return;
    }

    const currentImages = [...pendingImages];
    const currentComponents = [...pendingComponents];

    // ─── AGENT MODE: Route through agentic loop ───────────
    if (isAgentMode && sandboxData?.sandboxId) {
      // Dispatch optimistic deduction animation (same as legacy flow)
      window.dispatchEvent(new CustomEvent('optimistic-credit-deduction'));
      setAiChatInput('');
      setPendingImages([]);
      setPendingComponents([]);
      await sendAgentMessage(msg, {
        images: currentImages,
        stagedComponents: currentComponents
      });
      return;
    }

    // Dispatch optimistic deduction animation for generation edits
    window.dispatchEvent(new CustomEvent('optimistic-credit-deduction'));

    setAiChatInput('');
    setPendingImages([]);
    setPendingComponents([]);

    const isEdit = conversationContext.appliedCode.length > 0;

    if (!isEdit) {
      const initialBuildPrompt = msg || 'Build the website from the attached image.';
      addChatMessage(initialBuildPrompt, 'user', { images: currentImages, stagedComponents: currentComponents });
      setLoading(true);
      setGenerationProgress(prev => ({ ...prev, isGenerating: true, status: 'Agent building...', isEdit: false }));

      try {
        const generateUUID = () => {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        };
        let buildId = generateUUID();
        const initRes = await authFetch('/api/projects/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: initialBuildPrompt, buildId })
        });
        const initData = await safeParseJson(initRes, 'project-init');
        if (initData.success && initData.projectId) {
          buildId = initData.projectId;
          setCurrentProjectId(buildId);
        }

        let sandbox = sandboxData;
        if (!sandbox) {
          setAgentProgressText('Preparing sandbox...');
          const createData = await createSandbox();
          sandbox = { sandboxId: createData.sandboxId, url: createData.url };
        }

        setAgentProgressText('Starting agent...');
        await sendAgentInitialBuild(initialBuildPrompt, buildId, {
          images: currentImages,
          manualSelectionIds: currentComponents.map(c => c.id),
          initialComponents: currentComponents,
          sandboxId: sandbox.sandboxId,
          sandboxUrl: sandbox.url
        });

        setConversationContext(prev => ({
          ...prev,
          appliedCode: [...prev.appliedCode, 'agent-initial-build']
        }));

        setActiveTab('preview');
      } catch (error) {
        console.error('[AgentInitialBuild] Error:', error);
        addChatMessage(`Agent build failed: ${error.message}`, 'error');
      } finally {
        setLoading(false);
        setAgentProgressText('');
        setGenerationProgress(prev => ({ ...prev, isGenerating: false, status: '' }));
      }
      return;
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

        const componentIds = currentComponents.map(c => c.id).filter(Boolean);
        const componentHint = componentIds.length > 0
          ? `\n\nUse the pre-selected community components when useful. Component IDs: ${componentIds.join(', ')}. Install them through the agent catalog tools and customize them to match the user's request.`
          : '';
        const finalInstruction = `${msg || 'Integrate the selected community components.'}${componentHint}`;

        await sendAgentMessage(finalInstruction, {
          images: currentImages,
          stagedComponents: currentComponents,
          initialComponents: currentComponents,
          manualSelectionIds: componentIds,
          sandboxId: sandbox.sandboxId,
          sandboxUrl: sandbox.url
        });
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
  }, [aiChatInput, pendingImages, pendingComponents, loading, agentLoading, isOptimizingImages, isAgentMode, conversationContext, sandboxData, currentProjectId, createSandbox, addChatMessage, showNotification, sendAgentMessage, sendAgentInitialBuild, setAgentProgressText]);

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

      // 1b. Hydrate agent session turns into chat (agent writes to agent_turns, not chat_history)
      try {
        const agentData = await hydrateAgentSession({
          projectId,
          sandboxId: latestSnapshot?.sandbox_id || undefined,
          limit: 12
        });
        if (agentData?.messages?.length) {
          setChatMessages(prev => mergeHydratedAgentMessages(prev, agentData.messages));
        }
      } catch (e) {
        console.warn('[LoadProject] Agent session hydration skipped:', e);
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
  }, [session, addChatMessage, applyGeneratedCode, saveProjectUpdates, setCurrentProjectId, setChatMessages, setGenerationProgress, setConversationContext, hydrateAgentSession]);

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
      (async () => {
          const buildId = crypto.randomUUID();
          setCurrentProjectId(buildId);
          setLoading(true);
          setGenerationProgress(prev => ({ ...prev, isGenerating: true, status: 'Initializing project...' }));
          
          try {
            await authFetch('/api/projects/init', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: "Build from community components", buildId })
            });
            
            // Add the user message so it shows up at the top
            addChatMessage("Build from community components", 'user');

            // Ensure sandbox exists for agent to write to
            setGenerationProgress(prev => ({ ...prev, status: 'Creating sandbox...' }));
            setAgentProgressText('Preparing sandbox...');
            const sb = await createSandbox();

            setAgentProgressText('Starting agent...');
            await sendAgentInitialBuild("Build from community components", buildId, {
              manualSelectionIds: ids,
              sandboxId: sb.sandboxId,
              sandboxUrl: sb.url
            });
          } catch (err) {
            addChatMessage(`Failed to initialize: ${err.message}`, 'error');
            setLoading(false);
            setAgentProgressText('');
          }
        })();
      // Clean up URL to prevent re-trigger on refresh
      window.history.replaceState({}, document.title, location.pathname);
      setAiChatInput('');
    } else if (templateId || location.state?.templateData) {
      initStartedRef.current = true;
      // ── Template Mode via Agent Pipeline ──
      const templateData = location.state?.templateData;
      const templateDisplayName = templateData?.name || 'Template';
      const userAdjustment = templateData?.userAdjustment || '';
      
      // Build the HIDDEN agent prompt: base prompt + optional user adjustments
      // This is what the agent actually receives — NEVER shown in the chat
      let agentPrompt = templateData?.agentPrompt || prompt || "Build a website from this template";
      if (userAdjustment) {
        agentPrompt = `${agentPrompt}\n\nUser customization request: ${userAdjustment}`;
      }

      // Build the VISIBLE chat message — only template name + user text
      const visibleMessage = userAdjustment
        ? `Build using ${templateDisplayName} template — ${userAdjustment}`
        : `Build using ${templateDisplayName} template`;
      
      (async () => {
          const buildId = crypto.randomUUID();
          setCurrentProjectId(buildId);
          setLoading(true);
          setGenerationProgress(prev => ({ ...prev, isGenerating: true, status: 'Initializing project...' }));

          try {
            await authFetch('/api/projects/init', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: `Template: ${templateDisplayName}`, buildId })
            });

            // Show ONLY the clean display message in chat (NOT the backend prompt)
            addChatMessage(visibleMessage, 'user', {
              images: initialImages
            });

            setGenerationProgress(prev => ({ ...prev, status: 'Creating sandbox...' }));
            setAgentProgressText('Preparing sandbox...');
            const sb = await createSandbox();

            // Send the HIDDEN agent_prompt through the agent pipeline
            setAgentProgressText('Starting agent...');
            await sendAgentInitialBuild(agentPrompt, buildId, {
              images: initialImages,
              sandboxId: sb.sandboxId,
              sandboxUrl: sb.url
            });
          } catch (err) {
            addChatMessage(`Failed to initialize: ${err.message}`, 'error');
            setLoading(false);
            setAgentProgressText('');
          }
        })();
      setAiChatInput('');
      setPendingImages([]);
    } else if (prompt?.trim() || initialImages.length > 0 || manualSelectionIds) {
      initStartedRef.current = true;
      const finalPrompt = prompt?.trim() || (manualSelectionIds ? "Build from community components" : "Analyze design and build");
      
      (async () => {
          const buildId = crypto.randomUUID();
          setCurrentProjectId(buildId);
          setLoading(true);
          setGenerationProgress(prev => ({ ...prev, isGenerating: true, status: 'Initializing project...' }));

          try {
            // First initialize the project so it exists in DB for credit deduction FK
            await authFetch('/api/projects/init', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: finalPrompt, buildId })
            });

            // ⭐ UI_OPTIMIZATION: Add the user message IMMEDIATELY so it shows up at the top
            // while the slower sandbox creation and npm install happen in the background.
            addChatMessage(finalPrompt, 'user', { 
              images: initialImages, 
              stagedComponents: initialComponents 
            });

            // Ensure sandbox exists for agent to write to
            setGenerationProgress(prev => ({ ...prev, status: 'Creating sandbox...' }));
            setAgentProgressText('Preparing sandbox...');
            const sb = await createSandbox();

            // Trigger the autonomous Agent Build pipeline
            setAgentProgressText('Starting agent...');
            await sendAgentInitialBuild(finalPrompt, buildId, {
              images: initialImages,
              manualSelectionIds,
              initialComponents,
              sandboxId: sb.sandboxId,
              sandboxUrl: sb.url
            });
          } catch (err) {
            addChatMessage(`Failed to initialize: ${err.message}`, 'error');
            setLoading(false);
            setAgentProgressText('');
          }
        })();
      setAiChatInput('');
      setPendingImages([]);
    }
  }, [location.state, location.search, location.pathname, loadProject, sendAgentInitialBuild, setAgentProgressText]); // Added dependencies for safety

  // ─── Sandbox Status Polling ──────────────
  useEffect(() => {
    if (!sandboxData?.sandboxId || sandboxData.sandboxId === 'undefined' || sandboxData.sandboxId === 'null') return;
    const interval = setInterval(async () => {
      if (sandboxCreationRef.current) return;
      try {
        const res = await authFetch(`/api/sandbox-status?sandboxId=${sandboxData.sandboxId}`);
        const data = await res.json();
        if (!data.healthy) {
          setSandboxData(null);
        }
      } catch (e) { /* ignore */ }
    }, 15000);
    return () => clearInterval(interval);
  }, [authFetch, sandboxData?.sandboxId]);

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

  const codeFiles = useMemo(() => {
    const sandboxGeneratedFiles = filesMapToGeneratedFiles(sandboxFiles, sandboxFileManifest);
    // Once the sandbox has been fetched at least once, treat its listing as
    // authoritative for what still exists. Any path in generationProgress.files
    // that is not in the sandbox AND isn't actively streaming is stale and
    // must be pruned (otherwise deleted files keep showing in the file tree).
    const sandboxKnowsState =
      Object.keys(sandboxFiles || {}).length > 0
      || (Array.isArray(sandboxFileManifest) && sandboxFileManifest.length > 0);
    const authoritativePathSet = sandboxKnowsState
      ? new Set(sandboxGeneratedFiles.map(f => f.path))
      : null;
    return mergeGeneratedFiles(
      generationProgress.files,
      sandboxGeneratedFiles,
      { authoritativePathSet }
    );
  }, [generationProgress.files, sandboxFiles, sandboxFileManifest]);
  const fileTree = useMemo(() => buildFileTree(codeFiles), [codeFiles]);

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

  // ─── Key handler ──────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
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
    <div className={styles.page} data-mobile-preview={isMobilePreviewOpen} style={{ cursor: (isResizing || isEdgePulling) ? 'col-resize' : 'default', userSelect: (isResizing || isEdgePulling) ? 'none' : 'auto', background: 'black' }}>
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
            <aside className={`${styles.sidebar} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''} ${isResizing ? styles.sidebarResizing : ''}`} style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}>
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
                {(() => {
                  // ─── Antigravity-style turn grouping ───────────────────
                  // Group consecutive agent messages into "turns" that get
                  // clumped into a collapsible row once the turn completes.
                  const AGENT_MSG_TYPES = new Set([]);
                  const groups = [];
                  let currentAgentGroup = null;

                  for (let idx = 0; idx < chatMessages.length; idx++) {
                    const msg = chatMessages[idx];
                    const isAgentRow = AGENT_MSG_TYPES.has(msg.type);

                    if (isAgentRow) {
                      if (!currentAgentGroup) {
                        currentAgentGroup = { startIndex: idx, messages: [], startTime: msg.timestamp };
                      }
                      currentAgentGroup.messages.push({ msg, index: idx });
                      if (msg.type === 'agent-summary') {
                        currentAgentGroup.toolCallCount = msg.metadata?.toolCallCount || 0;
                        currentAgentGroup.mutationCount = msg.metadata?.mutationCount || 0;
                      }
                    } else {
                      if (currentAgentGroup) {
                        currentAgentGroup.endTime = msg.timestamp || currentAgentGroup.messages[currentAgentGroup.messages.length - 1]?.msg?.timestamp;
                        groups.push({ type: 'agent-clump', group: currentAgentGroup });
                        currentAgentGroup = null;
                      }
                      groups.push({ type: 'normal', msg, index: idx });
                    }
                  }
                  if (currentAgentGroup) {
                    // Only mark as "live" if the agent is actively loading
                    // Otherwise the turn is finished and should collapse
                    currentAgentGroup.isLive = agentLoading;
                    currentAgentGroup.endTime = currentAgentGroup.messages[currentAgentGroup.messages.length - 1]?.msg?.timestamp;
                    groups.push({ type: 'agent-clump', group: currentAgentGroup });
                  }

                  // ─── Render helper for individual agent messages ─────
                  const renderAgentMsg = (msg, i, hideStatus = false) => {
                    if (msg.type === 'agent-tool' || msg.type === 'agent-tool-result') {
                      return (
                        <AgentToolCard
                          key={i}
                          toolName={msg.metadata?.toolName}
                          args={msg.metadata?.args}
                          status={msg.metadata?.status}
                          result={msg.metadata?.result}
                          success={msg.metadata?.success}
                          hideStatus={hideStatus}
                        />
                      );
                    }
                    if (msg.type === 'agent-summary') {
                      return (
                        <AgentSummaryBadge
                          key={i}
                          toolCallCount={msg.metadata?.toolCallCount}
                          mutationCount={msg.metadata?.mutationCount}
                          canUndo={msg.metadata?.canUndo}
                          onUndo={agentUndoLastTurn}
                        />
                      );
                    }
                    if (msg.type === 'agent-thinking') {
                      const content = msg.content || '';
                      const lowered = content.toLowerCase();
                      const isSearching = lowered.includes('searching') || lowered.includes('listing');
                      const isReading = lowered.includes('reading');
                      const isWriting = lowered.includes('writing') || lowered.includes('editing');
                      const isCheckingBuild = lowered.includes('checking build') || lowered.includes('verifying build');
                      let fileName = null;
                      if (isReading || isWriting) {
                        const matches = content.match(/\S+\.[a-zA-Z0-9]+$/);
                        if (matches) fileName = matches[0].split('/').pop();
                      }
                      let type = 'thinking';
                      if (isSearching) type = 'search';
                      else if (isReading) type = 'read';
                      else if (isWriting) type = 'write';
                      else if (isCheckingBuild) type = 'get_build_errors';
                      return (
                        <AgentThinkingPill
                          key={i}
                          volturianoLogo={volturianoLogo}
                          stage={isReading ? 'Reading' : isWriting ? 'Editing' : isCheckingBuild ? 'Checking build' : content}
                          type={type}
                          fileName={fileName}
                        />
                      );
                    }
                    return null;
                  };

                  return groups.map((entry, groupIdx) => {
                    // ─── Agent Turn Clump ─────────────────────────────
                    if (entry.type === 'agent-clump') {
                      const { group } = entry;
                      const durationMs = group.endTime && group.startTime
                        ? new Date(group.endTime).getTime() - new Date(group.startTime).getTime()
                        : 0;

                      // Partition messages into Minor (consolidated under Thinking) and Major (standalone cards)
                      const majorMsgs = [];
                      const minorMsgs = [];
                      const thinkingMsgs = [];
                      
                      group.messages.forEach(m => {
                        const { msg } = m;
                        const toolName = msg.metadata?.toolName;
                        const content = (msg.content || '').toLowerCase();
                        
                        // "Everything except checking build and edit" goes under thinking row
                        // Major: edit_file, create_file, replace_file, get_build_errors, and summaries
                        const isMajor = 
                          ['edit_file', 'create_file', 'replace_file', 'get_build_errors'].includes(toolName) ||
                          msg.type === 'agent-summary' ||
                          (msg.type === 'agent-thinking' && (content.includes('checking build') || content.includes('verifying build')));
                          
                        if (isMajor) {
                          majorMsgs.push(m);
                        } else if (msg.type === 'agent-tool') {
                          minorMsgs.push(m);
                        } else if (msg.type === 'agent-thinking') {
                          thinkingMsgs.push(m);
                        }
                      });

                      const latestThinking = thinkingMsgs[thinkingMsgs.length - 1]?.msg?.content;

                      return (
                        <AgentTurnClump
                          key={`clump-${group.startIndex}`}
                          durationMs={durationMs}
                          toolCallCount={group.toolCallCount || group.messages.filter(m => m.msg.type === 'agent-tool').length}
                          mutationCount={group.mutationCount || 0}
                          isLive={group.isLive || false}
                        >
                          {/* Major standalone cards (Editing, Build Checks, Diffs) rendered first */}
                          {majorMsgs.map(({ msg, index }) => renderAgentMsg(msg, index, !group.isLive))}

                          {/* Consolidated thinking row for search/read/list/etc - hidden if major tasks are active */}
                          {(() => {
                            const isMajorActive = majorMsgs.some(m => m.msg.metadata?.status === 'running');
                            // Only render the activity row if it's currently live (thinking) OR if it has tool calls to show in the stack
                            const shouldShowActivity = (minorMsgs.length > 0 || (group.isLive && (latestThinking || generationProgress.status)));
                            
                            return shouldShowActivity && !isMajorActive && !isTextStreaming && (
                              <AgentActivityRow 
                                status={latestThinking || (group.isLive ? (generationProgress.status || 'Architecting') : 'Task completed')} 
                                volturianoLogo={volturianoLogo} 
                                messages={minorMsgs} 
                                isLive={group.isLive}
                              />
                            );
                          })()}
                        </AgentTurnClump>
                      );
                    }

                    // ─── Normal Messages ──────────────────────────────
                    const { msg, index: i } = entry;
                    const isLast = i === chatMessages.length - 1;

                  // Special component for planning phases
                  if ((msg.type === 'system' || msg.type === 'ai') && msg.content.includes('Planning') && msg.content.includes('components:')) {
                    return <PlanningRevolver key={i} message={msg.content} isLast={isLast} />;
                  }

                  if (msg.type === 'agent-progress') {
                    return <AgentProgressLine key={`agent-progress-${i}`} text={msg.content} metadata={msg.metadata} />;
                  }

                  if (msg.type?.startsWith('agent-')) {
                    return null;
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
                    const firstUserMsgIndex = chatMessages.findIndex(m => m.type === 'user');
                    const isFirstUserMsg = firstUserMsgIndex === i;
                    const nextMsg = chatMessages[i + 1];
                    let snapshot = null;
                    let isEdit = false;

                    if (!isFirstUserMsg) {
                      const sortedSnapshots = [...snapshots].sort((a, b) => b.chat_message_index - a.chat_message_index);
                      snapshot = sortedSnapshots.find(s => s.chat_message_index < i);
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
                                const lastUserMsg = chatMessages.slice().reverse().find(m => m.type === 'user');
                                if (lastUserMsg) {
                                  setAiChatInput(lastUserMsg.content || '');
                                  if (lastUserMsg.metadata?.images) setPendingImages([...lastUserMsg.metadata.images]);
                                  if (lastUserMsg.metadata?.stagedComponents) setPendingComponents([...lastUserMsg.metadata.stagedComponents]);
                                }
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
                  } else if (msg.type === 'thinking-pill') {
                    return (
                      <ThinkingRow
                        key={i}
                        status={msg.content}
                        dots=""
                        logoState={0}
                        volturianoLogo={volturianoLogo}
                        boxed={msg.metadata?.boxed}
                        isStreaming={false}
                      />
                    );
                  }

                  return null;
                  });
                })()}

                {/* Component Search Pill — shown during active selection/planning phase */}
                {componentSearchPhase?.active && !isTextStreaming && (
                  <ThinkingRow 
                    status={componentSearchPhase.currentLabel || 'Searching...'}
                    dots={statusDots}
                    logoState={2} 
                    volturianoLogo={volturianoLogo}
                    components={[]} 
                    isStreaming={false}
                    boxed={true}
                  />
                )}

                {/* Active Status Indicator — hidden during search pill phase, agent mode activity, and text streaming */}
                {!componentSearchPhase?.active && (aiThinking || (generationProgress.isGenerating && !isAgentMode) || codeApplicationState.stage) && !isTextStreaming && (
                  <ThinkingRow 
                    status={getUnifiedStatus().replace(/\.\.\.$/, '')}
                    dots={statusDots}
                    logoState={logoState}
                    volturianoLogo={volturianoLogo}
                    components={generationProgress.components?.filter(c => !c.completed)}
                    isStreaming={isTextStreaming || deliveryQueue.length > 0}
                    boxed={false}
                  />
                )}
                {isAgentMode && agentProgressText && !isTextStreaming && (
                  <ThinkingRow
                    status={getAgentLiveStatus(agentProgressText)}
                    dots={getAgentLiveDots(agentProgressText, statusDots)}
                    logoState={logoState}
                    volturianoLogo={volturianoLogo}
                    isStreaming={false}
                    boxed={false}
                  />
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
                  className={`${styles.chatInputWrapper} ${pendingImages.length > 0 ? styles.extended : ''} ${isViewportDragging ? styles.isDragging : ''} ${isAgentMode ? styles.agentWrapperActive : ''}`}
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
                        {renderModelIcon(aiModel, aiModel.startsWith('openai/') ? 24 : 22)}
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
                            {publicModels.map((model) => (
                              <button
                                key={model.id}
                                className={`${styles.modelOption} ${aiModel === model.id ? styles.modelOptionActive : ''}`}
                                onClick={() => { setAiModel(model.id); setModelDropdownOpen(false); }}
                              >
                                {renderModelIcon(model.id)}
                                <span>{model.label}</span>
                              </button>
                            ))}
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
                  {/* Agent Mode Toggle — hidden, always-on */}
                  <button onClick={sendChatMessage} disabled={(loading || agentLoading) || (!aiChatInput.trim() && pendingImages.length === 0)} className={styles.sendBtn}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
                  </button>
                </div>
              </div>
            </aside >

            <ComponentSelector
              isOpen={isSelectorOpen}
              onClose={() => setIsSelectorOpen(false)}
              onConfirm={async (ids) => {
                setIsSelectorOpen(false);
                const prompt = aiChatInput.trim() || "Analyze and build with these components";
                const currentImages = [...pendingImages];
                addChatMessage(prompt, 'user', { images: currentImages });
                setLoading(true);
                setGenerationProgress(prev => ({ ...prev, isGenerating: true, status: 'Initializing project...' }));
                try {
                  const buildId = crypto.randomUUID();
                  setCurrentProjectId(buildId);
                  await authFetch('/api/projects/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, buildId })
                  });
                  setAgentProgressText('Preparing sandbox...');
                  const sb = await createSandbox();
                  setAgentProgressText('Starting agent...');
                  await sendAgentInitialBuild(prompt, buildId, {
                    images: currentImages,
                    manualSelectionIds: ids,
                    sandboxId: sb.sandboxId,
                    sandboxUrl: sb.url
                  });
                } catch (err) {
                  addChatMessage(`Failed to initialize: ${err.message}`, 'error');
                } finally {
                  setLoading(false);
                  setAgentProgressText('');
                  setGenerationProgress(prev => ({ ...prev, isGenerating: false, status: '' }));
                }
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

            {isSidebarCollapsed ? (
              <div className={styles.edgePullHandle} onMouseDown={startEdgePull}>
                <div className={styles.edgePullLine} />
              </div>
            ) : (
              <div className={styles.resizeHandle} onMouseDown={startResizing}>
                <div className={styles.resizeLine} />
              </div>
            )}

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
                          {/* Publish to Vercel (first time) -> Update on GitHub (subsequent).
                              Once a project has a linked repo, the action is just an
                              incremental commit + push; nothing user-visible touches Vercel
                              from then on, so we drop the Vercel branding entirely. */}
                          <button
                            className={styles.viewportOption}
                            disabled={!sandboxData || !currentProjectId}
                            onClick={() => {
                              setExportDropdownOpen(false);
                              setPublishVercelOpen(true);
                            }}
                            title={!currentProjectId
                              ? 'Save the project first before publishing.'
                              : (publishMeta ? 'Push the latest sandbox to GitHub' : 'Publish to Vercel via GitHub')}
                          >
                            {publishMeta ? (
                              // GitHub mark
                              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  fill="currentColor"
                                  d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.18c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.74 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17a10.96 10.96 0 0 1 5.74 0c2.18-1.48 3.14-1.17 3.14-1.17.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.7 5.36-5.27 5.65.41.36.78 1.06.78 2.14v3.18c0 .31.21.67.8.55A11.5 11.5 0 0 0 12 .5Z"
                                />
                              </svg>
                            ) : (
                              // Vercel triangle
                              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                                <path fill="currentColor" d="M12 2 23 21H1L12 2Z" />
                              </svg>
                            )}
                            <span>{publishMeta ? 'Update on GitHub' : 'Publish to Vercel'}</span>
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
                      {codeFiles.length === 0 && !generationProgress.isGenerating && (
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
                          {codeFiles.find(f => f.path === selectedFile)?.content
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

      <PublishToVercelModal
        isOpen={publishVercelOpen}
        onClose={() => setPublishVercelOpen(false)}
        projectId={currentProjectId}
        projectName={conversationContext?.currentProject || ''}
        authFetch={authFetch}
        onPublishMetaChange={setPublishMeta}
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
