export const TOOL_PERMISSION_MODES = Object.freeze({
  READ_ONLY: 'read-only',
  WORKSPACE_WRITE: 'workspace-write',
  PACKAGE_INSTALL: 'package-install',
  DESTRUCTIVE: 'destructive',
  SANDBOX_ADMIN: 'sandbox-admin',
  DANGER_FULL_ACCESS: 'danger-full-access'
});

export const TOOL_CATEGORIES = Object.freeze({
  FILE_READ: 'file-read',
  FILE_WRITE: 'file-write',
  FILE_DELETE: 'file-delete',
  BUILD: 'build',
  CATALOG: 'catalog',
  PACKAGE: 'package',
  SANDBOX: 'sandbox',
  PLANNING: 'planning'
});

const MODE_RANK = Object.freeze({
  [TOOL_PERMISSION_MODES.READ_ONLY]: 0,
  [TOOL_PERMISSION_MODES.WORKSPACE_WRITE]: 1,
  [TOOL_PERMISSION_MODES.PACKAGE_INSTALL]: 2,
  [TOOL_PERMISSION_MODES.DESTRUCTIVE]: 3,
  [TOOL_PERMISSION_MODES.SANDBOX_ADMIN]: 4,
  [TOOL_PERMISSION_MODES.DANGER_FULL_ACCESS]: 99
});

export const DEFAULT_TOOL_POLICY_OPTIONS = Object.freeze({
  permissionMode: TOOL_PERMISSION_MODES.WORKSPACE_WRITE,
  enableCatalogTools: false,
  enablePackageTools: false,
  enableDestructiveTools: false,
  enableSandboxAdminTools: false,
  providerCapabilities: null
});

export class AgentToolPolicyError extends Error {
  constructor(code, message, metadata = {}) {
    super(message);
    this.name = 'AgentToolPolicyError';
    this.code = code;
    this.metadata = metadata;
  }
}

export function normalizeToolPolicyOptions(options = {}) {
  const hasPermissionMode = Object.prototype.hasOwnProperty.call(MODE_RANK, options.permissionMode);
  return {
    ...DEFAULT_TOOL_POLICY_OPTIONS,
    ...options,
    permissionMode: hasPermissionMode
      ? options.permissionMode
      : DEFAULT_TOOL_POLICY_OPTIONS.permissionMode
  };
}

export function makeToolPolicy({
  permission = TOOL_PERMISSION_MODES.READ_ONLY,
  category = TOOL_CATEGORIES.FILE_READ,
  mutating = false,
  sideEffect = false,
  requiresFeature = null,
  requiresConfirmation = false,
  confirmationToken = null,
  visible = true
} = {}) {
  return {
    permission,
    category,
    mutating,
    sideEffect,
    requiresFeature,
    requiresConfirmation,
    confirmationToken,
    visible
  };
}

export function shouldExposeTool(definition, options = {}) {
  const policy = definition?.policy || makeToolPolicy();
  const normalized = normalizeToolPolicyOptions(options);

  if (!policy.requiresFeature) return true;
  if (policy.requiresFeature === 'catalog') return Boolean(normalized.enableCatalogTools);
  if (policy.requiresFeature === 'package') {
    return Boolean(normalized.enablePackageTools) && normalized.providerCapabilities?.packageInstall !== false;
  }
  if (policy.requiresFeature === 'destructive') return Boolean(normalized.enableDestructiveTools);
  if (policy.requiresFeature === 'sandbox-admin') {
    return Boolean(normalized.enableSandboxAdminTools) && normalized.providerCapabilities?.appReset !== false;
  }
  return false;
}

export function assertToolAllowed(definition, args = {}, options = {}) {
  if (!definition) {
    throw new AgentToolPolicyError('UNKNOWN_TOOL', 'Unknown tool');
  }

  const policy = definition.policy || makeToolPolicy();
  const normalized = normalizeToolPolicyOptions(options);

  if (!shouldExposeTool(definition, normalized)) {
    throw new AgentToolPolicyError(
      'TOOL_NOT_EXPOSED',
      `Tool "${definition.name}" is not enabled for this agent turn.`,
      { toolName: definition.name, permission: policy.permission, category: policy.category }
    );
  }

  const activeRank = MODE_RANK[normalized.permissionMode] ?? MODE_RANK[TOOL_PERMISSION_MODES.WORKSPACE_WRITE];
  const requiredRank = MODE_RANK[policy.permission] ?? MODE_RANK[TOOL_PERMISSION_MODES.DANGER_FULL_ACCESS];

  if (activeRank < requiredRank) {
    throw new AgentToolPolicyError(
      'TOOL_PERMISSION_DENIED',
      `Tool "${definition.name}" requires ${policy.permission} permission; current mode is ${normalized.permissionMode}.`,
      {
        toolName: definition.name,
        activeMode: normalized.permissionMode,
        requiredMode: policy.permission,
        category: policy.category
      }
    );
  }

  if (policy.requiresConfirmation && policy.confirmationToken) {
    const provided = String(args.confirmation || '').trim();
    if (provided !== policy.confirmationToken) {
      throw new AgentToolPolicyError(
        'TOOL_CONFIRMATION_REQUIRED',
        `Tool "${definition.name}" requires explicit confirmation.`,
        {
          toolName: definition.name,
          requiredConfirmation: policy.confirmationToken,
          category: policy.category
        }
      );
    }
  }

  return true;
}

export function serializeToolPolicy(definition) {
  const policy = definition?.policy || makeToolPolicy();
  return {
    permission: policy.permission,
    category: policy.category,
    mutating: Boolean(policy.mutating),
    sideEffect: Boolean(policy.sideEffect),
    requiresConfirmation: Boolean(policy.requiresConfirmation)
  };
}

export function summarizeToolPolicy(definitions = []) {
  return definitions.map((definition) => ({
    name: definition.name,
    ...serializeToolPolicy(definition)
  }));
}
