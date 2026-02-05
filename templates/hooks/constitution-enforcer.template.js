/**
 * Constitution Enforcer Hook
 *
 * PreToolUse hook that validates code changes against the AI Constitution.
 * Uses 1-in-20 sampling by default to minimize performance impact.
 * Sensitive patterns (security, credentials) always bypass sampling.
 *
 * Hook Type: PreToolUse
 * Trigger: Before Edit and Write tool execution
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_CONFIG = {
  enabled: true,
  sampling_rate: 0.05, // 5% = 1-in-20
  tools: ['Edit', 'Write'],
  sensitive_patterns: [
    'password',
    'secret',
    'credential',
    'api_key',
    'token',
    'private_key',
    'auth',
    '.env',
  ],
};

// Session state for sampling counter
let sessionState = {
  checkCount: 0,
  lastReset: Date.now(),
  violations: [],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Load constitution configuration from YAML file
 * @returns {object|null} Constitution config or null
 */
function loadConstitution() {
  const constitutionPath = join(process.cwd(), '.claude', 'config', 'constitution.yaml');

  if (!existsSync(constitutionPath)) {
    return null;
  }

  try {
    const content = readFileSync(constitutionPath, 'utf8');
    return parseYaml(content);
  } catch {
    return null;
  }
}

/**
 * Simple YAML parser for constitution files
 * @param {string} yamlContent - YAML content
 * @returns {object} Parsed object
 */
function parseYaml(yamlContent) {
  const lines = yamlContent.split('\n');
  const result = {};
  const stack = [{ indent: -1, obj: result }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    const content = line.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (content.startsWith('- ')) {
      const itemContent = content.slice(2);
      const arrayKey = stack[stack.length - 1].arrayKey;
      if (arrayKey && Array.isArray(parent[arrayKey])) {
        if (itemContent.includes(': ')) {
          const obj = {};
          const [key, ...valueParts] = itemContent.split(': ');
          obj[key.trim()] = parseValue(valueParts.join(': '));
          parent[arrayKey].push(obj);
          stack.push({ indent, obj, arrayKey: null });
        } else {
          parent[arrayKey].push(parseValue(itemContent));
        }
      }
      continue;
    }

    if (content.includes(': ')) {
      const colonIndex = content.indexOf(': ');
      const key = content.slice(0, colonIndex).trim();
      const value = content.slice(colonIndex + 2).trim();

      if (value === '' || value === '|' || value === '>') {
        parent[key] = {};
        stack.push({ indent, obj: parent[key], arrayKey: null });
      } else if (value === '[]') {
        parent[key] = [];
      } else {
        parent[key] = parseValue(value);
      }
    } else if (content.endsWith(':')) {
      const key = content.slice(0, -1).trim();
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.trim().startsWith('- ')) {
        parent[key] = [];
        stack.push({ indent, obj: parent, arrayKey: key });
      } else {
        parent[key] = {};
        stack.push({ indent, obj: parent[key], arrayKey: null });
      }
    }
  }

  return result;
}

/**
 * Parse a YAML value
 */
function parseValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map(item => parseValue(item.trim()));
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return parseFloat(value);
  }
  return value;
}

/**
 * Detect domain from file path
 * @param {string} filePath - File path
 * @returns {string} Domain name
 */
function detectDomain(filePath) {
  if (!filePath) return 'all';

  const pathLower = filePath.toLowerCase();

  // Frontend patterns
  if (pathLower.match(/\.(tsx?|jsx?)$/) &&
      (pathLower.includes('component') || pathLower.includes('page') ||
       pathLower.includes('/ui/') || pathLower.includes('/views/'))) {
    return 'frontend';
  }

  // Backend patterns
  if (pathLower.match(/\.(py|ts|js)$/) &&
      (pathLower.includes('route') || pathLower.includes('api') ||
       pathLower.includes('service') || pathLower.includes('controller') ||
       pathLower.includes('model'))) {
    return 'backend';
  }

  // Testing patterns
  if (pathLower.match(/\.(test|spec)\.(ts|js|tsx|jsx|py)$/) ||
      pathLower.includes('/test/') || pathLower.includes('/__tests__/')) {
    return 'testing';
  }

  // Deployment patterns
  if (pathLower.match(/dockerfile|docker-compose|\.ya?ml$/) ||
      pathLower.includes('deploy') || pathLower.includes('ci')) {
    return 'deployment';
  }

  return 'all';
}

/**
 * Check if content matches sensitive patterns
 * @param {string} content - Content to check
 * @param {string[]} patterns - Sensitive patterns
 * @returns {boolean} True if matches sensitive pattern
 */
function matchesSensitivePattern(content, patterns) {
  if (!content) return false;
  const contentLower = content.toLowerCase();

  for (const pattern of patterns) {
    if (contentLower.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Determine if this check should be performed based on sampling
 * @param {object} config - Constitution config
 * @param {string} content - Content being written
 * @returns {boolean} True if check should be performed
 */
function shouldPerformCheck(config, content) {
  const enforcement = config.enforcement || DEFAULT_CONFIG;
  const sensitivePatterns = enforcement.sensitive_patterns || DEFAULT_CONFIG.sensitive_patterns;

  // Always check sensitive patterns
  if (matchesSensitivePattern(content, sensitivePatterns)) {
    return true;
  }

  // Apply sampling rate
  const samplingRate = enforcement.sampling_rate ?? DEFAULT_CONFIG.sampling_rate;

  // Reset counter every hour
  if (Date.now() - sessionState.lastReset > 3600000) {
    sessionState.checkCount = 0;
    sessionState.lastReset = Date.now();
  }

  sessionState.checkCount++;

  // Check based on sampling rate (e.g., 0.05 = check every 20th)
  if (samplingRate >= 1) return true;
  if (samplingRate <= 0) return false;

  const checkInterval = Math.round(1 / samplingRate);
  return sessionState.checkCount % checkInterval === 0;
}

/**
 * Get applicable rules for file and domain
 * @param {object} constitution - Constitution config
 * @param {string} filePath - File path
 * @param {string} domain - Detected domain
 * @returns {object[]} Applicable rules
 */
function getApplicableRules(constitution, filePath, domain) {
  const rules = [];

  if (!constitution?.sections) return rules;

  for (const [sectionName, section] of Object.entries(constitution.sections)) {
    if (section.enabled === false) continue;
    if (!section.rules) continue;

    for (const rule of section.rules) {
      if (rule.enabled === false) continue;

      // Check domain match
      const domains = rule.domains || ['all'];
      if (!domains.includes('all') && !domains.includes(domain)) {
        continue;
      }

      // Check file pattern match
      if (rule.file_patterns && rule.file_patterns.length > 0) {
        let matchesFile = false;
        for (const pattern of rule.file_patterns) {
          if (matchGlob(filePath, pattern)) {
            matchesFile = true;
            break;
          }
        }
        if (!matchesFile) continue;
      }

      rules.push({ ...rule, section: sectionName });
    }
  }

  return rules;
}

/**
 * Simple glob pattern matching
 */
function matchGlob(path, pattern) {
  const regex = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '<<<DOUBLE>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<DOUBLE>>>/g, '.*');

  return new RegExp(`^${regex}$`).test(path) || new RegExp(regex).test(path);
}

/**
 * Check content against rules and return violations
 * @param {string} content - Content to check
 * @param {object[]} rules - Rules to check against
 * @returns {object[]} Violations found
 */
function checkViolations(content, rules) {
  const violations = [];

  for (const rule of rules) {
    // Check for specific patterns based on rule ID prefix
    const violation = checkRule(content, rule);
    if (violation) {
      violations.push(violation);
    }
  }

  return violations;
}

/**
 * Check content against a specific rule
 * @param {string} content - Content to check
 * @param {object} rule - Rule to check
 * @returns {object|null} Violation or null
 */
function checkRule(content, rule) {
  const contentLower = content.toLowerCase();

  // Security rules (SEC-*)
  if (rule.id.startsWith('SEC-')) {
    // SEC-001: Hardcoded secrets
    if (rule.id === 'SEC-001') {
      const secretPatterns = [
        /password\s*[:=]\s*["'][^"']+["']/i,
        /api_key\s*[:=]\s*["'][^"']+["']/i,
        /secret\s*[:=]\s*["'][^"']+["']/i,
        /token\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/i,
      ];
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          return createViolation(rule, 'Potential hardcoded secret detected');
        }
      }
    }
  }

  // Code style rules (CS-*)
  if (rule.id.startsWith('CS-')) {
    // CS-002: Prefer async/await
    if (rule.id === 'CS-002') {
      if (content.includes('.then(') && content.includes('.catch(')) {
        return createViolation(rule, 'Consider using async/await instead of Promise chains');
      }
    }

    // CS-003: Descriptive variable names
    if (rule.id === 'CS-003') {
      const shortVarPattern = /(?:const|let|var)\s+([a-z])\s*=/g;
      const matches = [...content.matchAll(shortVarPattern)];
      const nonLoopVars = matches.filter(m => !['i', 'j', 'k', 'n', 'x', 'y'].includes(m[1]));
      if (nonLoopVars.length > 0) {
        return createViolation(rule, `Single-letter variable name: ${nonLoopVars[0][1]}`);
      }
    }
  }

  // Architecture rules (ARCH-*)
  if (rule.id.startsWith('ARCH-')) {
    // ARCH-003: UI components with business logic
    if (rule.id === 'ARCH-003') {
      if (contentLower.includes('component') || contentLower.includes('.tsx')) {
        // Check for direct API calls or database access
        if (content.includes('fetch(') || content.includes('axios.') ||
            content.includes('.query(') || content.includes('.findOne(')) {
          return createViolation(rule, 'UI component appears to contain direct data fetching');
        }
      }
    }
  }

  // Git rules (GIT-*)
  if (rule.id.startsWith('GIT-')) {
    // These are checked at commit time, not during edit
  }

  return null;
}

/**
 * Create a violation object
 */
function createViolation(rule, message) {
  return {
    ruleId: rule.id,
    section: rule.section,
    severity: rule.severity || 'warning',
    description: rule.description,
    message,
    rationale: rule.rationale,
    autoFix: rule.auto_fix || false,
  };
}

/**
 * Format violations into enforcement message
 * @param {object[]} violations - Violations found
 * @returns {string} Formatted message
 */
function formatViolationMessage(violations) {
  if (violations.length === 0) return null;

  const errors = violations.filter(v => v.severity === 'error');
  const warnings = violations.filter(v => v.severity === 'warning');
  const infos = violations.filter(v => v.severity === 'info');

  let message = `
[CONSTITUTION ENFORCEMENT]

`;

  if (errors.length > 0) {
    message += `## ❌ ERRORS (must fix before proceeding)\n\n`;
    for (const v of errors) {
      message += formatSingleViolation(v);
    }
  }

  if (warnings.length > 0) {
    message += `## ⚠️ WARNINGS (should fix)\n\n`;
    for (const v of warnings) {
      message += formatSingleViolation(v);
    }
  }

  if (infos.length > 0) {
    message += `## ℹ️ INFO (consider)\n\n`;
    for (const v of infos) {
      message += formatSingleViolation(v);
    }
  }

  message += `
---
**Response Protocol:**
1. **STOP** - Do not proceed with the violating change
2. **EXPLAIN** - Acknowledge the violation
3. **SUGGEST** - Provide a compliant alternative
4. **REFACTOR** - Apply the fix if auto_fix is enabled
`;

  return message;
}

/**
 * Format a single violation
 */
function formatSingleViolation(violation) {
  let text = `### ${violation.ruleId}: ${violation.description}\n`;
  text += `**Issue:** ${violation.message}\n`;
  if (violation.rationale) {
    text += `**Why:** ${violation.rationale}\n`;
  }
  if (violation.autoFix) {
    text += `*Auto-fix available*\n`;
  }
  text += '\n';
  return text;
}

/**
 * Log check to session state
 */
function logCheck(filePath, violations, wasSkipped) {
  const logDir = join(process.cwd(), '.claude', 'cache');
  const logFile = join(logDir, 'constitution-checks.json');

  try {
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    let log = { checks: [] };
    if (existsSync(logFile)) {
      log = JSON.parse(readFileSync(logFile, 'utf8'));
    }

    // Keep only last 100 entries
    if (log.checks.length >= 100) {
      log.checks = log.checks.slice(-99);
    }

    log.checks.push({
      timestamp: new Date().toISOString(),
      file: filePath,
      violations: violations.length,
      wasSkipped,
      checkNumber: sessionState.checkCount,
    });

    writeFileSync(logFile, JSON.stringify(log, null, 2));
  } catch {
    // Ignore logging errors
  }
}

// ============================================
// MAIN HOOK HANDLER
// ============================================

/**
 * Main hook handler
 * @param {object} context - Hook context
 * @param {string} context.tool - Tool being invoked
 * @param {object} context.args - Tool arguments
 * @returns {object} Hook result
 */
export async function handler(context) {
  const { tool, args } = context;

  // Load constitution
  const constitution = loadConstitution();

  // Skip if no constitution or enforcement disabled
  if (!constitution) {
    return { continue: true };
  }

  const enforcement = constitution.enforcement || DEFAULT_CONFIG;
  if (!enforcement.enabled) {
    return { continue: true };
  }

  // Check if tool should be enforced
  const enforcedTools = enforcement.tools || DEFAULT_CONFIG.tools;
  if (!enforcedTools.includes(tool)) {
    return { continue: true };
  }

  // Get file path and content
  const filePath = args.file_path || args.path || '';
  const content = args.new_string || args.content || '';

  // Determine if we should perform this check (sampling)
  if (!shouldPerformCheck(constitution, content)) {
    logCheck(filePath, [], true);
    return { continue: true };
  }

  // Detect domain and get applicable rules
  const domain = detectDomain(filePath);
  const rules = getApplicableRules(constitution, filePath, domain);

  if (rules.length === 0) {
    logCheck(filePath, [], false);
    return { continue: true };
  }

  // Check for violations
  const violations = checkViolations(content, rules);

  // Log the check
  logCheck(filePath, violations, false);

  // If no violations, continue
  if (violations.length === 0) {
    return { continue: true };
  }

  // Check if any violations are errors (blocking)
  const hasErrors = violations.some(v => v.severity === 'error');

  // Format the message
  const message = formatViolationMessage(violations);

  // Store violations in session for potential reference
  sessionState.violations = violations;

  // Block if there are errors, warn otherwise
  return {
    continue: !hasErrors,
    message,
  };
}

export default { handler };
