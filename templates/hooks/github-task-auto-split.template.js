/**
 * GitHub Task Auto-Split Hook
 *
 * Intercepts /github-task commands and analyzes if the prompt contains
 * multiple distinct tasks that should be split into separate issues.
 *
 * Event: PreToolUse (intercepts Skill tool calls)
 * Triggers: When /github-task is invoked
 *
 * Modes:
 * - suggest: Show recommendation but allow single issue creation
 * - automatic: Redirect to /github-task-multiple without prompting
 * - disabled: Always create single issue
 *
 * v2.3.0 - Initial implementation
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  techStackFile: '.claude/config/tech-stack.json',
  stateFile: '.claude/hooks/cache/github-task-split.json',
  minScoreToSplit: 4,
  maxTasks: 8,
};

/**
 * Load settings from tech-stack.json
 */
function loadSettings(projectRoot) {
  const techStackPath = path.join(projectRoot, CONFIG.techStackFile);
  if (!fs.existsSync(techStackPath)) {
    return { autoSplitMode: 'suggest' };
  }
  try {
    const techStack = JSON.parse(fs.readFileSync(techStackPath, 'utf8'));
    return techStack.githubTask || { autoSplitMode: 'suggest' };
  } catch {
    return { autoSplitMode: 'suggest' };
  }
}

/**
 * Analyze prompt for multiple tasks
 */
function analyzeForMultipleTasks(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { shouldSplit: false, taskCount: 1, tasks: [], confidence: 0, score: 0 };
  }

  const indicators = {
    // Conjunctions suggesting multiple items
    conjunctions: (prompt.match(/\b(and|plus|also|additionally|as well as)\b/gi) || []).length,
    // Comma-separated lists
    listItems: (prompt.match(/,\s*(?:and\s+)?[a-z]/gi) || []).length,
    // Numbered items
    numbered: (prompt.match(/\d+\.\s+\w/g) || []).length,
    // Action verbs (multiple distinct actions)
    actions: (prompt.match(/\b(add|create|build|implement|fix|refactor|update|integrate|remove|delete|migrate)\b/gi) || []).length,
    // Feature keywords
    features: (prompt.match(/\b(feature|component|system|service|module|endpoint|api|page|screen|view)\b/gi) || []).length,
    // Technical terms that suggest scope
    technical: (prompt.match(/\b(authentication|authorization|database|cache|api|ui|frontend|backend|testing)\b/gi) || []).length,
  };

  const score =
    indicators.conjunctions * 2 +
    indicators.listItems * 1.5 +
    indicators.numbered * 3 +
    indicators.actions * 1 +
    indicators.features * 0.5 +
    indicators.technical * 0.3;

  const taskCount = Math.max(2, Math.min(CONFIG.maxTasks, Math.ceil(score / 2)));
  const shouldSplit = score >= CONFIG.minScoreToSplit;

  // Extract potential task titles
  const tasks = extractTasks(prompt);

  return {
    shouldSplit,
    taskCount: tasks.length || taskCount,
    tasks,
    confidence: Math.min(1, score / 10),
    score,
    indicators,
  };
}

/**
 * Extract individual tasks from prompt
 */
function extractTasks(prompt) {
  const tasks = [];

  // Try numbered list extraction
  const numberedMatch = prompt.match(/\d+\.\s+([^,.\n]+)/g);
  if (numberedMatch && numberedMatch.length >= 2) {
    numberedMatch.forEach((item) => {
      const cleaned = item.replace(/^\d+\.\s+/, '').trim();
      if (cleaned.length > 5) {
        tasks.push(cleaned);
      }
    });
    if (tasks.length >= 2) return tasks;
  }

  // Try comma-separated extraction
  const parts = prompt.split(/,\s*(?:and\s+)?/);
  if (parts.length >= 3) {
    parts.forEach((part) => {
      const cleaned = part.trim();
      // Filter out short fragments
      if (cleaned.length > 10 && !cleaned.match(/^(the|a|an|with|for|to|in|on)\s/i)) {
        tasks.push(cleaned);
      }
    });
    if (tasks.length >= 2) return tasks;
  }

  // Try "and" splitting
  const andParts = prompt.split(/\s+and\s+/i);
  if (andParts.length >= 2) {
    andParts.forEach((part) => {
      const cleaned = part.trim();
      if (cleaned.length > 15) {
        tasks.push(cleaned);
      }
    });
    if (tasks.length >= 2) return tasks;
  }

  // Fallback: look for action verb phrases
  const actionPhrases = prompt.match(/\b(add|create|build|implement|fix|update|integrate)\s+[^,]+/gi);
  if (actionPhrases && actionPhrases.length >= 2) {
    actionPhrases.forEach((phrase) => {
      tasks.push(phrase.trim());
    });
  }

  return tasks;
}

/**
 * Format suggestion message
 */
function formatSuggestionMessage(analysis) {
  const { taskCount, tasks, confidence } = analysis;

  let message = `
╔═══════════════════════════════════════════════════════════════════════╗
║  💡 Multi-Task Detection                                              ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  This prompt appears to contain ${String(taskCount).padEnd(2)} distinct tasks.                      ║
║  Confidence: ${(confidence * 100).toFixed(0)}%                                                     ║
║                                                                       ║`;

  if (tasks.length > 0) {
    message += `
║  Detected tasks:                                                      ║`;
    tasks.slice(0, 5).forEach((task, idx) => {
      const truncated = task.substring(0, 55);
      message += `
║    ${idx + 1}. ${truncated.padEnd(55)}║`;
    });
    if (tasks.length > 5) {
      message += `
║    ... and ${tasks.length - 5} more                                                  ║`;
    }
  }

  message += `
║                                                                       ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Consider using /github-task-multiple for better tracking.            ║
║                                                                       ║
║  [S] Switch to /github-task-multiple                                  ║
║  [C] Continue with single issue                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
`;

  return message;
}

/**
 * Save analysis to state file
 */
function saveState(projectRoot, analysis, action) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  const dir = path.dirname(statePath);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let state = { analyses: [] };
    if (fs.existsSync(statePath)) {
      try {
        state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      } catch {
        state = { analyses: [] };
      }
    }

    state.analyses.push({
      timestamp: new Date().toISOString(),
      taskCount: analysis.taskCount,
      confidence: analysis.confidence,
      shouldSplit: analysis.shouldSplit,
      action, // 'suggest', 'auto-redirect', 'disabled', 'user-switch', 'user-continue'
    });

    // Keep last 50 analyses
    if (state.analyses.length > 50) {
      state.analyses = state.analyses.slice(-50);
    }

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // State saving should never break the hook
  }
}

/**
 * Main hook handler
 */
async function githubTaskAutoSplitHook(context) {
  const { tool, toolInput, projectRoot, hookType } = context;

  // Only process PreToolUse events
  if (hookType !== 'PreToolUse') {
    return { continue: true };
  }

  // Only intercept Skill tool calls
  if (tool !== 'Skill') {
    return { continue: true };
  }

  // Check if it's a github-task skill invocation
  const skillName = toolInput?.skill || '';
  if (skillName !== 'github-task') {
    return { continue: true };
  }

  // Get the prompt/arguments
  const prompt = toolInput?.args || '';
  if (!prompt || prompt.length < 20) {
    // Too short to analyze
    return { continue: true };
  }

  // Load settings
  const settings = loadSettings(projectRoot);
  const autoSplitMode = settings.autoSplitMode || 'suggest';

  // If disabled, let it through
  if (autoSplitMode === 'disabled') {
    return { continue: true };
  }

  // Analyze the prompt
  const analysis = analyzeForMultipleTasks(prompt);

  // If not worth splitting, let it through
  if (!analysis.shouldSplit || analysis.taskCount < 2) {
    return { continue: true };
  }

  // Handle based on mode
  if (autoSplitMode === 'automatic') {
    // Auto-redirect to /github-task-multiple
    saveState(projectRoot, analysis, 'auto-redirect');

    return {
      continue: true,
      redirect: {
        skill: 'github-task-multiple',
        args: prompt,
      },
      message: `Auto-splitting into ${analysis.taskCount} tasks using /github-task-multiple...`,
      metadata: {
        autoSplit: true,
        taskCount: analysis.taskCount,
        confidence: analysis.confidence,
      },
    };
  }

  // Suggest mode - show recommendation
  saveState(projectRoot, analysis, 'suggest');

  const suggestionMessage = formatSuggestionMessage(analysis);

  return {
    continue: true,
    inject: suggestionMessage,
    metadata: {
      multiTaskDetected: true,
      taskCount: analysis.taskCount,
      confidence: analysis.confidence,
      tasks: analysis.tasks,
    },
  };
}

module.exports = githubTaskAutoSplitHook;

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.analyzeForMultipleTasks = analyzeForMultipleTasks;
module.exports.extractTasks = extractTasks;
module.exports.loadSettings = loadSettings;
