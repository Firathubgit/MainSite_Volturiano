// server/lib/retention-tracker.js
// Phase S9.14: Usage Feedback Loop — Tracks AI component selection and user retention

import { supabaseAdmin } from './supabase-admin.js';

/**
 * Record which components were selected by the AI for a build.
 * Called immediately after select-components.js returns selections.
 *
 * @param {string} buildId - The build session ID
 * @param {Array} selections - Array of { componentId, confidence } from LLM output
 */
export async function recordComponentSelections(buildId, selections) {
    if (!selections || selections.length === 0) return;

    try {
        // Look up component UUIDs from component_id strings
        const componentIds = selections.map(s => s.componentId);
        const { data: components } = await supabaseAdmin
            .from('components')
            .select('id, component_id')
            .in('component_id', componentIds);

        if (!components || components.length === 0) return;

        const idMap = new Map(components.map(c => [c.component_id, c.id]));

        const events = selections
            .filter(s => idMap.has(s.componentId))
            .map(s => ({
                build_id: buildId,
                component_id: idMap.get(s.componentId),
                was_selected: true,
                was_kept: null, // Set later when user finalizes
                selection_confidence: s.confidence || null,
            }));

        if (events.length > 0) {
            await supabaseAdmin.from('ai_selection_events').insert(events);
            console.log(`[retention] Recorded ${events.length} selection events for build ${buildId}`);
        }
    } catch (err) {
        // Non-fatal — don't break builds
        console.warn('[retention] recordComponentSelections failed:', err.message);
    }
}

/**
 * After build completion, mark which components were kept vs removed by the user.
 * This signal feeds back into quality scoring.
 *
 * @param {string} buildId - The build session ID
 * @param {string[]} keptComponentIds - component_id strings the user kept
 * @param {string[]} removedComponentIds - component_id strings the user removed/replaced
 */
export async function recordComponentRetention(buildId, keptComponentIds, removedComponentIds) {
    try {
        // Resolve component_id strings to UUIDs
        const allIds = [...(keptComponentIds || []), ...(removedComponentIds || [])];
        const { data: components } = await supabaseAdmin
            .from('components')
            .select('id, component_id, author_id')
            .in('component_id', allIds);

        if (!components || components.length === 0) return;

        const idMap = new Map(components.map(c => [c.component_id, c]));

        // Mark kept components
        for (const compId of (keptComponentIds || [])) {
            const comp = idMap.get(compId);
            if (!comp) continue;

            await supabaseAdmin.from('ai_selection_events')
                .update({ was_kept: true })
                .eq('build_id', buildId)
                .eq('component_id', comp.id);

            // Usage tracking: increment usage_count
            await supabaseAdmin.from('components')
                .update({ usage_count: supabaseAdmin.rpc ? undefined : 0 }) // handled below
                .eq('id', comp.id);

            // Increment usage_count via raw update
            await supabaseAdmin.rpc('increment_usage_count', { p_component_id: comp.id }).catch(() => {
                // Fallback: direct update if RPC doesn't exist yet
                supabaseAdmin.from('components')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', comp.id);
            });

            // Reputation: +1 per use for the component author
            if (comp.author_id) {
                await supabaseAdmin.rpc('increment_reputation', {
                    p_user_id: comp.author_id,
                    p_points: 1,
                }).catch(() => { });
            }
        }

        // Mark removed components
        for (const compId of (removedComponentIds || [])) {
            const comp = idMap.get(compId);
            if (!comp) continue;

            await supabaseAdmin.from('ai_selection_events')
                .update({ was_kept: false })
                .eq('build_id', buildId)
                .eq('component_id', comp.id);
        }

        console.log(`[retention] Build ${buildId}: ${keptComponentIds?.length || 0} kept, ${removedComponentIds?.length || 0} removed`);
    } catch (err) {
        console.warn('[retention] recordComponentRetention failed:', err.message);
    }
}
