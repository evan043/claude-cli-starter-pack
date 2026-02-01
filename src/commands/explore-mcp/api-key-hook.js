/**
 * API Key Hook Management
 *
 * Functions for managing the MCP API key validation hook.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { loadClaudeSettings, saveClaudeSettings } from './mcp-installer.js';

/**
 * Check if the API key validation hook is enabled
 * @returns {boolean} Whether the hook is enabled
 */
export function isApiKeyHookEnabled() {
  try {
    const settings = loadClaudeSettings();
    const hooks = settings.hooks?.PostToolUse || [];
    return hooks.some((h) =>
      h.hooks?.some((hook) =>
        hook.command?.includes('mcp-api-key-validator')
      )
    );
  } catch {
    return false;
  }
}

/**
 * Enable the API key validation hook
 * @returns {Object} Result with success and action
 */
export function enableApiKeyHook() {
  const settings = loadClaudeSettings();

  if (!settings.hooks) {
    settings.hooks = {};
  }
  if (!settings.hooks.PostToolUse) {
    settings.hooks.PostToolUse = [];
  }

  // Check if already enabled
  const alreadyEnabled = settings.hooks.PostToolUse.some((h) =>
    h.hooks?.some((hook) => hook.command?.includes('mcp-api-key-validator'))
  );

  if (alreadyEnabled) {
    return { success: true, action: 'already_enabled' };
  }

  // Add the hook
  settings.hooks.PostToolUse.push({
    matcher: 'Write|Edit',
    hooks: [
      {
        type: 'command',
        command: 'node .claude/hooks/mcp-api-key-validator.js',
      },
    ],
  });

  saveClaudeSettings(settings);
  return { success: true, action: 'enabled' };
}

/**
 * Disable the API key validation hook
 * @returns {Object} Result with success and action
 */
export function disableApiKeyHook() {
  const settings = loadClaudeSettings();

  if (!settings.hooks?.PostToolUse) {
    return { success: true, action: 'already_disabled' };
  }

  // Remove the hook
  settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter(
    (h) => !h.hooks?.some((hook) => hook.command?.includes('mcp-api-key-validator'))
  );

  // Clean up empty arrays
  if (settings.hooks.PostToolUse.length === 0) {
    delete settings.hooks.PostToolUse;
  }
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  saveClaudeSettings(settings);
  return { success: true, action: 'disabled' };
}

/**
 * Get embedded hook template (fallback)
 * @returns {string} Hook template content
 */
export function getEmbeddedHookTemplate() {
  return `/**
 * MCP API Key Validator Hook
 * Validates .mcp.json configurations and warns about missing API keys.
 */

import { readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

const MCP_API_KEY_INFO = {
  github: { required: true, keyName: 'GITHUB_PERSONAL_ACCESS_TOKEN', url: 'https://github.com/settings/tokens', free: true },
  railway: { required: true, keyName: 'RAILWAY_API_TOKEN', url: 'https://railway.app/account/tokens', free: true },
  cloudflare: { required: true, keyName: 'CLOUDFLARE_API_TOKEN', url: 'https://dash.cloudflare.com/profile/api-tokens', free: true },
  supabase: { required: true, keyName: 'SUPABASE_ACCESS_TOKEN', url: 'https://supabase.com/dashboard/account/tokens', free: true },
  exa: { required: true, keyName: 'EXA_API_KEY', url: 'https://exa.ai/pricing', free: true },
  resend: { required: true, keyName: 'RESEND_API_KEY', url: 'https://resend.com/api-keys', free: true },
  playwright: { required: false },
  puppeteer: { required: false },
};

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({ tool: '', input: {} }); }
    });
    setTimeout(() => resolve({ tool: '', input: {} }), 1000);
  });
}

async function main() {
  const context = await readStdin();
  const { tool, input } = context;

  if (!['Write', 'Edit'].includes(tool)) process.exit(0);

  const filePath = input?.file_path || input?.path || '';
  if (!filePath.endsWith('.mcp.json')) process.exit(0);

  const mcpJsonPath = join(process.cwd(), '.mcp.json');
  if (!existsSync(mcpJsonPath)) process.exit(0);

  try {
    const mcpJson = JSON.parse(readFileSync(mcpJsonPath, 'utf8'));
    const servers = mcpJson.mcpServers || {};

    for (const [id, config] of Object.entries(servers)) {
      const info = MCP_API_KEY_INFO[id];
      if (!info?.required) continue;

      const env = config.env || {};
      if (!env[info.keyName]) {
        console.error(\`\\x1b[33m[Warning] \${id}: Missing API key \${info.keyName}\\x1b[0m\`);
        if (info.url) console.error(\`\\x1b[36m  Get key at: \${info.url}\\x1b[0m\`);
      }
    }
  } catch {}

  process.exit(0);
}

main();
`;
}

/**
 * Deploy the API key validator hook file
 * @returns {Promise<string>} Path to the deployed hook
 */
export async function deployApiKeyHook() {
  const hookDir = path.join(process.cwd(), '.claude', 'hooks');
  const hookPath = path.join(hookDir, 'mcp-api-key-validator.js');

  // Create hooks directory if needed
  if (!fs.existsSync(hookDir)) {
    fs.mkdirSync(hookDir, { recursive: true });
  }

  // Read the template
  const templatePaths = [
    path.join(process.cwd(), 'templates', 'hooks', 'mcp-api-key-validator.template.js'),
    path.join(process.cwd(), 'node_modules', '@anthropic-ai/claude-cli-advanced-starter-pack', 'templates', 'hooks', 'mcp-api-key-validator.template.js'),
  ];

  let templateContent = null;
  for (const templatePath of templatePaths) {
    if (fs.existsSync(templatePath)) {
      templateContent = fs.readFileSync(templatePath, 'utf8');
      break;
    }
  }

  if (!templateContent) {
    // Use embedded template
    templateContent = getEmbeddedHookTemplate();
  }

  fs.writeFileSync(hookPath, templateContent, 'utf8');
  return hookPath;
}

/**
 * API Key Hook configuration flow
 */
export async function runApiKeyHookFlow() {
  console.log(chalk.cyan.bold('\n🔑 API Key Validation Hook\n'));

  const isEnabled = isApiKeyHookEnabled();
  console.log(chalk.dim('This hook validates .mcp.json and warns about missing API keys.'));
  console.log(`Current status: ${isEnabled ? chalk.green('Enabled') : chalk.yellow('Disabled')}\n`);

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        {
          name: isEnabled ? 'Disable hook' : 'Enable hook',
          value: isEnabled ? 'disable' : 'enable',
        },
        { name: 'View hook status', value: 'status' },
        { name: 'Back', value: 'back' },
      ],
    },
  ]);

  if (action === 'back') return;

  if (action === 'enable') {
    const spinner = ora('Deploying API key validation hook...').start();
    try {
      const hookPath = await deployApiKeyHook();
      const result = enableApiKeyHook();

      spinner.succeed('API key validation hook enabled');
      console.log(chalk.dim(`  Hook file: ${hookPath}`));
      console.log(chalk.dim('  Registered in .claude/settings.json'));
      console.log(chalk.yellow('\n  Restart Claude Code for changes to take effect.'));
    } catch (error) {
      spinner.fail(`Failed to enable hook: ${error.message}`);
    }
  } else if (action === 'disable') {
    const result = disableApiKeyHook();
    console.log(chalk.green('✓ API key validation hook disabled'));
  } else if (action === 'status') {
    const settings = loadClaudeSettings();
    console.log(chalk.white('\nHook configuration:'));
    console.log(chalk.dim(JSON.stringify(settings.hooks || {}, null, 2)));
  }
}
