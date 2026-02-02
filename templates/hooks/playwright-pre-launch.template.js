/**
 * Playwright Pre-Launch Hook
 *
 * Triggers before Playwright MCP tools are used to:
 * 1. Verify test credentials are configured in .env
 * 2. Check if tunnel service is running (if configured)
 * 3. Prompt user: "Test on production or localhost?"
 * 4. Display configured login selectors for review
 * 5. Offer to update credentials if needed
 *
 * Event: PreToolUse
 * Matcher: mcp__playwright__
 *
 * To enable this hook, add to .claude/settings.json:
 * {
 *   "hooks": {
 *     "PreToolUse": [{
 *       "matcher": "mcp__playwright__",
 *       "hooks": [{
 *         "type": "command",
 *         "command": "node .claude/hooks/playwright-pre-launch.js"
 *       }]
 *     }]
 *   }
 * }
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Paths
const TECH_STACK_PATHS = [
  join(process.cwd(), '.claude', 'config', 'tech-stack.json'),
  join(process.cwd(), '.claude', 'tech-stack.json'),
  join(process.cwd(), 'tech-stack.json'),
];
const ENV_PATH = join(process.cwd(), '.env');
const SESSION_CACHE = join(process.cwd(), '.claude', 'hooks', 'cache', 'playwright-session.json');

/**
 * Load tech-stack.json
 */
function loadTechStack() {
  for (const path of TECH_STACK_PATHS) {
    if (existsSync(path)) {
      try {
        return JSON.parse(readFileSync(path, 'utf8'));
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * Load .env file as key-value pairs
 */
function loadEnvFile() {
  if (!existsSync(ENV_PATH)) {
    return {};
  }

  const content = readFileSync(ENV_PATH, 'utf8');
  const env = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
      env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }

  return env;
}

/**
 * Check if tunnel is running (for ngrok)
 */
function checkTunnelStatus(tunnelConfig) {
  if (!tunnelConfig || tunnelConfig.service === 'none') {
    return { running: false, url: null, reason: 'No tunnel configured' };
  }

  if (tunnelConfig.service === 'ngrok') {
    try {
      const adminPort = tunnelConfig.adminPort || 4040;
      const response = execSync(`curl -s http://localhost:${adminPort}/api/tunnels`, {
        timeout: 3000,
        encoding: 'utf8',
      });
      const data = JSON.parse(response);
      if (data.tunnels && data.tunnels.length > 0) {
        const tunnel = data.tunnels[0];
        return {
          running: true,
          url: tunnel.public_url,
          reason: null,
        };
      }
    } catch {
      return {
        running: false,
        url: null,
        reason: 'ngrok not running. Start with: ngrok http ' + (tunnelConfig.port || 5173),
      };
    }
  }

  // For other tunnel services, check if URL is set
  if (tunnelConfig.url) {
    return { running: true, url: tunnelConfig.url, reason: null };
  }

  return {
    running: false,
    url: null,
    reason: `${tunnelConfig.service} tunnel URL not configured`,
  };
}

/**
 * Check if this session has already been validated
 */
function isSessionValidated() {
  if (!existsSync(SESSION_CACHE)) {
    return false;
  }

  try {
    const cache = JSON.parse(readFileSync(SESSION_CACHE, 'utf8'));
    const now = Date.now();
    const cacheAge = now - (cache.timestamp || 0);
    const maxAge = 30 * 60 * 1000; // 30 minutes

    return cacheAge < maxAge && cache.validated === true;
  } catch {
    return false;
  }
}

/**
 * Main hook execution
 */
async function main() {
  // Skip if already validated this session
  if (isSessionValidated()) {
    process.exit(0);
  }

  const techStack = loadTechStack();
  const envVars = loadEnvFile();

  if (!techStack) {
    // No tech-stack.json - allow Playwright to run without intervention
    process.exit(0);
  }

  const testing = techStack.testing || {};
  const devEnv = techStack.devEnvironment || {};
  const tunnelConfig = devEnv.tunnel || {};

  // Check if Playwright testing is configured
  if (testing.e2e?.framework !== 'playwright') {
    // Not configured for Playwright - allow to proceed
    process.exit(0);
  }

  const issues = [];
  const info = [];

  // 1. Check credentials
  const usernameVar = testing.credentials?.usernameEnvVar || 'TEST_USER_USERNAME';
  const passwordVar = testing.credentials?.passwordEnvVar || 'TEST_USER_PASSWORD';

  const hasUsername = envVars[usernameVar] || process.env[usernameVar];
  const hasPassword = envVars[passwordVar] || process.env[passwordVar];

  if (testing.credentials?.source === 'env') {
    if (!hasUsername) {
      issues.push(`Missing ${usernameVar} in .env or environment`);
    }
    if (!hasPassword) {
      issues.push(`Missing ${passwordVar} in .env or environment`);
    }
    if (hasUsername && hasPassword) {
      info.push(`Credentials: ${usernameVar} = ${hasUsername}`);
    }
  }

  // 2. Check tunnel status (if configured)
  const tunnelStatus = checkTunnelStatus(tunnelConfig);

  if (tunnelConfig.service && tunnelConfig.service !== 'none') {
    if (tunnelStatus.running) {
      info.push(`Tunnel: ${tunnelStatus.url}`);
    } else {
      issues.push(`Tunnel: ${tunnelStatus.reason}`);
    }
  }

  // 3. Display configured selectors
  const selectors = testing.selectors || {};
  if (selectors.username) {
    info.push(`Login selectors configured:`);
    info.push(`  Username: ${selectors.username}`);
    info.push(`  Password: ${selectors.password}`);
    info.push(`  Button: ${selectors.loginButton}`);
  }

  // 4. Build output message
  const output = {
    hookId: 'playwright-pre-launch',
    timestamp: new Date().toISOString(),
    status: issues.length > 0 ? 'warning' : 'ready',
    issues,
    info,
    environment: {
      defaultMode: testing.environment?.defaultMode || 'ask',
      baseUrl: testing.e2e?.baseUrl,
      tunnelUrl: tunnelStatus.url,
      productionUrl: techStack.urls?.production?.frontend,
    },
    prompt: null,
  };

  // 5. Determine if we need to prompt user
  const defaultMode = testing.environment?.defaultMode || 'ask';

  if (defaultMode === 'ask' || issues.length > 0) {
    output.prompt = {
      question: 'Playwright E2E Test Environment',
      message: issues.length > 0
        ? `⚠️ Issues found:\n${issues.map(i => `  • ${i}`).join('\n')}\n\nWhere should tests run?`
        : 'Where should Playwright E2E tests run?',
      options: [
        {
          label: 'Localhost' + (tunnelStatus.running ? ` (${tunnelStatus.url})` : ''),
          value: 'localhost',
          available: tunnelConfig.service === 'none' || tunnelStatus.running,
        },
        {
          label: 'Production' + (techStack.urls?.production?.frontend ? ` (${techStack.urls.production.frontend})` : ''),
          value: 'production',
          available: !!techStack.urls?.production?.frontend,
        },
        {
          label: 'Fix issues first',
          value: 'abort',
          available: issues.length > 0,
        },
      ],
    };
  }

  // Output for Claude to parse
  console.log(JSON.stringify(output, null, 2));

  // If there are blocking issues, exit with non-zero
  if (issues.length > 0 && defaultMode !== 'ask') {
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Playwright pre-launch hook error:', error.message);
  process.exit(1);
});
