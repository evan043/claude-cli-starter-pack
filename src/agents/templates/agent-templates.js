/**
 * Agent Creation Templates
 *
 * Templates for creating individual agents and orchestrators.
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
 * Individual agent template
 */
export function generateAgentTemplate(config) {
  const {
    name,
    description,
    level = 'L2',
    tools = ['Read', 'Grep', 'Glob'],
    specialization = '',
    whenToUse = [],
    workflow = [],
    outputFormat = '',
  } = config;

  const toolsList = Array.isArray(tools) ? tools.map(t => sanitizeForJS(t)).join(', ') : sanitizeForJS(tools);
  const whenToUseMarkdown = whenToUse.map((item) => `- ${sanitizeForJS(item)}`).join('\n');
  const workflowMarkdown = workflow
    .map(
      (step, i) => `### Step ${i + 1}: ${sanitizeForJS(step.title)}

${sanitizeForJS(step.instructions)}
`
    )
    .join('\n');

  return `---
name: ${sanitizeForJS(name)}
description: ${sanitizeForJS(description)}
level: ${sanitizeForJS(level)}
tools: ${toolsList}
---

# ${sanitizeForJS(name)}

${sanitizeForJS(description)}

## Specialization

${sanitizeForJS(specialization || 'General-purpose agent for delegated tasks.')}

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
 * L1 Orchestrator template for RAG pipeline
 */
export function generateOrchestratorTemplate(config) {
  const { name, description, specialists = [], tokenLimits = {} } = config;

  const specialistsMarkdown = specialists
    .map(
      (s) => `### ${sanitizeForJS(s.name)}

**File:** \`${sanitizeForJS(s.file)}\`
**Level:** ${sanitizeForJS(s.level || 'L2')}

${sanitizeForJS(s.description)}
`
    )
    .join('\n');

  return `---
name: ${sanitizeForJS(name)}-orchestrator
description: L1 Orchestrator for ${sanitizeForJS(description)}
level: L1
tools: Task, Read, Grep, Glob
capabilities:
  - token_monitoring
  - context_compaction
  - state_persistence
  - auto_respawn
---

# ${sanitizeForJS(name)} - L1 Orchestrator

Central orchestrator for ${sanitizeForJS(description)}.

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
\`.claude/sessions/${sanitizeForJS(name)}-{session-id}.json\`

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
