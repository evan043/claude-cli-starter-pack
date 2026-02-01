/**
 * Constants and Banners for Menu System
 */

/**
 * ASCII Art Banner
 */
export const BANNER = `
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║   ╔═╗╦  ╔═╗╦ ╦╔╦╗╔═╗  ╔═╗╔╦╗╦  ╦╔═╗╔╗╔╔═╗╔═╗╔╦╗  ╔═╗╔╦╗╔═╗╦═╗╔╦╗╔═╗╦═╗    ║
║   ║  ║  ╠═╣║ ║ ║║║╣   ╠═╣ ║║╚╗╔╝╠═╣║║║║  ║╣  ║║  ╚═╗ ║ ╠═╣╠╦╝ ║ ║╣ ╠╦╝    ║
║   ╚═╝╩═╝╩ ╩╚═╝═╩╝╚═╝  ╩ ╩═╩╝ ╚╝ ╩ ╩╝╚╝╚═╝╚═╝═╩╝  ╚═╝ ╩ ╩ ╩╩╚═ ╩ ╚═╝╩╚═    ║
║                                                                            ║
║    Advanced Claude Code CLI Toolkit - Agents, MCP, GitHub & More           ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝`;

/**
 * Development Mode Warning Banner
 */
export const DEV_MODE_BANNER = `
╔════════════════════════════════════════════════════════════════════════════╗
║                    ⚠️  DEVELOPMENT MODE ACTIVE ⚠️                           ║
║   Running from local worktree - NOT the npm published version              ║
║   Custom changes will be reverted when you deploy to npm                   ║
╚════════════════════════════════════════════════════════════════════════════╝`;

/**
 * Get the Agent Only Policy content for system prompt injection
 */
export function getAgentOnlyPolicy() {
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
`;
}
