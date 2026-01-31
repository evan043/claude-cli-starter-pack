/**
 * Hierarchy Validator Hook
 *
 * Validates that agent spawning follows the L1 → L2 → L3 hierarchy.
 * Ensures proper orchestration flow and prevents hierarchy violations.
 *
 * Event: SubagentStart
 * Triggers: When any subagent is spawned
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  stateDir: '.claude/orchestrator',
  stateFile: 'state.json',
  enforceHierarchy: true,
  allowedTransitions: {
    'main': ['L1', 'L2', 'L3'],  // Main conversation can spawn any level
    'L1': ['L2', 'L3'],          // L1 orchestrator can spawn L2 or L3
    'L2': ['L3'],                // L2 specialists can only spawn L3
    'L3': [],                    // L3 workers cannot spawn agents
  },
  levelPatterns: {
    L1: /orchestrator|coordinator|manager/i,
    L2: /specialist|expert|domain/i,
    L3: /worker|helper|search|analyze|atomic/i,
  },
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
 * Detect agent level from prompt/description
 */
function detectAgentLevel(prompt, description) {
  const combined = `${prompt || ''} ${description || ''}`.toLowerCase();

  // Explicit L level mentions
  if (combined.includes('l1') || combined.includes('level 1')) return 'L1';
  if (combined.includes('l2') || combined.includes('level 2')) return 'L2';
  if (combined.includes('l3') || combined.includes('level 3')) return 'L3';

  // Pattern-based detection
  for (const [level, pattern] of Object.entries(CONFIG.levelPatterns)) {
    if (pattern.test(combined)) {
      return level;
    }
  }

  // Model-based heuristics
  if (combined.includes('haiku')) return 'L3';
  if (combined.includes('sonnet')) return 'L2';
  if (combined.includes('opus')) return 'L1';

  // Default based on subagent type
  if (combined.includes('explore')) return 'L3';
  if (combined.includes('bash')) return 'L3';

  return 'L2'; // Default to L2
}

/**
 * Determine spawning agent's level
 */
function getSpawnerLevel(state, spawnerAgentId) {
  if (!spawnerAgentId || spawnerAgentId === 'main') {
    return 'main';
  }

  // Check active agents
  const activeAgent = state?.activeAgents?.find(a => a.agentId === spawnerAgentId);
  if (activeAgent?.level) {
    return activeAgent.level;
  }

  // Check completed agents in messages
  const messages = state?.messages || [];
  const agentMessage = messages.find(m =>
    m.sender === spawnerAgentId ||
    m.payload?.agentId === spawnerAgentId
  );

  if (agentMessage?.payload?.level) {
    return agentMessage.payload.level;
  }

  return 'main'; // Default to main if unknown
}

/**
 * Check if transition is allowed
 */
function isTransitionAllowed(spawnerLevel, spawneeLevel) {
  const allowed = CONFIG.allowedTransitions[spawnerLevel] || [];
  return allowed.includes(spawneeLevel);
}

/**
 * Format hierarchy violation message
 */
function formatViolationMessage(spawnerLevel, spawneeLevel) {
  return `
## Hierarchy Violation Detected

**Spawner Level:** ${spawnerLevel}
**Attempted Spawn:** ${spawneeLevel}

This violates the orchestration hierarchy:
- L1 (Orchestrator) → can spawn L2, L3
- L2 (Specialist) → can spawn L3 only
- L3 (Worker) → cannot spawn agents

### Allowed Transitions
${Object.entries(CONFIG.allowedTransitions)
    .map(([from, to]) => `- ${from} → ${to.join(', ') || 'none'}`)
    .join('\n')}

### Resolution
${spawnerLevel === 'L3' ?
    'L3 workers should return results, not spawn agents. Escalate to L2 if needed.' :
    `Only spawn ${CONFIG.allowedTransitions[spawnerLevel]?.join(' or ')} level agents.`}
`.trim();
}

/**
 * Update state with new agent
 */
function recordAgentSpawn(statePath, agentInfo) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  state.activeAgents.push({
    agentId: agentInfo.agentId,
    level: agentInfo.level,
    domain: agentInfo.domain || 'general',
    spawnedAt: new Date().toISOString(),
    spawnedBy: agentInfo.spawnedBy,
    status: 'running',
  });

  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Main hook handler
 */
async function hierarchyValidatorHook(context) {
  const {
    hookType,
    projectRoot,
    agentPrompt,
    agentDescription,
    agentId,
    parentAgentId,
  } = context;

  // Only process SubagentStart events
  if (hookType !== 'SubagentStart') {
    return { continue: true };
  }

  // Load orchestrator state
  const state = loadState(projectRoot);

  // If no orchestration active, allow with minimal checking
  if (!state || state.status !== 'active') {
    return { continue: true };
  }

  // Detect levels
  const spawneeLevel = detectAgentLevel(agentPrompt, agentDescription);
  const spawnerLevel = getSpawnerLevel(state, parentAgentId);

  // Check hierarchy
  const allowed = isTransitionAllowed(spawnerLevel, spawneeLevel);

  if (!allowed && CONFIG.enforceHierarchy) {
    // Block the spawn
    return {
      continue: false,
      message: formatViolationMessage(spawnerLevel, spawneeLevel),
      metadata: {
        hierarchyViolation: true,
        spawnerLevel,
        spawneeLevel,
        blocked: true,
      },
    };
  }

  // Record the spawn in state
  const statePath = path.join(projectRoot, CONFIG.stateDir, CONFIG.stateFile);
  try {
    recordAgentSpawn(statePath, {
      agentId: agentId || `${spawneeLevel.toLowerCase()}-${Date.now()}`,
      level: spawneeLevel,
      spawnedBy: parentAgentId || 'main',
    });
  } catch {
    // Continue even if recording fails
  }

  // Return with validation info
  return {
    continue: true,
    message: allowed ? undefined : `Warning: ${formatViolationMessage(spawnerLevel, spawneeLevel)}`,
    metadata: {
      hierarchyValidation: 'passed',
      spawnerLevel,
      spawneeLevel,
      allowed,
    },
  };
}

module.exports = hierarchyValidatorHook;

// Export for testing
module.exports.detectAgentLevel = detectAgentLevel;
module.exports.isTransitionAllowed = isTransitionAllowed;
module.exports.CONFIG = CONFIG;
