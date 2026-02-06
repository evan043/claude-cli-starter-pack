/**
 * Phased Development Wizard
 *
 * Interactive flow for gathering project information.
 * Auto-detects tech stack - works with ANY codebase.
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - wizard/prompts.js - Core input prompts (project info, scope, workflow, testing, L2)
 * - wizard/architecture.js - Architecture detection confirmation & manual override
 * - wizard/review.js - Plan review and confirmation display
 */

import { analyzeCodebase, displayAnalysisResults } from './codebase-analyzer.js';
import { calculateProjectScale } from './scale-calculator.js';
import { promptProjectInfo, promptScopeAssessment } from './wizard/prompts.js';
import { promptArchitectureConfirmation } from './wizard/architecture.js';
import { reviewAndConfirm } from './wizard/review.js';

/**
 * Run the interactive wizard
 */
export async function runWizard(options = {}) {
  // Step 1: Project Identification
  const projectInfo = await promptProjectInfo(options);

  // Step 2: Auto-detect tech stack
  const analysis = await analyzeCodebase(process.cwd());
  displayAnalysisResults(analysis);

  // Step 3: Confirm or override detected stack
  const architecture = await promptArchitectureConfirmation(analysis);

  // Step 4: Scope Assessment
  const scope = await promptScopeAssessment();

  // Step 5: Calculate Scale
  const scaleResult = calculateProjectScale(scope);

  // Step 6: Review and Confirm
  const confirmed = await reviewAndConfirm({
    ...projectInfo,
    scope,
    architecture,
    analysis,
    ...scaleResult,
  });

  if (!confirmed) {
    return null;
  }

  return {
    ...projectInfo,
    scope,
    architecture,
    analysis,
    ...scaleResult,
  };
}

// Re-export prompt functions used by other modules
export {
  promptEnhancements,
  promptWorkflowOptions,
  promptTestingConfig,
  promptL2ExplorationOptions,
} from './wizard/prompts.js';
