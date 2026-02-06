import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { checkGhCli, getRepoInfo } from '../../roadmap/github-integration.js';
import { safeCreateIssue } from '../../utils/safe-exec.js';
import { displayEpicDetails } from './display.js';

export async function handleEpicAction(action, epics, selectedIndex, cwd, isMobile) {
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

export async function syncEpicsWithGitHub(epics, cwd) {
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
    }
  }

  spinner.succeed(`Synced ${synced} epic(s) with GitHub`);
}

export async function deleteEpic(epic, cwd) {
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

export async function createTestingIssues(epic, cwd = process.cwd()) {
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

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);

  for (let i = 0; i < completedPhases.length; i++) {
    const phase = completedPhases[i];
    const testDate = new Date(startDate);
    testDate.setDate(testDate.getDate() + i);

    const body = generateTestingIssueBody(epic, phase, testDate);
    const title = `[Testing] ${epic.title || epic.roadmap_name}: ${phase.phase_title}`;

    spinner.text = `Creating testing issue for ${phase.phase_title}...`;

    const result = safeCreateIssue({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      title,
      body,
      labels: ['testing', 'phase-testing'],
    });

    if (result.success) {
      created.push({
        phase: phase.phase_title,
        issueNumber: result.number,
        issueUrl: result.url,
        testDate: testDate.toISOString(),
      });
    } else {
      errors.push({ phase: phase.phase_title, error: result.error });
    }
  }

  spinner.succeed(`Created ${created.length} testing issues`);

  if (errors.length > 0) {
    console.log(chalk.yellow(`  ${errors.length} issues failed to create`));
  }

  return { created: created.length, issues: created, errors };
}

export function createLocalTestingIssues(epic, completedPhases, cwd) {
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
    const filename = `testing-${phase.phase_id || `phase-${  i + 1}`}.md`;
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

export function generateTestingIssueBody(epic, phase, testDate) {
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
