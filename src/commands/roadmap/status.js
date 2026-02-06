/**
 * Roadmap Sync Status Dashboard
 *
 * Shows sync status between local roadmaps and GitHub issues.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { showHeader } from '../../cli/menu.js';
import { loadConfig } from '../../utils.js';
import { findRoadmaps } from './display.js';

export async function runRoadmapStatus(options) {
  showHeader('Roadmap Sync Status');

  const roadmaps = findRoadmaps();

  if (roadmaps.length === 0) {
    console.log(chalk.yellow('No roadmaps found in .claude/docs/'));
    console.log(chalk.dim('Run /create-roadmap to create one'));
    return;
  }

  const config = loadConfig();
  const owner = config?.owner;
  const repo = config?.repo;

  for (const roadmap of roadmaps) {
    console.log('');
    console.log(chalk.cyan.bold(`━━━ ${roadmap.roadmap_name} ━━━`));
    console.log('');

    const completed = roadmap.projects.filter((p) => p.status === 'completed').length;
    const inProgress = roadmap.projects.filter((p) => p.status === 'in_progress').length;
    const pending = roadmap.projects.filter((p) => p.status === 'pending').length;

    console.log(`  Total: ${roadmap.total_projects} projects`);
    console.log(`  ${chalk.green('✓')} Completed: ${completed}`);
    console.log(`  ${chalk.yellow('●')} In Progress: ${inProgress}`);
    console.log(`  ${chalk.dim('○')} Pending: ${pending}`);
    console.log('');

    if (roadmap.github_integrated) {
      console.log(chalk.green('  GitHub Integration: ✓ Enabled'));
      if (roadmap.last_github_sync) {
        console.log(chalk.dim(`  Last Sync: ${new Date(roadmap.last_github_sync).toLocaleString()}`));
      }
      console.log('');

      console.log('  Projects:');
      for (const project of roadmap.projects) {
        const issueNum = project.phase_dev_config?.github_issue_number;
        const statusIcon = project.status === 'completed'
          ? chalk.green('✓')
          : project.status === 'in_progress'
            ? chalk.yellow('●')
            : chalk.dim('○');

        if (issueNum) {
          console.log(`    ${statusIcon} #${issueNum} - ${project.project_name}`);
        } else {
          console.log(`    ${statusIcon} [no issue] - ${project.project_name}`);
        }
      }
    } else {
      console.log(chalk.yellow('  GitHub Integration: ○ Not linked'));
      console.log(chalk.dim('  Run `gtask roadmap import` to create GitHub issues'));
    }
  }

  console.log('');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Actions:',
      choices: [
        { name: 'Sync all roadmaps with GitHub', value: 'sync-all' },
        { name: 'Open GitHub Project Board', value: 'open-board' },
        { name: 'Back', value: 'back' },
      ],
    },
  ]);

  if (action === 'sync-all') {
    const { runRoadmapSync } = await import('./sync.js');
    for (const roadmap of roadmaps) {
      if (roadmap.github_integrated) {
        await runRoadmapSync({ file: roadmap.path });
      }
    }
  } else if (action === 'open-board') {
    const projectUrl = config?.projectUrl || `https://github.com/users/${owner}/projects`;
    console.log(chalk.dim(`Opening: ${projectUrl}`));
    try {
      execSync(`start "" "${projectUrl}"`, { stdio: 'ignore' });
    } catch (e) {
      console.log(chalk.yellow(`Open manually: ${projectUrl}`));
    }
  }
}
