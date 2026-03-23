// AI_STABILITY_FIX_V3: Deterministic Flat Path Imports
/**
 * Renders App.jsx deterministically based on a list of components.
 * @param {object} params
 * @param {Array<{exportName: string, path: string}>} params.components - List of components to import and render.
 * @returns {string} - The complete App.jsx code.
 */
export function renderAppTemplate({ components }) {
    if (!components || !Array.isArray(components)) {
        throw new Error('Invalid components list');
    }

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
        // Determine import path relative to src/App.jsx
        // Standard components are in src/components/, so import is ./components/Name.jsx
        // Premium might be different, but Generation.jsx passes the 'path'.
        // If path is "src/components/Foo.jsx", import should be "./components/Foo.jsx"

        let importPath = c.path;
        if (importPath.startsWith('src/')) {
            importPath = './' + importPath.substring(4); // Remove src/
        } else if (!importPath.startsWith('.')) {
            importPath = './' + importPath;
        }

        // Force .jsx extension for React imports
        if (importPath.endsWith('.js') || importPath.endsWith('.tsx')) {
            importPath = importPath.replace(/\.(js|tsx)$/, '.jsx');
        } else if (!importPath.endsWith('.jsx')) {
            // If No extension, add it
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
