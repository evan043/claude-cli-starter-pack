/**
 * Delegation Enforcer Hook
 *
 * PreToolUse hook that enforces agent-only mode by blocking
 * direct tool usage and requiring delegation to specialists.
 *
 * This hook is used in agent-only mode to ensure all code
 * modifications go through the appropriate specialist agents.
 *
 * Hook Type: PreToolUse
 * Trigger: Before any tool execution
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Load configuration file
 */
function loadConfig(filename) {
  const configPath = join(process.cwd(), '.claude', 'config', filename);
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Check if a command matches exempt patterns
 */
function isExemptCommand(command, exemptPatterns) {
  for (const pattern of exemptPatterns) {
    if (new RegExp(pattern).test(command)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if file path matches any domain patterns
 */
function detectDomainFromFile(filePath, delegationConfig) {
  for (const [domain, config] of Object.entries(delegationConfig.domains || {})) {
    for (const pattern of config.filePatterns || []) {
      const regex = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '<<<DOUBLE>>>')
        .replace(/\*/g, '[^/]*')
        .replace(/<<<DOUBLE>>>/g, '.*');

      if (new RegExp(`^${regex}$`).test(filePath) || new RegExp(`${regex}$`).test(filePath)) {
        return domain;
      }
    }
  }
  return null;
}

/**
 * Get agent suggestion for domain
 */
function getAgentForDomain(domain, techStack, agentRegistry) {
  if (!agentRegistry?.agents) return null;

  const domainAgents = agentRegistry.agents.filter((a) => a.domain === domain);
  if (domainAgents.length === 0) return null;

  // Framework mapping
  const frameworkMap = {
    frontend: techStack?.frontend?.framework,
    backend: techStack?.backend?.framework,
    state: techStack?.frontend?.stateManager,
    database: techStack?.database?.orm || techStack?.database?.primary,
    testing: techStack?.testing?.e2e?.framework || techStack?.testing?.unit?.framework,
    deployment: techStack?.deployment?.backend?.platform || techStack?.deployment?.frontend?.platform,
  };

  const framework = frameworkMap[domain]?.toLowerCase();

  if (framework) {
    const frameworkAgent = domainAgents.find((a) => a.framework?.toLowerCase() === framework);
    if (frameworkAgent) return frameworkAgent.name;
  }

  return domainAgents[0].name;
}

/**
 * Main hook handler
 * @param {object} context - Hook context
 * @param {string} context.tool - Tool being invoked
 * @param {object} context.args - Tool arguments
 * @returns {object} Hook result
 */
export async function handler(context) {
  const { tool, args } = context;

  // Load configurations
  const delegationConfig = loadConfig('delegation.json');
  const techStack = loadConfig('tech-stack.json');
  const agentRegistry = loadConfig('agents.json');

  // Skip if agent-only mode is not enabled
  if (!delegationConfig?.agentOnlyMode?.enabled) {
    return { continue: true };
  }

  // Check if tool is restricted
  const restrictedTools = delegationConfig.agentOnlyMode.restrictedTools || ['Edit', 'Write', 'Bash'];

  if (!restrictedTools.includes(tool)) {
    return { continue: true };
  }

  // For Bash, check if command is exempt
  if (tool === 'Bash' && args.command) {
    const exemptPatterns = delegationConfig.agentOnlyMode.exemptPatterns || [];
    if (isExemptCommand(args.command, exemptPatterns)) {
      return { continue: true };
    }
  }

  // Detect domain from file path
  let domain = null;
  let filePath = null;

  if (tool === 'Edit' || tool === 'Write') {
    filePath = args.file_path || args.path;
    if (filePath) {
      domain = detectDomainFromFile(filePath, delegationConfig);
    }
  }

  // Get suggested agent
  const suggestedAgent = domain ? getAgentForDomain(domain, techStack, agentRegistry) : null;

  // Build enforcement message
  let blockMessage = `
[AGENT-ONLY MODE ENFORCED]

Direct use of ${tool} tool is not allowed in agent-only mode.
You must delegate this task to a specialist agent using the Task tool.
`;

  if (domain && suggestedAgent) {
    blockMessage += `
Detected domain: ${domain}
Suggested agent: ${suggestedAgent}
${filePath ? `File: ${filePath}` : ''}

Example delegation:
\`\`\`
Task tool:
  description: "${domain} modification"
  prompt: "Modify ${filePath || 'the file'} to..."
  subagent_type: "${suggestedAgent}"
\`\`\`
`;
  } else {
    blockMessage += `
To delegate this task:
1. Identify the appropriate specialist agent for this task
2. Use the Task tool with:
   - A clear description
   - The full context needed
   - subagent_type matching the specialist

Available specialists by domain:
- Frontend: frontend-*-specialist
- Backend: backend-*-specialist
- Database: db-*-specialist or orm-*-specialist
- Testing: test-*-specialist
- Deployment: deploy-*-specialist
`;
  }

  // In enforce mode, block the tool
  if (delegationConfig.mode === 'enforce') {
    return {
      continue: false,
      reason: blockMessage,
    };
  }

  // In auto or suggest mode, warn but allow
  return {
    continue: true,
    metadata: {
      agentOnlyWarning: true,
      suggestedAgent,
      domain,
    },
    systemPromptAppend: blockMessage,
  };
}

/**
 * Hook configuration
 */
export const config = {
  name: 'delegation-enforcer',
  type: 'PreToolUse',
  description: 'Enforces agent-only mode by blocking direct tool usage',
  enabled: true,
  // Only enable this hook when agent-only mode is explicitly activated
  conditional: 'delegationConfig.agentOnlyMode.enabled === true',
};
