/**
 * Deployment Orchestrator Hook
 *
 * Monitors deployment-related commands and provides coordination.
 * Prevents conflicting deployments and tracks deployment state.
 *
 * Event: PreToolUse
 * Priority: {{hooks.priorities.tools}}
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration from tech-stack.json
const CONFIG = {
  backend: {
    platform: '{{deployment.backend.platform}}',
    projectId: '{{deployment.backend.projectId}}',
    serviceId: '{{deployment.backend.serviceId}}',
  },
  frontend: {
    platform: '{{deployment.frontend.platform}}',
    projectName: '{{deployment.frontend.projectName}}',
  },
};

const DEPLOYMENT_STATE_FILE = '.claude/hooks/cache/deployment-state.json';

/**
 * Load deployment state
 */
function loadDeploymentState() {
  const statePath = path.join(process.cwd(), DEPLOYMENT_STATE_FILE);

  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch (error) {
      // Ignore parse errors
    }
  }

  return {
    backend: { status: 'idle', lastDeployment: null },
    frontend: { status: 'idle', lastDeployment: null },
    inProgress: false,
  };
}

/**
 * Save deployment state
 */
function saveDeploymentState(state) {
  const statePath = path.join(process.cwd(), DEPLOYMENT_STATE_FILE);
  const stateDir = path.dirname(statePath);

  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Check if a deployment is in progress
 */
function checkDeploymentInProgress(state) {
  // Check if state indicates deployment in progress
  if (state.inProgress) {
    // Check if it's been more than 10 minutes (likely stale)
    if (state.lastUpdated) {
      const lastUpdate = new Date(state.lastUpdated);
      const now = new Date();
      const minutes = (now - lastUpdate) / 1000 / 60;

      if (minutes > 10) {
        // Stale state, reset
        state.inProgress = false;
        state.backend.status = 'idle';
        state.frontend.status = 'idle';
        saveDeploymentState(state);
        return false;
      }
    }
    return true;
  }
  return false;
}

/**
 * Detect deployment-related commands
 */
function isDeploymentCommand(tool, input) {
  // MCP Railway deployment
  if (tool.includes('railway') && tool.includes('deployment')) {
    return { type: 'backend', platform: 'railway' };
  }

  // Bash commands
  if (tool === 'Bash' && input && input.command) {
    const cmd = input.command.toLowerCase();

    // Cloudflare/Vercel/Netlify deploys
    if (cmd.includes('wrangler pages deploy') || cmd.includes('wrangler deploy')) {
      return { type: 'frontend', platform: 'cloudflare' };
    }
    if (cmd.includes('vercel') && (cmd.includes('--prod') || cmd.includes('deploy'))) {
      return { type: 'frontend', platform: 'vercel' };
    }
    if (cmd.includes('netlify deploy')) {
      return { type: 'frontend', platform: 'netlify' };
    }

    // Heroku
    if (cmd.includes('git push heroku')) {
      return { type: 'backend', platform: 'heroku' };
    }

    // Fly.io
    if (cmd.includes('fly deploy')) {
      return { type: 'backend', platform: 'fly' };
    }
  }

  return null;
}

/**
 * Main hook handler
 */
module.exports = async function deploymentOrchestrator(context) {
  const { tool, input } = context;

  // Check if this is a deployment command
  const deployment = isDeploymentCommand(tool, input);

  if (!deployment) {
    return { continue: true };
  }

  // Load current deployment state
  const state = loadDeploymentState();

  // Check if another deployment is in progress
  if (checkDeploymentInProgress(state)) {
    const inProgressType = state.backend.status === 'deploying' ? 'backend' : 'frontend';

    return {
      continue: false, // Block the deployment
      message: `⚠️ Deployment blocked: ${inProgressType} deployment already in progress.

Current state:
- Backend: ${state.backend.status}
- Frontend: ${state.frontend.status}

Wait for the current deployment to complete, or clear the state if it's stuck:
- Check deployment status in your platform dashboard
- Clear state by deleting ${DEPLOYMENT_STATE_FILE}`,
    };
  }

  // Mark deployment as in progress
  state.inProgress = true;
  state[deployment.type].status = 'deploying';
  state[deployment.type].startTime = new Date().toISOString();
  state[deployment.type].platform = deployment.platform;
  saveDeploymentState(state);

  // Allow the deployment to proceed
  return {
    continue: true,
    message: `🚀 Starting ${deployment.type} deployment to ${deployment.platform}...

Pre-flight checks:
${CONFIG[deployment.type].platform === deployment.platform ? '✅' : '⚠️'} Platform matches config
✅ No conflicting deployments

Deployment state saved. Run /deploy-full to see full deployment status.`,
  };
};

/**
 * Post-deployment cleanup (called as PostToolUse)
 */
module.exports.postDeployment = async function postDeploymentOrchestrator(context) {
  const { tool, input, output, error } = context;

  // Check if this was a deployment command
  const deployment = isDeploymentCommand(tool, input);

  if (!deployment) {
    return { continue: true };
  }

  // Load and update state
  const state = loadDeploymentState();

  state.inProgress = false;
  state[deployment.type].status = error ? 'failed' : 'completed';
  state[deployment.type].lastDeployment = new Date().toISOString();
  state[deployment.type].duration = state[deployment.type].startTime
    ? Math.round((Date.now() - new Date(state[deployment.type].startTime)) / 1000)
    : null;

  if (error) {
    state[deployment.type].lastError = error.message || String(error);
  }

  saveDeploymentState(state);

  return {
    continue: true,
    message: error
      ? `❌ ${deployment.type} deployment failed after ${state[deployment.type].duration}s`
      : `✅ ${deployment.type} deployment completed in ${state[deployment.type].duration}s`,
  };
};
