/**
 * PROGRESS.json generator for phased development plans.
 * Generates the core progress tracking structure.
 */

/**
 * Generate active form for a task title (present continuous)
 */
function generateTaskActiveForm(title) {
  if (!title) return 'Working on task';

  const words = title.split(' ');
  const verb = words[0].toLowerCase();

  const verbMap = {
    'set': 'Setting',
    'add': 'Adding',
    'create': 'Creating',
    'implement': 'Implementing',
    'build': 'Building',
    'configure': 'Configuring',
    'fix': 'Fixing',
    'update': 'Updating',
    'write': 'Writing',
    'run': 'Running',
    'test': 'Testing',
    'deploy': 'Deploying',
    'check': 'Checking',
    'verify': 'Verifying',
    'compact': 'Compacting',
    'identify': 'Identifying',
  };

  const activeVerb = verbMap[verb] || `${verb.charAt(0).toUpperCase()}${verb.slice(1)}ing`;
  words[0] = activeVerb;
  return words.join(' ');
}

/**
 * Generate mandatory orchestration system tasks for a phase.
 * These are injected automatically and appear in progress tracking.
 * System tasks ensure compacting, context checks, and batch planning
 * are explicit steps - not invisible hook behavior.
 */
function generateSystemTasks(phaseIdx, orchestrationCfg) {
  const orch = orchestrationCfg || {};
  const threshold = orch.compact_threshold_percent || 40;
  const usedThreshold = 100 - threshold;
  const maxAgents = orch.max_parallel_agents || 2;
  const batchStrategy = orch.batch_strategy || 'no_file_overlap';
  const phaseNum = phaseIdx + 1;

  return {
    pre: [
      {
        id: `${phaseNum}.0-context-check`,
        title: `Check context usage and compact if >${usedThreshold}% used`,
        subject: `Context health check before Phase ${phaseNum}`,
        activeForm: `Checking context usage before Phase ${phaseNum}`,
        description: `Read context utilization. If >${usedThreshold}% used (<${threshold}% remaining), run /compact before proceeding. This is a mandatory gate - do NOT skip. Save PROGRESS.json before compacting.`,
        status: 'pending',
        task_type: 'system',
        files: [],
        acceptance_criteria: [
          `Context usage is below ${usedThreshold}% (at least ${threshold}% remaining)`,
          'If threshold exceeded, compaction was performed before continuing',
        ],
        specificity: { score: 100, breakdown: { system: true } },
        blocks: [],
        blockedBy: [],
        assignedAgent: null,
        codePatternRef: null,
      },
      {
        id: `${phaseNum}.0-batch-plan`,
        title: `Identify independent task batches (max ${maxAgents}, ${batchStrategy})`,
        subject: `Batch planning for Phase ${phaseNum}`,
        activeForm: `Planning task batches for Phase ${phaseNum}`,
        description: `Analyze remaining implementation tasks in this phase. Group up to ${maxAgents} tasks that have no shared files (${batchStrategy} strategy) into execution batches. Tasks sharing files or with dependency links must be in separate batches. Output: ordered list of batches with agent assignments.`,
        status: 'pending',
        task_type: 'orchestration',
        files: [],
        acceptance_criteria: [
          `Batches contain at most ${maxAgents} tasks each`,
          'No two tasks in the same batch modify the same file',
          'Task dependencies are respected across batches',
        ],
        specificity: { score: 100, breakdown: { system: true } },
        blocks: [],
        blockedBy: [`${phaseNum}.0-context-check`],
        assignedAgent: null,
        codePatternRef: null,
      },
    ],
    post: [
      {
        id: `${phaseNum}.99-compact`,
        title: 'Compact context after all tasks in this phase complete',
        subject: `Post-phase compaction for Phase ${phaseNum}`,
        activeForm: `Compacting context after Phase ${phaseNum}`,
        description: 'Run /compact to free context. Verify PROGRESS.json is saved before compacting. This preserves progress and prevents context overflow before the next phase.',
        status: 'pending',
        task_type: 'system',
        files: [],
        acceptance_criteria: [
          'All phase implementation tasks are marked completed in PROGRESS.json',
          'Context was compacted successfully',
          `Remaining context is at least ${threshold}%`,
        ],
        specificity: { score: 100, breakdown: { system: true } },
        blocks: [],
        blockedBy: [], // Dynamically wired to last implementation task
        assignedAgent: null,
        codePatternRef: null,
      },
      {
        id: `${phaseNum}.99-gate`,
        title: 'Verify all tasks complete in PROGRESS.json, compact before next phase',
        subject: `Phase ${phaseNum} completion gate`,
        activeForm: `Verifying Phase ${phaseNum} completion gate`,
        description: 'Re-read PROGRESS.json from disk (not memory). Verify every task in this phase has status completed or task.completed === true. If any task is incomplete, HALT. Do NOT proceed to the next phase. This is a hard sequential gate.',
        status: 'pending',
        task_type: 'system',
        files: [],
        acceptance_criteria: [
          'All tasks in this phase show completed in PROGRESS.json (read from disk)',
          'Phase status is set to completed',
          'Context is healthy for next phase',
        ],
        specificity: { score: 100, breakdown: { system: true } },
        blocks: [],
        blockedBy: [`${phaseNum}.99-compact`],
        assignedAgent: null,
        codePatternRef: null,
      },
    ],
  };
}

/**
 * Generate PROGRESS.json structure
 */
export function generateProgressJson(config) {
  const {
    projectName,
    projectSlug,
    description,
    scale,
    phases,
    architecture = {},
    enhancements = [],
    agentRegistry = null,
    ralphLoop = null,
    l2Exploration = null,
    workflow = null,
    parentContext = null,
    orchestrationConfig = null,
  } = config;

  const timestamp = new Date().toISOString();

  // Helper to determine recommended agent for a phase based on its focus
  const getRecommendedAgent = (phase) => {
    // First check if phase has assigned agent from L2 exploration
    if (phase.assignedAgent) return phase.assignedAgent;

    if (!agentRegistry || !agentRegistry.agents) return null;

    const phaseLower = (`${phase.name  } ${  phase.description}`).toLowerCase();

    // Match phase to domain
    if (phaseLower.match(/frontend|ui|component|react|vue|style|css/)) {
      return agentRegistry.agents.find((a) => a.domain === 'frontend')?.name || null;
    }
    if (phaseLower.match(/backend|api|endpoint|server|route|auth/)) {
      return agentRegistry.agents.find((a) => a.domain === 'backend')?.name || null;
    }
    if (phaseLower.match(/database|schema|migration|model|query/)) {
      return agentRegistry.agents.find((a) => a.domain === 'database')?.name || null;
    }
    if (phaseLower.match(/test|e2e|spec|coverage/)) {
      return agentRegistry.agents.find((a) => a.domain === 'testing')?.name || null;
    }
    if (phaseLower.match(/deploy|ci|cd|docker|build/)) {
      return agentRegistry.agents.find((a) => a.domain === 'deployment')?.name || null;
    }
    return null;
  };

  return JSON.stringify(
    {
      project: {
        name: projectName,
        slug: projectSlug,
        description,
        scale,
        created: timestamp,
        lastUpdated: timestamp,
      },
      metadata: {
        version: '3.0',
        generator: 'gtask create-phase-dev',
        successProbability: 0.95,
        enhancements,
        agentsAvailable: !!agentRegistry,
        l2ExplorationEnabled: !!l2Exploration,
      },
      // Embedded orchestration directives for parallel agent execution,
      // batching, and mandatory compacting. These are read by executor
      // templates instead of relying on hardcoded values or hooks.
      orchestration: orchestrationConfig || {
        mode: 'parallel',
        max_parallel_agents: 2,
        batch_strategy: 'no_file_overlap',
        compact_threshold_percent: 40,
        poll_interval_seconds: 120,
        compact_after_launch: true,
        compact_after_poll: true,
        agent_model: 'sonnet',
      },
      parent_context: parentContext ? {
        type: parentContext.type,
        id: parentContext.id,
        slug: parentContext.slug,
        title: parentContext.title,
        roadmap_id: parentContext.roadmap_id || null,
        epic_id: parentContext.epic_id || null,
      } : null,
      tech_stack: {
        frontend: architecture.frontend || null,
        backend: architecture.backend || null,
        database: architecture.database || null,
        deployment: architecture.deployment || null,
        auto_detected: architecture.autoDetected || false,
      },
      agent_assignments: agentRegistry
        ? {
            available: true,
            count: agentRegistry.agents?.length || 0,
            byDomain: agentRegistry.agents?.reduce((acc, a) => {
              acc[a.domain] = a.name;
              return acc;
            }, {}),
          }
        : { available: false },
      testing_config: {
        ralph_loop: ralphLoop || {
          enabled: !!architecture.testing?.e2e,
          testCommand: architecture.testing?.e2eCommand || architecture.testing?.unitCommand || 'npm test',
          maxIterations: 10,
          autoStart: false,
          validateAfterEachPhase: true,
        },
        e2e_framework: architecture.testing?.e2e || null,
        unit_framework: architecture.testing?.unit || architecture.testing?.framework || null,
        testingAgentAvailable: agentRegistry?.agents?.some((a) => a.domain === 'testing') || false,
        testingAgentName: agentRegistry?.agents?.find((a) => a.domain === 'testing')?.name || null,
      },
      // Workflow configuration for branch/issue/worktree management
      workflow: workflow || {
        github_issue: {
          enabled: false,
          issue_number: null,
          issue_url: null,
          auto_close: true,
          update_on_task_complete: true,
        },
        branch: {
          enabled: false,
          branch_name: null,
          base_branch: 'main',
          auto_create: false,
        },
        worktree: {
          enabled: false,
          worktree_path: null,
          auto_create: false,
        },
        project_board: {
          enabled: false,
          project_number: null,
          column_mapping: {
            pending: 'Todo',
            in_progress: 'In Progress',
            completed: 'Done',
          },
        },
      },
      // L2 Exploration metadata (if parallel exploration was enabled)
      l2Exploration: l2Exploration
        ? {
            enabled: true,
            explorationPath: l2Exploration.explorationPath || `.claude/exploration/${projectSlug}`,
            filesAnalyzed: l2Exploration.filesAnalyzed || 0,
            snippetsExtracted: l2Exploration.snippetsExtracted || 0,
            confidence: l2Exploration.confidence || 'medium',
            primaryAgent: l2Exploration.primaryAgent || null,
            domains: l2Exploration.domains || {},
          }
        : { enabled: false },
      phases: phases.map((phase, idx) => {
        const phaseNum = phase.id || idx + 1;
        const systemTasks = generateSystemTasks(idx, orchestrationConfig);

        // Build implementation tasks with new fields
        const implTasks = phase.tasks.map((task, taskIdx) => ({
          id: task.id || `${phaseNum}.${taskIdx + 1}`,
          title: task.title,
          // TaskCreate compatibility fields
          subject: task.subject || task.title,
          activeForm: task.activeForm || generateTaskActiveForm(task.title),
          description: task.description,
          status: task.status || 'pending',
          // Task type classification
          task_type: task.task_type || 'implementation',
          // Parallel execution fields
          run_in_background: task.run_in_background || false,
          batch_group: task.batch_group || null,
          // Enhanced file references with snippets
          files: (task.files || []).map((f) =>
            typeof f === 'string'
              ? { path: f, relevance: 'reference', reason: 'Referenced file' }
              : {
                  path: f.path,
                  relevance: f.relevance || 'reference',
                  reason: f.reason || 'Referenced file',
                  snippet: f.snippet || null,
                }
          ),
          acceptance_criteria: task.acceptanceCriteria || task.acceptance_criteria || [],
          // Specificity scoring
          specificity: task.specificity || { score: 50, breakdown: {} },
          // Task dependencies
          blocks: task.blocks || [],
          blockedBy: task.blockedBy || task.blocked_by || [],
          // Agent assignment
          assignedAgent: task.assignedAgent || null,
          // Code pattern reference (link to CODE_SNIPPETS.md)
          codePatternRef: task.codePatternRef || null,
        }));

        // Wire post-compact task to depend on the last implementation task
        if (implTasks.length > 0) {
          const lastTaskId = implTasks[implTasks.length - 1].id;
          systemTasks.post[0].blockedBy = [lastTaskId];
        }

        return {
          id: phaseNum,
          phase_id: `phase-${phaseNum}`,
          name: phase.name,
          description: phase.description,
          objective: phase.objective || phase.description,
          complexity: phase.complexity || 'M',
          status: idx === 0 ? 'not_started' : 'blocked',
          prerequisites: phase.prerequisites || [],
          dependencies: phase.dependencies || (idx > 0 ? [`phase-${idx}`] : []),
          assignedAgent: getRecommendedAgent(phase),
          // Tasks: system pre-tasks + implementation tasks + system post-tasks
          tasks: [...systemTasks.pre, ...implTasks, ...systemTasks.post],
          validation: {
            criteria: phase.validationCriteria || [],
            tests: phase.tests || [],
          },
        };
      }),
      execution_log: [],
      checkpoints: [],
    },
    null,
    2
  );
}
