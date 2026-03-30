import { supabaseAdmin } from '../supabase-admin.js';

// checkGuestLimit removed - no longer supporting guest builds

/**
 * Checks and deducts user credits.
 * @param {string} userId - Supabase user UUID.
 * @returns {Promise<{allowed: boolean, message?: string}>}
 */
export async function checkAndDeductUserCredit(userId) {
    if (!userId) return { allowed: false, message: 'Unauthorized' };
    if (!supabaseAdmin) return { allowed: true }; // Fail open

    try {
        const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
        if (isDev) return { allowed: true };

        // Use the V2 Credit System RPC if available
        const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc('deduct_credits_safe', {
            p_user_id: userId,
            p_amount: 1,
            p_description: 'Site generation',
            p_project_id: null
        });

        if (rpcErr) {
            console.error('[DB] deduct_credits_safe RPC error:', rpcErr);
            // Fallback: If RPC is missing/fails, we fail open for now so we don't block users
            return { allowed: true };
        }

        if (rpcResult && rpcResult.success === false) {
             return {
                 allowed: false,
                 message: rpcResult.error || 'You have exhausted your credits. Please upgrade or purchase more.',
                 code: rpcResult.code
             };
        }

        return { allowed: true };

    } catch (err) {
        console.error('[DB] checkAndDeductUserCredit exception:', err);
        return { allowed: false, message: 'Internal server error while checking credits.' };
    }
}

/**
 * Initializes a new project record.
 */
export async function createProject({ userId, prompt, buildId }) {
    if (!supabaseAdmin) return buildId;
    try {
        const payload = {
            id: buildId,
            name: prompt ? prompt.substring(0, 50) + '...' : 'Untitled Project',
            prompt: prompt || '',
            build_status: 'generating',
            user_id: userId
        };

        const { data, error } = await supabaseAdmin
            .from('projects')
            .insert(payload)
            .select('id')
            .single();

        if (error) {
            console.error('[DB] Failed to create project:', {
                error,
                userId,
                buildId,
                prompt: prompt?.substring(0, 50)
            });
            return null;
        }

        console.log('[DB] Project created successfully:', data.id);
        return data.id;
    } catch (err) {
        console.error('[DB] createProject exception:', err);
        return null;
    }
}

/**
 * Updates an ongoing project state.
 */
export async function updateProject(projectId, updates) {
    if (!projectId || !supabaseAdmin) return;

    try {
        const { error } = await supabaseAdmin
            .from('projects')
            .update(updates)
            .eq('id', projectId);

        if (error) {
            console.error('[DB] updateProject err:', {
                error,
                projectId,
                updateKeys: Object.keys(updates)
            });
        } else {
            console.log('[DB] Project updated successfully:', projectId);
        }
    } catch (err) {
        console.error('[DB] updateProject exception:', err);
    }
}

/**
 * Saves a chat history checkpoint snapshot.
 */
export async function createSnapshot({ projectId, userId, chatIndex, text, files, packages, designSystem, componentPlan }) {
    if (!projectId || !supabaseAdmin) return;

    try {
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

        // Convert string size roughly to bytes (2 bytes per char generally, simplified)
        const jsonStr = JSON.stringify(payload);
        payload.snapshot_size_bytes = new TextEncoder().encode(jsonStr).length;

        const { error } = await supabaseAdmin
            .from('snapshots')
            .insert(payload);

        if (error) {
            console.error('[DB] createSnapshot err:', error);
        } else {
            console.log(`[DB] Snapshot created successfully for project: ${projectId}, Chat Index: ${chatIndex}, Files: ${Object.keys(files || {}).length}`);
        }
    } catch (err) {
        console.error('[DB] createSnapshot exception:', err);
    }
}
