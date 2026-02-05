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
  };

  const activeVerb = verbMap[verb] || `${verb.charAt(0).toUpperCase()}${verb.slice(1)}ing`;
  words[0] = activeVerb;
  return words.join(' ');
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
  } = config;

  const timestamp = new Date().toISOString();

  // Helper to determine recommended agent for a phase based on its focus
  const getRecommendedAgent = (phase) => {
    // First check if phase has assigned agent from L2 exploration
    if (phase.assignedAgent) return phase.assignedAgent;

    if (!agentRegistry || !agentRegistry.agents) return null;

    const phaseLower = (phase.name + ' ' + phase.description).toLowerCase();

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
        version: '2.2',
        generator: 'gtask create-phase-dev',
        successProbability: 0.95,
        enhancements,
        agentsAvailable: !!agentRegistry,
        l2ExplorationEnabled: !!l2Exploration,
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
      phases: phases.map((phase, idx) => ({
        id: phase.id || idx + 1,
        phase_id: `phase-${phase.id || idx + 1}`,
        name: phase.name,
        description: phase.description,
        objective: phase.objective || phase.description,
        complexity: phase.complexity || 'M',
        status: idx === 0 ? 'not_started' : 'blocked',
        prerequisites: phase.prerequisites || [],
        dependencies: phase.dependencies || (idx > 0 ? [`phase-${idx}`] : []),
        assignedAgent: getRecommendedAgent(phase),
        tasks: phase.tasks.map((task, taskIdx) => ({
          id: task.id || `${idx + 1}.${taskIdx + 1}`,
          title: task.title,
          // TaskCreate compatibility fields
          subject: task.subject || task.title,
          activeForm: task.activeForm || generateTaskActiveForm(task.title),
          description: task.description,
          status: task.status || 'pending',
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
        })),
        validation: {
          criteria: phase.validationCriteria || [],
          tests: phase.tests || [],
        },
      })),
      execution_log: [],
      checkpoints: [],
    },
    null,
    2
  );
}
