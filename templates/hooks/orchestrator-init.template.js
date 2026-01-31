/**
 * Orchestrator Initialization Hook
 *
 * Detects when phase-dev or roadmap commands are invoked and
 * initializes the orchestrator state for coordinated execution.
 *
 * Event: UserPromptSubmit
 * Triggers: When user runs /phase-dev-plan or /create-roadmap with orchestration
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  stateDir: '.claude/orchestrator',
  stateFile: 'state.json',
  triggerPatterns: [
    /\/phase-dev-plan/i,
    /\/create-roadmap/i,
    /orchestrat/i,
  ],
  orchestrationKeywords: [
    'orchestrated',
    'orchestration',
    'L1',
    'L2',
    'L3',
    'coordinate',
    'agents',
  ],
};

/**
 * Check if prompt requests orchestrated execution
 */
function detectOrchestratorRequest(prompt) {
  // Check for direct command triggers
  const hasCommandTrigger = CONFIG.triggerPatterns.some(pattern => pattern.test(prompt));

  // Check for orchestration keywords
  const promptLower = prompt.toLowerCase();
  const hasOrchestrationKeyword = CONFIG.orchestrationKeywords.some(kw => promptLower.includes(kw));

  return {
    triggered: hasCommandTrigger || hasOrchestrationKeyword,
    type: hasCommandTrigger ? 'command' : hasOrchestrationKeyword ? 'keyword' : null,
  };
}

/**
 * Load existing orchestrator state if any
 */
function loadExistingState(projectRoot) {
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
 * Find PROGRESS.json files in project
 */
function findProgressFiles(projectRoot) {
  const progressFiles = [];
  const docsDir = path.join(projectRoot, '.claude', 'docs');

  if (!fs.existsSync(docsDir)) {
    return progressFiles;
  }

  const entries = fs.readdirSync(docsDir, { withFileTypes: true });

  entries.forEach(entry => {
    if (entry.isDirectory()) {
      const progressPath = path.join(docsDir, entry.name, 'PROGRESS.json');
      if (fs.existsSync(progressPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
          progressFiles.push({
            path: progressPath,
            relativePath: `.claude/docs/${entry.name}/PROGRESS.json`,
            planId: data.plan_id,
            planName: data.plan_name,
            status: data.status,
            data: data,
          });
        } catch {
          // Skip invalid JSON
        }
      }
    }
  });

  return progressFiles;
}

/**
 * Generate orchestrator context injection
 */
function generateOrchestratorContext(existingState, progressFiles) {
  let context = `
## Orchestrator Status

`;

  if (existingState && existingState.status === 'active') {
    context += `**Active Orchestration Detected**

- **Plan:** ${existingState.planId}
- **Current Phase:** ${existingState.currentPhase}
- **Tasks Completed:** ${existingState.metrics?.tasksCompleted || 0}
- **Active Agents:** ${existingState.activeAgents?.length || 0}

The orchestrator is already running. You can:
1. Continue the current orchestration
2. View status with \`/phase-track ${existingState.planId}\`
3. Pause orchestration to start a new plan

`;
  } else if (progressFiles.length > 0) {
    context += `**Available Plans for Orchestration**

`;
    progressFiles.forEach((pf, index) => {
      const completedPhases = pf.data.phases?.filter(p => p.status === 'completed').length || 0;
      const totalPhases = pf.data.phases?.length || 0;
      context += `${index + 1}. **${pf.planName}** (\`${pf.planId}\`)
   - Status: ${pf.status}
   - Progress: ${completedPhases}/${totalPhases} phases
   - Path: \`${pf.relativePath}\`

`;
    });

    context += `To enable orchestrated execution, specify the plan ID or create a new plan with orchestration enabled.

`;
  } else {
    context += `**No Active Plans**

Create a new phase development plan with orchestration:
- Use \`/phase-dev-plan\` and select "Orchestrated" mode
- Or use \`/create-roadmap\` for multi-phase projects

`;
  }

  context += `### Orchestration Commands

- \`/phase-track <plan-id>\` - View plan progress
- \`/orchestration-guide\` - Learn about L1/L2/L3 agents
`;

  return context;
}

/**
 * Main hook handler
 */
async function orchestratorInitHook(context) {
  const { prompt, projectRoot, hookType } = context;

  // Only process UserPromptSubmit events
  if (hookType !== 'UserPromptSubmit') {
    return { continue: true };
  }

  // Check if orchestration is being requested
  const detection = detectOrchestratorRequest(prompt);

  if (!detection.triggered) {
    return { continue: true };
  }

  // Load existing orchestrator state
  const existingState = loadExistingState(projectRoot);

  // Find available PROGRESS.json files
  const progressFiles = findProgressFiles(projectRoot);

  // Generate context to inject
  const orchestratorContext = generateOrchestratorContext(existingState, progressFiles);

  // Return with context injection
  return {
    continue: true,
    message: orchestratorContext,
    metadata: {
      orchestratorInit: true,
      hasActiveOrchestration: existingState?.status === 'active',
      availablePlans: progressFiles.map(pf => pf.planId),
    },
  };
}

module.exports = orchestratorInitHook;

// Export for testing
module.exports.detectOrchestratorRequest = detectOrchestratorRequest;
module.exports.findProgressFiles = findProgressFiles;
module.exports.generateOrchestratorContext = generateOrchestratorContext;
module.exports.CONFIG = CONFIG;
