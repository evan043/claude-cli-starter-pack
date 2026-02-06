/**
 * Multi-Project Builder - L2 Discovery Phase
 *
 * Handles L2 exploration execution for all projects.
 */

import ora from 'ora';
import {
  initProjectOrchestratorState,
  markProjectDiscoveryComplete,
} from '../../agents/state-manager.js';
import { runL2Exploration } from '../../orchestration/l2-exploration.js';
import { analyzeProjectForL2Delegation } from '../intelligence.js';
import { generateSlug } from '../schema.js';

/**
 * Run L2 discovery phase for all projects
 * @param {Object} roadmap - Multi-project roadmap
 * @param {Object} options - Options
 */
export async function runDiscoveryPhase(roadmap, options = {}) {
  const cwd = options.cwd || process.cwd();
  const spinner = ora('Running L2 discovery for all projects...').start();

  roadmap.status = 'discovering';

  for (let i = 0; i < roadmap.projects.length; i++) {
    const project = roadmap.projects[i];
    spinner.text = `L2 Discovery: ${project.project_title} (${i + 1}/${roadmap.projects.length})`;

    project.status = 'discovering';
    project.metadata.discovery_started = new Date().toISOString();

    try {
      // Initialize project orchestrator state
      await initProjectOrchestratorState(cwd, {
        projectId: project.project_id,
        projectTitle: project.project_title,
        roadmapId: roadmap.roadmap_id,
        explorationPath: project.exploration_path,
        phases: project.phases,
      });

      // Run L2 exploration
      const explorationConfig = {
        projectName: project.project_title,
        projectSlug: project.slug || generateSlug(project.project_title),
        description: project.description,
        architecture: {
          // Infer from domain
          frontend: project.domain === 'frontend' ? { framework: 'react' } : null,
          backend: project.domain === 'backend' ? { framework: 'express' } : null,
        },
        phases: [],
      };

      const explorationResult = await runL2Exploration(explorationConfig, {
        cwd,
        spinner: { text: '', succeed: () => {}, warn: () => {} }, // Suppress inner spinner
      });

      // Update project with exploration findings
      if (explorationResult) {
        project.l2_findings = {
          code_snippets: explorationResult.snippets || [],
          reference_files: explorationResult.files || { modify: [], reference: [], tests: [] },
          agent_delegation: explorationResult.delegation || { primary_agent: null, task_assignments: [], execution_sequence: [] },
        };

        project.phases = explorationResult.phases || [];
      }

      // Analyze for L2 delegation
      const delegation = analyzeProjectForL2Delegation(project);
      project.l2_findings.agent_delegation = {
        primary_agent: delegation.primaryAgent,
        task_assignments: delegation.taskAssignments,
        execution_sequence: delegation.executionSequence,
      };

      project.status = 'ready';
      project.metadata.discovery_completed = new Date().toISOString();

      // Mark discovery complete in state
      await markProjectDiscoveryComplete(cwd, project.project_id);

    } catch (error) {
      spinner.warn(`Discovery failed for ${project.project_title}: ${error.message}`);
      project.status = 'pending'; // Reset to pending
    }
  }

  // Update roadmap status
  const allReady = roadmap.projects.every(p => p.status === 'ready');
  roadmap.status = allReady ? 'active' : 'discovering';

  spinner.succeed(`L2 Discovery complete: ${roadmap.projects.filter(p => p.status === 'ready').length}/${roadmap.projects.length} projects ready`);
}
