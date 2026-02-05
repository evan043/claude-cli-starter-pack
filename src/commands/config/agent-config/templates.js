/**
 * Agent-Only Mode Configuration
 * Main orchestration for creating agent-only mode launcher scripts and policy files
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { showHeader, showSuccess } from '../../../cli/menu.js';
import { generateAgentOnlyPolicy, generateAgentsJson } from './policy.js';
import { generateWindowsBatch, generatePowerShellLauncher, generateBashLauncher } from './launchers.js';

/**
 * Create Agent-Only mode launcher scripts
 */
export async function createAgentOnlyLauncher() {
  showHeader('Agent-Only Launcher');

  console.log(chalk.dim('Creates launcher scripts for Agent-Only execution mode.'));
  console.log(chalk.dim('In this mode, Claude delegates all work to agents via Task tool.\n'));

  const { createPolicy } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createPolicy',
      message: 'Create AGENT_ONLY_POLICY.md?',
      default: true,
    },
  ]);

  const { createAgents } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createAgents',
      message: 'Create agents.json with custom agent definitions?',
      default: true,
    },
  ]);

  const { platform } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'platform',
      message: 'Create launchers for:',
      choices: [
        { name: 'Windows (.bat + .ps1)', value: 'windows', checked: process.platform === 'win32' },
        { name: 'Mac/Linux (.sh)', value: 'unix', checked: process.platform !== 'win32' },
      ],
    },
  ]);

  const spinner = ora('Creating launcher files...').start();
  const files = [];

  // Create .claude directory if needed
  const claudeDir = join(process.cwd(), '.claude');
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  // 1. Create AGENT_ONLY_POLICY.md
  if (createPolicy) {
    const policyContent = generateAgentOnlyPolicy();
    const policyPath = join(claudeDir, 'AGENT_ONLY_POLICY.md');
    writeFileSync(policyPath, policyContent, 'utf8');
    files.push(policyPath);
  }

  // 2. Create agents.json
  if (createAgents) {
    const agentsContent = generateAgentsJson();
    const agentsPath = join(claudeDir, 'agents.json');
    writeFileSync(agentsPath, agentsContent, 'utf8');
    files.push(agentsPath);
  }

  // 3. Create Windows launchers
  if (platform.includes('windows')) {
    const batContent = generateWindowsBatch();
    const batPath = join(process.cwd(), 'start-agent-only.bat');
    writeFileSync(batPath, batContent, 'utf8');
    files.push(batPath);

    const ps1Content = generatePowerShellLauncher();
    const ps1Path = join(process.cwd(), 'claude-agent-only.ps1');
    writeFileSync(ps1Path, ps1Content, 'utf8');
    files.push(ps1Path);
  }

  // 4. Create Unix launcher
  if (platform.includes('unix')) {
    const shContent = generateBashLauncher();
    const shPath = join(process.cwd(), 'claude-agent-only.sh');
    writeFileSync(shPath, shContent, { encoding: 'utf8', mode: 0o755 });
    files.push(shPath);
  }

  spinner.succeed('Launcher files created');

  showSuccess('Agent-Only Launcher Created', [
    ...files.map((f) => f.replace(process.cwd(), '.')),
    '',
    'Usage:',
    platform.includes('windows') ? '  start-agent-only.bat' : '',
    platform.includes('unix') ? '  ./claude-agent-only.sh' : '',
  ].filter(Boolean));

  return { files };
}
