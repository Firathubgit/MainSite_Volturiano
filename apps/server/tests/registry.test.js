import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let dir;
let registry;
let source;

function writeJson(relativePath, value) {
  const target = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value));
}

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'va-registry-'));
  process.env.REGISTRY_DIR = dir;
  source = await import('../lib/registry/source.js');
  registry = await import('../lib/registry/registry.js');
});

afterAll(() => {
  delete process.env.REGISTRY_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

beforeEach(() => {
  fs.rmSync(path.join(dir, 'components'), { recursive: true, force: true });
  fs.rmSync(path.join(dir, 'templates'), { recursive: true, force: true });
  source.resetRegistryCache();
});

const hero = {
  id: 'hero.split.v1',
  name: 'Split Hero',
  category: 'Hero',
  tags: ['hero', 'landing'],
  keywords: ['headline', 'cta'],
  description: 'Two-column hero with headline and call to action.',
  license: 'MIT',
  bundle: {
    files: [{ path: 'HeroSplit.jsx', content: 'export default function HeroSplit() { return null }' }],
    usage: { importName: 'HeroSplit' },
    requires: { packages: ['lucide-react'] },
  },
};

describe('file registry', () => {
  it('works with an empty registry', async () => {
    expect(registry.hasRegistryComponents()).toBe(false);
    expect((await registry.getCatalogAsync()).components).toEqual([]);
    expect(await registry.listTemplatesAsync()).toEqual([]);
    expect(await registry.getBundleAsync('anything')).toBeNull();
  });

  it('lists component metadata without code', async () => {
    writeJson('components/hero.split.v1.json', hero);

    const catalog = await registry.getCatalogAsync();
    expect(registry.hasRegistryComponents()).toBe(true);
    expect(catalog.categories).toEqual(['Hero']);
    expect(catalog.components[0]).toMatchObject({ id: 'hero.split.v1', name: 'Split Hero', license: 'MIT' });
    expect(JSON.stringify(catalog)).not.toContain('export default function');
  });

  it('ranks matching components for a prompt', async () => {
    writeJson('components/hero.split.v1.json', hero);
    writeJson('components/footer.simple.v1.json', {
      id: 'footer.simple.v1', name: 'Simple Footer', category: 'Footer', tags: ['footer'], keywords: ['links'],
      description: 'Footer with links.', bundle: { files: [{ path: 'Footer.jsx', content: '' }] },
    });

    const result = await registry.getCatalogForPromptAsync('a hero section with a headline', 10);
    expect(result.components[0].id).toBe('hero.split.v1');
  });

  it('returns a bundle with files placed under src/components', async () => {
    writeJson('components/hero.split.v1.json', hero);

    const bundle = await registry.getBundleAsync('hero.split.v1');
    expect(bundle.id).toBe('hero.split.v1');
    expect(bundle.files[0].path).toBe('src/components/HeroSplit.jsx');
    expect(bundle.requires).toEqual({ packages: ['lucide-react'] });
  });

  it('resolves known ids and ignores unknown ones', async () => {
    writeJson('components/hero.split.v1.json', hero);

    const refs = await registry.resolveComponentRefs(['hero.split.v1', 'nope']);
    expect([...refs.keys()]).toEqual(['hero.split.v1']);
    expect(refs.get('hero.split.v1').name).toBe('Split Hero');
  });

  it('builds a template into file blocks with an App that imports each component', async () => {
    writeJson('components/hero.split.v1.json', hero);
    writeJson('templates/starter.json', {
      templateId: 'starter', name: 'Starter', description: 'One hero.', priority: 1,
      components: [{ componentId: 'hero.split.v1' }, { componentId: 'missing.component' }],
    });

    expect(await registry.listTemplatesAsync()).toMatchObject([{ templateId: 'starter', componentCount: 2 }]);

    const built = await registry.buildTemplateCodeAsync('starter');
    expect(built.success).toBe(true);
    expect(built.resolvedComponents).toEqual(['hero.split.v1']);
    expect(built.missingComponents).toEqual(['missing.component']);
    expect(built.code).toContain('<file path="src/components/HeroSplit.jsx">');
    expect(built.code).toContain("import HeroSplit from './components/HeroSplit'");
  });

  it('reports an unknown template instead of throwing', async () => {
    const built = await registry.buildTemplateCodeAsync('does-not-exist');
    expect(built.success).toBe(false);
  });

  it('skips files that are not valid JSON', async () => {
    writeJson('components/hero.split.v1.json', hero);
    fs.writeFileSync(path.join(dir, 'components', 'broken.json'), '{ not json');

    expect((await registry.getCatalogAsync()).components).toHaveLength(1);
  });
});
