/**
 * Audit Formatters
 *
 * Score calculation and terminal output formatting for audit results.
 *
 * Provides:
 * - calculateOverallScore: Compute numeric score (0-100) from errors/warnings
 * - displayAuditResults: Colored terminal output with score display
 * - showBestPracticesReference: Reference guide display
 */

import chalk from 'chalk';

/**
 * Calculate overall score from results
 * @param {Object} results - Audit results object
 */
export function calculateOverallScore(results) {
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
 * @param {Object} results - Audit results object
 */
export function displayAuditResults(results) {
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
  console.log(`${scoreEmoji} ${chalk.bold('Audit Score:')} ${scoreColor.bold(`${overall.score}/100`)}`);
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
 * Show best practices reference
 */
export function showBestPracticesReference() {
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
