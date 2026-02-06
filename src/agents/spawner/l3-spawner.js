/**
 * L3 Worker Spawner
 *
 * Provides L3 worker agent configuration generation.
 */

import { v4 as uuidv4 } from 'uuid';
import { AGENT_CONFIGS } from './config.js';

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
