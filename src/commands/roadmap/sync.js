/**
 * Roadmap Sync with GitHub
 *
 * Updates GitHub issues with project completion status.
 * Closes completed issues automatically.
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { showHeader } from '../../cli/menu.js';
import { loadConfig } from '../../utils.js';
import { checkGhCli, selectRoadmap, saveRoadmap, getRepoOwner, getRepoName, escapeShell } from './display.js';

export async function runRoadmapSync(options) {
  showHeader('Sync Roadmap with GitHub');

  if (!checkGhCli()) return;

  const roadmap = await selectRoadmap(options.file);
  if (!roadmap) return;

  if (!roadmap.github_integrated) {
    console.log(chalk.yellow('This roadmap has not been imported to GitHub yet.'));
    const { doImport } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'doImport',
        message: 'Would you like to import it now?',
        default: true,
      },
    ]);
    if (doImport) {
      const { runRoadmapImport } = await import('./import.js');
      await runRoadmapImport({ file: roadmap.path });
    }
    return;
  }

  const config = loadConfig();
  const owner = config?.owner || await getRepoOwner();
  const repo = config?.repo || await getRepoName();

  const spinner = ora('Syncing with GitHub...').start();
  let synced = 0;
  let closed = 0;

  for (const project of roadmap.projects) {
    const issueNumber = project.phase_dev_config?.github_issue_number;
    if (!issueNumber) continue;

    try {
      spinner.text = `Syncing: ${project.project_name}`;

      const progressPath = project.phase_dev_config?.progress_json_path;
      let completion = 0;
      let completionDetails = '';

      if (progressPath && existsSync(progressPath)) {
        const progress = JSON.parse(readFileSync(progressPath, 'utf8'));
        completion = progress.completion_percentage || 0;
        completionDetails = `Phase ${progress.current_phase || 1}/${progress.total_phases || 1}`;
      }

      const isCompleted = project.status === 'completed' || completion >= 100;

      const comment = buildSyncComment(project, completion, completionDetails, roadmap);

      execSync(
        `gh issue comment ${issueNumber} --repo "${owner}/${repo}" --body "${escapeShell(comment)}"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      synced++;

      if (isCompleted && project.status !== 'completed') {
        execSync(
          `gh issue close ${issueNumber} --repo "${owner}/${repo}" --comment "✅ Project completed via roadmap execution"`,
          { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
        );
        project.status = 'completed';
        closed++;
      }
    } catch (e) {
      spinner.warn(`Failed to sync ${project.project_name}: ${e.message}`);
    }
  }

  roadmap.last_github_sync = new Date().toISOString();
  saveRoadmap(roadmap);

  spinner.succeed(`Synced ${synced} issues${closed > 0 ? `, closed ${closed}` : ''}`);
}

export function buildSyncComment(project, completion, details, roadmap) {
  const statusEmoji = completion >= 100 ? '✅' : completion > 0 ? '🔄' : '⏳';

  return `${statusEmoji} **Roadmap Sync Update**

**Status:** ${project.status}
**Completion:** ${completion}%
${details ? `**Progress:** ${details}` : ''}

---
*Synced from ${roadmap.roadmap_name} via gtask*`;
}
