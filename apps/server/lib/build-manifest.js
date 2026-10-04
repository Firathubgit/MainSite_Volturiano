/**
 * Build Manifest Store (In-Memory)
 * Acts as the Single Source of Truth for the generation pipeline.
 */

// In-memory store: Map<buildId, ManifestObject>
const manifests = new Map();

/**
 * Creates a new manifest for a build.
 * @param {string} buildId - The unique build ID.
 * @param {string} mode - The generation mode (e.g., 'initial', 'edit', 'template').
 * @returns {Object} The new manifest object.
 */
export function createManifest(buildId, mode = 'initial') {
    const manifest = {
        build_id: buildId,
        mode,
        startTime: Date.now(),
        lastUpdate: Date.now(),
        planned: [],    // Array of planned components
        generated: [],  // Array of generated component artifacts
        applied: [],    // Array of files applied to sandbox
        verify: {
            status: 'pending',
            logs: []
        }
    };

    manifests.set(buildId, manifest);
    console.log(`[build:${buildId}] Manifest created (Mode: ${mode})`);
    return manifest;
}

/**
 * Retrieves a manifest by ID.
 * @param {string} buildId 
 * @returns {Object|null}
 */
export function getManifest(buildId) {
    return manifests.get(buildId) || null;
}

/**
 * Updates a manifest with a partial object (patch).
 * @param {string} buildId 
 * @param {Object} patch - Partial object to merge into the manifest.
 */
export function updateManifest(buildId, patch) {
    const manifest = manifests.get(buildId);
    if (!manifest) {
        console.warn(`[build:${buildId}] Warn: Attempted to update non-existent manifest.`);
        return null;
    }

    // Deep merge logic could be added here if needed, but for now strict top-level keys or specific array pushes are safer.
    // We'll trust the caller to pass correct structure or we define specific methods.

    // For simplicity in this iteration, we merge top-level keys.
    // Special handling for arrays: we usually want to push, but the caller might verify uniqueness.
    // For now, let's allow the caller to handle logic or pass data.

    // Actually, to keep it robust:
    if (patch.planned) manifest.planned = patch.planned; // usually set once or appended
    if (patch.generated) {
        // If it's a single item push
        if (Array.isArray(patch.generated)) manifest.generated.push(...patch.generated);
    }
    if (patch.applied) {
        if (Array.isArray(patch.applied)) manifest.applied.push(...patch.applied);
    }
    if (patch.verify) {
        manifest.verify = { ...manifest.verify, ...patch.verify };
    }

    manifest.lastUpdate = Date.now();
    // manifests.set(buildId, manifest); // Reference update is enough 

    // Debug log for significant updates
    // console.log(`[build:${buildId}] Manifest updated:`, Object.keys(patch).join(', '));

    return manifest;
}

/**
 * Log helper to ensure consistent prefixing.
 * @param {string} buildId 
 * @param {string} message 
 */
export function log(buildId, message) {
    console.log(`[build:${buildId || 'n/a'}] ${message}`);
}
