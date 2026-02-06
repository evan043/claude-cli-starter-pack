/**
 * Create Roadmap from GitHub Issues
 *
 * Fetches GitHub issues and generates ROADMAP.json structure.
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { showHeader } from '../../cli/menu.js';
import { loadConfig } from '../../utils.js';
import { checkGhCli, getRepoOwner, getRepoName, extractPriority } from './display.js';
import { claudeAbsolutePath } from '../../utils/paths.js';

export async function runRoadmapCreate(options) {
  showHeader('Create Roadmap from GitHub Issues');

  if (!checkGhCli()) return;

  const config = loadConfig();
  const owner = config?.owner || await getRepoOwner();
  const repo = config?.repo || await getRepoName();

  if (!owner || !repo) {
    console.log(chalk.red('Could not determine repository. Run `gtask setup` first.'));
    return;
  }

  const { roadmapName, primaryGoal, labelFilter } = await inquirer.prompt([
    {
      type: 'input',
      name: 'roadmapName',
      message: 'Roadmap name:',
      default: 'github-import',
      validate: (v) => v.length > 0,
    },
    {
      type: 'input',
      name: 'primaryGoal',
      message: 'Primary goal:',
      default: 'Complete imported GitHub issues',
    },
    {
      type: 'input',
      name: 'labelFilter',
      message: 'Filter by label (optional, e.g., "roadmap"):',
      default: '',
    },
  ]);

  const spinner = ora('Fetching GitHub issues...').start();

  try {
    const labelArg = labelFilter ? `--label "${labelFilter}"` : '';
    const result = execSync(
      `gh issue list --repo "${owner}/${repo}" --state open ${labelArg} --json number,title,body,labels,assignees --limit 100`,
      { encoding: 'utf8' }
    );

    const issues = JSON.parse(result);

    if (issues.length === 0) {
      spinner.fail('No issues found');
      return;
    }

    spinner.succeed(`Found ${issues.length} issues`);

    const projects = issues.map((issue, index) => ({
      project_id: `gh-${issue.number}`,
      project_name: issue.title,
      description: issue.body?.substring(0, 500) || 'No description',
      priority: extractPriority(issue.labels),
      estimated_effort_hours: '4-8',
      source_files: [],
      target_files: [],
      deliverables: [`Complete issue #${issue.number}`],
      dependencies: [],
      status: 'pending',
      phase_dev_config: {
        github_issue_number: issue.number,
        github_issue_url: `https://github.com/${owner}/${repo}/issues/${issue.number}`,
        scale: 'S',
      },
    }));

    const roadmapSlug = roadmapName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const roadmap = {
      roadmap_name: roadmapName,
      roadmap_slug: roadmapSlug,
      primary_goal: primaryGoal,
      total_projects: projects.length,
      completed_projects: 0,
      completion_percentage: 0,
      projects,
      technologies: [],
      github_integrated: true,
      github_repo: `${owner}/${repo}`,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      last_github_sync: new Date().toISOString(),
    };

    const docsDir = claudeAbsolutePath(process.cwd(), 'docs', roadmapSlug);
    mkdirSync(docsDir, { recursive: true });

    const roadmapPath = join(docsDir, 'ROADMAP.json');
    writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2));

    const executionState = {
      roadmap_id: roadmapSlug,
      mode: 'paused',
      queue: projects.map((p) => p.project_id),
      current_project: null,
      completed_this_session: [],
      completed_all_time: [],
      metrics: {
        projects_completed_total: 0,
        projects_remaining: projects.length,
        consecutive_failures: 0,
      },
      safety: {
        max_parallel_agents: 2,
        max_context_percent: 80,
        compact_at_context_percent: 70,
        max_consecutive_failures: 3,
      },
      last_updated: new Date().toISOString(),
    };

    writeFileSync(join(docsDir, 'EXECUTION_STATE.json'), JSON.stringify(executionState, null, 2));

    console.log('');
    console.log(chalk.green.bold('Roadmap Created'));
    console.log('');
    console.log(`  Path: ${roadmapPath}`);
    console.log(`  Projects: ${projects.length}`);
    console.log('');
    console.log(chalk.dim('Run `/create-roadmap` to generate execution hooks and slash command'));
  } catch (e) {
    spinner.fail(`Failed to fetch issues: ${e.message}`);
  }
}
