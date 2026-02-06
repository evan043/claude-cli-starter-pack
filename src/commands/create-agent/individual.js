/**
 * Individual Agent Creation
 *
 * Creates standalone specialized agents for specific tasks.
 * These agents can be spawned via the Task tool or referenced by skills.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { showHeader, showSuccess } from '../../cli/menu.js';
import { generateAgentTemplate, AGENT_LEVELS } from '../../agents/templates.js';
import { kebabCasePrompt, descriptionPrompt } from '../../utils/inquirer-presets.js';

/**
 * Create an individual agent
 */
export async function createIndividualAgent(options) {
  showHeader('Create Individual Agent');

  console.log(chalk.dim('Individual agents are standalone specialists for specific tasks.'));
  console.log(chalk.dim('They can be spawned via the Task tool or referenced by skills.\n'));

  // Step 1: Agent name
  const { name } = await inquirer.prompt([
    kebabCasePrompt({
      message: 'Agent name (kebab-case):',
      default: options.name || 'my-agent',
    }),
  ]);

  // Step 2: Description
  const { description } = await inquirer.prompt([
    descriptionPrompt({
      message: 'What does this agent do?',
      default: `Specialized agent for ${name} tasks`,
    }),
  ]);

  // Step 3: Level
  console.log('');
  console.log(chalk.cyan.bold('Agent Levels:'));
  Object.entries(AGENT_LEVELS).forEach(([key, level]) => {
    console.log(chalk.dim(`  ${key}: ${level.description} (${level.tokenLimit})`));
  });
  console.log('');

  const { level } = await inquirer.prompt([
    {
      type: 'list',
      name: 'level',
      message: 'Agent level:',
      choices: Object.entries(AGENT_LEVELS).map(([key, level]) => ({
        name: `${key} - ${level.description}`,
        value: key,
        short: key,
      })),
      default: 'L2',
    },
  ]);

  // Step 4: Tools
  const { tools } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'tools',
      message: 'Which tools should this agent have access to?',
      choices: [
        { name: 'Read', value: 'Read', checked: true },
        { name: 'Grep', value: 'Grep', checked: true },
        { name: 'Glob', value: 'Glob', checked: true },
        { name: 'Edit', value: 'Edit', checked: level !== 'L3' },
        { name: 'Write', value: 'Write', checked: level !== 'L3' },
        { name: 'Bash', value: 'Bash', checked: false },
        { name: 'Task', value: 'Task', checked: level === 'L1' },
        { name: 'WebFetch', value: 'WebFetch', checked: false },
        { name: 'WebSearch', value: 'WebSearch', checked: false },
      ],
      validate: (input) => input.length > 0 || 'Select at least one tool',
    },
  ]);

  // Step 5: Model
  const { model } = await inquirer.prompt([
    {
      type: 'list',
      name: 'model',
      message: 'Preferred model:',
      choices: [
        { name: 'Sonnet (balanced)', value: 'sonnet' },
        { name: 'Haiku (fast, lightweight)', value: 'haiku' },
        { name: 'Opus (complex tasks)', value: 'opus' },
        { name: 'Inherit from parent', value: 'inherit' },
      ],
      default: level === 'L3' ? 'haiku' : 'sonnet',
    },
  ]);

  // Step 6: Specialization
  const { specialization } = await inquirer.prompt([
    {
      type: 'input',
      name: 'specialization',
      message: 'Specialization focus (what domain does this agent excel in?):',
      default: `${name} domain tasks`,
    },
  ]);

  // Step 7: When to use
  const { whenToUse } = await inquirer.prompt([
    {
      type: 'input',
      name: 'whenToUse',
      message: 'When should this agent be used? (comma-separated):',
      default: `When ${name} operations are needed, When specialized ${name} expertise is required`,
      filter: (input) =>
        input
          .split(',')
          .map((w) => w.trim())
          .filter(Boolean),
    },
  ]);

  // Step 8: Workflow steps
  const { defineWorkflow } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'defineWorkflow',
      message: 'Define workflow steps?',
      default: true,
    },
  ]);

  const workflow = [];
  if (defineWorkflow) {
    let addingSteps = true;
    let stepNum = 1;

    while (addingSteps) {
      const { stepTitle, stepInstructions } = await inquirer.prompt([
        {
          type: 'input',
          name: 'stepTitle',
          message: `Step ${stepNum} title:`,
          default:
            stepNum === 1 ? 'Analyze' : stepNum === 2 ? 'Execute' : stepNum === 3 ? 'Report' : `Step ${stepNum}`,
        },
        {
          type: 'input',
          name: 'stepInstructions',
          message: `Step ${stepNum} instructions:`,
          default: 'Perform this step.',
        },
      ]);

      workflow.push({ title: stepTitle, instructions: stepInstructions });
      stepNum++;

      if (stepNum > 3) {
        const { continueAdding } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continueAdding',
            message: 'Add another step?',
            default: false,
          },
        ]);
        addingSteps = continueAdding;
      } else {
        addingSteps = true;
      }

      if (stepNum === 4 && addingSteps) {
        const { continueAdding } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continueAdding',
            message: 'Add another step?',
            default: false,
          },
        ]);
        addingSteps = continueAdding;
      }
    }
  }

  // Step 9: Output location
  const { outputPath } = await inquirer.prompt([
    {
      type: 'list',
      name: 'outputPath',
      message: 'Where should the agent be created?',
      choices: [
        { name: '.claude/agents/ (standard location)', value: '.claude/agents' },
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
        default: `.claude/agents/${name}.md`,
      },
    ]);
    finalPath = join(process.cwd(), customPath);
  }

  // Generate the agent
  const spinner = ora('Generating agent...').start();

  const agentContent = generateAgentTemplate({
    name,
    description,
    level,
    tools,
    model,
    specialization,
    whenToUse,
    workflow,
  });

  // Ensure directory exists
  const dir = dirname(finalPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write the agent file
  writeFileSync(finalPath, agentContent, 'utf8');

  spinner.succeed('Agent created');

  // Summary
  const details = [
    `Name: ${name}`,
    `Level: ${level}`,
    `Tools: ${tools.join(', ')}`,
    `Model: ${model}`,
    `Workflow steps: ${workflow.length}`,
    '',
    `Location: ${finalPath}`,
  ];

  showSuccess('Agent Created!', details);

  // Instructions
  console.log(chalk.dim('\nTo use this agent:'));
  console.log(chalk.cyan(`
# Via Task tool (subagent_type must be registered)
Task tool with subagent_type: "${name}"

# Reference in skill workflows
.claude/skills/{skill}/workflows/${name}-agent.md
`));

  return { name, path: finalPath, level, tools };
}
