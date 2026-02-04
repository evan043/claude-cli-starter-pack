#!/usr/bin/env node

/**
 * Claude CLI Advanced Starter Pack - CLI Entry Point
 *
 * Advanced Claude Code CLI toolkit - agents, hooks, skills, MCP servers,
 * phased development, and GitHub integration
 */

import { program } from 'commander';
import { showMainMenu } from '../src/cli/menu.js';
import { runSetup } from '../src/commands/setup.js';
import { runCreate } from '../src/commands/create.js';
import { runList } from '../src/commands/list.js';
import { runInstall } from '../src/commands/install.js';
import { runDecompose } from '../src/commands/decompose.js';
import { runSync } from '../src/commands/sync.js';
import { runTestSetup } from '../src/commands/test-setup.js';
import { runTest } from '../src/commands/test-run.js';
import { runCreateAgent } from '../src/commands/create-agent.js';
import { runCreateHook } from '../src/commands/create-hook.js';
import { runCreateCommand } from '../src/commands/create-command.js';
import { runCreateSkill } from '../src/commands/create-skill.js';
import { runClaudeSettings } from '../src/commands/claude-settings.js';
import { runCreatePhaseDev } from '../src/commands/create-phase-dev.js';
import { runGtaskInit } from '../src/commands/gtask-init.js';
import { runDetection } from '../src/commands/detect-tech-stack.js';
import { runExploreMcp } from '../src/commands/explore-mcp.js';
import { runClaudeAudit } from '../src/commands/claude-audit.js';
import { runRoadmap } from '../src/commands/roadmap.js';
import { runCreateRoadmap } from '../src/commands/create-roadmap.js';
import { runGitHubEpicMenu } from '../src/commands/github-epic-menu.js';
import { runInit } from '../src/commands/init.js';
import { showHelp } from '../src/commands/help.js';
import { runSetupWizard } from '../src/commands/setup-wizard.js';
import { installSkillCommand, listSkills } from '../src/commands/install-skill.js';
import { runInstallScripts } from '../src/commands/install-scripts.js';
import { runPanel, launchPanel } from '../src/commands/panel.js';
import { runInstallPanelHook } from '../src/commands/install-panel-hook.js';
import { runUninstall } from '../src/commands/uninstall.js';
import { runGlobalUninstall } from '../src/commands/global-uninstall.js';
import { runGlobalReinstall } from '../src/commands/global-reinstall.js';
import { runDevDeploy } from '../src/commands/dev-deploy.js';
import devModeSync from '../src/commands/dev-mode-sync.js';
import { runModelMode } from '../src/commands/model-mode.js';
import { getVersion, checkPrerequisites } from '../src/utils.js';

program
  .name('ccasp')
  .description('Claude CLI Advanced Starter Pack - Complete toolkit for Claude Code CLI')
  .version(getVersion());

// Init command - deploy to project
program
  .command('init')
  .description('Deploy Claude CLI Advanced Starter Pack to current project')
  .option('--force', 'Overwrite existing commands')
  .option('--no-register', 'Do not register project in global registry')
  .option('--dev', 'Development mode: reuse existing tech-stack.json, process templates, skip prompts')
  .action(async (options) => {
    await runInit(options);
  });

// Uninstall command - remove CCASP from project
program
  .command('uninstall')
  .description('Remove CCASP from current project and restore backups')
  .option('--force', 'Skip confirmation prompts')
  .option('--all', 'Remove entire .claude/ directory')
  .action(async (options) => {
    await runUninstall(options);
  });

// Global uninstall command - remove CCASP from ALL projects
program
  .command('global-uninstall')
  .description('Remove CCASP from all registered projects and clear global config')
  .option('--force', 'Skip confirmation prompts')
  .option('--all', 'Remove entire .claude/ directory from each project')
  .action(async (options) => {
    await runGlobalUninstall(options);
  });

// Global reinstall command - reinstall CCASP across all projects
program
  .command('global-reinstall')
  .description('Reinstall CCASP globally (use --projects to reinstall in all projects)')
  .option('--force', 'Skip confirmation prompts')
  .option('--projects', 'Reinstall CCASP in all registered projects')
  .action(async (options) => {
    await runGlobalReinstall(options);
  });

// Interactive menu (default when no command)
program
  .command('menu', { isDefault: true })
  .description('Show interactive menu')
  .action(async () => {
    await checkPrerequisites();
    await showMainMenu();
  });

// Setup command
program
  .command('setup')
  .description('Configure GitHub project connection')
  .option('-o, --owner <owner>', 'GitHub username or organization')
  .option('-r, --repo <repo>', 'Repository name')
  .option('-p, --project <number>', 'Project board number')
  .option('--global', 'Save config globally (~/.gtaskrc)')
  .action(async (options) => {
    await checkPrerequisites();
    await runSetup(options);
  });

// Create command
program
  .command('create')
  .description('Create a new GitHub issue with codebase analysis')
  .option('-t, --title <title>', 'Issue title')
  .option('-d, --description <desc>', 'Issue description')
  .option('-p, --priority <priority>', 'Priority (P0, P1, P2, P3)')
  .option('-l, --labels <labels>', 'Comma-separated labels')
  .option('--qa', 'Requires QA validation')
  .option('--no-qa', 'Skip QA validation')
  .option('--batch', 'Batch mode (no interactive prompts)')
  .option('--from-file <file>', 'Read task details from YAML file')
  .option('--skip-analysis', 'Skip codebase analysis')
  .action(async (options) => {
    await checkPrerequisites();
    await runCreate(options);
  });

// List command
program
  .command('list')
  .description('List recent tasks/issues')
  .option('-n, --limit <number>', 'Number of issues to show', '10')
  .option('--mine', 'Only show issues assigned to me')
  .option('--status <status>', 'Filter by status (open, closed, all)')
  .action(async (options) => {
    await checkPrerequisites();
    await runList(options);
  });

// Install Claude Code integration
program
  .command('install')
  .description('Install Claude Code command integration')
  .option('--path <path>', 'Path to .claude/commands/ directory')
  .option('--force', 'Overwrite existing command')
  .action(async (options) => {
    await runInstall(options);
  });

// Decompose command - break down issue into tasks
program
  .command('decompose [issue]')
  .description('Decompose a GitHub issue into granular tasks')
  .option('-i, --issue <number>', 'Issue number')
  .action(async (issue, options) => {
    await checkPrerequisites();
    await runDecompose({ issue: issue || options.issue, ...options });
  });

// Sync command - synchronize with GitHub
program
  .command('sync [subcommand] [issue]')
  .description('Sync task progress with GitHub (pull/push/watch/status)')
  .option('-i, --issue <number>', 'Issue number')
  .action(async (subcommand, issue, options) => {
    await checkPrerequisites();
    await runSync({
      subcommand: subcommand || 'status',
      issue: issue || options.issue,
      ...options,
    });
  });

// Test setup command
program
  .command('test-setup')
  .description('Configure testing environment (Ralph Loop, credentials, Playwright)')
  .option('--force', 'Overwrite existing testing configuration')
  .action(async (options) => {
    await runTestSetup(options);
  });

// Test run command
program
  .command('test')
  .description('Run tests with configured mode (ralph/manual/watch)')
  .option('-m, --mode <mode>', 'Testing mode: ralph, manual, or watch')
  .option('-f, --file <file>', 'Specific test file to run')
  .option('--headed', 'Run in headed mode (show browser)')
  .option('--ui', 'Open Playwright UI mode')
  .option('--max <iterations>', 'Max iterations for Ralph loop')
  .option('-c, --command <command>', 'Custom test command')
  .action(async (options) => {
    await runTest(options);
  });

// Agent creation - master command
program
  .command('create-agent')
  .description('Create Claude Code agents (interactive menu)')
  .option('-n, --name <name>', 'Agent name')
  .action(async (options) => {
    await runCreateAgent(options);
  });

// Create hook
program
  .command('create-hook')
  .description('Create enforcement hook (PreToolUse, UserPromptSubmit, etc.)')
  .option('-n, --name <name>', 'Hook name')
  .option('-e, --event <type>', 'Event type (PreToolUse, PostToolUse, UserPromptSubmit)')
  .option('-t, --tools <tools>', 'Target tools (comma-separated)')
  .action(async (options) => {
    await runCreateHook(options);
  });

// Create command
program
  .command('create-command')
  .description('Create slash command for Claude Code')
  .option('-n, --name <name>', 'Command name')
  .option('-d, --delegates-to <target>', 'Skill or agent to delegate to')
  .action(async (options) => {
    await runCreateCommand(options);
  });

// Create skill
program
  .command('create-skill')
  .description('Create RAG-enhanced skill package')
  .option('-n, --name <name>', 'Skill name')
  .action(async (options) => {
    await runCreateSkill(options);
  });

// Claude settings
program
  .command('claude-settings')
  .description('Configure Claude CLI settings (permissions, agent-only mode, tech stack)')
  .action(async () => {
    await runClaudeSettings({});
  });

// Tech stack detection
program
  .command('detect-stack')
  .description('Auto-detect project tech stack (frontend, backend, testing, etc.)')
  .option('--silent', 'Minimal output')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    await runDetection(options);
  });

// Full project initialization
program
  .command('project-init')
  .description('Complete project setup wizard (detect stack, configure integrations, generate templates)')
  .option('--force', 'Overwrite existing configuration')
  .action(async (options) => {
    await runGtaskInit(options);
  });

// Phased development plan generator
program
  .command('create-phase-dev')
  .description('Create phased development plan (95%+ success probability)')
  .option('-n, --name <name>', 'Project name')
  .option('-s, --scale <scale>', 'Force scale: S, M, or L')
  .option('--autonomous', 'Autonomous mode (use defaults)')
  .action(async (options) => {
    await runCreatePhaseDev(options);
  });

// MCP Explorer
program
  .command('explore-mcp')
  .description('Discover and install MCP servers based on your tech stack')
  .option('--recommend', 'Auto-recommend based on codebase analysis')
  .option('--testing', 'Quick install testing MCPs (Playwright/Puppeteer)')
  .action(async (options) => {
    await runExploreMcp(options);
  });

// Claude Audit
program
  .command('claude-audit')
  .description('Audit CLAUDE.md and .claude/ folder against Anthropic best practices')
  .option('--mode <mode>', 'Audit mode: full, claudemd, or folder')
  .action(async (options) => {
    await runClaudeAudit(options);
  });

// Create Roadmap - Roadmap Orchestration Framework
program
  .command('create-roadmap')
  .description('Create multi-phase development roadmap (manual or from GitHub issues)')
  .option('--from-github', 'Import from GitHub issues')
  .option('--from-project <number>', 'Import from GitHub Project Board')
  .action(async (options) => {
    await runCreateRoadmap(options);
  });

// Roadmap Integration (legacy - sync with GitHub)
program
  .command('roadmap [subcommand]')
  .description('Sync roadmaps with GitHub Project Board (import/sync/create/status)')
  .option('-f, --file <file>', 'Path to ROADMAP.json file')
  .action(async (subcommand, options) => {
    await runRoadmap({ subcommand, ...options });
  });

// GitHub Epic System - new unified epic management
program
  .command('github-epic-menu')
  .alias('epic')
  .description('GitHub Epic management dashboard (view, create, sync epics)')
  .action(async () => {
    await runGitHubEpicMenu({});
  });

// Create GitHub Epic (alias for create-roadmap with epic semantics)
program
  .command('create-github-epic')
  .description('Create GitHub Epic (multi-phase project with GitHub integration)')
  .option('--from-github', 'Import from GitHub issues')
  .option('--from-project <number>', 'Import from GitHub Project Board')
  .action(async (options) => {
    // Uses the same underlying command but with epic semantics
    await runCreateRoadmap({ ...options, epicMode: true });
  });

// Help with examples
program
  .command('help-examples')
  .description('Show detailed help with examples')
  .action(() => {
    showHelp();
  });

// Setup Wizard - vibe-code friendly
program
  .command('wizard')
  .alias('w')
  .description('Interactive setup wizard (vibe-code friendly, mobile-ready)')
  .action(async () => {
    await runSetupWizard();
  });

// Install skill
program
  .command('install-skill')
  .description('Install skills to your project')
  .option('--list', 'List available skills')
  .action(async (options) => {
    if (options.list) {
      listSkills();
    } else {
      await installSkillCommand(options);
    }
  });

// Install scripts
program
  .command('install-scripts')
  .description('Install utility scripts to .claude/scripts/')
  .option('--list', 'List available scripts')
  .action(async (options) => {
    await runInstallScripts(options);
  });

// Panel - persistent control panel for Claude Code
program
  .command('panel')
  .description('Launch persistent control panel (run in separate terminal)')
  .action(async () => {
    await runPanel();
  });

// Panel launcher - opens panel in new window
program
  .command('panel-launch')
  .alias('pl')
  .description('Open CCASP panel in a new terminal window')
  .action(async () => {
    await launchPanel();
  });

// Install panel hook
program
  .command('install-panel-hook')
  .description('Install queue reader hook for panel integration')
  .option('--global', 'Install to ~/.claude/ (all projects)')
  .option('--force', 'Overwrite existing hook')
  .action(async (options) => {
    await runInstallPanelHook(options);
  });

// Developer deploy - worktree-based local testing (does not publish to npm)
program
  .command('dev-deploy')
  .description('Deploy worktree locally for testing (developer only, no npm publish)')
  .option('--create <name>', 'Create new worktree for development')
  .option('--list', 'List active worktrees')
  .option('--cleanup [name]', 'Remove worktree and restore npm version')
  .option('--private', 'Push worktree branch to private remote')
  .option('--force', 'Skip confirmation prompts')
  .option('--scan', 'Scan connected projects for customizations')
  .action(async (options) => {
    await runDevDeploy(options);
  });

// Dev sync - sync worktree changes to all projects
program
  .command('dev-sync')
  .description('Sync ALL modified files from worktree to registered projects')
  .option('--dry-run', 'Preview changes without applying')
  .option('--force', 'Overwrite all files (skip customization check)')
  .option('--project <name>', 'Sync specific project by name')
  .action(async (options) => {
    await devModeSync(options);
  });

// Model mode - configure agent model defaults
program
  .command('model-mode')
  .description('Configure model defaults for L1/L2/L3 agents (efficiency/default/performance)')
  .option('-s, --set <mode>', 'Set mode: efficiency, default, or performance')
  .option('--show', 'Show current mode configuration')
  .action(async (options) => {
    await runModelMode(options);
  });

// Vision Driver Bot - autonomous development from Vision board
program
  .command('vdb [subcommand]')
  .description('Vision Driver Bot - autonomous development from Vision/Epic board')
  .option('--dry-run', 'Preview without executing')
  .option('--force', 'Force operation even if already done')
  .option('--days <days>', 'Days for statistics', '7')
  .action(async (subcommand, options) => {
    const { vdbCommand } = await import('../src/commands/vdb.js');
    await vdbCommand(subcommand || 'status', options);
  });

// Parse and run
program.parse();
