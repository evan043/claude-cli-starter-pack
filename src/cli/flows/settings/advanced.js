/**
 * Settings Flow - Advanced Configuration
 *
 * Submodule: Ralph Loop, GitHub Task, Vision & Epics settings
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { showHeader, showSuccess } from '../../menu/display.js';
import { loadTechStack, saveTechStack } from '../../../utils.js';

/**
 * Configure Ralph Loop Settings
 */
export async function configureRalphLoop(techStack) {
  console.log('');
  showHeader('Ralph Loop Configuration');

  console.log(chalk.dim('  Configure Ralph Loop test-fix cycles and occurrence auditing.\n'));

  const current = techStack.ralphLoop || {};
  const occurrenceAudit = current.occurrenceAudit || {};

  const answers = await inquirer.prompt([
    {
      type: 'number',
      name: 'maxIterations',
      message: 'Maximum iterations before stopping:',
      default: current.maxIterations || 10,
    },
    {
      type: 'confirm',
      name: 'webSearchEnabled',
      message: 'Enable web search for solutions (every 3rd failure)?',
      default: current.webSearchEnabled !== false,
    },
    {
      type: 'confirm',
      name: 'occurrenceAuditEnabled',
      message: 'Enable Occurrence Auditor (scan for similar patterns after fix)?',
      default: occurrenceAudit.enabled !== false,
    },
    {
      type: 'list',
      name: 'auditScope',
      message: 'Occurrence audit scope:',
      when: (ans) => ans.occurrenceAuditEnabled,
      choices: [
        { name: 'Same directory only', value: 'directory' },
        { name: 'Entire project (recommended)', value: 'project' },
        { name: 'Custom glob pattern', value: 'custom' },
      ],
      default: occurrenceAudit.scope || 'project',
    },
    {
      type: 'input',
      name: 'customGlob',
      message: 'Custom glob pattern (e.g., "src/**/*.ts"):',
      when: (ans) => ans.auditScope === 'custom',
      default: occurrenceAudit.customGlob || 'src/**/*.{js,ts,jsx,tsx}',
    },
    {
      type: 'list',
      name: 'autoApplyThreshold',
      message: 'Auto-apply patches threshold:',
      when: (ans) => ans.occurrenceAuditEnabled,
      choices: [
        { name: 'Never - always ask (safest)', value: 'never' },
        { name: '1-2 matches - auto-apply if few', value: '1-2' },
        { name: '3+ matches - auto-apply if many (use with caution)', value: '3+' },
      ],
      default: occurrenceAudit.autoApplyThreshold || 'never',
    },
  ]);

  techStack.ralphLoop = {
    maxIterations: answers.maxIterations,
    webSearchEnabled: answers.webSearchEnabled,
    occurrenceAudit: {
      enabled: answers.occurrenceAuditEnabled,
      scope: answers.auditScope || 'project',
      customGlob: answers.customGlob || null,
      autoApplyThreshold: answers.autoApplyThreshold || 'never',
    },
  };

  saveTechStack(techStack);
  showSuccess('Ralph Loop configuration saved!', [
    '',
    `Max iterations: ${answers.maxIterations}`,
    `Web search: ${answers.webSearchEnabled ? 'Enabled' : 'Disabled'}`,
    `Occurrence auditor: ${answers.occurrenceAuditEnabled ? 'Enabled' : 'Disabled'}`,
  ]);
}

/**
 * Configure GitHub Task Settings
 */
export async function configureGitHubTask(techStack) {
  console.log('');
  showHeader('GitHub Task Configuration');

  console.log(chalk.dim('  Configure /github-task and /github-task-multiple behavior.\n'));

  const current = techStack.githubTask || {};

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'autoSplitMode',
      message: 'Auto-split detection for multi-task prompts:',
      choices: [
        { name: 'Suggest - show recommendation (recommended)', value: 'suggest' },
        { name: 'Automatic - auto-split without prompting', value: 'automatic' },
        { name: 'Disabled - always create single issue', value: 'disabled' },
      ],
      default: current.autoSplitMode || 'suggest',
    },
    {
      type: 'list',
      name: 'defaultPostAction',
      message: 'After creating multiple issues:',
      choices: [
        { name: 'Ask every time', value: 'ask' },
        { name: 'Always create Phase Dev Plan', value: 'phase-dev' },
        { name: 'Always create Epic', value: 'epic' },
        { name: 'Always add to Project Board only', value: 'board' },
        { name: 'No grouping (standalone issues)', value: 'none' },
      ],
      default: current.defaultPostAction || 'ask',
    },
    {
      type: 'list',
      name: 'parallelAgentModel',
      message: 'Model for parallel issue creation agents:',
      choices: [
        { name: 'Sonnet 4.5 - thorough analysis (recommended)', value: 'sonnet' },
        { name: 'Haiku - fast, cost-effective', value: 'haiku' },
      ],
      default: current.parallelAgentModel || 'sonnet',
    },
    {
      type: 'number',
      name: 'maxParallelIssues',
      message: 'Maximum issues to create in parallel:',
      default: current.maxParallelIssues || 6,
    },
    {
      type: 'confirm',
      name: 'autoAddToProjectBoard',
      message: 'Automatically add created issues to Project Board?',
      default: current.autoAddToProjectBoard !== false,
    },
  ]);

  techStack.githubTask = {
    autoSplitMode: answers.autoSplitMode,
    defaultPostAction: answers.defaultPostAction,
    parallelAgentModel: answers.parallelAgentModel,
    maxParallelIssues: answers.maxParallelIssues,
    autoAddToProjectBoard: answers.autoAddToProjectBoard,
    defaultLabels: current.defaultLabels || ['enhancement'],
  };

  saveTechStack(techStack);
  showSuccess('GitHub Task configuration saved!', [
    '',
    `Auto-split: ${answers.autoSplitMode}`,
    `Post-creation: ${answers.defaultPostAction}`,
    `Agent model: ${answers.parallelAgentModel}`,
  ]);
}

/**
 * Configure Vision & Epics
 */
export async function configureVisionEpics() {
  const techStack = loadTechStack();
  const currentState = techStack?.visionEpics?.enabled || false;

  console.log('');
  console.log(chalk.cyan('╔═══════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold('                        VISION & EPICS CONFIGURATION                          ') + chalk.cyan('║'));
  console.log(chalk.cyan('╠═══════════════════════════════════════════════════════════════════════════════╣'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('║') + chalk.dim('  Vision & Epics adds strategic planning layers to your project:              ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('                                                                               ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('  • Vision: AI-managed strategic direction with OKRs (auto-reminders)         ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('  • Epics: User-managed initiatives contained within Vision                   ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('                                                                               ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.yellow('  Note: Roadmaps, Phase Dev Plans, and Task Lists work independently         ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.yellow('  and are always available regardless of this setting.                       ') + chalk.cyan('║'));
  console.log(`${chalk.cyan('║')  }                                                                               ${  chalk.cyan('║')}`);
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════════════════╝'));
  console.log('');

  // Check prerequisites
  const hasTechStack = techStack && Object.keys(techStack).length > 0;
  const hasProjectName = techStack?.project?.name;
  const hasFramework = techStack?.framework || techStack?.frontend?.framework || techStack?.backend?.framework;

  if (!hasTechStack || !hasProjectName || !hasFramework) {
    console.log(chalk.yellow('  ⚠️  Prerequisites not met for Vision & Epics:\n'));

    if (!hasProjectName) {
      console.log(chalk.red('     • Project name not configured'));
    }
    if (!hasFramework) {
      console.log(chalk.red('     • Tech stack not detected (run ccasp init first)'));
    }

    console.log('');
    console.log(chalk.dim('  Vision & Epics requires a scaffolded project with tech stack configured.'));
    console.log(chalk.dim('  Run "ccasp init" or "ccasp wizard" first to set up your project.'));
    console.log('');

    await inquirer.prompt([
      { type: 'input', name: 'continue', message: 'Press Enter to continue...' }
    ]);
    return;
  }

  // Show current status
  console.log(chalk.dim(`  Current status: ${currentState ? chalk.green('ENABLED') : chalk.red('DISABLED')}`));
  console.log(chalk.dim(`  Project: ${techStack.project?.name || 'Unknown'}`));
  console.log(chalk.dim(`  Framework: ${techStack.framework || techStack.frontend?.framework || 'Unknown'}`));
  console.log('');

  // Ask what to do
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: currentState ? 'Disable Vision & Epics' : 'Enable Vision & Epics', value: 'toggle' },
        { name: 'Configure Vision settings', value: 'configure-vision', disabled: !currentState },
        { name: 'Configure Epic defaults', value: 'configure-epic', disabled: !currentState },
        { name: 'Configure integrations (GitHub, Jira, Linear, ClickUp)', value: 'configure-integrations' },
        { name: 'Back', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') {
    return;
  }

  if (action === 'toggle') {
    if (!currentState) {
      // Enabling - show interactive configuration
      await runVisionEpicsSetup(techStack);
    } else {
      // Disabling
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Disable Vision & Epics? (Your data will be preserved)',
          default: false,
        },
      ]);

      if (confirm) {
        techStack.visionEpics = { ...techStack.visionEpics, enabled: false };
        saveTechStack(techStack);
        console.log(chalk.green('\n  ✓ Vision & Epics disabled'));
        console.log(chalk.dim('    Roadmaps, Phase Dev Plans, and Task Lists remain available.'));
        console.log('');
      }
    }
  } else if (action === 'configure-vision') {
    await configureVisionSettings(techStack);
  } else if (action === 'configure-epic') {
    await configureEpicDefaults(techStack);
  } else if (action === 'configure-integrations') {
    // Import and run integration wizard
    try {
      const { runIntegrationWizard } = await import('../../../pm-hierarchy/integration-wizard.js');
      await runIntegrationWizard({ cwd: process.cwd() });
    } catch (e) {
      console.log(chalk.red(`  Error: ${e.message}`));
    }
  }
}

/**
 * Run Vision & Epics interactive setup
 */
export async function runVisionEpicsSetup(techStack) {
  console.log('');
  console.log(chalk.cyan('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan('  Setting up Vision & Epics for your project'));
  console.log(chalk.cyan('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');

  // Analyze tech stack
  console.log(chalk.dim('  Analyzing your project configuration...\n'));

  const projectInfo = {
    name: techStack.project?.name || 'Unknown Project',
    framework: techStack.framework || techStack.frontend?.framework || 'Unknown',
    backend: techStack.backend?.framework || null,
    database: techStack.database?.type || null,
    hasGitHub: !!techStack.versionControl?.owner,
  };

  console.log(chalk.dim(`  Project: ${projectInfo.name}`));
  console.log(chalk.dim(`  Frontend: ${projectInfo.framework}`));
  if (projectInfo.backend) console.log(chalk.dim(`  Backend: ${projectInfo.backend}`));
  if (projectInfo.database) console.log(chalk.dim(`  Database: ${projectInfo.database}`));
  console.log(chalk.dim(`  GitHub: ${projectInfo.hasGitHub ? 'Connected' : 'Not configured'}`));
  console.log('');

  // Ask configuration questions
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'visionTitle',
      message: 'What is the overall vision/goal for this project?',
      default: `${projectInfo.name} Development`,
    },
    {
      type: 'list',
      name: 'visionPeriod',
      message: 'Vision timeline period:',
      choices: [
        { name: 'Quarterly (3 months)', value: 'quarterly' },
        { name: 'Yearly (12 months)', value: 'yearly' },
        { name: 'Custom', value: 'custom' },
      ],
      default: 'quarterly',
    },
    {
      type: 'confirm',
      name: 'enableReminders',
      message: 'Enable ahead-of-schedule reminders for vision updates?',
      default: true,
    },
    {
      type: 'number',
      name: 'reminderThreshold',
      message: 'Remind when ahead by what percentage?',
      default: 20,
      when: (ans) => ans.enableReminders,
    },
    {
      type: 'list',
      name: 'primaryIntegration',
      message: 'Primary external integration:',
      choices: [
        { name: 'GitHub (recommended)', value: 'github' },
        { name: 'Jira', value: 'jira' },
        { name: 'Linear', value: 'linear' },
        { name: 'ClickUp', value: 'clickup' },
        { name: 'None', value: 'none' },
      ],
      default: projectInfo.hasGitHub ? 'github' : 'none',
    },
  ]);

  // Save configuration
  techStack.visionEpics = {
    enabled: true,
    configuredAt: new Date().toISOString(),
    vision: {
      title: answers.visionTitle,
      period: answers.visionPeriod,
      reminders: {
        enabled: answers.enableReminders,
        thresholdPercent: answers.reminderThreshold || 20,
      },
    },
    primaryIntegration: answers.primaryIntegration,
  };

  saveTechStack(techStack);

  console.log('');
  console.log(chalk.green('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green('  ✓ Vision & Epics enabled successfully!'));
  console.log(chalk.green('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');
  console.log(chalk.dim('  Next steps:'));
  console.log(chalk.dim('  1. Use /github-epic-menu to create your first Epic'));
  console.log(chalk.dim('  2. Link Roadmaps to Epics for strategic tracking'));
  console.log(chalk.dim('  3. Vision will auto-remind when you\'re ahead of schedule'));
  console.log('');
}

/**
 * Configure Vision settings
 */
export async function configureVisionSettings(techStack) {
  console.log('');
  showHeader('Vision Settings');

  const current = techStack.visionEpics?.vision || {};

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Vision title:',
      default: current.title || '',
    },
    {
      type: 'list',
      name: 'period',
      message: 'Timeline period:',
      choices: [
        { name: 'Quarterly (3 months)', value: 'quarterly' },
        { name: 'Yearly (12 months)', value: 'yearly' },
        { name: 'Custom', value: 'custom' },
      ],
      default: current.period || 'quarterly',
    },
    {
      type: 'list',
      name: 'generationTrigger',
      message: 'Vision generation trigger:',
      choices: [
        { name: 'Manual only', value: 'manual' },
        { name: 'On major completion', value: 'on_completion' },
        { name: 'Scheduled', value: 'scheduled' },
      ],
      default: current.generationTrigger || 'manual',
    },
    {
      type: 'confirm',
      name: 'enableReminders',
      message: 'Enable ahead-of-schedule reminders?',
      default: current.reminders?.enabled ?? true,
    },
    {
      type: 'number',
      name: 'reminderThreshold',
      message: 'Reminder threshold (% ahead):',
      default: current.reminders?.thresholdPercent || 20,
      when: (ans) => ans.enableReminders,
    },
  ]);

  techStack.visionEpics.vision = {
    ...current,
    title: answers.title,
    period: answers.period,
    generationTrigger: answers.generationTrigger,
    reminders: {
      enabled: answers.enableReminders,
      thresholdPercent: answers.reminderThreshold || 20,
    },
  };

  saveTechStack(techStack);
  showSuccess('Vision settings saved!');
}

/**
 * Configure Epic defaults
 */
export async function configureEpicDefaults(techStack) {
  console.log('');
  showHeader('Epic Defaults');

  const current = techStack.visionEpics?.epicDefaults || {};

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'defaultType',
      message: 'Default Epic type:',
      choices: [
        { name: 'Feature', value: 'feature' },
        { name: 'Quarterly goal', value: 'quarterly' },
        { name: 'Initiative', value: 'initiative' },
      ],
      default: current.type || 'feature',
    },
    {
      type: 'list',
      name: 'defaultPriority',
      message: 'Default priority:',
      choices: [
        { name: 'P0 - Critical', value: 'P0' },
        { name: 'P1 - High', value: 'P1' },
        { name: 'P2 - Medium', value: 'P2' },
        { name: 'P3 - Low', value: 'P3' },
        { name: 'P4 - Minimal', value: 'P4' },
      ],
      default: current.priority || 'P2',
    },
    {
      type: 'confirm',
      name: 'autoLinkRoadmaps',
      message: 'Auto-link new roadmaps to active epics?',
      default: current.autoLinkRoadmaps ?? false,
    },
    {
      type: 'confirm',
      name: 'generateTestingIssues',
      message: 'Generate testing issues on phase completion?',
      default: current.generateTestingIssues ?? true,
    },
  ]);

  techStack.visionEpics.epicDefaults = {
    type: answers.defaultType,
    priority: answers.defaultPriority,
    autoLinkRoadmaps: answers.autoLinkRoadmaps,
    generateTestingIssues: answers.generateTestingIssues,
  };

  saveTechStack(techStack);
  showSuccess('Epic defaults saved!');
}
