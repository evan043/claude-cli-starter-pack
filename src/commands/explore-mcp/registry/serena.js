/**
 * Serena MCP Registry Entry
 *
 * Serena is a code-aware MCP server that provides semantic code navigation,
 * refactoring tools, and codebase understanding. When used within Claude Code,
 * the --context ide-assistant flag disables overlapping file/edit tools.
 */

/**
 * Serena MCP server definition
 * Uses uvx (Python) to run serena-mcp with IDE assistant context
 */
export const SERENA_MCP = {
  id: 'serena',
  name: 'Serena MCP',
  description: 'Semantic code navigation, refactoring, and codebase understanding via LSP',
  command: 'uvx',
  npmPackage: null,
  args: ['serena-mcp', '--context', 'ide-assistant'],
  category: 'development',
  requiredEnv: {},
  optionalEnv: {},
  relevantFor: ['all', 'python', 'typescript', 'javascript', 'rust', 'go', 'java'],
  recommended: true,
  tools: [
    'find_references', 'go_to_definition', 'get_hover_info',
    'rename_symbol', 'get_diagnostics', 'search_symbols',
  ],
  note: 'Requires uvx (Python). Uses --context ide-assistant to avoid tool overlap with Claude Code.',
};
