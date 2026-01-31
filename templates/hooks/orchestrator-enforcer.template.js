/**
 * Orchestrator Enforcer Hook
 *
 * Enforces delegation hierarchy when orchestration is active.
 * Prevents direct tool usage that should go through L2 specialists.
 *
 * Event: PreToolUse
 * Triggers: Before Edit, Write, or Bash operations
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  stateDir: '.claude/orchestrator',
  stateFile: 'state.json',
  enforcedTools: ['Edit', 'Write', 'Bash'],
  exemptPatterns: [
    /\.claude\//,           // Allow .claude directory modifications
    /PROGRESS\.json$/,      // Allow progress updates
    /node_modules\//,       // Allow package operations
    /\.git\//,              // Allow git operations
  ],
  exemptCommands: [
    /^git\s/,               // Git commands
    /^npm\s(test|run|install)/,  // NPM commands
    /^npx\s/,               // NPX commands
    /^gh\s/,                // GitHub CLI
    /^lint/,                // Linting
    /^test/,                // Testing
  ],
  mode: 'suggest', // 'suggest' | 'warn' | 'enforce'
};

/**
 * Load orchestrator state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateDir, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Check if file path is exempt
 */
function isPathExempt(filePath) {
  if (!filePath) return false;
  return CONFIG.exemptPatterns.some(pattern => pattern.test(filePath));
}

/**
 * Check if command is exempt
 */
function isCommandExempt(command) {
  if (!command) return false;
  return CONFIG.exemptCommands.some(pattern => pattern.test(command));
}

/**
 * Detect domain from file path
 */
function detectDomainFromPath(filePath) {
  if (!filePath) return 'general';

  const pathLower = filePath.toLowerCase();

  // Frontend patterns
  if (pathLower.match(/\.(tsx?|jsx?)$/) &&
      (pathLower.includes('component') || pathLower.includes('page') ||
       pathLower.includes('/ui/') || pathLower.includes('/views/'))) {
    return 'frontend';
  }

  // Backend patterns
  if (pathLower.match(/\.(py|ts|js)$/) &&
      (pathLower.includes('route') || pathLower.includes('api') ||
       pathLower.includes('service') || pathLower.includes('model') ||
       pathLower.includes('controller'))) {
    return 'backend';
  }

  // Testing patterns
  if (pathLower.match(/\.(test|spec)\.(ts|js|tsx|jsx|py)$/) ||
      pathLower.includes('/test/') || pathLower.includes('/__tests__/')) {
    return 'testing';
  }

  // Deployment patterns
  if (pathLower.match(/dockerfile|docker-compose|\.ya?ml$/) ||
      pathLower.includes('deploy') || pathLower.includes('ci')) {
    return 'deployment';
  }

  return 'general';
}

/**
 * Check if current agent is authorized for the operation
 */
function isAuthorized(state, domain, agentId) {
  // Check if there's an active agent for this domain
  const activeAgent = state.activeAgents?.find(a =>
    a.domain === domain || a.domain === 'general'
  );

  if (activeAgent) {
    return {
      authorized: true,
      agent: activeAgent,
    };
  }

  return {
    authorized: false,
    suggestedAgent: `l2-${domain}-specialist`,
  };
}

/**
 * Format delegation suggestion message
 */
function formatSuggestion(domain, filePath) {
  return `
## Delegation Suggested

The orchestrator detected a **${domain}** operation on:
\`${filePath}\`

Consider delegating this task to an L2 specialist:
- Use \`Task\` tool with \`subagent_type: general-purpose\`
- Include task details and file path
- The specialist will report completion back

Example:
\`\`\`
Task({
  description: "L2 ${domain} task",
  prompt: "Work on ${filePath}...",
  subagent_type: "general-purpose"
})
\`\`\`

This ensures proper tracking in PROGRESS.json and GitHub sync.
`.trim();
}

/**
 * Main hook handler
 */
async function orchestratorEnforcerHook(context) {
  const { tool, toolInput, projectRoot, hookType, agentId } = context;

  // Only process PreToolUse events
  if (hookType !== 'PreToolUse') {
    return { continue: true };
  }

  // Only enforce on specific tools
  if (!CONFIG.enforcedTools.includes(tool)) {
    return { continue: true };
  }

  // Load orchestrator state
  const state = loadState(projectRoot);

  // If no orchestration active, allow
  if (!state || state.status !== 'active') {
    return { continue: true };
  }

  // Get file path or command
  const filePath = toolInput?.file_path || toolInput?.path;
  const command = toolInput?.command;

  // Check exemptions
  if (isPathExempt(filePath) || isCommandExempt(command)) {
    return { continue: true };
  }

  // Detect domain
  const domain = detectDomainFromPath(filePath);

  // Check authorization
  const authResult = isAuthorized(state, domain, agentId);

  if (authResult.authorized) {
    // Agent is authorized, allow with note
    return {
      continue: true,
      metadata: {
        orchestratorCheck: 'passed',
        domain,
        authorizedAgent: authResult.agent?.agentId,
      },
    };
  }

  // Handle based on mode
  switch (CONFIG.mode) {
    case 'enforce':
      // Block the operation
      return {
        continue: false,
        message: `Operation blocked by orchestrator enforcer.\n\n${formatSuggestion(domain, filePath || command)}`,
        metadata: {
          orchestratorCheck: 'blocked',
          domain,
          suggestedAgent: authResult.suggestedAgent,
        },
      };

    case 'warn':
      // Warn but allow
      return {
        continue: true,
        message: `Warning: Direct ${tool} operation detected.\n\n${formatSuggestion(domain, filePath || command)}`,
        metadata: {
          orchestratorCheck: 'warned',
          domain,
          suggestedAgent: authResult.suggestedAgent,
        },
      };

    case 'suggest':
    default:
      // Just suggest, don't warn
      return {
        continue: true,
        metadata: {
          orchestratorCheck: 'suggested',
          domain,
          suggestedAgent: authResult.suggestedAgent,
          hint: `Consider delegating to ${authResult.suggestedAgent}`,
        },
      };
  }
}

module.exports = orchestratorEnforcerHook;

// Export for testing
module.exports.detectDomainFromPath = detectDomainFromPath;
module.exports.isPathExempt = isPathExempt;
module.exports.isCommandExempt = isCommandExempt;
module.exports.CONFIG = CONFIG;
