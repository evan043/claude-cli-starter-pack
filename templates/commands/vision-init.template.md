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

### Step 1b: Check Existing Visions (Multi-Instance Awareness)

Before creating a new vision, check the registry for existing visions:

```javascript
import { getActiveVisions, getVisionCount, describePlanType } from '${CWD}/node_modules/claude-cli-advanced-starter-pack/src/vision/index.js';

const activeVisions = getActiveVisions(projectRoot);
const { total, active } = getVisionCount(projectRoot);

if (activeVisions.length > 0) {
  console.log(`\n  Existing Visions: ${total} total, ${active} active\n`);
  for (const v of activeVisions) {
    console.log(`    - ${v.slug} [${v.status}] ${v.completion_percentage || 0}%`);
  }
  console.log('');
}
```

### Step 1c: Decision Engine - Determine Plan Type

The decision engine analyzes the prompt and recommends the optimal planning hierarchy:

```javascript
import { parseVisionPrompt, estimateComplexity, decidePlanType, describePlanType } from '${CWD}/node_modules/claude-cli-advanced-starter-pack/src/vision/index.js';

const parsedPrompt = parseVisionPrompt(userPrompt);
const complexity = estimateComplexity(parsedPrompt);
const decision = decidePlanType(parsedPrompt, complexity);

const desc = describePlanType(decision.planType);
```

**Display decision result:**
```
╔════════════════════════════════════════════════════════════════════╗
║                   PLAN TYPE DECISION                               ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Recommended: {{desc.label}} ({{decision.planType}})               ║
║  Confidence: {{decision.confidence}}                               ║
║  Score: {{decision.score}}                                         ║
║                                                                    ║
║  Reasoning: {{decision.reasoning}}                                 ║
║                                                                    ║
║  Artifacts: {{desc.artifacts.join(', ')}}                          ║
║                                                                    ║
║  Override: Use --plan-type=<type> to force a specific plan type    ║
║  Types: task-list | phase-dev-plan | roadmap | epic | vision-full  ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

**Plan type selection logic:**
| Score Range | Plan Type | Artifacts |
|-------------|-----------|-----------|
| 0-6 | task-list | Flat PROGRESS.json |
| 7-14 | phase-dev-plan | Phased PROGRESS.json |
| 15-25 | roadmap | ROADMAP.json + PROGRESS files |
| 26-40 | epic | EPIC.json + ROADMAPs + PROGRESS files |
| 41+ | vision-full | Full hierarchy with agents |

Scoring factors: feature count (2.0x), domain diversity (3.0x), technology count (1.5x), constraints (1.0x), intent modifier (1.0x), prompt length (0.3x).

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

### Step 2b: Generate PRD (Product Requirements Document)

After parsing the prompt, generate a structured PRD for alignment tracking:

```javascript
import { generatePRD, formatPRDAsMarkdown } from '${CWD}/node_modules/claude-cli-advanced-starter-pack/src/vision/requirements/prd-template.js';

// Generate PRD from parsed prompt
const prd = generatePRD(initResult.parsedPrompt);
const prdMarkdown = formatPRDAsMarkdown(prd);

// Store PRD in VISION.json
initResult.vision.requirements_document = prd;

console.log('📋 PRD Generated:');
console.log(`  Must-have features: ${prd.sections.functional_requirements.must_have.length}`);
console.log(`  Acceptance criteria: ${prd.sections.acceptance_criteria.criteria.length}`);
console.log(`  Quality attributes: ${prd.sections.non_functional.quality_attributes.join(', ') || 'none'}`);
```

**PRD sections generated:**
- Overview & Objectives
- User Stories / Use Cases
- Functional Requirements (MoSCoW prioritization)
- Non-Functional Requirements
- Technical Constraints
- Acceptance Criteria (Given/When/Then format)
- Out of Scope

The PRD is stored in `VISION.json` under `requirements_document` and used by:
- Vision observer for drift detection (checks against PRD acceptance criteria)
- Phase planning to link tasks to requirements
- Alignment validation during autonomous execution

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

### Step 4b: HTML Mockup Preview (Optional - UI Work Only)

After architecture generation, detect if this vision involves frontend/UI work and offer a browser-rendered HTML mockup preview.

**Skip this step if:**
- User passed `--skip-mockup` flag
- No frontend features or technologies detected
- Architecture phase was skipped (`--skip-architecture`)

```javascript
// Detect frontend/UI work from parsed prompt data
const features = initResult.vision?.metadata?.features || [];
const technologies = initResult.vision?.prompt?.parsed?.technologies || [];

const hasFrontendFeatures = features.some(f =>
  (f.domain === 'frontend') ||
  ['dashboard', 'forms', 'navigation', 'calendar', 'drag-drop', 'modal', 'data-display', 'charts'].includes(f.feature || f)
);
const hasFrontendTech = technologies.some(t =>
  ['react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt'].includes(t?.toLowerCase())
);

const shouldOfferMockup = (hasFrontendFeatures || hasFrontendTech) && !skipMockup;
```

**If frontend work detected, offer mockup preview using `AskUserQuestion`:**

```javascript
if (shouldOfferMockup && archResult.success) {
  // Offer mockup preview
  const wantsMockup = await AskUserQuestion({
    question: 'Frontend work detected. Generate an HTML mockup preview in the browser before planning?',
    options: [
      { label: 'Yes - Preview mockup', description: 'Generate HTML from wireframes, render in browser via Playwright' },
      { label: 'No - Continue', description: 'Skip mockup and proceed to security scan + planning' }
    ]
  });

  if (wantsMockup === 'Yes - Preview mockup') {
    await generateAndPreviewMockup(orchestrator, archResult.artifacts);
  }
}
```

**Mockup generation and preview flow:**

```javascript
async function generateAndPreviewMockup(orchestrator, artifacts) {
  const visionSlug = orchestrator.vision.slug;
  const visionDir = `.claude/visions/${visionSlug}`;
  const mockupPath = `${visionDir}/mockup.html`;

  console.log('🎨 Generating HTML mockup from wireframes...');

  // 1. Analyze the ASCII wireframes and componentList to determine page structure
  const wireframes = artifacts.wireframes || '';
  const componentList = artifacts.componentList || [];
  const features = orchestrator.vision.metadata?.features || [];

  // 2. Generate a single-file HTML page using Tailwind CDN
  //    Claude should write the HTML based on:
  //    - Detected components (navbar, sidebar, form, table, card, modal, grid)
  //    - Feature list (dashboard, calendar, drag-drop, charts, etc.)
  //    - Vision title for headings and branding
  //    - ASCII wireframe layout structure
  //
  //    HTML structure:
  //    <!DOCTYPE html>
  //    <html>
  //    <head>
  //      <meta charset="UTF-8">
  //      <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //      <title>{vision.title} - Mockup Preview</title>
  //      <script src="https://cdn.tailwindcss.com"></script>
  //      <style>
  //        /* Inline fallback styles for offline rendering */
  //        body { margin: 0; font-family: system-ui, sans-serif; }
  //      </style>
  //    </head>
  //    <body class="bg-gray-50">
  //      <!-- Map each detected component to Tailwind HTML -->
  //      <!-- navbar → <nav class="bg-gray-800 text-white p-4 ..."> -->
  //      <!-- sidebar → <aside class="w-64 bg-gray-100 ..."> -->
  //      <!-- form → <form class="bg-white p-6 rounded shadow ..."> -->
  //      <!-- table → <table class="w-full ..."> with sample rows -->
  //      <!-- card → <div class="border rounded p-4 ..."> with stat data -->
  //      <!-- modal → <div class="fixed inset-0 bg-black/50 ..."> -->
  //    </body>
  //    </html>

  // 3. Write the HTML file using the Write tool
  // Write(mockupPath, generatedHtml);
  console.log(`  ✓ Mockup saved: ${mockupPath}`);

  // 4. Render in browser via Playwright MCP
  console.log('  🌐 Launching browser preview...');
  const fileUrl = `file://${mockupPath.replace(/\\/g, '/')}`;

  // Navigate to mockup (opens browser)
  // Use: mcp__playwright-ext__playwright_navigate({ url: fileUrl })
  // Wait 2 seconds for Tailwind CDN to load and render

  // 5. Take screenshot
  // Use: mcp__playwright-ext__playwright_screenshot({ name: 'mockup-preview', fullPage: true })
  // Save screenshot to visionDir
  console.log(`  ✓ Screenshot saved: ${visionDir}/mockup-preview.png`);

  // 6. Display screenshot to user
  // Use: Read tool to display the screenshot image
  console.log('\n📸 Mockup Preview:');

  // 7. Ask for approval
  const approval = await AskUserQuestion({
    question: 'How does the mockup look?',
    options: [
      { label: 'Looks good - Continue', description: 'Approve layout and proceed to planning' },
      { label: 'Adjust', description: 'Describe changes and regenerate mockup (max 2 iterations)' },
      { label: 'Skip', description: 'Continue without approving mockup' }
    ]
  });

  if (approval === 'Adjust') {
    // Ask what to adjust, regenerate HTML, re-render (max 2 iterations)
    for (let i = 0; i < 2; i++) {
      const feedback = await AskUserQuestion({
        question: 'What would you like to adjust in the mockup?'
      });

      console.log(`📝 Adjusting mockup (iteration ${i + 1}/2)...`);

      // Regenerate HTML incorporating feedback
      // Re-render via Playwright, take new screenshot, show to user
      // Ask again: "Looks good?" / "Adjust again" / "Skip"

      // Store feedback in vision metadata for planning phase
      await updateVision(projectRoot, visionSlug, (v) => {
        v.metadata.mockup_feedback = feedback;
        return v;
      });

      // Break if user approves
      break; // Simplified — actual implementation checks user response
    }
  }

  console.log('✅ Mockup preview complete.\n');
}
```

**Important notes for Claude executing this step:**
- The HTML generation is done by YOU (Claude) at runtime — analyze the wireframes and write appropriate HTML
- Use placeholder/sample data in tables, forms, and cards (e.g., "John Doe", "$12,345")
- Keep the mockup simple — it's a layout preview, not pixel-perfect design
- If Playwright MCP is unavailable, fall back to just saving the HTML file and telling the user to open it manually
- The mockup.html file persists in the vision directory for future reference

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
║  3. List all visions:                                              ║
║     ccasp vision list                                              ║
║                                                                    ║
║  4. Adjust if needed:                                              ║
║     /vision-adjust {{slug}}                                        ║
║                                                                    ║
║  5. Cleanup stale visions:                                         ║
║     ccasp vision cleanup                                           ║
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

# Override plan type (skip decision engine auto-detection)
ccasp vision init "Fix the login bug" --plan-type task-list
ccasp vision init "Add dark mode" --plan-type phase-dev-plan

# Skip phases
ccasp vision init "Quick app" --skip-analysis --skip-architecture

# Skip mockup preview (frontend work still planned, just no browser preview)
ccasp vision init "React dashboard" --skip-mockup
```

## Argument Handling

- `/vision-init` - Interactive mode (default)
- `/vision-init {prompt}` - Quick start with prompt
- `/vision-init --quick` - Skip confirmation steps
- `/vision-init --manual` - Don't enable autonomous execution
- `/vision-init --skip-mockup` - Skip HTML mockup preview even for frontend work

## Validation Checklist

Before marking complete, verify:

```
[ ] VISION.json created in .claude/visions/{slug}/
[ ] Prompt parsed successfully
[ ] Analysis completed (web search, tools)
[ ] Architecture generated (diagrams, components)
[ ] Mockup preview offered (if frontend work detected)
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
