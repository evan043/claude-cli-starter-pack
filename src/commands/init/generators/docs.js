/**
 * Documentation Generators
 *
 * Generate INDEX.md and README.md files for .claude/ directory.
 */

import { getVersion } from '../../../utils.js';
import { AVAILABLE_COMMANDS } from '../features.js';

/**
 * Generate INDEX.md file
 */
export function generateIndexFile(commands, projectName) {
  const date = new Date().toISOString().split('T')[0];

  let content = `# ${projectName} - Slash Commands

> Installed by Claude CLI Advanced Starter Pack v${getVersion()} on ${date}

## Quick Start

Type \`/menu\` to open the interactive project menu.

## Available Commands

| Command | Description |
|---------|-------------|
`;

  for (const cmdName of commands) {
    const cmd = AVAILABLE_COMMANDS.find((c) => c.name === cmdName);
    if (cmd) {
      content += `| \`/${cmdName}\` | ${cmd.description} |\n`;
    }
  }

  content += `
## Project Structure

\`\`\`
.claude/
├── commands/     # Slash commands (you are here)
├── agents/       # Custom agents
├── skills/       # Skill packages
├── hooks/        # Enforcement hooks
├── docs/         # Documentation
├── settings.json
└── settings.local.json
\`\`\`

## Reinstall/Update

\`\`\`bash
npx claude-cli-advanced-starter-pack init --force
\`\`\`

## Learn More

- [Claude CLI Advanced Starter Pack on npm](https://www.npmjs.com/package/claude-cli-advanced-starter-pack)
- [GitHub Repository](https://github.com/evan043/claude-cli-advanced-starter-pack)
`;

  return content;
}

/**
 * Generate README.md file
 */
export function generateReadmeFile(commands, projectName) {
  const categories = {};

  for (const cmdName of commands) {
    const cmd = AVAILABLE_COMMANDS.find((c) => c.name === cmdName);
    if (cmd) {
      if (!categories[cmd.category]) {
        categories[cmd.category] = [];
      }
      categories[cmd.category].push(cmd);
    }
  }

  let content = `# ${projectName} - Slash Commands

This folder contains Claude Code CLI slash commands installed by Claude CLI Advanced Starter Pack.

## Interactive Menu

Type \`/menu\` to access the interactive ASCII menu with quick access to all commands.

## Commands by Category

`;

  for (const [category, cmds] of Object.entries(categories)) {
    content += `### ${category}\n\n`;
    for (const cmd of cmds) {
      content += `- **/${cmd.name}** - ${cmd.description}\n`;
    }
    content += '\n';
  }

  content += `## How Commands Work

Each \`.md\` file in this directory is a slash command. When you type \`/command-name\` in Claude Code CLI, Claude reads the corresponding \`.md\` file and follows the instructions.

### Command Structure

\`\`\`markdown
---
description: Brief description shown in command list
options:
  - label: "Option 1"
    description: "What this option does"
---

# Command Title

Instructions for Claude to follow when this command is invoked.
\`\`\`

## Creating Custom Commands

1. Create a new \`.md\` file in this directory
2. Add YAML frontmatter with description
3. Write instructions for Claude to follow
4. The command name is the filename (without .md)

## Reinstalling

To reinstall or update commands:

\`\`\`bash
npx claude-cli-advanced-starter-pack init --force
\`\`\`
`;

  return content;
}
