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

        // 1. Get profile
        const { data: profile, error: profileErr } = await supabaseAdmin
            .from('profiles')
            .select('daily_credits_used, daily_credits_limit, total_credits_remaining, plan, daily_credits_reset_at')
            .eq('id', userId)
            .single();

        if (profileErr || !profile) {
            console.error('[DB] Profile fetch err:', profileErr);
            return { allowed: false, message: 'Could not fetch user profile.' };
        }

        const today = new Date().toISOString().split('T')[0];

        // Reset daily counters if needed
        let currentDailyUsed = profile.daily_credits_used;
        if (profile.daily_credits_reset_at !== today) {
            currentDailyUsed = 0;
            // We will perform the DB update alongside the deduction below
        }

        // Checking limits
        const isPremium = profile.plan === 'pro' || profile.plan === 'enterprise' || profile.plan === 'admin';
        const hasDailyCreditsLeft = currentDailyUsed < profile.daily_credits_limit;
        const hasPurchasedCreditsLeft = profile.total_credits_remaining > 0;

        let totalCreditsAfter = profile.total_credits_remaining;
        let dailyCreditsAfter = currentDailyUsed;
        let transactionType = 'usage';
        let description = 'Site generation';

        if (hasDailyCreditsLeft || isPremium) {
            // Free daily build or premium unlimited
            // Note: If premium is strictly "unlimited", we don't strictly enforce daily_credits_limit in the same way, but tracking helps.
            if (!isPremium && hasDailyCreditsLeft) dailyCreditsAfter += 1;
        } else if (hasPurchasedCreditsLeft) {
            // Fallback to rolled over / purchased credits
            totalCreditsAfter -= 1;
            description = 'Site generation (Purchased credit)';
        } else {
            // No credits left
            return {
                allowed: false,
                message: 'You have exhausted your daily free builds. Please upgrade to Pro for unlimited builds.'
            };
        }

        // 2. Perform updates
        const { error: updateErr } = await supabaseAdmin
            .from('profiles')
            .update({
                daily_credits_used: dailyCreditsAfter,
                total_credits_remaining: totalCreditsAfter,
                daily_credits_reset_at: today
            })
            .eq('id', userId);

        if (updateErr) {
            console.error('[DB] Profile credit update err:', updateErr);
            return { allowed: false, message: 'Failed to update credit balance.' };
        }

        // 3. Log transaction
        await supabaseAdmin.from('credit_transactions').insert({
            user_id: userId,
            amount: -1,
            type: transactionType,
            description
        });

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
