/**
 * Roadmap Display and Shared Helpers
 *
 * Provides:
 * - showRoadmapMenu: Interactive menu for roadmap actions
 * - findRoadmaps: Scan .claude/docs for ROADMAP.json files
 * - selectRoadmap: Interactive roadmap selector
 * - saveRoadmap: Write roadmap back to file
 * - checkGhCli: Verify GitHub CLI availability
 * - getRepoOwner: Extract owner from git remote
 * - getRepoName: Extract repo name from git remote
 * - escapeShell: Shell string escaping
 * - extractPriority: Extract priority from GitHub labels
 * - PRIORITY_LABELS: Priority to label mapping constant
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { showHeader } from '../../cli/menu.js';

export const PRIORITY_LABELS = {
  CRITICAL: 'priority-critical',
  HIGH: 'priority-high',
  MEDIUM: 'priority-medium',
  LOW: 'priority-low',
};

export async function showRoadmapMenu() {
  showHeader('Roadmap Integration');

  console.log(chalk.dim('Bridge your local roadmaps with GitHub Project Board'));
  console.log('');

  const roadmaps = findRoadmaps();

  if (roadmaps.length > 0) {
    console.log(chalk.cyan('Found Roadmaps:'));
    for (const rm of roadmaps) {
      const syncStatus = rm.github_integrated ? chalk.green('✓ Synced') : chalk.yellow('○ Local only');
      console.log(`  ${syncStatus} ${rm.roadmap_name} (${rm.total_projects} projects)`);
    }
    console.log('');
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Import - Create GitHub issues from ROADMAP.json', value: 'import' },
        { name: 'Sync - Update GitHub with project progress', value: 'sync' },
        { name: 'Create - Generate ROADMAP.json from GitHub issues', value: 'create' },
        { name: 'Status - Show sync status dashboard', value: 'status' },
        new inquirer.Separator(),
        { name: 'Back', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') return;

  const { runRoadmapImport } = await import('./import.js');
  const { runRoadmapSync } = await import('./sync.js');
  const { runRoadmapStatus } = await import('./status.js');
  const { runRoadmapCreate } = await import('./create.js');

  switch (action) {
    case 'import':
      await runRoadmapImport({});
      break;
    case 'sync':
      await runRoadmapSync({});
      break;
    case 'create':
      await runRoadmapCreate({});
      break;
    case 'status':
      await runRoadmapStatus({});
      break;
  }
}

export function findRoadmaps(cwd = process.cwd()) {
  const roadmaps = [];
  const docsDir = join(cwd, '.claude', 'docs');

  if (!existsSync(docsDir)) return roadmaps;

  try {
    const dirs = readdirSync(docsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const roadmapPath = join(docsDir, dir.name, 'ROADMAP.json');
        if (existsSync(roadmapPath)) {
          try {
            const data = JSON.parse(readFileSync(roadmapPath, 'utf8'));
            roadmaps.push({
              ...data,
              path: roadmapPath,
              dir: dir.name,
            });
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (e) {
    // Ignore errors
  }

  return roadmaps;
}

export function checkGhCli() {
  try {
    execSync('gh --version', { stdio: 'pipe' });
    return true;
  } catch (e) {
    console.log(chalk.red('GitHub CLI (gh) not found'));
    console.log(chalk.dim('Install from: https://cli.github.com/'));
    return false;
  }
}

export function getRepoOwner() {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remote.match(/github\.com[:/]([^/]+)/);
    return match?.[1];
  } catch (e) {
    return null;
  }
}

export function getRepoName() {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remote.match(/github\.com[:/][^/]+\/([^/.]+)/);
    return match?.[1];
  } catch (e) {
    return null;
  }
}

export async function selectRoadmap(filePath) {
  if (filePath && existsSync(filePath)) {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  }

  const roadmaps = findRoadmaps();

  if (roadmaps.length === 0) {
    console.log(chalk.yellow('No roadmaps found in .claude/docs/'));
    console.log(chalk.dim('Run /create-roadmap to create one'));
    return null;
  }

  if (roadmaps.length === 1) {
    return roadmaps[0];
  }

  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: 'Select a roadmap:',
      choices: roadmaps.map((rm) => ({
        name: `${rm.roadmap_name} (${rm.total_projects} projects)`,
        value: rm,
      })),
    },
  ]);

  return selected;
}

export function saveRoadmap(roadmap) {
  const path = roadmap.path;
  if (path) {
    const data = { ...roadmap };
    delete data.path;
    delete data.dir;
    data.last_updated = new Date().toISOString();
    writeFileSync(path, JSON.stringify(data, null, 2));
  }
}

export function escapeShell(str) {
  return str.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/`/g, '\\`');
}

export function extractPriority(labels) {
  const labelNames = labels.map((l) => l.name?.toLowerCase() || l.toLowerCase());

  if (labelNames.some((l) => l.includes('critical') || l.includes('p0'))) return 'CRITICAL';
  if (labelNames.some((l) => l.includes('high') || l.includes('p1'))) return 'HIGH';
  if (labelNames.some((l) => l.includes('low') || l.includes('p3'))) return 'LOW';
  return 'MEDIUM';
}
