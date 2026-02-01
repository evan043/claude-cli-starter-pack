/**
 * Tech Stack Detection Module
 *
 * Unified re-exports for all tech stack detection functionality.
 */

// Pattern definitions
export { DETECTION_PATTERNS } from './patterns.js';
export { default as patterns } from './patterns.js';

// Detection algorithms
export {
  readPackageJson,
  readPythonRequirements,
  fileExists,
  hasPackages,
  detectPort,
  detectGitInfo,
  detectDefaultBranch,
  detectSelectors,
  detectTunnelConfig,
} from './detectors.js';
export { default as detectors } from './detectors.js';

// Output formatting
export {
  displayResults,
  displayHeader,
  createResultStructure,
  buildLocalUrls,
  createCommitConfig,
} from './formatters.js';
export { default as formatters } from './formatters.js';
