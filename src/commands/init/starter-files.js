/**
 * Starter Files Creation
 * Creates example files and essential hooks
 */

import chalk from 'chalk';
import { existsSync, readdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { safeWriteFile } from '../../utils/file-ops.js';
import { createLogger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const log = createLogger('init:starter');

/**
 * Create starter files in empty folders
 * @param {Object} paths - Directory paths
 * @param {Object} generators - Generator functions
 */
export function createStarterFiles(paths, generators) {
  console.log(chalk.bold('Step 3: Creating starter files\n'));
  console.log(chalk.dim('  (Only creates examples in empty folders)\n'));

  createStarterAgent(paths.agentsDir, generators.generateStarterAgent);
  createStarterSkill(paths.skillsDir, generators.generateStarterSkill);
  createStarterHook(paths.hooksDir, generators.generateStarterHook);
  deployUpdateCheckHook(paths.hooksDir, generators.generateUpdateCheckHook);
  deployUsageTrackingHook(paths.hooksDir);

  console.log('');
}

/**
 * Create example agent if folder is empty
 */
function createStarterAgent(agentsDir, generateStarterAgent) {
  const agentFiles = existsSync(agentsDir)
    ? readdirSync(agentsDir).filter(f => f.endsWith('.md'))
    : [];

  if (agentFiles.length === 0) {
    const starterAgentPath = join(agentsDir, 'example-agent.md');
    writeFileSync(starterAgentPath, generateStarterAgent('example-agent'), 'utf8');
    log.info(chalk.green('  ✓ Created agents/example-agent.md (starter template)'));
  } else {
    log.debug(chalk.blue(`  ○ agents/ has ${agentFiles.length} existing agent(s) (preserved)`));
  }
}

/**
 * Create example skill if folder is empty
 */
function createStarterSkill(skillsDir, generateStarterSkill) {
  const skillDirs = existsSync(skillsDir)
    ? readdirSync(skillsDir).filter(f => !f.startsWith('.'))
    : [];

  if (skillDirs.length === 0) {
    const starterSkillDir = join(skillsDir, 'example-skill');
    safeWriteFile(join(starterSkillDir, 'skill.md'), generateStarterSkill('example-skill'));
    safeWriteFile(join(starterSkillDir, 'context', 'README.md'), '# Context\n\nAdd supporting documentation here.\n');
    safeWriteFile(join(starterSkillDir, 'workflows', 'README.md'), '# Workflows\n\nAdd step-by-step procedures here.\n');
    log.info(chalk.green('  ✓ Created skills/example-skill/ (starter template)'));
  } else {
    log.debug(chalk.blue(`  ○ skills/ has ${skillDirs.length} existing skill(s) (preserved)`));
  }
}

/**
 * Create example hook if folder is empty
 */
function createStarterHook(hooksDir, generateStarterHook) {
  const hookFiles = existsSync(hooksDir)
    ? readdirSync(hooksDir).filter(f => f.endsWith('.js'))
    : [];

  if (hookFiles.length === 0) {
    const starterHookPath = join(hooksDir, 'example-hook.js');
    writeFileSync(starterHookPath, generateStarterHook('example-hook', 'PreToolUse'), 'utf8');
    log.info(chalk.green('  ✓ Created hooks/example-hook.js (starter template)'));
  } else {
    log.debug(chalk.blue(`  ○ hooks/ has ${hookFiles.length} existing hook(s) (preserved)`));
  }
}

/**
 * Deploy CCASP update check hook (always updated)
 */
function deployUpdateCheckHook(hooksDir, generateUpdateCheckHook) {
  const updateCheckHookPath = join(hooksDir, 'ccasp-update-check.js');
  const templatePath = join(__dirname, '..', '..', '..', 'templates', 'hooks', 'ccasp-update-check.template.js');

  if (!existsSync(updateCheckHookPath)) {
    // Hook doesn't exist - create from template
    if (existsSync(templatePath)) {
      const hookContent = readFileSync(templatePath, 'utf8');
      writeFileSync(updateCheckHookPath, hookContent, 'utf8');
      log.info(chalk.green('  ✓ Created hooks/ccasp-update-check.js (update notifications)'));
    } else {
      // Fallback: create minimal version
      writeFileSync(updateCheckHookPath, generateUpdateCheckHook(), 'utf8');
      log.info(chalk.green('  ✓ Created hooks/ccasp-update-check.js (update notifications)'));
    }
  } else {
    // Hook exists - check if it has the buggy path (Issue #9: state file mismatch)
    const existingHook = readFileSync(updateCheckHookPath, 'utf8');
    const hasBuggyPath = existingHook.includes('.ccasp-dev/ccasp-state.json') ||
                         existingHook.includes("'.ccasp-dev/") ||
                         !existingHook.includes('.claude/config/ccasp-state.json');

    if (hasBuggyPath && existsSync(templatePath)) {
      // Replace with fixed template version
      const hookContent = readFileSync(templatePath, 'utf8');
      writeFileSync(updateCheckHookPath, hookContent, 'utf8');
      log.info(chalk.green('  ✓ Updated hooks/ccasp-update-check.js (fixed state file path)'));
    } else {
      log.debug(chalk.blue('  ○ hooks/ccasp-update-check.js exists (preserved)'));
    }
  }
}

/**
 * Deploy usage tracking hook
 */
function deployUsageTrackingHook(hooksDir) {
  const usageTrackingHookPath = join(hooksDir, 'usage-tracking.js');

  if (!existsSync(usageTrackingHookPath)) {
    const templatePath = join(__dirname, '..', '..', '..', 'templates', 'hooks', 'usage-tracking.template.js');
    if (existsSync(templatePath)) {
      const hookContent = readFileSync(templatePath, 'utf8');
      writeFileSync(usageTrackingHookPath, hookContent, 'utf8');
      log.info(chalk.green('  ✓ Created hooks/usage-tracking.js (smart merge tracking)'));
    }
  } else {
    log.debug(chalk.blue('  ○ hooks/usage-tracking.js exists (preserved)'));
  }
}
