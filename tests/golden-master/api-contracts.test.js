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
