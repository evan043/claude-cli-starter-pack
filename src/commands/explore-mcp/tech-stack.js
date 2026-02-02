/**
 * Tech Stack Utilities
 *
 * Functions for loading and managing tech stack detection.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { analyzeCodebase, displayAnalysisResults } from '../create-phase-dev/codebase-analyzer.js';

/**
 * Check for tech-stack.json and load it if available
 * @returns {Object|null} Tech stack config or null
 */
export function loadTechStackJson() {
  const possiblePaths = [
    path.join(process.cwd(), '.claude', 'config', 'tech-stack.json'),
    path.join(process.cwd(), '.claude', 'tech-stack.json'),
    path.join(process.cwd(), 'tech-stack.json'),
  ];

  for (const techStackPath of possiblePaths) {
    if (fs.existsSync(techStackPath)) {
      try {
        const content = fs.readFileSync(techStackPath, 'utf-8');
        return JSON.parse(content);
      } catch {
        // Continue to next path
      }
    }
  }
  return null;
}

/**
 * Display tech stack status and prompt for detection if missing
 * @returns {Promise<Object>} Analysis result from tech stack or fresh detection
 */
export async function ensureTechStackAnalysis() {
  const techStack = loadTechStackJson();

  if (techStack) {
    console.log(chalk.green('✓ Found tech-stack.json'));
    console.log(chalk.dim(`  Project: ${techStack.project?.name || 'Unknown'}`));

    // Check if tech stack has useful detection data
    if (techStack.detectedStack || techStack.frontend || techStack.backend) {
      console.log(chalk.dim('  Using cached tech stack analysis\n'));
      return { techStack, fromCache: true };
    }
  }

  // No tech stack found or incomplete - offer to run detection
  console.log(chalk.yellow('\n⚠️  Tech stack not detected yet'));

  const { runDetection } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'runDetection',
      message: 'Run tech stack detection for better MCP recommendations?',
      default: true,
    },
  ]);

  if (runDetection) {
    console.log(chalk.cyan.bold('\n🔍 Analyzing Codebase...\n'));
    const analysis = await analyzeCodebase(process.cwd());
    displayAnalysisResults(analysis);
    return { analysis, fromCache: false };
  }

  return { analysis: null, fromCache: false };
}

/**
 * Build search keywords from analysis for MCP discovery
 * @param {Object} analysis - Codebase analysis result
 * @returns {Array<string>} Keywords for searching
 */
export function buildSearchKeywords(analysis) {
  const keywords = [];
  if (analysis.frontend?.framework) keywords.push(analysis.frontend.framework);
  if (analysis.backend?.framework) keywords.push(analysis.backend.framework);
  if (analysis.database?.type) keywords.push(analysis.database.type);
  if (analysis.deployment?.platform) keywords.push(analysis.deployment.platform);
  return keywords;
}
