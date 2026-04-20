/**
 * Agent Tool Definitions
 * 
 * JSON Schema definitions for tools exposed to the AI model via function calling.
 * Each tool has a name, description, parameters schema, and permission level.
 * 
 * Permission levels:
 *   - "auto"    → execute without user visibility (reads, searches)
 *   - "show"    → execute and show diff/result in chat (writes, edits)
 *   - "confirm" → require explicit user confirmation (destructive ops)
 */

export const AGENT_TOOLS = [
  {
    name: 'list_files',
    permission: 'auto',
    description: 'List all files in the project. Returns file paths, extensions, and whether they are protected system files. Use this to understand the project structure before making changes.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },

  {
    name: 'read_file',
    permission: 'auto',
    description: 'Read the contents of a file. Returns the full content or a specific line range. Use this to understand existing code before editing.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the file (e.g. "src/components/Hero.jsx")'
        },
        start_line: {
          type: 'integer',
          minimum: 1,
          description: 'Optional: first line to read (1-indexed). Omit to read entire file.'
        },
        end_line: {
          type: 'integer',
          minimum: 1,
          description: 'Optional: last line to read (1-indexed, inclusive). Omit to read to end.'
        }
      },
      required: ['path'],
      additionalProperties: false
    }
  },

  {
    name: 'create_file',
    permission: 'show',
    description: 'Create a new file. Fails if the file already exists — use edit_file or replace_file to modify existing files. Directories are created automatically.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path for the new file (e.g. "src/components/Footer.jsx")'
        },
        content: {
          type: 'string',
          description: 'Full content of the file to create'
        }
      },
      required: ['path', 'content'],
      additionalProperties: false
    }
  },

  {
    name: 'edit_file',
    permission: 'show',
    description: 'Edit an existing file by replacing an exact string match. This is the primary tool for making targeted changes — specify the exact text to find (old_string) and its replacement (new_string). IMPORTANT: old_string must exactly match text in the file, including whitespace and indentation.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the file to edit'
        },
        old_string: {
          type: 'string',
          description: 'The exact text currently in the file that should be replaced. Must match character-for-character including whitespace.'
        },
        new_string: {
          type: 'string',
          description: 'The replacement text to insert where old_string was found.'
        },
        replace_all: {
          type: 'boolean',
          description: 'If true, replace ALL occurrences of old_string. Default: false (replace first occurrence only).'
        }
      },
      required: ['path', 'old_string', 'new_string'],
      additionalProperties: false
    }
  },

  {
    name: 'replace_file',
    permission: 'show',
    description: 'Replace the entire content of a file. Use this for major rewrites where edit_file would be impractical. Also works to create new files.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Relative path to the file to replace'
        },
        content: {
          type: 'string',
          description: 'The complete new content for the file'
        }
      },
      required: ['path', 'content'],
      additionalProperties: false
    }
  },

  {
    name: 'search_files',
    permission: 'auto',
    description: 'Search across all project files for a text pattern (regex supported). Returns matching files with line numbers and context.',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Regex pattern to search for across project files'
        },
        glob: {
          type: 'string',
          description: 'Optional: file extension filter (e.g. "*.jsx", "*.css")'
        },
        case_sensitive: {
          type: 'boolean',
          description: 'Whether the search is case-sensitive. Default: true.'
        }
      },
      required: ['pattern'],
      additionalProperties: false
    }
  },

  {
    name: 'get_build_errors',
    permission: 'auto',
    description: 'Check if the project builds successfully. Returns build pass/fail status and any error messages. Use this after making changes to verify they compile correctly.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  }
];

/**
 * Convert agent tool definitions to the format expected by Vercel AI SDK's
 * `tools` parameter for generateText / streamText.
 */
export function toAISdkTools() {
  const tools = {};
  for (const tool of AGENT_TOOLS) {
    tools[tool.name] = {
      description: tool.description,
      parameters: tool.parameters
    };
  }
  return tools;
}

/**
 * Convert agent tool definitions to OpenAI's function calling format.
 * Used when calling models via the native OpenAI SDK (Responses API).
 */
export function toOpenAIFunctions() {
  return AGENT_TOOLS.map(tool => ({
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }));
}

/**
 * Convert agent tool definitions to Anthropic's tool format.
 */
export function toAnthropicTools() {
  return AGENT_TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters
  }));
}

/**
 * Get the permission level for a tool by name.
 */
export function getToolPermission(toolName) {
  const tool = AGENT_TOOLS.find(t => t.name === toolName);
  return tool?.permission || 'confirm';
}

export default AGENT_TOOLS;
