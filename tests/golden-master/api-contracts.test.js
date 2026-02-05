/**
 * API Contract Tests (Golden Master)
 *
 * Captures the public API of all refactoring candidates.
 * These tests ensure refactoring doesn't break consumers.
 *
 * Usage:
 *   node tests/golden-master/api-contracts.test.js capture
 *   node tests/golden-master/api-contracts.test.js verify
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SNAPSHOT_DIR = join(__dirname, 'snapshots');

if (!existsSync(SNAPSHOT_DIR)) {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

// Colors for output
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

/**
 * Modules to test
 */
const MODULES = [
  {
    name: 'claude-settings',
    path: '../../src/commands/claude-settings.js',
    expectedExports: ['runClaudeSettings']
  },
  {
    name: 'init',
    path: '../../src/commands/init.js',
    expectedExports: ['runInit', 'verifyLegacyInstallation']
  },
  {
    name: 'claude-audit',
    path: '../../src/commands/claude-audit.js',
    expectedExports: ['runClaudeAudit', 'showClaudeAuditMenu', 'ENHANCEMENT_TEMPLATES', 'runEnhancement']
  },
  {
    name: 'menu',
    path: '../../src/cli/menu.js',
    expectedExports: [
      'showProjectSettingsMenu',
      'showMainMenu',
      'showHeader',
      'showSuccess',
      'showError',
      'showWarning',
      'showInfo'
    ]
  },
  {
    name: 'setup-wizard',
    path: '../../src/commands/setup-wizard.js',
    expectedExports: ['createBackup', 'runSetupWizard', 'generateSlashCommand']
  },
  {
    name: 'explore-mcp',
    path: '../../src/commands/explore-mcp.js',
    expectedExports: ['runExploreMcp', 'showExploreMcpMenu', 'showExploreMcpHelp']
  },
  {
    name: 'detect-tech-stack',
    path: '../../src/commands/detect-tech-stack.js',
    expectedExports: ['detectTechStack', 'runDetection']
  },
  {
    name: 'cli-flows-settings',
    path: '../../src/cli/flows/settings.js',
    expectedExports: ['showProjectSettingsMenu', 'configureGitHub', 'configureDeployment', 'configureTunnel', 'configureToken', 'configureHappy']
  },
  {
    name: 'roadmap-github-integration',
    path: '../../src/roadmap/github-integration.js',
    expectedExports: ['checkGhCli', 'getRepoInfo', 'fetchIssues', 'fetchProjectItems', 'getIssueDetails', 'formatIssueTable', 'parseSelection', 'createPhaseIssue', 'createRoadmapEpic', 'addProgressComment', 'closeIssue', 'syncToGitHub', 'createProjectIssue', 'generateProjectIssueBody', 'createRoadmapEpicAfterProjects', 'linkProjectsToEpic', 'updateProjectIssueTask', 'closeProjectIssue']
  },
  {
    name: 'vdb-decision-engine',
    path: '../../src/vdb/decision-engine.js',
    expectedExports: ['DecisionEngine', 'default']
  },
  {
    name: 'create-phase-dev-wizard',
    path: '../../src/commands/create-phase-dev/wizard.js',
    expectedExports: ['runWizard', 'promptEnhancements', 'promptWorkflowOptions', 'promptTestingConfig', 'promptL2ExplorationOptions']
  },
  {
    name: 'testing-config',
    path: '../../src/testing/config.js',
    expectedExports: ['TESTING_MODES', 'ENVIRONMENTS', 'CREDENTIAL_SOURCES', 'createTestingConfig', 'saveTestingConfig', 'loadTestingConfig', 'hasTestingConfig', 'generateTestingRules', 'saveTestingRules', 'getCredentials', 'validateConfig', 'getTestingConfigSummary', 'injectCredentialsToEnv', 'ensureEnvInGitignore', 'readCredentialsFromEnv', 'validateCredentialsExist', 'createEnvExample']
  },
  {
    name: 'init-command-templates',
    path: '../../src/commands/init/command-templates.js',
    expectedExports: ['COMMAND_TEMPLATES', 'getCommandTemplate', 'getCommandTemplateNames', 'hasCommandTemplate']
  },
  {
    name: 'roadmap',
    path: '../../src/commands/roadmap.js',
    expectedExports: ['runRoadmap', 'showRoadmapMenu']
  },
  {
    name: 'create-phase-dev-codebase-analyzer',
    path: '../../src/commands/create-phase-dev/codebase-analyzer.js',
    expectedExports: ['analyzeCodebase', 'generateStackSummary', 'displayAnalysisResults']
  },
  {
    name: 'agents-spawner',
    path: '../../src/agents/spawner.js',
    expectedExports: ['detectTaskDomain', 'generateL2Config', 'generateL3Config', 'parseCompletionReport', 'updateAgentInState', 'addAgentToState', 'initializeOrchestratorState', 'loadOrchestratorState', 'createCheckpoint', 'generateProjectL2Config', 'parseProjectL2Report', 'AGENT_CONFIGS', 'DOMAIN_KEYWORDS', 'PROJECT_L2_AGENT_TYPES', 'default']
  },
  {
    name: 'cli-flows-main',
    path: '../../src/cli/flows/main.js',
    expectedExports: ['showMainMenu']
  },
  {
    name: 'vision-agent-factory',
    path: '../../src/vision/agent-factory.js',
    expectedExports: ['DOMAIN_PATTERNS', 'createSpecializedAgent', 'generateAgentTemplate', 'updateExistingAgent', 'registerAgent', 'allocateAgentContext', 'getAgentForDomain', 'decommissionAgent', 'listAgents', 'createAgentRegistry', 'default']
  },
  {
    name: 'create-phase-dev-l2-orchestrator',
    path: '../../src/commands/create-phase-dev/l2-orchestrator.js',
    expectedExports: ['runL2Exploration', 'extractKeywords', 'aggregateExplorationResults', 'generatePhaseBreakdown', 'saveExplorationToMarkdown', 'default']
  },
  {
    name: 'explore-mcp-registry',
    path: '../../src/commands/explore-mcp/mcp-registry.js',
    expectedExports: ['MCP_REGISTRY', 'getAllMcps', 'getMcpsByCategory', 'getRecommendedMcps', 'getTestingMcps', 'searchMcps', 'getMcpById', 'getCategories', 'CORE_TESTING_MCPS', 'getCoreTestingMcps', 'mergeMcpResults', 'mcpRequiresApiKey', 'getMcpApiKeyInfo', 'getMcpsWithoutApiKeys', 'normalizeDiscoveredMcp']
  },
  {
    name: 'roadmap-multi-project-builder',
    path: '../../src/roadmap/multi-project-builder.js',
    expectedExports: ['runMultiProjectBuilder', 'displayProjectTable', 'editProjects', 'runDiscoveryPhase', 'default']
  },
  {
    name: 'github-epic-menu',
    path: '../../src/commands/github-epic-menu.js',
    expectedExports: ['showGitHubEpicMenu', 'runGitHubEpicMenu', 'listEpics', 'migrateToEpics']
  },
  {
    name: 'vision-state-manager',
    path: '../../src/vision/state-manager.js',
    expectedExports: ['getVisionDir', 'getVisionPath', 'ensureVisionDir', 'loadVision', 'saveVision', 'createAndSaveVision', 'listVisions', 'updateVision', 'deleteVision', 'transitionVisionStatus', 'getVisionStatus', 'createVisionCheckpoint', 'restoreVisionCheckpoint', 'listVisionCheckpoints', 'syncProgressHierarchy', 'completeTaskAndSync', 'default']
  },
  {
    name: 'dev-deploy',
    path: '../../src/commands/dev-deploy.js',
    expectedExports: ['runDevDeploy']
  },
  {
    name: 'create-roadmap',
    path: '../../src/commands/create-roadmap.js',
    expectedExports: ['runCreateRoadmap']
  },
  {
    name: 'pm-hierarchy-schema',
    path: '../../src/pm-hierarchy/schema.js',
    expectedExports: ['VISION_SCHEMA', 'EPIC_SCHEMA', 'ROADMAP_SCHEMA', 'PHASE_SCHEMA', 'TASK_SCHEMA', 'COMPLETION_TRACKING_SCHEMA', 'INTEGRATION_CONFIG_SCHEMA', 'DEFAULTS', 'validateEpic', 'validateVision', 'validateIntegrationConfig', 'createEmptyEpic', 'createEmptyVision', 'createEmptyCompletionTracking', 'createEmptyIntegrationConfig']
  },
  {
    name: 'config-github-config',
    path: '../../src/commands/config/github-config.js',
    expectedExports: ['DEFAULT_GITHUB_SETTINGS', 'loadGitHubSettings', 'saveGitHubSettings', 'configureGitHubSettings', 'generateGitHubSettingsUpdater']
  },
  {
    name: 'config-tech-stack-config',
    path: '../../src/commands/config/tech-stack-config.js',
    expectedExports: ['loadTechStack', 'saveTechStack', 'configureTechStackSettings']
  },
  {
    name: 'orchestration-progress-aggregator',
    path: '../../src/orchestration/progress-aggregator.js',
    expectedExports: ['HierarchyStatus', 'aggregateEpicProgress', 'aggregateRoadmapProgress', 'aggregatePhaseProgress', 'getProgressAtLevel', 'determineStatus', 'formatProgressSummary', 'calculateVelocity', 'closePhaseDevIssueIfComplete', 'closeRoadmapIssueIfComplete', 'closeEpicIssueIfComplete']
  },
  {
    name: 'vdb-board-sync',
    path: '../../src/vdb/board-sync.js',
    expectedExports: ['BoardSync', 'GitHubProjectAdapter', 'JiraAdapter', 'LocalAdapter', 'default']
  },
  {
    name: 'github-client',
    path: '../../src/github/client.js',
    expectedExports: ['isAuthenticated', 'getCurrentUser', 'listRepos', 'repoExists', 'getRepoInfo', 'listProjects', 'getProject', 'listProjectFields', 'getFieldOptions', 'getAllFieldOptions', 'createIssue', 'addIssueToProject', 'getProjectItemId', 'updateProjectItemField', 'listIssues', 'getIssue', 'addIssueComment', 'createPhaseIssue', 'createRoadmapIssues', 'updateIssueBody', 'closeIssue']
  },
  {
    name: 'phase-dev-completion-reporter',
    path: '../../src/phase-dev/completion-reporter.js',
    expectedExports: ['reportPhaseDevComplete', 'calculateCompletionMetrics', 'markPhaseDevComplete', 'getPhaseDevStatus', 'default']
  },
  {
    name: 'agents-templates',
    path: '../../src/agents/templates.js',
    expectedExports: ['generateHookTemplate', 'generateCommandTemplate', 'generateAgentTemplate', 'generateSkillTemplate', 'generateSkillContextReadme', 'generateSkillWorkflowsReadme', 'generateOrchestratorTemplate', 'HOOK_EVENT_TYPES', 'HOOK_TOOLS', 'COMPLEXITY_LEVELS', 'AGENT_LEVELS']
  },
  {
    name: 'panel',
    path: '../../src/commands/panel.js',
    expectedExports: ['runPanel', 'launchPanel', 'launchPanelInline']
  },
  {
    name: 'audit-helpers',
    path: '../../src/commands/audit/helpers.js',
    expectedExports: ['auditClaudeMdFiles', 'auditSingleClaudeMd', 'auditClaudeFolder', 'auditClaudeFolderContents', 'validateSkillOrAgent', 'validateJsonFile', 'checkCommonMisconfigurations', 'calculateOverallScore', 'displayAuditResults', 'showDetailedFixes', 'showBestPracticesReference', 'generateEnhancementSuggestions']
  },
  {
    name: 'create-agent',
    path: '../../src/commands/create-agent.js',
    expectedExports: ['runCreateAgent']
  },
  {
    name: 'analysis-competitor-analysis',
    path: '../../src/analysis/competitor-analysis.js',
    expectedExports: ['ANALYSIS_PHASES', 'SEARCH_PROVIDERS', 'SCRAPER_CONFIG', 'getReportDir', 'generateDiscoveryQueries', 'generateFeatureQueries', 'PRICING_PATTERNS', 'TECH_STACK_PATTERNS', 'createSwotAnalysis', 'createCompetitorProfile', 'generateFeatureGapMatrix', 'generateMarkdownReport', 'saveReport', 'loadAnalysis', 'createAnalysisPrompt', 'checkMcpAvailability', 'default']
  },
  {
    name: 'create-phase-dev-documentation-generator',
    path: '../../src/commands/create-phase-dev/documentation-generator.js',
    expectedExports: ['generatePhaseDevDocumentation', 'displayGenerationResults', 'generateBackendConfig', 'generatePhaseDevDocumentationWithL2', 'updateProgressWithExploration', 'createPhaseDevGitHubIssue', 'createGitCheckpoint']
  },
  {
    name: 'vision',
    path: '../../src/commands/vision.js',
    expectedExports: ['runVision', 'default']
  },
  {
    name: 'agents-generator-content-generators',
    path: '../../src/agents/generator/content-generators.js',
    expectedExports: ['getAgentContent']
  },
  {
    name: 'gtask-init',
    path: '../../src/commands/gtask-init.js',
    expectedExports: ['runGtaskInit', 'default']
  },
  {
    name: 'epic-state-manager',
    path: '../../src/epic/state-manager.js',
    expectedExports: ['initEpicDirectory', 'loadEpic', 'saveEpic', 'initEpicOrchestratorState', 'loadOrchestratorState', 'saveOrchestratorState', 'updateRoadmapStatus', 'updateRoadmapProgress', 'advanceToNextRoadmap', 'checkGatingRequirements', 'addActiveRoadmap', 'completeRoadmap', 'failRoadmap', 'updateTokenBudget', 'createCheckpoint', 'getEpicStatus', 'default']
  },
  {
    name: 'vision-ui-ascii-generator',
    path: '../../src/vision/ui/ascii-generator.js',
    expectedExports: ['generateComponentBox', 'generateNavbar', 'generateSidebar', 'generateForm', 'generateTable', 'generateCard', 'generateModal', 'generateLayoutGrid', 'generateASCIIWireframe', 'extractComponentList']
  },
  {
    name: 'explore-mcp-flows',
    path: '../../src/commands/explore-mcp/flows.js',
    expectedExports: ['runRecommendedFlow', 'runTestingFlow', 'runBrowseFlow', 'runSearchFlow', 'runInstalledFlow', 'runUpdateDocsFlow', 'showMcpDetails', 'runDiscoverFlow']
  },
  {
    name: 'vision-observer',
    path: '../../src/vision/observer.js',
    expectedExports: ['observeProgress', 'calculateAlignment', 'detectDrift', 'identifyDriftAreas', 'generateAdjustments', 'shouldTriggerReplan', 'formatDriftReport', 'default']
  },
  {
    name: 'roadmap-phase-generator',
    path: '../../src/roadmap/phase-generator.js',
    expectedExports: ['getPhasePlansDir', 'ensurePhasePlansDir', 'generatePhasePlan', 'generateAllPhasePlans', 'loadPhasePlan', 'updatePhasePlan', 'completeTask', 'getRoadmapProgress']
  },
  {
    name: 'templates-issue-body',
    path: '../../src/templates/issue-body.js',
    expectedExports: ['generateIssueBody', 'generateSimpleIssueBody', 'getAgentRecommendation', 'suggestAcceptanceCriteria']
  },
  {
    name: 'utils-smart-merge',
    path: '../../src/utils/smart-merge.js',
    expectedExports: ['getLocalAsset', 'getTemplateAsset', 'compareAssetVersions', 'generateDetailedDiff', 'getAssetsNeedingMerge', 'generateMergeExplanation', 'formatMergeOptions', 'getMergeAttentionCount', 'createBackup', 'listBackups', 'restoreBackup', 'default']
  },
  {
    name: 'vision-schema',
    path: '../../src/vision/schema.js',
    expectedExports: ['VisionStatus', 'VisionIntent', 'DriftSeverity', 'VISION_SCHEMA', 'createVision', 'generateSlug', 'validateVision', 'updateVisionStatus', 'calculateVisionCompletion', 'recordDriftEvent', 'updateAlignment', 'recordSecurityScan', 'addCreatedAgent', 'updateRoadmapProgress', 'default']
  },
  {
    name: 'github-issue-hierarchy-manager',
    path: '../../src/github/issue-hierarchy-manager.js',
    expectedExports: ['getGitHubConfig', 'createGitHubIssue', 'generateCcaspMeta', 'generateBreadcrumb', 'ensureEpicIssue', 'ensureRoadmapIssue', 'ensurePlanIssue', 'ensureHierarchyIssues', 'default']
  },
  {
    name: 'pm-hierarchy-integrations-linear-adapter',
    path: '../../src/pm-hierarchy/integrations/linear-adapter.js',
    expectedExports: ['LinearAdapter', 'createLinearAdapter']
  },
  {
    name: 'utils-template-engine',
    path: '../../src/utils/template-engine.js',
    expectedExports: ['loadAgentContext', 'findBestAgent', 'mergeAgentContext', 'replacePlaceholders', 'processFile', 'processDirectory', 'generateTechStack', 'flattenObject', 'extractPlaceholders', 'validateTechStack', 'default']
  },
  {
    name: 'init-features',
    path: '../../src/commands/init/features.js',
    expectedExports: ['OPTIONAL_FEATURES', 'AVAILABLE_COMMANDS', 'getFeatureByName', 'getCommandsForFeature', 'getDefaultFeatures']
  },
  {
    name: 'vision-analysis-account-detector',
    path: '../../src/vision/analysis/account-detector.js',
    expectedExports: ['detectAccountRequirements', 'generateSetupChecklist', 'generateEnvTemplate']
  },
  {
    name: 'utils-exploration-docs',
    path: '../../src/utils/exploration-docs.js',
    expectedExports: ['createExplorationDir', 'getExplorationDir', 'saveExplorationSummary', 'saveCodeSnippets', 'saveReferenceFiles', 'saveAgentDelegation', 'savePhaseBreakdown', 'generatePhaseBreakdownMarkdown', 'saveFindingsJson', 'loadExplorationDocs', 'explorationDocsExist', 'saveAllExplorationDocs', 'default']
  },
  {
    name: 'init-generators',
    path: '../../src/commands/init/generators.js',
    expectedExports: ['generateMenuCommand', 'generateStarterAgent', 'generateStarterSkill', 'generateStarterHook', 'generateUpdateCheckHook', 'generateSettingsJson', 'generateSettingsLocalJson', 'generateIndexFile', 'generateReadmeFile']
  },
  {
    name: 'agents-testing-scout',
    path: '../../src/agents/testing-scout.js',
    expectedExports: ['TESTING_TOOLS', 'FRAMEWORK_RECOMMENDATIONS', 'getInventoryPath', 'loadInventory', 'saveToInventory', 'classifyTechStack', 'getRecommendations', 'generateRecommendationTable', 'CONFIG_TEMPLATES', 'generateConfigFile', 'createScoutPrompt', 'default']
  },
  {
    name: 'sync',
    path: '../../src/commands/sync.js',
    expectedExports: ['runSync', 'saveTaskState', 'loadTaskState', 'loadAllTaskStates', 'updateTaskStatus']
  },
  {
    name: 'nvim-setup',
    path: '../../src/commands/nvim-setup.js',
    expectedExports: ['runNvimSetup', 'default']
  },
  {
    name: 'vision-orchestrators-planning',
    path: '../../src/vision/orchestrators/planning.js',
    expectedExports: ['plan', 'analyzeRoadmapBreakdown']
  },
  {
    name: 'pm-hierarchy-integration-wizard',
    path: '../../src/pm-hierarchy/integration-wizard.js',
    expectedExports: ['runIntegrationWizard', 'promptForIntegrations']
  },
  {
    name: 'vision-architecture-api-contracts',
    path: '../../src/vision/architecture/api-contracts.js',
    expectedExports: ['generateRESTEndpoints', 'generateRequestSchema', 'generateResponseSchema', 'formatOpenAPISpec']
  },
  {
    name: 'config-agent-config',
    path: '../../src/commands/config/agent-config.js',
    expectedExports: ['createAgentOnlyLauncher', 'generateAgentOnlyPolicy', 'generateAgentsJson', 'generateWindowsBatch', 'generatePowerShellLauncher', 'generateBashLauncher']
  },
  {
    name: 'create-phase-dev',
    path: '../../src/commands/create-phase-dev.js',
    expectedExports: ['runCreatePhaseDev', 'showPhasDevMainMenu']
  }
];

/**
 * Get function parameter names
 */
function getParamNames(fn) {
  const fnStr = fn.toString();
  const result = fnStr.match(/\(([^)]*)\)/);
  if (!result) return [];

  return result[1]
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      // Handle default values
      const [name] = p.split('=');
      return name.trim();
    });
}

/**
 * Capture API contract for a module
 */
async function captureContract(moduleInfo) {
  const contract = {
    name: moduleInfo.name,
    capturedAt: new Date().toISOString(),
    exports: {}
  };

  try {
    const mod = await import(moduleInfo.path);

    for (const key of Object.keys(mod)) {
      const value = mod[key];
      const exportInfo = { name: key };

      if (typeof value === 'function') {
        exportInfo.type = 'function';
        exportInfo.isAsync = value.constructor.name === 'AsyncFunction';
        exportInfo.params = getParamNames(value);
        exportInfo.length = value.length; // Number of expected arguments
      } else if (typeof value === 'object' && value !== null) {
        exportInfo.type = Array.isArray(value) ? 'array' : 'object';
        exportInfo.keys = Object.keys(value).slice(0, 20); // First 20 keys
        if (Array.isArray(value)) {
          exportInfo.length = value.length;
        }
      } else {
        exportInfo.type = typeof value;
      }

      contract.exports[key] = exportInfo;
    }

    return contract;
  } catch (error) {
    return {
      name: moduleInfo.name,
      error: error.message
    };
  }
}

/**
 * Capture all contracts
 */
async function captureAllContracts() {
  console.log(`\n${c.cyan}=== Capturing API Contracts ===${c.reset}\n`);

  const allContracts = {};

  for (const mod of MODULES) {
    console.log(`${c.dim}Capturing ${mod.name}...${c.reset}`);
    const contract = await captureContract(mod);

    if (contract.error) {
      console.log(`  ${c.red}✗ Error: ${contract.error}${c.reset}`);
    } else {
      const exportCount = Object.keys(contract.exports).length;
      console.log(`  ${c.green}✓ Captured ${exportCount} exports${c.reset}`);
      allContracts[mod.name] = contract;
    }
  }

  // Save combined snapshot
  const snapshotPath = join(SNAPSHOT_DIR, 'api-contracts.json');
  writeFileSync(snapshotPath, JSON.stringify(allContracts, null, 2));
  console.log(`\n${c.green}Saved to: ${snapshotPath}${c.reset}`);

  return allContracts;
}

/**
 * Verify contracts against snapshot
 */
async function verifyContracts() {
  console.log(`\n${c.cyan}=== Verifying API Contracts ===${c.reset}\n`);

  const snapshotPath = join(SNAPSHOT_DIR, 'api-contracts.json');

  if (!existsSync(snapshotPath)) {
    console.log(`${c.yellow}No snapshot found. Run with 'capture' first.${c.reset}`);
    return false;
  }

  const savedContracts = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
  let allPassed = true;
  let totalTests = 0;
  let passedTests = 0;

  for (const mod of MODULES) {
    console.log(`\n${mod.name}:`);
    const saved = savedContracts[mod.name];
    const current = await captureContract(mod);

    if (current.error) {
      console.log(`  ${c.red}✗ Module failed to load: ${current.error}${c.reset}`);
      allPassed = false;
      continue;
    }

    if (!saved) {
      console.log(`  ${c.yellow}⚠ No saved contract found${c.reset}`);
      continue;
    }

    // Check each expected export
    for (const expectedExport of mod.expectedExports) {
      totalTests++;
      const savedExport = saved.exports[expectedExport];
      const currentExport = current.exports[expectedExport];

      if (!currentExport) {
        console.log(`  ${c.red}✗ Missing export: ${expectedExport}${c.reset}`);
        allPassed = false;
        continue;
      }

      if (!savedExport) {
        console.log(`  ${c.yellow}⚠ New export (not in snapshot): ${expectedExport}${c.reset}`);
        passedTests++;
        continue;
      }

      // Compare types
      if (savedExport.type !== currentExport.type) {
        console.log(`  ${c.red}✗ ${expectedExport}: type changed from ${savedExport.type} to ${currentExport.type}${c.reset}`);
        allPassed = false;
        continue;
      }

      // For functions, check async status and param count
      if (savedExport.type === 'function') {
        if (savedExport.isAsync !== currentExport.isAsync) {
          console.log(`  ${c.red}✗ ${expectedExport}: async status changed${c.reset}`);
          allPassed = false;
          continue;
        }

        // Param count can increase (backward compatible) but not decrease
        if (currentExport.params.length < savedExport.params.length) {
          console.log(`  ${c.red}✗ ${expectedExport}: required params removed (breaking change)${c.reset}`);
          allPassed = false;
          continue;
        }
      }

      passedTests++;
      console.log(`  ${c.green}✓ ${expectedExport}${c.reset}`);
    }

    // Check for removed exports
    for (const savedKey of Object.keys(saved.exports)) {
      if (!current.exports[savedKey]) {
        console.log(`  ${c.red}✗ Removed export: ${savedKey} (breaking change)${c.reset}`);
        allPassed = false;
      }
    }
  }

  console.log(`\n${c.cyan}=== Summary ===${c.reset}`);
  console.log(`Tests: ${passedTests}/${totalTests} passed`);

  if (allPassed) {
    console.log(`${c.green}All API contracts verified successfully!${c.reset}`);
  } else {
    console.log(`${c.red}Some API contracts failed verification.${c.reset}`);
  }

  return allPassed;
}

/**
 * Main
 */
async function main() {
  const mode = process.argv[2] || 'both';

  console.log('API Contract Golden Master Tests');
  console.log('================================');

  if (mode === 'capture' || mode === 'both') {
    await captureAllContracts();
  }

  if (mode === 'verify' || mode === 'both') {
    const passed = await verifyContracts();
    if (!passed) {
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error(`${c.red}Fatal: ${err.message}${c.reset}`);
  process.exit(1);
});
