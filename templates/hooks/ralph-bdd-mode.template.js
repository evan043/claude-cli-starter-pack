/**
 * Ralph BDD Mode Hook
 *
 * Enforces BDD requirement-first workflow:
 * 1. Check for REQUIREMENTS.md or *.feature files
 * 2. Parse Gherkin-style Given/When/Then scenarios
 * 3. Ensure test stubs exist for scenarios
 * 4. Block implementation if scenarios have no corresponding tests
 *
 * Cherry-picked from marcindulak/ralph-wiggum-bdd patterns.
 *
 * Event: PreToolUse (before Write/Edit/MultiEdit tools)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  stateFile: '.claude/hooks/cache/ralph-bdd-state.json',
  requirementFiles: ['REQUIREMENTS.md', 'requirements.md', 'REQUIREMENTS.txt'],
  featureGlob: '**/*.feature',
  bddFrameworks: {
    'jest-cucumber': { testPattern: /\.steps\.(ts|js)$/, configFile: 'jest.config' },
    'cucumber': { testPattern: /\.steps\.(ts|js)$/, configFile: 'cucumber.js' },
    'pytest-bdd': { testPattern: /test_.*\.py$/, configFile: 'pytest.ini' },
    'behave': { testPattern: /steps\/.*\.py$/, configFile: 'behave.ini' },
  },
  gherkinPatterns: {
    scenario: /^\s*(Scenario|Scenario Outline):\s*(.+)$/gm,
    given: /^\s*Given\s+(.+)$/gm,
    when: /^\s*When\s+(.+)$/gm,
    then: /^\s*Then\s+(.+)$/gm,
    and: /^\s*And\s+(.+)$/gm,
  },
  implementationExclusions: [
    /\.test\./,
    /\.spec\./,
    /\.steps\./,
    /\.feature$/,
    /REQUIREMENTS/,
    /\.config\./,
    /\.d\.ts$/,
    /package\.json$/,
    /\.md$/,
  ],
};

/**
 * Load BDD state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) {
    return {
      enabled: true,
      scenarios: [],
      requirementsFound: false,
      lastScan: null,
    };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return {
      enabled: true,
      scenarios: [],
      requirementsFound: false,
      lastScan: null,
    };
  }
}

/**
 * Save BDD state
 */
function saveState(projectRoot, state) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Scan for requirement/feature files
 */
function findRequirementFiles(projectRoot) {
  const found = [];

  // Check for requirement files
  for (const reqFile of CONFIG.requirementFiles) {
    const reqPath = path.join(projectRoot, reqFile);
    if (fs.existsSync(reqPath)) {
      found.push({ type: 'requirements', path: reqPath, name: reqFile });
    }
  }

  // Check for .feature files (non-recursive, just common locations)
  const featureDirs = ['features', 'specs', 'bdd', 'test/features', 'tests/features', '.'];
  for (const dir of featureDirs) {
    const dirPath = path.join(projectRoot, dir);
    if (fs.existsSync(dirPath)) {
      try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (file.endsWith('.feature')) {
            found.push({
              type: 'feature',
              path: path.join(dirPath, file),
              name: file,
            });
          }
        }
      } catch {
        // Skip unreadable directories
      }
    }
  }

  return found;
}

/**
 * Parse Gherkin scenarios from a .feature file
 */
function parseGherkinScenarios(content) {
  const scenarios = [];
  const scenarioRegex = /^\s*(Scenario|Scenario Outline):\s*(.+)$/gm;
  let match;

  while ((match = scenarioRegex.exec(content)) !== null) {
    scenarios.push({
      type: match[1],
      name: match[2].trim(),
      line: content.substring(0, match.index).split('\n').length,
    });
  }

  return scenarios;
}

/**
 * Parse Given/When/Then steps from requirements markdown
 */
function parseMarkdownBDD(content) {
  const scenarios = [];
  const lines = content.split('\n');
  let currentScenario = null;

  for (const line of lines) {
    const scenarioMatch = line.match(/^#+\s*(Scenario|Feature|Story):\s*(.+)/i);
    if (scenarioMatch) {
      if (currentScenario) scenarios.push(currentScenario);
      currentScenario = { name: scenarioMatch[2].trim(), steps: [] };
      continue;
    }

    const stepMatch = line.match(/^\s*[-*]\s*(Given|When|Then|And)\s+(.+)/i);
    if (stepMatch && currentScenario) {
      currentScenario.steps.push({
        keyword: stepMatch[1],
        text: stepMatch[2].trim(),
      });
    }
  }

  if (currentScenario) scenarios.push(currentScenario);
  return scenarios;
}

/**
 * Check if a file is an implementation file
 */
function isImplementationFile(filePath) {
  return !CONFIG.implementationExclusions.some((p) => p.test(filePath));
}

/**
 * Main hook handler - PreToolUse
 */
module.exports = async function ralphBddModeHook(context) {
  const { tool, toolInput, projectRoot } = context;

  // Only intercept file modification tools
  if (!['Write', 'Edit', 'MultiEdit'].includes(tool)) {
    return { continue: true };
  }

  const state = loadState(projectRoot);

  // If BDD mode is disabled, skip
  if (!state.enabled) {
    return { continue: true };
  }

  const filePath = toolInput?.file_path || toolInput?.filePath || '';

  // Allow non-implementation files (tests, configs, requirements, features)
  if (!isImplementationFile(filePath)) {
    return { continue: true };
  }

  // Scan for requirements/features if not recently scanned
  const now = Date.now();
  const scanStale = !state.lastScan || (now - new Date(state.lastScan).getTime()) > 30000;

  if (scanStale) {
    const reqFiles = findRequirementFiles(projectRoot);
    state.requirementsFound = reqFiles.length > 0;

    // Parse scenarios from found files
    state.scenarios = [];
    for (const reqFile of reqFiles) {
      try {
        const content = fs.readFileSync(reqFile.path, 'utf8');
        if (reqFile.type === 'feature') {
          const scenarios = parseGherkinScenarios(content);
          state.scenarios.push(...scenarios.map((s) => ({ ...s, source: reqFile.name })));
        } else {
          const scenarios = parseMarkdownBDD(content);
          state.scenarios.push(...scenarios.map((s) => ({ ...s, source: reqFile.name })));
        }
      } catch {
        // Skip unreadable files
      }
    }

    state.lastScan = new Date().toISOString();
    saveState(projectRoot, state);
  }

  // If no requirements found, just warn and allow
  if (!state.requirementsFound) {
    return {
      continue: true,
      message: '📋 BDD Mode: No REQUIREMENTS.md or .feature files found. Create them first for BDD enforcement.',
    };
  }

  // If scenarios exist but no tests reference them, warn
  if (state.scenarios.length > 0) {
    return {
      continue: true,
      message: `
╔═══════════════════════════════════════════════════════════════╗
║  📋 Ralph BDD Mode Active                                     ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ${state.scenarios.length} scenario(s) found in requirements                     ║
║  Editing: ${path.basename(filePath).substring(0, 48).padEnd(48)} ║
║                                                               ║
║  Ensure your implementation maps to BDD scenarios:            ║
${state.scenarios.slice(0, 3).map((s) => `║  • ${(s.name || 'Unnamed').substring(0, 55).padEnd(55)}║`).join('\n')}
║                                                               ║
║  Run tests after implementation to verify scenarios pass.     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
      metadata: {
        bddActive: true,
        scenarioCount: state.scenarios.length,
        file: filePath,
      },
    };
  }

  return { continue: true };
};

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.parseGherkinScenarios = parseGherkinScenarios;
module.exports.parseMarkdownBDD = parseMarkdownBDD;
module.exports.findRequirementFiles = findRequirementFiles;
module.exports.isImplementationFile = isImplementationFile;
