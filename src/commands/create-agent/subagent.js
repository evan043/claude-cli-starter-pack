/**
 * Sub-Agent Creation
 *
 * Creates L2/L3 sub-agents for orchestrator hierarchies.
 * Sub-agents are specialists (L2) or workers (L3) spawned by parent orchestrators.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { showHeader, showSuccess } from '../../cli/menu.js';
import { generateAgentTemplate } from '../../agents/templates.js';
import { claudeAbsolutePath } from '../../utils/paths.js';

/**
 * Create a sub-agent (L2/L3)
 */
export async function createSubAgent(options) {
  showHeader('Create Sub-Agent');

  console.log(chalk.dim('Sub-agents are specialists (L2) or workers (L3) in an orchestrator hierarchy.'));
  console.log(chalk.dim('They are spawned by parent orchestrators for specific tasks.\n'));

  // Step 1: Parent skill/orchestrator
  const { parentSkill } = await inquirer.prompt([
    {
      type: 'input',
      name: 'parentSkill',
      message: 'Parent skill name (the skill this agent belongs to):',
      default: 'my-skill',
    },
  ]);

  // Step 2: Agent name
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Sub-agent name:',
      default: `${parentSkill}-specialist`,
    },
  ]);

  // Step 3: Level
  const { level } = await inquirer.prompt([
    {
      type: 'list',
      name: 'level',
      message: 'Agent level:',
      choices: [
        { name: 'L2 - Specialist (deep domain expertise, 1-8K tokens)', value: 'L2' },
        { name: 'L3 - Worker (parallel atomic tasks, 500 tokens)', value: 'L3' },
      ],
      default: 'L2',
    },
  ]);

  // Step 4: Specialty
  const { specialty } = await inquirer.prompt([
    {
      type: 'input',
      name: 'specialty',
      message: 'What does this sub-agent specialize in?',
      default: level === 'L2' ? 'Analysis and recommendations' : 'Atomic task execution',
    },
  ]);

  // Step 5: Tools (limited for L3)
  const toolChoices =
    level === 'L3'
      ? [
          { name: 'Read', value: 'Read', checked: true },
          { name: 'Grep', value: 'Grep', checked: true },
          { name: 'Glob', value: 'Glob', checked: true },
        ]
      : [
          { name: 'Read', value: 'Read', checked: true },
          { name: 'Grep', value: 'Grep', checked: true },
          { name: 'Glob', value: 'Glob', checked: true },
          { name: 'Edit', value: 'Edit', checked: true },
          { name: 'Write', value: 'Write', checked: true },
          { name: 'Bash', value: 'Bash', checked: false },
          { name: 'Task', value: 'Task', checked: false },
        ];

  const { tools } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'tools',
      message: `Tools for this ${level}:`,
      choices: toolChoices,
    },
  ]);

  // Generate the sub-agent
  const spinner = ora('Generating sub-agent...').start();

  const agentContent = generateAgentTemplate({
    name,
    description: specialty,
    level,
    tools,
    model: level === 'L3' ? 'haiku' : 'sonnet',
    specialization: specialty,
    whenToUse: [`When ${parentSkill} orchestrator needs ${specialty.toLowerCase()}`],
    workflow: [
      { title: 'Receive Task', instructions: 'Accept task from orchestrator with context.' },
      { title: 'Execute', instructions: `Perform ${specialty.toLowerCase()}.` },
      { title: 'Report', instructions: 'Return results to orchestrator.' },
    ],
  });

  // Determine path
  const basePath = claudeAbsolutePath(process.cwd(), 'skills', parentSkill, 'workflows');
  if (!existsSync(basePath)) {
    mkdirSync(basePath, { recursive: true });
  }

  const finalPath = join(basePath, `${name}-agent.md`);
  writeFileSync(finalPath, agentContent, 'utf8');

  spinner.succeed('Sub-agent created');

  const details = [
    `Name: ${name}`,
    `Parent: ${parentSkill}`,
    `Level: ${level}`,
    `Specialty: ${specialty}`,
    '',
    `Location: ${finalPath}`,
  ];

  showSuccess('Sub-Agent Created!', details);

  return { name, path: finalPath, level, parentSkill };
}
