/**
 * L3 Worker Generator
 *
 * Generates project-specific L3 workers for atomic parallel tasks
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * L3 Worker types and their configurations
 */
const L3_WORKER_TYPES = {
  search: {
    subagentType: 'Explore',
    tools: ['Read', 'Grep', 'Glob'],
    description: 'Search worker',
    promptTemplate: (task) => `
You are an L3 Search Worker. Find files matching the query.

TASK: search
QUERY: ${task.query}
SCOPE: ${task.scope || '**/*'}

Search the specified scope for files/patterns matching the query.

Return results in this exact format:
\`\`\`
L3_RESULT: ${task.id}
STATUS: completed
DATA:
- [list each match as: filepath (line N: relevant content)]
FILES_FOUND: [count]
\`\`\`
`.trim(),
  },

  analyze: {
    subagentType: 'Explore',
    tools: ['Read', 'Glob'],
    description: 'Analysis worker',
    promptTemplate: (task) => `
You are an L3 Analysis Worker. Analyze the target for specific information.

TASK: analyze
TARGET: ${task.target}
QUESTION: ${task.question}

Read the target file(s) and answer the question.

Return results in this exact format:
\`\`\`
L3_RESULT: ${task.id}
STATUS: completed
DATA:
- [key finding 1]
- [key finding 2]
- [etc...]
ANALYSIS_COMPLETE: true
\`\`\`
`.trim(),
  },

  count: {
    subagentType: 'Explore',
    tools: ['Grep', 'Glob'],
    description: 'Count worker',
    promptTemplate: (task) => `
You are an L3 Count Worker. Count occurrences of a pattern.

TASK: count
PATTERN: ${task.pattern}
SCOPE: ${task.scope || '**/*'}

Count how many times the pattern appears.

Return results in this exact format:
\`\`\`
L3_RESULT: ${task.id}
STATUS: completed
DATA:
- Total occurrences: [N]
- Files affected: [N]
COUNT_COMPLETE: true
\`\`\`
`.trim(),
  },

  extract: {
    subagentType: 'Explore',
    tools: ['Read'],
    description: 'Extract worker',
    promptTemplate: (task) => `
You are an L3 Extract Worker. Extract specific data from a file.

TASK: extract
TARGET: ${task.target}
FIELDS: ${task.fields?.join(', ') || 'all'}

Read the file and extract the requested fields.

Return results in this exact format:
\`\`\`
L3_RESULT: ${task.id}
STATUS: completed
DATA:
${task.fields?.map(f => `- ${f}: [value]`).join('\n') || '- [extracted data]'}
EXTRACT_COMPLETE: true
\`\`\`
`.trim(),
  },

  validate: {
    subagentType: 'Bash',
    tools: ['Bash'],
    description: 'Validation worker',
    promptTemplate: (task) => `
You are an L3 Validation Worker. Run a validation command.

TASK: validate
COMMAND: ${task.command}
EXPECTED: ${task.expected || 'success (exit code 0)'}

Run the command and report the result.

Return results in this exact format:
\`\`\`
L3_RESULT: ${task.id}
STATUS: completed
DATA:
- Exit code: [N]
- Output: [brief summary]
- Matches expected: [yes/no]
VALIDATE_COMPLETE: true
\`\`\`
`.trim(),
  },

  lint: {
    subagentType: 'Bash',
    tools: ['Bash'],
    description: 'Lint worker',
    promptTemplate: (task) => `
You are an L3 Lint Worker. Run linting on specified files.

TASK: lint
FILES: ${task.files?.join(', ') || task.scope}
COMMAND: ${task.command || 'npm run lint'}

Run the lint command and report results.

Return results in this exact format:
\`\`\`
L3_RESULT: ${task.id}
STATUS: completed
DATA:
- Errors: [N]
- Warnings: [N]
- Files checked: [N]
LINT_COMPLETE: true
\`\`\`
`.trim(),
  },

  'github-issue-sync': {
    subagentType: 'Bash',
    tools: ['Read', 'Bash'],
    description: 'GitHub Issue Sync Worker',
    promptTemplate: (task) => `
You are an L3 GitHub Issue Sync Worker. Update GitHub issue with current progress.

TASK: github-issue-sync
ISSUE_NUMBER: ${task.issueNumber}
PROGRESS_FILE: ${task.progressFile}
CHANGES_SUMMARY: ${task.changesSummary || 'Progress update'}

Actions:
1. Read current issue body from GitHub
2. Update checkboxes for completed tasks
3. Update completion percentage in status line
4. Add execution log comment if milestone reached

Use gh CLI commands${task.repo ? ` (always include --repo ${task.repo})` : ''}:
- gh issue view ${task.issueNumber}${task.repo ? ` --repo ${task.repo}` : ''} --json body
- gh issue edit ${task.issueNumber}${task.repo ? ` --repo ${task.repo}` : ''} --body "$(cat <<'EOF'
[updated body content]
EOF
)"
- gh issue comment ${task.issueNumber}${task.repo ? ` --repo ${task.repo}` : ''} --body "$(cat <<'EOF'
[comment content]
EOF
)"

Fast execution requirements:
- Return immediately after completing updates
- Don't wait for confirmation or additional processing

Return results in this exact format:
\`\`\`
L3_RESULT: ${task.id}
STATUS: completed
DATA:
- Issue number: ${task.issueNumber}
- Checkboxes updated: [N]
- Completion: [N]%
- Comments added: [N]
SYNC_COMPLETE: true
\`\`\`
`.trim(),
  },
};

/**
 * Generate a unique L3 worker ID
 */
function generateWorkerId(type) {
  return `l3-${type}-${uuidv4().slice(0, 8)}`;
}

/**
 * Generate L3 worker configuration
 *
 * @param {string} taskType - Type of task (search, analyze, count, extract, validate, lint)
 * @param {object} taskDetails - Task-specific details
 * @param {object} options - Additional options
 * @returns {object} L3 worker configuration
 */
export function generateL3Worker(taskType, taskDetails, options = {}) {
  const workerType = L3_WORKER_TYPES[taskType];

  if (!workerType) {
    throw new Error(`Unknown L3 worker type: ${taskType}. Valid types: ${Object.keys(L3_WORKER_TYPES).join(', ')}`);
  }

  const workerId = options.id || generateWorkerId(taskType);
  const task = {
    id: workerId,
    ...taskDetails,
  };

  return {
    id: workerId,
    type: taskType,
    level: 'L3',
    subagentType: workerType.subagentType,
    model: options.model,
    tools: workerType.tools,
    description: `${workerType.description}: ${taskDetails.description || taskDetails.query || taskDetails.target || 'task'}`.slice(0, 50),
    prompt: workerType.promptTemplate(task),
    parentAgentId: options.parentAgentId,
    correlationId: options.correlationId,
    createdAt: new Date().toISOString(),
    status: 'pending',
    maxDuration: options.maxDuration || 30000, // 30 seconds default
  };
}

/**
 * Generate multiple L3 workers for parallel execution
 *
 * @param {array} tasks - Array of task definitions
 * @param {object} options - Shared options for all workers
 * @returns {array} Array of L3 worker configurations
 */
export function generateL3Workers(tasks, options = {}) {
  return tasks.map((task, index) => {
    const { type, ...details } = task;
    return generateL3Worker(type, details, {
      ...options,
      id: task.id || `${options.correlationId || 'batch'}-${index + 1}`,
    });
  });
}

/**
 * Generate L3 workers from a task breakdown
 *
 * @param {object} parentTask - Parent L2 task
 * @param {array} subtasks - Subtask definitions
 * @returns {array} Array of L3 worker configurations
 */
export function generateL3WorkersForTask(parentTask, subtasks) {
  const correlationId = parentTask.id || parentTask.taskId;

  return subtasks.map((subtask, index) => {
    // Infer type from subtask if not specified
    let type = subtask.type;
    if (!type) {
      if (subtask.query) type = 'search';
      else if (subtask.question) type = 'analyze';
      else if (subtask.pattern) type = 'count';
      else if (subtask.fields) type = 'extract';
      else if (subtask.command && subtask.expected) type = 'validate';
      else if (subtask.command && subtask.command.includes('lint')) type = 'lint';
      else if (subtask.issueNumber || subtask.progressFile) type = 'github-issue-sync';
      else type = 'search'; // default
    }

    return generateL3Worker(type, subtask, {
      id: subtask.id || `${correlationId}-sub${index + 1}`,
      parentAgentId: parentTask.agentId,
      correlationId,
    });
  });
}

/**
 * Parse L3 result from output
 *
 * @param {string} output - Agent output
 * @returns {object|null} Parsed result or null
 */
export function parseL3Result(output) {
  if (!output) return null;

  const resultMatch = output.match(/L3_RESULT:\s*(\S+)/);
  if (!resultMatch) return null;

  const statusMatch = output.match(/STATUS:\s*(\w+)/);
  const dataMatch = output.match(/DATA:\s*([\s\S]*?)(?:\n[A-Z_]+_COMPLETE:|$)/);
  const errorMatch = output.match(/ERROR:\s*(.+?)(?:\n|$)/);

  const result = {
    id: resultMatch[1],
    status: statusMatch ? statusMatch[1] : 'unknown',
    timestamp: new Date().toISOString(),
  };

  if (result.status === 'completed' && dataMatch) {
    // Parse data lines
    const dataLines = dataMatch[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-'))
      .map(line => line.slice(1).trim());

    result.data = dataLines;
    result.raw = dataMatch[1].trim();
  }

  if (result.status === 'failed' && errorMatch) {
    result.error = errorMatch[1].trim();
  }

  // Extract metrics
  const metricsMatch = output.match(/([A-Z_]+)_COMPLETE:\s*(true|false)/g);
  if (metricsMatch) {
    result.metrics = {};
    metricsMatch.forEach(m => {
      const [key, value] = m.split(':').map(s => s.trim());
      result.metrics[key.replace('_COMPLETE', '').toLowerCase()] = value === 'true';
    });
  }

  // Extract counts if present
  const filesFoundMatch = output.match(/FILES_FOUND:\s*(\d+)/);
  if (filesFoundMatch) {
    result.filesFound = parseInt(filesFoundMatch[1], 10);
  }

  const totalMatch = output.match(/Total occurrences:\s*(\d+)/);
  if (totalMatch) {
    result.totalOccurrences = parseInt(totalMatch[1], 10);
  }

  return result;
}

/**
 * Available worker types for external reference
 */
export const WORKER_TYPES = Object.keys(L3_WORKER_TYPES);

// Named export for L3_WORKER_TYPES
export { L3_WORKER_TYPES };

export default {
  generateL3Worker,
  generateL3Workers,
  generateL3WorkersForTask,
  parseL3Result,
  WORKER_TYPES,
  L3_WORKER_TYPES,
};
