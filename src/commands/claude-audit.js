/**
 * Claude Audit Command
 *
 * Audits CLAUDE.md files and .claude/ folder structure against
 * Anthropic's Claude Code CLI best practices.
 *
 * Reference: https://code.claude.com/docs/en/best-practices
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { showHeader } from '../cli/menu.js';

/**
 * Audit rules based on Anthropic documentation
 */
const AUDIT_RULES = {
  claudeMd: {
    maxLines: 300,
    recommendedLines: 60,
    warningLines: 150,
    requiredSections: [],
    antiPatterns: [
      { pattern: /```[\s\S]{500,}```/g, message: 'Long code blocks (>500 chars) bloat context - link to docs instead' },
      { pattern: /\b(obvious|obviously|of course|everyone knows)\b/gi, message: 'Self-evident statements waste tokens' },
      { pattern: /^\s*-\s*Write clean code/mi, message: 'Generic advice like "write clean code" adds no value' },
      { pattern: /^\s*-\s*Follow best practices/mi, message: 'Vague instructions get ignored - be specific' },
      { pattern: /^#{1,6}\s+.{100,}/gm, message: 'Headers over 100 chars are too long' },
    ],
    goodPatterns: [
      { pattern: /IMPORTANT|YOU MUST|CRITICAL|NEVER|ALWAYS/i, message: 'Has emphasis keywords for critical rules' },
      { pattern: /```(bash|sh|shell)/i, message: 'Includes runnable bash commands' },
      { pattern: /@[\w\/\.-]+\.(md|json|txt)/g, message: 'Uses @import syntax for modularity' },
    ],
  },
  claudeFolder: {
    expectedStructure: {
      'commands/': { type: 'dir', description: 'Slash commands (.md files)' },
      'skills/': { type: 'dir', description: 'Skills with SKILL.md files' },
      'agents/': { type: 'dir', description: 'Subagent definitions' },
      'hooks/': { type: 'dir', description: 'Hook scripts and configs' },
      'settings.json': { type: 'file', description: 'Project settings (git-tracked)' },
      'settings.local.json': { type: 'file', description: 'Local settings (gitignored)' },
    },
    filePatterns: {
      commands: { ext: '.md', frontmatter: false },
      skills: { ext: '.md', frontmatter: true, requiredFrontmatter: ['name', 'description'] },
      agents: { ext: '.md', frontmatter: true, requiredFrontmatter: ['name', 'description', 'tools'] },
    },
  },
};

/**
 * Audit result structure
 */
function createAuditResult() {
  return {
    passed: [],
    warnings: [],
    errors: [],
    suggestions: [],
    score: 100,
  };
}

/**
 * Main audit runner
 */
export async function runClaudeAudit(options = {}) {
  const cwd = options.cwd || process.cwd();

  showHeader('Claude Code Audit');

  console.log(chalk.dim('Auditing against Anthropic best practices...'));
  console.log(chalk.dim('Reference: https://code.claude.com/docs/en/best-practices'));
  console.log('');

  const spinner = ora('Scanning project...').start();

  const results = {
    claudeMd: createAuditResult(),
    claudeFolder: createAuditResult(),
    overall: createAuditResult(),
  };

  // Audit CLAUDE.md files
  spinner.text = 'Auditing CLAUDE.md files...';
  auditClaudeMdFiles(cwd, results.claudeMd);

  // Audit .claude folder
  spinner.text = 'Auditing .claude/ folder structure...';
  auditClaudeFolder(cwd, results.claudeFolder);

  // Calculate overall score
  calculateOverallScore(results);

  spinner.succeed('Audit complete');
  console.log('');

  // Display results
  displayAuditResults(results);

  // Show fix suggestions
  if (options.interactive !== false) {
    await showFixSuggestions(results, cwd);
  }

  return results;
}

/**
 * Audit CLAUDE.md files at various locations
 */
function auditClaudeMdFiles(cwd, result) {
  const locations = [
    { path: join(cwd, 'CLAUDE.md'), name: 'Root CLAUDE.md', required: true },
    { path: join(cwd, 'CLAUDE.local.md'), name: 'Local CLAUDE.md', required: false },
  ];

  // Check for CLAUDE.md in parent directories (monorepo support)
  let parentDir = join(cwd, '..');
  const checkedPaths = new Set([cwd]);
  while (parentDir !== cwd && !checkedPaths.has(parentDir)) {
    checkedPaths.add(parentDir);
    const parentClaudeMd = join(parentDir, 'CLAUDE.md');
    if (existsSync(parentClaudeMd)) {
      locations.push({ path: parentClaudeMd, name: `Parent CLAUDE.md (${basename(parentDir)})`, required: false });
    }
    cwd = parentDir;
    parentDir = join(cwd, '..');
  }

  let foundAny = false;

  for (const loc of locations) {
    if (existsSync(loc.path)) {
      foundAny = true;
      auditSingleClaudeMd(loc.path, loc.name, result);
    } else if (loc.required) {
      result.errors.push({
        file: loc.path,
        message: `Missing ${loc.name} - run /init to generate one`,
        fix: 'Run `claude /init` to generate a starter CLAUDE.md',
      });
    }
  }

  if (!foundAny) {
    result.errors.push({
      file: 'CLAUDE.md',
      message: 'No CLAUDE.md found in project',
      fix: 'Create a CLAUDE.md file with project-specific instructions',
    });
  }
}

/**
 * Audit a single CLAUDE.md file
 */
function auditSingleClaudeMd(filePath, name, result) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const lineCount = lines.length;

  // Line count checks
  if (lineCount > AUDIT_RULES.claudeMd.maxLines) {
    result.errors.push({
      file: name,
      message: `${lineCount} lines exceeds max recommended ${AUDIT_RULES.claudeMd.maxLines}`,
      fix: 'Prune ruthlessly - if Claude already does it correctly, remove the instruction',
    });
  } else if (lineCount > AUDIT_RULES.claudeMd.warningLines) {
    result.warnings.push({
      file: name,
      message: `${lineCount} lines is getting long (recommended: <${AUDIT_RULES.claudeMd.recommendedLines})`,
      fix: 'Consider moving domain-specific content to skills',
    });
  } else if (lineCount <= AUDIT_RULES.claudeMd.recommendedLines) {
    result.passed.push({
      file: name,
      message: `Good length: ${lineCount} lines`,
    });
  }

  // Check for anti-patterns
  for (const anti of AUDIT_RULES.claudeMd.antiPatterns) {
    const matches = content.match(anti.pattern);
    if (matches) {
      result.warnings.push({
        file: name,
        message: anti.message,
        fix: `Found ${matches.length} occurrence(s)`,
      });
    }
  }

  // Check for good patterns
  for (const good of AUDIT_RULES.claudeMd.goodPatterns) {
    const matches = content.match(good.pattern);
    if (matches) {
      result.passed.push({
        file: name,
        message: good.message,
      });
    }
  }

  // Check for common content issues
  if (content.length > 15000) {
    result.errors.push({
      file: name,
      message: `File is ${Math.round(content.length / 1000)}KB - too large for efficient loading`,
      fix: 'Split into skills or use @imports',
    });
  }

  // Check for gitignore mention if .local.md
  if (name.includes('local') && !content.includes('.gitignore')) {
    result.suggestions.push({
      file: name,
      message: 'Local files should be gitignored',
      fix: 'Add CLAUDE.local.md to .gitignore',
    });
  }

  // Check for import usage
  const imports = content.match(/@[\w\/\.-]+/g) || [];
  if (imports.length > 0) {
    result.passed.push({
      file: name,
      message: `Uses ${imports.length} @imports for modularity`,
    });
  }

  // Check for empty or minimal content
  const meaningfulContent = content.replace(/^#.*$/gm, '').replace(/\s+/g, '').length;
  if (meaningfulContent < 100) {
    result.warnings.push({
      file: name,
      message: 'Very little content - might not be useful',
      fix: 'Add bash commands, code style rules, and workflow instructions',
    });
  }
}

/**
 * Audit .claude folder structure
 */
function auditClaudeFolder(cwd, result) {
  const claudeDir = join(cwd, '.claude');

  if (!existsSync(claudeDir)) {
    result.errors.push({
      file: '.claude/',
      message: 'No .claude folder found',
      fix: 'Create .claude/ directory for commands, skills, hooks, and settings',
    });
    return;
  }

  result.passed.push({
    file: '.claude/',
    message: '.claude folder exists',
  });

  // Check expected structure
  for (const [name, spec] of Object.entries(AUDIT_RULES.claudeFolder.expectedStructure)) {
    const itemPath = join(claudeDir, name);
    const exists = existsSync(itemPath);

    if (!exists) {
      result.suggestions.push({
        file: `.claude/${name}`,
        message: `Missing ${spec.description}`,
        fix: `Create .claude/${name}`,
      });
    } else {
      if (spec.type === 'dir') {
        const isDir = statSync(itemPath).isDirectory();
        if (isDir) {
          result.passed.push({
            file: `.claude/${name}`,
            message: `${spec.description} exists`,
          });
          // Audit contents
          auditClaudeFolderContents(itemPath, name.replace('/', ''), result);
        } else {
          result.errors.push({
            file: `.claude/${name}`,
            message: `Expected directory, found file`,
          });
        }
      } else {
        result.passed.push({
          file: `.claude/${name}`,
          message: `${spec.description} exists`,
        });
        // Validate JSON files
        if (name.endsWith('.json')) {
          validateJsonFile(itemPath, `.claude/${name}`, result);
        }
      }
    }
  }

  // Check for common misconfigurations
  checkCommonMisconfigurations(claudeDir, result);
}

/**
 * Audit contents of .claude subdirectories
 */
function auditClaudeFolderContents(dirPath, type, result) {
  const files = readdirSync(dirPath);
  const spec = AUDIT_RULES.claudeFolder.filePatterns[type];

  if (!spec) return;

  for (const file of files) {
    const filePath = join(dirPath, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // Skills can have subdirectories with SKILL.md
      if (type === 'skills') {
        const skillMdPath = join(filePath, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          validateSkillOrAgent(skillMdPath, `.claude/skills/${file}/SKILL.md`, 'skill', result);
        } else {
          result.warnings.push({
            file: `.claude/skills/${file}/`,
            message: 'Skill directory missing SKILL.md',
            fix: 'Add SKILL.md with name, description frontmatter',
          });
        }
      }
      continue;
    }

    const ext = extname(file);

    if (ext !== spec.ext) {
      result.warnings.push({
        file: `.claude/${type}/${file}`,
        message: `Unexpected file extension (expected ${spec.ext})`,
      });
      continue;
    }

    if (spec.frontmatter) {
      if (type === 'skills') {
        validateSkillOrAgent(filePath, `.claude/${type}/${file}`, 'skill', result);
      } else if (type === 'agents') {
        validateSkillOrAgent(filePath, `.claude/${type}/${file}`, 'agent', result);
      }
    } else {
      // Commands just need to be valid markdown
      result.passed.push({
        file: `.claude/${type}/${file}`,
        message: 'Command file found',
      });
    }
  }

  if (files.length === 0) {
    result.suggestions.push({
      file: `.claude/${type}/`,
      message: `Empty ${type} directory`,
      fix: `Add ${type} to extend Claude's capabilities`,
    });
  }
}

/**
 * Validate skill or agent markdown file
 */
function validateSkillOrAgent(filePath, displayPath, type, result) {
  const content = readFileSync(filePath, 'utf8');

  // Check for frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    result.errors.push({
      file: displayPath,
      message: `Missing frontmatter (required for ${type}s)`,
      fix: `Add ---\\nname: ...\\ndescription: ...\\n--- at top of file`,
    });
    return;
  }

  const frontmatter = frontmatterMatch[1];
  const required = AUDIT_RULES.claudeFolder.filePatterns[type === 'skill' ? 'skills' : 'agents'].requiredFrontmatter;

  for (const field of required) {
    if (!frontmatter.includes(`${field}:`)) {
      result.errors.push({
        file: displayPath,
        message: `Missing required frontmatter field: ${field}`,
        fix: `Add ${field}: value to frontmatter`,
      });
    }
  }

  // Check for tools in agents
  if (type === 'agent' && !frontmatter.includes('tools:')) {
    result.errors.push({
      file: displayPath,
      message: 'Agent missing tools specification',
      fix: 'Add tools: Read, Grep, Glob, Bash (or specific tools)',
    });
  }

  // Check for model specification in agents (optional but recommended)
  if (type === 'agent' && !frontmatter.includes('model:')) {
    result.suggestions.push({
      file: displayPath,
      message: 'Agent has no model specified (will use default)',
      fix: 'Add model: opus, sonnet, or haiku',
    });
  }

  // Content length check
  const body = content.replace(/^---[\s\S]*?---\n?/, '').trim();
  if (body.length < 50) {
    result.warnings.push({
      file: displayPath,
      message: `${type} has minimal instructions`,
      fix: 'Add detailed instructions for the skill/agent',
    });
  } else {
    result.passed.push({
      file: displayPath,
      message: `Valid ${type} with frontmatter`,
    });
  }
}

/**
 * Validate JSON file
 */
function validateJsonFile(filePath, displayPath, result) {
  try {
    const content = readFileSync(filePath, 'utf8');
    JSON.parse(content);
    result.passed.push({
      file: displayPath,
      message: 'Valid JSON',
    });
  } catch (e) {
    result.errors.push({
      file: displayPath,
      message: `Invalid JSON: ${e.message}`,
    });
  }
}

/**
 * Check for common misconfigurations
 */
function checkCommonMisconfigurations(claudeDir, result) {
  // Check if settings.local.json is gitignored
  const gitignorePath = join(claudeDir, '..', '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf8');
    if (!gitignore.includes('settings.local.json') && !gitignore.includes('.claude/settings.local.json')) {
      const localSettingsPath = join(claudeDir, 'settings.local.json');
      if (existsSync(localSettingsPath)) {
        result.warnings.push({
          file: '.claude/settings.local.json',
          message: 'Local settings may not be gitignored',
          fix: 'Add .claude/settings.local.json to .gitignore',
        });
      }
    }
  }

  // Check for MCP configuration
  const mcpPath = join(claudeDir, '..', '.mcp.json');
  if (existsSync(mcpPath)) {
    validateJsonFile(mcpPath, '.mcp.json', result);
  }

  // Check for hooks configuration
  const hooksDir = join(claudeDir, 'hooks');
  if (existsSync(hooksDir)) {
    const hookFiles = readdirSync(hooksDir).filter(f => f.endsWith('.js') || f.endsWith('.sh'));
    if (hookFiles.length > 0) {
      result.passed.push({
        file: '.claude/hooks/',
        message: `${hookFiles.length} hook script(s) configured`,
      });
    }
  }

  // Check settings.json for permissions
  const settingsPath = join(claudeDir, 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      if (settings.permissions?.allow?.length > 0) {
        result.passed.push({
          file: '.claude/settings.json',
          message: `${settings.permissions.allow.length} allowed tool patterns configured`,
        });
      }
      if (settings.permissions?.deny?.length > 0) {
        result.passed.push({
          file: '.claude/settings.json',
          message: `${settings.permissions.deny.length} denied patterns configured`,
        });
      }
    } catch (e) {
      // Already reported in JSON validation
    }
  }
}

/**
 * Calculate overall score
 */
function calculateOverallScore(results) {
  let totalPassed = 0;
  let totalWarnings = 0;
  let totalErrors = 0;

  for (const key of ['claudeMd', 'claudeFolder']) {
    totalPassed += results[key].passed.length;
    totalWarnings += results[key].warnings.length;
    totalErrors += results[key].errors.length;
  }

  // Score calculation: start at 100, -5 per warning, -15 per error
  let score = 100 - (totalWarnings * 5) - (totalErrors * 15);
  score = Math.max(0, Math.min(100, score));

  results.overall = {
    passed: totalPassed,
    warnings: totalWarnings,
    errors: totalErrors,
    suggestions: results.claudeMd.suggestions.length + results.claudeFolder.suggestions.length,
    score,
  };
}

/**
 * Display audit results
 */
function displayAuditResults(results) {
  const { overall } = results;

  // Score display with color
  let scoreColor = chalk.green;
  let scoreEmoji = '✅';
  if (overall.score < 50) {
    scoreColor = chalk.red;
    scoreEmoji = '❌';
  } else if (overall.score < 75) {
    scoreColor = chalk.yellow;
    scoreEmoji = '⚠️';
  }

  console.log(chalk.bold('━'.repeat(60)));
  console.log(`${scoreEmoji} ${chalk.bold('Audit Score:')} ${scoreColor.bold(overall.score + '/100')}`);
  console.log(chalk.bold('━'.repeat(60)));
  console.log('');

  console.log(`  ${chalk.green('✓')} Passed: ${overall.passed}`);
  console.log(`  ${chalk.yellow('⚠')} Warnings: ${overall.warnings}`);
  console.log(`  ${chalk.red('✗')} Errors: ${overall.errors}`);
  console.log(`  ${chalk.blue('💡')} Suggestions: ${overall.suggestions}`);
  console.log('');

  // Display errors first
  if (results.claudeMd.errors.length > 0 || results.claudeFolder.errors.length > 0) {
    console.log(chalk.red.bold('Errors (must fix):'));
    for (const err of [...results.claudeMd.errors, ...results.claudeFolder.errors]) {
      console.log(`  ${chalk.red('✗')} ${chalk.dim(err.file)} - ${err.message}`);
      if (err.fix) {
        console.log(`    ${chalk.dim('Fix:')} ${err.fix}`);
      }
    }
    console.log('');
  }

  // Display warnings
  if (results.claudeMd.warnings.length > 0 || results.claudeFolder.warnings.length > 0) {
    console.log(chalk.yellow.bold('Warnings (should fix):'));
    for (const warn of [...results.claudeMd.warnings, ...results.claudeFolder.warnings]) {
      console.log(`  ${chalk.yellow('⚠')} ${chalk.dim(warn.file)} - ${warn.message}`);
      if (warn.fix) {
        console.log(`    ${chalk.dim('Fix:')} ${warn.fix}`);
      }
    }
    console.log('');
  }

  // Display suggestions (collapsed by default)
  if (overall.suggestions > 0) {
    console.log(chalk.blue.bold('Suggestions (optional):'));
    for (const sug of [...results.claudeMd.suggestions, ...results.claudeFolder.suggestions]) {
      console.log(`  ${chalk.blue('💡')} ${chalk.dim(sug.file)} - ${sug.message}`);
    }
    console.log('');
  }

  // Display passes (summarized)
  if (overall.passed > 0) {
    console.log(chalk.green.bold(`Passed Checks (${overall.passed}):`));
    const passedItems = [...results.claudeMd.passed, ...results.claudeFolder.passed];
    // Show first 5, summarize rest
    const toShow = passedItems.slice(0, 5);
    for (const pass of toShow) {
      console.log(`  ${chalk.green('✓')} ${chalk.dim(pass.file)} - ${pass.message}`);
    }
    if (passedItems.length > 5) {
      console.log(`  ${chalk.dim(`... and ${passedItems.length - 5} more`)}`);
    }
    console.log('');
  }
}

/**
 * Show fix suggestions interactively
 */
async function showFixSuggestions(results, cwd) {
  const { overall } = results;

  if (overall.errors === 0 && overall.warnings === 0) {
    console.log(chalk.green.bold('🎉 Great job! Your Claude configuration follows best practices.'));
    console.log('');
    return;
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Show detailed fix instructions', value: 'details' },
        { name: 'Show best practices reference', value: 'reference' },
        { name: 'Exit', value: 'exit' },
      ],
    },
  ]);

  if (action === 'details') {
    showDetailedFixes(results);
  } else if (action === 'reference') {
    showBestPracticesReference();
  }
}

/**
 * Show detailed fix instructions
 */
function showDetailedFixes(results) {
  console.log('');
  console.log(chalk.bold('━'.repeat(60)));
  console.log(chalk.bold('Detailed Fix Instructions'));
  console.log(chalk.bold('━'.repeat(60)));
  console.log('');

  const allIssues = [
    ...results.claudeMd.errors.map(e => ({ ...e, type: 'error' })),
    ...results.claudeFolder.errors.map(e => ({ ...e, type: 'error' })),
    ...results.claudeMd.warnings.map(w => ({ ...w, type: 'warning' })),
    ...results.claudeFolder.warnings.map(w => ({ ...w, type: 'warning' })),
  ];

  for (let i = 0; i < allIssues.length; i++) {
    const issue = allIssues[i];
    const icon = issue.type === 'error' ? chalk.red('✗') : chalk.yellow('⚠');
    console.log(`${i + 1}. ${icon} ${chalk.bold(issue.file)}`);
    console.log(`   Issue: ${issue.message}`);
    if (issue.fix) {
      console.log(`   ${chalk.green('Fix:')} ${issue.fix}`);
    }
    console.log('');
  }
}

/**
 * Show best practices reference
 */
function showBestPracticesReference() {
  console.log('');
  console.log(chalk.bold('━'.repeat(60)));
  console.log(chalk.bold('Claude Code Best Practices Reference'));
  console.log(chalk.bold('━'.repeat(60)));
  console.log('');

  console.log(chalk.cyan.bold('CLAUDE.md Best Practices:'));
  console.log('');
  console.log(`  ${chalk.green('✓')} Keep under 60-150 lines (max 300)`);
  console.log(`  ${chalk.green('✓')} Include bash commands Claude can't guess`);
  console.log(`  ${chalk.green('✓')} Document code style rules that differ from defaults`);
  console.log(`  ${chalk.green('✓')} Add testing instructions and preferred runners`);
  console.log(`  ${chalk.green('✓')} Use emphasis (IMPORTANT, YOU MUST) for critical rules`);
  console.log(`  ${chalk.green('✓')} Use @imports to keep files modular`);
  console.log('');
  console.log(`  ${chalk.red('✗')} Avoid long code blocks (link to docs instead)`);
  console.log(`  ${chalk.red('✗')} Skip obvious/generic advice ("write clean code")`);
  console.log(`  ${chalk.red('✗')} Don't include API docs (link instead)`);
  console.log(`  ${chalk.red('✗')} Remove anything Claude does correctly without instruction`);
  console.log('');

  console.log(chalk.cyan.bold('.claude/ Folder Structure:'));
  console.log('');
  console.log('  .claude/');
  console.log('  ├── commands/        # Slash commands (.md files)');
  console.log('  ├── skills/          # Skills with SKILL.md');
  console.log('  ├── agents/          # Subagent definitions');
  console.log('  ├── hooks/           # Hook scripts');
  console.log('  ├── settings.json    # Shared settings (git-tracked)');
  console.log('  └── settings.local.json  # Local settings (gitignored)');
  console.log('');

  console.log(chalk.cyan.bold('Skill/Agent Frontmatter:'));
  console.log('');
  console.log('  ---');
  console.log('  name: my-skill');
  console.log('  description: What this skill does');
  console.log('  tools: Read, Grep, Glob, Bash  # agents only');
  console.log('  model: opus                     # optional');
  console.log('  ---');
  console.log('');

  console.log(chalk.dim('Reference: https://code.claude.com/docs/en/best-practices'));
  console.log('');
}

/**
 * Interactive menu entry point
 */
export async function showClaudeAuditMenu() {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Claude Code Configuration Audit:',
      choices: [
        { name: 'Run Full Audit', value: 'full' },
        { name: 'Audit CLAUDE.md only', value: 'claudemd' },
        { name: 'Audit .claude/ folder only', value: 'folder' },
        { name: 'Show Best Practices Reference', value: 'reference' },
        { name: 'Back', value: 'back' },
      ],
    },
  ]);

  if (mode === 'back') return;

  if (mode === 'reference') {
    showBestPracticesReference();
    return;
  }

  await runClaudeAudit({ mode });
}
