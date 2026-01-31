/**
 * Context Injector Hook
 *
 * Injects prior session context for seamless resumption.
 * Loads checkpoints, recent progress, and active features.
 * Enables continuity across multi-day projects.
 *
 * Event: UserPromptSubmit (runs once per session)
 *
 * Configuration: Reads from .claude/config/hooks-config.json
 */

const fs = require('fs');
const path = require('path');

// Default configuration (can be overridden by hooks-config.json)
const DEFAULT_CONFIG = {
  recent_completed_tasks: 3,     // Number of completed tasks to show
  next_pending_tasks: 2,         // Number of pending tasks to show
  active_features_limit: 3,      // Number of active features to show
  recent_agents_limit: 5,        // Number of recent agents to show
  max_checkpoint_age_hours: 48,  // Ignore checkpoints older than this
};

// Paths
const CONFIG_PATH = path.join(process.cwd(), '.claude', 'config', 'hooks-config.json');
const CHECKPOINT_PATH = path.join(process.cwd(), '.claude', 'checkpoints', 'latest.json');
const FEATURE_TRACKING_PATH = path.join(process.cwd(), '.claude', 'config', 'feature-tracking.json');
const AGENT_LOG_PATH = path.join(process.cwd(), '.claude', 'logs', 'agent-activity.json');
const SESSION_MARKER = path.join(process.cwd(), '.claude', 'config', '.context-injected');

/**
 * Load configuration with defaults
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...(config.context_injector || {}) };
    }
  } catch (e) {
    // Use defaults on error
  }
  return DEFAULT_CONFIG;
}

/**
 * Check if we've already injected context this session
 */
function hasInjectedThisSession() {
  try {
    if (fs.existsSync(SESSION_MARKER)) {
      const content = fs.readFileSync(SESSION_MARKER, 'utf8');
      const timestamp = parseInt(content, 10);
      // Session valid for 4 hours
      if (Date.now() - timestamp < 4 * 60 * 60 * 1000) {
        return true;
      }
    }
  } catch (e) {
    // Continue with injection
  }
  return false;
}

/**
 * Mark session as injected
 */
function markSessionInjected() {
  try {
    const dir = path.dirname(SESSION_MARKER);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SESSION_MARKER, Date.now().toString(), 'utf8');
  } catch (e) {
    // Silent failure
  }
}

/**
 * Load latest checkpoint
 */
function loadCheckpoint(config) {
  try {
    if (!fs.existsSync(CHECKPOINT_PATH)) {
      return null;
    }

    const checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf8'));

    // Check age
    if (checkpoint.created_at) {
      const age = Date.now() - new Date(checkpoint.created_at).getTime();
      const maxAge = config.max_checkpoint_age_hours * 60 * 60 * 1000;
      if (age > maxAge) {
        return null; // Checkpoint too old
      }
    }

    return checkpoint;
  } catch (e) {
    return null;
  }
}

/**
 * Load feature tracking
 */
function loadFeatureTracking() {
  try {
    if (fs.existsSync(FEATURE_TRACKING_PATH)) {
      return JSON.parse(fs.readFileSync(FEATURE_TRACKING_PATH, 'utf8'));
    }
  } catch (e) {
    // No feature tracking
  }
  return null;
}

/**
 * Load recent agent activity
 */
function loadAgentActivity(config) {
  try {
    if (fs.existsSync(AGENT_LOG_PATH)) {
      const activity = JSON.parse(fs.readFileSync(AGENT_LOG_PATH, 'utf8'));
      // Return most recent agents
      if (Array.isArray(activity)) {
        return activity.slice(-config.recent_agents_limit);
      }
    }
  } catch (e) {
    // No agent activity
  }
  return [];
}

/**
 * Format task list for display
 */
function formatTaskList(tasks, limit, status) {
  if (!tasks || !Array.isArray(tasks)) return '';

  const filtered = tasks.filter(t => t.status === status).slice(0, limit);
  if (filtered.length === 0) return '';

  return filtered.map(t => `  - ${t.title || t.name || 'Unknown task'}`).join('\n');
}

/**
 * Format feature list for display
 */
function formatFeatureList(features, limit) {
  if (!features || !Array.isArray(features)) return '';

  const active = features.filter(f => f.status === 'in_progress').slice(0, limit);
  if (active.length === 0) return '';

  return active.map(f => `  - ${f.name}: ${f.progress || 0}%`).join('\n');
}

/**
 * Format agent list for display
 */
function formatAgentList(agents) {
  if (!agents || agents.length === 0) return '';

  return agents.map(a => {
    const name = a.name || a.type || 'agent';
    const status = a.success ? 'completed' : 'failed';
    return `  - ${name}: ${status}`;
  }).join('\n');
}

/**
 * Build context message
 */
function buildContextMessage(checkpoint, features, agents, config) {
  const sections = [];

  // Add checkpoint progress
  if (checkpoint) {
    const completed = formatTaskList(checkpoint.tasks, config.recent_completed_tasks, 'completed');
    const pending = formatTaskList(checkpoint.tasks, config.next_pending_tasks, 'pending');

    if (completed) {
      sections.push(`**Recent Progress:**\n${completed}`);
    }
    if (pending) {
      sections.push(`**Next Tasks:**\n${pending}`);
    }
    if (checkpoint.current_phase) {
      sections.push(`**Current Phase:** ${checkpoint.current_phase}`);
    }
  }

  // Add active features
  if (features) {
    const featureList = formatFeatureList(features.features || features, config.active_features_limit);
    if (featureList) {
      sections.push(`**Active Features:**\n${featureList}`);
    }
  }

  // Add recent agents
  if (agents && agents.length > 0) {
    const agentList = formatAgentList(agents);
    if (agentList) {
      sections.push(`**Recent Agents:**\n${agentList}`);
    }
  }

  return sections.join('\n\n');
}

/**
 * Main hook handler
 */
module.exports = async function contextInjector(context) {
  // Always continue - never block
  const approve = () => ({ continue: true });

  try {
    // Check if already injected this session
    if (hasInjectedThisSession()) {
      return approve();
    }

    // Mark session as injected
    markSessionInjected();

    const config = loadConfig();

    // Load context sources
    const checkpoint = loadCheckpoint(config);
    const features = loadFeatureTracking();
    const agents = loadAgentActivity(config);

    // Check if we have any context to inject
    if (!checkpoint && !features && agents.length === 0) {
      console.log('[context-injector] No prior context found');
      return approve();
    }

    // Build context message
    const message = buildContextMessage(checkpoint, features, agents, config);

    if (message) {
      console.log('[context-injector] Session context loaded:');
      console.log('---');
      console.log(message);
      console.log('---');
    }

    return approve();
  } catch (error) {
    console.error(`[context-injector] Error: ${error.message}`);
    return approve();
  }
};
