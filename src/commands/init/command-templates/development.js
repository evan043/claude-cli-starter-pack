/**
 * Development workflow command templates
 * Commands for agents, hooks, skills, and development planning
 */

export const DEVELOPMENT_TEMPLATES = {
  'phase-dev-plan': () => `---
description: Create phased development plans with 95%+ success probability
options:
  - label: "Small (1-2 phases)"
    description: "Quick feature or bug fix"
  - label: "Medium (3-4 phases)"
    description: "Standard feature implementation"
  - label: "Large (5+ phases)"
    description: "Complex multi-system changes"
---

# Phased Development Plan Generator

Create comprehensive, executable development plans that maximize success probability.

---

## 🚨 MANDATORY FILE CREATION - DO NOT SKIP

**CRITICAL:** Every phase-dev-plan MUST create ALL of these files. Skipping ANY file is a failure.

### Exploration Documentation (REQUIRED FIRST - Step 2)
Before creating PROGRESS.json, you MUST create these 6 files in \`.claude/exploration/{slug}/\`:

| File | Purpose | Required |
|------|---------|----------|
| \`EXPLORATION_SUMMARY.md\` | Overview + statistics | ✅ YES |
| \`CODE_SNIPPETS.md\` | Extracted code examples | ✅ YES |
| \`REFERENCE_FILES.md\` | File paths + line numbers | ✅ YES |
| \`AGENT_DELEGATION.md\` | Agent assignments per task | ✅ YES |
| \`PHASE_BREAKDOWN.md\` | Full phase/task detail | ✅ YES |
| \`findings.json\` | Machine-readable data | ✅ YES |

### Plan Files (AFTER Exploration - Step 3+)
| File | Purpose | Required |
|------|---------|----------|
| \`.claude/docs/{slug}/PROGRESS.json\` | State tracking | ✅ YES |
| \`.claude/docs/{slug}/EXECUTIVE_SUMMARY.md\` | Overview | ✅ YES |
| \`.claude/commands/{slug}-executor.md\` | Phase executor agent | ✅ YES |
| \`.claude/commands/{slug}.md\` | Interactive command | ✅ YES |

---

## Why Phased Development?

- Breaks complex tasks into manageable chunks
- Each phase is independently testable
- Clear checkpoints for progress tracking
- Rollback points if issues arise

## Execution Protocol

### Step 1: Gather Requirements
Use AskUserQuestion to collect:
1. **Project name** (human-readable)
2. **Project slug** (kebab-case)
3. **Description** (what to build)
4. **Scale** (S/M/L)

### Step 2: L2 Exploration (MANDATORY - DO NOT SKIP)

**CRITICAL:** You MUST run L2 exploration BEFORE creating plan files.

1. **Deploy Explore Agent** - Use Task tool with \`subagent_type: "Explore"\` thoroughness "very thorough"
2. **Create Exploration Directory:** \`mkdir -p .claude/exploration/{slug}\`
3. **Write ALL 6 Exploration Files** in \`.claude/exploration/{slug}/\`:
   - EXPLORATION_SUMMARY.md (overview + statistics)
   - CODE_SNIPPETS.md (code examples from codebase)
   - REFERENCE_FILES.md (files to modify/reference)
   - AGENT_DELEGATION.md (agent assignments)
   - PHASE_BREAKDOWN.md (full phase/task detail)
   - findings.json (machine-readable)

4. **Verification Checkpoint** - STOP and verify ALL 6 files exist before continuing

**⛔ DO NOT proceed to Step 3 until ALL 6 exploration files exist.**

### Step 3: Generate Phase Breakdown
Based on exploration findings, create phases with clear objectives, success criteria, and agent assignments.

### Step 4: Create Plan Artifacts
Create \`.claude/docs/{slug}/PROGRESS.json\` and \`EXECUTIVE_SUMMARY.md\`

### Step 5: Create GitHub Issue (MANDATORY)

After creating PROGRESS.json, create a tracked GitHub issue:

1. **Generate issue body** with CCASP-META header:
   \`\`\`markdown
   <!-- CCASP-META
   source: /phase-dev-plan
   slug: {slug}
   progress_file: .claude/docs/{slug}/PROGRESS.json
   issue_type: feature
   created_at: {timestamp}
   -->

   ## {Plan Name}

   {Plan description and overview}

   ---

   ## 📁 Source & Generated Files

   **Created from:** \`/phase-dev-plan\` → Project: \`{slug}\`

   | File | Type | Path |
   |------|------|------|
   | Progress Tracking | JSON | \`.claude/docs/{slug}/PROGRESS.json\` |
   | Executive Summary | MD | \`.claude/docs/{slug}/EXECUTIVE_SUMMARY.md\` |
   | Exploration Summary | MD | \`.claude/exploration/{slug}/EXPLORATION_SUMMARY.md\` |
   | Code Snippets | MD | \`.claude/exploration/{slug}/CODE_SNIPPETS.md\` |
   | Reference Files | MD | \`.claude/exploration/{slug}/REFERENCE_FILES.md\` |
   | Agent Delegation | MD | \`.claude/exploration/{slug}/AGENT_DELEGATION.md\` |
   | Phase Breakdown | MD | \`.claude/exploration/{slug}/PHASE_BREAKDOWN.md\` |
   | Findings | JSON | \`.claude/exploration/{slug}/findings.json\` |

   ---

   ## Implementation Plan

   {Include phases, tasks, and acceptance criteria}
   \`\`\`

2. **Create issue using gh CLI:**
   \`\`\`bash
   gh issue create --title "{Plan Name}" --body "$(cat issue-body.md)" --label "phase-dev-plan"
   \`\`\`

3. **Store issue number in PROGRESS.json:**
   Add \`github_issue\` field with the created issue number

4. **Add to project board** (if configured):
   \`\`\`bash
   gh project item-add <project-number> --owner <owner> --url <issue-url>
   \`\`\`

### Step 6: Generate Executable Commands
Create \`.claude/commands/{slug}-executor.md\` and \`.claude/commands/{slug}.md\`

## Enforcement Rules

| Rule | Mandatory |
|------|-----------|
| L2 Exploration FIRST | ✅ YES |
| All 6 exploration files created | ✅ YES |
| PROGRESS.json after exploration | ✅ YES |
| GitHub issue created with CCASP-META | ✅ YES |
| Issue number stored in PROGRESS.json | ✅ YES |
`,

  'create-agent': () => `---
description: Create Claude Code agents (L1 orchestrators, L2 specialists, L3 workers)
options:
  - label: "L1 Orchestrator"
    description: "High-level task coordinator"
  - label: "L2 Specialist"
    description: "Domain-specific expert"
  - label: "L3 Worker"
    description: "Focused task executor"
---

# Claude Code Agent Creator

Create agents for the Claude Code CLI agent hierarchy.

## Agent Hierarchy

- **L1 Orchestrator** - Coordinates complex multi-step tasks, delegates to specialists
- **L2 Specialist** - Domain expertise (frontend, backend, testing, etc.)
- **L3 Worker** - Single-purpose task execution

## Agent Structure

Agents are created in \`.claude/agents/<agent-name>.md\` with:
- YAML frontmatter (description, tools, model)
- System prompt
- Available tools and capabilities
- Example invocations

## Instructions

When invoked:
1. Ask for agent name and purpose
2. Determine appropriate level (L1/L2/L3)
3. Select relevant tools
4. Generate agent file with proper frontmatter
5. Register in settings.json allowedTools if needed
`,

  'create-hook': () => `---
description: Create enforcement hooks for Claude Code
options:
  - label: "PreToolUse"
    description: "Validate before tool execution"
  - label: "PostToolUse"
    description: "Process after tool completion"
  - label: "UserPromptSubmit"
    description: "Intercept user messages"
---

# Claude Code Hook Creator

Create hooks that enforce patterns, validate inputs, and process outputs.

## Hook Types

- **PreToolUse** - Runs before a tool executes (validation, blocking)
- **PostToolUse** - Runs after tool completes (logging, modification)
- **UserPromptSubmit** - Intercepts user messages (routing, preprocessing)

## Hook Structure

Hooks are created in \`.claude/hooks/\` as JavaScript files:
- Export async function matching event type
- Receive context with tool name, input, user message
- Return continue/block decision

## Instructions

When invoked:
1. Ask for hook purpose and trigger
2. Select event type
3. Define target tools (for PreToolUse/PostToolUse)
4. Generate hook file with proper exports
5. Add to settings.local.json hooks array
`,

  'create-skill': () => `---
description: Create RAG-enhanced skill packages for Claude Code
---

# Claude Code Skill Creator

Create skill packages that combine prompts, context, and workflows.

## Skill Structure

Skills are created in \`.claude/skills/<skill-name>/\` with:
- \`skill.md\` - Main skill definition with YAML frontmatter
- \`context/\` - Supporting documentation and examples
- \`workflows/\` - Step-by-step procedures

## Features

- RAG-enhanced context loading
- Workflow chaining
- Tool specifications
- Model preferences

## Instructions

When invoked:
1. Ask for skill name and purpose
2. Define target domain/functionality
3. Create skill directory structure
4. Generate skill.md with frontmatter
5. Add starter context files
`,

  'rag-pipeline': () => `---
description: Generate RAG pipeline with L1 orchestrator + L2 specialists
options:
  - label: "Full Pipeline"
    description: "L1 + multiple L2 agents"
  - label: "Single Domain"
    description: "L1 + one L2 specialist"
---

# RAG Pipeline Generator

Create a complete Retrieval-Augmented Generation pipeline with agent hierarchy.

## Pipeline Structure

\`\`\`
L1 Orchestrator
├── L2 Research Specialist
├── L2 Implementation Specialist
├── L2 Testing Specialist
└── L2 Documentation Specialist
\`\`\`

## Generated Artifacts

- L1 orchestrator agent definition
- L2 specialist agent definitions
- Routing logic for task delegation
- Context management configuration

## Instructions

When invoked:
1. Ask for pipeline purpose/domain
2. Determine needed specialists
3. Generate L1 orchestrator with routing rules
4. Generate L2 specialists with domain expertise
5. Create coordination hooks if needed
6. Generate invocation command
`,

  'create-task-list': () => `---
description: Create intelligent task list with codebase exploration and GitHub integration
options:
  - label: "New Task List"
    description: "Create fresh task list with exploration"
  - label: "Quick Task List"
    description: "Create task list without exploration"
---

# Intelligent Task List Generator

Create a comprehensive task list with codebase exploration, clarifying questions, and GitHub integration.

## Features

- **Codebase Exploration** - Deploy agents to understand relevant files and patterns
- **Clarifying Questions** - Ask follow-up questions when context is insufficient
- **Testing Options** - Ralph Loop, ngrok/production, Playwright modes
- **GitHub Integration** - Optionally create a tracked GitHub issue for the task
- **Progress Hook** - Auto-update GitHub issue as tasks complete

## Execution Flow

### Step 1: Capture User Prompt

If no arguments provided, ask what the user wants to accomplish.

### Step 2: Context Assessment

Evaluate the prompt for specificity, scope, technical depth, and reproducibility.

**Score Calculation**:
- 70-100%: Sufficient context -> Parallel exploration
- 0-69%: Insufficient context -> Quick scan + clarifying questions

### Step 3: Deploy Exploration Agents

Deploy in parallel:
- **Explore Agent 1**: Find files related to the task
- **Explore Agent 2**: Search for tests and documentation
- **Explore Agent 3** (if backend): Find API endpoints and models

### Step 4: Synthesize and Ask Questions

Present findings and ask mandatory questions:

1. **Testing Approach**: Ralph Loop vs Manual vs Minimal
2. **Playwright Environment**: ngrok vs production vs none
3. **GitHub Integration** (NEW): Create tracked GitHub issue?
4. **Confirm Plan**: Proceed or adjust?

### Step 5: Create Task List

Use TodoWrite to build the task list with:
- Task 0: Persistent context (never marked complete)
- Task 1: Login via Playwright (if E2E testing)
- Tasks 2-N: Implementation tasks
- Final tasks: Verification and commit

### Step 6: Create GitHub Issue (Optional)

If user selected GitHub integration:
1. Create comprehensive issue with codebase analysis
2. Add to project board
3. Install progress hook to auto-update issue

## GitHub Integration Details

When enabled, the command:
1. Creates a GitHub issue with:
   - Problem statement from user prompt
   - Code analysis from exploration
   - Task checklist (matching TodoWrite tasks)
   - Reference documentation links

2. Installs a PostToolUse hook that:
   - Watches for TodoWrite calls
   - Updates GitHub issue progress when tasks complete
   - Adds comments for significant milestones

## Instructions

When invoked:
1. Gather task description (from args or by asking)
2. Assess context quality
3. Deploy exploration agents (parallel if sufficient context)
4. Present findings and ask questions
5. Create task list with TodoWrite
6. Optionally create GitHub issue and install progress hook
7. Begin Task 1
`,
};
