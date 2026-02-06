/**
 * Codebase Analyzer
 *
 * Auto-detects tech stack by analyzing the user's project structure.
 * Makes create-phase-dev work for ANY codebase, not just specific stacks.
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - analyzer/detectors.js - All detectXxx functions (frontend, backend, DB, etc.)
 * - analyzer/summary.js - Stack summary generation and display
 */

import ora from 'ora';
import {
  detectFrontend,
  detectBackend,
  detectDatabase,
  detectTesting,
  detectDeployment,
  detectServices,
  detectProjectStructure,
  detectPackageManager,
  detectMonorepo,
} from './analyzer/detectors.js';

/**
 * Analyze codebase and detect tech stack
 *
 * @param {string} cwd - Working directory to analyze
 * @returns {Object} Detected tech stack configuration
 */
export async function analyzeCodebase(cwd = process.cwd()) {
  const spinner = ora('Analyzing codebase...').start();

  const result = {
    detected: true,
    confidence: 'high',
    frontend: detectFrontend(cwd),
    backend: detectBackend(cwd),
    database: detectDatabase(cwd),
    testing: detectTesting(cwd),
    deployment: detectDeployment(cwd),
    services: detectServices(cwd),
    projectStructure: detectProjectStructure(cwd),
    packageManager: detectPackageManager(cwd),
    monorepo: detectMonorepo(cwd),
  };

  const detections = [
    result.frontend.detected,
    result.backend.detected,
    result.database.detected,
  ];
  const detectedCount = detections.filter(Boolean).length;

  if (detectedCount === 0) {
    result.confidence = 'low';
    result.detected = false;
  } else if (detectedCount < 2) {
    result.confidence = 'medium';
  }

  spinner.succeed('Codebase analysis complete');

  return result;
}

// Re-export summary functions used by other modules
export { generateStackSummary, displayAnalysisResults } from './analyzer/summary.js';
