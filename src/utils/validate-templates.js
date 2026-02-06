/**
 * Template Validation Scanner
 *
 * Scans template files for hardcoded values that should be parameterized.
 * Ensures 100% platform agnosticism by detecting project-specific values.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import chalk from 'chalk';

/**
 * Forbidden patterns - hardcoded values that should never appear in templates
 * These are examples of project-specific values that must use placeholders
 */
const FORBIDDEN_PATTERNS = [
  // Railway IDs (example patterns)
  { pattern: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, name: 'UUID (potential service/project ID)' },

  // Hardcoded ngrok usage without conditional
  { pattern: /ngrok\s+http\s+\d+(?!\s*\}\})/g, name: 'Hardcoded ngrok command' },

  // Specific project names that look hardcoded
  { pattern: /--project-name=[a-z][a-z0-9-]+(?![\s]*\}\})/g, name: 'Hardcoded project name' },

  // Hardcoded GitHub usernames/orgs (not in placeholders)
  { pattern: /--owner\s+[a-zA-Z][a-zA-Z0-9-]+(?!\s*\}\})/g, name: 'Hardcoded GitHub owner' },

  // Hardcoded API keys (patterns)
  { pattern: /dev-key-[a-z0-9]+/gi, name: 'Hardcoded API key' },
  { pattern: /api[_-]?key["\s:=]+[a-zA-Z0-9_-]{20,}/gi, name: 'Potential API key' },

  // Hardcoded ports that should be configurable
  { pattern: /localhost:\d{4}(?!\s*\}\})/g, name: 'Hardcoded localhost port' },

  // Hardcoded URLs that look project-specific
  { pattern: /https?:\/\/[a-z0-9-]+\.(railway|vercel|netlify)\.app/gi, name: 'Hardcoded deployment URL' },

  // Specific SSH hosts
  { pattern: /ssh\s+[a-z]+@\d+\.\d+\.\d+\.\d+/g, name: 'Hardcoded SSH host' },

  // Hardcoded email addresses
  { pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}(?!\s*\}\})/gi, name: 'Hardcoded email address' },
];

/**
 * Allowed patterns - these are OK even if they match forbidden patterns
 */
const ALLOWED_PATTERNS = [
  // Template placeholders
  /\{\{[^}]+\}\}/g,

  // Documentation examples marked as such
  /<example>[\s\S]*?<\/example>/g,

  // Code comments explaining placeholders
  /\/\/.*placeholder/gi,
  /\/\*[\s\S]*?placeholder[\s\S]*?\*\//gi,

  // Generic localhost for documentation
  /localhost:5173|localhost:8000|localhost:3000/g,

  // Schema URLs
  /https:\/\/json-schema\.org/g,
  /https:\/\/github\.com\/[^/]+\/[^/]+\/tech-stack\.schema/g,
];

/**
 * Check if a match is within an allowed context
 */
function isInAllowedContext(content, matchIndex, matchLength) {
  // Get surrounding context
  const start = Math.max(0, matchIndex - 50);
  const end = Math.min(content.length, matchIndex + matchLength + 50);
  const context = content.substring(start, end);

  // Check if it's inside a placeholder
  const beforeMatch = content.substring(Math.max(0, matchIndex - 10), matchIndex);
  const afterMatch = content.substring(matchIndex + matchLength, Math.min(content.length, matchIndex + matchLength + 10));

  if (beforeMatch.includes('{{') && afterMatch.includes('}}')) {
    return true;
  }

  // Check if it's in a conditional block with placeholders
  if (context.includes('{{#if') || context.includes('{{deployment.') || context.includes('{{versionControl.')) {
    return true;
  }

  // Check if it's marked as an example
  if (context.toLowerCase().includes('example') || context.includes('<placeholder>')) {
    return true;
  }

  return false;
}

/**
 * Scan a single file for forbidden patterns
 */
export function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const violations = [];

  for (const { pattern, name } of FORBIDDEN_PATTERNS) {
    // Reset regex
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Check if this match is in an allowed context
      if (!isInAllowedContext(content, match.index, match[0].length)) {
        // Get line number
        const lineNumber = content.substring(0, match.index).split('\n').length;

        violations.push({
          file: filePath,
          line: lineNumber,
          match: match[0],
          pattern: name,
          context: content.substring(
            Math.max(0, match.index - 20),
            Math.min(content.length, match.index + match[0].length + 20)
          ).replace(/\n/g, '\\n'),
        });
      }
    }
  }

  return violations;
}

/**
 * Scan all template files in a directory
 */
export function scanDirectory(dirPath, options = {}) {
  const {
    extensions = ['.md', '.js', '.ts', '.json', '.yml', '.yaml'],
    exclude = ['node_modules', '.git', 'dist', 'build'],
    recursive = true,
  } = options;

  const violations = [];

  function walkDir(dir) {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      if (exclude.includes(entry)) continue;

      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory() && recursive) {
        walkDir(fullPath);
      } else if (stat.isFile()) {
        const ext = extname(entry);
        if (extensions.includes(ext)) {
          violations.push(...scanFile(fullPath));
        }
      }
    }
  }

  walkDir(dirPath);
  return violations;
}

/**
 * Format violations for display
 */
export function formatViolations(violations) {
  if (violations.length === 0) {
    return chalk.green('✓ No hardcoded values detected');
  }

  let output = chalk.red(`\n✗ Found ${violations.length} potential hardcoded value(s):\n\n`);

  // Group by file
  const byFile = {};
  for (const v of violations) {
    if (!byFile[v.file]) byFile[v.file] = [];
    byFile[v.file].push(v);
  }

  for (const [file, fileViolations] of Object.entries(byFile)) {
    output += chalk.yellow(`  ${file}\n`);

    for (const v of fileViolations) {
      output += `${chalk.dim(`    Line ${v.line}: `) + chalk.red(v.pattern)  }\n`;
      output += chalk.dim(`      Match: "${v.match}"\n`);
      output += chalk.dim(`      Context: ...${v.context}...\n`);
      output += '\n';
    }
  }

  output += chalk.dim('\nSuggestion: Replace hardcoded values with {{placeholder}} syntax.\n');
  output += chalk.dim('Example: --project-name={{deployment.frontend.projectName}}\n');

  return output;
}

/**
 * Run validation as CLI tool
 */
export async function runValidation(targetPath) {
  console.log(chalk.cyan('Template Validation Scanner'));
  console.log(chalk.dim('Checking for hardcoded values...\n'));

  const violations = scanDirectory(targetPath);

  console.log(formatViolations(violations));

  return violations.length === 0;
}

export default {
  scanFile,
  scanDirectory,
  formatViolations,
  runValidation,
  FORBIDDEN_PATTERNS,
};
