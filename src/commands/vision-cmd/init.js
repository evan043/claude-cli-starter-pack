/**
 * Vision Mode Init Command
 *
 * Handles vision initialization from natural language prompts.
 *
 * @module commands/vision-cmd/init
 */

import { createOrchestrator } from '../../vision/index.js';
import readline from 'readline';

/**
 * Initialize a new vision from a prompt
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - CLI options
 */
export async function visionInit(projectRoot, options) {
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
