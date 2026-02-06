/**
 * L2 Agent Spawner
 *
 * Provides L2 specialist agent configuration generation.
 */

import { v4 as uuidv4 } from 'uuid';
import { AGENT_CONFIGS, PROJECT_L2_AGENT_TYPES, detectTaskDomain } from './config.js';

/**
 * Generate L2 agent spawn configuration
 */
export function generateL2Config(task, phase, plan, orchestratorState) {
  const domain = detectTaskDomain(task);
  const config = AGENT_CONFIGS.L2[domain] || AGENT_CONFIGS.L2.general;
  const agentId = `l2-${domain}-${uuidv4().slice(0, 8)}`;

  const prompt = `
You are an L2 ${domain} specialist working under the Phase Orchestrator.

## Your Task
- **Task ID:** ${task.id}
- **Title:** ${task.title}
- **Details:** ${task.details || 'No additional details'}
- **Target File:** ${task.file || 'Not specified'}

## Context
- **Phase:** ${phase.name} (${phase.phase_id})
- **Plan:** ${plan.plan_name}
- **Plan ID:** ${plan.plan_id}

## Instructions
1. Complete the task described above
2. Follow existing code patterns in the codebase
3. Run tests/lint after making changes if applicable
4. Report completion using the exact format below

## Completion Report Format
When you complete the task, output this EXACTLY:

\`\`\`
TASK_COMPLETE: ${task.id}
STATUS: completed
ARTIFACTS: [comma-separated list of files modified]
SUMMARY: Brief description of what was done
\`\`\`

If you encounter a blocker:

\`\`\`
TASK_BLOCKED: ${task.id}
BLOCKER: Description of what's blocking
\`\`\`

If the task fails:

\`\`\`
TASK_FAILED: ${task.id}
ERROR: Description of the error
\`\`\`

## Constraints
- Stay within scope of the task
- Do not modify unrelated files
- If requirements are unclear, make reasonable assumptions and document them
`.trim();

  return {
    agentId,
    level: 'L2',
    domain,
    taskId: task.id,
    subagentType: config.subagentType,
    description: `${config.description}: ${task.title.slice(0, 50)}`,
    prompt,
    spawnedAt: new Date().toISOString(),
    status: 'running',
  };
}

/**
 * Parse agent completion report from output
 */
export function parseCompletionReport(output) {
  // Check for TASK_COMPLETE
  const completeMatch = output.match(/TASK_COMPLETE:\s*(\S+)/);
  if (completeMatch) {
    const artifactsMatch = output.match(/ARTIFACTS:\s*\[([^\]]*)\]/);
    const summaryMatch = output.match(/SUMMARY:\s*(.+?)(?:\n|$)/);

    return {
      type: 'completed',
      taskId: completeMatch[1],
      artifacts: artifactsMatch ? artifactsMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [],
      summary: summaryMatch ? summaryMatch[1].trim() : '',
    };
  }

  // Check for TASK_BLOCKED
  const blockedMatch = output.match(/TASK_BLOCKED:\s*(\S+)/);
  if (blockedMatch) {
    const blockerMatch = output.match(/BLOCKER:\s*(.+?)(?:\n|$)/);

    return {
      type: 'blocked',
      taskId: blockedMatch[1],
      blocker: blockerMatch ? blockerMatch[1].trim() : 'Unknown blocker',
    };
  }

  // Check for TASK_FAILED
  const failedMatch = output.match(/TASK_FAILED:\s*(\S+)/);
  if (failedMatch) {
    const errorMatch = output.match(/ERROR:\s*(.+?)(?:\n|$)/);

    return {
      type: 'failed',
      taskId: failedMatch[1],
      error: errorMatch ? errorMatch[1].trim() : 'Unknown error',
    };
  }

  // Check for L3_RESULT
  const l3Match = output.match(/L3_RESULT:\s*(\S+)/);
  if (l3Match) {
    const dataMatch = output.match(/DATA:\s*(.+?)(?:\n|$)/s);

    return {
      type: 'l3_completed',
      subtaskId: l3Match[1],
      data: dataMatch ? dataMatch[1].trim() : '',
    };
  }

  return null;
}

/**
 * Generate L2 agent config for project exploration
 * @param {Object} project - Project object
 * @param {string} agentType - L2 agent type (code_snippets, reference_files, etc.)
 * @param {Object} roadmapContext - Roadmap context
 * @returns {Object} L2 agent spawn configuration
 */
export function generateProjectL2Config(project, agentType, roadmapContext = {}) {
  const config = PROJECT_L2_AGENT_TYPES[agentType];
  if (!config) {
    throw new Error(`Unknown L2 agent type: ${agentType}`);
  }

  const agentId = `l2-${agentType}-${project.project_id}-${uuidv4().slice(0, 8)}`;

  // Generate type-specific prompt
  const prompt = generateProjectL2Prompt(project, agentType, roadmapContext);

  return {
    agentId,
    level: 'L2',
    agentType,
    projectId: project.project_id,
    projectTitle: project.project_title,
    subagentType: config.subagentType,
    description: `${config.description} for ${project.project_title}`,
    prompt,
    spawnedAt: new Date().toISOString(),
    status: 'running',
  };
}

/**
 * Generate L2 agent prompt based on type
 */
function generateProjectL2Prompt(project, agentType, roadmapContext) {
  const baseContext = `
## Project Context
- **Project:** ${project.project_title}
- **Project ID:** ${project.project_id}
- **Domain:** ${project.domain || 'general'}
- **Description:** ${project.description || 'No description'}
- **Exploration Path:** ${project.exploration_path || `.claude/exploration/${  project.slug  }/`}

## Roadmap Context
- **Roadmap:** ${roadmapContext.title || 'Multi-Project Roadmap'}
- **Total Projects:** ${roadmapContext.totalProjects || 'Unknown'}
`;

  switch (agentType) {
    case 'code_snippets':
      return `
You are an L2 Code Snippets Explorer.

${baseContext}

## Your Task
Explore the codebase and extract relevant code snippets that will help implement this project.

## Instructions
1. Search for files related to the project domain (${project.domain})
2. Look for existing patterns and implementations
3. Extract relevant code snippets with context
4. Focus on:
   - Function signatures and implementations
   - Class structures
   - API endpoints
   - Database schemas/models
   - Component patterns

## Output Format
Return your findings as structured data:

\`\`\`
L2_SNIPPETS_COMPLETE: ${project.project_id}
SNIPPETS: [
  {
    "file": "path/to/file.ts",
    "startLine": 10,
    "endLine": 40,
    "content": "...",
    "language": "typescript",
    "description": "Auth middleware implementation",
    "relevance": "Primary pattern to follow"
  }
]
\`\`\`

Extract 5-15 relevant snippets.
`.trim();

    case 'reference_files':
      return `
You are an L2 Reference Files Analyzer.

${baseContext}

## Your Task
Identify files that will need to be modified or referenced for this project.

## Instructions
1. Search for files in the project domain (${project.domain})
2. Categorize files as:
   - **Modify (Primary):** Files that will need changes
   - **Reference (Dependencies):** Files to understand but not change
   - **Tests:** Test files that will need updates

3. Assess complexity of modifications (S/M/L)

## Output Format
\`\`\`
L2_FILES_COMPLETE: ${project.project_id}
FILES: {
  "modify": [
    { "path": "src/path.ts", "reason": "Main implementation file", "complexity": "M" }
  ],
  "reference": [
    { "path": "src/types.ts", "reason": "Type definitions" }
  ],
  "tests": [
    { "path": "tests/path.spec.ts", "coverage": "Unit tests" }
  ]
}
\`\`\`
`.trim();

    case 'agent_delegation':
      return `
You are an L2 Agent Delegation Planner.

${baseContext}

## Your Task
Recommend which specialist agents should handle each part of this project.

## Available Agents
- **frontend-specialist:** UI components, React/Vue, styling
- **backend-specialist:** APIs, database, authentication
- **testing-specialist:** Unit tests, E2E tests, coverage
- **deployment-specialist:** CI/CD, Docker, cloud deployment
- **general-implementation-agent:** Full-stack, miscellaneous

## Instructions
1. Analyze the project scope and tasks
2. Recommend a primary agent for the overall project
3. Suggest agent assignments for anticipated tasks

## Output Format
\`\`\`
L2_DELEGATION_COMPLETE: ${project.project_id}
DELEGATION: {
  "primary_agent": "backend-specialist",
  "primary_agent_reason": "Project focuses on API development",
  "task_assignments": [
    { "phase": "P1", "task": "1.1", "agent": "backend-specialist", "reason": "API implementation" },
    { "phase": "P1", "task": "1.2", "agent": "frontend-specialist", "reason": "UI integration" }
  ],
  "execution_sequence": [
    { "agent": "backend-specialist", "scope": "Phase 1-2: API and data layer" },
    { "agent": "frontend-specialist", "scope": "Phase 3: UI components" }
  ]
}
\`\`\`
`.trim();

    case 'json_structure':
      return `
You are an L2 Structure Generator.

${baseContext}

## Your Task
Generate a complete phase and task breakdown for this project.

## Instructions
1. Analyze the project requirements
2. Break down into logical phases
3. Create detailed tasks for each phase
4. Include acceptance criteria and dependencies

## Phase Guidelines
- 2-4 phases for small projects
- 4-6 phases for medium projects
- 6-8 phases for large projects

## Task Guidelines
- Each task should be completable in 1-2 hours
- Include clear acceptance criteria
- Identify file dependencies
- Mark task blocking relationships

## Output Format
\`\`\`
L2_STRUCTURE_COMPLETE: ${project.project_id}
PHASES: [
  {
    "id": 1,
    "name": "Foundation",
    "objective": "Set up core infrastructure",
    "complexity": "M",
    "assigned_agent": "backend-specialist",
    "dependencies": [],
    "validation_criteria": ["All tasks complete", "Tests pass"],
    "tasks": [
      {
        "id": "1.1",
        "title": "Set up database schema",
        "description": "Create initial database models",
        "subject": "Set up database schema",
        "activeForm": "Setting up database schema",
        "status": "pending",
        "files": {
          "modify": [{ "path": "src/models/", "reason": "New models" }],
          "reference": [{ "path": "src/db/", "reason": "DB connection" }]
        },
        "acceptance_criteria": ["Schema created", "Migrations run"],
        "assigned_agent": "backend-specialist",
        "blocked_by": [],
        "blocks": ["1.2"]
      }
    ]
  }
]
\`\`\`
`.trim();

    default:
      return `
You are an L2 Project Explorer.

${baseContext}

## Your Task
Analyze the project and provide relevant findings.

## Output Format
\`\`\`
L2_COMPLETE: ${project.project_id}
DATA: Your findings here
\`\`\`
`.trim();
  }
}

/**
 * Parse project L2 agent completion report
 * @param {string} output - Agent output
 * @param {string} agentType - L2 agent type
 * @returns {Object|null} Parsed result
 */
export function parseProjectL2Report(output, agentType) {
  const patterns = {
    code_snippets: /L2_SNIPPETS_COMPLETE:\s*(\S+)[\s\S]*?SNIPPETS:\s*(\[[\s\S]*?\])/,
    reference_files: /L2_FILES_COMPLETE:\s*(\S+)[\s\S]*?FILES:\s*(\{[\s\S]*?\})/,
    agent_delegation: /L2_DELEGATION_COMPLETE:\s*(\S+)[\s\S]*?DELEGATION:\s*(\{[\s\S]*?\})/,
    json_structure: /L2_STRUCTURE_COMPLETE:\s*(\S+)[\s\S]*?PHASES:\s*(\[[\s\S]*?\])/,
  };

  const pattern = patterns[agentType];
  if (!pattern) return null;

  const match = output.match(pattern);
  if (!match) return null;

  try {
    const data = JSON.parse(match[2]);
    return {
      type: agentType,
      projectId: match[1],
      data,
    };
  } catch {
    return null;
  }
}
