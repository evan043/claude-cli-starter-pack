/**
 * Starter Scaffold Generators
 *
 * Generate starter files for agents, skills, and other custom components.
 */

/**
 * Generate starter agent file
 */
export function generateStarterAgent(agentName) {
  return `---
description: ${agentName} agent - Add your description here
tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# ${agentName} Agent

## Purpose

Describe what this agent does and when to use it.

## Capabilities

- List the agent's primary capabilities
- What tasks it can handle
- What domains it specializes in

## Usage

Invoke this agent with the Task tool:

\`\`\`
Task: "${agentName}"
Prompt: "Your task description here"
\`\`\`

## Instructions

When this agent is invoked:

1. Understand the task context
2. Use available tools to gather information
3. Execute the required actions
4. Report results clearly
`;
}

/**
 * Generate starter skill file
 */
export function generateStarterSkill(skillName) {
  return `---
description: ${skillName} skill - Add your description here
---

# ${skillName} Skill

## Overview

Describe what this skill provides and when to use it.

## Context

This skill has access to supporting documentation in the \`context/\` folder.

## Workflows

Step-by-step procedures are available in the \`workflows/\` folder.

## Usage

Invoke this skill by typing \`/${skillName}\` or referencing it with the Skill tool.

## Instructions

When this skill is invoked:

1. Load relevant context from the context folder
2. Follow applicable workflows
3. Apply domain expertise
4. Provide clear, actionable guidance
`;
}
