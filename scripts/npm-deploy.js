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
 * Get files changed in commits that reference a specific issue
 * @param {number} issueNumber - The issue number to find commits for
 * @param {Array} commits - Array of commit objects with hash and message
 * @returns {Array} Array of file paths that were changed
 */
function getChangedFilesForIssue(issueNumber, commits) {
  const changedFiles = new Set();
  const issuePattern = new RegExp(`#${issueNumber}\\b`, 'i');

  for (const commit of commits) {
    if (issuePattern.test(commit.message)) {
      try {
        const files = execSilent(`git diff-tree --no-commit-id --name-only -r ${commit.hash}`);
        if (files) {
          files.split('\n').filter(Boolean).forEach(f => changedFiles.add(f));
        }
      } catch { /* ignore */ }
    }
  }

  return Array.from(changedFiles);
}

/**
 * Get git diff snippet for a file (limited to reasonable size)
 * @param {string} filePath - Path to the file
 * @param {string} baseRef - Base reference (tag or commit) to diff from
 * @returns {string} Formatted diff snippet or null
 */
function getDiffSnippet(filePath, baseRef) {
  try {
    const diff = execSilent(`git diff ${baseRef}..HEAD -- "${filePath}"`);
    if (!diff || diff.length < 10) return null;

    // Limit diff size to prevent huge issue bodies
    const lines = diff.split('\n');
    const maxLines = 50;

    if (lines.length > maxLines) {
      return lines.slice(0, maxLines).join('\n') + `\n... (${lines.length - maxLines} more lines truncated)`;
    }

    return diff;
  } catch {
    return null;
  }
}

/**
 * Generate resolution section with code snippets
 * @param {number} issueNumber - Issue number
 * @param {string} version - Release version
 * @param {Array} commits - Commits since last release
 * @param {string} lastTag - Last release tag for diff base
 * @returns {string} Markdown content for resolution section
 */
function generateResolutionSection(issueNumber, version, commits, lastTag) {
  const changedFiles = getChangedFilesForIssue(issueNumber, commits);
  const baseRef = lastTag || 'HEAD~10';

  let section = `\n\n---\n\n## Resolution\n\n`;
  section += `**Completed in v${version}**\n\n`;

  if (changedFiles.length === 0) {
    section += `_No specific file changes detected for this issue._\n`;
    return section;
  }

  section += `### Files Changed (${changedFiles.length})\n\n`;

  // Filter to only show relevant source files (not package-lock, etc.)
  const relevantFiles = changedFiles.filter(f =>
    !f.includes('package-lock.json') &&
    !f.includes('node_modules/') &&
    !f.endsWith('.lock')
  );

  for (const file of relevantFiles.slice(0, 5)) { // Max 5 files
    const ext = file.split('.').pop() || '';
    const langMap = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      json: 'json',
      md: 'markdown',
      css: 'css',
      html: 'html',
      jsx: 'jsx',
      tsx: 'tsx',
    };
    const lang = langMap[ext] || '';

    section += `<details>\n<summary><code>${file}</code></summary>\n\n`;

    const diff = getDiffSnippet(file, baseRef);
    if (diff) {
      section += `\`\`\`diff\n${diff}\n\`\`\`\n`;
    } else {
      section += `_No diff available_\n`;
    }

    section += `\n</details>\n\n`;
  }

  if (relevantFiles.length > 5) {
    section += `_... and ${relevantFiles.length - 5} more files_\n`;
  }

  return section;
}

/**
 * Update issue body by appending resolution section
 * @param {number} issueNumber - Issue number to update
 * @param {string} resolutionSection - Markdown content to append
 * @returns {boolean} Success status
 */
function updateIssueBody(issueNumber, resolutionSection) {
  try {
    // Get current issue body
    const issueData = execSilent(`gh issue view ${issueNumber} --json body`);
    if (!issueData) return false;

    const { body: currentBody } = JSON.parse(issueData);

    // Check if resolution section already exists
    if (currentBody && currentBody.includes('## Resolution')) {
      log(`  Issue #${issueNumber} already has a Resolution section, skipping body update`, 'dim');
      return true;
    }

    // Append resolution section to body
    const newBody = (currentBody || '') + resolutionSection;

    // Write to temp file to handle complex markdown
    const tempFile = join(ROOT, '.issue-body-temp.md');
    writeFileSync(tempFile, newBody, 'utf8');

    // Update issue body using file input
    execSilent(`gh issue edit ${issueNumber} --body-file "${tempFile}"`);

    // Clean up temp file
    try {
      execSync(`del "${tempFile}"`, { cwd: ROOT, stdio: 'pipe', shell: 'powershell.exe' });
    } catch { /* ignore cleanup errors */ }

    return true;
  } catch (error) {
    log(`  Failed to update issue #${issueNumber} body: ${error.message}`, 'yellow');
    return false;
  }
}

/**
 * Extract issue numbers from commit messages
 * Looks for patterns like: #123, fixes #123, closes #123, resolves #123
 */
function extractIssueNumbers(commits) {
  const issueNumbers = new Set();
  const issuePattern = /(?:fixes|closes|resolves|fix|close|resolve)?\s*#(\d+)/gi;

  for (const commit of commits) {
    let match;
    while ((match = issuePattern.exec(commit.message)) !== null) {
      issueNumbers.add(parseInt(match[1], 10));
    }
  }

  return Array.from(issueNumbers).sort((a, b) => a - b);
}

/**
 * Check GitHub for open issues that should be closed
 * Returns array of { number, title, state } for issues referenced in commits
 */
function checkOpenIssues(issueNumbers) {
  const openIssues = [];

  for (const num of issueNumbers) {
    try {
      const output = execSilent(`gh issue view ${num} --json number,title,state`);
      if (output) {
        const issue = JSON.parse(output);
        if (issue.state === 'OPEN') {
          openIssues.push(issue);
        }
      }
    } catch {
      // Issue doesn't exist or gh not available
    }
  }

  return openIssues;
}

/**
 * Close GitHub issues by updating their body with resolution details and code snippets
 * @param {Array} issues - Array of issue objects to close
 * @param {string} version - Release version
 * @param {Array} commits - Commits since last release (for finding changed files)
 * @param {string} lastTag - Last release tag (for diff base)
 */
function closeIssues(issues, version, commits = [], lastTag = null) {
  const closed = [];
  const failed = [];

  for (const issue of issues) {
    try {
      // Generate resolution section with code snippets
      const resolutionSection = generateResolutionSection(
        issue.number,
        version,
        commits,
        lastTag
      );

      // Update issue body with resolution section
      const bodyUpdated = updateIssueBody(issue.number, resolutionSection);

      if (!bodyUpdated) {
        log(`  ⚠ Could not update issue #${issue.number} body, adding comment instead`, 'yellow');
        // Fallback to comment if body update fails
        const comment = `Completed in v${version}. Closing automatically as part of release.`;
        execSilent(`gh issue close ${issue.number} --comment "${comment}"`);
      } else {
        // Close without additional comment (body has all the info)
        execSilent(`gh issue close ${issue.number}`);
      }

      closed.push(issue);
    } catch {
      failed.push(issue);
    }
  }

  return { closed, failed };
}

/**
 * Pre-deploy checkpoint: Audit session for unclosed issues
 * Scans commits for issue references and offers to close them
 * @param {Array} commits - Commits since last release
 * @param {string} newVersion - New version being released
 * @param {boolean} autoMode - Whether to auto-close without prompting
 * @param {string} lastTag - Last release tag for diff base
 */
async function auditAndCloseIssues(commits, newVersion, autoMode, lastTag = null) {
  log('\n[0/8] Pre-deploy checkpoint: Auditing issues...', 'cyan');

  // Extract issue numbers from commits
  const issueNumbers = extractIssueNumbers(commits);

  if (issueNumbers.length === 0) {
    log('  ✓ No issue references found in commits', 'green');
    return { checked: true, closed: [], skipped: [] };
  }

  log(`  Found ${issueNumbers.length} issue reference(s): #${issueNumbers.join(', #')}`, 'dim');

  // Check which issues are still open
  const openIssues = checkOpenIssues(issueNumbers);

  if (openIssues.length === 0) {
    log('  ✓ All referenced issues are already closed', 'green');
    return { checked: true, closed: [], skipped: [] };
  }

  // Display open issues
  console.log('\n' + '─'.repeat(60));
  log('\n⚠️  Found open issues that may need closing:', 'yellow');
  for (const issue of openIssues) {
    log(`  • #${issue.number}: ${issue.title}`, 'yellow');
  }

  // Auto mode: close automatically
  if (autoMode) {
    log('\n[AUTO MODE] Closing issues with code snippets...', 'cyan');
    const result = closeIssues(openIssues, newVersion, commits, lastTag);

    if (result.closed.length > 0) {
      log(`  ✓ Closed ${result.closed.length} issue(s)`, 'green');
      for (const issue of result.closed) {
        log(`    • #${issue.number}: ${issue.title}`, 'dim');
      }
    }

    if (result.failed.length > 0) {
      log(`  ⚠ Failed to close ${result.failed.length} issue(s)`, 'yellow');
      for (const issue of result.failed) {
        log(`    • #${issue.number}: ${issue.title}`, 'dim');
      }
    }

    return { checked: true, closed: result.closed, skipped: result.failed };
  }

  // Interactive mode: ask user
  const answer = await prompt(`\nClose these ${openIssues.length} issue(s) before deploying? (Y/n/select): `);

  if (answer.toLowerCase() === 'n') {
    log('  Skipping issue closure', 'dim');
    return { checked: true, closed: [], skipped: openIssues };
  }

  if (answer.toLowerCase() === 'select' || answer.toLowerCase() === 's') {
    // Let user pick which issues to close
    const toClose = [];
    for (const issue of openIssues) {
      const closeThis = await prompt(`  Close #${issue.number} (${issue.title})? (Y/n): `);
      if (closeThis.toLowerCase() !== 'n') {
        toClose.push(issue);
      }
    }

    if (toClose.length > 0) {
      const result = closeIssues(toClose, newVersion, commits, lastTag);
      log(`  ✓ Closed ${result.closed.length} issue(s) with code snippets`, 'green');
      return { checked: true, closed: result.closed, skipped: openIssues.filter(i => !toClose.includes(i)) };
    }

    return { checked: true, closed: [], skipped: openIssues };
  }

  // Default: close all
  const result = closeIssues(openIssues, newVersion, commits, lastTag);

  if (result.closed.length > 0) {
    log(`  ✓ Closed ${result.closed.length} issue(s)`, 'green');
  }

  return { checked: true, closed: result.closed, skipped: result.failed };
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

  // 0. Get commits for release notes and issue audit
  const commits = getCommitsSinceLastRelease();
  const lastTag = getLastReleaseTag();

  // Pre-deploy checkpoint: Audit and close issues (with code snippets)
  const issueAudit = await auditAndCloseIssues(commits, newVersion, autoMode, lastTag);

  console.log('\n' + '─'.repeat(60));

  // 1. Generate release notes
  const releaseNotes = await promptForReleaseNotes(commits, bumpType, autoMode);

  console.log('\n' + '─'.repeat(60));

  // 2. Update version in package.json
  log('\n[1/8] Updating package.json...', 'cyan');
  packageJson.version = newVersion;
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  log(`  ✓ Updated to v${newVersion}`, 'green');

  // 3. Update releases.json with new version entry and release notes
  log('\n[2/8] Updating releases.json with release notes...', 'cyan');
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
    log('\n[3/8] Running tests...', 'cyan');
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
    log('\n[3/8] Skipping tests...', 'yellow');
  }

  // 5. Git commit and push
  if (!skipCommit) {
    log('\n[4/8] Committing changes...', 'cyan');
    exec('git add -A');
    exec(`git commit -m "chore: release v${newVersion}"`);
    log('  ✓ Committed', 'green');

    if (!skipPush) {
      log('\n[5/8] Pushing to remote...', 'cyan');
      exec('git push origin master');
      log('  ✓ Pushed', 'green');
    } else {
      log('\n[5/8] Skipping push...', 'yellow');
    }
  } else {
    log('\n[4/8] Skipping commit...', 'yellow');
    log('\n[5/8] Skipping push...', 'yellow');
  }

  // 6. Create GitHub release with release notes
  if (!skipCommit && !skipPush) {
    log('\n[6/8] Creating GitHub release...', 'cyan');
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
    log('\n[6/8] Skipping GitHub release (commit/push skipped)...', 'yellow');
  }

  // 7. Publish to npm
  log('\n[7/8] Publishing to npm...', 'cyan');
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

  // Show closed issues in summary
  if (issueAudit.closed.length > 0) {
    log(`  Issues closed: ${issueAudit.closed.map(i => `#${i.number}`).join(', ')}`, 'green');
  }

  log(`  npm: https://www.npmjs.com/package/claude-cli-advanced-starter-pack`, 'dim');
  log(`  GitHub: https://github.com/evan043/claude-cli-advanced-starter-pack\n`, 'dim');
}

main().catch((error) => {
  log(`\nError: ${error.message}`, 'red');
  process.exit(1);
});
