import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { supabase } from "../../../../../lib/supabaseClient";
import {
  SandpackProvider,
  SandpackPreview,
  useSandpack,
  SandpackLayout,
  SandpackCodeViewer,
} from "@codesandbox/sandpack-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBuilderAuth } from "../../../../../contexts/BuilderAuthContext";
import styles from "./SandpackPreviewPopup.module.css";

const API_BASE = "/api/community";



const formatCount = (count) => {
  if (!count) return "0";
  if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
  if (count >= 1000) return (count / 1000).toFixed(1) + "k";
  return count.toString();
};

export default function SandpackPreviewPopup({
  item,
  isOpen,
  onClose,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}) {
  const { getAccessToken } = useBuilderAuth();
  const [loading, setLoading] = useState(false);
  const [fullData, setFullData] = useState(null);
  const [bundleCode, setBundleCode] = useState("");
  const [dependencies, setDependencies] = useState({});
  const [themeMode, setThemeMode] = useState("dark");
  const [showCode, setShowCode] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [copied, setCopied] = useState(false);

// ─── Fetch full component data when opened ───
  useEffect(() => {
    if (!isOpen || !item?.id) return;

    const fetchData = async () => {
      setLoading(true);
      setFullData(null);
      setBundleCode("");
      setShowCode(false);
      setCopied(false);

      try {
        const token = getAccessToken();
        const res = await fetch(`${API_BASE}/components/${item.id}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        if (data.success && data.component) {
          console.log("[DEBUG] 1. API Response:", data);
          setFullData(data);
          setIsLiked(data.isLiked || false);
          let code = data.component.bundle_code || "";
          console.log("[DEBUG] 2. Raw bundle_code type:", typeof code);

          // 1. If code is a string, it might be stringified JSON.
          if (
            typeof code === "string" &&
            (code.trim().startsWith("{") || code.trim().startsWith("["))
          ) {
            try {
              const parsed = JSON.parse(code);
              if (parsed && typeof parsed === "object") {
                console.log("[DEBUG] 3. Parsed stringified JSON from DB");
                code = parsed;
              }
            } catch (e) {
              console.log(
                "[DEBUG] 3. String looked like JSON but parse failed",
              );
              // Leave it as a string
            }
          }

          // 2. Extract actual content from object. Do NOT squash multi-file arrays!
          if (code && typeof code === "object") {
            if (code.files) {
              // If it's a files array, keep it as an object/array to pass to Sandpack directly
              console.log("[DEBUG] 5. Keeping multi-file structure untouched");
            } else if (code.content && typeof code.content === "string") {
              code = code.content;
              console.log("[DEBUG] 5. Found code in .content");
            } else {
              code = JSON.stringify(code, null, 2);
              console.log(
                "[DEBUG] 5. No known key found, using stringified object",
              );
            }
          }

          // 3. One more pass for double-wrapped JSON
          if (typeof code === "string" && code.trim().startsWith("{")) {
            try {
              const parsedTwice = JSON.parse(code);
              if (
                parsedTwice &&
                typeof parsedTwice === "object" &&
                parsedTwice.content
              ) {
                code = parsedTwice.content;
                console.log("[DEBUG] 6. Handled double-wrapped JSON");
              } else if (
                parsedTwice &&
                typeof parsedTwice === "object" &&
                parsedTwice.files
              ) {
                code = parsedTwice;
              }
            } catch (e) {
              /* ignore */
            }
          }

          if (!code) {
            code =
              "// No code available\nexport default function App() { return <div>No preview available</div>; }";
          }

          console.log("[DEBUG] 7. Bundle Code extracted");
          setBundleCode(code);

          // ── Build deps: lightweight defaults + auto-detected heavy packages ──
          // Sandpack's "react" template already ships react + react-dom.
          // Adding them as explicit customSetup deps causes the bundler to
          // re-download them, which frequently times-out ("11/12 react-dom").

          // Always include lightweight UI libs — small, load fast, used by most components
          let deps = {
            "lucide-react": "latest",
            "framer-motion": "latest",
            "clsx": "latest",
            "tailwind-merge": "latest",
            "color-bits": "latest",
            "react-router-dom": "latest",
          };

          // Heavy packages that should ONLY be added if the code actually uses them
          const HEAVY_PACKAGES = new Set([
            "three", "@react-three/fiber", "@react-three/drei",
            "ogl", "cobe", "react-icons", "@radix-ui/react-icons",
            "recharts", "zustand", "react-router-dom"
          ]);

          // Resolve code to a string for import scanning
          let scanStr = "";
          if (typeof code === "string") {
            scanStr = code;
          } else if (code && typeof code === "object") {
            if (code.content) scanStr = code.content;
            else if (Array.isArray(code)) scanStr = code.map(f => f.content || "").join("\n");
            else if (code.files && Array.isArray(code.files)) scanStr = code.files.map(f => f.content || "").join("\n");
            else scanStr = Object.values(code).map(v => typeof v === 'string' ? v : (v?.content || JSON.stringify(v))).join("\n");
          }

          // Auto-detect heavy packages from import statements in the code
          const importRx = /from\s+['"]([^'"]+)['"]/g;
          let im;
          while ((im = importRx.exec(scanStr)) !== null) {
            const raw = im[1];
            if (raw.startsWith(".") || raw.startsWith("/")) continue;
            const pkg = raw.startsWith("@")
              ? raw.split("/").slice(0, 2).join("/")
              : raw.split("/")[0];
            if (HEAVY_PACKAGES.has(pkg)) deps[pkg] = "latest";
          }

          // Also check the DB "requires" field, but ONLY allow known packages
          const ALL_SAFE = new Set([...Object.keys(deps), ...HEAVY_PACKAGES]);
          const req = data.component.requires;
          if (req) {
            try {
              const parsed = typeof req === "string" ? JSON.parse(req) : req;
              const list = Array.isArray(parsed)
                ? parsed
                : parsed?.packages && Array.isArray(parsed.packages)
                  ? parsed.packages
                  : [];
              list.forEach((p) => {
                if (typeof p === "string" && ALL_SAFE.has(p)) {
                  deps[p] = "latest";
                }
              });
            } catch (_) { /* ignore bad JSON */ }
          }

          console.log("[DEBUG] 8. Final Dependencies:", deps);
          setDependencies(deps);
        }
      } catch (err) {
        console.error("[SandpackPreview] Failed to fetch component:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, item?.id, getAccessToken]);

  const finalDependencies = useMemo(() => dependencies, [dependencies]);

  const codeStr = useMemo(() => {
    if (!bundleCode) return "";
    if (typeof bundleCode === "string") return bundleCode;

    // 1. If it's an object with a .content field
    if (bundleCode.content && typeof bundleCode.content === "string") {
      return bundleCode.content;
    }

    // 2. If it's a multi-file structure
    let filesArray = [];
    if (Array.isArray(bundleCode)) {
      filesArray = bundleCode;
    } else if (bundleCode.files && Array.isArray(bundleCode.files)) {
      filesArray = bundleCode.files;
    }

    if (filesArray.length > 0) {
      // Find the main file (usually the one with export default)
      const mainFile =
        filesArray.find(
          (f) =>
            f.path?.endsWith(".jsx") && f.content?.includes("export default"),
        ) ||
        filesArray.find((f) => f.path?.endsWith(".jsx")) ||
        filesArray[0];
      return mainFile?.content || "";
    }

    // Fallback
    return JSON.stringify(bundleCode, null, 2);
  }, [bundleCode]);

  // Syntax highlighting trigger
  useEffect(() => {
    if (showCode && typeof window.hljs !== "undefined") {
      // Small timeout to ensure DOM is ready
      setTimeout(() => {
        const blocks = document.querySelectorAll('pre code');
        blocks.forEach((block) => {
          window.hljs.highlightElement(block);
        });
      }, 0);
    }
  }, [showCode, codeStr]);

  // ─── Close on Escape ───
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // ─── Handlers ───
  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const handleLike = useCallback(async () => {
    // Instant Optimistic Update
    setIsLiked((prev) => !prev);
    
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/like/${item.id}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      
      // If server fails, revert state (handled by a simple re-fetch if needed, 
      // but here we just ensure sync if the response was definitive)
      if (!data.success) {
        setIsLiked((prev) => !prev);
      }
    } catch (err) {
      console.error("[SandpackPreview] Like error:", err);
      // Revert on network error
      setIsLiked((prev) => !prev);
    }
  }, [item?.id, getAccessToken]);

  const handleCopyCode = useCallback(async () => {
    if (!bundleCode) return;
    const textToCopy =
      typeof bundleCode === "string"
        ? bundleCode
        : JSON.stringify(bundleCode, null, 2);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback */
    }
  }, [bundleCode]);

  const importName = fullData?.component?.usage?.importName || "";
  const displayName = item?.display_name || item?.name || "Component";

  const sandpackFiles = useMemo(() => {
    // The code from the DB is always a single string for our components.
    // Just put it directly into /App.jsx — exactly like the Studio does.
    let appCode = "";

    if (typeof bundleCode === "string") {
      appCode = bundleCode;
    } else if (bundleCode && typeof bundleCode === "object") {
      // Try to extract string content from object formats
      if (bundleCode.content && typeof bundleCode.content === "string") {
        appCode = bundleCode.content;
      } else if (
        Array.isArray(bundleCode) ||
        (bundleCode.files && Array.isArray(bundleCode.files))
      ) {
        const filesArr = Array.isArray(bundleCode)
          ? bundleCode
          : bundleCode.files;
        const mainFile =
          filesArr.find(
            (f) =>
              f.path?.endsWith(".jsx") && f.content?.includes("export default"),
          ) ||
          filesArr.find((f) => f.path?.endsWith(".jsx")) ||
          filesArr[0];
        appCode = mainFile?.content || JSON.stringify(bundleCode, null, 2);
      } else {
        appCode = JSON.stringify(bundleCode, null, 2);
      }
    }

    const globalCss =
      bundleCode?.assets?.css || bundleCode?.cssCode || bundleCode?.css || "";

    console.log("[SANDPACK-DEBUG] appCode type:", typeof appCode);
    console.log("[SANDPACK-DEBUG] appCode length:", appCode.length);
    console.log(
      "[SANDPACK-DEBUG] appCode first 200 chars:",
      appCode.substring(0, 200),
    );
    console.log(
      "[SANDPACK-DEBUG] has export default:",
      appCode.includes("export default"),
    );

    // Build files object exactly like ComponentStudio does
    const files = {
      "/App.jsx": appCode,
      "/style.css": globalCss || "",
      "/index.js": `import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
${"react-router-dom" in finalDependencies ? 'import { BrowserRouter } from "react-router-dom";' : ''}
import "./style.css";

import App from "./App.jsx";

const root = createRoot(document.getElementById("root"));
document.body.style.backgroundColor = "${themeMode === "light" ? "#ffffff" : "#000000"}";
document.body.style.color = "${themeMode === "light" ? "#000000" : "#ffffff"}";

const isRouterNeeded = ${"react-router-dom" in finalDependencies ? "true" : "false"};
// A basic heuristic to avoid double-wrapping if the App already provides a router
const hasOwnRouter = App.toString && (App.toString().includes('BrowserRouter') || App.toString().includes('MemoryRouter') || App.toString().includes('HashRouter') || App.toString().includes('Router>'));
const AppWrapper = (isRouterNeeded && !hasOwnRouter) ? BrowserRouter : React.Fragment;

root.render(
  <StrictMode>
    <AppWrapper>
      <div className="${themeMode === "light" ? "bg-white" : "bg-transparent"} min-h-screen w-full">
        <App />
      </div>
    </AppWrapper>
  </StrictMode>
);`,
    };

    console.log("[SANDPACK-DEBUG] Final files keys:", Object.keys(files));
    console.log("[SANDPACK-DEBUG] /App.jsx length:", files["/App.jsx"]?.length);

    return files;
  }, [bundleCode, themeMode]);


  // Use Sandpack's built-in theme strings
  const sandpackTheme = themeMode === "dark" ? "dark" : "light";

  const authorProfile = item?.profiles || fullData?.author || {};
  const authorName =
    authorProfile.username || authorProfile.display_name || "Unknown";
  const comp = fullData?.component || item;

  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.popupOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.popupModal}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ─── Header Bar ─── */}
            <div className={styles.popupHeader}>
              <div className={styles.headerLeft}>
                {authorProfile.avatar_url ? (
                  <img
                    src={authorProfile.avatar_url}
                    alt={authorName}
                    className={styles.headerAvatar}
                  />
                ) : (
                  <div className={styles.headerAvatarPlaceholder} />
                )}
                <h2 className={styles.headerTitle}>{displayName}</h2>
              </div>

              <div className={styles.headerRight}>
                {/* Theme toggle */}
                <button
                  className={styles.iconBtn}
                  onClick={toggleTheme}
                  title={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}
                >
                  <div className={styles.themeToggleWrap}>
                    <div
                      className={`${styles.themeIcon} ${themeMode === "dark" ? styles.themeIconHidden : styles.themeIconVisible} `}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="18"
                        viewBox="0 -960 960 960"
                        width="18"
                        fill="currentColor"
                      >
                        <path d="M565-395q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35Zm-226.5 56.5Q280-397 280-480t58.5-141.5Q397-680 480-680t141.5 58.5Q680-563 680-480t-58.5 141.5Q563-280 480-280t-141.5-58.5ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z" />
                      </svg>
                    </div>
                    <div
                      className={`${styles.themeIcon} ${themeMode === "dark" ? styles.themeIconVisible : styles.themeIconHidden} `}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="18"
                        viewBox="0 -960 960 960"
                        width="18"
                        fill="currentColor"
                      >
                        <path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z" />
                      </svg>
                    </div>
                  </div>
                </button>


                {/* Like Button */}
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className={styles.iconBtn}
                  onClick={handleLike}
                  title={isLiked ? "Unlike" : "Like"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="18"
                    viewBox="0 -960 960 960"
                    width="18"
                    fill={isLiked ? "#ff4b4b" : "currentColor"}
                  >
                    <path d={isLiked 
                      ? "m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z"
                      : "m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"
                    } />
                  </svg>
                </motion.button>



                {/* Close */}
                <button
                  className={styles.closeBtn}
                  onClick={onClose}
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ─── Preview / Code Area ─── */}
            {loading ? (
              <div className={styles.previewArea}>
                <div className={styles.skeletonPulse}>
                  <div className={styles.shimmerEffect} />
                </div>
              </div>
            ) : showCode ? (
              <div className={styles.codeViewer}>
                <div className={styles.codeContainer}>
                  <div className={styles.lineNumbers}>
                    {(codeStr || "").split("\n").map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <div className={styles.codeContent}>
                    <pre>
                      <code className="language-javascript">
                        {codeStr || "// No code available"}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={styles.previewArea}
                style={{ position: "relative" }}
              >
                {bundleCode ? (
                  <SandpackProvider
                    key={`${item.id}-${themeMode}`}
                    template="react"
                    files={sandpackFiles}
                    customSetup={{ dependencies: finalDependencies }}
                    theme={sandpackTheme}
                    options={{
                      autoRun: true,
                      externalResources: ["https://cdn.tailwindcss.com"],
                    }}
                  >
                    <SandpackLayout
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        border: "none",
                        background: "transparent",
                      }}
                    >
                      <SandpackPreview
                        showNavigator={false}
                        showRefreshButton={false}
                        showOpenInCodeSandbox={false}
                        style={{
                          flex: 1,
                          minHeight: 0,
                          border: "none",
                          background: "transparent",
                        }}
                      />
                    </SandpackLayout>
                  </SandpackProvider>
                ) : (
                  <div className={styles.loadingContainer}>
                    <span
                      style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}
                    >
                      No preview available
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ─── Footer ─── */}
            <div className={styles.popupFooter}>
              <div className={styles.popupInfo}>
                <h3>{displayName}</h3>
                <span>by @{authorName}</span>
                {comp.rating_avg > 0 && (
                  <span>❤️ {Number(comp.rating_avg).toFixed(1)}</span>
                )}
              </div>
              <div className={styles.popupActions}>
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  animate={isSelected ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 1000, damping: 10 }}
                  className={styles.actionBtnSecondary}
                  onClick={() => onToggleSelect && onToggleSelect(item.id, item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                    borderColor: isSelected ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.1)"
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {isSelected ? (
                      <>
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </>
                    ) : (
                      <>
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                      </>
                    )}
                  </svg>
                  <span>{isSelected ? "Selected" : "Select"}</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  animate={isLiked ? { scale: [1, 1.5, 1], transition: { duration: 0.15 } } : { scale: 1 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 1000, 
                    damping: 10,
                  }}
                  className={styles.actionBtnSecondary}
                  onClick={handleLike}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "6px",
                    color: isLiked ? "#ff4b4b" : "rgba(255, 255, 255, 0.6)",
                    borderColor: isLiked ? "rgba(255, 75, 75, 0.3)" : "rgba(255, 255, 255, 0.1)"
                  }}
                >
                  <motion.svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="16"
                    viewBox="0 -960 960 960"
                    width="16"
                    fill={isLiked ? "#ff4b4b" : "currentColor"}
                    animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.15 }}
                  >
                    <path d={isLiked 
                      ? "m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z"
                      : "m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"
                    } />
                  </motion.svg>
                  <span>{isLiked ? "Saved" : "Save"}</span>
                </motion.button>
                <button
                  className={styles.actionBtnSecondary}
                  onClick={() => setShowCode((prev) => !prev)}
                >
                  {showCode ? "Preview" : "{ } View Code"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
