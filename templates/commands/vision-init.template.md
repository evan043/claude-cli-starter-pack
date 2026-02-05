---
description: Initialize a new Vision from natural language prompt - autonomous MVP development
options:
  - label: "Quick Start"
    description: "Provide prompt and let Vision Mode handle everything"
  - label: "Custom"
    description: "Configure analysis depth and execution settings"
---

# Vision Init - Autonomous MVP Development

Transform a natural language prompt into a complete, working MVP through intelligent planning, parallel agent orchestration, and self-correcting execution loops.

**Vision Architecture:**
```
VISION (L0+) → EPIC (L0) → ROADMAP (L1) → PHASE-DEV (L2) → TASKS (L3)
```

**Key Capabilities:**
- Natural language prompt parsing
- Web search for inspiration and tools
- ASCII UI wireframe generation
- Mermaid architecture diagrams
- Hook-based observation and drift detection
- Dynamic agent creation
- Security scanning before installations
- Autonomous MVP iteration until 100% working

---

## Execution Protocol (Phase 7 Orchestrator)

### Step 1: Gather User Input

Use AskUserQuestion to collect:

1. **Natural Language Prompt** (required)
   - What do you want to build?
   - Example: "Build a kanban board with drag-and-drop, real-time collaboration, and mobile support"

2. **Project Title** (optional, will be generated from prompt if not provided)

3. **Priority** (optional, defaults to 'medium')
   - low / medium / high / critical

4. **Tags** (optional, comma-separated)
   - Example: "mvp, saas, real-time"

### Step 2: Initialize Orchestrator

**Use the Phase 7 VisionOrchestrator:**

```javascript
import { createOrchestrator } from '${CWD}/node_modules/claude-cli-advanced-starter-pack/src/vision/index.js';

// Create orchestrator instance
const orchestrator = createOrchestrator(projectRoot, {
  security: {
    enabled: true,
    blockThreshold: 'high'
  },
  analysis: {
    webSearchEnabled: true,
    maxSimilarApps: 5,
    mcpMatchingEnabled: true
  },
  autonomous: {
    enabled: true,
    maxIterations: 100
  }
});

// Initialize vision from prompt
const initResult = await orchestrator.initialize(userPrompt, {
  title: userTitle,
  tags: userTags?.split(',') || [],
  priority: userPriority || 'medium'
});

if (!initResult.success) {
  console.error(`Failed to initialize: ${initResult.error}`);
  return;
}

console.log(`✅ Vision created: ${initResult.vision.slug}`);
```

**Display parsed results to user:**

```
╔═══════════════════════════════════════════════════════════════╗
║  Vision Prompt Analysis                                       ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Intent: {{initResult.intent}}                                ║
║  Complexity: {{initResult.complexity}}                        ║
║  Confidence: 95%                                              ║
║                                                               ║
║  Detected Features:                                           ║
{{#each initResult.features}}
║    • {{this.name || this}}                                    ║
{{/each}}
║                                                               ║
║  Account Requirements Detected:                               ║
{{#each initResult.accountRequirements.accounts}}
║    • {{service}}: {{reason}}                                  ║
{{/each}}
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Continue with this analysis? (yes/no/adjust)
```

### Step 3: Run Analysis Phase

```javascript
// Run analysis (web search, tool discovery, MCP matching)
console.log('📊 Running analysis...');
const analysisResult = await orchestrator.analyze();

if (analysisResult.success) {
  const r = analysisResult.results;
  console.log(`  Similar apps found: ${r.similarApps?.length || 0}`);
  console.log(`  NPM packages suggested: ${r.npmPackages?.length || 0}`);
  console.log(`  MCP servers matched: ${r.mcpServers?.length || 0}`);
}
```

**Analysis results include:**
- Similar apps from web search
- UI patterns and inspiration
- NPM/pip package recommendations
- MCP server matches
- Tool recommendations ranked by relevance

### Step 4: Generate Architecture

```javascript
// Run architecture phase
console.log('🏗️  Generating architecture...');
const archResult = await orchestrator.architect();

if (archResult.success) {
  const a = archResult.artifacts;
  console.log(`  Diagrams generated: ${Object.keys(a.diagrams).length}`);
  console.log(`  Components identified: ${a.componentList?.length || 0}`);
  console.log(`  API contracts: ${a.apiContracts ? 'Yes' : 'No'}`);
}
```

**Architecture artifacts include:**
- Component diagram (Mermaid)
- Data flow diagram (Mermaid)
- Sequence diagrams for key flows
- ASCII wireframes
- Component breakdown
- API contracts (OpenAPI format)
- State design (stores and actions)

### Step 5: Security Scan

```javascript
// Run security scan
console.log('🔒 Running security scan...');
const securityResult = await orchestrator.scanSecurity();

if (securityResult.results?.hasBlockedPackages) {
  console.log(`⚠️  ${securityResult.results.blocked.length} package(s) blocked`);
  // Show blocked packages
  for (const pkg of securityResult.results.blocked) {
    console.log(`  - ${pkg.name}: ${pkg.severity}`);
  }
} else {
  console.log('  ✓ No critical vulnerabilities found');
}
```

**Security scanning uses:**
- npm audit (Node.js packages)
- pip-audit/safety (Python packages)
- OSV Scanner (Google's vulnerability database)

### Step 6: Planning Phase (NEW - CRITICAL)

**This is the critical step that creates the full hierarchy:**

```javascript
// Run planning phase - creates Epic → Roadmaps → Phase-Dev-Plans
console.log('📋 Creating planning hierarchy...');
const planningResult = await orchestrator.plan();

if (planningResult.success) {
  const p = planningResult.result;
  console.log(`  ✓ Epic created: ${p.epic?.slug}`);
  console.log(`  ✓ Roadmaps: ${p.roadmaps?.length || 0}`);
  console.log(`  ✓ Phase-Dev-Plans: ${p.phaseDevPlans?.length || 0}`);
  console.log(`  ✓ GitHub Issues: ${p.githubIssues?.created?.length || 0}`);
}
```

**Planning creates these files:**
```
.claude/epics/{vision-slug}/
└── EPIC.json                    # Epic definition

.claude/roadmaps/{vision-slug}-roadmap-{n}/
├── ROADMAP.json                 # Roadmap with phase_dev_plan_refs[]
└── exploration/
    ├── EXPLORATION_SUMMARY.md
    ├── CODE_SNIPPETS.md
    ├── REFERENCE_FILES.md
    ├── AGENT_DELEGATION.md
    ├── PHASE_BREAKDOWN.md
    └── findings.json

.claude/phase-plans/{vision-slug}-roadmap-{n}-phase-{m}/
└── PROGRESS.json                # Phase-dev-plan progress tracking
```

**GitHub Issues Created (if configured):**
- Epic issue with roadmap checklist
- Roadmap issues linked to Epic
- Phase-dev-plan issues linked to Roadmaps

**Display planning summary:**

```
╔════════════════════════════════════════════════════════════════════╗
║                   PLANNING HIERARCHY CREATED 📋                     ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Epic: {{epic_slug}}                                               ║
║  📁 .claude/epics/{{epic_slug}}/EPIC.json                          ║
║                                                                    ║
║  Roadmaps Created:                                                 ║
{{#each roadmaps}}
║    {{@index}}. {{title}} ({{phase_count}} phases)                  ║
{{/each}}
║                                                                    ║
║  Phase-Dev-Plans Created: {{phase_dev_plan_count}}                 ║
║  GitHub Issues Created: {{github_issue_count}}                     ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

### Step 7: Create Agents

```javascript
// Create specialized agents
const agentsResult = await orchestrator.createAgents();

if (agentsResult.success) {
  console.log(`🤖 Created ${agentsResult.agents.length} agents:`);
  for (const agent of agentsResult.agents) {
    console.log(`  - ${agent.domain}: ${agent.name}`);
  }
}
```

**Agents are created based on detected tech stack:**
- Orchestrator agent (always)
- Frontend agent (React/Vue/Angular/Svelte)
- Backend agent (FastAPI/Express/Django/Flask)
- Testing agent (always)

### Step 8: Session Restart Check

**CRITICAL:** After planning creates hooks and configurations, a session restart may be required.

```javascript
// Check if session restart needed
const sessionCheck = orchestrator.checkSessionRestart();

if (sessionCheck.needsRestart) {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║  ⚠️  SESSION RESTART REQUIRED                                       ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Vision planning is complete, but hooks need to be activated.      ║
║                                                                    ║
║  Please:                                                           ║
║  1. Exit Claude Code (Ctrl+C or /exit)                             ║
║  2. Restart Claude Code CLI                                        ║
║  3. Run: /vision-run ${vision.slug}                                ║
║                                                                    ║
║  This ensures:                                                     ║
║  • Progress sync hooks are active                                  ║
║  • GitHub issue updates work                                       ║
║  • Drift detection is enabled                                      ║
║  • Agent delegation functions properly                             ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
  `);
  return; // Don't auto-execute
}
```

### Step 9: Display Summary

```
╔════════════════════════════════════════════════════════════════════╗
║                   VISION INITIALIZED SUCCESSFULLY! 🚀              ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Vision: {{title}}                                                 ║
║  Slug: {{slug}}                                                    ║
║  Status: {{status}}                                                ║
║  Priority: {{priority}}                                            ║
║                                                                    ║
║  📁 Location: .claude/visions/{{slug}}/VISION.json                 ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  🔍 Analysis Complete                                              ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Similar Apps Found: {{similar_apps_count}}                        ║
║  NPM Packages: {{npm_count}}                                       ║
║  MCP Servers: {{mcp_count}}                                        ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  🏗️ Architecture Generated                                         ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Components: {{component_count}}                                   ║
║  Diagrams: {{diagram_count}}                                       ║
║  API Endpoints: {{api_count}}                                      ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  🛡️ Security Status                                                ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Vulnerabilities: {{vulnerability_count}}                          ║
║  Blocked Packages: {{blocked_count}}                               ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║  📋 Next Steps                                                     ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  1. Review vision status:                                          ║
║     /vision-status {{slug}}                                        ║
║                                                                    ║
║  2. Start autonomous execution:                                    ║
║     /vision-run {{slug}}                                           ║
║                                                                    ║
║  3. Or use CLI:                                                    ║
║     ccasp vision run {{slug}}                                      ║
║                                                                    ║
║  4. Adjust if needed:                                              ║
║     /vision-adjust {{slug}}                                        ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

## Quick Start Mode

For fast initialization with defaults:

```javascript
import { quickRun } from '${CWD}/node_modules/claude-cli-advanced-starter-pack/src/vision/index.js';

// One-liner for full workflow
const result = await quickRun(projectRoot, userPrompt, {
  config: {
    security: { blockThreshold: 'high' },
    autonomous: { enabled: false } // Don't auto-execute
  },
  autoExecute: false
});
```

## CLI Alternative

Users can also use the CLI:

```bash
# Initialize interactively
ccasp vision init

# Initialize with prompt
ccasp vision init "Build a todo app with React and FastAPI"

# Initialize with options
ccasp vision init "E-commerce site" --title "Shop MVP" --priority high

# Skip phases
ccasp vision init "Quick app" --skip-analysis --skip-architecture
```

## Argument Handling

- `/vision-init` - Interactive mode (default)
- `/vision-init {prompt}` - Quick start with prompt
- `/vision-init --quick` - Skip confirmation steps
- `/vision-init --manual` - Don't enable autonomous execution

## Validation Checklist

Before marking complete, verify:

```
[ ] VISION.json created in .claude/visions/{slug}/
[ ] Prompt parsed successfully
[ ] Analysis completed (web search, tools)
[ ] Architecture generated (diagrams, components)
[ ] Security scan completed
[ ] PLANNING PHASE COMPLETED:
    [ ] EPIC.json created in .claude/epics/{slug}/
    [ ] ROADMAP.json files created in .claude/roadmaps/
    [ ] PROGRESS.json files created in .claude/phase-plans/
    [ ] Exploration docs created (6 files per roadmap)
    [ ] GitHub issues created (if configured)
[ ] Agents created
[ ] Session restart check performed
[ ] Summary displayed to user
```

## Error Handling

If any step fails:
1. Log error details
2. Save partial VISION.json with status 'failed'
3. Display error to user with recovery steps
4. Offer to retry failed step

## Related Commands

- `/vision-status` - View Vision status and progress
- `/vision-run` - Start autonomous execution
- `/vision-adjust` - Adjust Vision plan
- `/roadmap-track` - Track specific roadmap

---

*Vision Init - Part of CCASP Vision Mode Autonomous Development Framework (Phase 7)*
