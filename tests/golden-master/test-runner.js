/**
 * Golden Master Test Runner
 *
 * Captures the current behavior of refactoring candidates before changes.
 * Run this before refactoring to establish baselines.
 * Run after refactoring to verify no regressions.
 *
 * Usage:
 *   node tests/golden-master/test-runner.js capture   # Capture golden masters
 *   node tests/golden-master/test-runner.js verify    # Verify against golden masters
 *   node tests/golden-master/test-runner.js           # Run both
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GOLDEN_DIR = join(__dirname, 'snapshots');
const RESULTS = { passed: 0, failed: 0, errors: [] };

// Ensure snapshot directory exists
if (!existsSync(GOLDEN_DIR)) {
  mkdirSync(GOLDEN_DIR, { recursive: true });
}

/**
 * Test utilities
 */
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

function saveSnapshot(name, data) {
  const path = join(GOLDEN_DIR, `${name}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2));
  log(`  Captured: ${name}`, 'success');
}

function loadSnapshot(name) {
  const path = join(GOLDEN_DIR, `${name}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function verifySnapshot(name, current) {
  const saved = loadSnapshot(name);
  if (!saved) {
    log(`  No snapshot found for: ${name}`, 'warning');
    return null;
  }

  // Ignore capturedAt timestamps when comparing (they always differ between runs)
  const savedComparable = { ...saved, capturedAt: undefined };
  const currentComparable = { ...current, capturedAt: undefined };

  if (deepEqual(savedComparable, currentComparable)) {
    RESULTS.passed++;
    log(`  ✓ ${name}`, 'success');
    return true;
  } else {
    RESULTS.failed++;
    RESULTS.errors.push({ name, expected: savedComparable, actual: currentComparable });
    log(`  ✗ ${name} - MISMATCH`, 'error');
    return false;
  }
}

/**
 * Extract function signature from a function
 */
function getFunctionSignature(fn) {
  if (typeof fn !== 'function') return null;

  const str = fn.toString();
  const match = str.match(/^(?:async\s+)?function\s*(\w*)\s*\(([^)]*)\)/);
  if (match) {
    return {
      name: match[1] || 'anonymous',
      params: match[2].split(',').map(p => p.trim()).filter(Boolean),
      isAsync: str.startsWith('async')
    };
  }

  // Arrow function
  const arrowMatch = str.match(/^(?:async\s+)?\(([^)]*)\)\s*=>/);
  if (arrowMatch) {
    return {
      name: 'arrow',
      params: arrowMatch[1].split(',').map(p => p.trim()).filter(Boolean),
      isAsync: str.startsWith('async')
    };
  }

  return { name: 'unknown', params: [], isAsync: false };
}

/**
 * Capture module exports structure
 */
function captureModuleStructure(modulePath, exports) {
  const structure = {
    path: modulePath,
    capturedAt: new Date().toISOString(),
    exports: {}
  };

  for (const [key, value] of Object.entries(exports)) {
    if (typeof value === 'function') {
      structure.exports[key] = {
        type: 'function',
        ...getFunctionSignature(value)
      };
    } else if (typeof value === 'object' && value !== null) {
      structure.exports[key] = {
        type: Array.isArray(value) ? 'array' : 'object',
        keys: Object.keys(value),
        length: Array.isArray(value) ? value.length : Object.keys(value).length
      };
    } else {
      structure.exports[key] = {
        type: typeof value,
        value: value
      };
    }
  }

  return structure;
}

/**
 * Test suites for each refactoring candidate
 */
const TEST_SUITES = [
  {
    name: 'claude-settings',
    modulePath: '../../src/commands/claude-settings.js',
    tests: async (module) => {
      return captureModuleStructure('src/commands/claude-settings.js', module);
    }
  },
  {
    name: 'init',
    modulePath: '../../src/commands/init.js',
    tests: async (module) => {
      return captureModuleStructure('src/commands/init.js', module);
    }
  },
  {
    name: 'claude-audit',
    modulePath: '../../src/commands/claude-audit.js',
    tests: async (module) => {
      const structure = captureModuleStructure('src/commands/claude-audit.js', module);

      // Also capture ENHANCEMENT_TEMPLATES structure if exported
      if (module.ENHANCEMENT_TEMPLATES) {
        structure.enhancementTemplatesKeys = Object.keys(module.ENHANCEMENT_TEMPLATES);
      }

      return structure;
    }
  },
  {
    name: 'menu',
    modulePath: '../../src/cli/menu.js',
    tests: async (module) => {
      return captureModuleStructure('src/cli/menu.js', module);
    }
  },
  {
    name: 'setup-wizard',
    modulePath: '../../src/commands/setup-wizard.js',
    tests: async (module) => {
      return captureModuleStructure('src/commands/setup-wizard.js', module);
    }
  },
  {
    name: 'explore-mcp',
    modulePath: '../../src/commands/explore-mcp.js',
    tests: async (module) => {
      return captureModuleStructure('src/commands/explore-mcp.js', module);
    }
  },
  {
    name: 'detect-tech-stack',
    modulePath: '../../src/commands/detect-tech-stack.js',
    tests: async (module) => {
      return captureModuleStructure('src/commands/detect-tech-stack.js', module);
    }
  },
  // === Refactoring targets (added for ccasp-code-refactoring roadmap) ===
  {
    name: 'orchestrator',
    modulePath: '../../src/vision/orchestrator.js',
    tests: async (module) => {
      return captureModuleStructure('src/vision/orchestrator.js', module);
    }
  },
  {
    name: 'wizard-actions',
    modulePath: '../../src/commands/wizard/actions.js',
    tests: async (module) => {
      return captureModuleStructure('src/commands/wizard/actions.js', module);
    }
  },
  {
    name: 'phase-dev-templates',
    modulePath: '../../src/agents/phase-dev-templates.js',
    tests: async (module) => {
      return captureModuleStructure('src/agents/phase-dev-templates.js', module);
    }
  },
  {
    name: 'schema',
    modulePath: '../../src/roadmap/schema.js',
    tests: async (module) => {
      return captureModuleStructure('src/roadmap/schema.js', module);
    }
  },
  {
    name: 'roadmap-manager',
    modulePath: '../../src/roadmap/roadmap-manager.js',
    tests: async (module) => {
      return captureModuleStructure('src/roadmap/roadmap-manager.js', module);
    }
  },
  {
    name: 'intelligence',
    modulePath: '../../src/roadmap/intelligence.js',
    tests: async (module) => {
      return captureModuleStructure('src/roadmap/intelligence.js', module);
    }
  },
  {
    name: 'version-check',
    modulePath: '../../src/utils/version-check.js',
    tests: async (module) => {
      return captureModuleStructure('src/utils/version-check.js', module);
    }
  },
  {
    name: 'state-manager',
    modulePath: '../../src/agents/state-manager.js',
    tests: async (module) => {
      return captureModuleStructure('src/agents/state-manager.js', module);
    }
  },
  {
    name: 'generator',
    modulePath: '../../src/agents/generator.js',
    tests: async (module) => {
      return captureModuleStructure('src/agents/generator.js', module);
    }
  }
];

/**
 * Run capture mode - save current behavior as golden masters
 */
async function runCapture() {
  log('\n=== CAPTURING GOLDEN MASTERS ===\n', 'info');

  for (const suite of TEST_SUITES) {
    log(`\n${suite.name}:`, 'info');

    try {
      const module = await import(suite.modulePath);
      const result = await suite.tests(module);
      saveSnapshot(suite.name, result);
    } catch (error) {
      log(`  Error: ${error.message}`, 'error');
    }
  }

  log('\n=== CAPTURE COMPLETE ===\n', 'success');
}

/**
 * Run verify mode - compare current behavior to golden masters
 */
async function runVerify() {
  log('\n=== VERIFYING AGAINST GOLDEN MASTERS ===\n', 'info');

  for (const suite of TEST_SUITES) {
    log(`\n${suite.name}:`, 'info');

    try {
      const module = await import(suite.modulePath);
      const current = await suite.tests(module);
      verifySnapshot(suite.name, current);
    } catch (error) {
      RESULTS.failed++;
      RESULTS.errors.push({ name: suite.name, error: error.message });
      log(`  Error: ${error.message}`, 'error');
    }
  }

  // Print summary
  log('\n=== VERIFICATION SUMMARY ===', 'info');
  log(`Passed: ${RESULTS.passed}`, 'success');
  log(`Failed: ${RESULTS.failed}`, RESULTS.failed > 0 ? 'error' : 'success');

  if (RESULTS.errors.length > 0) {
    log('\nFailure Details:', 'error');
    for (const err of RESULTS.errors) {
      log(`\n  ${err.name}:`, 'error');
      if (err.error) {
        log(`    Error: ${err.error}`, 'error');
      } else {
        log(`    Expected: ${JSON.stringify(err.expected, null, 2).substring(0, 200)}...`, 'warning');
        log(`    Actual: ${JSON.stringify(err.actual, null, 2).substring(0, 200)}...`, 'warning');
      }
    }
  }

  return RESULTS.failed === 0;
}

/**
 * Main entry point
 */
async function main() {
  const mode = process.argv[2] || 'both';

  log('Golden Master Test Runner', 'info');
  log('========================', 'info');

  if (mode === 'capture' || mode === 'both') {
    await runCapture();
  }

  if (mode === 'verify' || mode === 'both') {
    const success = await runVerify();
    if (!success) {
      process.exit(1);
    }
  }
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'error');
  process.exit(1);
});
