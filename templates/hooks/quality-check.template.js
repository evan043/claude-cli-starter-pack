/**
 * Quality Check Hook
 *
 * Post-edit quality validation with tech-stack-aware rule sets.
 * Runs lint/type checks after file modifications based on project type.
 *
 * Cherry-picked from bartolli/claude-code-typescript-hooks patterns.
 *
 * Event: PostToolUse (after Edit/Write tools)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  trackedTools: ['Edit', 'Write', 'MultiEdit'],
  skipDirectories: [
    'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
    '__pycache__', '.pytest_cache', 'target', 'vendor',
  ],
  allowedSourceDirs: ['src', 'app', 'lib', 'pages', 'components', 'backend', 'api'],
  rulesets: {
    react: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      lintCommand: 'npx eslint --fix --no-error-on-unmatched-pattern',
      typeCommand: 'npx tsc --noEmit --pretty',
      formatCommand: 'npx prettier --write',
    },
    node: {
      extensions: ['.ts', '.js', '.mjs', '.cjs'],
      lintCommand: 'npx eslint --fix --no-error-on-unmatched-pattern',
      typeCommand: 'npx tsc --noEmit --pretty',
    },
    python: {
      extensions: ['.py'],
      lintCommand: 'python -m ruff check --fix',
      typeCommand: 'python -m mypy --ignore-missing-imports',
    },
    generic: {
      extensions: ['.ts', '.js', '.tsx', '.jsx', '.py'],
      lintCommand: null,
      typeCommand: null,
    },
  },
  timeout: 15000, // 15s timeout for lint commands
};

/**
 * Detect project type from common config files
 */
function detectProjectType(projectRoot) {
  // Check for React
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      if (allDeps.react || allDeps['@types/react']) {
        return 'react';
      }
    } catch {
      // Fall through
    }
  }

  // Check for Python
  if (
    fs.existsSync(path.join(projectRoot, 'requirements.txt')) ||
    fs.existsSync(path.join(projectRoot, 'pyproject.toml')) ||
    fs.existsSync(path.join(projectRoot, 'setup.py'))
  ) {
    return 'python';
  }

  // Check for Node.js
  if (fs.existsSync(packageJsonPath)) {
    return 'node';
  }

  return 'generic';
}

/**
 * Check if a file is in an allowed source directory
 */
function isInSourceDir(filePath, projectRoot) {
  const relative = path.relative(projectRoot, filePath);
  const firstDir = relative.split(path.sep)[0];

  // Skip if in excluded directory
  if (CONFIG.skipDirectories.includes(firstDir)) {
    return false;
  }

  // Allow if in source directories or if no obvious directory structure
  if (CONFIG.allowedSourceDirs.includes(firstDir)) {
    return true;
  }

  // Allow root-level source files
  if (!relative.includes(path.sep)) {
    return true;
  }

  return false;
}

/**
 * Run a quality check command safely
 */
function runCommand(command, filePath, projectRoot) {
  try {
    const output = execSync(`${command} "${filePath}"`, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: CONFIG.timeout,
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    return {
      success: false,
      output: (error.stdout || '') + (error.stderr || ''),
      exitCode: error.status,
    };
  }
}

/**
 * Main hook handler - PostToolUse
 */
module.exports = async function qualityCheckHook(context) {
  const { tool, toolInput, projectRoot } = context;

  // Only process file modification tools
  if (!CONFIG.trackedTools.includes(tool)) {
    return { continue: true };
  }

  const filePath = toolInput?.file_path || toolInput?.filePath || '';
  if (!filePath) {
    return { continue: true };
  }

  // Check if file is in a source directory
  if (!isInSourceDir(filePath, projectRoot)) {
    return { continue: true };
  }

  // Detect project type and get ruleset
  const projectType = detectProjectType(projectRoot);
  const ruleset = CONFIG.rulesets[projectType] || CONFIG.rulesets.generic;

  // Check if file extension matches ruleset
  const ext = path.extname(filePath);
  if (!ruleset.extensions.includes(ext)) {
    return { continue: true };
  }

  const issues = [];
  const fixes = [];

  // Run lint check with auto-fix
  if (ruleset.lintCommand) {
    const lintResult = runCommand(ruleset.lintCommand, filePath, projectRoot);
    if (!lintResult.success) {
      issues.push({
        type: 'lint',
        output: lintResult.output.substring(0, 200),
      });
    } else if (lintResult.output) {
      fixes.push('lint auto-fix applied');
    }
  }

  // Report results
  if (issues.length > 0) {
    return {
      continue: true,
      message: `
╔═══════════════════════════════════════════════════════════════╗
║  🔍 Quality Check - ${projectType.padEnd(10)} project                     ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  File: ${path.basename(filePath).substring(0, 50).padEnd(50)}   ║
║  Issues found: ${String(issues.length).padEnd(3)}                                        ║
║                                                               ║
${issues.map((i) => `║  ⚠ ${i.type}: ${i.output.substring(0, 52).padEnd(52)}   ║`).join('\n')}
║                                                               ║
║  Fix these issues before committing.                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
      metadata: {
        qualityCheck: true,
        projectType,
        issueCount: issues.length,
        file: filePath,
      },
    };
  }

  if (fixes.length > 0) {
    return {
      continue: true,
      message: `🔍 Quality [${projectType}]: ${fixes.join(', ')} on ${path.basename(filePath)}`,
    };
  }

  return { continue: true };
};

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.detectProjectType = detectProjectType;
module.exports.isInSourceDir = isInSourceDir;
module.exports.runCommand = runCommand;
