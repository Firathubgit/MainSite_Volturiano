/**
 * File-based component registry.
 *
 * The registry is a folder of JSON files (default: packages/registry at the
 * repo root, override with REGISTRY_DIR):
 *
 *   components/<id>.json   one component: metadata the agent searches on,
 *                          plus `bundle.files` it installs into the sandbox
 *   templates/<id>.json    one template: an ordered list of component ids
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

function readJsonDir(dir) {
    let names = [];
    try {
        names = fs.readdirSync(dir).filter((name) => name.endsWith('.json'));
    } catch {
        return [];
    }

    const entries = [];
    for (const name of names.sort()) {
        try {
            entries.push(JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
        } catch (error) {
            console.warn(`[registry] Skipping ${name}: ${error.message}`);
        }
    }
    return entries;
}

export function loadRegistry() {
    if (cache) return cache;
    const dir = getRegistryDir();
    cache = {
        components: readJsonDir(path.join(dir, 'components')).filter((component) => component?.id),
        templates: readJsonDir(path.join(dir, 'templates')).filter((template) => template?.templateId),
    };
    return cache;
}

/** Forget cached files. Used by tests and after editing the registry folder. */
export function resetRegistryCache() {
    cache = null;
}
