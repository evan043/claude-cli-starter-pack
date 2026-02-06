/**
 * Audit Fixers
 *
 * Detailed fix instructions and enhancement suggestion generation.
 *
 * Provides:
 * - showDetailedFixes: Display step-by-step fix instructions
 * - generateEnhancementSuggestions: AI-ready suggestions based on audit results
 */

import chalk from 'chalk';

/**
 * Show detailed fix instructions
 * @param {Object} results - Audit results object
 */
export function showDetailedFixes(results) {
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
 * Generate enhancement suggestions based on audit results
 * @param {Object} results - Audit results
 * @param {Object} techStack - Detected tech stack
 * @param {Object} ENHANCEMENT_TEMPLATES - Templates object
 * @returns {Array} Array of suggestions
 */
export function generateEnhancementSuggestions(results, techStack, ENHANCEMENT_TEMPLATES) {
  const suggestions = [];

  // Check if missing Quick Start
  const hasQuickStart = results.claudeMd.passed.some((p) =>
    p.message?.includes('Quick Start')
  );
  if (!hasQuickStart) {
    suggestions.push({
      type: 'section',
      name: 'Quick Start',
      priority: 'high',
      reason: 'Every CLAUDE.md should have runnable commands',
      content: ENHANCEMENT_TEMPLATES.quickStart(techStack),
    });
  }

  // Check if file is too short
  const veryShort = results.claudeMd.warnings.some((w) =>
    w.message?.includes('Very little content')
  );
  if (veryShort) {
    suggestions.push({
      type: 'full',
      name: 'Full Enhancement',
      priority: 'high',
      reason: 'CLAUDE.md has minimal content',
    });
  }

  // Suggest reference docs based on tech stack
  if (techStack.frontend?.framework || techStack.backend?.framework) {
    suggestions.push({
      type: 'section',
      name: 'Reference Links',
      priority: 'medium',
      reason: 'Add framework documentation links',
      content: ENHANCEMENT_TEMPLATES.referenceLinks(techStack),
    });
  }

  return suggestions;
}
