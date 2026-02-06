/**
 * Vision Mode Operations Commands
 *
 * Provides:
 * - visionList: List all visions
 * - visionScan: Run security scan
 * - visionAnalyze: Run analysis phase only
 * - visionArchitect: Run architecture phase only
 *
 * @module commands/vision-cmd/operations
 */

import { createOrchestrator, listVisions, getVisionStatus } from '../../vision/index.js';
import { scanPackages, generateSecurityReport } from '../../vision/security/index.js';

/**
 * List all visions
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - CLI options
 */
export async function visionList(projectRoot, options) {
  const visions = listVisions(projectRoot);

  if (visions.length === 0) {
    console.log('\n📭 No visions found.');
    console.log('   Run `ccasp vision init "your prompt"` to create one.');
    return;
  }

  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│              VISION MODE - LIST                 │');
  console.log('└─────────────────────────────────────────────────┘\n');

  const format = options.json ? 'json' : 'table';

  if (format === 'json') {
    console.log(JSON.stringify(visions, null, 2));
    return;
  }

  console.log(`${'SLUG'.padEnd(30) + 'STATUS'.padEnd(15) + 'PROGRESS'.padEnd(12)  }TITLE`);
  console.log('─'.repeat(75));

  for (const v of visions) {
    const status = getVisionStatus(projectRoot, v.slug);
    const pct = status?.completion_percentage || 0;
    const title = v.title.substring(0, 20) + (v.title.length > 20 ? '...' : '');

    console.log(
      v.slug.substring(0, 28).padEnd(30) +
      (status?.status || 'unknown').padEnd(15) +
      `${pct}%`.padEnd(12) +
      title
    );
  }

  console.log(`\nTotal: ${visions.length} vision(s)`);
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
