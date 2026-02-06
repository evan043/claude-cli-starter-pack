/**
 * Phase Plan Generation Logic
 *
 * Core generation logic for phase plans and task lists.
 */

import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { loadRoadmap, saveRoadmap } from '../roadmap-manager.js';
import { suggestAgents } from '../intelligence.js';
import { COMPLEXITY } from '../schema.js';
import { PHASE_PLANS_DIR, generateTestingConfig } from './config.js';

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
