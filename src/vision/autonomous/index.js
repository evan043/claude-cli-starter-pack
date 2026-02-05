/**
 * Vision Mode Autonomous Execution - Module Exports
 *
 * Provides autonomous loop execution with self-healing capabilities.
 * Continues until vision.status === 'completed' or human intervention needed.
 */

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

export default {
  runAutonomousLoop,
  executeNextTasks,
  checkProgress,
  shouldContinue,
  handleInterruption,
  runTests,
  parseTestResults,
  identifyFailures,
  generateTestReport,
  generateFixes,
  applyFixes,
  validateFix,
  shouldEscalate,
  MAX_RETRIES,
  verifyMVPComplete,
  checkAllTestsPass,
  checkAllFeaturesImplemented,
  generateCompletionReport
};
