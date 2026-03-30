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
 * @returns {string} - The complete App.jsx code.
 */
export function renderAppTemplate({ components, isMultiPage = false, pages = [], sharedComponents = [] }) {
    if (!components || !Array.isArray(components)) {
        throw new Error('Invalid components list');
    }

    if (!isMultiPage) {
        return renderSPATemplate(components);
    }
    return renderMPATemplate(components, pages, sharedComponents);
}

// ═══════════════════════════════════════════════════════════
// SPA MODE — Existing behavior, unchanged
// ═══════════════════════════════════════════════════════════

function renderSPATemplate(components) {
    // de-duplicate by exportName
    const uniqueComponents = [];
    const names = new Set();

    for (const c of components) {
        if (!names.has(c.exportName)) {
            names.add(c.exportName);
            uniqueComponents.push(c);
        }
    }

    // AI_STABILITY_FIX: Ensure Footers are always at the bottom
    uniqueComponents.sort((a, b) => {
        const aIsFooter = a.exportName.toLowerCase().includes('footer');
        const bIsFooter = b.exportName.toLowerCase().includes('footer');
        if (aIsFooter && !bIsFooter) return 1;
        if (!aIsFooter && bIsFooter) return -1;
        return 0;
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

    const renderedNodes = uniqueComponents.map(c => `      <${c.exportName} />`).join('\n');

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

function renderMPATemplate(components, pages, sharedComponents) {
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
    const routes = pages.map(p => {
        // Find components mapped to this page
        let pageComps = (p.componentRefIds || []).map(refId => 
            components.find(c => c.refId === refId || c.exportName === refId)
        ).filter(Boolean);
        
        const routePath = p.pagePath || p.path || '/'; // Use pagePath from schema, fallback to '/'
        
        // Fallback: If no components matched via refId (maybe legacy string match), just dump everything non-shared into the first page
        if (pageComps.length === 0 && routePath === '/') {
            pageComps = components.filter(c => !sharedRefIds.has(c.refId) && !sharedRefIds.has(c.exportName));
        }

        const inlineElements = pageComps.map(c => `            <${c.exportName} />`).join('\n');
        return `          <Route path="${routePath}" element={<main>\n${inlineElements}\n          </main>} />`;
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
