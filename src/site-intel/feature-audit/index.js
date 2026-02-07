/**
 * Feature Audit - Barrel Exports
 *
 * Full-stack feature truth verification system.
 * Maps CCASP planning hierarchy (Epic → Roadmap → Phase → Task) to
 * verifiable features and checks 6 truth dimensions per feature.
 */

// Feature Mapper - Planning hierarchy to feature list
export { mapPlanningToFeatures, getRecencyMultiplier } from './feature-mapper.js';

// Truth Verifier - 6-dimension verification engine
export { verifyFeature, verifyAllFeatures } from './truth-verifier.js';

// Confidence Scorer - Score calculation with recency multiplier
export {
  calculateConfidence,
  scoreAllFeatures,
  calculateRollup,
  calculateRoadmapRollups,
  calculatePhaseRollups,
  SCORING,
  MAX_SCORE,
} from './confidence-scorer.js';

// Gap Analyzer - Gap detection and prioritization
export { analyzeGaps, getGapsSorted, generateRecommendations } from './gap-analyzer.js';

// Contract Test Generator - Backend API contract tests
export { generateContractTest, writeContractTest, generateAllContractTests } from './contract-test-generator.js';

// State Manager - Persistence
export {
  loadState as loadFeatureAuditState,
  saveState as saveFeatureAuditState,
  initializeState as initializeFeatureAuditState,
  pushHistory,
  calculateSummary,
  getStateFilePath as getFeatureAuditStatePath,
} from './state-manager.js';

/**
 * Run a full feature audit
 *
 * This is the main entry point. It:
 * 1. Maps planning hierarchy to features
 * 2. Verifies all 6 truth dimensions per feature
 * 3. Calculates confidence scores with recency multiplier
 * 4. Analyzes gaps and generates recommendations
 * 5. Saves state to disk
 *
 * @param {string} projectRoot - Project root path
 * @param {Object} options - Audit options
 * @param {Array} options.routeCatalog - Route catalog from dev-scan (optional, built if not provided)
 * @param {Object} options.techStack - Tech stack config (optional, loaded from tech-stack.json)
 * @param {string} options.epicSlug - Filter to specific epic
 * @param {string} options.roadmapSlug - Filter to specific roadmap
 * @param {boolean} options.generateTests - Auto-generate missing contract tests
 * @returns {Object} Full audit result with features, summary, gaps, and test recommendations
 */
export async function runFeatureAudit(projectRoot, options = {}) {
  const { mapPlanningToFeatures } = await import('./feature-mapper.js');
  const { verifyAllFeatures } = await import('./truth-verifier.js');
  const { scoreAllFeatures } = await import('./confidence-scorer.js');
  const { analyzeGaps, getGapsSorted, generateRecommendations } = await import('./gap-analyzer.js');
  const { generateAllContractTests, writeContractTest } = await import('./contract-test-generator.js');
  const { loadState, saveState, initializeState, pushHistory, calculateSummary } = await import('./state-manager.js');

  // Load or build route catalog
  let routeCatalog = options.routeCatalog || null;
  if (!routeCatalog) {
    try {
      const { buildRouteCatalog } = await import('../dev-scan/route-catalog.js');
      const catalogResult = buildRouteCatalog(projectRoot);
      routeCatalog = catalogResult.routes || [];
    } catch {
      routeCatalog = [];
    }
  }

  // Load tech stack
  let techStack = options.techStack || null;
  if (!techStack) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const tsPath = path.join(projectRoot, 'tech-stack.json');
      if (fs.existsSync(tsPath)) {
        techStack = JSON.parse(fs.readFileSync(tsPath, 'utf8'));
      }
    } catch {
      techStack = {};
    }
  }

  // Step 1: Map planning hierarchy to features
  const { features, source } = mapPlanningToFeatures(projectRoot, {
    epicSlug: options.epicSlug,
    roadmapSlug: options.roadmapSlug,
  });

  if (features.length === 0) {
    return {
      success: true,
      features: [],
      source,
      summary: calculateSummary([]),
      gaps: [],
      recommendations: [],
      message: 'No features found in planning hierarchy. Run /phase-dev-plan or /vision-init first.',
    };
  }

  // Step 2: Verify truth dimensions
  const config = { projectRoot, routeCatalog, techStack };
  const verified = verifyAllFeatures(features, config);

  // Step 3: Calculate confidence scores
  const scored = scoreAllFeatures(verified);

  // Step 4: Analyze gaps
  const analyzed = analyzeGaps(scored);
  const gaps = getGapsSorted(analyzed);
  const recommendations = generateRecommendations(gaps);

  // Step 5: Optionally generate contract tests
  const generatedTests = [];
  if (options.generateTests) {
    const testResults = generateAllContractTests(analyzed, projectRoot, techStack);
    for (const result of testResults) {
      if (result.success) {
        const written = writeContractTest(result, projectRoot);
        generatedTests.push(written);
      }
    }
  }

  // Step 6: Calculate summary
  const summary = calculateSummary(analyzed);

  // Step 7: Save state
  let existingState = loadState(projectRoot);
  if (existingState) {
    pushHistory(existingState);
  } else {
    existingState = initializeState(projectRoot);
  }

  existingState.source = source;
  existingState.features = analyzed;
  existingState.summary = summary;
  const saveResult = saveState(projectRoot, existingState);

  return {
    success: true,
    features: analyzed,
    source,
    summary,
    gaps,
    recommendations,
    generatedTests,
    stateSaved: saveResult.success,
    statePath: saveResult.path,
  };
}
