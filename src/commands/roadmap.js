/**
 * Roadmap Integration Command
 *
 * Bridges /create-roadmap with GitHub Project Board:
 * - Import: Create GitHub issues from ROADMAP.json projects
 * - Sync: Update GitHub issues with project completion status
 * - Create: Generate ROADMAP.json from existing GitHub issues
 * - Status: Show sync status between local roadmap and GitHub
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { execSync } from 'child_process';
import { showHeader } from '../cli/menu.js';
import { hasValidConfig, loadConfig } from '../utils.js';
import { getIssueType, getTypeLabels, getTypeAcceptanceCriteria } from '../templates/issue-types.js';
import { generateCCSAPMeta } from '../templates/issue-metadata.js';
import { generateFilesSection, generateFilesList } from '../templates/generated-files-section.js';

/**
 * Priority to label mapping
 */
const PRIORITY_LABELS = {
  CRITICAL: 'priority-critical',
  HIGH: 'priority-high',
  MEDIUM: 'priority-medium',
  LOW: 'priority-low',
};

/**
 * Run roadmap command
 */
export async function runRoadmap(options = {}) {
  const { subcommand } = options;

  switch (subcommand) {
    case 'import':
      return await runRoadmapImport(options);
    case 'sync':
      return await runRoadmapSync(options);
    case 'create':
      return await runRoadmapCreate(options);
    case 'status':
      return await runRoadmapStatus(options);
    default:
      return await showRoadmapMenu();
  }
}

/**
 * Show interactive roadmap menu
 */
export async function showRoadmapMenu() {
  showHeader('Roadmap Integration');

  console.log(chalk.dim('Bridge your local roadmaps with GitHub Project Board'));
  console.log('');

  // Find existing roadmaps
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

/**
 * Find all ROADMAP.json files in .claude/docs/
 */
function findRoadmaps(cwd = process.cwd()) {
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

/**
 * Import: Create GitHub issues from ROADMAP.json projects
 */
async function runRoadmapImport(options) {
  showHeader('Import Roadmap to GitHub');

  // Check gh CLI
  if (!checkGhCli()) return;

  // Find or select roadmap
  const roadmap = await selectRoadmap(options.file);
  if (!roadmap) return;

  console.log('');
  console.log(chalk.cyan(`Roadmap: ${roadmap.roadmap_name}`));
  console.log(chalk.dim(`Projects: ${roadmap.total_projects}`));
  console.log(chalk.dim(`Goal: ${roadmap.primary_goal}`));
  console.log('');

  // Check which projects already have issues
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

  // Confirm
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

  // Get repo info
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

      // Build issue body
      const body = buildIssueBody(project, roadmap);

      // Build labels
      const labels = buildLabels(project, roadmap);

      // Create issue via gh CLI
      const result = execSync(
        `gh issue create --repo "${owner}/${repo}" --title "${escapeShell(project.project_name)}" --body "${escapeShell(body)}" --label "${labels.join(',')}"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      // Extract issue number from URL
      const issueUrl = result.trim();
      const issueNumber = issueUrl.match(/\/issues\/(\d+)/)?.[1];

      if (issueNumber) {
        // Update project with issue number
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

  // Save updated roadmap
  roadmap.github_integrated = true;
  roadmap.last_github_sync = new Date().toISOString();
  saveRoadmap(roadmap);

  spinner.succeed(`Created ${created} GitHub issues${failed > 0 ? `, ${failed} failed` : ''}`);

  // Show summary
  console.log('');
  console.log(chalk.green.bold('Import Complete'));
  console.log('');
  for (const project of roadmap.projects) {
    if (project.phase_dev_config?.github_issue_number) {
      console.log(`  ${chalk.green('✓')} #${project.phase_dev_config.github_issue_number} - ${project.project_name}`);
    }
  }
}

/**
 * Sync: Update GitHub issues with project completion status
 */
async function runRoadmapSync(options) {
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

      // Calculate completion from PROGRESS.json if exists
      const progressPath = project.phase_dev_config?.progress_json_path;
      let completion = 0;
      let completionDetails = '';

      if (progressPath && existsSync(progressPath)) {
        const progress = JSON.parse(readFileSync(progressPath, 'utf8'));
        completion = progress.completion_percentage || 0;
        completionDetails = `Phase ${progress.current_phase || 1}/${progress.total_phases || 1}`;
      }

      // Determine status based on project.status
      const isCompleted = project.status === 'completed' || completion >= 100;

      // Build comment
      const comment = buildSyncComment(project, completion, completionDetails, roadmap);

      // Post comment to issue
      execSync(
        `gh issue comment ${issueNumber} --repo "${owner}/${repo}" --body "${escapeShell(comment)}"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      synced++;

      // Close issue if completed
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

  // Save updated roadmap
  roadmap.last_github_sync = new Date().toISOString();
  saveRoadmap(roadmap);

  spinner.succeed(`Synced ${synced} issues${closed > 0 ? `, closed ${closed}` : ''}`);
}

/**
 * Create: Generate ROADMAP.json from existing GitHub issues
 */
async function runRoadmapCreate(options) {
  showHeader('Create Roadmap from GitHub Issues');

  if (!checkGhCli()) return;

  const config = loadConfig();
  const owner = config?.owner || await getRepoOwner();
  const repo = config?.repo || await getRepoName();

  if (!owner || !repo) {
    console.log(chalk.red('Could not determine repository. Run `gtask setup` first.'));
    return;
  }

  // Get roadmap details
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
    // Fetch issues
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

    // Convert to roadmap projects
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

    // Create roadmap structure
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

    // Save roadmap
    const docsDir = join(process.cwd(), '.claude', 'docs', roadmapSlug);
    mkdirSync(docsDir, { recursive: true });

    const roadmapPath = join(docsDir, 'ROADMAP.json');
    writeFileSync(roadmapPath, JSON.stringify(roadmap, null, 2));

    // Create EXECUTION_STATE.json
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

/**
 * Status: Show sync status dashboard
 */
async function runRoadmapStatus(options) {
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

    // Summary
    const completed = roadmap.projects.filter((p) => p.status === 'completed').length;
    const inProgress = roadmap.projects.filter((p) => p.status === 'in_progress').length;
    const pending = roadmap.projects.filter((p) => p.status === 'pending').length;

    console.log(`  Total: ${roadmap.total_projects} projects`);
    console.log(`  ${chalk.green('✓')} Completed: ${completed}`);
    console.log(`  ${chalk.yellow('●')} In Progress: ${inProgress}`);
    console.log(`  ${chalk.dim('○')} Pending: ${pending}`);
    console.log('');

    // GitHub integration status
    if (roadmap.github_integrated) {
      console.log(chalk.green('  GitHub Integration: ✓ Enabled'));
      if (roadmap.last_github_sync) {
        console.log(chalk.dim(`  Last Sync: ${new Date(roadmap.last_github_sync).toLocaleString()}`));
      }
      console.log('');

      // Project-level status
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

  // Actions
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

/**
 * Helper: Check gh CLI is available
 */
function checkGhCli() {
  try {
    execSync('gh --version', { stdio: 'pipe' });
    return true;
  } catch (e) {
    console.log(chalk.red('GitHub CLI (gh) not found'));
    console.log(chalk.dim('Install from: https://cli.github.com/'));
    return false;
  }
}

/**
 * Helper: Get repo owner from git
 */
function getRepoOwner() {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remote.match(/github\.com[:/]([^/]+)/);
    return match?.[1];
  } catch (e) {
    return null;
  }
}

/**
 * Helper: Get repo name from git
 */
function getRepoName() {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remote.match(/github\.com[:/][^/]+\/([^/.]+)/);
    return match?.[1];
  } catch (e) {
    return null;
  }
}

/**
 * Helper: Select a roadmap interactively
 */
async function selectRoadmap(filePath) {
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

/**
 * Helper: Save roadmap back to file
 */
function saveRoadmap(roadmap) {
  const path = roadmap.path;
  if (path) {
    const data = { ...roadmap };
    delete data.path;
    delete data.dir;
    data.last_updated = new Date().toISOString();
    writeFileSync(path, JSON.stringify(data, null, 2));
  }
}

/**
 * Helper: Detect issue type from project metadata
 */
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

/**
 * Helper: Build issue body from project
 */
function buildIssueBody(project, roadmap) {
  // Detect issue type
  const issueType = detectIssueType(project);

  // Get type-specific acceptance criteria
  const acceptanceCriteria = getTypeAcceptanceCriteria(issueType);

  // Generate CCASP-META block
  const progressPath = project.phase_dev_config?.progress_json_path || `.claude/docs/${roadmap.roadmap_slug}/PROGRESS.json`;
  const meta = generateCCSAPMeta({
    source: '/roadmap import',
    slug: roadmap.roadmap_slug,
    phase: project.phase_dev_config?.current_phase || null,
    task: project.project_id,
    progressFile: progressPath,
    issueType: issueType,
  });

  // Build main body
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

  // Add dependencies section if present
  if (project.dependencies && project.dependencies.length > 0) {
    bodyParts.push('### Dependencies');
    bodyParts.push('');
    bodyParts.push(project.dependencies.map((d) => `- ${d}`).join('\n'));
    bodyParts.push('');
  }

  // Add acceptance criteria
  bodyParts.push('### Acceptance Criteria');
  bodyParts.push('');
  bodyParts.push(acceptanceCriteria.map((ac) => `- [ ] ${ac}`).join('\n'));
  bodyParts.push('');

  // Generate files section
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

/**
 * Helper: Build labels for issue
 */
function buildLabels(project, roadmap) {
  const labels = ['roadmap'];

  // Priority label
  const priorityLabel = PRIORITY_LABELS[project.priority];
  if (priorityLabel) {
    labels.push(priorityLabel);
  }

  // Add type-specific labels
  const issueType = detectIssueType(project);
  const typeLabels = getTypeLabels(issueType);
  labels.push(...typeLabels);

  return labels;
}

/**
 * Helper: Build sync comment
 */
function buildSyncComment(project, completion, details, roadmap) {
  const statusEmoji = completion >= 100 ? '✅' : completion > 0 ? '🔄' : '⏳';

  return `${statusEmoji} **Roadmap Sync Update**

**Status:** ${project.status}
**Completion:** ${completion}%
${details ? `**Progress:** ${details}` : ''}

---
*Synced from ${roadmap.roadmap_name} via gtask*`;
}

/**
 * Helper: Extract priority from labels
 */
function extractPriority(labels) {
  const labelNames = labels.map((l) => l.name?.toLowerCase() || l.toLowerCase());

  if (labelNames.some((l) => l.includes('critical') || l.includes('p0'))) return 'CRITICAL';
  if (labelNames.some((l) => l.includes('high') || l.includes('p1'))) return 'HIGH';
  if (labelNames.some((l) => l.includes('low') || l.includes('p3'))) return 'LOW';
  return 'MEDIUM';
}

/**
 * Helper: Escape shell string
 */
function escapeShell(str) {
  return str.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/`/g, '\\`');
}
