/**
 * Agent Spawner Utility
 *
 * Provides functions for spawning L2 specialists and L3 workers
 * from the L1 orchestrator.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent level configurations
 */
const AGENT_CONFIGS = {
  L2: {
    frontend: {
      subagentType: 'general-purpose',
      tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
      description: 'L2 Frontend Specialist',
    },
    backend: {
      subagentType: 'general-purpose',
      tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
      description: 'L2 Backend Specialist',
    },
    testing: {
      subagentType: 'general-purpose',
      tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
      description: 'L2 Testing Specialist',
    },
    deployment: {
      subagentType: 'general-purpose',
      tools: ['Read', 'Bash', 'Glob', 'Grep'],
      description: 'L2 Deployment Specialist',
    },
    general: {
      subagentType: 'general-purpose',
      tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
      description: 'L2 General Specialist',
    },
  },
  L3: {
    search: {
      subagentType: 'Explore',
      tools: ['Read', 'Glob', 'Grep'],
      description: 'L3 Search Worker',
    },
    analyze: {
      subagentType: 'Explore',
      tools: ['Read', 'Glob', 'Grep'],
      description: 'L3 Analysis Worker',
    },
    execute: {
      subagentType: 'Bash',
      tools: ['Bash'],
      description: 'L3 Execution Worker',
    },
  },
};

/**
 * Domain detection keywords
 */
const DOMAIN_KEYWORDS = {
  frontend: [
    'react', 'vue', 'angular', 'svelte', 'component', 'ui', 'css', 'style',
    'tailwind', 'jsx', 'tsx', 'html', 'dom', 'browser', 'client', 'layout',
    'button', 'form', 'input', 'modal', 'page', 'route', 'navigation'
  ],
  backend: [
    'api', 'server', 'endpoint', 'database', 'db', 'model', 'schema', 'query',
    'fastapi', 'express', 'django', 'flask', 'rest', 'graphql', 'middleware',
    'authentication', 'authorization', 'jwt', 'session', 'repository'
  ],
  testing: [
    'test', 'spec', 'jest', 'vitest', 'playwright', 'cypress', 'pytest',
    'mock', 'stub', 'fixture', 'assertion', 'coverage', 'e2e', 'unit',
    'integration', 'snapshot', 'expect'
  ],
  deployment: [
    'deploy', 'ci', 'cd', 'pipeline', 'docker', 'kubernetes', 'aws', 'gcp',
    'azure', 'vercel', 'railway', 'cloudflare', 'nginx', 'ssl', 'domain',
    'environment', 'production', 'staging'
  ],
};

/**
 * Detect task domain from task details
 */
export function detectTaskDomain(task) {
  const searchText = `${task.title} ${task.details || ''} ${task.file || ''}`.toLowerCase();

  const scores = {};
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    scores[domain] = keywords.filter(kw => searchText.includes(kw)).length;
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'general';

  return Object.entries(scores).find(([, score]) => score === maxScore)[0];
}

/**
 * Generate L2 agent spawn configuration
 */
export function generateL2Config(task, phase, plan, orchestratorState) {
  const domain = detectTaskDomain(task);
  const config = AGENT_CONFIGS.L2[domain] || AGENT_CONFIGS.L2.general;
  const agentId = `l2-${domain}-${uuidv4().slice(0, 8)}`;

  const prompt = `
You are an L2 ${domain} specialist working under the Phase Orchestrator.

## Your Task
- **Task ID:** ${task.id}
- **Title:** ${task.title}
- **Details:** ${task.details || 'No additional details'}
- **Target File:** ${task.file || 'Not specified'}

## Context
- **Phase:** ${phase.name} (${phase.phase_id})
- **Plan:** ${plan.plan_name}
- **Plan ID:** ${plan.plan_id}

## Instructions
1. Complete the task described above
2. Follow existing code patterns in the codebase
3. Run tests/lint after making changes if applicable
4. Report completion using the exact format below

## Completion Report Format
When you complete the task, output this EXACTLY:

\`\`\`
TASK_COMPLETE: ${task.id}
STATUS: completed
ARTIFACTS: [comma-separated list of files modified]
SUMMARY: Brief description of what was done
\`\`\`

If you encounter a blocker:

\`\`\`
TASK_BLOCKED: ${task.id}
BLOCKER: Description of what's blocking
\`\`\`

If the task fails:

\`\`\`
TASK_FAILED: ${task.id}
ERROR: Description of the error
\`\`\`

## Constraints
- Stay within scope of the task
- Do not modify unrelated files
- If requirements are unclear, make reasonable assumptions and document them
`.trim();

  return {
    agentId,
    level: 'L2',
    domain,
    taskId: task.id,
    subagentType: config.subagentType,
    description: `${config.description}: ${task.title.slice(0, 50)}`,
    prompt,
    spawnedAt: new Date().toISOString(),
    status: 'running',
  };
}

/**
 * Generate L3 worker spawn configuration
 */
export function generateL3Config(subtask, parentAgentId, taskType = 'search') {
  const config = AGENT_CONFIGS.L3[taskType] || AGENT_CONFIGS.L3.search;
  const agentId = `l3-${taskType}-${uuidv4().slice(0, 8)}`;

  const prompt = `
You are an L3 worker performing a single atomic task.

## Task
${subtask.description}

## Instructions
1. Execute the task with focus and precision
2. Return results in the exact format below

## Result Format
\`\`\`
L3_RESULT: ${subtask.id}
STATUS: completed
DATA: [Your findings or results]
\`\`\`
`.trim();

  return {
    agentId,
    level: 'L3',
    taskType,
    subtaskId: subtask.id,
    parentAgentId,
    subagentType: config.subagentType,
    description: `${config.description}: ${subtask.description.slice(0, 30)}`,
    prompt,
    spawnedAt: new Date().toISOString(),
    status: 'running',
  };
}

/**
 * Parse agent completion report from output
 */
export function parseCompletionReport(output) {
  // Check for TASK_COMPLETE
  const completeMatch = output.match(/TASK_COMPLETE:\s*(\S+)/);
  if (completeMatch) {
    const artifactsMatch = output.match(/ARTIFACTS:\s*\[([^\]]*)\]/);
    const summaryMatch = output.match(/SUMMARY:\s*(.+?)(?:\n|$)/);

    return {
      type: 'completed',
      taskId: completeMatch[1],
      artifacts: artifactsMatch ? artifactsMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [],
      summary: summaryMatch ? summaryMatch[1].trim() : '',
    };
  }

  // Check for TASK_BLOCKED
  const blockedMatch = output.match(/TASK_BLOCKED:\s*(\S+)/);
  if (blockedMatch) {
    const blockerMatch = output.match(/BLOCKER:\s*(.+?)(?:\n|$)/);

    return {
      type: 'blocked',
      taskId: blockedMatch[1],
      blocker: blockerMatch ? blockerMatch[1].trim() : 'Unknown blocker',
    };
  }

  // Check for TASK_FAILED
  const failedMatch = output.match(/TASK_FAILED:\s*(\S+)/);
  if (failedMatch) {
    const errorMatch = output.match(/ERROR:\s*(.+?)(?:\n|$)/);

    return {
      type: 'failed',
      taskId: failedMatch[1],
      error: errorMatch ? errorMatch[1].trim() : 'Unknown error',
    };
  }

  // Check for L3_RESULT
  const l3Match = output.match(/L3_RESULT:\s*(\S+)/);
  if (l3Match) {
    const dataMatch = output.match(/DATA:\s*(.+?)(?:\n|$)/s);

    return {
      type: 'l3_completed',
      subtaskId: l3Match[1],
      data: dataMatch ? dataMatch[1].trim() : '',
    };
  }

  return null;
}

/**
 * Update orchestrator state with agent status
 */
export function updateAgentInState(statePath, agentId, status, result = null) {
  if (!fs.existsSync(statePath)) {
    throw new Error(`Orchestrator state not found: ${statePath}`);
  }

  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  // Find agent in activeAgents
  const agentIndex = state.activeAgents.findIndex(a => a.agentId === agentId);

  if (agentIndex >= 0) {
    const agent = state.activeAgents[agentIndex];
    agent.status = status;
    agent.completedAt = new Date().toISOString();

    if (result) {
      agent.result = result;
    }

    // Move to appropriate list based on status
    if (status === 'completed') {
      state.completedTasks.push(agent.taskId);
      state.metrics.tasksCompleted++;
    } else if (status === 'failed') {
      state.failedTasks.push({
        taskId: agent.taskId,
        error: result?.error || 'Unknown error',
        failedAt: new Date().toISOString(),
      });
      state.metrics.tasksFailed++;
    }

    // Remove from active
    state.activeAgents.splice(agentIndex, 1);
  }

  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  return state;
}

/**
 * Add agent to orchestrator state
 */
export function addAgentToState(statePath, agentConfig) {
  if (!fs.existsSync(statePath)) {
    throw new Error(`Orchestrator state not found: ${statePath}`);
  }

  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  state.activeAgents.push({
    agentId: agentConfig.agentId,
    taskId: agentConfig.taskId || agentConfig.subtaskId,
    level: agentConfig.level,
    domain: agentConfig.domain || agentConfig.taskType,
    spawnedAt: agentConfig.spawnedAt,
    status: agentConfig.status,
    parentAgentId: agentConfig.parentAgentId,
  });

  state.metrics.totalAgentsSpawned++;
  if (agentConfig.level === 'L2') {
    state.metrics.l2AgentsSpawned++;
  } else if (agentConfig.level === 'L3') {
    state.metrics.l3AgentsSpawned++;
  }

  // Remove from pending if present
  const pendingIndex = state.pendingTasks.indexOf(agentConfig.taskId);
  if (pendingIndex >= 0) {
    state.pendingTasks.splice(pendingIndex, 1);
  }

  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  return state;
}

/**
 * Initialize orchestrator state for a plan
 */
export function initializeOrchestratorState(projectRoot, planId, planPath, progressData, githubConfig = null) {
  const stateDir = path.join(projectRoot, '.claude', 'orchestrator');
  const statePath = path.join(stateDir, 'state.json');

  // Create directory if needed
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  // Extract all task IDs
  const allTasks = [];
  if (progressData.phases) {
    progressData.phases.forEach(phase => {
      if (phase.tasks) {
        phase.tasks.forEach(task => {
          if (task.status !== 'completed') {
            allTasks.push(task.id);
          }
        });
      }
    });
  }

  // Find first non-completed phase
  const currentPhase = progressData.phases?.find(p => p.status !== 'completed')?.phase_id || 'P1';

  const state = {
    planId,
    planPath,
    initialized: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    status: 'active',
    currentPhase,
    activeAgents: [],
    completedTasks: [],
    pendingTasks: allTasks,
    failedTasks: [],
    blockedTasks: [],
    tokenBudget: {
      used: 0,
      limit: 100000,
      compactionThreshold: 0.8,
    },
    githubConfig: githubConfig || { enabled: false },
    messages: [],
    metrics: {
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksBlocked: 0,
      totalAgentsSpawned: 0,
      l2AgentsSpawned: 0,
      l3AgentsSpawned: 0,
      averageTaskDuration: 0,
      totalDuration: 0,
    },
    checkpoints: [],
  };

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  return { state, statePath };
}

/**
 * Load orchestrator state
 */
export function loadOrchestratorState(projectRoot) {
  const statePath = path.join(projectRoot, '.claude', 'orchestrator', 'state.json');

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
 * Create checkpoint for session recovery
 */
export function createCheckpoint(statePath, summary) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  const checkpoint = {
    checkpointId: uuidv4(),
    createdAt: new Date().toISOString(),
    phase: state.currentPhase,
    lastCompletedTask: state.completedTasks[state.completedTasks.length - 1] || null,
    summary,
  };

  state.checkpoints.push(checkpoint);
  state.lastUpdated = new Date().toISOString();

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  return checkpoint;
}

// Named exports for direct imports
export { AGENT_CONFIGS, DOMAIN_KEYWORDS };

export default {
  detectTaskDomain,
  generateL2Config,
  generateL3Config,
  parseCompletionReport,
  updateAgentInState,
  addAgentToState,
  initializeOrchestratorState,
  loadOrchestratorState,
  createCheckpoint,
  AGENT_CONFIGS,
  DOMAIN_KEYWORDS,
};
