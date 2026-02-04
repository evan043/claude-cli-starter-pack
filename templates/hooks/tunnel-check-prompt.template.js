/**
 * Tunnel Check Prompt Hook
 *
 * Prompts user to spin up tunneling service before roadmap, phase-dev,
 * or task-list commands that require E2E testing.
 *
 * Event: PreToolUse
 * Priority: {{hooks.priorities.lifecycle}}
 */

const fs = require('fs');
const path = require('path');

// Commands that benefit from tunnel service for E2E testing
const TUNNEL_RECOMMENDED_COMMANDS = [
  '/create-roadmap',
  '/phase-dev-plan',
  '/create-task-list',
  '/roadmap-track',
  '/phase-track',
  '/e2e-test',
  '/ralph',
];

/**
 * Load tech-stack.json
 */
function loadTechStack() {
  const paths = [
    path.join(process.cwd(), '.claude', 'config', 'tech-stack.json'),
    path.join(process.cwd(), '.claude', 'tech-stack.json'),
    path.join(process.cwd(), 'tech-stack.json'),
  ];

  for (const techStackPath of paths) {
    if (fs.existsSync(techStackPath)) {
      try {
        return JSON.parse(fs.readFileSync(techStackPath, 'utf8'));
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * Check if tunnel service is configured and active
 */
function getTunnelStatus() {
  const techStack = loadTechStack();
  const tunnel = techStack?.devEnvironment?.tunnel;

  if (!tunnel || tunnel.service === 'none') {
    return {
      configured: false,
      active: false,
      service: null,
      url: null,
    };
  }

  return {
    configured: true,
    active: !!tunnel.url, // URL present means tunnel is likely active
    service: tunnel.service,
    url: tunnel.url,
    subdomain: tunnel.subdomain,
  };
}

/**
 * Check if a command matches the trigger patterns
 */
function isCommandTriggered(input, toolName) {
  // Check if this is a Bash command running a slash command
  if (toolName === 'Bash' && input?.command) {
    return TUNNEL_RECOMMENDED_COMMANDS.some((cmd) =>
      input.command.includes(cmd)
    );
  }

  // Check if this is a Read operation on a command file
  if (toolName === 'Read' && input?.file_path) {
    const filePath = input.file_path.toLowerCase();
    return (
      filePath.includes('.claude/commands/') &&
      (filePath.includes('roadmap') ||
        filePath.includes('phase-dev') ||
        filePath.includes('task-list') ||
        filePath.includes('e2e-test') ||
        filePath.includes('ralph'))
    );
  }

  return false;
}

/**
 * Main hook handler
 */
module.exports = async function tunnelCheckPrompt(context) {
  const { tool, input } = context;

  // Check if this is a command that benefits from tunnel
  if (!isCommandTriggered(input, tool)) {
    return { continue: true };
  }

  const tunnelStatus = getTunnelStatus();

  // If tunnel is configured and active, proceed silently
  if (tunnelStatus.active) {
    return { continue: true };
  }

  // If tunnel is configured but not active, prompt user
  if (tunnelStatus.configured && !tunnelStatus.active) {
    return {
      continue: true,
      message: `⚠️ **Tunnel Service Not Active**

Your project is configured to use **${tunnelStatus.service}** for E2E testing,
but no tunnel URL is currently set.

**Options:**
1. Start tunnel: \`/tunnel-start\`
2. Continue without tunnel (tests will use localhost)

**Why use a tunnel?**
- Enables testing from mobile devices
- Allows external services to reach your local server
- Better simulates production environment

To start the tunnel and update the URL:
\`\`\`bash
/tunnel-start
\`\`\`

Continuing with localhost...`,
    };
  }

  // If tunnel is not configured at all, offer setup
  const techStack = loadTechStack();
  const hasPlaywright = techStack?.testing?.e2e?.framework === 'playwright';

  if (hasPlaywright) {
    return {
      continue: true,
      message: `ℹ️ **Tunnel Service Not Configured**

E2E testing is enabled (Playwright) but no tunnel service is configured.
Tests will run against localhost.

**To enable tunnel testing:**
1. Run: \`/tunnel-start\`
2. Or configure in tech-stack.json:
   \`\`\`json
   "devEnvironment": {
     "tunnel": {
       "service": "ngrok",
       "url": null,
       "subdomain": "your-subdomain"
     }
   }
   \`\`\`

**Supported tunnel services:**
- ngrok (recommended)
- localtunnel
- cloudflare-tunnel
- serveo`,
    };
  }

  // No E2E testing configured, proceed silently
  return { continue: true };
};
