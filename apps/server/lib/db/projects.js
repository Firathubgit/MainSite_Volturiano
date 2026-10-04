import { db } from '../store/index.js';
import { assertProjectOwner } from '../security/project-access.js';

/**
 * Create a project record. Returns the project id, or null when it could not be saved.
 */
export async function createProject({ userId, prompt, buildId }) {
    const { data, error } = await db
        .from('projects')
        .insert({
            id: buildId,
            name: prompt ? `${prompt.substring(0, 50)}...` : 'Untitled Project',
            prompt: prompt || '',
            build_status: 'generating',
            // Hidden from the project list until the first build is saved.
            is_committed: false,
            user_id: userId
        })
        .select('id')
        .single();

    if (error) {
        console.error('[DB] Failed to create project:', error.message);
        return null;
    }
    return data.id;
}

/**
 * Update a project.
 */
export async function updateProject(projectId, updates) {
    if (!projectId) return;
    const { error } = await db
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', projectId);
    if (error) console.error('[DB] updateProject failed:', error.message);
}

/**
 * Update a project after checking that it belongs to the caller.
 */
export async function updateProjectForUser(projectId, userId, updates) {
    await assertProjectOwner(projectId, userId);
    return updateProject(projectId, updates);
}

/**
 * Save a snapshot: the full file map of a project at one point in the chat.
 */
export async function createSnapshot({ projectId, userId, chatIndex, text, files, packages, designSystem, componentPlan }) {
    if (!projectId) return;

    const payload = {
        project_id: projectId,
        chat_message_index: chatIndex || 0,
        chat_message_text: text || '',
        files: files || {},
        packages: packages || [],
        design_system: designSystem || null,
        component_plan: componentPlan || null,
        user_id: userId
    };
    payload.snapshot_size_bytes = Buffer.byteLength(JSON.stringify(payload));

    const { error } = await db.from('snapshots').insert(payload);
    if (error) console.error('[DB] createSnapshot failed:', error.message);
}

/**
 * Save a snapshot after checking that the project belongs to the caller.
 */
export async function createSnapshotForUser(snapshot) {
    await assertProjectOwner(snapshot?.projectId, snapshot?.userId);
    return createSnapshot(snapshot);
}
