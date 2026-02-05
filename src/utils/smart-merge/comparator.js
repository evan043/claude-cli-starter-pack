/**
 * Comparator Module
 *
 * Handles comparison and diff generation logic for asset versions.
 * Analyzes changes and determines significance.
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

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
export function analyzeChangeSignificance(changes, localContent, templateContent) {
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
export function generateChangeSummary(changes, significance) {
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
