/**
 * Notification System Module
 *
 * Handles update notification logic and formatting.
 */

import { getCurrentVersion, compareVersions } from './checker.js';
import { getNewFeaturesSince, getReleasesSince } from './releases.js';
import { loadUpdateState, saveUpdateState } from './state.js';

// Cache duration: 1 hour (in milliseconds)
const CACHE_DURATION = 60 * 60 * 1000;

// Update notification reminder: Show reminder again after 7 days
// Issue #8: Changed from 1-day suppression to 7-day reminder
const UPDATE_NOTIFICATION_REMINDER = 7 * 24 * 60 * 60 * 1000;

/**
 * Check if update notification should be shown
 * Returns false if:
 * - Update was dismissed and is now more than 1 day old
 * - User has already seen this version
 */
export function shouldShowUpdateNotification(state, latestVersion) {
  const currentVersion = getCurrentVersion();

  // No update available
  if (!latestVersion || compareVersions(latestVersion, currentVersion) <= 0) {
    return false;
  }

  // Check if this version was dismissed
  if (state.dismissedVersions?.includes(latestVersion)) {
    return false;
  }

  // Issue #8: Always show notification if update is available
  // The old logic suppressed notifications after 1 day, which was counterproductive
  // Now we always show if there's an update, regardless of cache age
  return true;
}

/**
 * Perform a version check (with caching)
 * This is the main entry point for version checking
 */
export async function performVersionCheck(projectDir = process.cwd(), forceCheck = false) {
  const { checkLatestVersion } = await import('./checker.js');
  const state = loadUpdateState(projectDir);
  const currentVersion = getCurrentVersion();
  const now = Date.now();

  // Check if we have a recent cached result
  if (!forceCheck && state.lastCheckTimestamp && state.lastCheckResult) {
    const timeSinceCheck = now - state.lastCheckTimestamp;

    if (timeSinceCheck < CACHE_DURATION) {
      // Return cached result
      return {
        currentVersion,
        latestVersion: state.lastCheckResult.latestVersion,
        updateAvailable: compareVersions(state.lastCheckResult.latestVersion, currentVersion) > 0,
        cached: true,
        shouldNotify: shouldShowUpdateNotification(state, state.lastCheckResult.latestVersion),
        newFeatures: getNewFeaturesSince(currentVersion),
        releaseNotes: getReleasesSince(currentVersion),
      };
    }
  }

  // Perform fresh check
  const latestVersion = await checkLatestVersion();

  if (latestVersion) {
    // Update state with new check result
    state.lastCheckTimestamp = now;
    state.lastCheckResult = { latestVersion };
    saveUpdateState(state, projectDir);
  }

  const updateAvailable = latestVersion && compareVersions(latestVersion, currentVersion) > 0;

  return {
    currentVersion,
    latestVersion: latestVersion || state.lastCheckResult?.latestVersion || currentVersion,
    updateAvailable,
    cached: false,
    shouldNotify: shouldShowUpdateNotification(state, latestVersion),
    newFeatures: updateAvailable ? getNewFeaturesSince(currentVersion) : null,
    releaseNotes: updateAvailable ? getReleasesSince(currentVersion) : [],
  };
}

/**
 * Format update notification for terminal display
 */
export function formatUpdateBanner(checkResult) {
  if (!checkResult.updateAvailable || !checkResult.shouldNotify) {
    return null;
  }

  const lines = [
    '',
    `  ┌${'─'.repeat(60)}┐`,
    `  │ ${'🆕 UPDATE AVAILABLE'.padEnd(58)} │`,
    `  │ ${`v${checkResult.currentVersion} → v${checkResult.latestVersion}`.padEnd(58)} │`,
    `  ├${'─'.repeat(60)}┤`,
  ];

  // Add summary of new features
  if (checkResult.newFeatures) {
    const { commands, agents, skills, hooks } = checkResult.newFeatures;
    const featureCounts = [];

    if (commands.length > 0) featureCounts.push(`${commands.length} command(s)`);
    if (agents.length > 0) featureCounts.push(`${agents.length} agent(s)`);
    if (skills.length > 0) featureCounts.push(`${skills.length} skill(s)`);
    if (hooks.length > 0) featureCounts.push(`${hooks.length} hook(s)`);

    if (featureCounts.length > 0) {
      lines.push(`  │ ${`New: ${featureCounts.join(', ')}`.padEnd(58)} │`);
    }
  }

  lines.push(`  │ ${' '.repeat(58)} │`);
  lines.push(`  │ ${'Run: npm update -g claude-cli-advanced-starter-pack'.padEnd(58)} │`);
  lines.push(`  │ ${'Then: ccasp wizard → Prior Releases to add features'.padEnd(58)} │`);
  lines.push(`  └${'─'.repeat(60)}┘`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Format update notification for Claude Code CLI (markdown)
 */
export function formatUpdateMarkdown(checkResult) {
  if (!checkResult.updateAvailable) {
    return null;
  }

  let md = `## 🆕 Update Available\n\n`;
  md += `**Current:** v${checkResult.currentVersion} → **Latest:** v${checkResult.latestVersion}\n\n`;

  if (checkResult.releaseNotes && checkResult.releaseNotes.length > 0) {
    md += `### What's New\n\n`;

    for (const release of checkResult.releaseNotes) {
      md += `#### v${release.version} (${release.date})\n`;
      md += `${release.summary}\n\n`;

      if (release.highlights && release.highlights.length > 0) {
        for (const highlight of release.highlights) {
          md += `- ${highlight}\n`;
        }
        md += '\n';
      }
    }
  }

  if (checkResult.newFeatures) {
    const { commands, agents, skills, hooks } = checkResult.newFeatures;
    const hasFeatures = commands.length + agents.length + skills.length + hooks.length > 0;

    if (hasFeatures) {
      md += `### New Features Available\n\n`;

      if (commands.length > 0) {
        md += `**Commands:**\n`;
        for (const cmd of commands) {
          md += `- \`/${cmd.name}\` - ${cmd.description}\n`;
        }
        md += '\n';
      }

      if (agents.length > 0) {
        md += `**Agents:**\n`;
        for (const agent of agents) {
          md += `- \`${agent.name}\` - ${agent.description}\n`;
        }
        md += '\n';
      }

      if (skills.length > 0) {
        md += `**Skills:**\n`;
        for (const skill of skills) {
          md += `- \`${skill.name}\` - ${skill.description}\n`;
        }
        md += '\n';
      }

      if (hooks.length > 0) {
        md += `**Hooks:**\n`;
        for (const hook of hooks) {
          md += `- \`${hook.name}\` - ${hook.description}\n`;
        }
        md += '\n';
      }
    }
  }

  md += `### Update Instructions\n\n`;
  md += `\`\`\`bash\nnpm update -g claude-cli-advanced-starter-pack\n\`\`\`\n\n`;
  md += `After updating, run \`/update-check\` to add new features to your project.\n`;

  return md;
}
