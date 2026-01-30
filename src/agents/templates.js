/**
 * Agent Creation Templates
 *
 * Base templates for creating Claude Code components:
 * - Individual agents
 * - Hooks (PreToolUse, UserPromptSubmit, etc.)
 * - Slash commands
 * - Skills with RAG
 */

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
  const toolsList = toolsArray.map((t) => `'${t}'`).join(', ');

  return `#!/usr/bin/env node
/**
 * ${name}
 *
 * Event: ${eventType} (${toolsArray.join('|')})
 * Purpose: ${description}
 *
 * Created by: gtask create-hook
 * Date: ${new Date().toISOString()}
 */

const hookInput = JSON.parse(process.env.CLAUDE_HOOK_INPUT || '{}');

// Configuration
const CONFIG = {
  targetPatterns: [${targetPatterns.map((p) => `'${p}'`).join(', ')}],
  blockedPatterns: [${blockedPatterns.map((p) => `'${p}'`).join(', ')}],
  warningPatterns: [${warningPatterns.map((p) => `'${p}'`).join(', ')}]
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
        reason: '${blockReason}',
        systemMessage: \`
## ${name} - Violation Detected

**Blocked patterns found:** \${blocked.join(', ')}

**Why this was blocked:**
${blockReason}

${referenceDoc ? `**Reference:** \`${referenceDoc}\`` : ''}

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
## ${name} - Warning

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

  const relatedMarkdown = relatedCommands.map((cmd) => `- \`/${cmd}\``).join('\n');

  return `---
description: ${description}
type: project
complexity: ${complexity}
---

# /${name}

${description}

## Usage

\`\`\`bash
/${name}${args ? ` ${args}` : ''}
\`\`\`

## Instructions

When this command is invoked:

${stepsMarkdown || `### Step 1: Execute

Follow the instructions for this command.
`}

${
  delegatesTo
    ? `## Delegates To

This command uses: \`${delegatesTo}\`
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

/**
 * Individual agent template
 */
export function generateAgentTemplate(config) {
  const {
    name,
    description,
    level = 'L2',
    tools = ['Read', 'Grep', 'Glob'],
    model = 'sonnet',
    specialization = '',
    whenToUse = [],
    workflow = [],
    outputFormat = '',
  } = config;

  const toolsList = Array.isArray(tools) ? tools.join(', ') : tools;
  const whenToUseMarkdown = whenToUse.map((item) => `- ${item}`).join('\n');
  const workflowMarkdown = workflow
    .map(
      (step, i) => `### Step ${i + 1}: ${step.title}

${step.instructions}
`
    )
    .join('\n');

  return `---
name: ${name}
description: ${description}
level: ${level}
tools: ${toolsList}
model: ${model}
---

# ${name}

${description}

## Specialization

${specialization || 'General-purpose agent for delegated tasks.'}

## When to Use

${whenToUseMarkdown || '- When you need specialized assistance with this domain'}

## Workflow

${workflowMarkdown || `### Step 1: Analyze

Analyze the request and gather context.

### Step 2: Execute

Perform the requested task.

### Step 3: Report

Provide a summary of findings/actions.
`}

## Output Format

${
  outputFormat ||
  `Provide a concise summary with:
- Key findings
- Actions taken
- Recommendations (if applicable)`
}

## Response Limits

${
  level === 'L3'
    ? '- Maximum 500 tokens (worker-level response)'
    : level === 'L2'
    ? '- Maximum 8,000 tokens (specialist-level response)'
    : '- Comprehensive orchestration response'
}

---
*Created by gtask create-agent - ${new Date().toISOString()}*
`;
}

/**
 * Skill template with RAG structure
 */
export function generateSkillTemplate(config) {
  const {
    name,
    description,
    triggers = [],
    knowledgeAreas = [],
    workflows = [],
    hooks = [],
  } = config;

  const triggersMarkdown = triggers.map((t) => `- \`${t}\``).join('\n');
  const knowledgeMarkdown = knowledgeAreas.map((k) => `- ${k}`).join('\n');
  const workflowsMarkdown = workflows
    .map(
      (w) => `### ${w.name}

**File:** \`workflows/${w.file}\`

${w.description}
`
    )
    .join('\n');
  const hooksMarkdown = hooks.map((h) => `- \`${h}\``).join('\n');

  return `---
name: ${name}
description: ${description}
version: 1.0.0
---

# ${name} Skill

${description}

## Triggers

This skill activates on:

${triggersMarkdown || '- Direct invocation via `skill: "${name}"`'}

## Knowledge Base

### Areas of Expertise

${knowledgeMarkdown || '- Domain-specific knowledge'}

### Context Files

\`\`\`
.claude/skills/${name}/
├── SKILL.md           # This file
├── context/           # Knowledge base
│   ├── README.md      # Context overview
│   └── patterns/      # Common patterns
└── workflows/         # Agent workflows
    └── README.md      # Workflow index
\`\`\`

## Workflows

${workflowsMarkdown || 'No workflows defined yet.'}

## Hooks

${hooksMarkdown || 'No enforcement hooks defined.'}

## Usage

\`\`\`markdown
skill: "${name}"

[Your request here]
\`\`\`

## Validation Checklist

Before completing any task:

- [ ] Followed established patterns
- [ ] Verified against knowledge base
- [ ] Tested output if applicable

---
*Created by gtask create-skill - ${new Date().toISOString()}*
`;
}

/**
 * Skill context README template
 */
export function generateSkillContextReadme(config) {
  const { name, description, knowledgeAreas = [] } = config;

  return `# ${name} - Context

This directory contains the knowledge base for the ${name} skill.

## Contents

- **patterns/** - Common patterns and best practices
- **examples/** - Reference implementations
- **rag/** - RAG retrieval data (if applicable)

## Knowledge Areas

${knowledgeAreas.map((k) => `- ${k}`).join('\n') || '- General domain knowledge'}

## Adding Context

1. Add markdown files to this directory
2. Reference them in the skill's workflows
3. Update this README

---
*Part of ${name} skill*
`;
}

/**
 * Skill workflows README template
 */
export function generateSkillWorkflowsReadme(config) {
  const { name, workflows = [] } = config;

  const workflowTable = workflows.length
    ? workflows.map((w) => `| ${w.name} | ${w.file} | ${w.description} |`).join('\n')
    : '| (none) | - | No workflows defined |';

  return `# ${name} - Workflows

Agent workflows for the ${name} skill.

## Available Workflows

| Name | File | Description |
|------|------|-------------|
${workflowTable}

## Creating Workflows

1. Create a new \`.md\` file in this directory
2. Use the agent template format
3. Reference context from \`../context/\`

---
*Part of ${name} skill*
`;
}

/**
 * L1 Orchestrator template for RAG pipeline
 */
export function generateOrchestratorTemplate(config) {
  const { name, description, specialists = [], tokenLimits = {} } = config;

  const specialistsMarkdown = specialists
    .map(
      (s) => `### ${s.name}

**File:** \`${s.file}\`
**Level:** ${s.level || 'L2'}

${s.description}
`
    )
    .join('\n');

  return `---
name: ${name}-orchestrator
description: L1 Orchestrator for ${description}
level: L1
tools: Task, Read, Grep, Glob
model: sonnet
capabilities:
  - token_monitoring
  - context_compaction
  - state_persistence
  - auto_respawn
---

# ${name} - L1 Orchestrator

Central orchestrator for ${description}.

## Role

This orchestrator:
1. Routes requests to appropriate L2 specialists
2. Monitors token usage and triggers compaction
3. Aggregates results from specialists
4. Maintains session state

## Token Management

| Threshold | Action |
|-----------|--------|
| 75% | Compact context (summarize and archive) |
| 90% | Spawn continuation agent |
| 95% | Force compaction + respawn |

**Limits:**
- Compact threshold: ${tokenLimits.compact || 75}%
- Respawn threshold: ${tokenLimits.respawn || 90}%

## L2 Specialists

${specialistsMarkdown || 'No specialists defined.'}

## Workflow

### Phase 1: Analyze Request

1. Parse incoming request
2. Identify required specialists
3. Check token budget

### Phase 2: Delegate

1. Spawn appropriate L2 specialists
2. Pass context and instructions
3. Monitor progress

### Phase 3: Aggregate

1. Collect specialist results
2. Synthesize findings
3. Prepare final output

### Phase 4: Report

1. Present aggregated results
2. Update state if needed
3. Suggest next steps

## State Persistence

Session state saved to:
\`.claude/sessions/${name}-{session-id}.json\`

## Continuation Protocol

When respawning:
1. Save current state
2. Generate continuation prompt
3. Spawn new orchestrator instance
4. Resume from saved state

---
*Created by gtask create-agent - ${new Date().toISOString()}*
`;
}

/**
 * Event types for hooks
 */
export const HOOK_EVENT_TYPES = {
  PreToolUse: {
    name: 'PreToolUse',
    description: 'Triggers before a tool is executed (can block)',
    canBlock: true,
    useCase: 'Enforce patterns, validate inputs, prevent operations',
  },
  PostToolUse: {
    name: 'PostToolUse',
    description: 'Triggers after a tool completes (cannot block)',
    canBlock: false,
    useCase: 'Log operations, verify results, cleanup',
  },
  UserPromptSubmit: {
    name: 'UserPromptSubmit',
    description: 'Triggers when user sends a message (cannot block)',
    canBlock: false,
    useCase: 'Inject context, modify prompts, trigger workflows',
  },
  SessionStart: {
    name: 'SessionStart',
    description: 'Triggers when a session begins',
    canBlock: false,
    useCase: 'Initialize state, load context, set up environment',
  },
  SessionStop: {
    name: 'SessionStop',
    description: 'Triggers when a session ends',
    canBlock: false,
    useCase: 'Save state, cleanup, generate reports',
  },
};

/**
 * Available tools for hooks
 */
export const HOOK_TOOLS = [
  'Edit',
  'Write',
  'Read',
  'Bash',
  'Grep',
  'Glob',
  'Task',
  'WebFetch',
  'WebSearch',
];

/**
 * Complexity levels
 */
export const COMPLEXITY_LEVELS = {
  low: {
    name: 'Low',
    description: 'Simple, quick tasks',
    duration: '< 5 minutes',
  },
  medium: {
    name: 'Medium',
    description: 'Multi-step tasks',
    duration: '5-20 minutes',
  },
  high: {
    name: 'High',
    description: 'Complex, multi-agent tasks',
    duration: '20-60+ minutes',
  },
};

/**
 * Agent levels
 */
export const AGENT_LEVELS = {
  L1: {
    name: 'L1 - Orchestrator',
    description: 'Routes and coordinates L2 specialists',
    tokenLimit: 'Full context',
    model: 'sonnet or opus',
  },
  L2: {
    name: 'L2 - Specialist',
    description: 'Deep domain expertise',
    tokenLimit: '1-8K tokens',
    model: 'sonnet',
  },
  L3: {
    name: 'L3 - Worker',
    description: 'Parallel atomic tasks',
    tokenLimit: '500 tokens',
    model: 'haiku',
  },
};
