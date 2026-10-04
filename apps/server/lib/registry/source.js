/**
 * File-based component registry.
 *
 * The registry is a folder (default: packages/registry at the repo root,
 * override with REGISTRY_DIR):
 *
 *   components/<name>/component.json   metadata the agent searches on, plus a
 *                                      list of source files next to it
 *   components/<name>/*.jsx            the source the agent installs
 *   components/<id>.json               alternative: one self-contained file
 *                                      with the source inlined under `bundle`
 *   templates/<id>.json                an ordered list of component ids
 *
 * Files are read once and cached. An empty or missing folder is valid: the
 * agent then writes every section itself.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function getRegistryDir() {
    return process.env.REGISTRY_DIR
        ? path.resolve(process.env.REGISTRY_DIR)
        : path.resolve(serverRoot, '../../packages/registry');
}

let cache = null;

function readJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        console.warn(`[registry] Skipping ${path.basename(file)}: ${error.message}`);
        return null;
    }
}

function listDir(dir) {
    try {
        return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    } catch {
        return [];
    }
}

/** A component folder: component.json lists files that sit beside it. */
function readComponentFolder(dir) {
    const component = readJson(path.join(dir, 'component.json'));
    if (!component) return null;

    const files = [];
    for (const entry of component.files || []) {
        const sourcePath = path.resolve(dir, entry.source || path.basename(entry.path || ''));
        if (!sourcePath.startsWith(dir + path.sep)) continue;
        try {
            files.push({ path: entry.path, content: fs.readFileSync(sourcePath, 'utf8') });
        } catch (error) {
            console.warn(`[registry] ${component.id}: cannot read ${entry.source}: ${error.message}`);
        }
    }

    const { files: _files, ...metadata } = component;
    return { ...metadata, bundle: { files, usage: component.usage, requires: component.requires } };
}

function readComponents(dir) {
    const components = [];
    for (const entry of listDir(dir)) {
        const full = path.join(dir, entry.name);
        const component = entry.isDirectory()
            ? (fs.existsSync(path.join(full, 'component.json')) ? readComponentFolder(full) : null)
            : (entry.name.endsWith('.json') ? readJson(full) : null);
        if (component?.id) components.push(component);
    }
    return components;
}

function readTemplates(dir) {
    return listDir(dir)
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => readJson(path.join(dir, entry.name)))
        .filter((template) => template?.templateId);
}

export function loadRegistry() {
    if (cache) return cache;
    const dir = getRegistryDir();
    cache = {
        components: readComponents(path.join(dir, 'components')),
        templates: readTemplates(path.join(dir, 'templates')),
    };
    return cache;
}

/** Forget cached files. Used by tests and after editing the registry folder. */
export function resetRegistryCache() {
    cache = null;
}
