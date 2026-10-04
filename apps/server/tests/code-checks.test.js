import { describe, expect, it } from 'vitest';
import { validateImports } from '../lib/import-graph.js';
import { fixInvalidIdentifierName, validateAndFixIdentifiers } from '../lib/validate-identifiers.js';
import { parseFileBlocks, toFileBlocks } from '../lib/file-blocks.js';

describe('import validation', () => {
  const hero = { path: 'src/components/Hero.jsx', content: 'export default function Hero() { return null }' };

  it('accepts imports that resolve to generated files', () => {
    const app = {
      path: 'src/App.jsx',
      content: "import Hero from './components/Hero'\nimport './index.css'\nexport default function App() { return <Hero /> }",
    };
    expect(validateImports([app, hero])).toEqual([]);
  });

  it('flags an import of a file that was never generated', () => {
    const app = {
      path: 'src/App.jsx',
      content: "import Hero from './components/Hero'\nimport Ghost from './components/Ghost'\nexport default function App() { return <><Hero /><Ghost /></> }",
    };

    const issues = validateImports([app, hero]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: 'E-IMP-01', from: 'src/App.jsx', to: './components/Ghost' });
  });

  it('ignores package imports and accepts registry components', () => {
    const app = {
      path: 'src/App.jsx',
      content: "import { motion } from 'framer-motion'\nimport Aurora from './components/Aurora'",
    };
    expect(validateImports([app], [{ name: 'Aurora', path: 'src/components/Aurora.jsx' }])).toEqual([]);
  });

  it('resolves index files', () => {
    const files = [
      { path: 'src/App.jsx', content: "import Nav from './nav'" },
      { path: 'src/nav/index.jsx', content: 'export default function Nav() { return null }' },
    ];
    expect(validateImports(files)).toEqual([]);
  });
});

describe('identifier repair', () => {
  it('moves a leading digit to the end of a component name', () => {
    expect(fixInvalidIdentifierName('3dProductRotation')).toBe('ProductRotation3d');
    expect(fixInvalidIdentifierName('Hero')).toBe('Hero');
  });

  it('renames an invalid component everywhere it is used', () => {
    const files = [
      { path: 'src/components/3dShowcase.jsx', content: 'export default function 3dShowcase() { return null }' },
      { path: 'src/App.jsx', content: "import 3dShowcase from './components/3dShowcase'\nexport default function App() { return <3dShowcase /> }" },
      { path: 'src/index.css', content: '.3dShowcase { color: red }' },
    ];

    const fixes = validateAndFixIdentifiers(files);

    expect(fixes).toContainEqual({ file: 'src/App.jsx', from: '3dShowcase', to: 'Showcase3d' });
    expect(files[0].content).toBe('export default function Showcase3d() { return null }');
    expect(files[1].content).toContain('<Showcase3d />');
    // Only JavaScript files are rewritten.
    expect(files[2].content).toBe('.3dShowcase { color: red }');
  });

  it('leaves valid code untouched', () => {
    const files = [{ path: 'src/components/Hero.jsx', content: 'export default function Hero() { return null }' }];
    expect(validateAndFixIdentifiers(files)).toEqual([]);
    expect(files[0].content).toBe('export default function Hero() { return null }');
  });
});

describe('file blocks', () => {
  it('parses <file> blocks and strips code fences and leading slashes', () => {
    const text = [
      '<file path="/src/App.jsx">',
      '```jsx',
      'export default function App() { return null }',
      '```',
      '</file>',
      'Some commentary between blocks.',
      '<file path="src/index.css">body { margin: 0 }</file>',
    ].join('\n');

    expect(parseFileBlocks(text)).toEqual([
      { path: 'src/App.jsx', content: 'export default function App() { return null }' },
      { path: 'src/index.css', content: 'body { margin: 0 }' },
    ]);
    expect(parseFileBlocks('')).toEqual([]);
  });

  it('normalizes a file list and drops entries without content', () => {
    const files = toFileBlocks([
      { path: '/src/App.jsx', content: 'x' },
      { path: 'src/empty.js', content: null },
    ]);
    expect(files).toEqual([{ path: 'src/App.jsx', content: 'x' }]);
  });
});
