#!/usr/bin/env node
/**
 * npm-deploy.js
 *
 * Automated npm deployment script for CCASP
 * Usage: node scripts/npm-deploy.js [patch|minor|major] [--skip-tests] [--skip-commit]
 *
 * Now includes automatic release notes generation from git commits
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

/**
 * Get the last release tag from git
 */
function getLastReleaseTag() {
  try {
    const tags = execSilent('git tag --sort=-v:refname');
    if (!tags) return null;
    const tagList = tags.split('\n').filter(t => t.startsWith('v'));
    return tagList[0] || null;
  } catch {
    return null;
  }
}

/**
 * Get commits since the last release tag
 */
function getCommitsSinceLastRelease() {
  const lastTag = getLastReleaseTag();
  let commits = [];

  try {
    let cmd;
    if (lastTag) {
      cmd = `git log ${lastTag}..HEAD --oneline --no-decorate`;
    } else {
      // No tags yet, get last 10 commits
      cmd = 'git log -10 --oneline --no-decorate';
    }

    const output = execSilent(cmd);
    if (output) {
      commits = output.split('\n').filter(Boolean).map(line => {
        const match = line.match(/^([a-f0-9]+)\s+(.+)$/);
        if (match) {
          return { hash: match[1], message: match[2] };
        }
        return null;
      }).filter(Boolean);
    }
  } catch {
    // Silently fail
  }

  return commits;
}

/**
 * Parse commit messages to extract release notes info
 */
function parseCommitsForReleaseNotes(commits) {
  const features = [];
  const fixes = [];
  const other = [];

  for (const commit of commits) {
    const msg = commit.message.toLowerCase();

    // Skip release commits themselves
    if (msg.includes('release v') || msg.includes('chore: release')) {
      continue;
    }

    // Categorize based on conventional commits
    if (msg.startsWith('feat:') || msg.startsWith('feat(')) {
      features.push(commit.message.replace(/^feat(\([^)]+\))?:\s*/i, ''));
    } else if (msg.startsWith('fix:') || msg.startsWith('fix(')) {
      fixes.push(commit.message.replace(/^fix(\([^)]+\))?:\s*/i, ''));
    } else if (!msg.startsWith('chore:') && !msg.startsWith('docs:')) {
      other.push(commit.message);
    }
  }

  return { features, fixes, other };
}

/**
 * Generate release summary from parsed commits
 */
function generateReleaseSummary(parsed, bumpType) {
  const parts = [];

  if (parsed.features.length > 0) {
    parts.push(`Feature: ${parsed.features[0]}`);
  } else if (parsed.fixes.length > 0) {
    parts.push(`Fix: ${parsed.fixes[0]}`);
  } else if (parsed.other.length > 0) {
    parts.push(parsed.other[0]);
  }

  if (parts.length === 0) {
    switch (bumpType) {
      case 'major':
        return 'Major release';
      case 'minor':
        return 'New features and improvements';
      default:
        return 'Bug fixes and improvements';
    }
  }

  return parts[0];
}

/**
 * Generate highlights from parsed commits
 */
function generateHighlights(parsed) {
  const highlights = [];

  // Add features as highlights
  for (const feat of parsed.features.slice(0, 5)) {
    highlights.push(feat);
  }

  // Add fixes if we have room
  for (const fix of parsed.fixes.slice(0, 3)) {
    if (highlights.length < 7) {
      highlights.push(`Fixed: ${fix}`);
    }
  }

  return highlights;
}

/**
 * Prompt for release notes with commit context
 */
async function promptForReleaseNotes(commits, bumpType, autoMode) {
  const parsed = parseCommitsForReleaseNotes(commits);
  const autoSummary = generateReleaseSummary(parsed, bumpType);
  const autoHighlights = generateHighlights(parsed);

  // Show commits since last release
  if (commits.length > 0) {
    console.log('\n' + '─'.repeat(60));
    log('\n📋 Commits since last release:', 'cyan');
    for (const commit of commits.slice(0, 10)) {
      log(`  • ${commit.message}`, 'dim');
    }
    if (commits.length > 10) {
      log(`  ... and ${commits.length - 10} more`, 'dim');
    }
  }

  // Auto mode: use generated notes
  if (autoMode) {
    log('\n[AUTO MODE] Using auto-generated release notes', 'cyan');
    return {
      summary: autoSummary,
      highlights: autoHighlights,
    };
  }

  // Interactive mode: allow editing
  console.log('\n' + '─'.repeat(60));
  log('\n📝 Release Notes', 'cyan');
  log(`Auto-generated summary: ${autoSummary}`, 'dim');

  const customSummary = await prompt(`\nRelease summary (Enter to accept auto-generated): `);
  const summary = customSummary || autoSummary;

  // Show auto-generated highlights
  if (autoHighlights.length > 0) {
    log('\nAuto-generated highlights:', 'dim');
    autoHighlights.forEach((h, i) => log(`  ${i + 1}. ${h}`, 'dim'));
  }

  const customHighlights = await prompt(`\nAdd custom highlights? (comma-separated, or Enter to use auto): `);

  let highlights = autoHighlights;
  if (customHighlights) {
    highlights = customHighlights.split(',').map(h => h.trim()).filter(Boolean);
  }

  return { summary, highlights };
}

async function main() {
  const args = process.argv.slice(2);
  const bumpType = args.find(a => ['patch', 'minor', 'major'].includes(a)) || 'patch';
  const skipTests = args.includes('--skip-tests');
  const skipCommit = args.includes('--skip-commit');
  const skipPush = args.includes('--skip-push');
  const dryRun = args.includes('--dry-run');
  const autoMode = args.includes('--auto') || args.includes('-y');

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

  if (!autoMode) {
    const confirm = await prompt(`\nProceed with deployment? (y/N): `);
    if (confirm.toLowerCase() !== 'y') {
      log('\nAborted.', 'yellow');
      process.exit(0);
    }
  } else {
    log('\n[AUTO MODE] Proceeding without confirmation...', 'cyan');
  }

  console.log('\n' + '─'.repeat(60));

  // 1b. Get commits for release notes generation
  const commits = getCommitsSinceLastRelease();
  const releaseNotes = await promptForReleaseNotes(commits, bumpType, autoMode);

  console.log('\n' + '─'.repeat(60));

  // 2. Update version in package.json
  log('\n[1/7] Updating package.json...', 'cyan');
  packageJson.version = newVersion;
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  log(`  ✓ Updated to v${newVersion}`, 'green');

  // 3. Update releases.json with new version entry and release notes
  log('\n[2/7] Updating releases.json with release notes...', 'cyan');
  const releasesPath = join(ROOT, 'src', 'data', 'releases.json');
  try {
    const releasesData = JSON.parse(readFileSync(releasesPath, 'utf8'));
    const today = new Date().toISOString().split('T')[0];

    // Check if version already exists
    const existingIndex = releasesData.releases.findIndex(r => r.version === newVersion);
    const releaseEntry = {
      version: newVersion,
      date: today,
      summary: releaseNotes.summary,
      highlights: releaseNotes.highlights,
      newFeatures: { commands: [], agents: [], skills: [], hooks: [], other: [] },
      breaking: [],
      deprecated: [],
    };

    if (existingIndex === -1) {
      // Add new release at the beginning
      releasesData.releases.unshift(releaseEntry);
      log(`  ✓ Added v${newVersion} to releases.json`, 'green');
    } else {
      // Update existing entry with release notes
      releasesData.releases[existingIndex] = {
        ...releasesData.releases[existingIndex],
        ...releaseEntry,
      };
      log(`  ✓ Updated v${newVersion} in releases.json`, 'green');
    }

    writeFileSync(releasesPath, JSON.stringify(releasesData, null, 2) + '\n', 'utf8');
    log(`  Summary: ${releaseNotes.summary}`, 'dim');
    if (releaseNotes.highlights.length > 0) {
      log(`  Highlights: ${releaseNotes.highlights.length} items`, 'dim');
    }
  } catch (e) {
    log(`  ⚠ Could not update releases.json: ${e.message}`, 'yellow');
  }

  // 4. Run tests
  if (!skipTests) {
    log('\n[3/7] Running tests...', 'cyan');
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
    log('\n[3/7] Skipping tests...', 'yellow');
  }

  // 5. Git commit and push
  if (!skipCommit) {
    log('\n[4/7] Committing changes...', 'cyan');
    exec('git add -A');
    exec(`git commit -m "chore: release v${newVersion}"`);
    log('  ✓ Committed', 'green');

    if (!skipPush) {
      log('\n[5/7] Pushing to remote...', 'cyan');
      exec('git push origin master');
      log('  ✓ Pushed', 'green');
    } else {
      log('\n[5/7] Skipping push...', 'yellow');
    }
  } else {
    log('\n[4/7] Skipping commit...', 'yellow');
    log('\n[5/7] Skipping push...', 'yellow');
  }

  // 6. Create GitHub release with release notes
  if (!skipCommit && !skipPush) {
    log('\n[6/7] Creating GitHub release...', 'cyan');
    try {
      const tagName = `v${newVersion}`;
      const releaseBody = `## ${releaseNotes.summary}

${releaseNotes.highlights.length > 0 ? '### Highlights\n' + releaseNotes.highlights.map(h => `- ${h}`).join('\n') : ''}

**Full Changelog**: https://github.com/evan043/claude-cli-advanced-starter-pack/compare/${getLastReleaseTag() || 'v1.0.0'}...${tagName}
`.trim();

      // Create tag
      exec(`git tag -a ${tagName} -m "${releaseNotes.summary}"`, { ignoreError: true });
      exec(`git push origin ${tagName}`, { ignoreError: true });

      // Create GitHub release using gh CLI
      const escapedBody = releaseBody.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      exec(`gh release create ${tagName} --title "${tagName}" --notes "${escapedBody}"`, { ignoreError: true });
      log(`  ✓ Created GitHub release ${tagName}`, 'green');
    } catch (error) {
      log(`  ⚠ Could not create GitHub release: ${error.message}`, 'yellow');
      log('  Create manually at: https://github.com/evan043/claude-cli-advanced-starter-pack/releases/new', 'dim');
    }
  } else {
    log('\n[6/7] Skipping GitHub release (commit/push skipped)...', 'yellow');
  }

  // 7. Publish to npm
  log('\n[7/7] Publishing to npm...', 'cyan');
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
