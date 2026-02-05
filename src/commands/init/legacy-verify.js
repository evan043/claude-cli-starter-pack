/**
 * Legacy Installation Verification
 *
 * Verify and fix legacy installations (pre-v1.0.8)
 * Issue #8: Ensures update-check hook is properly configured
 *
 * Extracted from init.js for maintainability.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { safeWriteJson } from '../../utils/file-ops.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Verify and fix legacy installations (pre-v1.0.8)
 * Issue #8: Ensures update-check hook is properly configured
 *
 * @param {string} projectDir - Project directory to verify
 * @returns {Object} Verification result with fixes applied
 */
export async function verifyLegacyInstallation(projectDir = process.cwd()) {
  const fixes = [];
  const issues = [];

  const claudeDir = join(projectDir, '.claude');
  const hooksDir = join(claudeDir, 'hooks');
  const settingsPath = join(claudeDir, 'settings.json');
  const updateCheckHookPath = join(hooksDir, 'ccasp-update-check.js');

  // Check if this is a CCASP installation
  if (!existsSync(claudeDir)) {
    return { isLegacy: false, message: 'No .claude folder found' };
  }

  // Check 1: Does the update-check hook file exist and have correct paths?
  const templatePath = join(__dirname, '..', '..', '..', 'templates', 'hooks', 'ccasp-update-check.template.js');

  if (!existsSync(updateCheckHookPath)) {
    issues.push('Missing ccasp-update-check.js hook file');

    // Fix: Create the hook file
    if (!existsSync(hooksDir)) {
      mkdirSync(hooksDir, { recursive: true });
    }

    if (existsSync(templatePath)) {
      const hookContent = readFileSync(templatePath, 'utf8');
      writeFileSync(updateCheckHookPath, hookContent, 'utf8');
      fixes.push('Created ccasp-update-check.js hook file');
    }
  } else {
    // Check 1b: Hook exists - verify it has correct state file path (Issue #9 fix)
    const existingHook = readFileSync(updateCheckHookPath, 'utf8');
    const hasBuggyPath = existingHook.includes('.ccasp-dev/ccasp-state.json') ||
                         existingHook.includes("'.ccasp-dev/") ||
                         !existingHook.includes('.claude/config/ccasp-state.json');

    if (hasBuggyPath) {
      issues.push('Update-check hook has incorrect state file path (update notifications broken)');

      if (existsSync(templatePath)) {
        const hookContent = readFileSync(templatePath, 'utf8');
        writeFileSync(updateCheckHookPath, hookContent, 'utf8');
        fixes.push('Fixed ccasp-update-check.js state file path');
      }
    }
  }

  // Check 2: Is the hook registered in settings.json?
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));

      // Check if UserPromptSubmit hook exists with update-check
      const hasUpdateHook = settings.hooks?.UserPromptSubmit?.some(
        (h) => h.hooks?.some((hook) => hook.command?.includes('ccasp-update-check'))
      );

      if (!hasUpdateHook) {
        issues.push('Update-check hook not registered in settings.json');

        // Fix: Add the hook to settings.json
        if (!settings.hooks) settings.hooks = {};
        if (!settings.hooks.UserPromptSubmit) {
          settings.hooks.UserPromptSubmit = [];
        }

        settings.hooks.UserPromptSubmit.push({
          matcher: '',
          hooks: [{
            type: 'command',
            command: 'node .claude/hooks/ccasp-update-check.js',
          }],
        });

        safeWriteJson(settingsPath, settings);
        fixes.push('Registered update-check hook in settings.json');
      }
    } catch {
      issues.push('Could not parse settings.json');
    }
  }

  return {
    isLegacy: issues.length > 0,
    issues,
    fixes,
    message: fixes.length > 0
      ? `Fixed ${fixes.length} legacy installation issue(s)`
      : 'Installation is up to date',
  };
}
