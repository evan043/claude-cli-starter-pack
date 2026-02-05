/**
 * Create Command
 *
 * Interactive wizard for creating Claude Code slash commands
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { showHeader, showSuccess, showError, showWarning, showInfo } from '../cli/menu.js';
import { generateCommandTemplate, COMPLEXITY_LEVELS } from '../agents/templates.js';
import { kebabCasePrompt, descriptionPrompt } from '../utils/inquirer-presets.js';

/**
 * Run the create-command wizard
 */
export async function runCreateCommand(options) {
  showHeader('Create Slash Command');

  console.log(chalk.dim('Slash commands are invoked with / in Claude Code.'));
  console.log(chalk.dim('They can delegate to skills, agents, or run standalone.\n'));

  // Step 1: Command name
  const { name } = await inquirer.prompt([
    kebabCasePrompt({
      message: 'Command name (without /):',
      default: options.name || 'my-command',
    }),
  ]);

  // Step 2: Description
  const { description } = await inquirer.prompt([
    descriptionPrompt({
      message: 'Brief description (shown in menus):',
      default: `Run ${name} workflow`,
      validate: (input) => input.length > 0 || 'Description is required',
    }),
  ]);

  // Step 3: Complexity
  console.log('');
  console.log(chalk.cyan.bold('Complexity Levels:'));
  Object.entries(COMPLEXITY_LEVELS).forEach(([key, level]) => {
    console.log(chalk.dim(`  ${level.name}: ${level.description} (${level.duration})`));
  });
  console.log('');

  const { complexity } = await inquirer.prompt([
    {
      type: 'list',
      name: 'complexity',
      message: 'Expected complexity:',
      choices: Object.entries(COMPLEXITY_LEVELS).map(([key, level]) => ({
        name: `${level.name} - ${level.description}`,
        value: key,
        short: level.name,
      })),
      default: 'low',
    },
  ]);

  // Step 4: Delegation
  const { delegationType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'delegationType',
      message: 'What does this command use?',
      choices: [
        { name: 'Standalone - No delegation, instructions only', value: 'standalone' },
        { name: 'Skill - Delegates to a skill package', value: 'skill' },
        { name: 'Agent - Spawns a specific agent', value: 'agent' },
        { name: 'Both - Uses skill + specific agent workflow', value: 'both' },
      ],
    },
  ]);

  let delegatesTo = '';
  if (delegationType === 'skill' || delegationType === 'both') {
    const { skillName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'skillName',
        message: 'Skill name:',
        default: 'my-skill',
      },
    ]);
    delegatesTo = `skill:${skillName}`;
  }

  if (delegationType === 'agent' || delegationType === 'both') {
    const { agentName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'agentName',
        message: 'Agent name:',
        default: 'my-agent',
      },
    ]);
    delegatesTo = delegationType === 'both' ? `${delegatesTo} + @${agentName}` : `@${agentName}`;
  }

  // Step 5: Arguments
  const { hasArgs } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'hasArgs',
      message: 'Does this command accept arguments?',
      default: false,
    },
  ]);

  let args = '';
  if (hasArgs) {
    const { argsSpec } = await inquirer.prompt([
      {
        type: 'input',
        name: 'argsSpec',
        message: 'Arguments format (e.g., "[target] [--flag]"):',
        default: '[target]',
      },
    ]);
    args = argsSpec;
  }

  // Step 6: Workflow steps
  const { defineSteps } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'defineSteps',
      message: 'Define workflow steps? (recommended)',
      default: true,
    },
  ]);

  const steps = [];
  if (defineSteps) {
    let addingSteps = true;
    let stepNum = 1;

    while (addingSteps) {
      const { stepTitle, stepInstructions } = await inquirer.prompt([
        {
          type: 'input',
          name: 'stepTitle',
          message: `Step ${stepNum} title:`,
          default: stepNum === 1 ? 'Analyze' : stepNum === 2 ? 'Execute' : 'Report',
        },
        {
          type: 'input',
          name: 'stepInstructions',
          message: `Step ${stepNum} instructions:`,
          default: 'Perform this step of the workflow.',
        },
      ]);

      steps.push({ title: stepTitle, instructions: stepInstructions });
      stepNum++;

      const { continueAdding } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAdding',
          message: 'Add another step?',
          default: stepNum <= 3,
        },
      ]);
      addingSteps = continueAdding;
    }
  }

  // Step 7: Examples
  const examples = [];
  const { addExamples } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addExamples',
      message: 'Add usage examples?',
      default: true,
    },
  ]);

  if (addExamples) {
    let addingExamples = true;
    while (addingExamples) {
      const { exampleDesc, exampleArgs } = await inquirer.prompt([
        {
          type: 'input',
          name: 'exampleDesc',
          message: 'Example description:',
          default: 'Basic usage',
        },
        {
          type: 'input',
          name: 'exampleArgs',
          message: `Example args (after /${name}):`,
          default: '',
        },
      ]);

      examples.push({ description: exampleDesc, args: exampleArgs });

      const { continueAdding } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAdding',
          message: 'Add another example?',
          default: examples.length < 2,
        },
      ]);
      addingExamples = continueAdding;
    }
  }

  // Step 8: Related commands
  const { relatedCommands } = await inquirer.prompt([
    {
      type: 'input',
      name: 'relatedCommands',
      message: 'Related commands (comma-separated, without /):',
      default: '',
      filter: (input) =>
        input
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
    },
  ]);

  // Step 9: Output location
  const { outputPath } = await inquirer.prompt([
    {
      type: 'list',
      name: 'outputPath',
      message: 'Where should the command be created?',
      choices: [
        { name: '.claude/commands/ (standard location)', value: '.claude/commands' },
        { name: 'Custom location', value: 'custom' },
      ],
    },
  ]);

  let finalPath = join(process.cwd(), outputPath, `${name}.md`);
  if (outputPath === 'custom') {
    const { customPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customPath',
        message: 'Custom path:',
        default: `.claude/commands/${name}.md`,
      },
    ]);
    finalPath = join(process.cwd(), customPath);
  }

  // Generate the command
  const spinner = ora('Generating command...').start();

  const commandContent = generateCommandTemplate({
    name,
    description,
    complexity,
    delegatesTo,
    arguments: args,
    steps,
    examples,
    relatedCommands,
  });

  // Ensure directory exists
  const dir = dirname(finalPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write the command file
  writeFileSync(finalPath, commandContent, 'utf8');

  // Try to update INDEX.md if it exists
  const indexPath = join(dir, 'INDEX.md');
  let indexUpdated = false;
  if (existsSync(indexPath)) {
    try {
      const indexContent = readFileSync(indexPath, 'utf8');
      const newEntry = `| \`/${name}\` | ${description} | ${complexity} |`;

      // Check if command already in index
      if (!indexContent.includes(`/${name}`)) {
        // Find a good place to insert (before the last table row or at end of a table)
        const tableMatch = indexContent.match(/(\|[^|]+\|[^|]+\|[^|]+\|\n)+/);
        if (tableMatch) {
          const updatedIndex = indexContent.replace(
            tableMatch[0],
            tableMatch[0] + newEntry + '\n'
          );
          writeFileSync(indexPath, updatedIndex, 'utf8');
          indexUpdated = true;
        }
      }
    } catch {
      // Ignore index update errors
    }
  }

  spinner.succeed('Command created');

  // Summary
  const details = [
    `Name: /${name}`,
    `Complexity: ${COMPLEXITY_LEVELS[complexity].name}`,
    delegatesTo ? `Delegates to: ${delegatesTo}` : '',
    args ? `Arguments: ${args}` : '',
    `Steps: ${steps.length}`,
    '',
    `Location: ${finalPath}`,
    indexUpdated ? 'INDEX.md: Updated' : '',
  ].filter(Boolean);

  showSuccess('Command Created!', details);

  // Instructions
  console.log(chalk.dim('\nTo use this command in Claude Code:'));
  console.log(chalk.cyan(`  /${name}${args ? ` ${args}` : ''}`));
  console.log('');

  return { name, path: finalPath, complexity, delegatesTo };
}
