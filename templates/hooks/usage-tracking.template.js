/**
 * CCASP Usage Tracking Hook
 *
 * Tracks usage of commands, skills, agents, and hooks for smart merge detection.
 * When updates are available, this data helps identify customized assets that
 * may need careful merging rather than blind replacement.
 *
 * Event: PostToolUse (Skill tool)
 */

const fs = require('fs');
const path = require('path');

const USAGE_FILE = '.claude/config/usage-tracking.json';

/**
 * Get default usage tracking structure
 */
function getDefaultTracking() {
  return {
    version: '1.0.0',
    assets: {
      commands: {},
      skills: {},
      agents: {},
      hooks: {},
    },
    _lastModified: new Date().toISOString(),
  };
}

/**
 * Load usage tracking data
 */
function loadTracking() {
  const trackingPath = path.join(process.cwd(), USAGE_FILE);

  if (fs.existsSync(trackingPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(trackingPath, 'utf8'));
      return {
        ...getDefaultTracking(),
        ...data,
        assets: {
          commands: {},
          skills: {},
          agents: {},
          hooks: {},
          ...data.assets,
        },
      };
    } catch {
      // Return default
    }
  }

  return getDefaultTracking();
}

/**
 * Save usage tracking data
 */
function saveTracking(tracking) {
  const trackingPath = path.join(process.cwd(), USAGE_FILE);
  const trackingDir = path.dirname(trackingPath);

  if (!fs.existsSync(trackingDir)) {
    fs.mkdirSync(trackingDir, { recursive: true });
  }

  tracking._lastModified = new Date().toISOString();
  fs.writeFileSync(trackingPath, JSON.stringify(tracking, null, 2), 'utf8');
}

/**
 * Check if an asset file has been customized (differs from template)
 * This is a simple heuristic - checks for user modifications
 */
function checkIfCustomized(assetType, assetName) {
  try {
    let assetPath;

    switch (assetType) {
      case 'commands':
        assetPath = path.join(process.cwd(), '.claude', 'commands', `${assetName}.md`);
        break;
      case 'skills':
        assetPath = path.join(process.cwd(), '.claude', 'skills', assetName, 'SKILL.md');
        break;
      case 'agents':
        assetPath = path.join(process.cwd(), '.claude', 'agents', `${assetName}.md`);
        break;
      case 'hooks':
        assetPath = path.join(process.cwd(), '.claude', 'hooks', `${assetName}.js`);
        break;
      default:
        return false;
    }

    if (!fs.existsSync(assetPath)) {
      return false;
    }

    // Check for customization markers
    const content = fs.readFileSync(assetPath, 'utf8');

    // If file contains user customization comment, it's customized
    if (content.includes('<!-- CUSTOMIZED -->') ||
        content.includes('// CUSTOMIZED') ||
        content.includes('# CUSTOMIZED')) {
      return true;
    }

    // Check file stats - if modified significantly after creation, likely customized
    const stats = fs.statSync(assetPath);
    const modTime = stats.mtime.getTime();
    const birthTime = stats.birthtime?.getTime() || modTime;

    // If modified more than 1 minute after creation, consider it potentially customized
    // This is a heuristic; the real detection happens during update comparison
    if (modTime - birthTime > 60000) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Track asset usage
 */
function trackUsage(assetType, assetName) {
  const tracking = loadTracking();

  if (!tracking.assets[assetType]) {
    tracking.assets[assetType] = {};
  }

  const existing = tracking.assets[assetType][assetName] || {
    firstUsed: new Date().toISOString(),
    useCount: 0,
    customized: false,
  };

  // Check if customized (only update if not already marked)
  const isCustomized = existing.customized || checkIfCustomized(assetType, assetName);

  tracking.assets[assetType][assetName] = {
    ...existing,
    lastUsed: new Date().toISOString(),
    useCount: existing.useCount + 1,
    customized: isCustomized,
  };

  saveTracking(tracking);
}

/**
 * Extract skill/command name from tool input
 */
function extractAssetName(toolInput) {
  // For Skill tool, the skill name is in the 'skill' parameter
  if (toolInput.skill) {
    // Handle fully qualified names like "ms-office-suite:pdf"
    const parts = toolInput.skill.split(':');
    return parts[parts.length - 1];
  }

  return null;
}

/**
 * Main hook handler
 */
module.exports = async function usageTracking(context) {
  try {
    const { tool_name, tool_input } = context;

    // Track Skill tool usage
    if (tool_name === 'Skill') {
      const skillName = extractAssetName(tool_input);
      if (skillName) {
        trackUsage('skills', skillName);
      }
    }

    // Track Read tool usage for .claude/ files (commands, agents, etc.)
    if (tool_name === 'Read' && tool_input.file_path) {
      const filePath = tool_input.file_path;

      // Check if reading from .claude/ directory
      if (filePath.includes('.claude/')) {
        // Extract asset type and name
        if (filePath.includes('/commands/') && filePath.endsWith('.md')) {
          const name = path.basename(filePath, '.md');
          if (name !== 'INDEX' && name !== 'README') {
            trackUsage('commands', name);
          }
        } else if (filePath.includes('/agents/') && filePath.endsWith('.md')) {
          const name = path.basename(filePath, '.md');
          trackUsage('agents', name);
        } else if (filePath.includes('/skills/') && filePath.includes('SKILL.md')) {
          // Extract skill name from path like .claude/skills/my-skill/SKILL.md
          const match = filePath.match(/\/skills\/([^/]+)\//);
          if (match) {
            trackUsage('skills', match[1]);
          }
        } else if (filePath.includes('/hooks/') && filePath.endsWith('.js')) {
          const name = path.basename(filePath, '.js');
          trackUsage('hooks', name);
        }
      }
    }
  } catch (error) {
    // Silently fail - don't interrupt user workflow
    // console.error('Usage tracking error:', error.message);
  }

  return { continue: true };
};
