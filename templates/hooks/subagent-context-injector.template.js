/**
 * Subagent Context Injector Hook
 *
 * Injects relevant orchestrator context into spawned agents
 * at startup to provide necessary state information.
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
  contextFields: [
    'planId',
    'currentPhase',
    'completedTasks',
    'pendingTasks',
    'githubConfig',
  ],
  maxContextSize: 2000, // characters
};

/**
 * Load orchestrator state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateDir, CONFIG.stateFile);

  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Load PROGRESS.json for phase context
 */
function loadProgress(projectRoot, planPath) {
  const progressPath = path.isAbsolute(planPath)
    ? planPath
    : path.join(projectRoot, planPath);

  if (!fs.existsSync(progressPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Get relevant messages for the agent
 */
function getRelevantMessages(state, agentId, limit = 5) {
  return state.messages
    .filter(m =>
      (m.recipient === agentId || m.recipient === 'all') &&
      !m.processed
    )
    .slice(-limit);
}

/**
 * Extract task assignment from agent prompt
 */
function extractTaskFromPrompt(prompt) {
  const taskIdMatch = prompt?.match(/Task ID:\s*(\S+)/i);
  const taskTitleMatch = prompt?.match(/Title:\s*(.+?)(?:\n|$)/i);

  if (taskIdMatch) {
    return {
      taskId: taskIdMatch[1],
      title: taskTitleMatch ? taskTitleMatch[1].trim() : null,
    };
  }

  return null;
}

/**
 * Get current phase details from progress
 */
function getCurrentPhaseDetails(progress, phaseId) {
  if (!progress?.phases) return null;

  const phase = progress.phases.find(p => p.phase_id === phaseId);
  if (!phase) return null;

  return {
    id: phase.phase_id,
    name: phase.name,
    status: phase.status,
    totalTasks: phase.tasks?.length || 0,
    completedTasks: phase.tasks?.filter(t => t.status === 'completed').length || 0,
    successCriteria: phase.success_criteria?.slice(0, 3), // First 3 criteria
  };
}

/**
 * Build context for L2 agent
 */
function buildL2Context(state, progress, taskInfo) {
  const phase = getCurrentPhaseDetails(progress, state.currentPhase);

  let context = `## Orchestration Context\n\n`;
  context += `**Plan:** ${progress?.plan_name || state.planId}\n`;
  context += `**Current Phase:** ${phase?.name || state.currentPhase} (${phase?.completedTasks || 0}/${phase?.totalTasks || 0} tasks)\n`;

  if (taskInfo) {
    context += `**Your Task:** ${taskInfo.taskId}${taskInfo.title ? ` - ${taskInfo.title}` : ''}\n`;
  }

  context += `\n### Completed in This Phase\n`;
  const phaseCompleted = state.completedTasks.filter(t => t.startsWith(state.currentPhase));
  if (phaseCompleted.length > 0) {
    phaseCompleted.forEach(t => {
      context += `- [x] ${t}\n`;
    });
  } else {
    context += `- None yet\n`;
  }

  if (state.blockedTasks?.length > 0) {
    context += `\n### Blockers\n`;
    state.blockedTasks.forEach(b => {
      context += `- ${b.taskId}: ${b.blocker}\n`;
    });
  }

  if (state.githubConfig?.enabled && state.githubConfig?.issueNumber) {
    context += `\n**GitHub Issue:** #${state.githubConfig.issueNumber}\n`;
  }

  return context;
}

/**
 * Build context for L3 worker
 */
function buildL3Context(state, parentTask) {
  let context = `## Worker Context\n\n`;
  context += `**Parent Task:** ${parentTask?.taskId || 'unknown'}\n`;
  context += `**Phase:** ${state.currentPhase}\n`;
  context += `\nExecute your assigned subtask and return results in the specified format.\n`;

  return context;
}

/**
 * Detect agent level from prompt or description
 */
function detectAgentLevel(agentPrompt, agentDescription) {
  const combined = `${agentPrompt || ''} ${agentDescription || ''}`.toLowerCase();

  if (combined.includes('l3') || combined.includes('worker') || combined.includes('atomic')) {
    return 'L3';
  }
  if (combined.includes('l2') || combined.includes('specialist') || combined.includes('domain')) {
    return 'L2';
  }
  if (combined.includes('l1') || combined.includes('orchestrator')) {
    return 'L1';
  }

  // Default based on model hint
  if (combined.includes('haiku')) return 'L3';
  if (combined.includes('sonnet')) return 'L2';

  return 'L2'; // default
}

/**
 * Main hook handler
 */
async function subagentContextInjectorHook(context) {
  const { hookType, projectRoot, agentPrompt, agentDescription, agentId } = context;

  // Only process SubagentStart events
  if (hookType !== 'SubagentStart') {
    return { continue: true };
  }

  // Load orchestrator state
  const state = loadState(projectRoot);

  // If no orchestration active, don't inject
  if (!state || state.status !== 'active') {
    return { continue: true };
  }

  // Load progress for additional context
  const progress = loadProgress(projectRoot, state.planPath);

  // Detect agent level
  const level = detectAgentLevel(agentPrompt, agentDescription);

  // Extract task info from prompt
  const taskInfo = extractTaskFromPrompt(agentPrompt);

  // Build appropriate context
  let injectedContext;

  if (level === 'L3') {
    // Minimal context for L3 workers
    injectedContext = buildL3Context(state, taskInfo);
  } else {
    // Fuller context for L2 specialists
    injectedContext = buildL2Context(state, progress, taskInfo);
  }

  // Get pending messages for this agent
  const messages = getRelevantMessages(state, agentId || 'all');
  if (messages.length > 0) {
    injectedContext += `\n### Pending Messages\n`;
    messages.forEach(m => {
      injectedContext += `- [${m.type}] ${m.payload?.summary || JSON.stringify(m.payload).slice(0, 100)}\n`;
    });
  }

  // Truncate if too long
  if (injectedContext.length > CONFIG.maxContextSize) {
    injectedContext = injectedContext.slice(0, CONFIG.maxContextSize) + '\n...(truncated)';
  }

  return {
    continue: true,
    message: injectedContext,
    metadata: {
      contextInjected: true,
      agentLevel: level,
      taskId: taskInfo?.taskId,
      phaseId: state.currentPhase,
    },
  };
}

module.exports = subagentContextInjectorHook;

// Export for testing
module.exports.buildL2Context = buildL2Context;
module.exports.buildL3Context = buildL3Context;
module.exports.detectAgentLevel = detectAgentLevel;
module.exports.CONFIG = CONFIG;
