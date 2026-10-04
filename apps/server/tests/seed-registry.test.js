/**
 * Checks the registry that ships in packages/registry: every component is
 * complete, licensed, and its source parses as JSX.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';
import { beforeAll, describe, expect, it } from 'vitest';

const registryDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../packages/registry');

let registry;
let source;

beforeAll(async () => {
  process.env.REGISTRY_DIR = registryDir;
  source = await import('../lib/registry/source.js');
  registry = await import('../lib/registry/registry.js');
  source.resetRegistryCache();
});

describe('shipped registry', () => {
  it('has components with unique ids, a license and a source note', () => {
    const { components } = source.loadRegistry();
    expect(components.length).toBeGreaterThan(0);

    const ids = components.map((component) => component.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const component of components) {
      expect(component.name, component.id).toBeTruthy();
      expect(component.category, component.id).toBeTruthy();
      expect(component.description, component.id).toBeTruthy();
      expect(component.license, component.id).toMatch(/^(MIT|Apache-2\.0|BSD-[23]-Clause|ISC)$/);
      expect(component.source, component.id).toBeTruthy();
      expect(component.bundle.files.length, component.id).toBeGreaterThan(0);
    }
  });

  it('ships source that parses and exports a default component', async () => {
    const { components } = source.loadRegistry();
    for (const component of components) {
      for (const file of component.bundle.files) {
        expect(file.path.startsWith('src/'), `${component.id}: ${file.path}`).toBe(true);
        await expect(transform(file.content, { loader: 'jsx' }), `${component.id}: ${file.path}`).resolves.toBeTruthy();
        expect(file.content, `${component.id}: ${file.path}`).toMatch(/export default function \w+/);
      }
    }
  });

  it('only requires packages the sandbox already has or may install', async () => {
    const { isAllowlistedPackage, extractRequiredPackages } = await import('../lib/agent/tool-runtime.js');
    for (const component of source.loadRegistry().components) {
      for (const packageName of extractRequiredPackages(component.bundle.requires)) {
        expect(isAllowlistedPackage(packageName), `${component.id} requires ${packageName}`).toBe(true);
      }
    }
  });

  it('has templates whose components all exist', async () => {
    const templates = await registry.listTemplatesAsync();
    expect(templates.length).toBeGreaterThan(0);

    for (const template of templates) {
      const built = await registry.buildTemplateCodeAsync(template.templateId);
      expect(built.success, template.templateId).toBe(true);
      expect(built.missingComponents, template.templateId).toEqual([]);
      expect(built.code).toContain('<file path="src/App.jsx">');
    }
  });
});
