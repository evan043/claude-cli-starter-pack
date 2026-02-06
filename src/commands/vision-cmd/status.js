/**
 * Vision Mode Status Command
 *
 * Provides:
 * - visionStatus: Display vision status (all or specific)
 * - generateProgressBar: ASCII progress bar utility
 *
 * @module commands/vision-cmd/status
 */

import { listVisions, loadVision, getVisionStatus } from '../../vision/index.js';

/**
 * Show vision status
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - CLI options
 */
export async function visionStatus(projectRoot, options) {
  const slug = options.slug || options.args?.[0];

  if (!slug) {
    // Show all visions summary
    const visions = listVisions(projectRoot);

    if (visions.length === 0) {
      console.log('\n📭 No visions found.');
      console.log('   Run `ccasp vision init "your prompt"` to create one.');
      return;
    }

    console.log('\n┌─────────────────────────────────────────────────┐');
    console.log('│              VISION MODE - STATUS               │');
    console.log('└─────────────────────────────────────────────────┘\n');

    console.log(`Found ${visions.length} vision(s):\n`);

    for (const v of visions) {
      const status = getVisionStatus(projectRoot, v.slug);
      if (!status) continue;

      const progressBar = generateProgressBar(status.completion_percentage);
      const alignmentBar = generateProgressBar(Math.round(status.observer?.current_alignment * 100) || 100);

      console.log(`┌─ ${v.title.substring(0, 45)}${v.title.length > 45 ? '...' : ''}`);
      console.log(`│  Slug: ${v.slug}`);
      console.log(`│  Status: ${status.status}`);
      console.log(`│  Progress: ${progressBar} ${status.completion_percentage}%`);
      console.log(`│  Alignment: ${alignmentBar} ${Math.round(status.observer?.current_alignment * 100) || 100}%`);
      console.log(`│  Roadmaps: ${status.roadmaps?.completed || 0}/${status.roadmaps?.total || 0}`);
      console.log(`└────────────────────────────────────────────────`);
      console.log('');
    }

    return;
  }

  // Show specific vision status
  const status = getVisionStatus(projectRoot, slug);

  if (!status) {
    console.log(`\n❌ Vision not found: ${slug}`);
    return;
  }

  const vision = await loadVision(projectRoot, slug);

  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log(`│  ${status.title.substring(0, 43).padEnd(43)}  │`);
  console.log('└─────────────────────────────────────────────────┘\n');

  console.log(`Slug: ${slug}`);
  console.log(`Status: ${status.status}`);
  console.log(`Priority: ${vision?.priority || 'medium'}`);
  console.log(`Created: ${vision?.created_at || 'unknown'}`);
  console.log('');

  const progressBar = generateProgressBar(status.completion_percentage);
  console.log(`Progress: ${progressBar} ${status.completion_percentage}%`);

  const alignmentPct = Math.round(status.observer?.current_alignment * 100) || 100;
  const alignmentBar = generateProgressBar(alignmentPct);
  console.log(`Alignment: ${alignmentBar} ${alignmentPct}%`);
  console.log('');

  console.log('Roadmaps:');
  console.log(`  Completed: ${status.roadmaps?.completed || 0}`);
  console.log(`  In Progress: ${status.roadmaps?.in_progress || 0}`);
  console.log(`  Pending: ${status.roadmaps?.pending || 0}`);
  console.log(`  Total: ${status.roadmaps?.total || 0}`);
  console.log('');

  console.log('Observer:');
  console.log(`  Drift Events: ${status.observer?.drift_events || 0}`);
  console.log(`  Adjustments: ${status.observer?.adjustments || 0}`);
  console.log('');

  if (vision?.agents?.length > 0) {
    console.log('Agents:');
    for (const agent of vision.agents) {
      console.log(`  - ${agent.domain}: ${agent.status}`);
    }
    console.log('');
  }

  if (vision?.orchestrator?.stage) {
    console.log(`Orchestrator Stage: ${vision.orchestrator.stage}`);
  }
}

/**
 * Generate ASCII progress bar
 * @param {number} percentage - Completion percentage
 * @returns {string} Progress bar string
 */
export function generateProgressBar(percentage) {
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
