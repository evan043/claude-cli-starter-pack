/**
 * Component Creation Templates
 *
 * Templates for creating hooks and slash commands.
 */

/**
 * Sanitize user input for safe interpolation into JavaScript code
 * Prevents template injection attacks
 * @param {*} value - Value to sanitize
 * @returns {string} Sanitized string safe for JS interpolation
 */
function sanitizeForJS(value) {
  if (typeof value !== 'string') return String(value);
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Hook template for enforcement/injection
 */
export function generateHookTemplate(config) {
  const {
    name,
    description,
    eventType = 'PreToolUse',
    tools = ['Edit', 'Write'],
    targetPatterns = [],
    blockedPatterns = [],
    warningPatterns = [],
    blockReason = 'Pattern violation detected',
    referenceDoc = '',
  } = config;

  const toolsArray = Array.isArray(tools) ? tools : [tools];
  const toolsList = toolsArray.map((t) => `'${sanitizeForJS(t)}'`).join(', ');

  return `#!/usr/bin/env node
/**
 * ${sanitizeForJS(name)}
 *
 * Event: ${sanitizeForJS(eventType)} (${toolsArray.map(t => sanitizeForJS(t)).join('|')})
 * Purpose: ${sanitizeForJS(description)}
 *
 * Created by: gtask create-hook
 * Date: ${new Date().toISOString()}
 */

const hookInput = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');

// Configuration
const CONFIG = {
  targetPatterns: [${targetPatterns.map((p) => `'${sanitizeForJS(p)}'`).join(', ')}],
  blockedPatterns: [${blockedPatterns.map((p) => `'${sanitizeForJS(p)}'`).join(', ')}],
  warningPatterns: [${warningPatterns.map((p) => `'${sanitizeForJS(p)}'`).join(', ')}]
};

// Helper functions
function isTargetFile(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\\\/g, '/').toLowerCase();
  return CONFIG.targetPatterns.length === 0 ||
    CONFIG.targetPatterns.some(p => normalized.includes(p.toLowerCase()));
}

function findBlockedPatterns(content) {
  if (!content) return [];
  return CONFIG.blockedPatterns.filter(p => content.includes(p));
}

function findWarningPatterns(content) {
  if (!content) return [];
  return CONFIG.warningPatterns.filter(p => content.includes(p));
}

// Main hook logic
async function main() {
  try {
    const tool = hookInput.tool_name || '';
    const input = hookInput.tool_input || {};

    // Only process target tools
    const MONITORED_TOOLS = [${toolsList}];
    if (!MONITORED_TOOLS.includes(tool)) {
      console.log(JSON.stringify({ decision: 'approve' }));
      return;
    }

    const filePath = input.file_path || '';
    const content = input.content || input.new_string || '';

    // Skip non-target files
    if (!isTargetFile(filePath)) {
      console.log(JSON.stringify({ decision: 'approve' }));
      return;
    }

    // Check for blocked patterns
    const blocked = findBlockedPatterns(content);
    if (blocked.length > 0) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: '${sanitizeForJS(blockReason)}',
        systemMessage: \`
## ${sanitizeForJS(name)} - Violation Detected

**Blocked patterns found:** \${blocked.join(', ')}

**Why this was blocked:**
${sanitizeForJS(blockReason)}

${referenceDoc ? `**Reference:** \`${sanitizeForJS(referenceDoc)}\`` : ''}

**To fix:**
1. Review the blocked patterns above
2. Update your code to follow the required pattern
3. Retry the operation
\`
      }));
      process.exit(1);
      return;
    }

    // Check for warning patterns
    const warnings = findWarningPatterns(content);
    if (warnings.length > 0) {
      console.log(JSON.stringify({
        decision: 'approve',
        systemMessage: \`
## ${sanitizeForJS(name)} - Warning

**Patterns that may need review:** \${warnings.join(', ')}

This is a warning only - the operation will proceed.
\`
      }));
      return;
    }

    // All checks passed
    console.log(JSON.stringify({ decision: 'approve' }));

  } catch (error) {
    // Always approve on error (fail-safe)
    console.log(JSON.stringify({
      decision: 'approve',
      reason: \`Hook error (non-blocking): \${error.message}\`
    }));
  }
}

main();
`;
}

/**
 * Slash command template
 */
export function generateCommandTemplate(config) {
  const {
    name,
    description,
    complexity = 'low',
    delegatesTo = '',
    arguments: args = '',
    steps = [],
    examples = [],
    relatedCommands = [],
  } = config;

  const stepsMarkdown = steps
    .map(
      (step, i) => `### Step ${i + 1}: ${step.title}

${step.instructions}
`
    )
    .join('\n');

  const examplesMarkdown = examples
    .map((ex) => `# ${ex.description}\n/${name} ${ex.args}`)
    .join('\n\n');

  const relatedMarkdown = relatedCommands.map((cmd) => `- \`/${sanitizeForJS(cmd)}\``).join('\n');

  return `---
description: ${sanitizeForJS(description)}
type: project
complexity: ${sanitizeForJS(complexity)}
---

# /${sanitizeForJS(name)}

${sanitizeForJS(description)}

## Usage

\`\`\`bash
/${sanitizeForJS(name)}${args ? ` ${sanitizeForJS(args)}` : ''}
\`\`\`

## Instructions

When this command is invoked:

${stepsMarkdown || `### Step 1: Execute

Follow the instructions for this command.
`}

${
  delegatesTo
    ? `## Delegates To

This command uses: \`${sanitizeForJS(delegatesTo)}\`
`
    : ''
}

## Examples

\`\`\`bash
${examplesMarkdown || `/${name}`}
\`\`\`

${
  relatedCommands.length > 0
    ? `## Related Commands

${relatedMarkdown}
`
    : ''
}

---
*Created by gtask create-command - ${new Date().toISOString()}*
`;
}
