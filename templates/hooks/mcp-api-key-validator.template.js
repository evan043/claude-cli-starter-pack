/**
 * MCP API Key Validator Hook
 *
 * Validates .mcp.json configurations and warns about missing API keys.
 * This hook runs after Write/Edit operations to .mcp.json.
 *
 * Event: PostToolUse
 * Matcher: Write|Edit
 *
 * To enable this hook, add to .claude/settings.json:
 * {
 *   "hooks": {
 *     "PostToolUse": [{
 *       "matcher": "Write|Edit",
 *       "hooks": [{
 *         "type": "command",
 *         "command": "node .claude/hooks/mcp-api-key-validator.js"
 *       }]
 *     }]
 *   }
 * }
 */

import { readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

/**
 * Known MCP servers and their API key requirements
 * This is a subset - add more as needed
 */
const MCP_API_KEY_INFO = {
  github: {
    required: true,
    keyName: 'GITHUB_PERSONAL_ACCESS_TOKEN',
    url: 'https://github.com/settings/tokens',
    free: true,
  },
  railway: {
    required: true,
    keyName: 'RAILWAY_API_TOKEN',
    url: 'https://railway.app/account/tokens',
    free: true,
  },
  cloudflare: {
    required: true,
    keyName: 'CLOUDFLARE_API_TOKEN',
    url: 'https://dash.cloudflare.com/profile/api-tokens',
    free: true,
  },
  vercel: {
    required: true,
    keyName: 'VERCEL_TOKEN',
    url: 'https://vercel.com/account/tokens',
    free: true,
  },
  supabase: {
    required: true,
    keyName: 'SUPABASE_ACCESS_TOKEN',
    url: 'https://supabase.com/dashboard/account/tokens',
    free: true,
  },
  slack: {
    required: true,
    keyName: 'SLACK_BOT_TOKEN',
    url: 'https://api.slack.com/apps',
    free: true,
  },
  resend: {
    required: true,
    keyName: 'RESEND_API_KEY',
    url: 'https://resend.com/api-keys',
    free: true,
  },
  exa: {
    required: true,
    keyName: 'EXA_API_KEY',
    url: 'https://exa.ai/pricing',
    free: true,
  },
  skyvern: {
    required: true,
    keyName: 'SKYVERN_API_KEY',
    url: 'https://app.skyvern.com',
    free: true,
  },
  n8n: {
    required: true,
    keyName: 'N8N_API_KEY',
    url: 'https://docs.n8n.io/api/authentication/',
    free: true,
  },
  ngrok: {
    required: true,
    keyName: 'NGROK_AUTHTOKEN',
    url: 'https://dashboard.ngrok.com/get-started/your-authtoken',
    free: true,
  },
  // MCPs that don't require API keys
  playwright: { required: false },
  puppeteer: { required: false },
  'playwright-ext': { required: false },
  'log-monitor': { required: false },
  'browser-monitor': { required: false },
  git: { required: false },
  postgres: { required: false },
  sqlite: { required: false },
  filesystem: { required: false },
  fetch: { required: false },
};

/**
 * Parse stdin for hook context
 */
async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({ tool: '', input: {} });
      }
    });
    // Timeout after 1 second if no input
    setTimeout(() => resolve({ tool: '', input: {} }), 1000);
  });
}

/**
 * Check if a value looks like an environment variable reference
 */
function isEnvVarReference(value) {
  return typeof value === 'string' && value.startsWith('${') && value.endsWith('}');
}

/**
 * Check if an environment variable is set
 */
function isEnvVarSet(varName) {
  return process.env[varName] !== undefined && process.env[varName] !== '';
}

/**
 * Validate MCP configuration for missing API keys
 */
function validateMcpConfig(mcpJson) {
  const warnings = [];
  const servers = mcpJson.mcpServers || {};

  for (const [serverId, config] of Object.entries(servers)) {
    const apiKeyInfo = MCP_API_KEY_INFO[serverId];

    // Skip if we don't have info or it doesn't require a key
    if (!apiKeyInfo || !apiKeyInfo.required) continue;

    // Check if the required env var is configured
    const env = config.env || {};
    const keyName = apiKeyInfo.keyName;

    if (!env[keyName]) {
      // Key not configured at all
      warnings.push({
        server: serverId,
        keyName,
        issue: 'not_configured',
        url: apiKeyInfo.url,
        free: apiKeyInfo.free,
      });
    } else if (isEnvVarReference(env[keyName])) {
      // Key references an env var - check if it's set
      const varName = env[keyName].slice(2, -1); // Extract VAR from ${VAR}
      if (!isEnvVarSet(varName)) {
        warnings.push({
          server: serverId,
          keyName,
          issue: 'env_not_set',
          varName,
          url: apiKeyInfo.url,
          free: apiKeyInfo.free,
        });
      }
    }
  }

  return warnings;
}

/**
 * Format warning message
 */
function formatWarnings(warnings) {
  if (warnings.length === 0) return null;

  let message = '\n\x1b[33m╔═══════════════════════════════════════════════════════════════╗\x1b[0m\n';
  message += '\x1b[33m║\x1b[0m  \x1b[1m\x1b[33m⚠️  Missing API Keys Detected\x1b[0m                                \x1b[33m║\x1b[0m\n';
  message += '\x1b[33m╠═══════════════════════════════════════════════════════════════╣\x1b[0m\n';

  for (const warning of warnings) {
    const serverLine = `  ${warning.server}: ${warning.keyName}`.padEnd(60);
    message += `\x1b[33m║\x1b[0m${serverLine}\x1b[33m║\x1b[0m\n`;

    if (warning.issue === 'not_configured') {
      message += `\x1b[33m║\x1b[0m\x1b[90m    → Key not configured in .mcp.json\x1b[0m`.padEnd(71) + `\x1b[33m║\x1b[0m\n`;
    } else if (warning.issue === 'env_not_set') {
      message += `\x1b[33m║\x1b[0m\x1b[90m    → Environment variable ${warning.varName} not set\x1b[0m`.padEnd(71) + `\x1b[33m║\x1b[0m\n`;
    }

    if (warning.url) {
      const urlLine = `    Get key: ${warning.url}`.padEnd(60);
      message += `\x1b[33m║\x1b[0m\x1b[36m${urlLine}\x1b[0m\x1b[33m║\x1b[0m\n`;
    }

    if (warning.free) {
      message += `\x1b[33m║\x1b[0m\x1b[32m    Free tier available\x1b[0m`.padEnd(71) + `\x1b[33m║\x1b[0m\n`;
    }
  }

  message += '\x1b[33m╠═══════════════════════════════════════════════════════════════╣\x1b[0m\n';
  message += '\x1b[33m║\x1b[0m  Run \x1b[1mccasp explore-mcp\x1b[0m to configure API keys                  \x1b[33m║\x1b[0m\n';
  message += '\x1b[33m╚═══════════════════════════════════════════════════════════════╝\x1b[0m\n';

  return message;
}

/**
 * Main hook function
 */
async function main() {
  try {
    const context = await readStdin();
    const { tool, input } = context;

    // Only process Write/Edit to .mcp.json
    if (!['Write', 'Edit'].includes(tool)) {
      process.exit(0);
    }

    const filePath = input?.file_path || input?.path || '';
    if (!filePath.endsWith('.mcp.json') && basename(filePath) !== '.mcp.json') {
      process.exit(0);
    }

    // Read the .mcp.json file
    const cwd = process.cwd();
    const mcpJsonPath = join(cwd, '.mcp.json');

    if (!existsSync(mcpJsonPath)) {
      process.exit(0);
    }

    let mcpJson;
    try {
      mcpJson = JSON.parse(readFileSync(mcpJsonPath, 'utf8'));
    } catch {
      // Invalid JSON - skip validation
      process.exit(0);
    }

    // Validate and report warnings
    const warnings = validateMcpConfig(mcpJson);
    const message = formatWarnings(warnings);

    if (message) {
      // message contains only warning text about missing env vars, no secrets
      console.error(message);
    }

    // Always allow the operation (this is a warning hook, not a blocker)
    process.exit(0);
  } catch (error) {
    // Sanitize error message to avoid leaking any sensitive data
    const safeMessage = error.message
      ? error.message.replace(/[A-Za-z0-9_]{20,}/g, '[REDACTED]')
      : 'Unknown error';
    console.error(`[mcp-api-key-validator] Error: ${safeMessage}`);
    process.exit(0);
  }
}

main();
