/**
 * Vision Mode CLI Command
 *
 * Entry point for Vision Mode orchestration - transform natural language
 * prompts into complete, working MVPs through autonomous development.
 *
 * Usage:
 *   ccasp vision init "Build a todo app with React and FastAPI"
 *   ccasp vision status [slug]
 *   ccasp vision run [slug]
 *   ccasp vision list
 *   ccasp vision resume <slug>
 *
 * @module commands/vision
 */

import { createOrchestrator, quickRun, listVisions, loadVision, getVisionStatus } from '../vision/index.js';
import { scanPackages, generateSecurityReport } from '../vision/security/index.js';
import { startDashboard } from '../vision/dashboard/server.js';
import readline from 'readline';

/**
 * Vision Mode CLI - main entry point
 * @param {string} subcommand - Subcommand (init, status, run, list, resume, scan)
 * @param {Object} options - CLI options
 */
export async function runVision(subcommand, options = {}) {
  const projectRoot = process.cwd();

  switch (subcommand) {
    case 'init':
      await visionInit(projectRoot, options);
      break;

    case 'status':
      await visionStatus(projectRoot, options);
      break;

    case 'run':
      await visionRun(projectRoot, options);
      break;

    case 'list':
      await visionList(projectRoot, options);
      break;

    case 'resume':
      await visionResume(projectRoot, options);
      break;

    case 'scan':
      await visionScan(projectRoot, options);
      break;

    case 'analyze':
      await visionAnalyze(projectRoot, options);
      break;

    case 'architect':
      await visionArchitect(projectRoot, options);
      break;

    case 'dashboard':
      await visionDashboard(projectRoot, options);
      break;

    default:
      showVisionHelp();
  }
}

/**
 * Initialize a new vision from a prompt
 */
async function visionInit(projectRoot, options) {
  const prompt = options.prompt || options.args?.join(' ');

  if (!prompt) {
    console.log('\n┌─────────────────────────────────────────────────┐');
    console.log('│         VISION MODE - INITIALIZATION            │');
    console.log('└─────────────────────────────────────────────────┘\n');

    // Interactive prompt entry
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const userPrompt = await new Promise((resolve) => {
      rl.question('Enter your vision (describe what you want to build):\n> ', (answer) => {
        rl.close();
        resolve(answer);
      });
    });

    if (!userPrompt?.trim()) {
      console.log('\n❌ No prompt provided. Vision initialization cancelled.');
      return;
    }

    return visionInit(projectRoot, { ...options, prompt: userPrompt.trim() });
  }

  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│         VISION MODE - INITIALIZING              │');
  console.log('└─────────────────────────────────────────────────┘\n');

  console.log(`Prompt: "${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}"\n`);

  const orchestrator = createOrchestrator(projectRoot, {
    security: {
      enabled: !options.noSecurity,
      blockThreshold: options.securityThreshold || 'high'
    },
    autonomous: {
      enabled: !options.manual
    }
  });

  // Initialize vision
  console.log('Parsing prompt and detecting requirements...');
  const initResult = await orchestrator.initialize(prompt, {
    title: options.title,
    tags: options.tags?.split(',') || [],
    priority: options.priority || 'medium'
  });

  if (!initResult.success) {
    console.log(`\n❌ Initialization failed: ${initResult.error}`);
    return;
  }

  console.log(`\n✓ Vision created: ${initResult.vision.slug}`);
  console.log(`  Title: ${initResult.vision.title}`);
  console.log(`  Intent: ${initResult.intent}`);
  console.log(`  Complexity: ${initResult.complexity}`);
  console.log(`  Features: ${initResult.features.length}`);

  if (initResult.accountRequirements?.accounts?.length > 0) {
    console.log('\n📋 Account Requirements Detected:');
    for (const account of initResult.accountRequirements.accounts) {
      console.log(`  - ${account.service}: ${account.reason}`);
    }
  }

  // Run analysis if not skipped
  if (!options.skipAnalysis) {
    console.log('\n📊 Running analysis...');
    const analysisResult = await orchestrator.analyze();

    if (analysisResult.success) {
      const r = analysisResult.results;
      console.log(`  Similar apps found: ${r.similarApps?.length || 0}`);
      console.log(`  NPM packages suggested: ${r.npmPackages?.length || 0}`);
      console.log(`  MCP servers matched: ${r.mcpServers?.length || 0}`);
    }
  }

  // Run architecture if not skipped
  if (!options.skipArchitecture) {
    console.log('\n🏗️  Generating architecture...');
    const archResult = await orchestrator.architect();

    if (archResult.success) {
      const a = archResult.artifacts;
      console.log(`  Diagrams generated: ${Object.keys(a.diagrams).length}`);
      console.log(`  Components identified: ${a.componentList?.length || 0}`);
      console.log(`  API contracts: ${a.apiContracts ? 'Yes' : 'No'}`);
    }
  }

  // Run security scan
  if (!options.noSecurity) {
    console.log('\n🔒 Running security scan...');
    const securityResult = await orchestrator.scanSecurity();

    if (securityResult.results?.hasBlockedPackages) {
      console.log(`\n⚠️  ${securityResult.results.blocked.length} package(s) blocked due to vulnerabilities`);
      console.log('  Run `ccasp vision scan` for details.');
    } else {
      console.log('  ✓ No critical vulnerabilities found');
    }
  }

  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│         VISION INITIALIZED SUCCESSFULLY         │');
  console.log('└─────────────────────────────────────────────────┘');
  console.log(`\nSlug: ${initResult.vision.slug}`);
  console.log(`\nNext steps:`);
  console.log(`  ccasp vision status ${initResult.vision.slug}  # View status`);
  console.log(`  ccasp vision run ${initResult.vision.slug}     # Start execution`);
  console.log(`  /vision-status                                 # Claude Code slash command`);
}

/**
 * Show vision status
 */
async function visionStatus(projectRoot, options) {
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
 * Run vision execution
 */
async function visionRun(projectRoot, options) {
  const slug = options.slug || options.args?.[0];

  if (!slug) {
    console.log('\n❌ Please provide a vision slug.');
    console.log('   Usage: ccasp vision run <slug>');
    console.log('   Run `ccasp vision list` to see available visions.');
    return;
  }

  const vision = await loadVision(projectRoot, slug);

  if (!vision) {
    console.log(`\n❌ Vision not found: ${slug}`);
    return;
  }

  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│         VISION MODE - EXECUTING                 │');
  console.log('└─────────────────────────────────────────────────┘\n');

  console.log(`Vision: ${vision.title}`);
  console.log(`Slug: ${slug}\n`);

  const orchestrator = createOrchestrator(projectRoot, {
    autonomous: {
      enabled: !options.manual,
      maxIterations: options.maxIterations ? parseInt(options.maxIterations) : 100
    }
  });

  // Resume from saved state
  const resumeResult = await orchestrator.resume(slug);

  if (!resumeResult.success) {
    console.log(`\n❌ Failed to resume vision: ${resumeResult.error}`);
    return;
  }

  console.log(`Resuming from stage: ${resumeResult.stage}`);
  console.log(`Current status: ${resumeResult.vision.status}`);
  console.log('');

  // Execute
  console.log('Starting autonomous execution...\n');
  const execResult = await orchestrator.execute();

  if (execResult.success) {
    console.log('\n✓ Execution completed successfully');

    // Run validation
    console.log('\nRunning validation...');
    const validateResult = await orchestrator.validate();

    if (validateResult.success && validateResult.result.mvp.complete) {
      console.log('\n✓ MVP verification passed');

      // Complete the vision
      const completeResult = await orchestrator.complete();

      if (completeResult.success) {
        console.log('\n┌─────────────────────────────────────────────────┐');
        console.log('│         VISION COMPLETED SUCCESSFULLY           │');
        console.log('└─────────────────────────────────────────────────┘');
      }
    } else {
      console.log('\n⚠️  MVP not fully complete');
      if (validateResult.result?.mvp?.missing?.length > 0) {
        console.log('Missing items:');
        for (const item of validateResult.result.mvp.missing) {
          console.log(`  - ${item}`);
        }
      }
    }
  } else {
    console.log(`\n⚠️  Execution stopped: ${execResult.result?.reason || execResult.error}`);

    if (execResult.result?.reason === 'escalation_required') {
      console.log('\nManual intervention required. Review failures and retry.');
    }
  }
}

/**
 * List all visions
 */
async function visionList(projectRoot, options) {
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

  console.log('SLUG'.padEnd(30) + 'STATUS'.padEnd(15) + 'PROGRESS'.padEnd(12) + 'TITLE');
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
 * Resume a paused vision
 */
async function visionResume(projectRoot, options) {
  const slug = options.slug || options.args?.[0];

  if (!slug) {
    console.log('\n❌ Please provide a vision slug to resume.');
    console.log('   Usage: ccasp vision resume <slug>');
    return;
  }

  // Delegate to run command
  await visionRun(projectRoot, { ...options, slug });
}

/**
 * Run security scan
 */
async function visionScan(projectRoot, options) {
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
 */
async function visionAnalyze(projectRoot, options) {
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
 */
async function visionArchitect(projectRoot, options) {
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

/**
 * Start vision dashboard web interface
 */
async function visionDashboard(projectRoot, options) {
  const port = options.port ? parseInt(options.port) : 3847;
  const host = options.host || 'localhost';

  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│         VISION MODE - DASHBOARD                 │');
  console.log('└─────────────────────────────────────────────────┘\n');

  console.log('Starting Vision Dashboard...\n');

  try {
    const server = await startDashboard(projectRoot, { port, host });

    const url = `http://${host}:${port}`;
    console.log(`\n┌─────────────────────────────────────────────────┐`);
    console.log(`│  Dashboard running at: ${url.padEnd(23)} │`);
    console.log(`└─────────────────────────────────────────────────┘`);
    console.log('\nFeatures:');
    console.log('  - Real-time vision status updates (WebSocket)');
    console.log('  - Progress and alignment tracking');
    console.log('  - Drift event monitoring');
    console.log('  - Roadmap completion tracking');
    console.log('\nPress Ctrl+C to stop the server.');

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nShutting down dashboard...');
      await server.stop();
      process.exit(0);
    });

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    console.error(`\n❌ Failed to start dashboard: ${error.message}`);
    if (error.message.includes('already in use')) {
      console.log(`   Try a different port: ccasp vision dashboard --port ${port + 1}`);
    }
  }
}

/**
 * Show help
 */
function showVisionHelp() {
  console.log(`
┌─────────────────────────────────────────────────┐
│              VISION MODE - HELP                 │
└─────────────────────────────────────────────────┘

Vision Mode transforms natural language prompts into complete,
working MVPs through autonomous development.

COMMANDS:

  ccasp vision init <prompt>    Initialize new vision from prompt
  ccasp vision status [slug]    Show vision status (all or specific)
  ccasp vision run <slug>       Execute vision (autonomous mode)
  ccasp vision list             List all visions
  ccasp vision resume <slug>    Resume paused vision
  ccasp vision scan             Run security scan
  ccasp vision analyze <slug>   Run analysis phase
  ccasp vision architect <slug> Run architecture phase
  ccasp vision dashboard        Start web dashboard (real-time updates)

OPTIONS:

  --title <title>          Custom vision title
  --tags <tags>            Comma-separated tags
  --priority <level>       Priority: low, medium, high
  --no-security            Skip security scanning
  --skip-analysis          Skip analysis phase
  --skip-architecture      Skip architecture phase
  --manual                 Disable autonomous execution
  --max-iterations <n>     Max execution iterations
  --json                   Output as JSON
  --port <port>            Dashboard port (default: 3847)
  --host <host>            Dashboard host (default: localhost)

EXAMPLES:

  # Create a new vision
  ccasp vision init "Build a todo app with React and FastAPI"

  # Create with options
  ccasp vision init "E-commerce site" --title "Shop MVP" --priority high

  # Check status
  ccasp vision status

  # Run specific vision
  ccasp vision run todo-app-with-react-and-fastapi

SLASH COMMANDS (in Claude Code):

  /vision-init     Initialize vision interactively
  /vision-status   View current vision status
  /vision-run      Start autonomous execution
  /vision-adjust   Adjust vision when drift detected

WEB DASHBOARD:

  ccasp vision dashboard             Start at http://localhost:3847
  ccasp vision dashboard --port 8080 Start on custom port
`);
}

/**
 * Generate ASCII progress bar
 * @param {number} percentage - Completion percentage
 * @returns {string} Progress bar string
 */
function generateProgressBar(percentage) {
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export default {
  runVision
};
