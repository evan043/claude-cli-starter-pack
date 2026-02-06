/**
 * Vision Mode CLI Command
 *
 * Entry point for Vision Mode orchestration - transform natural language
 * prompts into complete, working MVPs through autonomous development.
 *
 * Submodules:
 * - ./vision-cmd/init.js       - Vision initialization
 * - ./vision-cmd/status.js     - Status display
 * - ./vision-cmd/run.js        - Execution and resume
 * - ./vision-cmd/operations.js - List, scan, analyze, architect
 * - ./vision-cmd/help.js       - Help and dashboard
 *
 * Usage:
 *   ccasp vision init "Build a todo app with React and FastAPI"
 *   ccasp vision status [slug]
 *   ccasp vision run [slug]
 *   ccasp vision list
 *   ccasp vision resume <slug>
 *
 * @module commands/vision
 */

import { visionInit } from './vision-cmd/init.js';
import { visionStatus } from './vision-cmd/status.js';
import { visionRun, visionResume } from './vision-cmd/run.js';
import { visionList, visionScan, visionAnalyze, visionArchitect, visionCleanup } from './vision-cmd/operations.js';
import { showVisionHelp, visionDashboard } from './vision-cmd/help.js';

/**
 * Vision Mode CLI - main entry point
 * @param {string} subcommand - Subcommand (init, status, run, list, resume, scan)
 * @param {Object} options - CLI options
 */
export async function runVision(subcommand, options = {}) {
  const projectRoot = process.cwd();

  switch (subcommand) {
    case 'init':
      await visionInit(projectRoot, options);
      break;

    case 'status':
      await visionStatus(projectRoot, options);
      break;

    case 'run':
      await visionRun(projectRoot, options);
      break;

    case 'list':
      await visionList(projectRoot, options);
      break;

    case 'resume':
      await visionResume(projectRoot, options);
      break;

    case 'scan':
      await visionScan(projectRoot, options);
      break;

    case 'analyze':
      await visionAnalyze(projectRoot, options);
      break;

    case 'architect':
      await visionArchitect(projectRoot, options);
      break;

    case 'cleanup':
      await visionCleanup(projectRoot, options);
      break;

    case 'dashboard':
      await visionDashboard(projectRoot, options);
      break;

    default:
      showVisionHelp();
  }
}

export default {
  runVision
};
