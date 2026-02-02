/**
 * Agent Launch Logic for Menu System
 * Handles launching Claude CLI sessions in Agent-Only mode
 */

import chalk from 'chalk';
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { getAgentOnlyPolicy } from './constants.js';

/**
 * Launch a new Claude CLI session in Agent-Only mode with Bypass Permissions
 */
export async function launchAgentOnlySession() {
  console.log('');
  console.log(chalk.cyan('╔════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold.yellow('          ⚡ LAUNCHING AGENT-ONLY MODE + BYPASS ALL PERMISSIONS ⚡         ') + chalk.cyan('║'));
  console.log(chalk.cyan('╠════════════════════════════════════════════════════════════════════════════╣'));
  console.log(chalk.cyan('║') + '                                                                            ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('   Direct tools: Read/Glob/Grep (2 max) | FORBIDDEN: Bash/Write/Edit       ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.dim('   All tool calls will be auto-approved (bypassPermissions)                ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                                            ' + chalk.cyan('║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════════════════╝'));
  console.log('');

  const policy = getAgentOnlyPolicy();
  const appendPrompt = `
======================================================================
AGENT-ONLY EXECUTION MODE ACTIVE - BYPASS ALL PERMISSIONS ENABLED
======================================================================

${policy}
`;

  // Determine platform and launch accordingly
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    // On Windows, launch a new terminal with claude
    console.log(chalk.green('  ✓ Launching new terminal window with Agent-Only + Bypass mode...'));
    console.log('');

    const child = spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', 'claude', '--dangerously-skip-permissions', '--append-system-prompt', appendPrompt], {
      detached: true,
      stdio: 'ignore',
      shell: true,
      windowsHide: false,
    });

    child.unref();
  } else {
    // On Mac/Linux, try to detect the terminal and launch
    const terminal = process.env.TERM_PROGRAM || 'xterm';

    console.log(chalk.green('  ✓ Launching new terminal with Agent-Only + Bypass mode...'));
    console.log('');

    // Write prompt to temp file to avoid shell escaping issues
    const tempPromptFile = join(tmpdir(), `ccasp-agent-prompt-${Date.now()}.txt`);
    writeFileSync(tempPromptFile, appendPrompt, 'utf8');

    let terminalCmd;
    // Use --append-system-prompt with file read to avoid complex shell escaping
    // The temp file approach prevents any shell injection from appendPrompt content
    const claudeCmd = `claude --dangerously-skip-permissions --append-system-prompt "$(cat '${tempPromptFile}')" ; rm '${tempPromptFile}'`;

    if (terminal.includes('iTerm') || process.platform === 'darwin') {
      // macOS - use osascript to open Terminal
      // AppleScript escaping: only need to escape backslashes and quotes for the outer string
      const escapedCmd = claudeCmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      terminalCmd = spawn('osascript', [
        '-e',
        `tell application "Terminal" to do script "${escapedCmd}"`,
      ], {
        detached: true,
        stdio: 'ignore',
      });
    } else {
      // Linux - try common terminals
      // Use array form to avoid shell interpretation issues
      terminalCmd = spawn('x-terminal-emulator', ['-e', 'bash', '-c', claudeCmd], {
        detached: true,
        stdio: 'ignore',
      });
    }

    if (terminalCmd) {
      terminalCmd.unref();
    }
  }

  console.log(chalk.yellow('  ℹ  New Claude session starting in separate terminal'));
  console.log(chalk.dim('      The new session has Agent-Only policy + Bypass All Permissions enabled'));
  console.log('');

  return { launched: true };
}
