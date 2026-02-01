/**
 * MCP Installer
 *
 * Handles installation of MCP servers:
 * - Generates .mcp.json configuration
 * - Updates .claude/settings.json permissions
 * - Supports Windows (cmd /c wrapper)
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { mcpRequiresApiKey, getMcpApiKeyInfo } from './mcp-registry.js';

/**
 * Check if running on Windows
 */
export function isWindows() {
  return process.platform === 'win32';
}

/**
 * Generate MCP server configuration for .mcp.json
 *
 * @param {Object} mcp - MCP server definition from registry
 * @param {Object} envValues - Environment variable values provided by user
 * @returns {Object} Server configuration object
 */
export function generateMcpConfig(mcp, envValues = {}) {
  const config = {
    env: { ...envValues },
  };

  // Handle different command types
  if (mcp.command === 'uvx') {
    // Python-based MCP (like claude-mem)
    config.command = 'uvx';
    config.args = [...(mcp.args || [])];
  } else if (mcp.npmPackage) {
    // NPM-based MCP
    if (isWindows()) {
      config.command = 'cmd';
      config.args = ['/c', 'npx', '-y', mcp.npmPackage];
    } else {
      config.command = 'npx';
      config.args = ['-y', mcp.npmPackage];
    }

    // Add any additional args
    if (mcp.args) {
      config.args.push(...mcp.args);
    }
  }

  return config;
}

/**
 * Load existing .mcp.json or create empty structure
 */
export function loadMcpJson(cwd = process.cwd()) {
  const mcpPath = join(cwd, '.mcp.json');

  if (existsSync(mcpPath)) {
    try {
      const content = readFileSync(mcpPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return { mcpServers: {} };
    }
  }

  return { mcpServers: {} };
}

/**
 * Save .mcp.json
 */
export function saveMcpJson(config, cwd = process.cwd()) {
  const mcpPath = join(cwd, '.mcp.json');
  const content = JSON.stringify(config, null, 2);
  writeFileSync(mcpPath, content, 'utf8');
  return mcpPath;
}

/**
 * Load existing .claude/settings.json or create empty structure
 */
export function loadClaudeSettings(cwd = process.cwd()) {
  const settingsPath = join(cwd, '.claude', 'settings.json');

  if (existsSync(settingsPath)) {
    try {
      const content = readFileSync(settingsPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return { permissions: { allow: [], deny: [] } };
    }
  }

  return { permissions: { allow: [], deny: [] } };
}

/**
 * Save .claude/settings.json
 */
export function saveClaudeSettings(settings, cwd = process.cwd()) {
  const claudeDir = join(cwd, '.claude');
  const settingsPath = join(claudeDir, 'settings.json');

  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  const content = JSON.stringify(settings, null, 2);
  writeFileSync(settingsPath, content, 'utf8');
  return settingsPath;
}

/**
 * Add MCP permission to settings
 */
export function addMcpPermission(settings, mcpId) {
  if (!settings.permissions) {
    settings.permissions = { allow: [], deny: [] };
  }

  if (!settings.permissions.allow) {
    settings.permissions.allow = [];
  }

  const permission = `MCP(${mcpId}:*)`;

  if (!settings.permissions.allow.includes(permission)) {
    settings.permissions.allow.push(permission);
  }

  return settings;
}

/**
 * Enable MCP server in settings
 */
export function enableMcpServer(settings, mcpId) {
  if (!settings.enableAllProjectMcpServers) {
    if (!settings.enabledMcpjsonServers) {
      settings.enabledMcpjsonServers = [];
    }

    if (!settings.enabledMcpjsonServers.includes(mcpId)) {
      settings.enabledMcpjsonServers.push(mcpId);
    }
  }

  return settings;
}

/**
 * Display API key requirement information
 */
export function displayApiKeyInfo(mcp) {
  const apiKeyInfo = getMcpApiKeyInfo(mcp);
  if (!apiKeyInfo) return;

  console.log('');
  console.log(chalk.yellow('╔═══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.yellow('║') + chalk.bold.cyan('  🔑 API Key Required: ') + chalk.white(apiKeyInfo.keyName).padEnd(35) + chalk.yellow('║'));
  console.log(chalk.yellow('╠═══════════════════════════════════════════════════════════════╣'));
  if (apiKeyInfo.url) {
    console.log(chalk.yellow('║') + chalk.gray('  Get your key at: ') + chalk.blue(apiKeyInfo.url).padEnd(41) + chalk.yellow('║'));
  }
  console.log(chalk.yellow('║') + chalk.gray('  Free tier available: ') + (apiKeyInfo.free ? chalk.green('Yes') : chalk.red('No')).padEnd(37) + chalk.yellow('║'));
  if (apiKeyInfo.note) {
    // Wrap note text if too long
    const noteLines = apiKeyInfo.note.match(/.{1,55}/g) || [apiKeyInfo.note];
    noteLines.forEach((line) => {
      console.log(chalk.yellow('║') + chalk.gray('  ' + line).padEnd(62) + chalk.yellow('║'));
    });
  }
  console.log(chalk.yellow('╚═══════════════════════════════════════════════════════════════╝'));
  console.log('');
}

/**
 * Prompt user for API key with options to skip or install later
 * @returns {Object} { action: 'provide'|'skip'|'later', envValues?: {} }
 */
export async function promptApiKeyDecision(mcp) {
  const apiKeyInfo = getMcpApiKeyInfo(mcp);
  if (!apiKeyInfo) {
    return { action: 'provide', envValues: {} };
  }

  displayApiKeyInfo(mcp);

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'How would you like to proceed?',
      choices: [
        { name: '[P] Provide API key now', value: 'provide' },
        { name: '[S] Skip this MCP', value: 'skip' },
        { name: '[L] Install later (add to queue)', value: 'later' },
      ],
    },
  ]);

  return { action };
}

/**
 * Prompt user for required environment variables
 */
export async function promptForEnvVars(mcp) {
  const envValues = {};
  const required = mcp.requiredEnv || {};
  const optional = mcp.optionalEnv || {};

  // Prompt for required vars
  for (const [key, info] of Object.entries(required)) {
    const { value } = await inquirer.prompt([
      {
        type: 'password',
        name: 'value',
        message: `${key} (${info.description}):`,
        mask: '*',
        validate: (input) => input.length > 0 || 'This field is required',
      },
    ]);
    envValues[key] = value;
  }

  // Ask about optional vars
  if (Object.keys(optional).length > 0) {
    const { configureOptional } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'configureOptional',
        message: 'Configure optional settings?',
        default: false,
      },
    ]);

    if (configureOptional) {
      for (const [key, info] of Object.entries(optional)) {
        const { value } = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: `${key} (${info.description}):`,
            default: info.default || '',
          },
        ]);
        if (value) {
          envValues[key] = value;
        }
      }
    }
  }

  return envValues;
}

/**
 * Install a single MCP server
 *
 * @param {Object} mcp - MCP definition from registry
 * @param {Object} options - Installation options
 * @returns {Object} Installation result
 */
export async function installMcp(mcp, options = {}) {
  const cwd = options.cwd || process.cwd();

  // Check if API key is required and prompt user BEFORE installation
  if (!options.skipApiKeyPrompt && mcpRequiresApiKey(mcp)) {
    const { action } = await promptApiKeyDecision(mcp);

    if (action === 'skip') {
      console.log(chalk.yellow(`⏭ Skipped ${mcp.name}`));
      return {
        success: false,
        skipped: true,
        mcp,
        reason: 'User chose to skip',
      };
    }

    if (action === 'later') {
      console.log(chalk.blue(`📋 Added ${mcp.name} to install queue`));
      return {
        success: false,
        queued: true,
        mcp,
        reason: 'User chose to install later',
      };
    }
  }

  const spinner = ora(`Installing ${mcp.name}...`).start();

  try {
    // 1. Get environment variables
    spinner.text = 'Configuring environment variables...';
    let envValues = options.envValues || {};

    if (!options.skipEnvPrompt && Object.keys(mcp.requiredEnv || {}).length > 0) {
      spinner.stop();
      envValues = await promptForEnvVars(mcp);
      spinner.start();
    }

    // 2. Generate MCP config
    spinner.text = 'Generating configuration...';
    const mcpConfig = generateMcpConfig(mcp, envValues);

    // 3. Update .mcp.json
    spinner.text = 'Updating .mcp.json...';
    const mcpJson = loadMcpJson(cwd);
    mcpJson.mcpServers = mcpJson.mcpServers || {};
    mcpJson.mcpServers[mcp.id] = mcpConfig;

    // Add helpful note
    if (!mcpJson._NOTE) {
      mcpJson._NOTE = 'MCP servers configured by gtask explore-mcp';
    }

    const mcpPath = saveMcpJson(mcpJson, cwd);

    // 4. Update .claude/settings.json
    spinner.text = 'Updating Claude settings...';
    const settings = loadClaudeSettings(cwd);
    addMcpPermission(settings, mcp.id);
    enableMcpServer(settings, mcp.id);
    const settingsPath = saveClaudeSettings(settings, cwd);

    spinner.succeed(`Installed ${mcp.name}`);

    return {
      success: true,
      mcp,
      files: {
        mcpJson: mcpPath,
        settings: settingsPath,
      },
      config: mcpConfig,
    };
  } catch (error) {
    spinner.fail(`Failed to install ${mcp.name}: ${error.message}`);
    return {
      success: false,
      mcp,
      error: error.message,
    };
  }
}

/**
 * Install multiple MCPs
 */
export async function installMultipleMcps(mcps, options = {}) {
  const results = [];

  for (const mcp of mcps) {
    const result = await installMcp(mcp, options);
    results.push(result);
  }

  return results;
}

/**
 * Check if an MCP is already installed
 */
export function isMcpInstalled(mcpId, cwd = process.cwd()) {
  const mcpJson = loadMcpJson(cwd);
  return mcpJson.mcpServers && mcpId in mcpJson.mcpServers;
}

/**
 * Get list of installed MCPs
 */
export function getInstalledMcps(cwd = process.cwd()) {
  const mcpJson = loadMcpJson(cwd);
  return Object.keys(mcpJson.mcpServers || {});
}

/**
 * Remove an MCP
 */
export function removeMcp(mcpId, cwd = process.cwd()) {
  // Remove from .mcp.json
  const mcpJson = loadMcpJson(cwd);
  if (mcpJson.mcpServers && mcpId in mcpJson.mcpServers) {
    delete mcpJson.mcpServers[mcpId];
    saveMcpJson(mcpJson, cwd);
  }

  // Remove from settings
  const settings = loadClaudeSettings(cwd);
  if (settings.enabledMcpjsonServers) {
    settings.enabledMcpjsonServers = settings.enabledMcpjsonServers.filter(
      (id) => id !== mcpId
    );
    saveClaudeSettings(settings, cwd);
  }

  return true;
}

/**
 * Verify MCP installation by checking npm package exists
 */
export async function verifyMcpPackage(npmPackage) {
  try {
    execSync(`npm view ${npmPackage.split('@')[0]} --json`, {
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return true;
  } catch {
    return false;
  }
}
