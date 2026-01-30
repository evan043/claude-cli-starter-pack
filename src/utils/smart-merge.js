/**
 * Smart Merge Utility
 *
 * Provides asset comparison, diff generation, and merge exploration
 * for the CCASP update system. When users have customized assets
 * (commands, skills, agents, hooks), this module helps them understand
 * what changes an update would bring and offers intelligent merge options.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import {
  loadUsageTracking,
  getCustomizedUsedAssets,
  isAssetCustomized,
} from './version-check.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Asset type to file path mapping
 */
const ASSET_PATHS = {
  commands: {
    local: (projectDir, name) => join(projectDir, '.claude', 'commands', `${name}.md`),
    template: (name) => join(__dirname, '..', '..', 'templates', 'commands', `${name}.template.md`),
    extension: '.md',
  },
  skills: {
    local: (projectDir, name) => join(projectDir, '.claude', 'skills', name, 'SKILL.md'),
    template: (name) => join(__dirname, '..', '..', 'templates', 'skills', name, 'SKILL.template.md'),
    extension: '.md',
  },
  agents: {
    local: (projectDir, name) => join(projectDir, '.claude', 'agents', `${name}.md`),
    template: (name) => join(__dirname, '..', '..', 'templates', 'agents', `${name}.template.md`),
    extension: '.md',
  },
  hooks: {
    local: (projectDir, name) => join(projectDir, '.claude', 'hooks', `${name}.js`),
    template: (name) => join(__dirname, '..', '..', 'templates', 'hooks', `${name}.template.js`),
    extension: '.js',
  },
};

/**
 * Get the local (user's) version of an asset
 */
export function getLocalAsset(assetType, assetName, projectDir = process.cwd()) {
  const pathConfig = ASSET_PATHS[assetType];
  if (!pathConfig) return null;

  const localPath = pathConfig.local(projectDir, assetName);

  if (!existsSync(localPath)) {
    return null;
  }

  try {
    return {
      path: localPath,
      content: readFileSync(localPath, 'utf8'),
      stats: statSync(localPath),
    };
  } catch {
    return null;
  }
}

/**
 * Get the template (package) version of an asset
 */
export function getTemplateAsset(assetType, assetName) {
  const pathConfig = ASSET_PATHS[assetType];
  if (!pathConfig) return null;

  const templatePath = pathConfig.template(assetName);

  if (!existsSync(templatePath)) {
    return null;
  }

  try {
    return {
      path: templatePath,
      content: readFileSync(templatePath, 'utf8'),
      stats: statSync(templatePath),
    };
  } catch {
    return null;
  }
}

/**
 * Compare two versions of an asset and generate a diff summary
 * Returns an object with change analysis
 */
export function compareAssetVersions(localContent, templateContent) {
  if (!localContent || !templateContent) {
    return {
      identical: false,
      hasChanges: true,
      error: 'Missing content for comparison',
    };
  }

  // Normalize line endings
  const normalizedLocal = localContent.replace(/\r\n/g, '\n').trim();
  const normalizedTemplate = templateContent.replace(/\r\n/g, '\n').trim();

  if (normalizedLocal === normalizedTemplate) {
    return {
      identical: true,
      hasChanges: false,
      summary: 'No differences found',
    };
  }

  // Split into lines for analysis
  const localLines = normalizedLocal.split('\n');
  const templateLines = normalizedTemplate.split('\n');

  // Simple line-by-line diff analysis
  const changes = {
    added: [],
    removed: [],
    modified: [],
  };

  // Create line maps for comparison
  const localLineSet = new Set(localLines);
  const templateLineSet = new Set(templateLines);

  // Lines in template but not in local (would be added by update)
  for (const line of templateLines) {
    if (!localLineSet.has(line) && line.trim()) {
      changes.added.push(line);
    }
  }

  // Lines in local but not in template (user customizations)
  for (const line of localLines) {
    if (!templateLineSet.has(line) && line.trim()) {
      changes.removed.push(line);
    }
  }

  // Analyze change significance
  const significance = analyzeChangeSignificance(changes, localContent, templateContent);

  return {
    identical: false,
    hasChanges: true,
    changes,
    significance,
    stats: {
      localLines: localLines.length,
      templateLines: templateLines.length,
      addedLines: changes.added.length,
      removedLines: changes.removed.length,
    },
    summary: generateChangeSummary(changes, significance),
  };
}

/**
 * Analyze the significance of changes
 */
function analyzeChangeSignificance(changes, localContent, templateContent) {
  const significance = {
    level: 'low', // low, medium, high
    reasons: [],
  };

  // Check for structural changes (high significance)
  const structuralPatterns = [
    /^#{1,3}\s/, // Markdown headers
    /^---$/, // YAML frontmatter
    /^export\s+(default\s+)?function/, // Function exports
    /^module\.exports/, // CommonJS exports
    /^import\s+/, // Import statements
    /^const\s+\w+\s*=\s*require/, // Require statements
  ];

  for (const line of changes.added.concat(changes.removed)) {
    for (const pattern of structuralPatterns) {
      if (pattern.test(line)) {
        significance.level = 'high';
        significance.reasons.push('Structural changes detected');
        break;
      }
    }
  }

  // Check for configuration changes (medium significance)
  const configPatterns = [
    /^\s*"?\w+"?\s*:\s*/, // JSON/YAML config
    /^[A-Z_]+\s*=/, // Environment variables
    /timeout|limit|threshold|max|min/i, // Configuration values
  ];

  if (significance.level !== 'high') {
    for (const line of changes.added.concat(changes.removed)) {
      for (const pattern of configPatterns) {
        if (pattern.test(line)) {
          significance.level = 'medium';
          significance.reasons.push('Configuration changes detected');
          break;
        }
      }
    }
  }

  // Check for comment-only changes (low significance)
  const commentPatterns = [
    /^\/\//, // JS comments
    /^\/\*/, // Block comment start
    /^\*/, // Block comment middle
    /^#(?!#)/, // Shell/Python/Ruby comments (not markdown headers)
    /^<!--/, // HTML comments
  ];

  const allChangesAreComments = [...changes.added, ...changes.removed].every((line) =>
    commentPatterns.some((p) => p.test(line.trim()))
  );

  if (allChangesAreComments && changes.added.length + changes.removed.length > 0) {
    significance.level = 'low';
    significance.reasons = ['Only comment changes'];
  }

  // Volume-based significance boost
  const totalChanges = changes.added.length + changes.removed.length;
  const totalLines = Math.max(localContent.split('\n').length, templateContent.split('\n').length);
  const changeRatio = totalChanges / totalLines;

  if (changeRatio > 0.5 && significance.level !== 'high') {
    significance.level = 'high';
    significance.reasons.push(`Large change volume (${Math.round(changeRatio * 100)}% of file)`);
  } else if (changeRatio > 0.2 && significance.level === 'low') {
    significance.level = 'medium';
    significance.reasons.push(`Moderate change volume (${Math.round(changeRatio * 100)}% of file)`);
  }

  return significance;
}

/**
 * Generate a human-readable summary of changes
 */
function generateChangeSummary(changes, significance) {
  const parts = [];

  if (changes.added.length > 0) {
    parts.push(`${changes.added.length} line(s) would be added`);
  }

  if (changes.removed.length > 0) {
    parts.push(`${changes.removed.length} line(s) would be removed/replaced`);
  }

  if (significance.reasons.length > 0) {
    parts.push(significance.reasons[0]);
  }

  return parts.join('; ') || 'Minor changes';
}

/**
 * Generate a detailed diff for display
 * Uses unified diff format if git is available, otherwise simple comparison
 */
export function generateDetailedDiff(localPath, templatePath) {
  try {
    // Try using git diff for nice formatting
    const diff = execSync(
      `git diff --no-index --color=never "${templatePath}" "${localPath}"`,
      {
        encoding: 'utf8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
    return diff;
  } catch (error) {
    // git diff returns exit code 1 when files differ (which is expected)
    if (error.stdout) {
      return error.stdout;
    }

    // Fall back to simple comparison
    const local = readFileSync(localPath, 'utf8');
    const template = readFileSync(templatePath, 'utf8');

    return `--- Template (update)\n+++ Local (current)\n\n` +
           `Template version:\n${template}\n\n` +
           `Local version:\n${local}`;
  }
}

/**
 * Get all assets that need merge consideration during update
 * Returns assets that are:
 * 1. Used by the user (tracked in usage-tracking.json)
 * 2. Customized (differ from template)
 * 3. Have updates available (template has changed)
 */
export function getAssetsNeedingMerge(projectDir = process.cwd()) {
  const customizedAssets = getCustomizedUsedAssets(projectDir);
  const assetsNeedingMerge = {
    commands: [],
    skills: [],
    agents: [],
    hooks: [],
  };

  for (const [assetType, assets] of Object.entries(customizedAssets)) {
    for (const [assetName, usageData] of Object.entries(assets)) {
      const local = getLocalAsset(assetType, assetName, projectDir);
      const template = getTemplateAsset(assetType, assetName);

      // Skip if no template exists (user-created asset)
      if (!template) continue;

      // Skip if no local exists (shouldn't happen, but safety check)
      if (!local) continue;

      const comparison = compareAssetVersions(local.content, template.content);

      // Only include if there are actual differences
      if (comparison.hasChanges && !comparison.identical) {
        assetsNeedingMerge[assetType].push({
          name: assetName,
          usageData,
          comparison,
          localPath: local.path,
          templatePath: template.path,
        });
      }
    }
  }

  return assetsNeedingMerge;
}

/**
 * Generate a merge exploration prompt for Claude
 * This creates a structured prompt that helps Claude explain the merge options
 */
export function generateMergeExplanation(assetType, assetName, comparison, localContent, templateContent) {
  const assetLabel = assetType.slice(0, -1); // Remove 's' (commands -> command)

  let explanation = `## Merge Analysis: ${assetName} (${assetLabel})\n\n`;

  // Significance indicator
  const significanceEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🔴',
  };

  explanation += `**Change Significance:** ${significanceEmoji[comparison.significance.level]} ${comparison.significance.level.toUpperCase()}\n\n`;

  // Summary
  explanation += `### Summary\n`;
  explanation += `${comparison.summary}\n\n`;

  // Stats
  explanation += `### Change Statistics\n`;
  explanation += `- Your version: ${comparison.stats.localLines} lines\n`;
  explanation += `- Update version: ${comparison.stats.templateLines} lines\n`;
  explanation += `- Lines that would be added: ${comparison.stats.addedLines}\n`;
  explanation += `- Lines that would be removed/changed: ${comparison.stats.removedLines}\n\n`;

  // Key changes preview
  if (comparison.changes.added.length > 0) {
    explanation += `### New in Update (would be added)\n`;
    explanation += '```\n';
    explanation += comparison.changes.added.slice(0, 10).join('\n');
    if (comparison.changes.added.length > 10) {
      explanation += `\n... and ${comparison.changes.added.length - 10} more lines`;
    }
    explanation += '\n```\n\n';
  }

  if (comparison.changes.removed.length > 0) {
    explanation += `### Your Customizations (would be replaced)\n`;
    explanation += '```\n';
    explanation += comparison.changes.removed.slice(0, 10).join('\n');
    if (comparison.changes.removed.length > 10) {
      explanation += `\n... and ${comparison.changes.removed.length - 10} more lines`;
    }
    explanation += '\n```\n\n';
  }

  // Recommendations
  explanation += `### Recommendation\n`;

  if (comparison.significance.level === 'low') {
    explanation += `This update has minor changes. You can likely **replace** safely, `;
    explanation += `but review the diff if your customizations are important.\n`;
  } else if (comparison.significance.level === 'medium') {
    explanation += `This update has moderate changes. Consider **exploring the merge** to `;
    explanation += `understand what would change and preserve your customizations.\n`;
  } else {
    explanation += `This update has significant structural changes. **Strongly recommend** `;
    explanation += `exploring the merge carefully before deciding. Your customizations may `;
    explanation += `be incompatible with the new version.\n`;
  }

  return explanation;
}

/**
 * Generate options display for merge decision
 */
export function formatMergeOptions(assetName, useCount) {
  return `
┌─────────────────────────────────────────────────────────────┐
│  ${assetName.padEnd(55)} │
│  Used ${useCount} time(s) • Customized                              │
├─────────────────────────────────────────────────────────────┤
│  [E] Explore merge - Claude analyzes both versions         │
│  [R] Replace - Use new version (lose customizations)       │
│  [S] Skip - Keep your version (miss update)                │
│  [D] Show diff - View raw differences                      │
└─────────────────────────────────────────────────────────────┘
`;
}

/**
 * Get count of assets needing merge attention
 */
export function getMergeAttentionCount(projectDir = process.cwd()) {
  const assets = getAssetsNeedingMerge(projectDir);
  let count = 0;

  for (const assetList of Object.values(assets)) {
    count += assetList.length;
  }

  return count;
}

export default {
  getLocalAsset,
  getTemplateAsset,
  compareAssetVersions,
  generateDetailedDiff,
  getAssetsNeedingMerge,
  generateMergeExplanation,
  formatMergeOptions,
  getMergeAttentionCount,
};
