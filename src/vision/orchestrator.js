/**
 * Vision Mode Orchestrator (Phase 7)
 *
 * Central coordinator that integrates all Vision Mode subsystems into a
 * unified workflow for autonomous MVP development.
 *
 * Architecture:
 *   VISION (L0+) → EPIC (L0) → ROADMAP (L1) → PHASE-DEV (L2) → TASKS (L3)
 *
 * Workflow Stages:
 *   1. INITIALIZATION - Parse prompt, create vision, detect accounts/tools
 *   2. ANALYSIS - Web search, tool discovery, MCP matching
 *   3. ARCHITECTURE - Generate diagrams, API contracts, state design
 *   4. PLANNING - Create Epic → Roadmaps → Phases → Tasks
 *   5. SECURITY - Scan dependencies before installation
 *   6. EXECUTION - Autonomous loop with self-healing
 *   7. VALIDATION - Test verification, MVP completion check
 *   8. COMPLETION - Generate final report, cleanup
 *
 * @module vision/orchestrator
 */

import { VisionStatus, createVision, updateVisionStatus, calculateVisionCompletion } from './schema.js';
import { loadVision, saveVision, createAndSaveVision, updateVision, createVisionCheckpoint } from './state-manager.js';
import { parseVisionPrompt, estimateComplexity, detectIntent, extractFeatures } from './parser.js';
import { createSpecializedAgent, registerAgent, allocateAgentContext, getAgentForDomain } from './agent-factory.js';
import { observeProgress, calculateAlignment, formatDriftReport } from './observer.js';

// Analysis subsystem
import {
  searchSimilarApps,
  searchUIPatterns,
  searchOpenSourceTools
} from './analysis/index.js';

import {
  discoverNpmPackages,
  discoverPipPackages,
  rankByRelevance
} from './analysis/tool-discovery.js';

import {
  matchMCPServers,
  getMCPCapabilities
} from './analysis/mcp-matcher.js';

import {
  detectAccountRequirements,
  generateSetupChecklist
} from './analysis/account-detector.js';

// Architecture subsystem
import {
  generateComponentDiagram,
  generateDataFlowDiagram,
  generateSequenceDiagram
} from './architecture/index.js';

import {
  generateRESTEndpoints,
  formatOpenAPISpec
} from './architecture/api-contracts.js';

import {
  designStores,
  generateStateShape
} from './architecture/state-design.js';

// Security subsystem
import {
  scanPackages,
  mergeVulnerabilities,
  identifyBlockedPackages,
  generateSecurityReport,
  shouldBlockInstall
} from './security/index.js';

// Autonomous subsystem
import {
  runAutonomousLoop,
  executeNextTasks,
  checkProgress,
  shouldContinue
} from './autonomous/index.js';

import {
  runTests,
  generateTestReport
} from './autonomous/test-validator.js';

import {
  verifyMVPComplete,
  generateCompletionReport
} from './autonomous/completion-verifier.js';

// UI subsystem
import {
  generateASCIIWireframe,
  extractComponentList
} from './ui/index.js';

/**
 * Orchestrator configuration defaults
 */
const DEFAULT_CONFIG = {
  // Security settings
  security: {
    enabled: true,
    blockThreshold: 'high',      // Block critical and high severity
    scanOnInstall: true,
    allowOverride: false
  },

  // Analysis settings
  analysis: {
    webSearchEnabled: true,
    maxSimilarApps: 5,
    maxToolSuggestions: 10,
    mcpMatchingEnabled: true
  },

  // Autonomous execution settings
  autonomous: {
    enabled: true,
    maxIterations: 100,
    selfHealingEnabled: true,
    escalationThreshold: 3        // Retry count before escalating
  },

  // Observer settings
  observer: {
    enabled: true,
    driftCheckInterval: 5,        // Check drift every N tasks
    autoAdjust: true,
    replanThreshold: 0.60         // Trigger replan below 60% alignment
  },

  // Agent settings
  agents: {
    maxConcurrent: 3,
    defaultContextBudget: 50000,
    autoDecommission: true
  }
};

/**
 * Orchestration stages
 */
export const OrchestratorStage = {
  INITIALIZATION: 'initialization',
  ANALYSIS: 'analysis',
  ARCHITECTURE: 'architecture',
  PLANNING: 'planning',
  SECURITY: 'security',
  EXECUTION: 'execution',
  VALIDATION: 'validation',
  COMPLETION: 'completion',
  PAUSED: 'paused',
  FAILED: 'failed'
};

/**
 * Vision Mode Orchestrator
 */
export class VisionOrchestrator {
  /**
   * Create a new orchestrator instance
   * @param {string} projectRoot - Project root directory
   * @param {Object} config - Configuration overrides
   */
  constructor(projectRoot, config = {}) {
    this.projectRoot = projectRoot;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.vision = null;
    this.stage = null;
    this.stageHistory = [];
    this.analysisResults = null;
    this.architectureArtifacts = null;
    this.securityResults = null;
    this.agents = new Map();
    this.logs = [];
  }

  /**
   * Log a message with timestamp
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  log(level, message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      stage: this.stage,
      message,
      data
    };
    this.logs.push(entry);

    const prefix = `[${level.toUpperCase()}] [${this.stage || 'init'}]`;
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Transition to a new stage
   * @param {string} newStage - New stage name
   */
  transitionStage(newStage) {
    const previousStage = this.stage;
    this.stage = newStage;
    this.stageHistory.push({
      from: previousStage,
      to: newStage,
      timestamp: new Date().toISOString()
    });
    this.log('info', `Stage transition: ${previousStage || 'null'} → ${newStage}`);
  }

  /**
   * Initialize a new vision from a prompt
   * @param {string} prompt - Natural language prompt
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(prompt, options = {}) {
    this.transitionStage(OrchestratorStage.INITIALIZATION);

    try {
      this.log('info', 'Parsing vision prompt...');

      // Parse the prompt
      const parsedPrompt = parseVisionPrompt(prompt);
      const complexity = estimateComplexity(parsedPrompt);
      const intent = detectIntent(prompt);
      const features = extractFeatures(prompt);

      this.log('info', `Detected intent: ${intent}`, {
        complexity,
        featureCount: features.length
      });

      // Generate title from prompt
      const title = options.title || this.generateTitleFromPrompt(prompt);

      // Create and save vision
      const visionResult = await createAndSaveVision(this.projectRoot, {
        title,
        prompt,
        tags: options.tags || [],
        priority: options.priority || 'medium'
      });

      if (!visionResult.success) {
        throw new Error(`Failed to create vision: ${visionResult.error}`);
      }

      this.vision = visionResult.vision;

      // Update vision with parsed data
      await updateVision(this.projectRoot, this.vision.slug, (vision) => {
        vision.prompt = parsedPrompt;
        vision.metadata.estimated_complexity = complexity;
        vision.metadata.detected_intent = intent;
        vision.metadata.features = features;
        vision.orchestrator = {
          stage: this.stage,
          config: this.config,
          stage_history: this.stageHistory
        };
        return vision;
      });

      // Detect account requirements
      this.log('info', 'Detecting account requirements...');
      const accountRequirements = detectAccountRequirements(parsedPrompt);

      if (accountRequirements.accounts.length > 0) {
        this.log('info', `Detected ${accountRequirements.accounts.length} account requirements`, accountRequirements.accounts);

        await updateVision(this.projectRoot, this.vision.slug, (vision) => {
          vision.requirements = vision.requirements || {};
          vision.requirements.accounts = accountRequirements;
          return vision;
        });
      }

      // Generate setup checklist
      const setupChecklist = generateSetupChecklist(accountRequirements);

      // Reload vision
      this.vision = await loadVision(this.projectRoot, this.vision.slug);

      return {
        success: true,
        stage: this.stage,
        vision: this.vision,
        parsed: parsedPrompt,
        complexity,
        intent,
        features,
        accountRequirements,
        setupChecklist
      };

    } catch (error) {
      this.log('error', `Initialization failed: ${error.message}`);
      this.transitionStage(OrchestratorStage.FAILED);
      return {
        success: false,
        error: error.message,
        stage: this.stage
      };
    }
  }

  /**
   * Run analysis phase
   * @returns {Promise<Object>} Analysis results
   */
  async analyze() {
    this.transitionStage(OrchestratorStage.ANALYSIS);

    if (!this.vision) {
      throw new Error('Vision not initialized. Call initialize() first.');
    }

    try {
      const results = {
        similarApps: [],
        uiPatterns: [],
        npmPackages: [],
        pipPackages: [],
        mcpServers: [],
        toolRecommendations: []
      };

      const prompt = this.vision.prompt;
      const features = this.vision.metadata?.features || [];

      // Web search for similar apps (if enabled)
      if (this.config.analysis.webSearchEnabled) {
        this.log('info', 'Searching for similar apps...');
        results.similarApps = await searchSimilarApps(
          prompt.summary || this.vision.title,
          this.config.analysis.maxSimilarApps
        );

        this.log('info', 'Searching for UI patterns...');
        results.uiPatterns = await searchUIPatterns(
          features,
          prompt.intent
        );
      }

      // Discover npm packages
      this.log('info', 'Discovering npm packages...');
      results.npmPackages = await discoverNpmPackages(
        features,
        this.config.analysis.maxToolSuggestions
      );

      // Discover pip packages (if Python detected)
      if (prompt.technologies?.includes('python') || prompt.technologies?.includes('fastapi')) {
        this.log('info', 'Discovering pip packages...');
        results.pipPackages = await discoverPipPackages(
          features,
          this.config.analysis.maxToolSuggestions
        );
      }

      // Match MCP servers (if enabled)
      if (this.config.analysis.mcpMatchingEnabled) {
        this.log('info', 'Matching MCP servers...');
        results.mcpServers = await matchMCPServers(features);

        // Get capabilities for matched servers
        for (const server of results.mcpServers) {
          server.capabilities = await getMCPCapabilities(server.name);
        }
      }

      // Rank and combine tool recommendations
      const allTools = [
        ...results.npmPackages.map(p => ({ ...p, type: 'npm' })),
        ...results.pipPackages.map(p => ({ ...p, type: 'pip' })),
        ...results.mcpServers.map(s => ({ ...s, type: 'mcp' }))
      ];

      results.toolRecommendations = rankByRelevance(allTools, features);

      // Save analysis results
      this.analysisResults = results;

      await updateVision(this.projectRoot, this.vision.slug, (vision) => {
        vision.analysis = results;
        vision.orchestrator.stage = this.stage;
        return vision;
      });

      this.vision = await loadVision(this.projectRoot, this.vision.slug);

      this.log('info', 'Analysis complete', {
        similarApps: results.similarApps.length,
        npmPackages: results.npmPackages.length,
        pipPackages: results.pipPackages.length,
        mcpServers: results.mcpServers.length
      });

      return {
        success: true,
        stage: this.stage,
        results
      };

    } catch (error) {
      this.log('error', `Analysis failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        stage: this.stage
      };
    }
  }

  /**
   * Run architecture phase
   * @returns {Promise<Object>} Architecture artifacts
   */
  async architect() {
    this.transitionStage(OrchestratorStage.ARCHITECTURE);

    if (!this.vision) {
      throw new Error('Vision not initialized. Call initialize() first.');
    }

    try {
      const artifacts = {
        diagrams: {},
        apiContracts: null,
        stateDesign: null,
        wireframes: null,
        componentList: []
      };

      const prompt = this.vision.prompt;
      const features = this.vision.metadata?.features || [];

      // Generate component diagram
      this.log('info', 'Generating component diagram...');
      artifacts.diagrams.component = await generateComponentDiagram({
        title: this.vision.title,
        features,
        technologies: prompt.technologies || []
      });

      // Generate data flow diagram
      this.log('info', 'Generating data flow diagram...');
      artifacts.diagrams.dataFlow = await generateDataFlowDiagram({
        features,
        intent: prompt.intent
      });

      // Generate sequence diagrams for key flows
      this.log('info', 'Generating sequence diagrams...');
      artifacts.diagrams.sequences = [];
      for (const feature of features.slice(0, 3)) { // Top 3 features
        const sequence = await generateSequenceDiagram({
          feature: feature.name || feature,
          actors: ['User', 'Frontend', 'Backend', 'Database']
        });
        artifacts.diagrams.sequences.push({
          feature: feature.name || feature,
          diagram: sequence
        });
      }

      // Generate REST endpoints if backend detected
      if (prompt.technologies?.some(t =>
        ['fastapi', 'express', 'django', 'flask', 'nest'].includes(t?.toLowerCase())
      )) {
        this.log('info', 'Generating API contracts...');
        const endpoints = await generateRESTEndpoints(features);
        artifacts.apiContracts = formatOpenAPISpec({
          title: this.vision.title,
          endpoints
        });
      }

      // Generate state design if frontend detected
      if (prompt.technologies?.some(t =>
        ['react', 'vue', 'angular', 'svelte'].includes(t?.toLowerCase())
      )) {
        this.log('info', 'Designing state management...');
        artifacts.stateDesign = {
          stores: await designStores(features),
          stateShape: await generateStateShape(features)
        };
      }

      // Generate ASCII wireframes
      this.log('info', 'Generating ASCII wireframes...');
      artifacts.wireframes = await generateASCIIWireframe({
        title: this.vision.title,
        features,
        layout: prompt.constraints?.layout || 'standard'
      });

      // Extract component list from wireframes
      artifacts.componentList = extractComponentList(artifacts.wireframes);

      // Save architecture artifacts
      this.architectureArtifacts = artifacts;

      await updateVision(this.projectRoot, this.vision.slug, (vision) => {
        vision.architecture = artifacts;
        vision.orchestrator.stage = this.stage;
        return vision;
      });

      this.vision = await loadVision(this.projectRoot, this.vision.slug);

      this.log('info', 'Architecture complete', {
        diagrams: Object.keys(artifacts.diagrams).length,
        hasApiContracts: !!artifacts.apiContracts,
        hasStateDesign: !!artifacts.stateDesign,
        componentCount: artifacts.componentList.length
      });

      return {
        success: true,
        stage: this.stage,
        artifacts
      };

    } catch (error) {
      this.log('error', `Architecture failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        stage: this.stage
      };
    }
  }

  /**
   * Run security scan phase
   * @returns {Promise<Object>} Security scan results
   */
  async scanSecurity() {
    this.transitionStage(OrchestratorStage.SECURITY);

    if (!this.config.security.enabled) {
      this.log('info', 'Security scanning disabled');
      return {
        success: true,
        stage: this.stage,
        skipped: true
      };
    }

    try {
      this.log('info', 'Running security scan...');

      // Run all available scanners
      const scanResults = await scanPackages(this.projectRoot);

      // Merge and deduplicate vulnerabilities
      const merged = mergeVulnerabilities(scanResults);

      // Identify blocked packages based on threshold
      const blocked = identifyBlockedPackages(
        merged,
        this.config.security.blockThreshold
      );

      // Generate report
      const report = generateSecurityReport(scanResults, {
        format: 'text',
        threshold: this.config.security.blockThreshold
      });

      this.securityResults = {
        scanResults,
        merged,
        blocked,
        report,
        hasBlockedPackages: blocked.length > 0
      };

      // Save security results
      await updateVision(this.projectRoot, this.vision.slug, (vision) => {
        vision.security = {
          lastScan: new Date().toISOString(),
          vulnerabilityCount: merged.length,
          blockedPackages: blocked,
          threshold: this.config.security.blockThreshold
        };
        vision.orchestrator.stage = this.stage;
        return vision;
      });

      this.vision = await loadVision(this.projectRoot, this.vision.slug);

      this.log('info', 'Security scan complete', {
        vulnerabilities: merged.length,
        blocked: blocked.length
      });

      // Warn if blocked packages found
      if (blocked.length > 0) {
        this.log('warn', `${blocked.length} package(s) blocked due to security vulnerabilities`);
        console.log('\n' + report);
      }

      return {
        success: true,
        stage: this.stage,
        results: this.securityResults
      };

    } catch (error) {
      this.log('error', `Security scan failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        stage: this.stage
      };
    }
  }

  /**
   * Check if a package should be blocked
   * @param {string} packageName - Package name to check
   * @returns {boolean} True if package should be blocked
   */
  isPackageBlocked(packageName) {
    if (!this.config.security.enabled || !this.securityResults) {
      return false;
    }

    return shouldBlockInstall(
      packageName,
      this.config.security.blockThreshold,
      this.securityResults.scanResults
    );
  }

  /**
   * Create specialized agents for the vision
   * @returns {Promise<Object>} Agent creation results
   */
  async createAgents() {
    if (!this.vision) {
      throw new Error('Vision not initialized. Call initialize() first.');
    }

    try {
      this.log('info', 'Creating specialized agents...');

      const features = this.vision.metadata?.features || [];
      const technologies = this.vision.prompt?.technologies || [];

      const createdAgents = [];

      // Determine which agents to create based on features and tech
      const agentSpecs = this.determineRequiredAgents(features, technologies);

      for (const spec of agentSpecs) {
        this.log('info', `Creating ${spec.domain} agent...`);

        const agent = await createSpecializedAgent(spec.domain, {
          visionSlug: this.vision.slug,
          features: spec.features,
          technologies: spec.technologies,
          contextBudget: this.config.agents.defaultContextBudget
        });

        // Register and allocate context
        registerAgent(agent);
        allocateAgentContext(agent, spec.contextBudget || this.config.agents.defaultContextBudget);

        this.agents.set(spec.domain, agent);
        createdAgents.push(agent);
      }

      // Save agent info to vision
      await updateVision(this.projectRoot, this.vision.slug, (vision) => {
        vision.agents = createdAgents.map(a => ({
          id: a.id,
          domain: a.domain,
          status: 'ready'
        }));
        return vision;
      });

      this.vision = await loadVision(this.projectRoot, this.vision.slug);

      this.log('info', `Created ${createdAgents.length} agents`);

      return {
        success: true,
        agents: createdAgents
      };

    } catch (error) {
      this.log('error', `Agent creation failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Determine which agents are needed
   * @param {Array} features - Features to implement
   * @param {Array} technologies - Technologies in use
   * @returns {Array} Agent specifications
   */
  determineRequiredAgents(features, technologies) {
    const specs = [];

    // Always create an orchestrator agent
    specs.push({
      domain: 'orchestrator',
      features: features.slice(0, 5),
      technologies,
      contextBudget: 100000
    });

    // Frontend agent if React/Vue/Angular detected
    if (technologies.some(t => ['react', 'vue', 'angular', 'svelte'].includes(t?.toLowerCase()))) {
      specs.push({
        domain: 'frontend',
        features: features.filter(f => f.type === 'ui' || f.name?.includes('ui')),
        technologies: technologies.filter(t => ['react', 'vue', 'angular', 'svelte', 'tailwind', 'css'].includes(t?.toLowerCase())),
        contextBudget: 75000
      });
    }

    // Backend agent if backend framework detected
    if (technologies.some(t => ['fastapi', 'express', 'django', 'flask', 'nest'].includes(t?.toLowerCase()))) {
      specs.push({
        domain: 'backend',
        features: features.filter(f => f.type === 'api' || f.name?.includes('api')),
        technologies: technologies.filter(t => ['fastapi', 'express', 'django', 'flask', 'nest', 'postgresql', 'mongodb'].includes(t?.toLowerCase())),
        contextBudget: 75000
      });
    }

    // Testing agent
    specs.push({
      domain: 'testing',
      features: features,
      technologies: technologies.filter(t => ['playwright', 'vitest', 'jest', 'pytest'].includes(t?.toLowerCase())),
      contextBudget: 50000
    });

    return specs;
  }

  /**
   * Run the execution phase
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async execute(options = {}) {
    this.transitionStage(OrchestratorStage.EXECUTION);

    if (!this.vision) {
      throw new Error('Vision not initialized. Call initialize() first.');
    }

    if (!this.config.autonomous.enabled) {
      this.log('info', 'Autonomous execution disabled');
      return {
        success: true,
        stage: this.stage,
        skipped: true,
        message: 'Manual execution required'
      };
    }

    try {
      this.log('info', 'Starting autonomous execution...');

      // Update vision status
      updateVisionStatus(this.vision, VisionStatus.EXECUTING);
      await saveVision(this.projectRoot, this.vision);

      // Create checkpoint before execution
      await createVisionCheckpoint(this.projectRoot, this.vision.slug, 'pre_execution');

      // Run autonomous loop
      const result = await runAutonomousLoop(this.vision, this.projectRoot);

      // Reload vision after execution
      this.vision = await loadVision(this.projectRoot, this.vision.slug);

      // Update orchestrator stage in vision
      await updateVision(this.projectRoot, this.vision.slug, (vision) => {
        vision.orchestrator.stage = this.stage;
        vision.orchestrator.execution_result = {
          success: result.success,
          reason: result.reason,
          iterations: result.iterations
        };
        return vision;
      });

      this.log('info', `Execution ${result.success ? 'completed' : 'stopped'}`, {
        reason: result.reason,
        iterations: result.iterations
      });

      return {
        success: result.success,
        stage: this.stage,
        result
      };

    } catch (error) {
      this.log('error', `Execution failed: ${error.message}`);

      // Update vision status
      updateVisionStatus(this.vision, VisionStatus.FAILED);
      await saveVision(this.projectRoot, this.vision);

      return {
        success: false,
        error: error.message,
        stage: this.stage
      };
    }
  }

  /**
   * Run validation phase
   * @returns {Promise<Object>} Validation result
   */
  async validate() {
    this.transitionStage(OrchestratorStage.VALIDATION);

    if (!this.vision) {
      throw new Error('Vision not initialized.');
    }

    try {
      this.log('info', 'Running validation...');

      // Update vision status
      updateVisionStatus(this.vision, VisionStatus.VALIDATING);
      await saveVision(this.projectRoot, this.vision);

      // Run tests
      this.log('info', 'Running tests...');
      const testResult = await runTests(this.vision, this.projectRoot);
      const testReport = generateTestReport(testResult);

      // Verify MVP completion
      this.log('info', 'Verifying MVP completion...');
      const verification = await verifyMVPComplete(this.vision, this.projectRoot);

      // Check progress
      const progress = await checkProgress(this.vision, this.projectRoot);

      // Calculate final completion
      calculateVisionCompletion(this.vision);

      const validationResult = {
        tests: {
          passed: testResult.success,
          report: testReport
        },
        mvp: {
          complete: verification.complete,
          missing: verification.missing || [],
          implemented: verification.implemented || []
        },
        progress,
        completion_percentage: this.vision.metadata?.completion_percentage || progress.completion_percentage
      };

      // Save validation results
      await updateVision(this.projectRoot, this.vision.slug, (vision) => {
        vision.validation = validationResult;
        vision.orchestrator.stage = this.stage;
        return vision;
      });

      this.vision = await loadVision(this.projectRoot, this.vision.slug);

      this.log('info', 'Validation complete', {
        testsPassed: testResult.success,
        mvpComplete: verification.complete,
        completion: validationResult.completion_percentage
      });

      return {
        success: true,
        stage: this.stage,
        result: validationResult
      };

    } catch (error) {
      this.log('error', `Validation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        stage: this.stage
      };
    }
  }

  /**
   * Complete the vision
   * @returns {Promise<Object>} Completion result
   */
  async complete() {
    this.transitionStage(OrchestratorStage.COMPLETION);

    if (!this.vision) {
      throw new Error('Vision not initialized.');
    }

    try {
      this.log('info', 'Generating completion report...');

      // Generate final completion report
      const completionReport = await generateCompletionReport(this.vision, this.projectRoot);

      // Update vision status
      updateVisionStatus(this.vision, VisionStatus.COMPLETED);

      // Save final state
      await updateVision(this.projectRoot, this.vision.slug, (vision) => {
        vision.orchestrator.stage = this.stage;
        vision.orchestrator.completed_at = new Date().toISOString();
        vision.orchestrator.final_report = completionReport;
        vision.orchestrator.logs = this.logs;
        return vision;
      });

      // Create final checkpoint
      await createVisionCheckpoint(this.projectRoot, this.vision.slug, 'completed');

      this.vision = await loadVision(this.projectRoot, this.vision.slug);

      this.log('info', 'Vision completed successfully');

      return {
        success: true,
        stage: this.stage,
        vision: this.vision,
        report: completionReport
      };

    } catch (error) {
      this.log('error', `Completion failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        stage: this.stage
      };
    }
  }

  /**
   * Observe progress and detect drift
   * @param {Object} update - Progress update event
   * @returns {Object} Observation result
   */
  observe(update) {
    if (!this.config.observer.enabled || !this.vision) {
      return { success: false, error: 'Observer not enabled or vision not initialized' };
    }

    const result = observeProgress(update, this.vision, this.projectRoot);

    if (result.success && result.observation.drift_severity !== 'none') {
      this.log('warn', 'Drift detected', {
        severity: result.observation.drift_severity,
        alignment: result.observation.alignment
      });

      // Format and log drift report
      const report = formatDriftReport(result.observation);
      console.log('\n' + report);

      // Check if replan needed
      if (result.observation.requires_replan) {
        this.log('warn', 'Vision replan required');
      }
    }

    return result;
  }

  /**
   * Run the full orchestration workflow
   * @param {string} prompt - Natural language prompt
   * @param {Object} options - Workflow options
   * @returns {Promise<Object>} Final result
   */
  async run(prompt, options = {}) {
    const results = {
      stages: {},
      success: false
    };

    try {
      // Stage 1: Initialize
      results.stages.initialization = await this.initialize(prompt, options);
      if (!results.stages.initialization.success) {
        return { ...results, error: results.stages.initialization.error };
      }

      // Stage 2: Analyze
      results.stages.analysis = await this.analyze();
      if (!results.stages.analysis.success) {
        this.log('warn', 'Analysis had errors, continuing...');
      }

      // Stage 3: Architect
      results.stages.architecture = await this.architect();
      if (!results.stages.architecture.success) {
        this.log('warn', 'Architecture had errors, continuing...');
      }

      // Stage 4: Security scan
      results.stages.security = await this.scanSecurity();
      if (results.stages.security.results?.hasBlockedPackages && !this.config.security.allowOverride) {
        this.log('error', 'Blocked packages detected, stopping execution');
        return {
          ...results,
          error: 'Security vulnerabilities detected. Review and resolve before continuing.',
          blockedPackages: results.stages.security.results.blocked
        };
      }

      // Stage 5: Create agents
      results.stages.agents = await this.createAgents();

      // Stage 6: Execute
      if (options.autoExecute !== false) {
        results.stages.execution = await this.execute(options);
      }

      // Stage 7: Validate
      if (results.stages.execution?.success) {
        results.stages.validation = await this.validate();
      }

      // Stage 8: Complete
      if (results.stages.validation?.success && results.stages.validation.result.mvp.complete) {
        results.stages.completion = await this.complete();
        results.success = true;
      }

      // Final result
      results.vision = this.vision;
      return results;

    } catch (error) {
      this.log('error', `Orchestration failed: ${error.message}`);
      this.transitionStage(OrchestratorStage.FAILED);

      return {
        ...results,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Resume from a saved vision
   * @param {string} visionSlug - Vision slug to resume
   * @returns {Promise<Object>} Resume result
   */
  async resume(visionSlug) {
    try {
      this.log('info', `Resuming vision: ${visionSlug}`);

      this.vision = await loadVision(this.projectRoot, visionSlug);

      if (!this.vision) {
        throw new Error(`Vision not found: ${visionSlug}`);
      }

      // Restore orchestrator state
      if (this.vision.orchestrator) {
        this.stage = this.vision.orchestrator.stage;
        this.stageHistory = this.vision.orchestrator.stage_history || [];
        this.config = { ...DEFAULT_CONFIG, ...this.vision.orchestrator.config };
      }

      // Restore analysis and architecture if available
      this.analysisResults = this.vision.analysis || null;
      this.architectureArtifacts = this.vision.architecture || null;
      this.securityResults = this.vision.security || null;

      this.log('info', `Resumed at stage: ${this.stage}`, {
        status: this.vision.status,
        completion: this.vision.metadata?.completion_percentage
      });

      return {
        success: true,
        vision: this.vision,
        stage: this.stage
      };

    } catch (error) {
      this.log('error', `Resume failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current status
   * @returns {Object} Current orchestrator status
   */
  getStatus() {
    return {
      stage: this.stage,
      vision: this.vision ? {
        slug: this.vision.slug,
        title: this.vision.title,
        status: this.vision.status,
        completion: this.vision.metadata?.completion_percentage || 0
      } : null,
      agents: Array.from(this.agents.keys()),
      stageHistory: this.stageHistory,
      config: this.config
    };
  }

  /**
   * Generate title from prompt
   * @param {string} prompt - User prompt
   * @returns {string} Generated title
   */
  generateTitleFromPrompt(prompt) {
    const firstSentence = prompt.split(/[.!?]/)[0]?.trim();

    if (firstSentence && firstSentence.length <= 60) {
      return firstSentence;
    }

    const truncated = prompt.substring(0, 50).trim();
    return truncated + (prompt.length > 50 ? '...' : '');
  }
}

/**
 * Create a new orchestrator instance
 * @param {string} projectRoot - Project root directory
 * @param {Object} config - Configuration overrides
 * @returns {VisionOrchestrator} Orchestrator instance
 */
export function createOrchestrator(projectRoot, config = {}) {
  return new VisionOrchestrator(projectRoot, config);
}

/**
 * Quick run - initialize and execute a vision in one call
 * @param {string} projectRoot - Project root directory
 * @param {string} prompt - Natural language prompt
 * @param {Object} options - Options
 * @returns {Promise<Object>} Result
 */
export async function quickRun(projectRoot, prompt, options = {}) {
  const orchestrator = createOrchestrator(projectRoot, options.config);
  return orchestrator.run(prompt, options);
}

export default {
  VisionOrchestrator,
  OrchestratorStage,
  createOrchestrator,
  quickRun,
  DEFAULT_CONFIG
};
