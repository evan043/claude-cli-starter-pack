/**
 * CCASP Dev Mode - Update Check Hook (CommonJS)
 * Runs on PreToolUse to remind about dev mode status
 */

const fs = require('fs');
const path = require('path');

// Read dev state
const devStatePath = path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'ccasp-dev-state.json');

try {
  if (fs.existsSync(devStatePath)) {
    const state = JSON.parse(fs.readFileSync(devStatePath, 'utf8'));
    if (state.isDevMode) {
      // Dev mode is active - no action needed
      process.exit(0);
    }
  }
} catch (err) {
  // Ignore errors
}

process.exit(0);
