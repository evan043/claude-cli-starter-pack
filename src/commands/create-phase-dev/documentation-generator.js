/**
 * Documentation Generator
 *
 * Generates all phased development documentation:
 * - PROGRESS.json
 * - EXECUTIVE_SUMMARY.md
 * - API specifications
 * - RAG execution agent
 * - Interactive command
 * - Enforcement hooks
 */

import chalk from 'chalk';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import {
  generateProgressJson,
  generateExecutiveSummary,
  generateMiddlewareSpec,
  generateApiEndpoints,
  generateDatabaseSchema,
  generateDeploymentConfig,
  generatePhaseExecutorAgent,
  generatePhaseDevCommand,
  generateTestDefinitions,
  generatePhaseDevEnforcerHook,
} from '../../agents/phase-dev-templates.js';
import { runL2Exploration } from './l2-orchestrator.js';
import { saveAllExplorationDocs, explorationDocsExist, loadExplorationDocs, generatePhaseBreakdownMarkdown } from '../../utils/exploration-docs.js';
import { checkGhCli, getRepoInfo } from '../../roadmap/github-integration.js';
import { execSync } from 'child_process';

/**
 * Load agent registry if available
 * @param {string} projectRoot - Project root
 * @returns {object|null} Agent registry or null
 */
function loadAgentRegistry(projectRoot = process.cwd()) {
  const registryPath = join(projectRoot, '.claude', 'config', 'agents.json');
  if (!existsSync(registryPath)) {
    return null;
  }
  try {
    const content = readFileSync(registryPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Generate all documentation for a phased development plan
 *
 * @param {Object} config - Project configuration
 * @param {Array} enhancements - Enabled enhancements
 * @returns {Object} Generation results
 */
export async function generatePhaseDevDocumentation(config, enhancements = []) {
  const spinner = ora('Generating documentation...').start();
  const results = { files: [], errors: [] };

  const { projectSlug } = config;
  const cwd = process.cwd();

  // Load agent registry if available
  const agentRegistry = loadAgentRegistry(cwd);
  if (agentRegistry) {
    spinner.text = 'Agent registry found - enabling agent assignments...';
  }

  // Define output directories - NEW CONSOLIDATED STRUCTURE
  // Phase-dev files now live in .claude/phase-dev/{slug}/
  const docsDir = join(cwd, '.claude', 'phase-dev', projectSlug);
  const agentsDir = join(cwd, '.claude', 'agents');
  const commandsDir = join(cwd, '.claude', 'commands');
  const hooksDir = join(cwd, '.claude', 'hooks', 'tools');

  // Ensure directories exist
  [docsDir, agentsDir, commandsDir, hooksDir].forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });

  try {
    // 1. Generate PROGRESS.json (with agent assignments if registry available)
    spinner.text = 'Creating PROGRESS.json...';
    const progressPath = join(docsDir, 'PROGRESS.json');
    const progressContent = generateProgressJson({
      ...config,
      enhancements,
      agentRegistry,
      parentContext: config.parentContext || null,
    });
    writeFileSync(progressPath, progressContent, 'utf8');
    results.files.push({ name: 'PROGRESS.json', path: progressPath });

    // 2. Generate EXECUTIVE_SUMMARY.md
    spinner.text = 'Creating EXECUTIVE_SUMMARY.md...';
    const summaryPath = join(docsDir, 'EXECUTIVE_SUMMARY.md');
    const summaryContent = generateExecutiveSummary(config);
    writeFileSync(summaryPath, summaryContent, 'utf8');
    results.files.push({ name: 'EXECUTIVE_SUMMARY.md', path: summaryPath });

    // 3. Generate API specifications (if backend required)
    if (config.architecture?.backend !== 'none') {
      spinner.text = 'Creating API specifications...';

      // MIDDLEWARE_SPEC.md
      const middlewarePath = join(docsDir, 'MIDDLEWARE_SPEC.md');
      writeFileSync(middlewarePath, generateMiddlewareSpec(config), 'utf8');
      results.files.push({ name: 'MIDDLEWARE_SPEC.md', path: middlewarePath });

      // API_ENDPOINTS.md
      const apiPath = join(docsDir, 'API_ENDPOINTS.md');
      writeFileSync(apiPath, generateApiEndpoints(config), 'utf8');
      results.files.push({ name: 'API_ENDPOINTS.md', path: apiPath });

      // DATABASE_SCHEMA.md
      const schemaPath = join(docsDir, 'DATABASE_SCHEMA.md');
      writeFileSync(schemaPath, generateDatabaseSchema(config), 'utf8');
      results.files.push({ name: 'DATABASE_SCHEMA.md', path: schemaPath });

      // DEPLOYMENT_CONFIG.md
      const deployPath = join(docsDir, 'DEPLOYMENT_CONFIG.md');
      writeFileSync(deployPath, generateDeploymentConfig(config), 'utf8');
      results.files.push({ name: 'DEPLOYMENT_CONFIG.md', path: deployPath });
    }

    // 4. Generate RAG Phase Executor Agent
    spinner.text = 'Creating phase executor agent...';
    const agentPath = join(agentsDir, `${projectSlug}-phase-executor-agent.md`);
    const agentContent = generatePhaseExecutorAgent(config);
    writeFileSync(agentPath, agentContent, 'utf8');
    results.files.push({
      name: `${projectSlug}-phase-executor-agent.md`,
      path: agentPath,
    });

    // 5. Generate Interactive Slash Command
    spinner.text = 'Creating slash command...';
    const commandPath = join(commandsDir, `phase-dev-${projectSlug}.md`);
    const commandContent = generatePhaseDevCommand(config);
    writeFileSync(commandPath, commandContent, 'utf8');
    results.files.push({
      name: `phase-dev-${projectSlug}.md`,
      path: commandPath,
    });

    // 6. Generate Test Definitions (if testing enhancement enabled)
    if (enhancements.includes('testing')) {
      spinner.text = 'Creating test definitions...';
      const testPath = join(docsDir, 'TEST_DEFINITIONS.json');
      const testContent = generateTestDefinitions(config);
      writeFileSync(testPath, testContent, 'utf8');
      results.files.push({ name: 'TEST_DEFINITIONS.json', path: testPath });
    }

    // 7. Generate Enforcement Hook (if hooks enhancement enabled)
    if (enhancements.includes('hooks')) {
      spinner.text = 'Creating enforcement hook...';
      const hookPath = join(hooksDir, `${projectSlug}-enforcer.js`);
      const hookContent = generatePhaseDevEnforcerHook(config);
      writeFileSync(hookPath, hookContent, 'utf8');
      results.files.push({
        name: `${projectSlug}-enforcer.js`,
        path: hookPath,
      });
    }

    spinner.succeed(`Generated ${results.files.length} files`);
  } catch (error) {
    spinner.fail('Error generating documentation');
    results.errors.push(error.message);
    throw error;
  }

  return results;
}

/**
 * Display generation results
 */
export function displayGenerationResults(results) {
  console.log('');
  console.log(chalk.green.bold('📁 Generated Files:'));
  console.log('');

  results.files.forEach((file) => {
    const relativePath = file.path.replace(process.cwd(), '.');
    console.log(`  ${chalk.green('✓')} ${file.name}`);
    console.log(`    ${chalk.dim(relativePath)}`);
  });

  if (results.errors.length > 0) {
    console.log('');
    console.log(chalk.red.bold('⚠️ Errors:'));
    results.errors.forEach((err) => {
      console.log(`  ${chalk.red('✗')} ${err}`);
    });
  }

  console.log('');
}

/**
 * Generate backend configuration based on architecture
 * Adapts to user's detected/specified stack - no hardcoded defaults
 */
export function generateBackendConfig(architecture) {
  if (!architecture?.backend || architecture.backend === 'none') {
    return {};
  }

  // Use detected/specified deployment and database, or null if not specified
  const deploymentPlatform = architecture.deployment?.platform || null;
  const databaseType = architecture.database?.type || null;

  const config = {
    middleware: ['Authentication', 'Rate Limiting', 'Error Handling', 'CORS'],
    apiEndpoints: [],
    databaseTables: [],
    websocketEvents: [],
    deployment: {
      platform: deploymentPlatform,
      database: databaseType,
    },
  };

  // Add auth endpoints if needed
  if (architecture.needsAuth) {
    config.apiEndpoints.push(
      {
        method: 'POST',
        path: '/auth/login',
        description: 'User login',
        auth: 'None',
        request: { email: 'string', password: 'string' },
        response: { token: 'string', user: 'object' },
      },
      {
        method: 'POST',
        path: '/auth/logout',
        description: 'User logout',
        auth: 'Required',
        request: {},
        response: { success: true },
      },
      {
        method: 'GET',
        path: '/auth/me',
        description: 'Get current user',
        auth: 'Required',
        request: {},
        response: { user: 'object' },
      }
    );

    // Generate database-appropriate column types
    const idType = getIdType(databaseType);
    const timestampType = getTimestampType(databaseType);
    const timestampDefault = getTimestampDefault(databaseType);

    config.databaseTables.push({
      name: 'users',
      purpose: 'User accounts and authentication',
      columns: [
        { name: 'id', type: idType, constraints: 'PRIMARY KEY' },
        { name: 'email', type: 'VARCHAR(255)', constraints: 'UNIQUE NOT NULL' },
        { name: 'password_hash', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
        { name: 'created_at', type: timestampType, constraints: timestampDefault },
        { name: 'updated_at', type: timestampType, constraints: timestampDefault },
      ],
      indexes: databaseType === 'mongodb' ? [] : ['CREATE UNIQUE INDEX idx_users_email ON users(email)'],
      relationships: [],
    });
  }

  // Add WebSocket events if needed
  if (architecture.needsRealtime) {
    config.websocketEvents.push(
      { name: 'connect', description: 'Client connected' },
      { name: 'disconnect', description: 'Client disconnected' },
      { name: 'update', description: 'Data update broadcast' }
    );
  }

  return config;
}

/**
 * Get appropriate ID type for database
 */
function getIdType(databaseType) {
  switch (databaseType) {
    case 'mongodb':
      return 'ObjectId';
    case 'mysql':
    case 'mariadb':
      return 'INT AUTO_INCREMENT';
    case 'sqlite':
      return 'INTEGER';
    default:
      // PostgreSQL and others
      return 'UUID';
  }
}

/**
 * Get appropriate timestamp type for database
 */
function getTimestampType(databaseType) {
  switch (databaseType) {
    case 'mongodb':
      return 'Date';
    case 'mysql':
    case 'mariadb':
      return 'DATETIME';
    case 'sqlite':
      return 'TEXT';
    default:
      return 'TIMESTAMP';
  }
}

/**
 * Get appropriate timestamp default for database
 */
function getTimestampDefault(databaseType) {
  switch (databaseType) {
    case 'mongodb':
      return '';
    case 'mysql':
    case 'mariadb':
      return 'DEFAULT CURRENT_TIMESTAMP';
    case 'sqlite':
      return "DEFAULT (datetime('now'))";
    default:
      return 'DEFAULT NOW()';
  }
}

/**
 * Generate documentation with L2 exploration integration
 * @param {Object} config - Project configuration
 * @param {Array} enhancements - Enabled enhancements
 * @param {Object} options - Additional options
 * @returns {Object} Generation results with exploration data
 */
export async function generatePhaseDevDocumentationWithL2(config, enhancements = [], options = {}) {
  const spinner = ora('Generating documentation with L2 exploration...').start();
  const cwd = process.cwd();
  const { projectSlug } = config;

  let l2Exploration = null;

  // Run L2 exploration if parallel enhancement is enabled
  if (enhancements.includes('parallel') || options.runL2Exploration) {
    spinner.text = 'Running L2 codebase exploration...';

    try {
      l2Exploration = await runL2Exploration(config, {
        spinner,
        cwd,
        forceRefresh: options.forceRefresh,
      });

      // Update config with exploration findings
      if (l2Exploration && l2Exploration.phases) {
        config.phases = l2Exploration.phases;
        config.l2Exploration = {
          explorationPath: `.claude/exploration/${projectSlug}`,
          filesAnalyzed: l2Exploration.summary?.filesAnalyzed || 0,
          snippetsExtracted: l2Exploration.summary?.snippetsExtracted || 0,
          confidence: l2Exploration.summary?.confidence || 'medium',
          primaryAgent: l2Exploration.delegation?.primaryAgent || null,
          domains: l2Exploration.summary?.domains || {},
        };
      }
    } catch (error) {
      spinner.warn(`L2 exploration failed: ${error.message}`);
      // Continue without exploration data
    }
  }

  // Generate standard documentation
  spinner.text = 'Generating phase documentation...';
  const results = await generatePhaseDevDocumentation(config, enhancements);

  // Add exploration info to results
  results.l2Exploration = l2Exploration;
  results.explorationPath = l2Exploration ? `.claude/exploration/${projectSlug}` : null;

  return results;
}

/**
 * Update PROGRESS.json with exploration findings
 * @param {string} progressPath - Path to PROGRESS.json
 * @param {Object} explorationFindings - L2 exploration findings
 */
export async function updateProgressWithExploration(progressPath, explorationFindings) {
  if (!existsSync(progressPath)) {
    throw new Error(`PROGRESS.json not found: ${progressPath}`);
  }

  const progress = JSON.parse(readFileSync(progressPath, 'utf8'));

  // Update phases with file references from exploration
  if (explorationFindings.phases) {
    progress.phases = progress.phases.map((phase, idx) => {
      const explorationPhase = explorationFindings.phases[idx];
      if (!explorationPhase) return phase;

      return {
        ...phase,
        tasks: phase.tasks.map((task, taskIdx) => {
          const explorationTask = explorationPhase.tasks?.[taskIdx];
          if (!explorationTask) return task;

          return {
            ...task,
            files: explorationTask.files || task.files,
            specificity: explorationTask.specificity || task.specificity,
            assignedAgent: explorationTask.assignedAgent || task.assignedAgent,
            codePatternRef: explorationTask.codePatternRef || task.codePatternRef,
          };
        }),
        assignedAgent: explorationPhase.assignedAgent || phase.assignedAgent,
      };
    });
  }

  // Update L2 exploration metadata
  progress.l2Exploration = {
    enabled: true,
    explorationPath: explorationFindings.explorationPath || null,
    filesAnalyzed: explorationFindings.summary?.filesAnalyzed || 0,
    snippetsExtracted: explorationFindings.summary?.snippetsExtracted || 0,
    confidence: explorationFindings.summary?.confidence || 'medium',
    primaryAgent: explorationFindings.delegation?.primaryAgent || null,
    domains: explorationFindings.summary?.domains || {},
    lastUpdated: new Date().toISOString(),
  };

  writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');
  return progress;
}

/**
 * Create GitHub issue for phase-dev plan
 * @param {Object} config - Project configuration
 * @param {Object} explorationData - L2 exploration data (optional)
 * @returns {Object} Created issue info
 */
export async function createPhaseDevGitHubIssue(config, explorationData = null) {
  // Check gh CLI
  const ghCheck = checkGhCli();
  if (!ghCheck.available || !ghCheck.authenticated) {
    return { success: false, error: ghCheck.error || 'gh CLI not available' };
  }

  const repoInfo = getRepoInfo();
  if (!repoInfo) {
    return { success: false, error: 'Could not determine repository' };
  }

  const { projectName, projectSlug, description, phases, architecture } = config;

  // Generate issue body with full phase/task breakdown
  const body = generatePhaseDevIssueBody(config, explorationData);

  try {
    // Create the issue
    const result = execSync(
      `gh issue create --title "${escapeShell(`📋 Phase Dev: ${projectName}`)}" --body "${escapeShell(body)}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    // Parse issue URL from output
    const urlMatch = result.match(/https:\/\/github\.com\/[^\s]+/);
    const issueUrl = urlMatch ? urlMatch[0] : null;
    const numberMatch = issueUrl?.match(/\/issues\/(\d+)/);
    const issueNumber = numberMatch ? parseInt(numberMatch[1]) : null;

    return {
      success: true,
      url: issueUrl,
      number: issueNumber,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate GitHub issue body with full phase/task breakdown
 */
function generatePhaseDevIssueBody(config, explorationData) {
  const { projectName, projectSlug, description, phases, architecture, scale } = config;
  const totalTasks = phases.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);

  let body = `## ${projectName}

**Slug:** \`${projectSlug}\`
**Scale:** ${scale || 'M'}
**Phases:** ${phases.length}
**Total Tasks:** ${totalTasks}
**Exploration Docs:** \`.claude/exploration/${projectSlug}/\`

### Description
${description || 'No description provided.'}

---

## Architecture
${architecture?.summary || 'Not specified'}

`;

  // Add exploration findings if available
  if (explorationData) {
    body += `## Codebase Analysis

### Key Statistics
- Files analyzed: ${explorationData.summary?.filesAnalyzed || 0}
- Code snippets extracted: ${explorationData.summary?.snippetsExtracted || 0}
- Confidence: ${explorationData.summary?.confidence || 'medium'}

### Recommended Primary Agent
**${explorationData.delegation?.primaryAgent || 'general-implementation-agent'}** - ${explorationData.delegation?.primaryAgentReason || 'Best fit for project'}

`;
  }

  // Add full phase breakdown
  body += `---

## Phase Breakdown

`;

  phases.forEach((phase, phaseIdx) => {
    const phaseNum = phaseIdx + 1;
    const tasks = phase.tasks || [];

    body += `### Phase ${phaseNum}: ${phase.name}
**Objective:** ${phase.objective || phase.description || 'Not specified'}
**Complexity:** ${phase.complexity || 'M'}
**Agent:** ${phase.assignedAgent || 'TBD'}
**Dependencies:** ${formatDependencies(phase.dependencies)}

#### Tasks
`;

    tasks.forEach((task, taskIdx) => {
      const taskId = task.id || `${phaseNum}.${taskIdx + 1}`;
      const criteria = task.acceptanceCriteria || task.acceptance_criteria || [];

      body += `- [ ] **${taskId}** ${task.title}
`;

      if (task.files && task.files.length > 0) {
        body += `  - Files: ${task.files.map(f => `\`${f.path || f}\``).slice(0, 3).join(', ')}
`;
      }
      if (task.assignedAgent) {
        body += `  - Agent: ${task.assignedAgent}
`;
      }
      if (criteria.length > 0) {
        body += `  - Criteria: ${criteria.slice(0, 2).join(', ')}
`;
      }
    });

    body += `
#### Phase ${phaseNum} Validation
`;
    const validationCriteria = phase.validationCriteria || ['All tasks complete', 'No blocking issues'];
    validationCriteria.forEach(c => {
      body += `- [ ] ${c}
`;
    });

    body += `
---

`;
  });

  body += `## Execution Checklist
- [ ] Review exploration docs in \`.claude/exploration/${projectSlug}/\`
- [ ] Start Phase 1
${phases.map((p, i) => `- [ ] Complete Phase ${i + 1} validation`).join('\n')}
- [ ] Final testing
- [ ] Close this issue with summary

---
*Exploration docs: \`.claude/exploration/${projectSlug}/\`*
*Generated by CCASP Phase-Dev Planning*
`;

  return body;
}

/**
 * Format dependencies for display
 */
function formatDependencies(deps) {
  if (!deps || deps.length === 0) return 'None';
  return deps.join(', ');
}

/**
 * Escape shell characters
 */
function escapeShell(str) {
  return str.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

/**
 * Create a git checkpoint before generation
 */
export async function createGitCheckpoint(projectSlug) {
  const spinner = ora('Creating git checkpoint...').start();

  try {
    const { execSync } = await import('child_process');

    // Check if in git repo
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    } catch {
      spinner.info('Not a git repository, skipping checkpoint');
      return null;
    }

    // Create checkpoint commit if there are changes
    const status = execSync('git status --porcelain', {
      encoding: 'utf8',
    }).trim();

    if (status) {
      // Stash any uncommitted changes
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const stashName = `gtask-phase-dev-${projectSlug}-${timestamp}`;

      execSync(`git stash push -m "${stashName}"`, { stdio: 'ignore' });
      spinner.succeed(`Created checkpoint: ${stashName}`);

      return stashName;
    } else {
      spinner.info('No uncommitted changes to checkpoint');
      return null;
    }
  } catch (error) {
    spinner.warn(`Checkpoint skipped: ${error.message}`);
    return null;
  }
}
