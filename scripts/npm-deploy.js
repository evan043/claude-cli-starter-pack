#!/usr/bin/env node
/**
 * npm-deploy.js
 *
 * Automated npm deployment script for CCASP
 * Usage: node scripts/npm-deploy.js [patch|minor|major] [--skip-tests] [--skip-commit]
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function exec(cmd, options = {}) {
  log(`  $ ${cmd}`, 'dim');
  try {
    const result = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      shell: 'powershell.exe', // Use PowerShell on Windows for npm commands
      ...options,
    });
    return result;
  } catch (error) {
    if (options.ignoreError) {
      return null;
    }
    throw error;
  }
}

function execSilent(cmd) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
      shell: 'powershell.exe',
    }).trim();
  } catch {
    return null;
  }
}

function bumpVersion(currentVersion, type = 'patch') {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const bumpType = args.find(a => ['patch', 'minor', 'major'].includes(a)) || 'patch';
  const skipTests = args.includes('--skip-tests');
  const skipCommit = args.includes('--skip-commit');
  const skipPush = args.includes('--skip-push');
  const dryRun = args.includes('--dry-run');

  console.log('\n' + '═'.repeat(60));
  log('  CCASP npm Deploy Script', 'cyan');
  console.log('═'.repeat(60) + '\n');

  // 1. Read current version
  const packagePath = join(ROOT, 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  const currentVersion = packageJson.version;
  const newVersion = bumpVersion(currentVersion, bumpType);

  log(`Current version: ${currentVersion}`, 'yellow');
  log(`New version: ${newVersion} (${bumpType})`, 'green');

  if (dryRun) {
    log('\n[DRY RUN] Would perform the following:', 'yellow');
    log(`  1. Update package.json to v${newVersion}`);
    log(`  2. Run tests`);
    log(`  3. Commit and push`);
    log(`  4. Publish to npm`);
    log(`  5. Update local global install`);
    return;
  }

  const confirm = await prompt(`\nProceed with deployment? (y/N): `);
  if (confirm.toLowerCase() !== 'y') {
    log('\nAborted.', 'yellow');
    process.exit(0);
  }

  console.log('\n' + '─'.repeat(60));

  // 2. Update version in package.json
  log('\n[1/6] Updating package.json...', 'cyan');
  packageJson.version = newVersion;
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  log(`  ✓ Updated to v${newVersion}`, 'green');

  // 3. Update releases.json with new version entry
  log('\n[2/6] Updating releases.json...', 'cyan');
  const releasesPath = join(ROOT, 'src', 'data', 'releases.json');
  try {
    const releasesData = JSON.parse(readFileSync(releasesPath, 'utf8'));
    const today = new Date().toISOString().split('T')[0];

    // Check if version already exists
    const existingRelease = releasesData.releases.find(r => r.version === newVersion);
    if (!existingRelease) {
      // Add new release at the beginning
      releasesData.releases.unshift({
        version: newVersion,
        date: today,
        summary: 'Release notes pending',
        highlights: [],
        newFeatures: { commands: [], agents: [], skills: [], hooks: [], other: [] },
        breaking: [],
        deprecated: [],
      });
      writeFileSync(releasesPath, JSON.stringify(releasesData, null, 2) + '\n', 'utf8');
      log(`  ✓ Added v${newVersion} to releases.json`, 'green');
    } else {
      log(`  ○ v${newVersion} already in releases.json`, 'dim');
    }
  } catch (e) {
    log(`  ⚠ Could not update releases.json: ${e.message}`, 'yellow');
  }

  // 4. Run tests
  if (!skipTests) {
    log('\n[3/6] Running tests...', 'cyan');
    try {
      exec('npm test');
      log('  ✓ Tests passed', 'green');
    } catch (error) {
      log('  ✗ Tests failed!', 'red');
      // Revert version
      packageJson.version = currentVersion;
      writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
      process.exit(1);
    }
  } else {
    log('\n[3/6] Skipping tests...', 'yellow');
  }

  // 5. Git commit and push
  if (!skipCommit) {
    log('\n[4/6] Committing changes...', 'cyan');
    exec('git add -A');
    exec(`git commit -m "chore: release v${newVersion}"`);
    log('  ✓ Committed', 'green');

    if (!skipPush) {
      log('\n[5/6] Pushing to remote...', 'cyan');
      exec('git push origin master');
      log('  ✓ Pushed', 'green');
    } else {
      log('\n[5/6] Skipping push...', 'yellow');
    }
  } else {
    log('\n[4/6] Skipping commit...', 'yellow');
    log('\n[5/6] Skipping push...', 'yellow');
  }

  // 6. Publish to npm
  log('\n[6/6] Publishing to npm...', 'cyan');
  try {
    exec('npm publish');
    log(`  ✓ Published v${newVersion} to npm`, 'green');
  } catch (error) {
    log('  ✗ npm publish failed!', 'red');
    process.exit(1);
  }

  // 7. Update local global install
  log('\n[Bonus] Updating local global install...', 'cyan');
  try {
    // Wait for npm registry to propagate
    log('  Waiting for npm registry...', 'dim');
    await new Promise(resolve => setTimeout(resolve, 5000));

    exec('npm cache clean --force', { silent: true, ignoreError: true });
    exec('npm uninstall -g claude-cli-advanced-starter-pack', { ignoreError: true });
    exec('npm install -g claude-cli-advanced-starter-pack@latest');
    log(`  ✓ Global install updated to v${newVersion}`, 'green');
  } catch (error) {
    log(`  ⚠ Could not update global install: ${error.message}`, 'yellow');
    log('  Run manually: npm install -g claude-cli-advanced-starter-pack@latest', 'dim');
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  log('  ✓ Deployment Complete!', 'green');
  console.log('═'.repeat(60));
  log(`\n  Version: ${currentVersion} → ${newVersion}`, 'cyan');
  log(`  npm: https://www.npmjs.com/package/claude-cli-advanced-starter-pack`, 'dim');
  log(`  GitHub: https://github.com/evan043/claude-cli-advanced-starter-pack\n`, 'dim');
}

main().catch((error) => {
  log(`\nError: ${error.message}`, 'red');
  process.exit(1);
});
