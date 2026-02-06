/**
 * Template and Release Browsing
 *
 * Handles template viewing and release notes browsing.
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import boxen from 'boxen';

import { runList } from '../../list.js';
import {
  loadReleaseNotes,
  getCurrentVersion,
} from '../../../utils/version-check.js';

import { showAddFeaturesMenu } from './features.js';

/**
 * Show available templates
 */
export async function showTemplates() {
  console.log(chalk.bold('\nAvailable Templates:\n'));

  const templates = [
    { name: 'Agent Template', desc: 'L1/L2/L3 agent hierarchy', cmd: 'ccasp create agent' },
    { name: 'Hook Template', desc: 'Pre/Post tool hooks', cmd: 'ccasp create hook' },
    { name: 'Skill Template', desc: 'RAG-enhanced skills', cmd: 'ccasp create skill' },
    { name: 'Command Template', desc: 'Slash commands', cmd: 'ccasp create command' },
    { name: 'Phase Dev Plan', desc: 'Phased development', cmd: 'ccasp create phase' },
  ];

  templates.forEach((t, i) => {
    console.log(`  ${chalk.yellow(`${i + 1  }.`)} ${chalk.cyan(t.name)}`);
    console.log(`     ${chalk.dim(t.desc)}`);
    console.log(`     ${chalk.dim('$')} ${t.cmd}\n`);
  });

  // Offer to run list command
  const { viewMore } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'viewMore',
      message: 'View all available items?',
      default: false,
    },
  ]);

  if (viewMore) {
    await runList();
  }
}

/**
 * Show prior releases and allow adding features
 */
export async function showPriorReleases() {
  console.log(chalk.bold('\nPrior Releases\n'));

  const { releases } = loadReleaseNotes();
  const currentVersion = getCurrentVersion();

  if (!releases || releases.length === 0) {
    console.log(chalk.yellow('  No release history available.\n'));
    return;
  }

  // Show release list
  console.log(chalk.dim('  Select a release to view details and available features:\n'));

  releases.forEach((release, i) => {
    const isCurrent = release.version === currentVersion;
    const marker = isCurrent ? chalk.green('[current]') : chalk.dim('o');
    const currentLabel = isCurrent ? chalk.green(' (current)') : '';
    console.log(`  ${chalk.yellow(`${i + 1  }.`)} ${marker} v${release.version}${currentLabel} ${chalk.dim(`(${release.date})`)}`);
    console.log(`     ${chalk.dim(release.summary)}`);
  });

  console.log('');

  const { releaseChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'releaseChoice',
      message: 'Select a release to view details:',
      choices: [
        ...releases.map((r, i) => ({
          name: `${i + 1}. v${r.version} - ${r.summary}`,
          value: i,
          short: `v${r.version}`,
        })),
        {
          name: `${chalk.cyan('A.')} Add available features to project`,
          value: 'add',
          short: 'Add Features',
        },
        {
          name: `${chalk.dim('0.')} Back to menu`,
          value: 'back',
          short: 'Back',
        },
      ],
      pageSize: 12,
    },
  ]);

  if (releaseChoice === 'back') {
    return;
  }

  if (releaseChoice === 'add') {
    await showAddFeaturesMenu();
    return;
  }

  // Show release details
  const release = releases[releaseChoice];
  await showReleaseDetails(release);
}

/**
 * Show detailed release information
 * @param {Object} release - Release object with version, date, summary, etc.
 */
export async function showReleaseDetails(release) {
  console.log(
    boxen(
      chalk.bold.cyan(`v${release.version}\n`) +
        chalk.dim(`Released: ${release.date}\n\n`) +
        chalk.white(release.summary),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        title: 'Release Details',
        titleAlignment: 'center',
      }
    )
  );

  // Show highlights
  if (release.highlights && release.highlights.length > 0) {
    console.log(chalk.bold('\nHighlights:\n'));
    release.highlights.forEach((h) => {
      console.log(`  - ${h}`);
    });
  }

  // Show new features
  if (release.newFeatures) {
    const { commands, agents, skills, hooks, other } = release.newFeatures;

    if (commands && commands.length > 0) {
      console.log(chalk.bold('\nNew Commands:\n'));
      commands.forEach((cmd) => {
        console.log(`  ${chalk.cyan(`/${cmd.name}`)} - ${cmd.description}`);
      });
    }

    if (agents && agents.length > 0) {
      console.log(chalk.bold('\nNew Agents:\n'));
      agents.forEach((agent) => {
        console.log(`  ${chalk.cyan(agent.name)} - ${agent.description}`);
      });
    }

    if (skills && skills.length > 0) {
      console.log(chalk.bold('\nNew Skills:\n'));
      skills.forEach((skill) => {
        console.log(`  ${chalk.cyan(skill.name)} - ${skill.description}`);
      });
    }

    if (hooks && hooks.length > 0) {
      console.log(chalk.bold('\nNew Hooks:\n'));
      hooks.forEach((hook) => {
        console.log(`  ${chalk.cyan(hook.name)} - ${hook.description}`);
      });
    }

    if (other && other.length > 0) {
      console.log(chalk.bold('\nOther Improvements:\n'));
      other.forEach((item) => {
        console.log(`  ${chalk.cyan(item.name)} - ${item.description}`);
      });
    }
  }

  // Show breaking changes
  if (release.breaking && release.breaking.length > 0) {
    console.log(chalk.bold.red('\nBreaking Changes:\n'));
    release.breaking.forEach((b) => {
      console.log(`  ${chalk.red('!')} ${b}`);
    });
  }

  console.log('');

  // Offer to add features from this release
  const hasNewFeatures =
    release.newFeatures &&
    (release.newFeatures.commands?.length > 0 ||
      release.newFeatures.agents?.length > 0 ||
      release.newFeatures.skills?.length > 0 ||
      release.newFeatures.hooks?.length > 0);

  if (hasNewFeatures) {
    const { addFeatures } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addFeatures',
        message: 'Would you like to add features from this release to your project?',
        default: false,
      },
    ]);

    if (addFeatures) {
      // Import dynamically to avoid circular dependency
      const { addFeaturesFromRelease } = await import('./features.js');
      await addFeaturesFromRelease(release);
    }
  }
}
