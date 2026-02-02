# Contributing to CCASP

Thank you for your interest in contributing to Claude CLI Advanced Starter Pack! This guide covers everything you need to know to contribute effectively.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Creating Components](#creating-components)
  - [Slash Commands](#slash-commands)
  - [Hooks](#hooks)
  - [Agents](#agents)
  - [Skills](#skills)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/). Be respectful, inclusive, and constructive in all interactions.

---

## Getting Started

### Prerequisites

- **Node.js 18+** — Required runtime
- **GitHub CLI (`gh`)** — v2.40+ for GitHub integration features
- **Claude Code CLI** — For testing slash commands and hooks

### Local Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/claude-cli-advanced-starter-pack.git
cd claude-cli-advanced-starter-pack

# Install dependencies
npm install

# Verify installation
npm run lint
npm test

# Link for local development
npm link
```

### Testing Your Changes

```bash
# Test CLI commands
ccasp --help
ccasp detect-stack
ccasp wizard

# Test slash commands (requires Claude Code CLI)
# Deploy to a test project, then run commands in Claude Code
ccasp init --path ./test-project
```

---

## Development Workflow

### Branch Naming

```
feature/short-description    # New features
fix/issue-number-description # Bug fixes
docs/what-changed           # Documentation only
refactor/component-name     # Code refactoring
```

### Commit Messages

Follow conventional commits:

```
feat: add new deployment hook
fix: resolve tech stack detection for Bun projects
docs: update slash command reference
refactor: simplify template engine logic
```

---

## Project Structure

```
bin/
├── gtask.js              # CLI entry point (Commander.js)
└── postinstall.js        # npm install welcome message

src/
├── commands/             # Terminal command implementations
│   ├── init.js          # Deploy to project
│   ├── detect-tech-stack.js  # File-based detection (core engine)
│   ├── setup-wizard.js  # Interactive setup
│   └── ...
├── cli/
│   └── menu.js          # ASCII menu system
├── github/
│   └── client.js        # GitHub API wrapper
├── utils/
│   └── template-engine.js  # Handlebars-style placeholders
└── index.js             # Main exports

templates/
├── commands/            # Slash command templates (.template.md)
└── hooks/               # Hook templates (.template.js)
```

### Two-Phase Architecture

1. **Terminal phase** (no AI): File reading, detection, scaffolding
2. **Claude Code phase** (AI-powered): Slash commands, agent orchestration

---

## Creating Components

### Slash Commands

Location: `templates/commands/*.template.md`

```markdown
# /your-command

Brief description of what this command does.

## Usage

```
/your-command [options]
```

## Instructions

<instructions>
1. Step-by-step instructions for Claude
2. Reference {{tech-stack.frontend.framework}} for detected values
3. Use conditional blocks for stack-specific behavior
</instructions>

## Examples

- `/your-command --dry-run`
- `/your-command path/to/file`
```

**Template Variables:**

```handlebars
{{tech-stack.frontend.framework}}     # Detected framework
{{tech-stack.backend.framework}}      # Backend framework
{{#if deployment.backend.platform}}   # Conditional blocks
${CWD}                                # Current working directory
```

### Hooks

Location: `templates/hooks/*.template.js`

```javascript
// Hook: your-hook-name
// Description: What this hook enforces
// Event: PreToolUse | PostToolUse | Notification

export default {
  name: 'your-hook-name',
  description: 'Enforces X before Y happens',

  // Match specific tools or patterns
  match: {
    tool: 'Bash',        // or 'Edit', 'Write', 'Task', etc.
    command: /npm test/  // Optional regex for Bash commands
  },

  // Return { allow: true/false, message: string }
  async handler(context) {
    const { tool, input, conversation } = context;

    // Your enforcement logic
    if (someCondition) {
      return { allow: false, message: 'Blocked: reason' };
    }

    return { allow: true };
  }
};
```

**Hook Events:**

| Event | Trigger |
|-------|---------|
| `PreToolUse` | Before a tool executes |
| `PostToolUse` | After a tool completes |
| `Notification` | Async notifications |

### Agents

Location: `templates/agents/` or generated via `ccasp create-agent`

**Agent Hierarchy:**

```
L1 Orchestrator — Main conversation, delegates to specialists
L2 Specialist   — Domain expert (frontend, backend, testing)
L3 Worker       — Focused tasks (search, analyze, generate)
```

**Agent Template Structure:**

```markdown
# Agent: frontend-specialist

## Role
React/TypeScript frontend specialist for {{project-name}}.

## Capabilities
- Component architecture decisions
- State management ({{tech-stack.frontend.stateManagement}})
- Styling with {{tech-stack.frontend.styling}}

## Tools Available
- Read, Glob, Grep for exploration
- Edit, Write for modifications
- Bash for npm/build commands

## Constraints
- Never modify backend code directly
- Delegate database queries to backend-specialist
- Report completion via structured output
```

### Skills

Location: `templates/skills/` or generated via `ccasp create-skill`

Skills are RAG-enhanced packages with domain knowledge:

```
skills/
└── your-skill/
    ├── skill.md         # Main instructions
    ├── knowledge/       # RAG documents
    │   ├── patterns.md
    │   └── examples.md
    └── prompts/         # Reusable prompts
        └── analyze.md
```

---

## Testing

### Running Tests

```bash
# Syntax validation
npm test

# Linting
npm run lint

# Golden master tests (API contracts)
npm run test:golden

# Tech stack detection tests
npm run test:detect
```

### Testing Slash Commands

1. Create a test project directory
2. Run `ccasp init --path ./test-project`
3. Open Claude Code CLI in the test project
4. Execute your slash command and verify behavior

### Testing Hooks

Hooks are tested within Claude Code CLI:

1. Deploy hooks to a test project
2. Trigger the tool/action that should invoke the hook
3. Verify the hook allows/blocks as expected

---

## Pull Request Process

### Before Submitting

1. **Run lint and tests:**
   ```bash
   npm run lint
   npm test
   ```

2. **Update documentation** if adding features

3. **Test in a real project** — deploy and verify in Claude Code

### PR Template

```markdown
## Summary
Brief description of changes.

## Type
- [ ] Feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactor

## Testing
Describe how you tested these changes.

## Checklist
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Tested in Claude Code CLI
- [ ] Documentation updated (if applicable)
```

### Review Process

1. All PRs require at least one review
2. CI must pass (lint + syntax checks)
3. Breaking changes need migration notes in the PR

---

## Style Guide

### JavaScript/ES Modules

- Use ES6 `import`/`export` exclusively
- Prefer `const` over `let`
- Use async/await over raw promises
- Destructure when it improves readability

```javascript
// Good
import { detectStack } from './detect-tech-stack.js';
const { frontend, backend } = await detectStack(projectPath);

// Avoid
const detectStack = require('./detect-tech-stack');
detectStack(projectPath).then(result => { ... });
```

### File Naming

- Commands: `kebab-case.js` (e.g., `create-agent.js`)
- Templates: `kebab-case.template.md` or `.template.js`
- Utilities: `kebab-case.js`

### Template Syntax

Use Handlebars-style for templates:

```handlebars
{{variable}}                          # Simple substitution
{{#if condition}}...{{/if}}           # Conditionals
{{#if (eq var "value")}}...{{/if}}    # Equality check
${CWD}, ${HOME}                       # Environment variables
```

### Documentation

- Use JSDoc for exported functions
- Include usage examples in command help text
- Update README when adding user-facing features

---

## Questions?

- **Issues:** [GitHub Issues](https://github.com/evan043/claude-cli-advanced-starter-pack/issues)
- **Discussions:** [GitHub Discussions](https://github.com/evan043/claude-cli-advanced-starter-pack/discussions)
- **Wiki:** [Project Wiki](https://github.com/evan043/claude-cli-advanced-starter-pack/wiki)

---

Thank you for contributing to CCASP!
