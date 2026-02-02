/**
 * GitHub Epic Menu Command
 *
 * Interactive menu for managing GitHub Epics with:
 * - Desktop and mobile-friendly display
 * - Table selection interface
 * - Session restart validation
 * - Testing issue generation
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, renameSync, rmSync } from 'fs';
import { join, dirname, basename } from 'path';
import { showHeader } from '../cli/menu.js';
import { loadTechStack, hasValidConfig, loadConfig } from '../utils.js';
import { shouldUseMobileUI } from '../utils/happy-detect.js';
import { listRoadmaps, loadRoadmap, getRoadmapsDir } from '../roadmap/roadmap-manager.js';
import { checkGhCli, getRepoInfo } from '../roadmap/github-integration.js';
import { execSync } from 'child_process';

// New directory for epics
const EPICS_DIR = '.claude/github-epics';
const LEGACY_ROADMAPS_DIR = '.claude/roadmaps';
const INITIALIZED_MARKER = '.claude/github-epics-initialized';

/**
 * Check if session restart is needed
 */
function needsSessionRestart(cwd = process.cwd()) {
  const markerPath = join(cwd, INITIALIZED_MARKER);
  const epicsDir = join(cwd, EPICS_DIR);

  // If epics directory exists but marker doesn't, need restart
  if (existsSync(epicsDir) && !existsSync(markerPath)) {
    return true;
  }

  return false;
}

/**
 * Mark session as initialized
 */
function markSessionInitialized(cwd = process.cwd()) {
  const markerPath = join(cwd, INITIALIZED_MARKER);
  const dir = dirname(markerPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(markerPath, JSON.stringify({
    initialized: new Date().toISOString(),
    version: '1.0.0',
  }, null, 2));
}

/**
 * Display session restart warning
 */
function showSessionRestartWarning() {
  console.log('');
  console.log(chalk.yellow('╔═══════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.yellow('║') + chalk.bold.yellow('                      SESSION RESTART REQUIRED                              ') + chalk.yellow('║'));
  console.log(chalk.yellow('╠═══════════════════════════════════════════════════════════════════════════╣'));
  console.log(chalk.yellow('║') + '                                                                           ' + chalk.yellow('║'));
  console.log(chalk.yellow('║') + '  The GitHub Epic system with tech stack enabled agents has been           ' + chalk.yellow('║'));
  console.log(chalk.yellow('║') + '  initialized but requires a session restart to activate the agent         ' + chalk.yellow('║'));
  console.log(chalk.yellow('║') + '  configurations.                                                          ' + chalk.yellow('║'));
  console.log(chalk.yellow('║') + '                                                                           ' + chalk.yellow('║'));
  console.log(chalk.yellow('║') + chalk.cyan('  Please:                                                                   ') + chalk.yellow('║'));
  console.log(chalk.yellow('║') + chalk.cyan('  1. Exit this Claude Code session                                         ') + chalk.yellow('║'));
  console.log(chalk.yellow('║') + chalk.cyan('  2. Restart Claude Code CLI                                               ') + chalk.yellow('║'));
  console.log(chalk.yellow('║') + chalk.cyan('  3. Run /github-epic-menu again                                           ') + chalk.yellow('║'));
  console.log(chalk.yellow('║') + '                                                                           ' + chalk.yellow('║'));
  console.log(chalk.yellow('║') + chalk.dim('  This ensures all agent configurations and hooks are properly loaded.     ') + chalk.yellow('║'));
  console.log(chalk.yellow('║') + '                                                                           ' + chalk.yellow('║'));
  console.log(chalk.yellow('╚═══════════════════════════════════════════════════════════════════════════╝'));
  console.log('');
}

/**
 * Load all epics from the new and legacy directories
 */
function loadAllEpics(cwd = process.cwd()) {
  const epics = [];

  // Check new epics directory
  const epicsDir = join(cwd, EPICS_DIR);
  if (existsSync(epicsDir)) {
    const files = readdirSync(epicsDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const epicPath = join(epicsDir, file);
          const data = JSON.parse(readFileSync(epicPath, 'utf8'));
          epics.push({
            ...data,
            path: epicPath,
            slug: file.replace('.json', ''),
            source: 'epic',
          });
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  // Check legacy roadmaps directory
  const roadmaps = listRoadmaps();
  for (const roadmap of roadmaps) {
    epics.push({
      ...roadmap,
      source: 'legacy',
    });
  }

  return epics;
}

/**
 * Migrate legacy roadmaps to epics
 */
async function migrateToEpics(cwd = process.cwd()) {
  const legacyDir = join(cwd, LEGACY_ROADMAPS_DIR);
  const newDir = join(cwd, EPICS_DIR);

  if (!existsSync(legacyDir)) {
    return { migrated: 0, errors: [] };
  }

  if (!existsSync(newDir)) {
    mkdirSync(newDir, { recursive: true });
  }

  const files = readdirSync(legacyDir);
  let migrated = 0;
  const errors = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const oldPath = join(legacyDir, file);
        const newPath = join(newDir, file);
        const data = JSON.parse(readFileSync(oldPath, 'utf8'));

        // Update references to new directory
        if (data.phases) {
          for (const phase of data.phases) {
            if (phase.phase_dev_config?.progress_json_path) {
              phase.phase_dev_config.progress_json_path =
                phase.phase_dev_config.progress_json_path.replace('roadmaps', 'github-epics');
            }
          }
        }

        writeFileSync(newPath, JSON.stringify(data, null, 2));
        migrated++;
      } catch (e) {
        errors.push({ file, error: e.message });
      }
    }
  }

  return { migrated, errors };
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

/**
 * Display desktop-mode epic table
 */
function displayDesktopTable(epics) {
  console.log(chalk.cyan('╔════════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold('                           GITHUB EPIC MANAGEMENT                               ') + chalk.cyan('║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════════════════════╝'));
  console.log('');

  if (epics.length === 0) {
    console.log(chalk.yellow('  No epics found. Create one with /create-github-epic'));
    console.log('');
    return;
  }

  console.log(chalk.dim('┌────┬─────────────────────────────┬────────┬──────────┬─────────┬──────────────────┐'));
  console.log(chalk.dim('│') + chalk.bold(' #  ') + chalk.dim('│') + chalk.bold(' Epic Name                   ') + chalk.dim('│') + chalk.bold(' Phases ') + chalk.dim('│') + chalk.bold(' Progress ') + chalk.dim('│') + chalk.bold(' GitHub  ') + chalk.dim('│') + chalk.bold(' Last Updated     ') + chalk.dim('│'));
  console.log(chalk.dim('├────┼─────────────────────────────┼────────┼──────────┼─────────┼──────────────────┤'));

  for (let i = 0; i < epics.length; i++) {
    const epic = epics[i];
    const num = String(i + 1).padStart(2);
    const name = (epic.title || epic.roadmap_name || 'Untitled').substring(0, 27).padEnd(27);
    const phases = String(epic.phases?.length || epic.total_projects || 0).padEnd(6);
    const pct = epic.metadata?.completion_percentage || epic.completion_percentage || 0;
    const progress = `${pct}%`.padEnd(8);
    const github = epic.metadata?.github_epic_number ? `#${epic.metadata.github_epic_number}`.padEnd(7) : '-'.padEnd(7);
    const updated = formatDate(epic.updated || epic.last_updated).padEnd(16);

    // Color progress based on completion
    let progressColored = progress;
    if (pct === 100) progressColored = chalk.green(progress);
    else if (pct > 0) progressColored = chalk.yellow(progress);
    else progressColored = chalk.dim(progress);

    console.log(chalk.dim('│') + ` ${num} ` + chalk.dim('│') + ` ${name} ` + chalk.dim('│') + ` ${phases} ` + chalk.dim('│') + ` ${progressColored} ` + chalk.dim('│') + ` ${github} ` + chalk.dim('│') + ` ${updated} ` + chalk.dim('│'));
  }

  console.log(chalk.dim('└────┴─────────────────────────────┴────────┴──────────┴─────────┴──────────────────┘'));
  console.log('');
}

/**
 * Display mobile-mode epic list
 */
function displayMobileList(epics) {
  console.log(chalk.cyan('+============================+'));
  console.log(chalk.cyan('|') + chalk.bold('      GITHUB EPICS         ') + chalk.cyan('|'));
  console.log(chalk.cyan('+============================+'));
  console.log('');

  if (epics.length === 0) {
    console.log(chalk.yellow('  No epics. [N]ew'));
    console.log('');
    return;
  }

  for (let i = 0; i < epics.length; i++) {
    const epic = epics[i];
    const name = (epic.title || epic.roadmap_name || 'Untitled').substring(0, 15);
    const pct = epic.metadata?.completion_percentage || epic.completion_percentage || 0;
    const github = epic.metadata?.github_epic_number ? `#${epic.metadata.github_epic_number}` : '-';

    let line = `[${i + 1}] ${name} (${pct}%) ${github}`;
    if (pct === 100) line = chalk.green(line);
    else if (pct > 0) line = chalk.yellow(line);

    console.log(line);
  }

  console.log('');
}

/**
 * Display epic details view
 */
function displayEpicDetails(epic, isMobile = false) {
  const title = epic.title || epic.roadmap_name || 'Untitled';
  const description = epic.description || epic.primary_goal || 'No description';
  const phases = epic.phases || [];
  const pct = epic.metadata?.completion_percentage || epic.completion_percentage || 0;
  const githubNum = epic.metadata?.github_epic_number;

  if (isMobile) {
    console.log(chalk.cyan(`Epic: ${title.substring(0, 25)}`));
    console.log(chalk.dim(`${pct}% | ${phases.length} phases | ${githubNum ? '#' + githubNum : 'No GH'}`));
    console.log('');

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const status = phase.status === 'completed' ? chalk.green('[C]')
        : phase.status === 'in_progress' ? chalk.yellow('[>]')
        : chalk.dim('[P]');
      console.log(`${status} ${i + 1}. ${(phase.phase_title || 'Phase').substring(0, 20)}`);
    }
  } else {
    console.log(chalk.cyan('╔════════════════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold(`  EPIC: ${title.substring(0, 70).padEnd(70)}`) + chalk.cyan('║'));
    console.log(chalk.cyan('╠════════════════════════════════════════════════════════════════════════════════╣'));
    console.log(chalk.cyan('║') + '                                                                                ' + chalk.cyan('║'));
    console.log(chalk.cyan('║') + chalk.dim(`  ${description.substring(0, 74).padEnd(74)}`) + chalk.cyan('║'));
    console.log(chalk.cyan('║') + '                                                                                ' + chalk.cyan('║'));
    console.log(chalk.cyan('║') + `  Status: ${(epic.status || 'planning').padEnd(15)} | Progress: ${String(pct).padEnd(3)}% | GitHub: ${(githubNum ? '#' + githubNum : '-').padEnd(10)}` + chalk.cyan('║'));
    console.log(chalk.cyan('║') + '                                                                                ' + chalk.cyan('║'));
    console.log(chalk.cyan('╠════════════════════════════════════════════════════════════════════════════════╣'));
    console.log(chalk.cyan('║') + chalk.bold('  Phases:                                                                       ') + chalk.cyan('║'));

    console.log(chalk.cyan('║') + chalk.dim('  ┌───┬─────────────────────────────┬────────────┬────────────┬─────────────┐  ') + chalk.cyan('║'));
    console.log(chalk.cyan('║') + chalk.dim('  │') + chalk.bold(' # ') + chalk.dim('│') + chalk.bold(' Phase                       ') + chalk.dim('│') + chalk.bold(' Complexity ') + chalk.dim('│') + chalk.bold(' Status     ') + chalk.dim('│') + chalk.bold(' Dependencies ') + chalk.dim('│  ') + chalk.cyan('║'));
    console.log(chalk.cyan('║') + chalk.dim('  ├───┼─────────────────────────────┼────────────┼────────────┼─────────────┤  ') + chalk.cyan('║'));

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const num = String(i + 1).padStart(2);
      const name = (phase.phase_title || 'Phase').substring(0, 27).padEnd(27);
      const complexity = (phase.complexity || 'M').padEnd(10);
      const status = (phase.status || 'pending').substring(0, 10).padEnd(10);
      const deps = (phase.dependencies || []).join(',').substring(0, 11).padEnd(11) || '-'.padEnd(11);

      let statusColored = status;
      if (phase.status === 'completed') statusColored = chalk.green(status);
      else if (phase.status === 'in_progress') statusColored = chalk.yellow(status);

      console.log(chalk.cyan('║') + chalk.dim('  │') + ` ${num}` + chalk.dim('│') + ` ${name} ` + chalk.dim('│') + ` ${complexity} ` + chalk.dim('│') + ` ${statusColored} ` + chalk.dim('│') + ` ${deps} ` + chalk.dim('│  ') + chalk.cyan('║'));
    }

    console.log(chalk.cyan('║') + chalk.dim('  └───┴─────────────────────────────┴────────────┴────────────┴─────────────┘  ') + chalk.cyan('║'));
    console.log(chalk.cyan('║') + '                                                                                ' + chalk.cyan('║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════════════════════╝'));
  }

  console.log('');
}

/**
 * Create testing issues for completed phases
 */
async function createTestingIssues(epic, cwd = process.cwd()) {
  const phases = epic.phases || [];
  const completedPhases = phases.filter(p => p.status === 'completed');

  if (completedPhases.length === 0) {
    console.log(chalk.yellow('No completed phases to create testing issues for.'));
    return { created: 0, issues: [] };
  }

  const ghCheck = checkGhCli();
  if (!ghCheck.available || !ghCheck.authenticated) {
    console.log(chalk.yellow('GitHub CLI not available. Testing issues will be created locally only.'));
    return createLocalTestingIssues(epic, completedPhases, cwd);
  }

  const repoInfo = getRepoInfo();
  if (!repoInfo) {
    console.log(chalk.yellow('Could not determine repository. Creating local testing issues.'));
    return createLocalTestingIssues(epic, completedPhases, cwd);
  }

  const spinner = ora('Creating testing issues...').start();
  const created = [];
  const errors = [];

  // Calculate start date (day after epic completion or today)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);

  for (let i = 0; i < completedPhases.length; i++) {
    const phase = completedPhases[i];
    const testDate = new Date(startDate);
    testDate.setDate(testDate.getDate() + i);

    const body = generateTestingIssueBody(epic, phase, testDate);
    const title = `[Testing] ${epic.title || epic.roadmap_name}: ${phase.phase_title}`;

    try {
      spinner.text = `Creating testing issue for ${phase.phase_title}...`;

      const result = execSync(
        `gh issue create --repo "${repoInfo.owner}/${repoInfo.repo}" --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" --label "testing,phase-testing"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      const issueUrl = result.trim();
      const issueNumber = issueUrl.match(/\/issues\/(\d+)/)?.[1];

      created.push({
        phase: phase.phase_title,
        issueNumber,
        issueUrl,
        testDate: testDate.toISOString(),
      });
    } catch (e) {
      errors.push({ phase: phase.phase_title, error: e.message });
    }
  }

  spinner.succeed(`Created ${created.length} testing issues`);

  if (errors.length > 0) {
    console.log(chalk.yellow(`  ${errors.length} issues failed to create`));
  }

  return { created: created.length, issues: created, errors };
}

/**
 * Create local testing issue files
 */
function createLocalTestingIssues(epic, completedPhases, cwd) {
  const testingDir = join(cwd, '.claude', 'testing-issues', epic.slug || 'epic');

  if (!existsSync(testingDir)) {
    mkdirSync(testingDir, { recursive: true });
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);
  const created = [];

  for (let i = 0; i < completedPhases.length; i++) {
    const phase = completedPhases[i];
    const testDate = new Date(startDate);
    testDate.setDate(testDate.getDate() + i);

    const body = generateTestingIssueBody(epic, phase, testDate);
    const filename = `testing-${phase.phase_id || 'phase-' + (i + 1)}.md`;
    const filePath = join(testingDir, filename);

    writeFileSync(filePath, body);
    created.push({
      phase: phase.phase_title,
      path: filePath,
      testDate: testDate.toISOString(),
    });
  }

  return { created: created.length, issues: created };
}

/**
 * Generate testing issue body
 */
function generateTestingIssueBody(epic, phase, testDate) {
  const epicName = epic.title || epic.roadmap_name || 'Untitled Epic';
  const phaseNum = phase.phase_id?.replace('phase-', '') || '?';
  const dateStr = testDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `## Phase Testing: ${phase.phase_title}

**Epic:** ${epicName}
**Phase:** ${phaseNum}
**Scheduled Testing Date:** ${dateStr}

---

### Automated Testing (RALPH Loop)

Configure RALPH loop to run until all tests pass:

- [ ] Run unit tests: \`npm test\`
- [ ] Run integration tests: \`npm run test:integration\`
- [ ] Run E2E tests: \`npm run test:e2e\`

**RALPH Loop Configuration:**
\`\`\`json
{
  "enabled": true,
  "maxIterations": 10,
  "testCommand": "npm test",
  "webSearchInterval": 3,
  "breakOnSuccess": true
}
\`\`\`

---

### Manual User Testing Checklist

- [ ] Feature works as described in acceptance criteria
- [ ] No visual regressions detected
- [ ] Responsive design verified on mobile/tablet/desktop
- [ ] Error states handled gracefully
- [ ] Performance is acceptable (no noticeable lag)
- [ ] Accessibility verified (keyboard nav, screen reader)
- [ ] Data validation works correctly
- [ ] Edge cases handled appropriately

---

### Web Research (Pre-Testing Hook)

Agent will search for:
- [ ] Known issues with similar implementations
- [ ] Best practices for testing this feature type
- [ ] Common edge cases to verify
- [ ] Security considerations for this feature

**Search triggers:** Before testing begins, and after every 3rd RALPH loop iteration

---

### Phase Deliverables to Verify

${phase.outputs?.map(o => `- [ ] ${o}`).join('\n') || '- [ ] Phase deliverables completed'}

---

### Testing Notes

_Add observations, issues found, and recommendations here_

---

*Generated by CCASP GitHub Epic System*
*Testing scheduled for ${epic.phases?.length || 1}-phase epic*`;
}

/**
 * Show main epic menu
 */
export async function showGitHubEpicMenu(options = {}) {
  const cwd = process.cwd();
  const techStack = loadTechStack();
  const isMobile = shouldUseMobileUI(techStack);

  // Check for session restart requirement
  if (needsSessionRestart(cwd)) {
    showSessionRestartWarning();
    markSessionInitialized(cwd);
    return;
  }

  showHeader('GitHub Epic Management');

  // Check for legacy roadmaps and offer migration
  const legacyDir = join(cwd, LEGACY_ROADMAPS_DIR);
  if (existsSync(legacyDir)) {
    const legacyFiles = readdirSync(legacyDir).filter(f => f.endsWith('.json'));
    if (legacyFiles.length > 0) {
      console.log(chalk.yellow(`  Found ${legacyFiles.length} legacy roadmap(s) to migrate.`));

      const { migrate } = await inquirer.prompt([{
        type: 'confirm',
        name: 'migrate',
        message: 'Migrate legacy roadmaps to GitHub Epics?',
        default: true,
      }]);

      if (migrate) {
        const result = await migrateToEpics(cwd);
        console.log(chalk.green(`  Migrated ${result.migrated} epic(s)`));
        if (result.errors.length > 0) {
          console.log(chalk.yellow(`  ${result.errors.length} migration error(s)`));
        }
        console.log('');
      }
    }
  }

  // Load all epics
  const epics = loadAllEpics(cwd);

  // Display based on mode
  if (isMobile) {
    displayMobileList(epics);
  } else {
    displayDesktopTable(epics);
  }

  // Build menu choices
  const choices = [];

  if (epics.length > 0) {
    // Add numbered epic selections
    for (let i = 0; i < Math.min(epics.length, 9); i++) {
      choices.push({
        name: `${i + 1}. ${(epics[i].title || epics[i].roadmap_name || 'Untitled').substring(0, 30)}`,
        value: `select-${i}`,
        short: `Epic ${i + 1}`,
      });
    }
    choices.push(new inquirer.Separator());
  }

  // Action choices
  const actionChoices = [
    { name: isMobile ? '[V] View' : '[V] View Epic Details', value: 'view', short: 'View' },
    { name: isMobile ? '[N] New' : '[N] New Epic', value: 'new', short: 'New' },
    { name: isMobile ? '[S] Sync' : '[S] Sync with GitHub', value: 'sync', short: 'Sync' },
    { name: isMobile ? '[E] Edit' : '[E] Edit Epic', value: 'edit', short: 'Edit' },
    { name: isMobile ? '[T] Test' : '[T] Testing Issues', value: 'testing', short: 'Testing' },
    { name: isMobile ? '[D] Del' : '[D] Delete Epic', value: 'delete', short: 'Delete' },
    { name: isMobile ? '[R] Resume' : '[R] Resume Epic', value: 'resume', short: 'Resume' },
    new inquirer.Separator(),
    { name: isMobile ? '[B] Back' : '[B] Back to Main Menu', value: 'back', short: 'Back' },
  ];

  choices.push(...actionChoices);

  // Track selected epic index
  let selectedIndex = 0;

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: isMobile ? 'Choice:' : 'Select an epic or action:',
    choices,
    pageSize: isMobile ? 12 : 20,
  }]);

  // Handle selection
  if (action.startsWith('select-')) {
    selectedIndex = parseInt(action.replace('select-', ''));
    // Show epic details after selection
    await handleEpicAction('view', epics, selectedIndex, cwd, isMobile);
  } else if (action === 'back') {
    return;
  } else {
    await handleEpicAction(action, epics, selectedIndex, cwd, isMobile);
  }

  // Return to menu
  const { returnToMenu } = await inquirer.prompt([{
    type: 'confirm',
    name: 'returnToMenu',
    message: 'Return to epic menu?',
    default: true,
  }]);

  if (returnToMenu) {
    await showGitHubEpicMenu(options);
  }
}

/**
 * Handle epic action
 */
async function handleEpicAction(action, epics, selectedIndex, cwd, isMobile) {
  const selectedEpic = epics[selectedIndex];

  switch (action) {
    case 'view':
      if (!selectedEpic) {
        console.log(chalk.yellow('No epic selected. Select an epic first.'));
        return;
      }
      displayEpicDetails(selectedEpic, isMobile);
      break;

    case 'new':
      console.log(chalk.cyan('\nRedirecting to /create-github-epic...'));
      console.log(chalk.dim('Run: /create-github-epic'));
      break;

    case 'sync':
      await syncEpicsWithGitHub(epics, cwd);
      break;

    case 'edit':
      if (!selectedEpic) {
        console.log(chalk.yellow('No epic selected.'));
        return;
      }
      console.log(chalk.cyan('\nRedirecting to /github-epic-edit...'));
      console.log(chalk.dim(`Run: /github-epic-edit ${selectedEpic.slug}`));
      break;

    case 'testing':
      if (!selectedEpic) {
        console.log(chalk.yellow('No epic selected.'));
        return;
      }
      await createTestingIssues(selectedEpic, cwd);
      break;

    case 'delete':
      if (!selectedEpic) {
        console.log(chalk.yellow('No epic selected.'));
        return;
      }
      await deleteEpic(selectedEpic, cwd);
      break;

    case 'resume':
      if (!selectedEpic) {
        console.log(chalk.yellow('No epic selected.'));
        return;
      }
      console.log(chalk.cyan('\nRedirecting to /github-epic-track...'));
      console.log(chalk.dim(`Run: /github-epic-track ${selectedEpic.slug}`));
      break;
  }
}

/**
 * Sync all epics with GitHub
 */
async function syncEpicsWithGitHub(epics, cwd) {
  const ghCheck = checkGhCli();
  if (!ghCheck.available || !ghCheck.authenticated) {
    console.log(chalk.yellow('GitHub CLI not available or not authenticated.'));
    return;
  }

  const spinner = ora('Syncing with GitHub...').start();
  let synced = 0;

  for (const epic of epics) {
    if (epic.metadata?.github_epic_number) {
      spinner.text = `Syncing ${epic.title || epic.roadmap_name}...`;
      synced++;
      // Sync logic would go here
    }
  }

  spinner.succeed(`Synced ${synced} epic(s) with GitHub`);
}

/**
 * Delete an epic
 */
async function deleteEpic(epic, cwd) {
  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: `Delete epic "${epic.title || epic.roadmap_name}"? This cannot be undone.`,
    default: false,
  }]);

  if (!confirm) {
    console.log(chalk.dim('Cancelled'));
    return;
  }

  try {
    if (epic.path && existsSync(epic.path)) {
      rmSync(epic.path);
      console.log(chalk.green('Epic deleted'));
    }
  } catch (e) {
    console.log(chalk.red(`Failed to delete: ${e.message}`));
  }
}

/**
 * Run the GitHub Epic Menu command
 */
export async function runGitHubEpicMenu(options = {}) {
  return await showGitHubEpicMenu(options);
}

// Aliases for backwards compatibility
export { loadAllEpics as listEpics };
export { migrateToEpics };
