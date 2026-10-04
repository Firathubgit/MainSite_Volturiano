import { supabaseAdmin } from '../supabase-admin.js';
import { designBriefToContextBlock } from '../design/derive-design-system.js';

const MAX_CHAT_MESSAGES = 8;
const MAX_TEXT = 700;
const MAX_JSON = 1400;
const MAX_DESIGN_BRIEF = 2400;

export async function loadProjectContextBlock({ projectId, userId = null } = {}) {
  if (!projectId || !supabaseAdmin) return '';

  try {
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id,user_id,name,prompt,build_status,design_system,component_plan,selected_components,chat_history,sandbox_id,build_mode,total_components,updated_at')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.warn('[agent-context] Project context unavailable:', projectError?.message || 'not found');
      return '';
    }

    if (project.user_id && project.user_id !== userId) {
      console.warn('[agent-context] Skipping project context: user mismatch');
      return '';
    }

    const { data: snapshots, error: snapshotError } = await supabaseAdmin
      .from('snapshots')
      .select('id,chat_message_index,chat_message_text,build_status,build_logs,snapshot_size_bytes,created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (snapshotError) {
      console.warn('[agent-context] Snapshot metadata unavailable:', snapshotError.message);
    }

    return formatProjectContextBlock({
      project,
      latestSnapshot: snapshots?.[0] || null
    });
  } catch (error) {
    console.warn('[agent-context] Failed to load project context:', error.message);
    return '';
  }
}

export function formatProjectContextBlock({ project, latestSnapshot = null }) {
  if (!project) return '';

  const lines = [
    '[Persisted project context]',
    'Use this as continuity memory for the current website. Prefer it over asking the user to repeat previous choices.'
  ];

  if (project.name) lines.push(`Project name: ${trim(project.name, 120)}`);
  if (project.prompt) lines.push(`Original prompt: ${trim(project.prompt, MAX_TEXT)}`);
  if (project.build_status) lines.push(`Saved build status: ${project.build_status}`);
  if (project.build_mode || project.routing_mode || project.chrome_profile) {
    lines.push(`Build settings: ${compactList([
      project.build_mode && `mode=${project.build_mode}`,
      project.routing_mode && `routing=${project.routing_mode}`,
      project.chrome_profile && `chrome=${project.chrome_profile}`
    ])}`);
  }

  const selectedComponents = summarizeComponents(project.selected_components);
  if (selectedComponents) lines.push(`Selected components: ${selectedComponents}`);

  const componentPlan = summarizeJson(project.component_plan);
  if (componentPlan) lines.push(`Component plan: ${componentPlan}`);

  const designSystem = summarizeDesignSystem(project.design_system);
  if (designSystem) lines.push(designSystem);

  const recentChat = summarizeChat(project.chat_history);
  if (recentChat) {
    lines.push('Recent saved chat:');
    lines.push(recentChat);
  }

  if (latestSnapshot) {
    lines.push(`Latest saved snapshot: chatIndex=${latestSnapshot.chat_message_index ?? 'unknown'}, savedAt=${latestSnapshot.created_at || 'unknown'}, size=${latestSnapshot.snapshot_size_bytes || 'unknown'} bytes`);
    if (latestSnapshot.chat_message_text) {
      lines.push(`Snapshot prompt: ${trim(latestSnapshot.chat_message_text, 240)}`);
    }
    if (latestSnapshot.build_status) {
      lines.push(`Snapshot build status: ${latestSnapshot.build_status}`);
    }
    if (latestSnapshot.build_logs) {
      lines.push(`Recent build logs: ${trim(latestSnapshot.build_logs, 500)}`);
    }
  }

  lines.push('Visible response rule: after work is complete, give the user a short calm summary. Tool cards already show implementation detail.');

  return `${lines.filter(Boolean).join('\n')}\n[/Persisted project context]`;
}

function summarizeChat(chatHistory) {
  if (!Array.isArray(chatHistory) || chatHistory.length === 0) return '';

  return chatHistory
    .filter((message) => message && typeof message.content === 'string')
    .filter((message) => ['user', 'ai', 'ai-narrator', 'system'].includes(message.type))
    .slice(-MAX_CHAT_MESSAGES)
    .map((message) => {
      const role = message.type === 'user' ? 'User' : message.type === 'system' ? 'System' : 'Assistant';
      return `- ${role}: ${trim(message.content, 260)}`;
    })
    .join('\n');
}

function summarizeComponents(value) {
  const components = parseMaybeJson(value);
  if (!Array.isArray(components) || components.length === 0) return '';

  return components
    .slice(0, 10)
    .map((component) => {
      if (typeof component === 'string') return component;
      return compactList([
        component.name || component.title || component.id,
        component.category,
        component.role || component.section
      ]);
    })
    .filter(Boolean)
    .join('; ');
}

function summarizeJson(value) {
  const parsed = parseMaybeJson(value);
  if (!parsed) return '';

  return trim(JSON.stringify(parsed, jsonReplacer), MAX_JSON);
}

function summarizeDesignSystem(value) {
  const parsed = parseMaybeJson(value);
  if (!parsed) return '';

  // Structured design briefs render as a readable, binding art-direction block
  // so every edit turn keeps the original palette, type, and tone.
  if (parsed.colorPalette) {
    const block = designBriefToContextBlock(parsed);
    if (block) {
      return block.length <= MAX_DESIGN_BRIEF ? block : `${block.slice(0, MAX_DESIGN_BRIEF - 3)}...`;
    }
  }

  const fallback = trim(JSON.stringify(parsed, jsonReplacer), MAX_JSON);
  return fallback ? `Design system: ${fallback}` : '';
}

function parseMaybeJson(value) {
  if (!value) return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function jsonReplacer(key, value) {
  if (typeof value === 'string') return trim(value, 220);
  if (Array.isArray(value) && value.length > 12) return value.slice(0, 12);
  return value;
}

function compactList(items) {
  return items.filter(Boolean).join(', ');
}

function trim(text, maxLength) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}
