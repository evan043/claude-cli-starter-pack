/**
 * Codebase Analyzer - Summary & Display
 *
 * Generates human-readable summaries and displays analysis results.
 */

import chalk from 'chalk';

/**
 * Generate human-readable summary of detected stack
 */
export function generateStackSummary(analysis) {
  const parts = [];

  if (analysis.frontend.detected) {
    let fe = analysis.frontend.framework;
    if (analysis.frontend.version) {
      fe += ` ${analysis.frontend.version}`;
    }
    if (analysis.frontend.language === 'typescript') {
      fe += ' + TypeScript';
    }
    if (analysis.frontend.bundler) {
      fe += ` + ${analysis.frontend.bundler}`;
    }
    if (analysis.frontend.styling) {
      fe += ` + ${analysis.frontend.styling}`;
    }
    parts.push(`Frontend: ${fe}`);
  }

  if (analysis.backend.detected) {
    let be = analysis.backend.framework;
    if (analysis.backend.language) {
      be = `${analysis.backend.framework} (${analysis.backend.language})`;
    }
    parts.push(`Backend: ${be}`);
  }

  if (analysis.database.detected) {
    let db = analysis.database.type || 'Unknown';
    if (analysis.database.orm) {
      db += ` + ${analysis.database.orm}`;
    }
    parts.push(`Database: ${db}`);
  }

  if (analysis.testing.detected) {
    let test = analysis.testing.framework;
    if (analysis.testing.e2e) {
      test += ` + ${analysis.testing.e2e} (E2E)`;
    }
    parts.push(`Testing: ${test}`);
  }

  if (analysis.deployment.detected) {
    let deploy = analysis.deployment.platform;
    if (analysis.deployment.containerized) {
      deploy += ' (containerized)';
    }
    parts.push(`Deployment: ${deploy}`);
  }

  if (analysis.services?.detected) {
    const services = [];
    if (analysis.services.supabase) services.push('Supabase');
    if (analysis.services.n8n) services.push('n8n');
    if (analysis.services.stripe) services.push('Stripe');
    if (analysis.services.auth0) services.push('Auth0');
    if (analysis.services.clerk) services.push('Clerk');
    if (analysis.services.resend) services.push('Resend');
    if (analysis.services.twilio) services.push('Twilio');

    if (services.length > 0) {
      parts.push(`Services: ${services.join(', ')}`);
    }
  }

  return parts.length > 0 ? parts.join('\n') : 'Unable to detect stack';
}

/**
 * Display analysis results
 */
export function displayAnalysisResults(analysis) {
  console.log('');
  console.log(chalk.cyan.bold('\u{1f4ca} Detected Tech Stack:'));
  console.log('');

  const summary = generateStackSummary(analysis);
  console.log(chalk.white(summary));

  console.log('');
  console.log(chalk.dim(`Confidence: ${analysis.confidence}`));
  console.log('');
}
