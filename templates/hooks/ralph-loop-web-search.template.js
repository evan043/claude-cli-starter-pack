/**
 * RALPH Loop Web Search Hook
 *
 * Enhances RALPH (Repeat Analysis-Loop-Patch-Heal) testing with web search:
 * - Searches for issue context before testing begins
 * - Performs additional web search after every 3rd failed loop
 * - Aggregates search results to inform fix strategies
 *
 * Event: PreToolUse, PostToolUse
 * Triggers: Before test runs and after test failures
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  stateFile: '.claude/hooks/cache/ralph-web-search-state.json',
  // Web search settings
  searchEnabled: true,
  searchBeforeTesting: true,
  searchAfterFailures: true,
  failuresBeforeSearch: 3,
  maxSearchResults: 5,
  // Search query patterns
  preTestSearchPatterns: [
    '{feature} testing best practices',
    '{feature} common bugs',
    '{feature} edge cases',
    '{technology} {feature} issues',
  ],
  postFailureSearchPatterns: [
    '{error} fix {technology}',
    '{feature} {error} solution',
    'how to debug {error} {technology}',
    '{technology} testing {error}',
  ],
  // Cache settings
  cacheSearchResults: true,
  cacheDurationHours: 24,
};

/**
 * Load hook state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) {
    return {
      loopCount: 0,
      lastSearch: null,
      searchCache: {},
      currentTest: null,
      failureCount: 0,
      searchHistory: [],
    };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { loopCount: 0, lastSearch: null, searchCache: {}, currentTest: null, failureCount: 0, searchHistory: [] };
  }
}

/**
 * Save hook state
 */
function saveState(projectRoot, state) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  state.lastUpdate = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Load tech stack for technology detection
 */
function loadTechStack(projectRoot) {
  const techStackPath = path.join(projectRoot, '.claude', 'config', 'tech-stack.json');
  if (!fs.existsSync(techStackPath)) {
    return { frontend: {}, backend: {}, testing: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(techStackPath, 'utf8'));
  } catch {
    return { frontend: {}, backend: {}, testing: {} };
  }
}

/**
 * Detect current epic/phase from context
 */
function detectCurrentContext(projectRoot, toolInput) {
  // Try to find from tool input
  if (toolInput?.file_path) {
    const match = toolInput.file_path.match(/phase-plans\/([^\/]+)\/phase-(\d+)/);
    if (match) {
      return { epicSlug: match[1], phaseId: `phase-${match[2]}` };
    }
  }

  // Try to find from EXECUTION_STATE.json
  const execStatePath = path.join(projectRoot, '.claude', 'EXECUTION_STATE.json');
  if (fs.existsSync(execStatePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(execStatePath, 'utf8'));
      return {
        epicSlug: state.roadmap_id || state.epic_id,
        phaseId: state.current_phase || state.current_project,
      };
    } catch {
      // Ignore
    }
  }

  return { epicSlug: null, phaseId: null };
}

/**
 * Extract feature name from test file or context
 */
function extractFeatureName(toolInput, toolOutput) {
  // From test file name
  if (toolInput?.file_path) {
    const filename = path.basename(toolInput.file_path, path.extname(toolInput.file_path));
    return filename.replace(/\.(test|spec)$/, '').replace(/[-_]/g, ' ');
  }

  // From command output
  if (typeof toolOutput === 'string') {
    const match = toolOutput.match(/(?:testing|test suite:?)\s+([^\n]+)/i);
    if (match) return match[1].trim();
  }

  return 'feature';
}

/**
 * Extract error message from test failure
 */
function extractErrorMessage(toolOutput) {
  if (typeof toolOutput !== 'string') return '';

  // Common error patterns
  const patterns = [
    /Error:\s*(.+)/i,
    /AssertionError:\s*(.+)/i,
    /Expected\s+(.+?)\s+(?:to|but)/i,
    /FAIL\s+(.+)/i,
    /TypeError:\s*(.+)/i,
    /ReferenceError:\s*(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = toolOutput.match(pattern);
    if (match) return match[1].trim().substring(0, 100);
  }

  return 'test failure';
}

/**
 * Build search query from pattern and context
 */
function buildSearchQuery(pattern, context) {
  let query = pattern;
  query = query.replace('{feature}', context.feature || 'feature');
  query = query.replace('{error}', context.error || 'error');
  query = query.replace('{technology}', context.technology || 'javascript');
  return query;
}

/**
 * Check if search result is cached and valid
 */
function getCachedSearch(query, state) {
  if (!CONFIG.cacheSearchResults) return null;

  const cached = state.searchCache[query];
  if (!cached) return null;

  const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
  const maxAge = CONFIG.cacheDurationHours * 60 * 60 * 1000;

  if (cacheAge > maxAge) {
    delete state.searchCache[query];
    return null;
  }

  return cached.results;
}

/**
 * Perform web search using available tools
 */
function performWebSearch(query, projectRoot, state) {
  // Check cache first
  const cached = getCachedSearch(query, state);
  if (cached) {
    return { results: cached, fromCache: true };
  }

  // Try different search methods
  let results = [];

  // Method 1: Use gh CLI to search GitHub issues/discussions
  try {
    const ghResults = execSync(
      `gh search issues "${query}" --limit ${CONFIG.maxSearchResults} --json title,url,body`,
      { encoding: 'utf8', timeout: 10000 }
    );
    const parsed = JSON.parse(ghResults);
    results.push(...parsed.map(r => ({
      source: 'github-issues',
      title: r.title,
      url: r.url,
      snippet: r.body?.substring(0, 200),
    })));
  } catch {
    // GitHub search failed, continue with other methods
  }

  // Method 2: Use context7 if MCP is available (would need Task tool)
  // This would be triggered via agent delegation

  // Cache results
  if (CONFIG.cacheSearchResults && results.length > 0) {
    state.searchCache[query] = {
      timestamp: new Date().toISOString(),
      results: results,
    };
  }

  return { results, fromCache: false };
}

/**
 * Format search results for display
 */
function formatSearchResults(results, searchType) {
  if (results.length === 0) {
    return `No relevant ${searchType} search results found.`;
  }

  let output = `## Web Search Results (${searchType})\n\n`;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    output += `### ${i + 1}. ${result.title}\n`;
    output += `**Source:** ${result.source} | [Link](${result.url})\n`;
    if (result.snippet) {
      output += `> ${result.snippet}...\n`;
    }
    output += '\n';
  }

  output += `---\n_Search performed by RALPH Loop Web Search Hook_\n`;

  return output;
}

/**
 * Detect if this is a test command
 */
function isTestCommand(tool, toolInput) {
  if (tool !== 'Bash') return false;

  const command = toolInput?.command || '';
  return /\b(test|jest|mocha|vitest|pytest|npm\s+test|npm\s+run\s+test)/i.test(command);
}

/**
 * Detect if test output indicates failure
 */
function isTestFailure(toolOutput) {
  if (typeof toolOutput !== 'string') return false;

  const failurePatterns = [
    /\bFAIL\b/i,
    /\bfailed\b/i,
    /\bERROR\b/,
    /\d+\s+failing/i,
    /Tests:\s+\d+\s+failed/i,
    /AssertionError/i,
  ];

  return failurePatterns.some(pattern => pattern.test(toolOutput));
}

/**
 * Main hook handler - PreToolUse
 */
async function preToolUseHandler(context) {
  const { tool, toolInput, projectRoot, hookType } = context;

  if (hookType !== 'PreToolUse') return { continue: true };

  // Only process test commands
  if (!isTestCommand(tool, toolInput)) {
    return { continue: true };
  }

  if (!CONFIG.searchEnabled || !CONFIG.searchBeforeTesting) {
    return { continue: true };
  }

  // Load state
  const state = loadState(projectRoot);

  // Check if this is start of new test run
  const testCommand = toolInput?.command || 'test';
  if (state.currentTest !== testCommand) {
    state.currentTest = testCommand;
    state.failureCount = 0;
    state.loopCount = 0;

    // Perform pre-test search
    const techStack = loadTechStack(projectRoot);
    const technology = techStack.frontend?.framework ||
                       techStack.backend?.framework ||
                       techStack.testing?.framework ||
                       'javascript';

    const feature = extractFeatureName(toolInput, null);

    const searchContext = {
      feature,
      technology,
      error: '',
    };

    // Select random pre-test search pattern
    const patternIndex = Math.floor(Math.random() * CONFIG.preTestSearchPatterns.length);
    const query = buildSearchQuery(CONFIG.preTestSearchPatterns[patternIndex], searchContext);

    const { results, fromCache } = performWebSearch(query, projectRoot, state);

    if (results.length > 0) {
      const formattedResults = formatSearchResults(results, 'Pre-Testing');

      // Record in history
      state.searchHistory.push({
        type: 'pre-test',
        query,
        timestamp: new Date().toISOString(),
        resultCount: results.length,
        fromCache,
      });

      saveState(projectRoot, state);

      return {
        continue: true,
        message: formattedResults,
        metadata: {
          webSearchResults: results,
          searchType: 'pre-test',
        },
      };
    }

    saveState(projectRoot, state);
  }

  return { continue: true };
}

/**
 * Main hook handler - PostToolUse
 */
async function postToolUseHandler(context) {
  const { tool, toolInput, toolOutput, projectRoot, hookType } = context;

  if (hookType !== 'PostToolUse') return { continue: true };

  // Only process test commands
  if (!isTestCommand(tool, toolInput)) {
    return { continue: true };
  }

  if (!CONFIG.searchEnabled || !CONFIG.searchAfterFailures) {
    return { continue: true };
  }

  // Check if test failed
  if (!isTestFailure(toolOutput)) {
    return { continue: true };
  }

  // Load state
  const state = loadState(projectRoot);

  // Increment counters
  state.loopCount++;
  state.failureCount++;

  // Check if we should perform web search (every Nth failure)
  if (state.failureCount % CONFIG.failuresBeforeSearch !== 0) {
    saveState(projectRoot, state);
    return { continue: true };
  }

  // Perform post-failure search
  const techStack = loadTechStack(projectRoot);
  const technology = techStack.frontend?.framework ||
                     techStack.backend?.framework ||
                     techStack.testing?.framework ||
                     'javascript';

  const feature = extractFeatureName(toolInput, toolOutput);
  const error = extractErrorMessage(toolOutput);

  const searchContext = {
    feature,
    technology,
    error,
  };

  // Select random post-failure search pattern
  const patternIndex = Math.floor(Math.random() * CONFIG.postFailureSearchPatterns.length);
  const query = buildSearchQuery(CONFIG.postFailureSearchPatterns[patternIndex], searchContext);

  const { results, fromCache } = performWebSearch(query, projectRoot, state);

  // Record in history
  state.searchHistory.push({
    type: 'post-failure',
    query,
    timestamp: new Date().toISOString(),
    resultCount: results.length,
    fromCache,
    failureCount: state.failureCount,
    error: error.substring(0, 50),
  });

  saveState(projectRoot, state);

  if (results.length > 0) {
    const formattedResults = formatSearchResults(results, `Post-Failure (Loop #${state.loopCount})`);

    return {
      continue: true,
      message: formattedResults,
      metadata: {
        webSearchResults: results,
        searchType: 'post-failure',
        loopCount: state.loopCount,
        failureCount: state.failureCount,
      },
    };
  }

  return { continue: true };
}

/**
 * Main hook router
 */
async function ralphLoopWebSearchHook(context) {
  const { hookType } = context;

  if (hookType === 'PreToolUse') {
    return preToolUseHandler(context);
  } else if (hookType === 'PostToolUse') {
    return postToolUseHandler(context);
  }

  return { continue: true };
}

module.exports = ralphLoopWebSearchHook;

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.isTestCommand = isTestCommand;
module.exports.isTestFailure = isTestFailure;
module.exports.extractErrorMessage = extractErrorMessage;
module.exports.performWebSearch = performWebSearch;
