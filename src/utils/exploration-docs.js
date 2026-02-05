/**
 * Exploration Documentation Utilities
 *
 * Shared utilities for saving L2 exploration findings as markdown files.
 * Used by both /phase-dev-plan and /create-roadmap commands.
 *
 * Directory structure:
 * .claude/exploration/{slug}/
 *   ├── EXPLORATION_SUMMARY.md
 *   ├── CODE_SNIPPETS.md
 *   ├── REFERENCE_FILES.md
 *   ├── AGENT_DELEGATION.md
 *   ├── PHASE_BREAKDOWN.md
 *   └── findings.json
 */

// Re-export all submodule functions
export {
  createExplorationDir,
  getExplorationDir,
  explorationDocsExist,
} from './exploration-docs/directory.js';

export {
  saveExplorationSummary,
  saveCodeSnippets,
  saveFindingsJson,
} from './exploration-docs/summary.js';

export {
  saveReferenceFiles,
  saveAgentDelegation,
} from './exploration-docs/reference.js';

export {
  savePhaseBreakdown,
  generatePhaseBreakdownMarkdown,
} from './exploration-docs/planning.js';

export { loadExplorationDocs } from './exploration-docs/loader.js';

// Convenience function: save all exploration docs at once
import { saveExplorationSummary, saveCodeSnippets, saveFindingsJson } from './exploration-docs/summary.js';
import { saveReferenceFiles, saveAgentDelegation } from './exploration-docs/reference.js';
import { savePhaseBreakdown } from './exploration-docs/planning.js';
import { getExplorationDir } from './exploration-docs/directory.js';

export function saveAllExplorationDocs(slug, explorationData, cwd = process.cwd()) {
  const paths = {};

  // Save summary
  paths.summary = saveExplorationSummary(slug, explorationData.summary || {}, cwd);

  // Save code snippets
  paths.snippets = saveCodeSnippets(slug, explorationData.snippets || [], cwd);

  // Save reference files
  paths.referenceFiles = saveReferenceFiles(slug, explorationData.files || {}, cwd);

  // Save agent delegation
  paths.delegation = saveAgentDelegation(slug, explorationData.delegation || {}, cwd);

  // Save phase breakdown
  paths.phases = savePhaseBreakdown(slug, explorationData.phases || [], cwd);

  // Save JSON findings
  paths.json = saveFindingsJson(slug, explorationData, cwd);

  return {
    success: true,
    directory: getExplorationDir(slug, cwd),
    files: paths,
  };
}

// Default export for backward compatibility
export default {
  createExplorationDir: (await import('./exploration-docs/directory.js')).createExplorationDir,
  getExplorationDir: (await import('./exploration-docs/directory.js')).getExplorationDir,
  saveExplorationSummary,
  saveCodeSnippets,
  saveReferenceFiles,
  saveAgentDelegation,
  savePhaseBreakdown,
  saveFindingsJson,
  loadExplorationDocs: (await import('./exploration-docs/loader.js')).loadExplorationDocs,
  explorationDocsExist: (await import('./exploration-docs/directory.js')).explorationDocsExist,
  saveAllExplorationDocs,
  generatePhaseBreakdownMarkdown: (await import('./exploration-docs/planning.js')).generatePhaseBreakdownMarkdown,
};
