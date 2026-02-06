/**
 * Documentation Generator - L2 Exploration Integration
 *
 * Integrates L2 exploration results with documentation generation,
 * and updates PROGRESS.json with exploration findings.
 */

import ora from 'ora';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { runL2Exploration } from '../l2-orchestrator.js';
import { generatePhaseDevDocumentation } from '../documentation-generator.js';

/**
 * Generate documentation with L2 exploration integration
 * @param {Object} config - Project configuration
 * @param {Array} enhancements - Enabled enhancements
 * @param {Object} options - Additional options
 * @returns {Object} Generation results with exploration data
 */
export async function generatePhaseDevDocumentationWithL2(config, enhancements = [], options = {}) {
  const spinner = ora('Generating documentation with L2 exploration...').start();
  const cwd = process.cwd();
  const { projectSlug } = config;

  let l2Exploration = null;

  if (enhancements.includes('parallel') || options.runL2Exploration) {
    spinner.text = 'Running L2 codebase exploration...';

    try {
      l2Exploration = await runL2Exploration(config, {
        spinner,
        cwd,
        forceRefresh: options.forceRefresh,
      });

      if (l2Exploration && l2Exploration.phases) {
        config.phases = l2Exploration.phases;
        config.l2Exploration = {
          explorationPath: `.claude/exploration/${projectSlug}`,
          filesAnalyzed: l2Exploration.summary?.filesAnalyzed || 0,
          snippetsExtracted: l2Exploration.summary?.snippetsExtracted || 0,
          confidence: l2Exploration.summary?.confidence || 'medium',
          primaryAgent: l2Exploration.delegation?.primaryAgent || null,
          domains: l2Exploration.summary?.domains || {},
        };
      }
    } catch (error) {
      spinner.warn(`L2 exploration failed: ${error.message}`);
    }
  }

  spinner.text = 'Generating phase documentation...';
  const results = await generatePhaseDevDocumentation(config, enhancements);

  results.l2Exploration = l2Exploration;
  results.explorationPath = l2Exploration ? `.claude/exploration/${projectSlug}` : null;

  return results;
}

/**
 * Update PROGRESS.json with exploration findings
 * @param {string} progressPath - Path to PROGRESS.json
 * @param {Object} explorationFindings - L2 exploration findings
 */
export async function updateProgressWithExploration(progressPath, explorationFindings) {
  if (!existsSync(progressPath)) {
    throw new Error(`PROGRESS.json not found: ${progressPath}`);
  }

  const progress = JSON.parse(readFileSync(progressPath, 'utf8'));

  if (explorationFindings.phases) {
    progress.phases = progress.phases.map((phase, idx) => {
      const explorationPhase = explorationFindings.phases[idx];
      if (!explorationPhase) return phase;

      return {
        ...phase,
        tasks: phase.tasks.map((task, taskIdx) => {
          const explorationTask = explorationPhase.tasks?.[taskIdx];
          if (!explorationTask) return task;

          return {
            ...task,
            files: explorationTask.files || task.files,
            specificity: explorationTask.specificity || task.specificity,
            assignedAgent: explorationTask.assignedAgent || task.assignedAgent,
            codePatternRef: explorationTask.codePatternRef || task.codePatternRef,
          };
        }),
        assignedAgent: explorationPhase.assignedAgent || phase.assignedAgent,
      };
    });
  }

  progress.l2Exploration = {
    enabled: true,
    explorationPath: explorationFindings.explorationPath || null,
    filesAnalyzed: explorationFindings.summary?.filesAnalyzed || 0,
    snippetsExtracted: explorationFindings.summary?.snippetsExtracted || 0,
    confidence: explorationFindings.summary?.confidence || 'medium',
    primaryAgent: explorationFindings.delegation?.primaryAgent || null,
    domains: explorationFindings.summary?.domains || {},
    lastUpdated: new Date().toISOString(),
  };

  writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');
  return progress;
}
