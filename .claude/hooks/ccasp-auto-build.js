/**
 * CCASP Auto-Build Hook
 *
 * PostToolUse hook that outputs a reminder when CCASP source files are modified.
 * Claude Code will see this output and be reminded to run `npm test`.
 *
 * Event: PostToolUse (Edit, Write)
 *
 * This hook checks stdin for tool information and outputs a reminder if:
 * - The modified file is in src/, templates/, bin/, or .claude/
 * - The file has a relevant extension (.js, .ts, .md, .json)
 *
 * Skip conditions:
 * - Environment variable CCASP_SKIP_BUILD=1 is set
 * - File is not in a watched directory
 */

const fs = require('fs');
const path = require('path');

// Directories that require build validation when modified
const WATCHED_DIRS = [
  '/src/',
  '/templates/',
  '/bin/',
  '/.claude/commands/',
  '/.claude/hooks/',
  '/.claude/agents/',
  '/.claude/skills/',
];

// File extensions that require build validation
const WATCHED_EXTENSIONS = ['.js', '.mjs', '.ts', '.json', '.md'];

// State file to track modified files in session
const STATE_FILE = '.claude/config/.ccasp-build-state.json';

/**
 * Check if a file path is in a watched directory
 */
function isWatchedPath(filePath) {
  if (!filePath) return false;

  // Normalize path separators for Windows
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Check if path is in a watched directory
  const inWatchedDir = WATCHED_DIRS.some(dir => normalizedPath.includes(dir));

  // Check if file has a watched extension
  const hasWatchedExt = WATCHED_EXTENSIONS.some(ext => normalizedPath.endsWith(ext));

  return inWatchedDir && hasWatchedExt;
}

/**
 * Load build state
 */
function loadState() {
  const statePath = path.join(process.cwd(), STATE_FILE);
  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch {
      // Return default
    }
  }
  return {
    modifiedFiles: [],
    lastReminder: 0,
    buildPending: false,
  };
}

/**
 * Save build state
 */
function saveState(state) {
  const statePath = path.join(process.cwd(), STATE_FILE);
  const stateDir = path.dirname(statePath);

  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Main function - reads from stdin and outputs reminder if needed
 */
async function main() {
  // Check if build should be skipped
  if (process.env.CCASP_SKIP_BUILD === '1') {
    return;
  }

  // Read stdin to get tool information
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf8');
  } catch {
    // No stdin available
    return;
  }

  let toolData;
  try {
    toolData = JSON.parse(input);
  } catch {
    // Invalid JSON
    return;
  }

  // Check if this is an Edit or Write tool
  const toolName = toolData.tool_name || toolData.name;
  if (toolName !== 'Edit' && toolName !== 'Write') {
    return;
  }

  // Get the file path
  const filePath = toolData.tool_input?.file_path || toolData.input?.file_path || '';

  // Check if this is a watched file
  if (!isWatchedPath(filePath)) {
    return;
  }

  // Load state and track this file
  const state = loadState();
  const normalizedPath = filePath.replace(/\\/g, '/');
  const shortPath = normalizedPath.split('/').slice(-2).join('/');

  if (!state.modifiedFiles.includes(shortPath)) {
    state.modifiedFiles.push(shortPath);
  }
  state.buildPending = true;
  saveState(state);

  // Output reminder (this will be shown to Claude Code)
  console.log(`\n📦 CCASP source file modified: ${shortPath}`);
  console.log('');
  console.log('⚠️  Remember to run `npm test` before committing to verify syntax.');
  console.log('');
  console.log('Modified files pending validation:');
  state.modifiedFiles.forEach(f => console.log(`  - ${f}`));
  console.log('');
  console.log('To skip this reminder, set CCASP_SKIP_BUILD=1 or say "skip build" in your request.');
}

// Run the hook
main().catch(err => {
  // Silently fail - don't break Claude Code
  if (process.env.DEBUG) {
    console.error('ccasp-auto-build hook error:', err);
  }
});
