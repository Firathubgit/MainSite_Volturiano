// server/routes/community/extract-template.js
// Phase S10 — Mega Prompt 4: Extract Template from Live Build
// Looks up which components were used in a build and delegates to submit-template pipeline.

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import submitTemplate from './submit-template.js';

/**
 * POST /api/community/extract-template
 * 
 * Extracts the component stack from a completed build and submits it
 * as a community template via the existing submit-template pipeline.
 * 
 * Body: { projectId, name, description? }
 * Auth: Required (JWT in Authorization header)
 */
export default async function extractTemplate(req, res) {
    console.group('[extract-template] ════════════════════════════════════');
    console.log('[extract-template] 🚀 Request received at', new Date().toISOString());
    console.log('[extract-template] User ID:', req.user?.id || 'NONE');
    console.log('[extract-template] Request body:', JSON.stringify(req.body, null, 2));

    try {
        const userId = req.user?.id;
        if (!userId) {
            console.error('[extract-template] ❌ AUTH FAILED — No user ID on request');
            console.groupEnd();
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        console.log('[extract-template] ✅ Auth check passed, userId:', userId);

        const { projectId, name, description } = req.body;

        // ─── VALIDATION ───
        if (!projectId) {
            console.error('[extract-template] ❌ VALIDATION — Missing projectId');
            console.groupEnd();
            return res.status(400).json({ success: false, error: 'projectId is required' });
        }

        if (!name || name.length < 3 || name.length > 150) {
            console.error('[extract-template] ❌ VALIDATION — Bad name:', JSON.stringify(name));
            console.groupEnd();
            return res.status(400).json({ success: false, error: 'Template name is required (3-150 characters)' });
        }
        console.log('[extract-template] ✅ Input validation passed — name:', name, 'projectId:', projectId);

        // ─── VERIFY PROJECT BELONGS TO USER ───
        console.log('[extract-template] 🔍 Looking up project in Supabase...');
        const { data: project, error: projectError } = await supabaseAdmin
            .from('projects')
            .select('id, user_id, name, prompt')
            .eq('id', projectId)
            .single();

        if (projectError) {
            console.error('[extract-template] ❌ SUPABASE PROJECT QUERY ERROR:', projectError.message);
            console.error('[extract-template] Error details:', JSON.stringify(projectError));
            console.groupEnd();
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        if (!project) {
            console.error('[extract-template] ❌ PROJECT NOT FOUND for id:', projectId);
            console.groupEnd();
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        console.log('[extract-template] ✅ Project found:', { id: project.id, name: project.name, user_id: project.user_id });

        if (project.user_id !== userId) {
            console.error('[extract-template] ❌ OWNERSHIP MISMATCH — project.user_id:', project.user_id, '!== userId:', userId);
            console.groupEnd();
            return res.status(403).json({ success: false, error: 'You can only extract templates from your own projects' });
        }
        console.log('[extract-template] ✅ Ownership verified');

        // ─── EXTRACT COMPONENT IDS FROM ai_selection_events ───
        console.log('[extract-template] 🔍 Querying ai_selection_events for kept components (build_id =', projectId, ')...');
        let { data: selectionEvents, error: selError } = await supabaseAdmin
            .from('ai_selection_events')
            .select('component_id, was_selected, was_kept, selection_confidence, created_at')
            .eq('build_id', projectId)
            .eq('was_kept', true)
            .order('created_at', { ascending: true });

        console.log('[extract-template] Kept components query result:', {
            data: selectionEvents?.length || 0,
            error: selError?.message || null,
            events: selectionEvents?.map(e => ({ component_id: e.component_id, was_kept: e.was_kept, confidence: e.selection_confidence }))
        });

        // Fallback: if no "kept" events, use all selected events
        if ((!selectionEvents || selectionEvents.length === 0) && !selError) {
            console.log('[extract-template] ⚠️ No kept components found, falling back to was_selected=true...');
            const fallback = await supabaseAdmin
                .from('ai_selection_events')
                .select('component_id, was_selected, was_kept, selection_confidence, created_at')
                .eq('build_id', projectId)
                .eq('was_selected', true)
                .order('created_at', { ascending: true });

            selectionEvents = fallback.data;
            selError = fallback.error;

            console.log('[extract-template] Fallback query result:', {
                data: selectionEvents?.length || 0,
                error: selError?.message || null,
                events: selectionEvents?.map(e => ({ component_id: e.component_id, was_selected: e.was_selected, confidence: e.selection_confidence }))
            });
        }

        if (selError) {
            console.error('[extract-template] ❌ SUPABASE ai_selection_events QUERY ERROR:', selError.message);
            console.error('[extract-template] Error details:', JSON.stringify(selError));
            console.groupEnd();
            return res.status(500).json({ success: false, error: 'Failed to look up build components' });
        }

        if (!selectionEvents || selectionEvents.length === 0) {
            console.error('[extract-template] ❌ NO SELECTION EVENTS found for build_id:', projectId);
            console.log('[extract-template] This means either:');
            console.log('[extract-template]   1. The build predates the retention tracking system');
            console.log('[extract-template]   2. The build_id does not match any ai_selection_events');
            console.log('[extract-template]   3. No components were recorded for this build');
            console.groupEnd();
            return res.status(400).json({
                success: false,
                error: 'No component selection data found for this build. The build may predate the component tracking system.'
            });
        }

        // Deduplicate while preserving order
        const seen = new Set();
        const componentIdsInOrder = [];
        for (const event of selectionEvents) {
            if (!seen.has(event.component_id)) {
                seen.add(event.component_id);
                componentIdsInOrder.push(event.component_id);
            }
        }

        console.log('[extract-template] ✅ Extracted', componentIdsInOrder.length, 'unique components from', selectionEvents.length, 'events');
        console.log('[extract-template] Component IDs:', componentIdsInOrder);

        if (componentIdsInOrder.length < 2) {
            console.error('[extract-template] ❌ NOT ENOUGH COMPONENTS:', componentIdsInOrder.length, '(need >= 2)');
            console.groupEnd();
            return res.status(400).json({
                success: false,
                error: `Only ${componentIdsInOrder.length} component(s) found. Templates require at least 2 components.`
            });
        }

        // ─── DELEGATE TO SUBMIT-TEMPLATE ───
        req.body = {
            name,
            description: description || `Extracted from "${project.name || 'AI Build'}"`,
            componentIdsInOrder,
            source_mode: 'community-extracted',
            thumbnail: null,
        };

        console.log('[extract-template] 🔄 Delegating to submit-template with body:', {
            name: req.body.name,
            description: req.body.description,
            componentCount: componentIdsInOrder.length,
            source_mode: req.body.source_mode,
        });
        console.groupEnd();

        return await submitTemplate(req, res);

    } catch (err) {
        console.error('[extract-template] 💥 UNHANDLED EXCEPTION:', err);
        console.error('[extract-template] Stack:', err.stack);
        console.groupEnd();
        return res.status(500).json({ success: false, error: 'Internal server error during template extraction' });
    }
}
