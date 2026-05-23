import { supabaseAdmin } from '../../lib/supabase-admin.js';
import submitTemplate from './submit-template.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COMPONENT_KEYS = new Set([
  'id',
  'component_id',
  'componentId',
  'componentRefId',
  'bundleId',
  'refId'
]);

function normalizeCandidate(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('gen_')) return null;
  if (trimmed.includes('/') || trimmed.length > 120) return null;
  return trimmed;
}

function pushCandidate(value, candidates, seen) {
  const normalized = normalizeCandidate(value);
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  candidates.push(normalized);
}

function collectComponentCandidates(value, candidates = [], seen = new Set()) {
  if (!value) return candidates;

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') {
        pushCandidate(item, candidates, seen);
      } else {
        collectComponentCandidates(item, candidates, seen);
      }
    }
    return candidates;
  }

  if (typeof value !== 'object') return candidates;

  for (const [key, child] of Object.entries(value)) {
    if (COMPONENT_KEYS.has(key)) {
      pushCandidate(child, candidates, seen);
      continue;
    }
    collectComponentCandidates(child, candidates, seen);
  }

  return candidates;
}

async function resolveComponentUuidsInOrder(candidates) {
  const uuidCandidates = candidates.filter((candidate) => UUID_RE.test(candidate));
  const componentIdCandidates = candidates.filter((candidate) => !UUID_RE.test(candidate));

  const rows = [];
  if (uuidCandidates.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('components')
      .select('id, component_id, status')
      .in('id', uuidCandidates)
      .eq('status', 'active');
    if (error) throw error;
    rows.push(...(data || []));
  }

  if (componentIdCandidates.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('components')
      .select('id, component_id, status')
      .in('component_id', componentIdCandidates)
      .eq('status', 'active');
    if (error) throw error;
    rows.push(...(data || []));
  }

  const byUuid = new Map(rows.map((row) => [row.id, row]));
  const byComponentId = new Map(rows.map((row) => [row.component_id, row]));
  const output = [];
  const seen = new Set();

  for (const candidate of candidates) {
    const row = byUuid.get(candidate) || byComponentId.get(candidate);
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    output.push(row.id);
  }

  return output;
}

/**
 * POST /api/community/extract-template
 *
 * BUILDER-CONTRACT: Extracted templates now derive their component list from
 * durable project metadata (`component_plan` / `selected_components`). The old
 * ai_selection_events feedback table was intentionally retired; if projects no
 * longer persist reusable component IDs, this feature should be redesigned or
 * retired instead of reintroducing hidden selection telemetry.
 */
export default async function extractTemplate(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { projectId, name, description } = req.body || {};
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'projectId is required' });
    }
    if (!name || name.length < 3 || name.length > 150) {
      return res.status(400).json({ success: false, error: 'Template name is required (3-150 characters)' });
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, user_id, name, component_plan, selected_components')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    if (project.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'You can only extract templates from your own projects' });
    }

    const candidates = [
      ...collectComponentCandidates(project.component_plan),
      ...collectComponentCandidates(project.selected_components)
    ];
    const componentIdsInOrder = await resolveComponentUuidsInOrder(candidates);

    if (componentIdsInOrder.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'This project does not have enough reusable catalog components to extract a community template.'
      });
    }

    req.body = {
      name,
      description: description || `Extracted from "${project.name || 'AI Build'}"`,
      componentIdsInOrder,
      source_mode: 'community-extracted',
      thumbnail: null,
      ipAttestationAccepted: true,
      licenseGrantAccepted: true,
      attestationVersion: 'community-template-extraction-v2-project-metadata'
    };

    return await submitTemplate(req, res);
  } catch (err) {
    console.error('[extract-template] Failed:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during template extraction' });
  }
}
