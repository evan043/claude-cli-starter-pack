/**
 * Vision Mode Autonomous Execution - Module Exports
 *
 * Provides autonomous loop execution with self-healing capabilities.
 * Continues until vision.status === 'completed' or human intervention needed.
 */

// Re-export all named exports
export {
  runAutonomousLoop,
  executeNextTasks,
  checkProgress,
  shouldContinue,
  handleInterruption
} from './execution-loop.js';

export {
  runTests,
  parseTestResults,
  identifyFailures,
  generateTestReport
} from './test-validator.js';

export {
  generateFixes,
  applyFixes,
  validateFix,
  shouldEscalate,
  MAX_RETRIES
} from './self-healer.js';

export {
  verifyMVPComplete,
  checkAllTestsPass,
  checkAllFeaturesImplemented,
  generateCompletionReport
} from './completion-verifier.js';

// Import for default export
import * as executionLoop from './execution-loop.js';
import * as testValidator from './test-validator.js';
import * as selfHealer from './self-healer.js';
import * as completionVerifier from './completion-verifier.js';

export default {
  ...executionLoop,
  ...testValidator,
  ...selfHealer,
  ...completionVerifier
};
