/**
 * Merge Engine Module
 *
 * Core merge strategies, execution, and merge explanation generation.
 * Orchestrates the merge decision process.
 */

import { getCustomizedUsedAssets } from '../version-check.js';
import { getLocalAsset, getTemplateAsset } from './asset-loader.js';
import { compareAssetVersions } from './comparator.js';

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
