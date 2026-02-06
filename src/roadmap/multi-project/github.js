/**
 * Multi-Project Builder - GitHub Integration
 *
 * Handles GitHub issue creation and Epic linking.
 */

import chalk from 'chalk';
import ora from 'ora';
import {
  createProjectIssue,
  createRoadmapEpicAfterProjects,
  linkProjectsToEpic,
} from '../github-integration.js';

/**
 * Create GitHub issues for all projects in roadmap
 * @param {Object} roadmap - Multi-project roadmap
 */
export async function createGitHubIssuesForRoadmap(roadmap) {
  const spinner = ora('Creating GitHub issues...').start();

  try {
    // Create project issues first
    let created = 0;
    for (const project of roadmap.projects) {
      spinner.text = `Creating issue for ${project.project_title}...`;

      const result = await createProjectIssue(project, roadmap);
      if (result.success) {
        project.github_issue_number = result.number;
        project.github_issue_url = result.url;
        created++;
      }
    }

    // Create Epic after all project issues
    spinner.text = 'Creating roadmap Epic...';
    const epicResult = await createRoadmapEpicAfterProjects(roadmap);

    if (epicResult.success) {
      roadmap.metadata.github_epic_number = epicResult.number;
      roadmap.metadata.github_epic_url = epicResult.url;
      roadmap.metadata.github_integrated = true;

      // Link projects to Epic
      spinner.text = 'Linking projects to Epic...';
      await linkProjectsToEpic(roadmap.projects, epicResult.number);
    }

    spinner.succeed(`Created ${created} project issues + 1 Epic`);
  } catch (error) {
    spinner.fail(`GitHub integration failed: ${error.message}`);
  }
}

/**
 * Display roadmap summary
 * @param {Object} roadmap - Created roadmap
 */
export function displayRoadmapSummary(roadmap) {
  const totalTasks = roadmap.projects.reduce(
    (sum, p) => sum + (p.phases || []).reduce((s, ph) => s + (ph.tasks?.length || 0), 0),
    0
  );

  console.log('');
  console.log(chalk.cyan('╔═══════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.green.bold('  ✓ Multi-Project Roadmap Created Successfully!                        ') + chalk.cyan('║'));
  console.log(chalk.cyan('╠═══════════════════════════════════════════════════════════════════════╣'));
  console.log(`${chalk.cyan('║')  }  Roadmap: ${(roadmap.title || '').substring(0, 50).padEnd(58)}${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }  Projects: ${String(roadmap.projects.length).padEnd(57)}${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }  Total Tasks: ${String(totalTasks).padEnd(54)}${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }  Status: ${(roadmap.status || 'planning').padEnd(59)}${  chalk.cyan('║')}`);

  if (roadmap.metadata?.github_epic_number) {
    console.log(chalk.cyan('║') + chalk.dim(`  GitHub Epic: #${roadmap.metadata.github_epic_number}`.padEnd(69)) + chalk.cyan('║'));
  }

  console.log(chalk.cyan('║') + ''.padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.bold('  Projects:'.padEnd(69)) + chalk.cyan('║'));

  for (const project of roadmap.projects) {
    const statusIcon = project.status === 'ready' ? '✓' : project.status === 'discovering' ? '…' : '○';
    const issueRef = project.github_issue_number ? ` (#${project.github_issue_number})` : '';
    console.log(chalk.cyan('║') + `    ${statusIcon} ${project.project_title}${issueRef}`.substring(0, 67).padEnd(67) + chalk.cyan('║'));
  }

  console.log(chalk.cyan('║') + ''.padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.bold('  Next Steps:'.padEnd(69)) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  1. Review: /roadmap-status ${roadmap.slug}`.substring(0, 69).padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  2. Execute: /roadmap-execute ${roadmap.slug}`.substring(0, 69).padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════════╝'));
  console.log('');
}
