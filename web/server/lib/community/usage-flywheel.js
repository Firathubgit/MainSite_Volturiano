/**
 * Component usage flywheel.
 *
 * Every agent install of a catalog component produces telemetry that feeds
 * back into retrieval ranking and author incentives:
 *   installed → component_usage_events + usage_count RPC + author credit reward
 *   survived/removed → computed at snapshot save by checking whether the
 *                      installed files made it into the project's final state
 *
 * Survival rate is consumed by the hybrid semantic ranking
 * (lib/registry/embeddings.js → component_survival_stats view).
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { resolveComponentRefs, recordComponentUsage } from '../registry/registry.js';

const AUTHOR_REWARD_CREDITS = 1;
const AUTHOR_REWARD_DAILY_CAP = 5;

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

/**
 * Record that the agent installed a component into a project sandbox.
 * Fire-and-forget safe: never throws.
 */
export async function recordComponentInstall({
  componentRef,
  projectId = null,
  sessionId = null,
  installedPaths = []
} = {}) {
  if (!componentRef) return;

  try {
    // Keep legacy usage_count + reputation milestone flowing.
    recordComponentUsage(componentRef).catch(() => {});

    if (!supabaseAdmin) return;

    const refs = await resolveComponentRefs([componentRef]);
    const resolved = refs.get(String(componentRef).trim()) || null;
    const componentUuid = resolved?.uuid || (isUuid(componentRef) ? componentRef : null);
    const componentSlug = resolved?.slug || (!isUuid(componentRef) ? String(componentRef) : null);

    const { error } = await supabaseAdmin
      .from('component_usage_events')
      .insert({
        component_id: componentUuid,
        component_slug: componentSlug,
        project_id: isUuid(projectId) ? projectId : null,
        session_id: isUuid(sessionId) ? sessionId : null,
        event: 'installed',
        metadata: { paths: (installedPaths || []).slice(0, 24) }
      });
    if (error) {
      console.warn('[flywheel] install event insert failed:', error.message);
      return;
    }

    if (componentUuid) {
      rewardComponentAuthor(componentUuid).catch(() => {});
    }
  } catch (err) {
    console.warn('[flywheel] recordComponentInstall failed:', err.message);
  }
}

/**
 * Small credit grant to community authors whose components get used by the
 * agent, capped per day so the incentive can't be farmed.
 */
async function rewardComponentAuthor(componentUuid) {
  if (!supabaseAdmin) return;

  const { data: component } = await supabaseAdmin
    .from('components')
    .select('id, component_id, author_id, author_type')
    .eq('id', componentUuid)
    .maybeSingle();

  if (!component?.author_id || component.author_type !== 'community') return;

  // Daily cap: count today's rewarded events for this author.
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await supabaseAdmin
    .from('component_usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('event', 'installed')
    .gte('created_at', startOfDay.toISOString())
    .eq('metadata->>rewardedAuthorId', component.author_id);

  if (countError || (count || 0) >= AUTHOR_REWARD_DAILY_CAP) return;

  const { data, error } = await supabaseAdmin.rpc('add_credits_safe', {
    p_user_id: component.author_id,
    p_amount: AUTHOR_REWARD_CREDITS,
    p_description: `Component used by the AI builder: ${component.component_id}`,
    p_stripe_payment_id: null,
    p_credit_type: 'purchased'
  });

  if (error || data?.success === false) {
    console.warn('[flywheel] author reward skipped:', error?.message || data?.error);
    return;
  }

  // Mark the most recent install event as rewarded (for the daily cap query).
  const { data: latestEvent } = await supabaseAdmin
    .from('component_usage_events')
    .select('id, metadata')
    .eq('component_id', componentUuid)
    .eq('event', 'installed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestEvent) {
    await supabaseAdmin
      .from('component_usage_events')
      .update({ metadata: { ...(latestEvent.metadata || {}), rewardedAuthorId: component.author_id } })
      .eq('id', latestEvent.id);
  }
}

/**
 * Compute survival for all components ever installed into a project, given
 * the project's final file map at snapshot time. Inserts a survived/removed
 * event only when the status changed since the last computation.
 * Fire-and-forget safe.
 */
export async function recordComponentSurvival({ projectId, files } = {}) {
  if (!supabaseAdmin || !isUuid(projectId) || !files) return;

  try {
    const filePaths = new Set(
      (Array.isArray(files) ? files.map((file) => file?.path || file) : Object.keys(files))
        .filter((path) => typeof path === 'string')
        .map(normalizePath)
    );
    if (filePaths.size === 0) return;

    const { data: events, error } = await supabaseAdmin
      .from('component_usage_events')
      .select('component_id, component_slug, event, metadata, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error || !Array.isArray(events) || events.length === 0) return;

    // Latest known state per component: installed paths + last survival verdict.
    const perComponent = new Map();
    for (const event of events) {
      const key = event.component_id || event.component_slug;
      if (!key) continue;
      const entry = perComponent.get(key) || { paths: [], lastVerdict: null, componentId: event.component_id, componentSlug: event.component_slug };
      if (event.event === 'installed' && Array.isArray(event.metadata?.paths)) {
        entry.paths = event.metadata.paths;
      }
      if (event.event === 'survived' || event.event === 'removed') {
        entry.lastVerdict = event.event;
      }
      perComponent.set(key, entry);
    }

    const inserts = [];
    for (const entry of perComponent.values()) {
      if (!entry.paths.length) continue;
      const present = entry.paths.some((path) => filePaths.has(normalizePath(path)));
      const verdict = present ? 'survived' : 'removed';
      if (verdict === entry.lastVerdict) continue;
      inserts.push({
        component_id: entry.componentId,
        component_slug: entry.componentSlug,
        project_id: projectId,
        event: verdict,
        metadata: { checkedPaths: entry.paths.slice(0, 24) }
      });
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('component_usage_events')
        .insert(inserts);
      if (insertError) {
        console.warn('[flywheel] survival insert failed:', insertError.message);
      } else {
        console.log(`[flywheel] Survival recorded for project ${projectId}: ${inserts.map((insert) => `${insert.component_slug || insert.component_id}=${insert.event}`).join(', ')}`);
      }
    }
  } catch (err) {
    console.warn('[flywheel] recordComponentSurvival failed:', err.message);
  }
}

function normalizePath(path) {
  return String(path || '').replace(/^\.\//, '').replace(/^\//, '').trim();
}
