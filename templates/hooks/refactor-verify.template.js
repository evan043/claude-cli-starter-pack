/**
 * Refactor Verify Hook
 *
 * Automatically verifies refactoring changes after each Edit/Write operation.
 * Runs affected tests, checks golden master, validates imports.
 * Prevents silent behavior changes during refactoring.
 *
 * Event: PostToolUse (after Edit, Write operations)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  stateFile: '.claude/refactor-state.json',
  goldenMasterDir: '.claude/golden-master',
  // File patterns that trigger verification
  verifyPatterns: [
    /\.(ts|tsx|js|jsx)$/,
    /\.(py|pyw)$/,
    /\.(rs|go|java|cs)$/,
  ],
  // Files to skip
  skipPatterns: [
    /\.test\./,
    /\.spec\./,
    /\.mock\./,
    /__tests__/,
    /node_modules/,
    /\.d\.ts$/,
  ],
  // Test commands by extension
  testCommands: {
    ts: 'npx vitest run --reporter=json',
    tsx: 'npx vitest run --reporter=json',
    js: 'npx jest --json',
    jsx: 'npx jest --json',
    py: 'pytest --tb=short',
  },
  // Max time to wait for tests (ms)
  testTimeout: 60000,
};

/**
 * Load refactor state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) {
    return {
      active: false,
      transactionId: null,
      startedAt: null,
      files: [],
      verifications: [],
    };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { active: false };
  }
}

/**
 * Save refactor state
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
 * Check if file should be verified
 */
function shouldVerify(filePath) {
  // Skip test files and patterns
  if (CONFIG.skipPatterns.some((p) => p.test(filePath))) {
    return false;
  }
  // Verify source files matching patterns
  return CONFIG.verifyPatterns.some((p) => p.test(filePath));
}

/**
 * Find related test file
 */
function findTestFile(filePath, projectRoot) {
  const baseName = path.basename(filePath);
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const nameWithoutExt = baseName.replace(ext, '');

  // Common test file patterns
  const testPatterns = [
    `${nameWithoutExt}.test${ext}`,
    `${nameWithoutExt}.spec${ext}`,
    `${nameWithoutExt}.test.ts`,
    `${nameWithoutExt}.spec.ts`,
  ];

  // Check same directory
  for (const pattern of testPatterns) {
    const testPath = path.join(dir, pattern);
    if (fs.existsSync(path.join(projectRoot, testPath))) {
      return testPath;
    }
  }

  // Check __tests__ directory
  const testsDir = path.join(dir, '__tests__');
  for (const pattern of testPatterns) {
    const testPath = path.join(testsDir, pattern);
    if (fs.existsSync(path.join(projectRoot, testPath))) {
      return testPath;
    }
  }

  // Check tests/ directory at root
  for (const pattern of testPatterns) {
    const testPath = path.join('tests', pattern);
    if (fs.existsSync(path.join(projectRoot, testPath))) {
      return testPath;
    }
  }

  return null;
}

/**
 * Find golden master for file
 */
function findGoldenMaster(filePath, projectRoot) {
  const slug = filePath.replace(/\//g, '-').replace(/\\/g, '-');
  const masterDir = path.join(projectRoot, CONFIG.goldenMasterDir, slug);

  if (!fs.existsSync(masterDir)) {
    return null;
  }

  const manifestPath = path.join(projectRoot, CONFIG.goldenMasterDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return manifest.masters.filter((m) => m.file === filePath);
  } catch {
    return null;
  }
}

/**
 * Run tests for a file
 */
function runTests(testFile, projectRoot) {
  const ext = path.extname(testFile).slice(1);
  const testCommand = CONFIG.testCommands[ext];

  if (!testCommand) {
    return { success: true, skipped: true, reason: 'No test command for extension' };
  }

  try {
    const fullCommand = `${testCommand} ${testFile}`;
    execSync(fullCommand, {
      cwd: projectRoot,
      timeout: CONFIG.testTimeout,
      stdio: 'pipe',
    });
    return { success: true, passed: true };
  } catch (error) {
    return {
      success: false,
      passed: false,
      error: error.message,
      stdout: error.stdout?.toString(),
      stderr: error.stderr?.toString(),
    };
  }
}

/**
 * Verify golden master tests
 */
function verifyGoldenMaster(masters, projectRoot) {
  const results = [];

  for (const master of masters) {
    const specPath = path.join(
      projectRoot,
      CONFIG.goldenMasterDir,
      master.path.replace('.master.json', '.spec.ts')
    );

    if (!fs.existsSync(specPath)) {
      results.push({
        function: master.function,
        status: 'skipped',
        reason: 'No spec file found',
      });
      continue;
    }

    const testResult = runTests(specPath, projectRoot);
    results.push({
      function: master.function,
      status: testResult.passed ? 'passed' : 'failed',
      error: testResult.error,
    });
  }

  return results;
}

/**
 * Check for import errors after file changes
 */
function checkImports(filePath, projectRoot) {
  const ext = path.extname(filePath);

  // TypeScript/JavaScript - use tsc --noEmit
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    try {
      execSync(`npx tsc --noEmit ${filePath}`, {
        cwd: projectRoot,
        timeout: 30000,
        stdio: 'pipe',
      });
      return { valid: true };
    } catch (error) {
      const stderr = error.stderr?.toString() || '';
      // Extract import errors
      const importErrors = stderr
        .split('\n')
        .filter((line) => line.includes('Cannot find module') || line.includes('has no exported member'));

      if (importErrors.length > 0) {
        return { valid: false, errors: importErrors };
      }
      return { valid: true }; // Other errors, not import-related
    }
  }

  // Python - use mypy or just check syntax
  if (['.py', '.pyw'].includes(ext)) {
    try {
      execSync(`python -m py_compile ${filePath}`, {
        cwd: projectRoot,
        timeout: 10000,
        stdio: 'pipe',
      });
      return { valid: true };
    } catch (error) {
      return { valid: false, errors: [error.stderr?.toString()] };
    }
  }

  return { valid: true };
}

/**
 * Generate verification report
 */
function generateReport(filePath, testResult, goldenResult, importResult) {
  const issues = [];

  // Check test results
  if (testResult && !testResult.success && !testResult.skipped) {
    issues.push({
      type: 'test_failure',
      severity: 'high',
      message: `Tests failed for ${filePath}`,
      details: testResult.error,
    });
  }

  // Check golden master results
  if (goldenResult) {
    const failures = goldenResult.filter((r) => r.status === 'failed');
    if (failures.length > 0) {
      issues.push({
        type: 'golden_master_mismatch',
        severity: 'high',
        message: `Golden master verification failed for ${failures.length} function(s)`,
        details: failures.map((f) => `${f.function}: ${f.error}`).join(', '),
      });
    }
  }

  // Check import results
  if (importResult && !importResult.valid) {
    issues.push({
      type: 'import_error',
      severity: 'high',
      message: 'Import errors detected after edit',
      details: importResult.errors.join('\n'),
    });
  }

  return issues;
}

/**
 * Main hook handler
 */
module.exports = async function refactorVerifyHook(context) {
  const { tool, toolInput, toolOutput, projectRoot } = context;

  // Only process Edit and Write operations
  if (!['Edit', 'Write'].includes(tool)) {
    return { continue: true };
  }

  const filePath = toolInput?.file_path || '';

  // Skip if not a source file we care about
  if (!shouldVerify(filePath)) {
    return { continue: true };
  }

  // Load state
  const state = loadState(projectRoot);

  // Check if refactoring session is active
  if (!state.active) {
    // Not in refactoring mode - just track the change
    return { continue: true };
  }

  // Get relative path
  const relativePath = path.relative(projectRoot, filePath);

  // Track this file modification
  state.files.push({
    path: relativePath,
    timestamp: new Date().toISOString(),
    tool,
  });

  // Run verification checks
  const verification = {
    file: relativePath,
    timestamp: new Date().toISOString(),
    tests: null,
    goldenMaster: null,
    imports: null,
    issues: [],
  };

  // 1. Find and run related tests
  const testFile = findTestFile(relativePath, projectRoot);
  if (testFile) {
    verification.tests = runTests(testFile, projectRoot);
  }

  // 2. Check golden master if exists
  const goldenMasters = findGoldenMaster(relativePath, projectRoot);
  if (goldenMasters && goldenMasters.length > 0) {
    verification.goldenMaster = verifyGoldenMaster(goldenMasters, projectRoot);
  }

  // 3. Check imports are valid
  verification.imports = checkImports(filePath, projectRoot);

  // Generate report
  verification.issues = generateReport(
    relativePath,
    verification.tests,
    verification.goldenMaster,
    verification.imports
  );

  // Save verification result
  state.verifications.push(verification);
  saveState(projectRoot, state);

  // If issues found, alert the user
  if (verification.issues.length > 0) {
    const highSeverity = verification.issues.filter((i) => i.severity === 'high');

    if (highSeverity.length > 0) {
      return {
        continue: true,
        message: `
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️  Refactor Verification - Issues Detected                   ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  File: ${relativePath.padEnd(50)}║
║                                                               ║
${highSeverity
  .map(
    (issue) => `║  ❌ ${issue.type.toUpperCase().padEnd(52)}║
║     ${(issue.message || '').substring(0, 55).padEnd(55)}║`
  )
  .join('\n')}
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Recommended Actions:                                         ║
║  • Review the changes for unintended behavior modifications   ║
║  • Fix failing tests before continuing                        ║
║  • Use /golden-master --verify to check behavior preservation ║
║                                                               ║
║  Use "git stash" to save changes and investigate              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
        metadata: {
          refactorVerification: true,
          hasIssues: true,
          issueCount: verification.issues.length,
          issues: verification.issues,
        },
      };
    }
  }

  // All checks passed
  if (verification.tests?.passed || verification.goldenMaster?.every((r) => r.status === 'passed')) {
    return {
      continue: true,
      message: `
╔═══════════════════════════════════════════════════════════════╗
║  ✅ Refactor Verification - Passed                             ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  File: ${relativePath.substring(0, 50).padEnd(50)}║
║  Tests: ${verification.tests?.passed ? 'Passed' : 'Skipped'}                                             ║
║  Golden Master: ${verification.goldenMaster ? 'Verified' : 'N/A'}                                     ║
║  Imports: ${verification.imports?.valid ? 'Valid' : 'Error'}                                            ║
║                                                               ║
║  Safe to continue refactoring.                                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
      metadata: {
        refactorVerification: true,
        hasIssues: false,
      },
    };
  }

  return { continue: true };
};

/**
 * Start a refactoring session
 */
module.exports.startSession = function startSession(projectRoot, description = '') {
  const state = {
    active: true,
    transactionId: `refactor_${Date.now()}`,
    startedAt: new Date().toISOString(),
    description,
    files: [],
    verifications: [],
  };
  saveState(projectRoot, state);
  return state.transactionId;
};

/**
 * End a refactoring session
 */
module.exports.endSession = function endSession(projectRoot) {
  const state = loadState(projectRoot);
  state.active = false;
  state.endedAt = new Date().toISOString();
  saveState(projectRoot, state);
  return state;
};

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.shouldVerify = shouldVerify;
module.exports.findTestFile = findTestFile;
module.exports.findGoldenMaster = findGoldenMaster;
