/**
 * Hook: Auto-run Neovim UI tests after editing nvim-ccasp Lua files
 *
 * Triggers: After any .lua file in nvim-ccasp/ is modified
 * Action: Runs the smoke test suite to catch regressions immediately
 *
 * This ships with the CCASP NPM package.
 *
 * Configuration in .claude/settings.json:
 * {
 *   "hooks": {
 *     "PostToolUse": [{
 *       "matcher": "Edit|Write",
 *       "hooks": [".claude/hooks/nvim-after-edit-test.js"]
 *     }]
 *   }
 * }
 */

import { execSync } from 'child_process';
import { resolve } from 'path';

export default {
  name: 'nvim-after-edit-test',
  event: 'PostToolUse',
  matcher: /Edit|Write/,

  async handler(event) {
    // Only trigger for nvim-ccasp Lua files
    const filePath = event?.input?.file_path || event?.input?.filePath || '';
    if (!filePath.includes('nvim-ccasp') || !filePath.endsWith('.lua')) {
      return { skip: true };
    }

    // Skip test files themselves to avoid infinite loops
    if (filePath.includes('/tests/') || filePath.includes('/test/')) {
      return { skip: true };
    }

    console.log(`[nvim-after-edit-test] Lua file modified: ${filePath}`);
    console.log('[nvim-after-edit-test] Running smoke test...');

    try {
      const scriptPath = resolve('scripts', 'nvim-smoke.ps1');
      const result = execSync(`pwsh -File "${scriptPath}"`, {
        timeout: 30000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (result.includes('PASS') || result.includes('Success')) {
        console.log('[nvim-after-edit-test] Smoke test PASSED');
        return { pass: true };
      } else {
        console.warn('[nvim-after-edit-test] Smoke test may have issues');
        return { warn: true, message: result.slice(0, 500) };
      }
    } catch (err) {
      console.error('[nvim-after-edit-test] Smoke test FAILED');
      return {
        fail: true,
        message: `Smoke test failed after editing ${filePath}. Run /ui-fix to investigate.`,
        error: err.message?.slice(0, 300),
      };
    }
  },
};
