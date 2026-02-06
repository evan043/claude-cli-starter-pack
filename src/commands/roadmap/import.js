/**
 * Roadmap Import to GitHub
 *
 * Creates GitHub issues from ROADMAP.json projects.
 * Updates ROADMAP.json with issue numbers and URLs.
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { showHeader } from '../../cli/menu.js';
import { loadConfig } from '../../utils.js';
import { getTypeLabels, getTypeAcceptanceCriteria } from '../../templates/issue-types.js';
import { generateCCSAPMeta } from '../../templates/issue-metadata.js';
import { generateFilesSection, generateFilesList } from '../../templates/generated-files-section.js';
import {
  checkGhCli,
  selectRoadmap,
  saveRoadmap,
  getRepoOwner,
  getRepoName,
  escapeShell,
  PRIORITY_LABELS,
} from './display.js';

export async function runRoadmapImport(options) {
  showHeader('Import Roadmap to GitHub');

  if (!checkGhCli()) return;

  const roadmap = await selectRoadmap(options.file);
  if (!roadmap) return;

  console.log('');
  console.log(chalk.cyan(`Roadmap: ${roadmap.roadmap_name}`));
  console.log(chalk.dim(`Projects: ${roadmap.total_projects}`));
  console.log(chalk.dim(`Goal: ${roadmap.primary_goal}`));
  console.log('');

  const projectsToImport = [];
  const projectsWithIssues = [];

  for (const project of roadmap.projects) {
    if (project.phase_dev_config?.github_issue_number) {
      projectsWithIssues.push(project);
    } else {
      projectsToImport.push(project);
    }
  }

  if (projectsToImport.length === 0) {
    console.log(chalk.green('✓ All projects already have GitHub issues linked'));
    return;
  }

  console.log(`${chalk.yellow(projectsToImport.length)} projects need GitHub issues`);
  if (projectsWithIssues.length > 0) {
    console.log(`${chalk.green(projectsWithIssues.length)} projects already linked`);
  }
  console.log('');

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Create ${projectsToImport.length} GitHub issues?`,
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.dim('Cancelled'));
    return;
  }

  const config = loadConfig();
  const owner = config?.owner || await getRepoOwner();
  const repo = config?.repo || await getRepoName();

  if (!owner || !repo) {
    console.log(chalk.red('Could not determine repository. Run `gtask setup` first.'));
    return;
  }

  const spinner = ora('Creating GitHub issues...').start();
  let created = 0;
  let failed = 0;

  for (const project of projectsToImport) {
    try {
      spinner.text = `Creating issue for: ${project.project_name}`;

      const body = buildIssueBody(project, roadmap);

      const labels = buildLabels(project, roadmap);

      const result = execSync(
        `gh issue create --repo "${owner}/${repo}" --title "${escapeShell(project.project_name)}" --body "${escapeShell(body)}" --label "${labels.join(',')}"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      const issueUrl = result.trim();
      const issueNumber = issueUrl.match(/\/issues\/(\d+)/)?.[1];

      if (issueNumber) {
        project.phase_dev_config = project.phase_dev_config || {};
        project.phase_dev_config.github_issue_number = parseInt(issueNumber);
        project.phase_dev_config.github_issue_url = issueUrl;
        created++;
      }
    } catch (e) {
      failed++;
      spinner.warn(`Failed to create issue for ${project.project_name}: ${e.message}`);
    }
  }

  roadmap.github_integrated = true;
  roadmap.last_github_sync = new Date().toISOString();
  saveRoadmap(roadmap);

  spinner.succeed(`Created ${created} GitHub issues${failed > 0 ? `, ${failed} failed` : ''}`);

  console.log('');
  console.log(chalk.green.bold('Import Complete'));
  console.log('');
  for (const project of roadmap.projects) {
    if (project.phase_dev_config?.github_issue_number) {
      console.log(`  ${chalk.green('✓')} #${project.phase_dev_config.github_issue_number} - ${project.project_name}`);
    }
  }
}

function detectIssueType(project) {
  if (project.category === 'testing' || project.name?.includes('test') || project.project_name?.includes('test')) {
    return 'testing';
  }
  if (project.category === 'refactor' || project.name?.includes('refactor') || project.project_name?.includes('refactor')) {
    return 'refactor';
  }
  if (project.category === 'bug' || project.type === 'bugfix' || project.name?.includes('bug') || project.name?.includes('fix')) {
    return 'bug';
  }
  return 'feature';
}

function buildIssueBody(project, roadmap) {
  const issueType = detectIssueType(project);

  const acceptanceCriteria = getTypeAcceptanceCriteria(issueType);

  const progressPath = project.phase_dev_config?.progress_json_path || `.claude/docs/${roadmap.roadmap_slug}/PROGRESS.json`;
  const meta = generateCCSAPMeta({
    source: '/roadmap import',
    slug: roadmap.roadmap_slug,
    phase: project.phase_dev_config?.current_phase || null,
    task: project.project_id,
    progressFile: progressPath,
    issueType: issueType,
  });

  const bodyParts = [
    meta,
    '',
    `## ${project.project_name}`,
    '',
    project.description,
    '',
    '### Details',
    '',
    `- **Priority:** ${project.priority}`,
    `- **Estimated Effort:** ${project.estimated_effort_hours} hours`,
    `- **Roadmap:** ${roadmap.roadmap_name}`,
    `- **Project ID:** ${project.project_id}`,
    `- **Issue Type:** ${issueType}`,
    '',
    '### Deliverables',
    '',
    project.deliverables?.map((d) => `- [ ] ${d}`).join('\n') || '- [ ] Complete project',
    '',
  ];

  if (project.dependencies && project.dependencies.length > 0) {
    bodyParts.push('### Dependencies');
    bodyParts.push('');
    bodyParts.push(project.dependencies.map((d) => `- ${d}`).join('\n'));
    bodyParts.push('');
  }

  bodyParts.push('### Acceptance Criteria');
  bodyParts.push('');
  bodyParts.push(acceptanceCriteria.map((ac) => `- [ ] ${ac}`).join('\n'));
  bodyParts.push('');

  const filesSection = generateFilesSection(
    generateFilesList(roadmap.roadmap_slug, {
      includeExploration: false,
      includeDocs: true,
      customFiles: [],
    }),
    {
      source: '/roadmap import',
      project: roadmap.roadmap_name,
      phase: null,
      showExplorationFiles: false,
      showDocsFiles: true,
    }
  );

  bodyParts.push(filesSection);
  bodyParts.push('');
  bodyParts.push('---');
  bodyParts.push('*Generated by gtask roadmap import*');

  return bodyParts.join('\n');
}

function buildLabels(project, roadmap) {
  const labels = ['roadmap'];

  const priorityLabel = PRIORITY_LABELS[project.priority];
  if (priorityLabel) {
    labels.push(priorityLabel);
  }

  const issueType = detectIssueType(project);
  const typeLabels = getTypeLabels(issueType);
  labels.push(...typeLabels);

  return labels;
}
