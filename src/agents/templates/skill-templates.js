/**
 * Skill Creation Templates
 *
 * Templates for creating skills with RAG structure.
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

  const triggersMarkdown = triggers.map((t) => `- \`${sanitizeForJS(t)}\``).join('\n');
  const knowledgeMarkdown = knowledgeAreas.map((k) => `- ${sanitizeForJS(k)}`).join('\n');
  const workflowsMarkdown = workflows
    .map(
      (w) => `### ${sanitizeForJS(w.name)}

**File:** \`workflows/${sanitizeForJS(w.file)}\`

${sanitizeForJS(w.description)}
`
    )
    .join('\n');
  const hooksMarkdown = hooks.map((h) => `- \`${sanitizeForJS(h)}\``).join('\n');

  return `---
name: ${sanitizeForJS(name)}
description: ${sanitizeForJS(description)}
version: 1.0.0
---

# ${sanitizeForJS(name)} Skill

${sanitizeForJS(description)}

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
skill: "${sanitizeForJS(name)}"

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

  return `# ${sanitizeForJS(name)} - Context

This directory contains the knowledge base for the ${sanitizeForJS(name)} skill.

## Contents

- **patterns/** - Common patterns and best practices
- **examples/** - Reference implementations
- **rag/** - RAG retrieval data (if applicable)

## Knowledge Areas

${knowledgeAreas.map((k) => `- ${sanitizeForJS(k)}`).join('\n') || '- General domain knowledge'}

## Adding Context

1. Add markdown files to this directory
2. Reference them in the skill's workflows
3. Update this README

---
*Part of ${sanitizeForJS(name)} skill*
`;
}

/**
 * Skill workflows README template
 */
export function generateSkillWorkflowsReadme(config) {
  const { name, workflows = [] } = config;

  const workflowTable = workflows.length
    ? workflows.map((w) => `| ${sanitizeForJS(w.name)} | ${sanitizeForJS(w.file)} | ${sanitizeForJS(w.description)} |`).join('\n')
    : '| (none) | - | No workflows defined |';

  return `# ${sanitizeForJS(name)} - Workflows

Agent workflows for the ${sanitizeForJS(name)} skill.

## Available Workflows

| Name | File | Description |
|------|------|-------------|
${workflowTable}

## Creating Workflows

1. Create a new \`.md\` file in this directory
2. Use the agent template format
3. Reference context from \`../context/\`

---
*Part of ${sanitizeForJS(name)} skill*
`;
}
