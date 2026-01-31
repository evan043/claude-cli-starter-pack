/**
 * L3 Parallel Executor Hook
 *
 * Monitors L2 agent requests for parallel L3 tasks and
 * manages background execution of L3 workers.
 *
 * Event: PostToolUse
 * Triggers: When L2 agent outputs L3_REQUEST patterns
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  stateDir: '.claude/orchestrator',
  stateFile: 'state.json',
  l3RequestPattern: /L3_REQUEST:\s*(\S+)/g,
  maxConcurrentWorkers: 5,
  defaultTimeout: 30000,
  requestExtractors: {
    type: /TYPE:\s*(\w+)/,
    description: /DESCRIPTION:\s*(.+?)(?:\n|$)/,
    scope: /SCOPE:\s*(.+?)(?:\n|$)/,
    parallel: /PARALLEL:\s*(true|false)/i,
  },
};

/**
 * Parse L3 request from agent output
 */
function parseL3Request(output) {
  if (!output) return [];

  const requests = [];
  let match;

  // Reset regex
  CONFIG.l3RequestPattern.lastIndex = 0;

  while ((match = CONFIG.l3RequestPattern.exec(output)) !== null) {
    const requestId = match[1];
    const requestBlock = output.slice(match.index, output.indexOf('\n\n', match.index) || undefined);

    const request = {
      id: requestId,
      type: 'search', // default
      description: '',
      scope: '**/*',
      parallel: true,
    };

    // Extract fields
    for (const [field, pattern] of Object.entries(CONFIG.requestExtractors)) {
      const fieldMatch = requestBlock.match(pattern);
      if (fieldMatch) {
        let value = fieldMatch[1].trim();
        if (field === 'parallel') {
          value = value.toLowerCase() === 'true';
        }
        request[field] = value;
      }
    }

    requests.push(request);
  }

  return requests;
}

/**
 * Load orchestrator state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateDir, CONFIG.stateFile);

  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return {
      data: JSON.parse(fs.readFileSync(statePath, 'utf8')),
      path: statePath,
    };
  } catch {
    return null;
  }
}

/**
 * Queue L3 workers in orchestrator state
 */
function queueL3Workers(statePath, workers, parentAgentId) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  workers.forEach(worker => {
    // Add to pending messages for orchestrator to process
    state.messages.push({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'l3_spawn_request',
      sender: parentAgentId,
      recipient: 'orchestrator',
      timestamp: new Date().toISOString(),
      processed: false,
      payload: {
        workerId: worker.id,
        type: worker.type,
        description: worker.description,
        scope: worker.scope,
        parallel: worker.parallel,
        parentAgentId,
      },
    });
  });

  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  return workers.length;
}

/**
 * Check for completed L3 workers
 */
function getCompletedWorkers(statePath, workerIds) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  const completed = state.messages
    .filter(m =>
      m.type === 'l3_result' &&
      workerIds.includes(m.payload?.workerId || m.payload?.id)
    )
    .map(m => m.payload);

  return completed;
}

/**
 * Generate L3 worker Task tool calls
 */
function generateWorkerTaskCalls(workers) {
  return workers.map(worker => {
    const promptMap = {
      search: `Search for: ${worker.description}\nScope: ${worker.scope}\n\nReturn results as:\nL3_RESULT: ${worker.id}\nSTATUS: completed\nDATA:\n- [findings]`,
      analyze: `Analyze: ${worker.description}\nTarget: ${worker.scope}\n\nReturn results as:\nL3_RESULT: ${worker.id}\nSTATUS: completed\nDATA:\n- [analysis]`,
      count: `Count occurrences: ${worker.description}\nScope: ${worker.scope}\n\nReturn results as:\nL3_RESULT: ${worker.id}\nSTATUS: completed\nDATA:\n- Total: [N]`,
      extract: `Extract: ${worker.description}\nFrom: ${worker.scope}\n\nReturn results as:\nL3_RESULT: ${worker.id}\nSTATUS: completed\nDATA:\n- [extracted data]`,
    };

    return {
      tool: 'Task',
      params: {
        subagent_type: worker.type === 'search' || worker.type === 'analyze' ? 'Explore' : 'Bash',
        description: `L3 ${worker.type}: ${worker.description.slice(0, 30)}`,
        prompt: promptMap[worker.type] || promptMap.search,
        model: 'haiku',
        run_in_background: worker.parallel,
      },
    };
  });
}

/**
 * Format spawned workers message
 */
function formatSpawnMessage(workers) {
  let message = `\n## L3 Workers Queued\n\n`;
  message += `Spawning ${workers.length} L3 worker(s) for parallel execution:\n\n`;

  workers.forEach((worker, index) => {
    message += `${index + 1}. **${worker.id}** (${worker.type})\n`;
    message += `   - ${worker.description}\n`;
    message += `   - Scope: \`${worker.scope}\`\n`;
  });

  message += `\nWorkers will execute in ${workers[0]?.parallel ? 'parallel' : 'sequence'}.\n`;
  message += `Results will be aggregated when all complete.\n`;

  return message;
}

/**
 * Main hook handler
 */
async function l3ParallelExecutorHook(context) {
  const { tool, toolOutput, projectRoot, hookType, agentId } = context;

  // Only process PostToolUse events
  if (hookType !== 'PostToolUse') {
    return { continue: true };
  }

  // Only process after Task tool (L2 agent output)
  // Or after Write/Edit that might contain L3 requests
  if (!['Task', 'Write', 'Edit'].includes(tool)) {
    return { continue: true };
  }

  // Parse L3 requests from output
  const l3Requests = parseL3Request(toolOutput);

  if (l3Requests.length === 0) {
    return { continue: true };
  }

  // Load orchestrator state
  const stateInfo = loadState(projectRoot);
  if (!stateInfo || stateInfo.data.status !== 'active') {
    // No active orchestration, just inform
    return {
      continue: true,
      message: `Detected ${l3Requests.length} L3 request(s) but no active orchestration. Run /phase-track to enable orchestrated execution.`,
    };
  }

  // Limit concurrent workers
  const activeL3Count = stateInfo.data.activeAgents.filter(a => a.level === 'L3').length;
  const availableSlots = CONFIG.maxConcurrentWorkers - activeL3Count;

  if (availableSlots <= 0) {
    return {
      continue: true,
      message: `L3 worker limit reached (${CONFIG.maxConcurrentWorkers}). Queuing ${l3Requests.length} request(s) for later execution.`,
    };
  }

  // Take only what we can handle
  const workersToSpawn = l3Requests.slice(0, availableSlots);

  // Queue workers in state
  queueL3Workers(stateInfo.path, workersToSpawn, agentId);

  // Generate Task tool calls for workers
  const taskCalls = generateWorkerTaskCalls(workersToSpawn);

  return {
    continue: true,
    message: formatSpawnMessage(workersToSpawn),
    metadata: {
      l3WorkersQueued: workersToSpawn.length,
      workerIds: workersToSpawn.map(w => w.id),
      taskCalls,
    },
  };
}

module.exports = l3ParallelExecutorHook;

// Export for testing
module.exports.parseL3Request = parseL3Request;
module.exports.generateWorkerTaskCalls = generateWorkerTaskCalls;
module.exports.CONFIG = CONFIG;
