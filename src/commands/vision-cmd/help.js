/**
 * Vision Mode Help and Dashboard Commands
 *
 * Provides:
 * - showVisionHelp: Display help text
 * - visionDashboard: Start web dashboard
 *
 * @module commands/vision-cmd/help
 */

import { startDashboard } from '../../vision/dashboard/server.js';

/**
 * Show help
 */
export function showVisionHelp() {
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
 * Start vision dashboard web interface
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - CLI options
 */
export async function visionDashboard(projectRoot, options) {
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
