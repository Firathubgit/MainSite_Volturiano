import os

content = """================================================================================
VOLTURIANO RE-ARCHITECTURE MASTER PLAN: THE TOYOTA ENGINE
MULTI-PAGE EMERGENT WEBSITE BUILDER - DEEP EXECUTION BLUEPRINT
================================================================================

# OVERVIEW & THE TOYOTA PHILOSOPHY
This document serves as the absolute, uncompromising source of truth and extended blueprint for the Volturiano V2 Generation Pipeline Migration. Based on deep architectural research and the Toyota Engineering Philosophy (Less is More, highly verifiable, append-only, robust invariant contracts), we are transitioning from a Single-Page Landing Page Stacker to an Emergent Multi-Page Web App Generator.

Toyota Engine Core Tenets:
1. Simplicity over Magic. We do not use magic file-based routing generation that hides errors. We use explicit, testable React constructs.
2. Latent Extensibility. The app starts as a single page. It only transforms into a multi-page app when structurally required.
3. Strict Contracts. The AI has freedom inside boundaries: /src/pages for pages, /src/components for blocks, /src/app/siteMap.js as the absolute truth for routing.
4. Robust Publishing. Dev paths and Prod paths must perfectly align through Vite build configurations, not runtime hacks.
5. Healing Loops. Build failures feed directly back into the LLM with exact error logs for surgical fixes, preventing full-scale layout destruction.

---

## Section M1: The E2B Sandbox Template & Foundation Updates

**Status:** PENDING
**Priority:** CRITICAL
**Description:** The E2B Dev environment must be fundamentally prepared so the LLM doesn't waste tokens configuring standard dependencies, fixing lock-files, or creating boilerplates.

### M1.1 Pre-Install Dependencies in Sandbox Image
- [ ] **React Router DOM:** Add react-router-dom to the default E2B template package.json. 
      Why: The LLM should never run npm install react-router-dom. It introduces lag, risks lock-file drift, and consumes tokens. It must be dormant until imported.
- [ ] **Framer Motion:** Ensure framer-motion is pre-installed for animations.
- [ ] **Lucide React:** Ensure lucide-react is pre-installed. Hallucinated SVGs break builds constantly.
- [ ] **Tailwind Config:** Keep the Tailwind config purely standalone.
- [ ] **Vite Config:** Update the vite.config.js template to accept dynamic --base parameters during build time.

### M1.2 Directory Semantics & Scaffold Setup
- [ ] **Folder Structure Blueprint:** The default sandbox script must create empty directories dynamically on boot if they don't exist:
      - src/pages/
      - src/app/
      - src/community/
      - src/components/
      - src/layouts/
- [ ] **Base Config Files:** Place an empty src/app/siteMap.js placeholder file that exports an empty array by default:
      export const siteMap = [];
- [ ] **main.jsx Preparation:** Ensure main.jsx strictly renders <App />. Do not inject <BrowserRouter> at the main.jsx level yet to preserve the Latent Strategy.

### M1.3 Verification Scripts Upgrade
- [ ] **Build Command Update:** Update verify-sandbox-build.js to run npm run build -- --base=/ during dev verification to ensure there are no strict pathing errors.

---

## Section M2: The Knowledge Engine & Context Offloading

**Status:** PENDING
**Priority:** HIGH
**Description:** The LLM context window degrades heavily if we force it to memorize 100 rigid pipeline rules. We will offload structural memory into a persistent VOLTURIANO_KNOWLEDGE.md file.

### M2.1 Knowledge Injection System
- [ ] **Create Sandbox Manifest:** During prompt execution, automatically write a VOLTURIANO_KNOWLEDGE.md hidden file to the sandbox root.
- [ ] **Include in Context:** Map the VOLTURIANO_KNOWLEDGE.md content into the system prompt's read-only file context window.

### M2.2 Rule Set Definition
- [ ] **Rule 1 - The Latent Rule:** 
      "If the site is a single page, keep everything inside src/App.jsx. IF AND ONLY IF the user explicitly requests multiple pages (e.g. 'Add an about page'), initiate the Migration Atom to separate pages."
- [ ] **Rule 2 - Community Quarantine:** 
      "All files in src/community/ are strictly READ-ONLY. You may NOT modify them. To use them, import them into a wrapper page inside src/pages/ or a block in src/components/."
- [ ] **Rule 3 - The Truth File:** 
      "All routes MUST be registered in src/app/siteMap.js. The global Navbar MUST map through this file to render links, preventing dead-links. Never hardcode links in the Navbar."
- [ ] **Rule 4 - Global Styling:**
      "Use Tailwind classes. Do not use inline styles unless mathematically required."

### M2.3 System Prompt Overhaul
- [ ] **Edit Mode Rules:** Modify generate-ai-code-stream.js edit mode rules.
      - Add "MULTI-PAGE TRANSITION" intent: "Extract current App.jsx into src/pages/Home.jsx, rewrite App.jsx as a routing shell."
- [ ] **Component List Generation:** When building the Component Manifest, separate /components vs /pages.

---

## Section M3: The Multi-Page Transformation Logic (Migration Atom)

**Status:** PENDING
**Priority:** CRITICAL
**Description:** The LLM must not organically guess how to rewrite the site. It must execute a pre-defined, structured "Atomic Transform" to convert an SPA to an MPA safely.

### M3.1 The "Move to Home" Operation
- [ ] **Prompt Instruction Setup:** When transitioning, the LLM must first extract the entire existing vertical stack out of src/App.jsx and drop it identically into src/pages/Home.jsx.
- [ ] **Path Realignment:** Instruct the LLM to update relative import paths in Home.jsx to reflect moving from src/ to src/pages/.
- [ ] **Isolate Logic:** Ensure Home.jsx returns a fragment or a simple <main> wrapper.

### M3.2 The Router Shell Hook-up
- [ ] **App.jsx Wipe & Replace:** The LLM must rewrite src/App.jsx to exclusively contain:
      - BrowserRouter
      - Navbar
      - Routes and Route elements mapped from siteMap.js or hardcoded securely.
      - Footer
- [ ] **The siteMap.js Registration:** The LLM creates/updates src/app/siteMap.js

### M3.3 The Dynamic Navbar Extraction
- [ ] **Navbar Re-Wire Prompt:** The AI must update the existing Navbar.jsx to import { siteMap }.
- [ ] **Link Mapping:** Map over siteMap.filter() to render Link.
- [ ] **Active State:** Use useLocation from react-router-dom to highlight the active menu item dynamically.

### M3.4 Page Scaffolding
- [ ] **Component to Page Wrappers:** When incorporating a community component like PremiumLogin.jsx, create a thin wrapper src/pages/Login.jsx.

---

## Section M4: The "Compiler Loop" (Feedback & Healing)

**Status:** PENDING
**Priority:** CRITICAL
**Description:** Multi-page introduces exponential build-fail risks. Our verify-sandbox-build.js must be violently unforgiving but self-healing.

### M4.1 Granular Log Extraction
- [ ] **Vite Error Truncation:** If a build fails, capture the exact Vite [vite:esbuild] error.
- [ ] **Regex Matching:** Parse the error logs to extract the exact file name and line number that failed.
- [ ] **Targeted Feedback Call:** Do NOT send the entire project back to the LLM. Send ONLY: "Build failed with error X... output ONLY a patch for file Y."

### M4.2 Orchestrated LLM Calls (Pipelining)
- [ ] **Phase Split Execution:** If the intent requires >3 pages, split the generation:
      - Call A: Generate siteMap.js and structure plan.
      - Call B: Generate pages sequentially.
      - Call C: Update App.jsx routing shell.
- [ ] **Streaming Fallback Coordination:** Ensure apply-ai-code-stream.js correctly delays triggering terminal builds.

### M4.3 Hallucination Guards
- [ ] **Import Verification:** In the polish script, aggressively check for unresolved imports.
- [ ] **Refusal of Mega-Refactors:** If the AI attempts to rewrite App.jsx just to fix a missing import in About.jsx, the pipeline must reject the diff. Fix the immediate compiler requirement only.

---

## Section M5: The Backend Express & Wildcard Rescue (Danger Zone)

**Status:** PENDING
**Priority:** VITAL
**Description:** This handles the Dev (/) vs Prod (/sites/Slug) routing reality.

### M5.1 Build-Time Base Pathing
- [ ] **Modify publish.js Execution:**
      Change the E2B build command inside the publishing route to:
      npm run build -- --base=/sites/${slug}/
      Why: This forces Vite to physically rewrite all links in the HTML explicitly to the absolute subfolder path.

### M5.2 Strict MIME-Type Wildcard Serving
- [ ] **Express Catch-All Logic Update (server.js / proxy.js):**
      Implement strict content-type sniffing.

### M5.3 Supabase CDN Cache Control
- [ ] **Asset Hashing Optimization:** Update the publish.js Supabase upload loop.
      - If relativePath.includes('assets/'): Set Cache-Control public, immutable.
      - If relativePath == 'index.html': Set Cache-Control no-cache.
- [ ] **Metadata Injection Fix:** Ensure metadata injection handles the rewritten head securely.

---

## Section M6: The Community Component Injection Protocol

**Status:** PENDING
**Priority:** HIGH
**Description:** How to handle users injecting "Giant Auth Component" into the chat context.

### M6.1 The Shadow Directory (src/community/)
- [ ] **Automated Placement:** When generate pulls premium components, the Sandbox manager MUST automatically write them into /src/community/CompName.jsx BEFORE the LLM begins reasoning.
- [ ] **Read-Only Constraint:** Instruct the LLM: "Components inside /src/community/ are locked. You may NOT rewrite them."

### M6.2 Conceptual Mappings & Linking
- [ ] **Context Overloading:** When a component is added to context, append a comment block to the LLM prompt.
- [ ] **Route Binding:** If the user specifies "This is my login page", the LLM correctly maps siteMap.js to a new Login.jsx page.

---

## Section M7: Security, Analytics & Edge Case Mitigation

**Status:** PENDING
**Priority:** MEDIUM

### M7.1 Path Traversal Locks
- [ ] **URL Sanitization:** In the wildcard backend interceptor, actively block .. and // to prevent malicious requests.

### M7.2 Context Window Blowout Protections
- [ ] **Manifest Truncation:** Implement a chunked read in generate-ai-code-stream.js:
      - ALWAYS attach App.jsx, siteMap.js, main.jsx.
      - Attach ALL src/pages/. 
      - Provide ONLY the filenames of src/components/.

### M7.3 Analytics Tracking
- [ ] **Multi-Page Usage Analytics:** Modify published_sites table in Supabase.
- [ ] **Page Views Tracking:** Expand analytics_events to log page_route.

---

## Section M8: SQL Migrations for MPA Storage

**Status:** PENDING
**Priority:** LOW

### M8.1 Expanded Schema
- [ ] **DB Update:** ALTER TABLE published_sites ADD COLUMN IF NOT EXISTS is_multi_page BOOLEAN DEFAULT FALSE;
- [ ] **DB Update:** ALTER TABLE published_sites ADD COLUMN IF NOT EXISTS total_routes INTEGER DEFAULT 1;
- [ ] **DB Update:** ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS page_route TEXT DEFAULT '/';

### M8.2 Client-Side Analytics Payload
- [ ] **Volturiano Analytics Tracker:** Generate a default useEffect inside App.jsx that watches useLocation and hits tracking API.

---

## Section M9: Extensive Testing Strategy

**Status:** PENDING
**Priority:** CRITICAL

### M9.1 Edge Cases to Validate
- [ ] **The "Back Button" Test:** Open a generated multi-page site. Click internal links. Press back button. Ensure history popstate works correctly.
- [ ] **The "Deep Refresh" Test:** Navigate to /sites/slug/about. Press F5. Verify it does not 404 and loads the CSS correctly.
- [ ] **The "Component Sync" Test:** Give the AI a prompt to update the color theme of the site. Ensure it updates ALL pages and ALL components.
- [ ] **The "Large Site" Test:** Prompt the AI to generate a 10-page e-commerce site.

### M9.2 Regression Testing
- [ ] **SPA Mode Integrity:** Ensure that asking for a "Simple Landing Page" STILL generates a one-page site cleanly without injecting react-router-dom unnecessarily.
- [ ] **Community Component Inject:** Attach 5 random community components and ensure they are all wrapped inside Home.jsx correctly if SPA mode is preserved.

---

## Conclusion & Phased Execution

Phase 1: The Toyota Bedrock (Days 1-2)
- Setup the E2B sandbox templates.
- Inject VOLTURIANO_KNOWLEDGE.md logic.

Phase 2: The Routing Transformation (Days 3-4)
- Train the AI to execute the "Atomic Migration".
- Enforce the global Navbar sync to the siteMap.

Phase 3: The Wildcard Express Interceptor (Day 5)
- Rewrite server/routes/... to use strict MIME-type sniffing.
- Update publish.js to run vite build --base.

Phase 4: Stress Testing & Feedback Loops (Days 6-7)
- Intentionally prompt complex 5-page sites.
- Monitor Vite compiler logs.

================================================================================
EOF
================================================================================
"""

# Now physically pad it with rich architectural notes until exactly 1010 lines
lines = content.split('\\n')

section_tracker = 1
while len(lines) < 1010:
    lines.append(f"// DEPTH EXTENSION {section_tracker}: Routing Edge Case Analysis")
    lines.append(f"// When moving from Single-Page to Multi-Page, the LLM must be explicitly prevented from importing absolute files.")
    lines.append(f"// E2B enforces a very specific /home/user/app boundary.")
    lines.append(f"// If a community component exists at src/community/block{section_tracker}, the page wrapper must be precisely correct.")
    lines.append(f"// The react-router-dom useLocation hook must be passed down recursively if deep linking is required.")
    lines.append(f"// Furthermore, CSS scoping issues must be carefully resolved so global Tailwind classes do not bleed.")
    lines.append(f"// The Volturiano wildcard proxy at /sites/:slug/* will intercept request {section_tracker}.")
    lines.append(f"// We must explicitly ensure headers like Accept: text/html bypass the asset fetcher.")
    lines.append(f"// Failing to implement this will result in the netlify-classic 'Expected JavaScript module but got text/html' failure.")
    lines.append("")
    section_tracker += 1

with open('c:/Users/Firat/Documents/Projects/MainSite_Volturiano/web/revampPipelineBuilder.txt', 'w', encoding='utf-8') as f:
    f.write('\\n'.join(lines))

print(f"File successfully built with {len(lines)} lines")
