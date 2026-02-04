/**
 * Phase Plan Generator
 *
 * Generates phase-dev-plan JSON files from roadmap phases.
 * Each phase gets its own PROGRESS.json for tracking.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import chalk from 'chalk';
import { loadRoadmap, saveRoadmap } from './roadmap-manager.js';
import { suggestAgents } from './intelligence.js';
import { COMPLEXITY } from './schema.js';

/**
 * Default phase-plans directory
 * NOTE: This is the legacy location. New roadmaps store phase plans in .claude/roadmaps/{slug}/
 */
const PHASE_PLANS_DIR = '.claude/phase-plans';

/**
 * Load tech-stack.json to get testing and tunnel configuration
 */
function loadTechStack(cwd = process.cwd()) {
  const paths = [
    join(cwd, '.claude', 'config', 'tech-stack.json'),
    join(cwd, '.claude', 'tech-stack.json'),
    join(cwd, 'tech-stack.json'),
  ];

  for (const techStackPath of paths) {
    if (existsSync(techStackPath)) {
      try {
        return JSON.parse(readFileSync(techStackPath, 'utf8'));
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * Get testing environment URL - prefers tunnel URL over localhost
 */
function getTestingBaseUrl(techStack, options = {}) {
  // If explicitly provided in options, use that
  if (options.baseUrl) {
    return options.baseUrl;
  }

  // Check for configured tunnel URL first (preferred for E2E testing)
  const tunnel = techStack?.devEnvironment?.tunnel;
  if (tunnel && tunnel.service !== 'none' && tunnel.url) {
    return tunnel.url;
  }

  // Check testing configuration for baseUrl
  if (techStack?.testing?.e2e?.baseUrl) {
    return techStack.testing.e2e.baseUrl;
  }

  if (techStack?.testing?.environment?.baseUrl) {
    return techStack.testing.environment.baseUrl;
  }

  // Fallback to localhost with configured port
  const port = techStack?.frontend?.port || options.port || 5173;
  return `http://localhost:${port}`;
}

/**
 * Generate testing configuration from tech-stack.json
 * Prefers tunnel URL over localhost for E2E testing
 */
function generateTestingConfig(options = {}, cwd = process.cwd()) {
  const techStack = loadTechStack(cwd);
  const baseUrl = getTestingBaseUrl(techStack, options);
  const tunnel = techStack?.devEnvironment?.tunnel;
  const testing = techStack?.testing || {};

  // Determine environment type
  let envType = 'localhost';
  if (tunnel && tunnel.service !== 'none' && tunnel.url) {
    envType = tunnel.service; // ngrok, localtunnel, cloudflare-tunnel, etc.
  } else if (baseUrl && !baseUrl.includes('localhost')) {
    envType = 'production';
  }

  return {
    ralph_loop: {
      enabled: options.ralphLoopEnabled ?? true,
      testCommand: testing.e2e?.testCommand || 'npx playwright test',
      maxIterations: options.maxIterations || 10,
      autoStart: options.ralphAutoStart || false,
    },
    e2e_framework: testing.e2e?.framework || options.e2eFramework || null,
    environment: {
      type: envType,
      baseUrl: baseUrl,
      tunnelService: tunnel?.service || 'none',
      tunnelUrl: tunnel?.url || null,
    },
    selectors: testing.selectors || {
      username: '[data-testid="username-input"]',
      password: '[data-testid="password-input"]',
      loginButton: '[data-testid="login-submit"]',
      loginSuccess: '[data-testid="dashboard"]',
    },
    credentials: {
      usernameEnvVar: testing.credentials?.usernameEnvVar || 'TEST_USER_USERNAME',
      passwordEnvVar: testing.credentials?.passwordEnvVar || 'TEST_USER_PASSWORD',
    },
  };
}

/**
 * Get the phase plans directory for a roadmap
 * Supports both new consolidated structure and legacy structure
 *
 * New structure: .claude/roadmaps/{slug}/ (phase files alongside ROADMAP.json)
 * Legacy structure: .claude/phase-plans/{slug}/
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} cwd - Current working directory
 * @param {boolean} useConsolidated - Use new consolidated structure (default: true)
 * @returns {string} Path to phase plans directory
 */
export function getPhasePlansDir(roadmapSlug, cwd = process.cwd(), useConsolidated = true) {
  // Check if roadmap is using new consolidated structure
  const consolidatedRoadmapPath = join(cwd, '.claude/roadmaps', roadmapSlug, 'ROADMAP.json');

  if (useConsolidated || existsSync(consolidatedRoadmapPath)) {
    // New structure: phase files live in same dir as ROADMAP.json
    return join(cwd, '.claude/roadmaps', roadmapSlug);
  }

  // Legacy structure
  return join(cwd, PHASE_PLANS_DIR, roadmapSlug);
}

/**
 * Ensure phase plans directory exists
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} cwd - Current working directory
 * @param {boolean} useConsolidated - Use new consolidated structure (default: true)
 * @returns {string} Path to directory
 */
export function ensurePhasePlansDir(roadmapSlug, cwd = process.cwd(), useConsolidated = true) {
  const dir = getPhasePlansDir(roadmapSlug, cwd, useConsolidated);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Generate a phase-dev-plan (PROGRESS.json) for a phase
 *
 * @param {Object} phase - Phase from roadmap
 * @param {Object} roadmap - Parent roadmap
 * @param {Object} options - Generation options
 * @param {string} cwd - Current working directory
 * @returns {Object} Generated plan
 */
export function generatePhasePlan(phase, roadmap, options = {}, cwd = process.cwd()) {
  const complexity = phase.complexity || 'M';
  const complexityInfo = COMPLEXITY[complexity];

  // Generate tasks from phase info
  const tasks = generateTasksFromPhase(phase);

  // Get agent suggestions
  const agents = suggestAgents(phase);

  const plan = {
    // Identification
    plan_id: `${roadmap.slug}-${phase.phase_id}`,
    phase_id: phase.phase_id,
    roadmap_id: roadmap.roadmap_id,
    roadmap_slug: roadmap.slug,

    // Descriptive
    project_name: phase.phase_title,
    description: phase.goal || '',
    scale: complexity,

    // Target success rate
    target_success: 0.95,

    // Agent assignments
    agent_assignments: {
      available: agents.length > 0,
      count: agents.length,
      suggested: agents,
      current: phase.agents_assigned || [],
    },

    // Phases (for phase-dev-plan compatibility)
    phases: [{
      id: 1,
      name: phase.phase_title,
      status: phase.status || 'pending',
      tasks: tasks.map((t, i) => ({
        id: `1.${i + 1}`,
        description: t.description,
        completed: t.completed || false,
        blocked: t.blocked || false,
        blockedBy: t.blockedBy || null,
      })),
      success_criteria: phase.outputs || [],
    }],

    // Tasks summary
    metrics: {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.completed).length,
      currentPhase: 1,
      totalPhases: 1,
      estimatedEffort: complexityInfo?.estimatedHours || '8-16',
    },

    // Inputs
    inputs: {
      issues: phase.inputs?.issues || [],
      docs: phase.inputs?.docs || [],
      prompts: phase.inputs?.prompts || [],
    },

    // Expected outputs
    outputs: phase.outputs || [],

    // Dependencies
    dependencies: {
      phases: phase.dependencies || [],
      resolved: false, // Will be checked at runtime
    },

    // Testing config - reads from tech-stack.json with tunnel URL preference
    testing_config: generateTestingConfig(options, cwd),

    // Timestamps
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
  };

  return plan;
}

/**
 * Generate tasks from phase information
 */
function generateTasksFromPhase(phase) {
  const tasks = [];

  // Generate from prompts
  if (phase.inputs?.prompts?.length > 0) {
    for (const prompt of phase.inputs.prompts) {
      tasks.push({
        description: prompt,
        completed: false,
      });
    }
  }

  // Generate from outputs (deliverables)
  if (phase.outputs?.length > 0) {
    for (const output of phase.outputs) {
      tasks.push({
        description: `Deliver: ${output}`,
        completed: false,
      });
    }
  }

  // Generate standard tasks based on domain
  const goal = (phase.goal || '').toLowerCase();
  const title = (phase.phase_title || '').toLowerCase();

  if (goal.includes('setup') || title.includes('foundation')) {
    if (tasks.length === 0) {
      tasks.push({ description: 'Set up project structure', completed: false });
      tasks.push({ description: 'Configure dependencies', completed: false });
      tasks.push({ description: 'Create base files', completed: false });
    }
  }

  if (goal.includes('api') || title.includes('backend')) {
    if (!tasks.some(t => t.description.toLowerCase().includes('endpoint'))) {
      tasks.push({ description: 'Implement API endpoints', completed: false });
      tasks.push({ description: 'Add input validation', completed: false });
      tasks.push({ description: 'Write API tests', completed: false });
    }
  }

  if (goal.includes('ui') || title.includes('frontend')) {
    if (!tasks.some(t => t.description.toLowerCase().includes('component'))) {
      tasks.push({ description: 'Build UI components', completed: false });
      tasks.push({ description: 'Add styling', completed: false });
      tasks.push({ description: 'Connect to API', completed: false });
    }
  }

  if (goal.includes('test') || title.includes('testing')) {
    if (!tasks.some(t => t.description.toLowerCase().includes('test'))) {
      tasks.push({ description: 'Write unit tests', completed: false });
      tasks.push({ description: 'Write integration tests', completed: false });
      tasks.push({ description: 'Run test suite and fix failures', completed: false });
    }
  }

  // Ensure at least one task
  if (tasks.length === 0) {
    tasks.push({ description: 'Complete phase implementation', completed: false });
    tasks.push({ description: 'Verify deliverables', completed: false });
  }

  return tasks;
}

/**
 * Generate phase plans for all phases in a roadmap
 *
 * @param {string} roadmapName - Roadmap name or slug
 * @param {Object} options - Generation options
 * @param {string} cwd - Current working directory
 * @returns {Object} Generation result
 */
export async function generateAllPhasePlans(roadmapName, options = {}, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapName, cwd);

  if (!roadmap) {
    return {
      success: false,
      error: `Roadmap not found: ${roadmapName}`,
    };
  }

  const phasePlansDir = ensurePhasePlansDir(roadmap.slug, cwd);
  const generated = [];
  const errors = [];

  for (const phase of roadmap.phases || []) {
    try {
      const plan = generatePhasePlan(phase, roadmap, options, cwd);
      const planPath = join(phasePlansDir, `${phase.phase_id}.json`);

      writeFileSync(planPath, JSON.stringify(plan, null, 2));

      // Update phase with path reference
      phase.phase_dev_config = phase.phase_dev_config || {};
      phase.phase_dev_config.progress_json_path = planPath;

      generated.push({
        phase_id: phase.phase_id,
        path: planPath,
        tasks: plan.metrics.totalTasks,
      });
    } catch (e) {
      errors.push({
        phase_id: phase.phase_id,
        error: e.message,
      });
    }
  }

  // Save updated roadmap
  saveRoadmap(roadmap, cwd);

  // Generate README for phase-plans directory
  generatePhasePlansReadme(roadmap, generated, phasePlansDir);

  return {
    success: errors.length === 0,
    generated,
    errors,
    phasePlansDir,
  };
}

/**
 * Generate README for phase plans directory
 */
function generatePhasePlansReadme(roadmap, generated, dir) {
  let content = `# Phase Plans: ${roadmap.title}\n\n`;
  content += `**Roadmap ID:** ${roadmap.roadmap_id}\n`;
  content += `**Generated:** ${new Date().toISOString()}\n\n`;

  content += `## Phases\n\n`;

  for (const gen of generated) {
    content += `### ${gen.phase_id}\n\n`;
    content += `- **Tasks:** ${gen.tasks}\n`;
    content += `- **File:** [${gen.phase_id}.json](./${gen.phase_id}.json)\n\n`;
  }

  content += `## Usage\n\n`;
  content += `\`\`\`bash\n`;
  content += `# Track phase progress\n`;
  content += `/phase-track ${roadmap.slug}/${generated[0]?.phase_id || 'phase-1'}\n\n`;
  content += `# View roadmap status\n`;
  content += `/roadmap-status ${roadmap.slug}\n`;
  content += `\`\`\`\n\n`;

  content += `---\n*Generated by CCASP Roadmap Orchestration Framework*\n`;

  try {
    writeFileSync(join(dir, 'README.md'), content);
  } catch (e) {
    // Ignore write errors
  }
}

/**
 * Load a phase plan
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} phaseId - Phase ID
 * @param {string} cwd - Current working directory
 * @returns {Object|null} Phase plan or null
 */
export function loadPhasePlan(roadmapSlug, phaseId, cwd = process.cwd()) {
  const planPath = join(getPhasePlansDir(roadmapSlug, cwd), `${phaseId}.json`);

  if (!existsSync(planPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(planPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

/**
 * Update a phase plan
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} phaseId - Phase ID
 * @param {Object} updates - Updates to apply
 * @param {string} cwd - Current working directory
 * @returns {Object} Update result
 */
export function updatePhasePlan(roadmapSlug, phaseId, updates, cwd = process.cwd()) {
  const plan = loadPhasePlan(roadmapSlug, phaseId, cwd);

  if (!plan) {
    return {
      success: false,
      error: `Phase plan not found: ${roadmapSlug}/${phaseId}`,
    };
  }

  // Apply updates
  Object.assign(plan, updates);
  plan.updated_at = new Date().toISOString();

  // Recalculate metrics if phases updated
  if (updates.phases) {
    const allTasks = plan.phases.flatMap(p => p.tasks || []);
    plan.metrics.totalTasks = allTasks.length;
    plan.metrics.completedTasks = allTasks.filter(t => t.completed).length;
  }

  // Save
  const planPath = join(getPhasePlansDir(roadmapSlug, cwd), `${phaseId}.json`);

  try {
    writeFileSync(planPath, JSON.stringify(plan, null, 2));
    return { success: true, plan };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Mark a task as completed in a phase plan
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} phaseId - Phase ID
 * @param {string} taskId - Task ID (e.g., "1.2")
 * @param {string} cwd - Current working directory
 * @returns {Object} Update result
 */
export function completeTask(roadmapSlug, phaseId, taskId, cwd = process.cwd()) {
  const plan = loadPhasePlan(roadmapSlug, phaseId, cwd);

  if (!plan) {
    return {
      success: false,
      error: `Phase plan not found: ${roadmapSlug}/${phaseId}`,
    };
  }

  // Find and update task
  let found = false;
  for (const phase of plan.phases) {
    const task = (phase.tasks || []).find(t => t.id === taskId);
    if (task) {
      task.completed = true;
      task.completedAt = new Date().toISOString();
      found = true;
      break;
    }
  }

  if (!found) {
    return {
      success: false,
      error: `Task not found: ${taskId}`,
    };
  }

  // Update metrics
  const allTasks = plan.phases.flatMap(p => p.tasks || []);
  plan.metrics.completedTasks = allTasks.filter(t => t.completed).length;
  plan.updated_at = new Date().toISOString();

  // Check if plan is complete
  if (plan.metrics.completedTasks === plan.metrics.totalTasks) {
    plan.completed_at = new Date().toISOString();
  }

  // Save
  const planPath = join(getPhasePlansDir(roadmapSlug, cwd), `${phaseId}.json`);

  try {
    writeFileSync(planPath, JSON.stringify(plan, null, 2));
    return {
      success: true,
      plan,
      isComplete: plan.completed_at !== null,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Get progress summary for all phases in a roadmap
 *
 * @param {string} roadmapSlug - Roadmap slug
 * @param {string} cwd - Current working directory
 * @returns {Object} Progress summary
 */
export function getRoadmapProgress(roadmapSlug, cwd = process.cwd()) {
  const roadmap = loadRoadmap(roadmapSlug, cwd);

  if (!roadmap) {
    return null;
  }

  const phases = [];
  let totalTasks = 0;
  let completedTasks = 0;

  for (const phase of roadmap.phases || []) {
    const plan = loadPhasePlan(roadmapSlug, phase.phase_id, cwd);

    if (plan) {
      totalTasks += plan.metrics.totalTasks || 0;
      completedTasks += plan.metrics.completedTasks || 0;

      phases.push({
        phase_id: phase.phase_id,
        title: phase.phase_title,
        status: phase.status,
        tasks: plan.metrics.totalTasks || 0,
        completed: plan.metrics.completedTasks || 0,
        percentage: plan.metrics.totalTasks > 0
          ? Math.round((plan.metrics.completedTasks / plan.metrics.totalTasks) * 100)
          : 0,
      });
    } else {
      phases.push({
        phase_id: phase.phase_id,
        title: phase.phase_title,
        status: phase.status,
        tasks: 0,
        completed: 0,
        percentage: 0,
        noPlan: true,
      });
    }
  }

  return {
    roadmap_id: roadmap.roadmap_id,
    title: roadmap.title,
    slug: roadmap.slug,
    phases,
    totalTasks,
    completedTasks,
    overallPercentage: totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0,
  };
}
