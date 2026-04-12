// AI_STABILITY_FIX_V3: Deterministic Flat Path Imports
// V4.0: Dual-mode renderer (SPA vertical stack + MPA HashRouter shell)

/**
 * Renders App.jsx deterministically based on a list of components.
 * Supports two modes:
 *   - SPA (default): Vertical component stack (Header -> Hero -> Sections -> Footer)
 *   - MPA (isMultiPage=true): HashRouter shell with Routes and shared layout
 *
 * @param {object} params
 * @param {Array<{exportName: string, path: string, role?: string, refId?: string}>} params.components
 * @param {boolean} [params.isMultiPage=false] - Whether to render as MPA
 * @param {Array<{path: string, label: string, component: string, navVisible: boolean}>} [params.pages=[]]
 * @param {Array<{exportName: string, path: string, role?: string, refId?: string}>} [params.sharedComponents=[]]
 * @param {string} [params.prompt=''] - Original user prompt (used for fallback hero content)
 * @returns {string} - The complete App.jsx code.
 */
export function renderAppTemplate({ components, isMultiPage = false, pages = [], sharedComponents = [], prompt = '' }) {
    if (!components || !Array.isArray(components)) {
        throw new Error('Invalid components list');
    }

    if (!isMultiPage) {
        return renderSPATemplate(components, prompt);
    }
    return renderMPATemplate(components, pages, sharedComponents, prompt);
}

function inferComponentRole(component) {
    const name = (component?.exportName || '').toLowerCase();
    const path = (component?.path || '').toLowerCase();
    const explicitRole = (component?.role || '').toLowerCase();
    const text = `${explicitRole} ${name} ${path}`;

    if (explicitRole === 'header' || explicitRole === 'hero' || explicitRole === 'footer') return explicitRole;

    if (/(^|\b)(header|navbar|navigation|topbar|menu)(\b|$)/.test(text)) return 'header';

    // Hero: masthead/banner OR substring "hero"/"splash" (HeroSplashCursor, VideoHeroBackground break \bhero\b)
    if (
        /(^|\b)(masthead|landing|banner)(\b|$)/.test(text) ||
        name.includes('hero') ||
        name.includes('splash') ||
        /herosplash|videohero/i.test(name)
    ) {
        return 'hero';
    }

    // Footer: whole-word OR FooterRetroGrid-style compounds
    if (name.includes('footer') || /(^|\b)(copyright|site-footer)(\b|$)/.test(text)) return 'footer';

    return 'feature';
}

function isBackgroundLikeComponent(component) {
    const name = (component?.exportName || '').toLowerCase();
    const path = (component?.path || '').toLowerCase();
    const role = (component?.role || '').toLowerCase();
    const text = `${name} ${path} ${role}`;
    return /(^|\b)(background|shader|veil|backdrop|canvas|parallax|ambient|overlay)(\b|$)/.test(text);
}

function renderComponentSequenceWithOverlay(components = [], baseIndent = '      ', prompt = '') {
    const lines = [];

    for (let i = 0; i < components.length; i++) {
        const current = components[i];
        const currentRole = inferComponentRole(current);
        const currentIsBackground = isBackgroundLikeComponent(current);

        if (!currentIsBackground || currentRole === 'header' || currentRole === 'footer') {
            lines.push(`${baseIndent}<${current.exportName} />`);
            continue;
        }

        const next = components[i + 1];
        const nextIsUsable = next
            && inferComponentRole(next) !== 'header'
            && inferComponentRole(next) !== 'footer'
            && !isBackgroundLikeComponent(next);

        if (nextIsUsable) {
            lines.push(`${baseIndent}<section className="relative min-h-screen overflow-hidden">`);
            lines.push(`${baseIndent}  <div className="absolute inset-0">`);
            lines.push(`${baseIndent}    <${current.exportName} />`);
            lines.push(`${baseIndent}  </div>`);
            lines.push(`${baseIndent}  <div className="relative z-10">`);
            lines.push(`${baseIndent}    <${next.exportName} />`);
            lines.push(`${baseIndent}  </div>`);
            lines.push(`${baseIndent}</section>`);
            i += 1;
            continue;
        }

        lines.push(`${baseIndent}<section className="relative min-h-screen overflow-hidden">`);
        lines.push(`${baseIndent}  <div className="absolute inset-0">`);
        lines.push(`${baseIndent}    <${current.exportName} />`);
        lines.push(`${baseIndent}  </div>`);
        lines.push(`${baseIndent}  <div className="relative z-10 flex items-center justify-center min-h-screen px-4">`);
        lines.push(`${baseIndent}    <div className="text-center max-w-3xl mx-auto">`);
        lines.push(`${baseIndent}      <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6 drop-shadow-lg">Welcome</h1>`);
        lines.push(`${baseIndent}      <p className="text-lg sm:text-xl text-white/80 mb-8 drop-shadow-md max-w-xl mx-auto">Explore what we have to offer</p>`);
        lines.push(`${baseIndent}      <a href="#content" className="inline-block px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-colors shadow-lg">Get Started</a>`);
        lines.push(`${baseIndent}    </div>`);
        lines.push(`${baseIndent}  </div>`);
        lines.push(`${baseIndent}</section>`);
    }
    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════
// SPA MODE — Existing behavior, unchanged
// ═══════════════════════════════════════════════════════════

function renderSPATemplate(components, prompt = '') {
    // de-duplicate by exportName
    const uniqueComponents = [];
    const names = new Set();

    for (const c of components) {
        if (!names.has(c.exportName)) {
            names.add(c.exportName);
            uniqueComponents.push(c);
        }
    }

    // AI_STABILITY_FIX: deterministic structure ordering
    uniqueComponents.sort((a, b) => {
        const order = { header: 0, hero: 1, feature: 2, footer: 3 };
        return (order[inferComponentRole(a)] ?? 2) - (order[inferComponentRole(b)] ?? 2);
    });

    const imports = uniqueComponents.map(c => {
        let importPath = c.path;
        if (importPath.startsWith('src/')) {
            importPath = './' + importPath.substring(4);
        } else if (!importPath.startsWith('.')) {
            importPath = './' + importPath;
        }
        if (importPath.endsWith('.js') || importPath.endsWith('.tsx')) {
            importPath = importPath.replace(/\.(js|tsx)$/, '.jsx');
        } else if (!importPath.endsWith('.jsx')) {
            importPath += '.jsx';
        }
        return `import ${c.exportName} from '${importPath}'`;
    }).join('\n');

    const renderedNodes = renderComponentSequenceWithOverlay(uniqueComponents, '      ', prompt);

    return `import React from 'react'
import './index.css'
${imports}

export default function App() {
  return (
    <div className="min-h-screen">
${renderedNodes}
    </div>
  )
}
`;
}

// ═══════════════════════════════════════════════════════════
// MPA MODE — HashRouter shell with Routes and shared layout
// ═══════════════════════════════════════════════════════════

function renderMPATemplate(components, pages, sharedComponents, prompt = '') {
    const dedupeByExportName = (list) => {
        const seen = new Set();
        return (list || []).filter((item) => {
            const key = item?.exportName;
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    // 1. Identify shared components (Header, Footer)
    const sharedRefIds = new Set(sharedComponents.map(c => c.refId || c.exportName));
    const shared = components.filter(c => sharedRefIds.has(c.refId) || sharedRefIds.has(c.exportName));

    // 2. Identify all components (de-duplicated) for imports
    const uniqueMap = new Map();
    components.forEach(c => uniqueMap.set(c.exportName, c));
    const uniqueComponents = Array.from(uniqueMap.values());

    const allImports = uniqueComponents.map(c => {
        let importPath = c.path;
        if (importPath.startsWith('src/')) importPath = './' + importPath.substring(4);
        else if (!importPath.startsWith('.')) importPath = './' + importPath;
        if (!importPath.endsWith('.jsx')) importPath += '.jsx';
        return `import ${c.exportName} from '${importPath}'`;
    }).join('\n');

    // 3. Build route elements by aggregating the page's components
    const normalizedPages = (pages || []).map((p, index) => {
        const rawPath = (p.pagePath || p.path || '/').trim();
        let routePath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
        if (routePath === '/home' || routePath === '/index') routePath = '/';
        if (index === 0 && !routePath) routePath = '/';
        return { ...p, routePath };
    });

    // Safety: always ensure at least one root route exists
    if (!normalizedPages.some(p => p.routePath === '/') && normalizedPages.length > 0) {
        normalizedPages[0] = { ...normalizedPages[0], routePath: '/' };
    }

    // Components explicitly assigned to any page OR shared layout (not orphan)
    const assignedNames = new Set();
    for (const p of normalizedPages) {
        for (const refId of (p.componentRefIds || [])) {
            const c = components.find(x => x.refId === refId || x.exportName === refId);
            if (c) assignedNames.add(c.exportName);
        }
    }
    for (const c of shared) {
        assignedNames.add(c.exportName);
    }
    // Anything in the plan but never mounted in a Route or shell — merge into "/" so imports are not dead
    const orphanSections = uniqueComponents.filter(c => !assignedNames.has(c.exportName));

    /** Sort by role (header → hero → body → footer). Within the same role, keep planner order. */
    const sortByRole = (comps) => {
        const order = { header: 0, hero: 1, feature: 2, footer: 3 };
        const origIndex = new Map(comps.map((c, i) => [c.exportName, i]));
        return [...comps].sort((a, b) => {
            const ra = order[inferComponentRole(a)] ?? 2;
            const rb = order[inferComponentRole(b)] ?? 2;
            if (ra !== rb) return ra - rb;
            return (origIndex.get(a.exportName) ?? 0) - (origIndex.get(b.exportName) ?? 0);
        });
    };

    const routes = normalizedPages.map(p => {
        // Find components mapped to this page
        let pageComps = (p.componentRefIds || []).map(refId =>
            components.find(c => c.refId === refId || c.exportName === refId)
        ).filter(Boolean);
        pageComps = dedupeByExportName(pageComps);

        // Fallback: If no components matched via refId (maybe legacy string match), just dump everything non-shared into the first page
        if (pageComps.length === 0 && p.routePath === '/') {
            pageComps = dedupeByExportName(
                components.filter(c => !sharedRefIds.has(c.refId) && !sharedRefIds.has(c.exportName))
            );
        }

        // Home route must show the full landing stack: attach any sections the planner forgot to assign
        if (p.routePath === '/' && orphanSections.length > 0) {
            const seen = new Set(pageComps.map(c => c.exportName));
            for (const o of orphanSections) {
                if (!seen.has(o.exportName)) {
                    pageComps.push(o);
                    seen.add(o.exportName);
                }
            }
            pageComps = dedupeByExportName(pageComps);
            pageComps = sortByRole(pageComps);
        }

        const inlineElements = renderComponentSequenceWithOverlay(pageComps, '            ', prompt);
        return `          <Route path="${p.routePath}" element={<main>\n${inlineElements}\n          </main>} />`;
    }).join('\n');

    // 4. Determine shared layout
    const headerComp = shared.find(c =>
        c.role === 'header' || c.exportName.toLowerCase().includes('header') || c.exportName.toLowerCase().includes('navbar')
    );
    const footerComp = shared.find(c =>
        c.role === 'footer' || c.exportName.toLowerCase().includes('footer')
    );

    return `import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
${allImports}

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen">
${headerComp ? `        <${headerComp.exportName} />` : ''}
        <Routes>
${routes}
        </Routes>
${footerComp ? `        <${footerComp.exportName} />` : ''}
      </div>
    </HashRouter>
  )
}
`;
}
