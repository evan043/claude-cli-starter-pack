/**
 * Create Hook Command
 *
 * Interactive wizard for creating Claude Code enforcement hooks
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { showHeader, showSuccess, showError, showWarning, showInfo } from '../cli/menu.js';
import {
  generateHookTemplate,
  HOOK_EVENT_TYPES,
  HOOK_TOOLS,
} from '../agents/templates.js';
import { kebabCasePrompt, descriptionPrompt } from '../utils/inquirer-presets.js';

/**
 * Run the create-hook wizard
 */
export async function runCreateHook(options) {
  showHeader('Create Hook');

  console.log(chalk.dim('Hooks enforce patterns and inject context in Claude Code.'));
  console.log(chalk.dim('They run automatically on tool calls or user prompts.\n'));

  // Step 1: Hook name
  const { name } = await inquirer.prompt([
    kebabCasePrompt({
      message: 'Hook name (kebab-case):',
      default: options.name || 'my-hook',
    }),
  ]);

  // Step 2: Description
  const { description } = await inquirer.prompt([
    descriptionPrompt({
      message: 'What does this hook do?',
      default: `Enforce patterns for ${name}`,
    }),
  ]);

  // Step 3: Event type
  console.log('');
  console.log(chalk.cyan.bold('Event Types:'));
  Object.entries(HOOK_EVENT_TYPES).forEach(([key, event]) => {
    const canBlock = event.canBlock ? chalk.green('(can block)') : chalk.dim('(cannot block)');
    console.log(chalk.dim(`  ${key}: ${event.description} ${canBlock}`));
  });
  console.log('');

  const { eventType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'eventType',
      message: 'When should this hook trigger?',
      choices: Object.entries(HOOK_EVENT_TYPES).map(([key, event]) => ({
        name: `${key} - ${event.useCase}`,
        value: key,
        short: key,
      })),
      default: 'PreToolUse',
    },
  ]);

  // Step 4: Target tools (for PreToolUse/PostToolUse)
  let tools = [];
  if (eventType === 'PreToolUse' || eventType === 'PostToolUse') {
    const { selectedTools } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedTools',
        message: 'Which tools should trigger this hook?',
        choices: HOOK_TOOLS.map((tool) => ({
          name: tool,
          value: tool,
          checked: tool === 'Edit' || tool === 'Write',
        })),
        validate: (input) => input.length > 0 || 'Select at least one tool',
      },
    ]);
    tools = selectedTools;
  }

  // Step 5: Target file patterns
  const { targetPatterns } = await inquirer.prompt([
    {
      type: 'input',
      name: 'targetPatterns',
      message: 'File patterns to target (comma-separated, empty = all files):',
      default: 'src/,apps/',
      filter: (input) =>
        input
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
    },
  ]);

  // Step 6: Purpose - block or warn
  const { purpose } = await inquirer.prompt([
    {
      type: 'list',
      name: 'purpose',
      message: 'What should this hook do?',
      choices: [
        { name: 'Block - Prevent operations matching patterns', value: 'block' },
        { name: 'Warn - Allow but show warnings', value: 'warn' },
        { name: 'Inject - Add context to Claude\'s response', value: 'inject' },
        { name: 'Log - Just log operations (no interference)', value: 'log' },
      ],
    },
  ]);

  // Step 7: Patterns based on purpose
  let blockedPatterns = [];
  let warningPatterns = [];
  let blockReason = '';

  if (purpose === 'block') {
    const { patterns, reason } = await inquirer.prompt([
      {
        type: 'input',
        name: 'patterns',
        message: 'Patterns to BLOCK (comma-separated):',
        default: 'console.log,debugger',
        filter: (input) =>
          input
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean),
      },
      {
        type: 'input',
        name: 'reason',
        message: 'Why should these be blocked?',
        default: 'These patterns are not allowed in production code',
      },
    ]);
    blockedPatterns = patterns;
    blockReason = reason;
  } else if (purpose === 'warn') {
    const { patterns } = await inquirer.prompt([
      {
        type: 'input',
        name: 'patterns',
        message: 'Patterns to WARN about (comma-separated):',
        default: 'TODO,FIXME,HACK',
        filter: (input) =>
          input
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean),
      },
    ]);
    warningPatterns = patterns;
  }

  // Step 8: Reference documentation
  const { referenceDoc } = await inquirer.prompt([
    {
      type: 'input',
      name: 'referenceDoc',
      message: 'Reference documentation path (optional):',
      default: '',
    },
  ]);

  // Step 9: Output location
  const { outputPath } = await inquirer.prompt([
    {
      type: 'list',
      name: 'outputPath',
      message: 'Where should the hook be created?',
      choices: [
        { name: '.claude/hooks/tools/ (standard location)', value: '.claude/hooks/tools' },
        { name: 'Custom location', value: 'custom' },
      ],
    },
  ]);

  let finalPath = join(process.cwd(), outputPath, `${name}.js`);
  if (outputPath === 'custom') {
    const { customPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customPath',
        message: 'Custom path:',
        default: `.claude/hooks/tools/${name}.js`,
      },
    ]);
    finalPath = join(process.cwd(), customPath);
  }

  // Generate the hook
  const spinner = ora('Generating hook...').start();

  const hookContent = generateHookTemplate({
    name,
    description,
    eventType,
    tools,
    targetPatterns,
    blockedPatterns,
    warningPatterns,
    blockReason,
    referenceDoc,
  });

  // Ensure directory exists
  const dir = dirname(finalPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write the hook file
  writeFileSync(finalPath, hookContent, 'utf8');

  spinner.succeed('Hook created');

  // Summary
  const details = [
    `Name: ${name}`,
    `Event: ${eventType}`,
    tools.length > 0 ? `Tools: ${tools.join(', ')}` : '',
    targetPatterns.length > 0 ? `File patterns: ${targetPatterns.join(', ')}` : '',
    blockedPatterns.length > 0 ? `Blocked: ${blockedPatterns.join(', ')}` : '',
    warningPatterns.length > 0 ? `Warnings: ${warningPatterns.join(', ')}` : '',
    '',
    `Location: ${finalPath}`,
  ].filter(Boolean);

  showSuccess('Hook Created!', details);

  // Instructions
  console.log(chalk.dim('\nTo activate this hook, add to .claude/settings.local.json:'));
  console.log(chalk.cyan(`
{
  "hooks": {
    "${eventType}": [
      {
        "command": "node ${finalPath.replace(process.cwd(), '.')}"${tools.length > 0 ? `,
        "tools": [${tools.map((t) => `"${t}"`).join(', ')}]` : ''}
      }
    ]
  }
}
`));

  return { name, path: finalPath, eventType, tools };
}
