/**
 * Vision Mode Operations Commands
 *
 * Provides:
 * - visionList: List all visions (registry-backed)
 * - visionCleanup: Clean up stale/failed visions
 * - visionScan: Run security scan
 * - visionAnalyze: Run analysis phase only
 * - visionArchitect: Run architecture phase only
 *
 * @module commands/vision-cmd/operations
 */

import { createOrchestrator, listVisions, getVisionStatus, getRegisteredVisions, getActiveVisions, getVisionCount, deregisterVision, describePlanType } from '../../vision/index.js';
import { scanPackages, generateSecurityReport } from '../../vision/security/index.js';
import { getVisionDir } from '../../vision/state-manager.js';
import fs from 'fs';
import path from 'path';

/**
 * List all visions (registry-backed with plan type display)
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - CLI options
 */
export async function visionList(projectRoot, options) {
  // Use registry for fast listing, fall back to filesystem
  let visions;
  try {
    visions = getRegisteredVisions(projectRoot);
  } catch {
    visions = listVisions(projectRoot);
  }

  if (visions.length === 0) {
    console.log('\n  No visions found.');
    console.log('   Run `ccasp vision init "your prompt"` to create one.');
    return;
  }

  const activeCount = visions.filter(v => v.status !== 'completed' && v.status !== 'failed').length;

  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│                   VISION MODE - LIST                        │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  console.log(`  Total: ${visions.length} vision(s), ${activeCount} active\n`);

  const format = options.json ? 'json' : 'table';

  if (format === 'json') {
    console.log(JSON.stringify(visions, null, 2));
    return;
  }

  console.log(`${'SLUG'.padEnd(25) + 'STATUS'.padEnd(14) + 'PLAN TYPE'.padEnd(16) + 'PROGRESS'.padEnd(10)}TITLE`);
  console.log('─'.repeat(80));

  for (const v of visions) {
    const status = getVisionStatus(projectRoot, v.slug);
    const pct = status?.completion_percentage || v.completion_percentage || 0;
    const title = (v.title || '').substring(0, 18) + ((v.title || '').length > 18 ? '..' : '');
    const planType = v.plan_type || 'unknown';
    const planLabel = planType !== 'unknown' ? describePlanType(planType).label : 'Unknown';

    console.log(
      (v.slug || '').substring(0, 23).padEnd(25) +
      (status?.status || v.status || 'unknown').padEnd(14) +
      planLabel.padEnd(16) +
      `${pct}%`.padEnd(10) +
      title
    );
  }

  console.log('');
}

/**
 * Run security scan
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - CLI options
 */
export async function visionScan(projectRoot, options) {
  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│         VISION MODE - SECURITY SCAN             │');
  console.log('└─────────────────────────────────────────────────┘\n');

  console.log('Scanning packages for vulnerabilities...\n');

  const results = await scanPackages(projectRoot);
  const report = generateSecurityReport(results, {
    format: options.json ? 'json' : 'text',
    threshold: options.threshold || 'high'
  });

  console.log(report);
}

/**
 * Run analysis phase only
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - CLI options
 */
export async function visionAnalyze(projectRoot, options) {
  const slug = options.slug || options.args?.[0];

  if (!slug) {
    console.log('\n❌ Please provide a vision slug.');
    return;
  }

  console.log('\n📊 Running analysis...\n');

  const orchestrator = createOrchestrator(projectRoot);
  const resumeResult = await orchestrator.resume(slug);

  if (!resumeResult.success) {
    console.log(`\n❌ Failed to load vision: ${resumeResult.error}`);
    return;
  }

  const result = await orchestrator.analyze();

  if (result.success) {
    console.log('Analysis Results:');
    console.log(JSON.stringify(result.results, null, 2));
  } else {
    console.log(`\n❌ Analysis failed: ${result.error}`);
  }
}

/**
 * Cleanup stale or failed visions
 * Removes visions that are stuck, failed, or have no files on disk.
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - CLI options (--dry-run, --force, --status)
 */
export async function visionCleanup(projectRoot, options = {}) {
  let visions;
  try {
    visions = getRegisteredVisions(projectRoot);
  } catch {
    visions = listVisions(projectRoot);
  }

  if (visions.length === 0) {
    console.log('\n  No visions to clean up.');
    return;
  }

  const dryRun = options.dryRun || options['dry-run'] || false;
  const force = options.force || false;
  const filterStatus = options.status || null;

  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│                VISION MODE - CLEANUP                        │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  if (dryRun) {
    console.log('  [DRY RUN] No files will be deleted.\n');
  }

  const candidates = [];
  const visionBaseDir = getVisionDir(projectRoot);

  for (const v of visions) {
    const slug = v.slug;
    const visionDir = path.join(visionBaseDir, slug);
    const dirExists = fs.existsSync(visionDir);
    const status = v.status || 'unknown';

    // Identify cleanup candidates
    let reason = null;

    if (!dirExists) {
      reason = 'missing directory (orphaned registry entry)';
    } else if (status === 'failed' && !force) {
      reason = 'failed status';
    } else if (filterStatus && status === filterStatus) {
      reason = `matches filter status: ${filterStatus}`;
    }

    if (reason) {
      candidates.push({ slug, status, reason, dirExists });
    }
  }

  if (candidates.length === 0) {
    console.log('  No stale or failed visions found. Everything looks clean.');
    return;
  }

  console.log(`  Found ${candidates.length} vision(s) to clean up:\n`);

  for (const c of candidates) {
    console.log(`  - ${c.slug} [${c.status}] → ${c.reason}`);
  }

  console.log('');

  if (dryRun) {
    console.log('  [DRY RUN] Would remove the above visions. Run without --dry-run to proceed.');
    return;
  }

  let removed = 0;
  for (const c of candidates) {
    try {
      // Remove directory if it exists
      if (c.dirExists) {
        const visionDir = path.join(visionBaseDir, c.slug);
        fs.rmSync(visionDir, { recursive: true, force: true });
      }

      // Deregister from registry
      try {
        deregisterVision(projectRoot, c.slug);
      } catch { /* Already gone or registry unavailable */ }

      removed++;
      console.log(`  Removed: ${c.slug}`);
    } catch (err) {
      console.log(`  Failed to remove ${c.slug}: ${err.message}`);
    }
  }

  console.log(`\n  Cleanup complete: ${removed}/${candidates.length} vision(s) removed.`);
}

/**
 * Run architecture phase only
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - CLI options
 */
export async function visionArchitect(projectRoot, options) {
  const slug = options.slug || options.args?.[0];

  if (!slug) {
    console.log('\n❌ Please provide a vision slug.');
    return;
  }

  console.log('\n🏗️  Generating architecture...\n');

  const orchestrator = createOrchestrator(projectRoot);
  const resumeResult = await orchestrator.resume(slug);

  if (!resumeResult.success) {
    console.log(`\n❌ Failed to load vision: ${resumeResult.error}`);
    return;
  }

  const result = await orchestrator.architect();

  if (result.success) {
    const a = result.artifacts;

    console.log('Architecture Artifacts:\n');

    if (a.diagrams?.component) {
      console.log('Component Diagram:');
      console.log(a.diagrams.component);
      console.log('');
    }

    if (a.diagrams?.dataFlow) {
      console.log('Data Flow Diagram:');
      console.log(a.diagrams.dataFlow);
      console.log('');
    }

    if (a.wireframes) {
      console.log('ASCII Wireframe:');
      console.log(a.wireframes);
      console.log('');
    }

    if (a.componentList?.length > 0) {
      console.log('Components:');
      for (const c of a.componentList) {
        console.log(`  - ${c}`);
      }
    }
  } else {
    console.log(`\n❌ Architecture failed: ${result.error}`);
  }
}
