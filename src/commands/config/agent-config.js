/**
 * Agent-Only Mode Configuration
 *
 * Create Agent-Only mode launcher scripts and policy files.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { showHeader, showSuccess } from '../../cli/menu.js';

/**
 * Create Agent-Only mode launcher scripts
 */
export async function createAgentOnlyLauncher() {
  showHeader('Agent-Only Launcher');

  console.log(chalk.dim('Creates launcher scripts for Agent-Only execution mode.'));
  console.log(chalk.dim('In this mode, Claude delegates all work to agents via Task tool.\n'));

  const { createPolicy } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createPolicy',
      message: 'Create AGENT_ONLY_POLICY.md?',
      default: true,
    },
  ]);

  const { createAgents } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createAgents',
      message: 'Create agents.json with custom agent definitions?',
      default: true,
    },
  ]);

  const { platform } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'platform',
      message: 'Create launchers for:',
      choices: [
        { name: 'Windows (.bat + .ps1)', value: 'windows', checked: process.platform === 'win32' },
        { name: 'Mac/Linux (.sh)', value: 'unix', checked: process.platform !== 'win32' },
      ],
    },
  ]);

  const spinner = ora('Creating launcher files...').start();
  const files = [];

  // Create .claude directory if needed
  const claudeDir = join(process.cwd(), '.claude');
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  // 1. Create AGENT_ONLY_POLICY.md
  if (createPolicy) {
    const policyContent = generateAgentOnlyPolicy();
    const policyPath = join(claudeDir, 'AGENT_ONLY_POLICY.md');
    writeFileSync(policyPath, policyContent, 'utf8');
    files.push(policyPath);
  }

  // 2. Create agents.json
  if (createAgents) {
    const agentsContent = generateAgentsJson();
    const agentsPath = join(claudeDir, 'agents.json');
    writeFileSync(agentsPath, agentsContent, 'utf8');
    files.push(agentsPath);
  }

  // 3. Create Windows launchers
  if (platform.includes('windows')) {
    const batContent = generateWindowsBatch();
    const batPath = join(process.cwd(), 'start-agent-only.bat');
    writeFileSync(batPath, batContent, 'utf8');
    files.push(batPath);

    const ps1Content = generatePowerShellLauncher();
    const ps1Path = join(process.cwd(), 'claude-agent-only.ps1');
    writeFileSync(ps1Path, ps1Content, 'utf8');
    files.push(ps1Path);
  }

  // 4. Create Unix launcher
  if (platform.includes('unix')) {
    const shContent = generateBashLauncher();
    const shPath = join(process.cwd(), 'claude-agent-only.sh');
    writeFileSync(shPath, shContent, { encoding: 'utf8', mode: 0o755 });
    files.push(shPath);
  }

  spinner.succeed('Launcher files created');

  showSuccess('Agent-Only Launcher Created', [
    ...files.map((f) => f.replace(process.cwd(), '.')),
    '',
    'Usage:',
    platform.includes('windows') ? '  start-agent-only.bat' : '',
    platform.includes('unix') ? '  ./claude-agent-only.sh' : '',
  ].filter(Boolean));

  return { files };
}

/**
 * Generate AGENT_ONLY_POLICY.md content
 */
export function generateAgentOnlyPolicy() {
  return `# Agent Only Execution Policy (STRICT)

**ENFORCEMENT LEVEL: MANDATORY**

All substantive work (implementation, analysis, writing) MUST be delegated to agents via the Task tool.

---

## DEFAULT BEHAVIOR: Delegate via Task Tool

**Agents are the DEFAULT. Direct tools are the EXCEPTION.**

ALL substantive work MUST use Task tool with appropriate agent:
- Investigation/Analysis → \`Task(subagent_type="Explore")\`
- Implementation → \`Task(subagent_type="general-purpose")\` or custom agent
- Multi-step tasks → Task with specialist agent
- Code review/debugging → Task with appropriate agent

---

## Permitted Direct Tools (STRICTLY LIMITED)

| Tool | Call Limit | Permitted Purpose |
|------|------------|-------------------|
| **Read** | 2 calls max | Verify agent output, check single file |
| **Glob** | 2 calls max | Quick path existence check |
| **Grep** | 2 calls max | Single pattern search |
| **TodoWrite** | Unlimited | Task tracking and planning |
| **AskUserQuestion** | Unlimited | Clarifying with user |
| **Task** | Unlimited | Agent dispatch (REQUIRED) |

### FORBIDDEN Direct Tools

| Tool | Status | Alternative |
|------|--------|-------------|
| **Bash** | FORBIDDEN | Delegate to \`general-purpose\` or \`Explore\` agent |
| **Write** | FORBIDDEN | Delegate to appropriate agent |
| **Edit** | FORBIDDEN | Delegate to appropriate agent |
| **WebFetch** | FORBIDDEN | Delegate to agent |
| **WebSearch** | FORBIDDEN | Delegate to agent |

---

## Immediate Delegation Triggers

When user asks to do ANY of the following, spawn an agent IMMEDIATELY as your FIRST action:

| Trigger Word | Agent to Use |
|--------------|--------------|
| review | \`Explore\` |
| analyze | \`Explore\` |
| investigate | \`Explore\` |
| fix | \`general-purpose\` |
| implement | \`general-purpose\` |
| debug | \`general-purpose\` |
| research | \`Explore\` |
| find | \`Explore\` |

**Do NOT make direct tool calls first. Delegate IMMEDIATELY.**

---

## Violation Detection & Self-Correction

### You Are Violating This Policy If:

1. You make 3+ direct Read/Glob/Grep calls without delegating
2. You use Bash directly for ANY reason
3. You analyze code across multiple files without spawning an agent
4. You perform git operations directly instead of via agent
5. You investigate/debug without first spawning an agent

### Self-Correction Protocol:

If you catch yourself making too many direct calls:

\`\`\`
STOP - Policy violation detected
Delegating remaining work to agent...
→ Task(subagent_type="Explore", prompt="Continue investigation of...")
\`\`\`

---

## Agent Dispatch Protocol

Use Claude Code's Task tool to dispatch work:

\`\`\`
Task(
  subagent_type="<agent-type>",
  prompt="<detailed task description>",
  description="<3-5 word summary>"
)
\`\`\`

### Built-in Agent Types (ALWAYS AVAILABLE)

| Agent | Use For |
|-------|---------|
| \`general-purpose\` | Implementation, debugging, multi-step tasks |
| \`Explore\` | File search, codebase exploration, pattern finding |
| \`Plan\` | Architecture planning, implementation strategy |

---

*Generated by gtask claude-settings - ${new Date().toISOString()}*
`;
}

/**
 * Generate agents.json content
 */
export function generateAgentsJson() {
  const agents = {
    version: '1.0',
    agents: [
      {
        name: 'frontend_dev',
        scope: 'React, TypeScript, UI components, styling',
        when_to_use: 'Frontend implementation, component creation, UI fixes',
        when_not_to_use: 'Backend work, database operations',
        output_contract: {
          required_fields: ['files_modified', 'components_affected'],
          format: 'Concise summary with code snippets',
        },
      },
      {
        name: 'backend_dev',
        scope: 'API endpoints, Python services, database queries',
        when_to_use: 'Backend implementation, API creation, service logic',
        when_not_to_use: 'UI work, frontend components',
        output_contract: {
          required_fields: ['endpoints_modified', 'services_affected'],
          format: 'Concise summary with code snippets',
        },
      },
      {
        name: 'test_review',
        scope: 'Testing, code review, quality assurance',
        when_to_use: 'Writing tests, reviewing code, finding bugs',
        when_not_to_use: 'Feature implementation',
        output_contract: {
          required_fields: ['tests_added', 'issues_found'],
          format: 'Test results and recommendations',
        },
      },
      {
        name: 'docs_writer',
        scope: 'Documentation, README files, API docs',
        when_to_use: 'Writing documentation, updating README, API docs',
        when_not_to_use: 'Code implementation',
        output_contract: {
          required_fields: ['files_updated'],
          format: 'Documentation content',
        },
      },
    ],
  };

  return JSON.stringify(agents, null, 2);
}

/**
 * Generate Windows batch launcher
 */
export function generateWindowsBatch() {
  return `@echo off
REM ============================================================
REM Claude Agent-Only Mode Launcher (Windows Batch)
REM ============================================================
REM
REM This batch file launches the PowerShell script that starts
REM Claude in Agent-Only execution mode with policy enforcement
REM via --append-system-prompt.
REM
REM Usage:
REM   - Double-click this file to start Claude in Agent-Only mode
REM   - Or run from command line: start-agent-only.bat
REM   - With arguments: start-agent-only.bat --permission-mode acceptEdits
REM
REM Generated by: gtask claude-settings
REM ============================================================

setlocal

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%claude-agent-only.ps1"

REM Check if PowerShell script exists
if not exist "%PS_SCRIPT%" (
    echo ERROR: PowerShell script not found!
    echo Expected: %PS_SCRIPT%
    echo.
    echo Please ensure claude-agent-only.ps1 exists in the same directory.
    pause
    exit /b 1
)

REM Execute PowerShell script with execution policy bypass
echo Starting Claude in Agent-Only mode...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*

REM Capture exit code from PowerShell
set EXIT_CODE=%ERRORLEVEL%

REM Exit with the same code
exit /b %EXIT_CODE%
`;
}

/**
 * Generate PowerShell launcher
 */
export function generatePowerShellLauncher() {
  return `<#
.SYNOPSIS
    Launches Claude in Agent-Only Execution Mode

.DESCRIPTION
    This script loads the agent definitions and policy file, then launches
    Claude with the agent-only execution policy appended to the system prompt.

.PARAMETER Args
    Additional arguments to pass to the claude CLI

.EXAMPLE
    .\\claude-agent-only.ps1
    .\\claude-agent-only.ps1 --permission-mode acceptEdits

Generated by: gtask claude-settings
#>

param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$RemainingArgs
)

$ErrorActionPreference = "Stop"

# Define paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClaudeDir = Join-Path $ScriptDir ".claude"
$PolicyFile = Join-Path $ClaudeDir "AGENT_ONLY_POLICY.md"
$AgentsFile = Join-Path $ClaudeDir "agents.json"

# Banner
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   CLAUDE - AGENT-ONLY EXECUTION MODE (STRICT)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Validate required files exist
if (-not (Test-Path $PolicyFile)) {
    Write-Host "ERROR: Policy file not found!" -ForegroundColor Red
    Write-Host "Expected: $PolicyFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run 'gtask claude-settings' to create it." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $AgentsFile)) {
    Write-Host "WARNING: Agents file not found." -ForegroundColor Yellow
    Write-Host "Using built-in agents only." -ForegroundColor Yellow
} else {
    try {
        $AgentsContent = Get-Content $AgentsFile -Raw | ConvertFrom-Json
        $AgentCount = $AgentsContent.agents.Count
        Write-Host "Loaded $AgentCount custom agents from agents.json" -ForegroundColor Green
    } catch {
        Write-Host "WARNING: agents.json is not valid JSON" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Direct tools: Read/Glob/Grep (2 max) | FORBIDDEN: Bash/Write/Edit" -ForegroundColor Yellow
Write-Host ""

# Read policy content
$PolicyContent = Get-Content $PolicyFile -Raw

# Build the append system prompt
$AppendPrompt = @"

======================================================================
AGENT-ONLY EXECUTION MODE ACTIVE
======================================================================

$PolicyContent
"@

# Build claude command arguments
$ClaudeArgs = @(
    "--append-system-prompt"
    $AppendPrompt
)

# Add any remaining arguments passed to this script
if ($RemainingArgs) {
    $ClaudeArgs += $RemainingArgs
}

Write-Host "Starting Claude in Agent-Only mode..." -ForegroundColor Green
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Execute claude
& claude @ClaudeArgs
exit $LASTEXITCODE
`;
}

/**
 * Generate Bash launcher
 */
export function generateBashLauncher() {
  return `#!/bin/bash
# ============================================================
# Claude Agent-Only Mode Launcher (Mac/Linux)
# ============================================================
#
# This script launches Claude in Agent-Only execution mode
# with policy enforcement via --append-system-prompt.
#
# Usage:
#   ./claude-agent-only.sh
#   ./claude-agent-only.sh --permission-mode acceptEdits
#
# Generated by: gtask claude-settings
# ============================================================

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$SCRIPT_DIR/.claude"
POLICY_FILE="$CLAUDE_DIR/AGENT_ONLY_POLICY.md"
AGENTS_FILE="$CLAUDE_DIR/agents.json"

# Banner
echo ""
echo "================================================"
echo "   CLAUDE - AGENT-ONLY EXECUTION MODE (STRICT)"
echo "================================================"
echo ""

# Validate required files exist
if [ ! -f "$POLICY_FILE" ]; then
    echo "ERROR: Policy file not found!"
    echo "Expected: $POLICY_FILE"
    echo ""
    echo "Run 'gtask claude-settings' to create it."
    exit 1
fi

if [ -f "$AGENTS_FILE" ]; then
    AGENT_COUNT=$(jq '.agents | length' "$AGENTS_FILE" 2>/dev/null || echo "0")
    echo "Loaded $AGENT_COUNT custom agents from agents.json"
else
    echo "WARNING: Agents file not found. Using built-in agents only."
fi

echo ""
echo "Direct tools: Read/Glob/Grep (2 max) | FORBIDDEN: Bash/Write/Edit"
echo ""

# Read policy content
POLICY_CONTENT=$(cat "$POLICY_FILE")

# Build the append system prompt
APPEND_PROMPT="
======================================================================
AGENT-ONLY EXECUTION MODE ACTIVE
======================================================================

$POLICY_CONTENT
"

echo "Starting Claude in Agent-Only mode..."
echo ""
echo "================================================"
echo ""

# Execute claude with appended prompt
claude --append-system-prompt "$APPEND_PROMPT" "$@"
`;
}
