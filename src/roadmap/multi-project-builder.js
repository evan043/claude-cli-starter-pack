/**
 * Multi-Project Roadmap Builder (Mode C) - Thin Re-export Wrapper
 *
 * Creates roadmaps with multiple independent projects, each getting:
 * - L2 exploration for codebase analysis
 * - Full phase/task breakdown
 * - GitHub issue with complete breakdown
 * - Execution state management
 */

export { runMultiProjectBuilder } from './multi-project/builder.js';
export { displayProjectTable, editProjects } from './multi-project/display.js';
export { runDiscoveryPhase } from './multi-project/discovery.js';

// Default export for backwards compatibility
import { runMultiProjectBuilder } from './multi-project/builder.js';
import { runDiscoveryPhase } from './multi-project/discovery.js';
import { displayProjectTable, editProjects } from './multi-project/display.js';

export default {
  runMultiProjectBuilder,
  runDiscoveryPhase,
  displayProjectTable,
  editProjects,
};
