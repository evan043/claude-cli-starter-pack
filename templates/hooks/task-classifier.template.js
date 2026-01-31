/**
 * Task Classifier Hook
 *
 * UserPromptSubmit hook that classifies incoming tasks by domain
 * and suggests appropriate stack-specific agents.
 *
 * Hook Type: UserPromptSubmit
 * Trigger: Every user prompt before processing
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Load configuration files
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
 * Classify the task domain based on prompt content
 */
function classifyDomain(prompt, delegationConfig) {
  const promptLower = prompt.toLowerCase();
  const scores = {};
  const matches = {};

  for (const [domain, config] of Object.entries(delegationConfig.domains || {})) {
    scores[domain] = 0;
    matches[domain] = [];

    for (const keyword of config.keywords || []) {
      if (promptLower.includes(keyword.toLowerCase())) {
        scores[domain]++;
        matches[domain].push(keyword);
      }
    }
  }

  // Find best match
  let bestDomain = null;
  let bestScore = 0;
  for (const [domain, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  return { domain: bestDomain, score: bestScore, matches: matches[bestDomain] || [] };
}

/**
 * Get recommended agent name from tech stack and domain
 */
function getAgentName(domain, techStack, agentRegistry) {
  if (!domain || !agentRegistry?.agents) return null;

  // Find matching agent from registry
  const domainAgents = agentRegistry.agents.filter((a) => a.domain === domain);
  if (domainAgents.length === 0) return null;

  // Try to find framework-specific agent
  let framework = null;
  switch (domain) {
    case 'frontend':
      framework = techStack?.frontend?.framework?.toLowerCase();
      break;
    case 'backend':
      framework = techStack?.backend?.framework?.toLowerCase();
      break;
    case 'state':
      framework = techStack?.frontend?.stateManager?.toLowerCase();
      break;
    case 'database':
      framework = techStack?.database?.orm?.toLowerCase() || techStack?.database?.primary?.toLowerCase();
      break;
    case 'testing':
      framework = techStack?.testing?.e2e?.framework?.toLowerCase() || techStack?.testing?.unit?.framework?.toLowerCase();
      break;
    case 'deployment':
      framework =
        techStack?.deployment?.backend?.platform?.toLowerCase() || techStack?.deployment?.frontend?.platform?.toLowerCase();
      break;
  }

  // Find agent matching framework
  if (framework) {
    const frameworkAgent = domainAgents.find((a) => a.framework?.toLowerCase() === framework);
    if (frameworkAgent) return frameworkAgent.name;
  }

  // Return first domain agent as fallback
  return domainAgents[0].name;
}

/**
 * Main hook handler
 * @param {object} context - Hook context
 * @param {string} context.prompt - User's prompt
 * @returns {object} Hook result
 */
export async function handler(context) {
  const { prompt } = context;

  // Load configurations
  const delegationConfig = loadConfig('delegation.json');
  const techStack = loadConfig('tech-stack.json');
  const agentRegistry = loadConfig('agents.json');

  // Skip if delegation is disabled
  if (!delegationConfig?.enabled) {
    return { continue: true };
  }

  // Classify the task
  const classification = classifyDomain(prompt, delegationConfig);

  // Skip if no domain detected or low confidence
  if (!classification.domain || classification.score < 2) {
    return { continue: true };
  }

  // Get recommended agent
  const agentName = getAgentName(classification.domain, techStack, agentRegistry);

  if (!agentName) {
    return { continue: true };
  }

  // Handle based on delegation mode
  const mode = delegationConfig.mode || 'suggest';

  if (mode === 'suggest') {
    // Just add suggestion to context, let Claude decide
    return {
      continue: true,
      metadata: {
        taskClassification: {
          domain: classification.domain,
          matches: classification.matches,
          suggestedAgent: agentName,
        },
      },
      systemPromptAppend: `

[Task Classification]
This task appears to be related to: ${classification.domain}
Detected keywords: ${classification.matches.join(', ')}
Recommended agent: ${agentName}

Consider delegating this task to the ${agentName} agent for specialized handling.
Use: Task tool with description "${classification.domain} task" and appropriate prompt.
`,
    };
  }

  if (mode === 'auto') {
    // Auto-delegate to agent
    return {
      continue: true,
      metadata: {
        taskClassification: {
          domain: classification.domain,
          matches: classification.matches,
          delegatedTo: agentName,
        },
      },
      systemPromptAppend: `

[Auto-Delegation Active]
This task has been classified as: ${classification.domain}
Automatically delegating to: ${agentName}

You MUST use the Task tool to delegate this task to ${agentName}.
Do not attempt to handle this task directly.
`,
    };
  }

  if (mode === 'enforce') {
    // Enforce delegation with blocking message
    return {
      continue: true,
      metadata: {
        taskClassification: {
          domain: classification.domain,
          matches: classification.matches,
          enforcedAgent: agentName,
        },
      },
      systemPromptAppend: `

[DELEGATION ENFORCED]
This task MUST be delegated to: ${agentName}
Domain: ${classification.domain}
Matched keywords: ${classification.matches.join(', ')}

CRITICAL: You are NOT allowed to use Edit, Write, or Bash tools directly.
You MUST delegate this task using the Task tool.

Example delegation:
\`\`\`
Task tool:
  description: "${classification.domain} implementation"
  prompt: "${prompt}"
  subagent_type: "${agentName}"
\`\`\`
`,
    };
  }

  return { continue: true };
}

/**
 * Hook configuration
 */
export const config = {
  name: 'task-classifier',
  type: 'UserPromptSubmit',
  description: 'Classifies tasks by domain and suggests stack-specific agents',
  enabled: true,
};
