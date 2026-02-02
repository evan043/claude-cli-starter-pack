/**
 * Ralph Occurrence Auditor Hook
 *
 * After a successful fix during Ralph Loop, scans the codebase for similar patterns
 * and offers to apply the same fix across all occurrences.
 *
 * Event: PostToolUse
 * Triggers: After Edit tool operations during active Ralph Loop
 *
 * Features:
 * - Pattern extraction from diffs
 * - Codebase scanning for similar patterns
 * - Safe patch script generation
 * - User confirmation before bulk application
 *
 * v2.3.0 - Initial implementation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  stateFile: '.claude/hooks/cache/ralph-occurrence-audit.json',
  ralphStateFile: '.claude/ralph-loop.json',
  techStackFile: '.claude/config/tech-stack.json',
  backupDir: '.claude/backups/occurrence-fixes',
  maxOccurrences: 50,
  minSimilarity: 0.7,
  defaultScope: 'project', // 'directory', 'project', 'custom'
  autoApplyThreshold: 'never', // 'never', '1-2', '3+'
};

/**
 * Load audit state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) {
    return {
      enabled: true,
      scope: CONFIG.defaultScope,
      customGlob: null,
      autoApplyThreshold: CONFIG.autoApplyThreshold,
      audits: [],
      lastAudit: null,
    };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return {
      enabled: true,
      scope: CONFIG.defaultScope,
      customGlob: null,
      autoApplyThreshold: CONFIG.autoApplyThreshold,
      audits: [],
      lastAudit: null,
    };
  }
}

/**
 * Save audit state
 */
function saveState(projectRoot, state) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Load settings from tech-stack.json
 */
function loadSettings(projectRoot) {
  const techStackPath = path.join(projectRoot, CONFIG.techStackFile);
  if (!fs.existsSync(techStackPath)) {
    return null;
  }
  try {
    const techStack = JSON.parse(fs.readFileSync(techStackPath, 'utf8'));
    return techStack.ralphLoop?.occurrenceAudit || null;
  } catch {
    return null;
  }
}

/**
 * Check if Ralph Loop is active
 */
function isRalphLoopActive(projectRoot) {
  const ralphPath = path.join(projectRoot, CONFIG.ralphStateFile);
  if (!fs.existsSync(ralphPath)) return false;

  try {
    const state = JSON.parse(fs.readFileSync(ralphPath, 'utf8'));
    return state.active === true;
  } catch {
    return false;
  }
}

/**
 * Get recent failures from Ralph Loop state
 */
function getRecentFailures(projectRoot) {
  const ralphPath = path.join(projectRoot, CONFIG.ralphStateFile);
  if (!fs.existsSync(ralphPath)) return [];

  try {
    const state = JSON.parse(fs.readFileSync(ralphPath, 'utf8'));
    return state.failures || [];
  } catch {
    return [];
  }
}

/**
 * Extract pattern from edit diff
 */
function extractPattern(oldString, newString, filePath) {
  const patterns = [];

  // Detect null check additions
  if (newString.includes('?.') && !oldString.includes('?.')) {
    patterns.push({
      type: 'null-check',
      description: 'Optional chaining added',
      searchPattern: extractBaseExpression(oldString, newString),
    });
  }

  // Detect null/undefined checks
  if (
    (newString.includes('!== null') || newString.includes('!== undefined') || newString.includes('!= null')) &&
    !oldString.includes('!== null') &&
    !oldString.includes('!== undefined')
  ) {
    patterns.push({
      type: 'null-guard',
      description: 'Null/undefined guard added',
      searchPattern: extractNullCheckContext(oldString),
    });
  }

  // Detect try-catch additions
  if (newString.includes('try {') && !oldString.includes('try {')) {
    patterns.push({
      type: 'error-handling',
      description: 'Try-catch block added',
      searchPattern: extractFunctionCall(oldString),
    });
  }

  // Detect default value additions
  if ((newString.includes('|| []') || newString.includes('|| {}') || newString.includes('?? ')) && !oldString.includes('||') && !oldString.includes('??')) {
    patterns.push({
      type: 'default-value',
      description: 'Default value added',
      searchPattern: extractDefaultContext(oldString, newString),
    });
  }

  // Detect async/await fixes
  if (newString.includes('await ') && !oldString.includes('await ')) {
    patterns.push({
      type: 'async-await',
      description: 'Await keyword added',
      searchPattern: extractAsyncContext(oldString),
    });
  }

  // Detect import additions
  if (newString.includes('import ') && !oldString.includes('import ')) {
    patterns.push({
      type: 'import',
      description: 'Import statement added',
      searchPattern: null, // Don't search for missing imports generically
    });
  }

  // Generic pattern - look for similar code structure
  if (patterns.length === 0) {
    const genericPattern = extractGenericPattern(oldString);
    if (genericPattern) {
      patterns.push({
        type: 'generic',
        description: 'Similar code pattern',
        searchPattern: genericPattern,
      });
    }
  }

  return patterns;
}

/**
 * Extract base expression before optional chaining was added
 */
function extractBaseExpression(oldString, newString) {
  // Find the part that had ?. added
  const match = newString.match(/(\w+)\?\./);
  if (match) {
    return match[1] + '.'; // Return original accessor pattern
  }
  return null;
}

/**
 * Extract context for null check patterns
 */
function extractNullCheckContext(oldString) {
  // Extract variable/property access that's being checked
  const match = oldString.match(/(\w+(?:\.\w+)*)\s*[.[(]/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * Extract function call pattern
 */
function extractFunctionCall(oldString) {
  const match = oldString.match(/(\w+)\s*\(/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * Extract default value context
 */
function extractDefaultContext(oldString, newString) {
  const match = oldString.match(/(\w+(?:\.\w+)*)/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * Extract async function context
 */
function extractAsyncContext(oldString) {
  const match = oldString.match(/(\w+)\s*\(/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * Extract generic pattern
 */
function extractGenericPattern(oldString) {
  // Look for common code patterns
  const trimmed = oldString.trim();
  if (trimmed.length < 10 || trimmed.length > 200) return null;

  // Extract identifiers and operators
  const identifiers = trimmed.match(/\w+/g);
  if (identifiers && identifiers.length >= 2) {
    return identifiers.slice(0, 3).join('.*');
  }
  return null;
}

/**
 * Search codebase for similar patterns
 */
function searchForOccurrences(pattern, filePath, projectRoot, scope, customGlob) {
  if (!pattern.searchPattern) return [];

  const occurrences = [];
  let searchPath = projectRoot;
  let globPattern = '**/*.{js,ts,jsx,tsx,py,go,rs}';

  // Determine search scope
  if (scope === 'directory') {
    searchPath = path.dirname(path.join(projectRoot, filePath));
    globPattern = '*.{js,ts,jsx,tsx,py,go,rs}';
  } else if (scope === 'custom' && customGlob) {
    globPattern = customGlob;
  }

  // Use ripgrep if available, fallback to grep
  try {
    const searchTerm = pattern.searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const result = execSync(`rg -l "${searchTerm}" --type-add "code:*.{js,ts,jsx,tsx,py,go,rs}" -t code "${searchPath}" 2>/dev/null || grep -rl "${searchTerm}" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" "${searchPath}" 2>/dev/null || echo ""`, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      cwd: projectRoot,
    });

    const files = result
      .split('\n')
      .filter((f) => f.trim())
      .slice(0, CONFIG.maxOccurrences);

    for (const file of files) {
      // Skip the original file
      if (file === filePath || file.endsWith(path.basename(filePath))) continue;

      // Skip node_modules, dist, etc
      if (file.includes('node_modules') || file.includes('/dist/') || file.includes('/.git/')) continue;

      try {
        const content = fs.readFileSync(path.join(projectRoot, file), 'utf8');
        const lines = content.split('\n');
        const regex = new RegExp(pattern.searchPattern, 'g');

        lines.forEach((line, idx) => {
          if (regex.test(line)) {
            occurrences.push({
              file: file,
              line: idx + 1,
              content: line.trim().substring(0, 100),
              similarity: calculateSimilarity(line, pattern.searchPattern),
            });
          }
        });
      } catch {
        // Skip files we can't read
      }
    }
  } catch {
    // Search failed, return empty
  }

  // Sort by similarity and filter by minimum threshold
  return occurrences.filter((o) => o.similarity >= CONFIG.minSimilarity).sort((a, b) => b.similarity - a.similarity);
}

/**
 * Calculate similarity score
 */
function calculateSimilarity(line, pattern) {
  const lineTokens = line.match(/\w+/g) || [];
  const patternTokens = pattern.match(/\w+/g) || [];

  if (lineTokens.length === 0 || patternTokens.length === 0) return 0;

  const matches = patternTokens.filter((t) => lineTokens.includes(t)).length;
  return matches / patternTokens.length;
}

/**
 * Generate patch information
 */
function generatePatchInfo(pattern, oldString, newString, occurrences) {
  return {
    patternType: pattern.type,
    description: pattern.description,
    originalFix: {
      old: oldString.substring(0, 200),
      new: newString.substring(0, 200),
    },
    occurrences: occurrences.map((o) => ({
      file: o.file,
      line: o.line,
      similarity: Math.round(o.similarity * 100) + '%',
      preview: o.content,
    })),
    patchGenerated: true,
    patchApplied: false,
  };
}

/**
 * Format occurrence report for user
 */
function formatOccurrenceReport(audit) {
  if (!audit || !audit.occurrences || audit.occurrences.length === 0) {
    return null;
  }

  const count = audit.occurrences.length;
  let report = `
╔═══════════════════════════════════════════════════════════════════════╗
║  🔍 Occurrence Audit: Similar Patterns Found                          ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  Pattern: ${audit.description.substring(0, 55).padEnd(55)}║
║  Found: ${String(count).padEnd(3)} similar occurrence${count > 1 ? 's' : ''} in codebase                          ║
║                                                                       ║`;

  // Show first 5 occurrences
  const shown = audit.occurrences.slice(0, 5);
  shown.forEach((occ, idx) => {
    const fileInfo = `${occ.file}:${occ.line}`.substring(0, 50);
    const similarity = occ.similarity;
    report += `
║  ${String(idx + 1).padStart(2)}. ${fileInfo.padEnd(50)} (${similarity})║`;
  });

  if (count > 5) {
    report += `
║      ... and ${String(count - 5).padEnd(3)} more occurrences                                 ║`;
  }

  report += `
║                                                                       ║
║  Actions:                                                             ║
║    [V] View all occurrences with context                              ║
║    [A] Apply fix to all (creates backup first)                        ║
║    [S] Select which to fix                                            ║
║    [I] Ignore and continue                                            ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
`;

  return report;
}

/**
 * Main hook handler
 */
async function ralphOccurrenceAuditorHook(context) {
  const { tool, toolInput, toolOutput, projectRoot, hookType } = context;

  // Only process PostToolUse events
  if (hookType !== 'PostToolUse') {
    return { continue: true };
  }

  // Only track Edit operations
  if (tool !== 'Edit') {
    return { continue: true };
  }

  // Check if Ralph Loop is active
  if (!isRalphLoopActive(projectRoot)) {
    return { continue: true };
  }

  // Load settings
  const settings = loadSettings(projectRoot);
  const state = loadState(projectRoot);

  // Check if feature is enabled
  const enabled = settings?.enabled ?? state.enabled ?? true;
  if (!enabled) {
    return { continue: true };
  }

  // Get edit details
  const filePath = toolInput?.file_path || '';
  const oldString = toolInput?.old_string || '';
  const newString = toolInput?.new_string || '';

  // Skip if no meaningful change
  if (!oldString || !newString || oldString === newString) {
    return { continue: true };
  }

  // Skip if file is in excluded paths
  if (filePath.includes('node_modules') || filePath.includes('.git') || filePath.includes('/dist/')) {
    return { continue: true };
  }

  // Extract patterns from the fix
  const patterns = extractPattern(oldString, newString, filePath);
  if (patterns.length === 0) {
    return { continue: true };
  }

  // Search for occurrences
  const scope = settings?.scope || state.scope || CONFIG.defaultScope;
  const customGlob = settings?.customGlob || state.customGlob;

  let allOccurrences = [];
  for (const pattern of patterns) {
    const occurrences = searchForOccurrences(pattern, filePath, projectRoot, scope, customGlob);
    if (occurrences.length > 0) {
      allOccurrences = allOccurrences.concat(
        occurrences.map((o) => ({
          ...o,
          patternType: pattern.type,
          patternDescription: pattern.description,
        }))
      );
    }
  }

  // Remove duplicates (same file:line)
  const seen = new Set();
  allOccurrences = allOccurrences.filter((o) => {
    const key = `${o.file}:${o.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (allOccurrences.length === 0) {
    return { continue: true };
  }

  // Create audit record
  const audit = {
    timestamp: new Date().toISOString(),
    fixFile: filePath,
    fixLine: null, // Could extract from toolOutput
    patterns: patterns.map((p) => p.type),
    description: patterns[0]?.description || 'Code fix pattern',
    occurrences: allOccurrences.map((o) => ({
      file: o.file,
      line: o.line,
      similarity: Math.round(o.similarity * 100) + '%',
      preview: o.content,
    })),
    patchGenerated: true,
    patchApplied: false,
    originalFix: {
      old: oldString.substring(0, 500),
      new: newString.substring(0, 500),
    },
  };

  // Update state
  state.lastAudit = audit;
  state.audits.push({
    timestamp: audit.timestamp,
    fixFile: audit.fixFile,
    occurrenceCount: audit.occurrences.length,
    patchApplied: false,
  });

  // Keep only last 100 audits
  if (state.audits.length > 100) {
    state.audits = state.audits.slice(-100);
  }

  saveState(projectRoot, state);

  // Generate report
  const report = formatOccurrenceReport(audit);

  if (report) {
    return {
      continue: true,
      message: report,
      metadata: {
        occurrenceAudit: true,
        fixFile: filePath,
        occurrenceCount: allOccurrences.length,
        patterns: patterns.map((p) => p.type),
      },
    };
  }

  return { continue: true };
}

module.exports = ralphOccurrenceAuditorHook;

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.extractPattern = extractPattern;
module.exports.searchForOccurrences = searchForOccurrences;
module.exports.calculateSimilarity = calculateSimilarity;
module.exports.loadSettings = loadSettings;
