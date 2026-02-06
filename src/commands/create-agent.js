/**
 * Create Agent Command
 *
 * Master command for creating Claude Code agents (L1/L2/L3)
 * with optional RAG pipeline support.
 *
 * This is a thin re-export wrapper. All implementation is in submodules:
 * - create-agent/individual.js - Standalone specialized agent creation
 * - create-agent/subagent.js - L2/L3 sub-agent creation for hierarchies
 * - create-agent/rag-pipeline.js - Full RAG pipeline system creation
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { showHeader } from '../cli/menu.js';
import { createIndividualAgent } from './create-agent/individual.js';
import { createSubAgent } from './create-agent/subagent.js';
import { createRagPipeline } from './create-agent/rag-pipeline.js';
import { runCreateHook } from './create-hook.js';
import { runCreateCommand } from './create-command.js';
import { runCreateSkill } from './create-skill.js';

/**
 * Run the create-agent wizard
 */
export async function runCreateAgent(options) {
  showHeader('Agent Creator');

  // Show the main menu
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'What would you like to create?',
      choices: [
        new inquirer.Separator(chalk.cyan('── AGENTS ──')),
        {
          name: `${chalk.green('1)')} Individual Agent       Standalone specialized agent`,
          value: 'individual',
          short: 'Individual Agent',
        },
        {
          name: `${chalk.green('2)')} L2/L3 Sub-Agent        Add to orchestrator hierarchy`,
          value: 'subagent',
          short: 'Sub-Agent',
        },
        {
          name: `${chalk.green('3)')} RAG Pipeline System    Full autonomous orchestration`,
          value: 'rag-pipeline',
          short: 'RAG Pipeline',
        },
        new inquirer.Separator(chalk.cyan('── SKILLS & WORKFLOWS ──')),
        {
          name: `${chalk.blue('4)')} Skill Package          RAG-enhanced domain expertise`,
          value: 'skill',
          short: 'Skill',
        },
        new inquirer.Separator(chalk.cyan('── ENFORCEMENT & COMMANDS ──')),
        {
          name: `${chalk.yellow('5)')} Hook                   Event-driven enforcement`,
          value: 'hook',
          short: 'Hook',
        },
        {
          name: `${chalk.yellow('6)')} Command                Slash command definition`,
          value: 'command',
          short: 'Command',
        },
        new inquirer.Separator(),
        {
          name: `${chalk.dim('Q)')} Back / Exit`,
          value: 'exit',
          short: 'Exit',
        },
      ],
      pageSize: 12,
    },
  ]);

  if (mode === 'exit') {
    return null;
  }

  // Delegate to appropriate handler
  switch (mode) {
    case 'individual':
      return await createIndividualAgent(options);
    case 'subagent':
      return await createSubAgent(options);
    case 'rag-pipeline':
      return await createRagPipeline(options);
    case 'skill':
      return await runCreateSkill(options);
    case 'hook':
      return await runCreateHook(options);
    case 'command':
      return await runCreateCommand(options);
  }
}
