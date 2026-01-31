/**
 * Refactor Audit Hook
 *
 * Monitors task list and phase development completions.
 * Flags files with over 500 lines for potential refactoring.
 * Offers workflow: new branch, task list, GitHub issue, then refactor.
 *
 * Event: PostToolUse (after TodoWrite marks all tasks complete)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  lineThreshold: 500, // Flag files with more than this many lines
  stateFile: '.claude/refactor-audit.json',
  excludePatterns: [
    /node_modules/,
    /\.git/,
    /dist\//,
    /build\//,
    /coverage\//,
    /\.min\./,
    /package-lock\.json/,
    /yarn\.lock/,
    /\.map$/,
  ],
  // File extensions to audit
  auditExtensions: [
    '.js', '.jsx', '.ts', '.tsx',
    '.py', '.pyw',
    '.rs',
    '.go',
    '.java',
    '.cs',
    '.rb',
    '.php',
    '.swift',
    '.kt',
    '.vue',
    '.svelte',
  ],
  // Tech stack to agent mapping
  techStackAgents: {
    react: 'frontend-react-specialist',
    vue: 'frontend-vue-specialist',
    angular: 'frontend-angular-specialist',
    svelte: 'frontend-svelte-specialist',
    nextjs: 'frontend-nextjs-specialist',
    fastapi: 'backend-fastapi-specialist',
    express: 'backend-express-specialist',
    nestjs: 'backend-nestjs-specialist',
    django: 'backend-django-specialist',
    prisma: 'database-prisma-specialist',
    postgresql: 'database-postgresql-specialist',
  },
};

/**
 * Load refactor audit state
 */
function loadState(projectRoot) {
  const statePath = path.join(projectRoot, CONFIG.stateFile);
  if (!fs.existsSync(statePath)) {
    return { flaggedFiles: [], lastAudit: null, dismissed: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { flaggedFiles: [], lastAudit: null, dismissed: [] };
  }
}

/**
 * Save refactor audit state
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
 * Check if file should be excluded
 */
function shouldExclude(filePath) {
  return CONFIG.excludePatterns.some((pattern) => pattern.test(filePath));
}

/**
 * Check if file extension should be audited
 */
function shouldAudit(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return CONFIG.auditExtensions.includes(ext);
}

/**
 * Count lines in a file
 */
function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

/**
 * Get all source files in directory recursively
 */
function getAllSourceFiles(dir, files = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (shouldExclude(fullPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        getAllSourceFiles(fullPath, files);
      } else if (entry.isFile() && shouldAudit(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch {
    // Ignore permission errors
  }

  return files;
}

/**
 * Detect tech stack from file extension and content
 */
function detectTechStack(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();

  // Check for framework-specific patterns
  if (ext === '.tsx' || ext === '.jsx') {
    return 'react';
  }
  if (ext === '.vue') {
    return 'vue';
  }
  if (ext === '.svelte') {
    return 'svelte';
  }
  if (ext === '.py' || ext === '.pyw') {
    // Check for FastAPI/Django patterns
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('from fastapi') || content.includes('FastAPI')) {
        return 'fastapi';
      }
      if (content.includes('from django') || content.includes('Django')) {
        return 'django';
      }
    } catch {
      // Ignore read errors
    }
    return 'python';
  }
  if (fileName.includes('.prisma')) {
    return 'prisma';
  }

  // Check for NestJS/Express patterns in JS/TS
  if (ext === '.ts' || ext === '.js') {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('@nestjs') || content.includes('@Module')) {
        return 'nestjs';
      }
      if (content.includes('express()') || content.includes('from \'express\'')) {
        return 'express';
      }
      if (content.includes('next/') || content.includes('getServerSideProps')) {
        return 'nextjs';
      }
    } catch {
      // Ignore read errors
    }
  }

  return null;
}

/**
 * Get recommended agent for file
 */
function getRecommendedAgent(filePath, agentRegistry) {
  const techStack = detectTechStack(filePath);

  // First try tech stack specific agent
  if (techStack && CONFIG.techStackAgents[techStack]) {
    const agentName = CONFIG.techStackAgents[techStack];
    if (agentRegistry?.agents?.some((a) => a.name === agentName)) {
      return agentName;
    }
  }

  // Fall back to domain-based agent
  const ext = path.extname(filePath).toLowerCase();
  if (['.tsx', '.jsx', '.vue', '.svelte'].includes(ext)) {
    return agentRegistry?.agents?.find((a) => a.domain === 'frontend')?.name || null;
  }
  if (['.py', '.rs', '.go', '.java'].includes(ext)) {
    return agentRegistry?.agents?.find((a) => a.domain === 'backend')?.name || null;
  }

  return null;
}

/**
 * Check if all tasks are complete in TodoWrite output
 */
function allTasksComplete(toolOutput) {
  if (!toolOutput || !toolOutput.todos) {
    return false;
  }

  const todos = toolOutput.todos;
  if (!Array.isArray(todos) || todos.length === 0) {
    return false;
  }

  return todos.every((todo) => todo.status === 'completed');
}

/**
 * Check if phase is complete in phase-track output
 */
function phaseComplete(toolOutput) {
  // Check for phase completion markers in various formats
  const output = JSON.stringify(toolOutput);
  return (
    output.includes('"status":"completed"') ||
    output.includes('Phase complete') ||
    output.includes('All tasks completed')
  );
}

/**
 * Load agent registry if available
 */
function loadAgentRegistry(projectRoot) {
  const registryPath = path.join(projectRoot, '.claude', 'config', 'agents.json');
  if (!fs.existsSync(registryPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Main hook handler
 */
module.exports = async function refactorAuditHook(context) {
  const { tool, toolInput, toolOutput, projectRoot } = context;

  // Only trigger on TodoWrite or Edit completions
  const isTodoComplete = tool === 'TodoWrite' && allTasksComplete(toolOutput);
  const isPhaseComplete = tool === 'Edit' && toolInput?.file_path?.includes('PROGRESS.json') && phaseComplete(toolOutput);

  if (!isTodoComplete && !isPhaseComplete) {
    return { continue: true };
  }

  // Load state
  const state = loadState(projectRoot);

  // Get all source files
  const allFiles = getAllSourceFiles(projectRoot);

  // Find files over threshold
  const largeFiles = [];
  for (const filePath of allFiles) {
    // Skip dismissed files
    const relativePath = path.relative(projectRoot, filePath);
    if (state.dismissed.includes(relativePath)) {
      continue;
    }

    const lineCount = countLines(filePath);
    if (lineCount > CONFIG.lineThreshold) {
      largeFiles.push({
        path: relativePath,
        lines: lineCount,
        techStack: detectTechStack(filePath),
      });
    }
  }

  // No large files found
  if (largeFiles.length === 0) {
    return { continue: true };
  }

  // Sort by line count descending
  largeFiles.sort((a, b) => b.lines - a.lines);

  // Load agent registry for recommendations
  const agentRegistry = loadAgentRegistry(projectRoot);

  // Add agent recommendations
  for (const file of largeFiles) {
    file.recommendedAgent = getRecommendedAgent(
      path.join(projectRoot, file.path),
      agentRegistry
    );
  }

  // Update state
  state.flaggedFiles = largeFiles;
  state.lastAudit = new Date().toISOString();
  saveState(projectRoot, state);

  // Build file list for display
  const fileListDisplay = largeFiles.slice(0, 5).map((f) => {
    const agentTag = f.recommendedAgent ? ` 🤖 ${f.recommendedAgent}` : '';
    return `║  • ${f.path} (${f.lines} lines)${agentTag}`;
  }).join('\n');

  const moreFiles = largeFiles.length > 5 ? `\n║  ... and ${largeFiles.length - 5} more files` : '';

  return {
    continue: true,
    message: `
╔═══════════════════════════════════════════════════════════════╗
║  📊 Refactor Audit - Large Files Detected                      ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Found ${largeFiles.length} file(s) with over ${CONFIG.lineThreshold} lines:                      ║
║                                                               ║
${fileListDisplay}${moreFiles}
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Would you like to refactor these files?                      ║
║                                                               ║
║  Options:                                                     ║
║  [R] Start refactor workflow (branch + task list + issue)     ║
║  [V] View all flagged files                                   ║
║  [D] Dismiss these suggestions                                ║
║  [S] Skip for now                                             ║
║                                                               ║
║  Recommended workflow:                                        ║
║  1. Create new branch for refactoring                         ║
║  2. Generate task list for each file                          ║
║  3. Create GitHub issue to track progress                     ║
║  4. Deploy specialist agent for tech stack                    ║
║  5. Commit and proceed with refactoring                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`,
    metadata: {
      refactorAudit: true,
      flaggedFiles: largeFiles.length,
      files: largeFiles.slice(0, 10),
      agentsAvailable: !!agentRegistry,
    },
  };
};

// Export for testing
module.exports.CONFIG = CONFIG;
module.exports.countLines = countLines;
module.exports.detectTechStack = detectTechStack;
module.exports.getRecommendedAgent = getRecommendedAgent;
module.exports.getAllSourceFiles = getAllSourceFiles;
