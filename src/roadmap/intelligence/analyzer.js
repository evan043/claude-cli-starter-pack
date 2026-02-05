/**
 * Roadmap Intelligence - Complexity Analysis & Dependencies
 *
 * Complexity analysis, dependency detection, and effort estimation.
 */

import { classifyDomain, getPrimaryDomain, groupRelatedItems } from './classifier.js';

/**
 * Dependency indicator phrases
 */
const DEPENDENCY_INDICATORS = {
  depends_on: ['depends on', 'requires', 'needs', 'after', 'following', 'once', 'when'],
  blocks: ['blocks', 'required by', 'prerequisite for', 'before'],
  related: ['related to', 'similar to', 'see also', 'cf.', 'connected to'],
};

/**
 * Detect dependencies between items
 *
 * @param {Array} items - Array of items with title/description/body
 * @returns {Map} Dependency map: item -> [dependent items]
 */
export function detectDependencies(items) {
  const dependencies = new Map();

  for (const item of items) {
    dependencies.set(item.id || item.number, []);
  }

  for (const item of items) {
    const text = `${item.title || ''} ${item.body || ''} ${item.description || ''}`.toLowerCase();
    const itemId = item.id || item.number;

    // Check for explicit dependency mentions
    for (const indicator of DEPENDENCY_INDICATORS.depends_on) {
      const regex = new RegExp(`${indicator}\\s+#?(\\d+)`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        const depId = parseInt(match[1]);
        if (items.some(i => (i.id || i.number) === depId)) {
          dependencies.get(itemId).push(depId);
        }
      }
    }

    // Check for mentions of other item titles
    for (const otherItem of items) {
      if (otherItem === item) continue;

      const otherId = otherItem.id || otherItem.number;
      const otherTitle = (otherItem.title || '').toLowerCase();

      // Look for "after {title}" or "requires {title}" patterns
      for (const indicator of DEPENDENCY_INDICATORS.depends_on) {
        if (otherTitle.length > 5 && text.includes(`${indicator} ${otherTitle.substring(0, 20)}`)) {
          if (!dependencies.get(itemId).includes(otherId)) {
            dependencies.get(itemId).push(otherId);
          }
        }
      }
    }
  }

  return dependencies;
}

/**
 * Analyze file overlap between items to infer dependencies
 *
 * @param {Array} items - Array of items with file references
 * @returns {Object} Overlap analysis
 */
export function analyzeFileOverlap(items) {
  const fileToItems = new Map();

  // Build file -> items mapping
  for (const item of items) {
    const files = item.files || item.source_files || [];
    const itemId = item.id || item.number;

    for (const file of files) {
      if (!fileToItems.has(file)) {
        fileToItems.set(file, []);
      }
      fileToItems.get(file).push(itemId);
    }
  }

  // Find overlapping items
  const overlaps = [];
  for (const [file, itemIds] of fileToItems.entries()) {
    if (itemIds.length > 1) {
      overlaps.push({
        file,
        items: itemIds,
        conflictRisk: itemIds.length > 2 ? 'high' : 'medium',
      });
    }
  }

  return {
    overlaps,
    hasConflictRisk: overlaps.some(o => o.conflictRisk === 'high'),
    suggestedOrder: suggestOrderFromOverlaps(overlaps, items),
  };
}

/**
 * Suggest execution order based on file overlaps
 */
function suggestOrderFromOverlaps(overlaps, items) {
  // Items with more shared files should run sequentially
  const itemOverlapCount = new Map();

  for (const item of items) {
    itemOverlapCount.set(item.id || item.number, 0);
  }

  for (const overlap of overlaps) {
    for (const itemId of overlap.items) {
      itemOverlapCount.set(itemId, (itemOverlapCount.get(itemId) || 0) + 1);
    }
  }

  // Sort by overlap count (most overlaps first - they're the "base" changes)
  return Array.from(itemOverlapCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

/**
 * Estimate complexity for a phase or task group
 *
 * @param {Object} phase - Phase or task group
 * @returns {string} Complexity: S, M, or L
 */
export function estimateComplexity(phase) {
  const factors = {
    issueCount: 0,
    fileCount: 0,
    domainCount: 0,
    hasDatabase: false,
    hasAuth: false,
    hasTests: false,
    descriptionLength: 0,
  };

  // Count issues/tasks
  const issues = phase.issues || phase.inputs?.issues || [];
  factors.issueCount = issues.length;

  // Count files
  const files = phase.files || phase.source_files || phase.inputs?.docs || [];
  factors.fileCount = files.length;

  // Analyze description for complexity indicators
  const text = `${phase.goal || ''} ${phase.description || ''} ${phase.phase_title || ''}`.toLowerCase();
  factors.descriptionLength = text.length;

  // Domain diversity
  const scores = classifyDomain(text);
  factors.domainCount = Object.values(scores).filter(s => s > 0.1).length;

  // Special complexity factors
  factors.hasDatabase = scores.database > 0.2;
  factors.hasAuth = text.includes('auth') || text.includes('login') || text.includes('permission');
  factors.hasTests = scores.testing > 0.2;

  // Calculate score
  let score = 0;

  score += factors.issueCount * 2;
  score += factors.fileCount * 1.5;
  score += factors.domainCount * 3;
  score += factors.hasDatabase ? 5 : 0;
  score += factors.hasAuth ? 4 : 0;
  score += factors.hasTests ? 2 : 0;
  score += factors.descriptionLength > 500 ? 3 : 0;

  // Map to complexity
  if (score < 10) return 'S';
  if (score < 25) return 'M';
  return 'L';
}

/**
 * Analyze overall scope and recommend structure
 *
 * @param {Array} items - Array of issues/tasks
 * @returns {Object} Scope analysis with recommendations
 */
export function analyzeScope(items) {
  if (!items || items.length === 0) {
    return {
      itemCount: 0,
      avgComplexity: 'S',
      domainCount: 0,
      domains: [],
      hasMultipleDependencyChains: false,
      recommendation: { shouldBeSinglePhase: true, reason: 'No items to analyze' },
    };
  }

  // Group by domain
  const groups = groupRelatedItems(items);

  // Detect dependencies
  const dependencies = detectDependencies(items);

  // Count dependency chains
  let chainCount = 0;
  for (const deps of dependencies.values()) {
    if (deps.length > 0) chainCount++;
  }

  // Calculate average complexity
  const complexities = items.map(item => estimateComplexity({
    description: item.body || item.description || '',
    goal: item.title || '',
    files: item.files || [],
  }));

  const complexityScores = { S: 1, M: 2, L: 3 };
  const avgScore = complexities.reduce((sum, c) => sum + complexityScores[c], 0) / complexities.length;
  const avgComplexity = avgScore < 1.5 ? 'S' : avgScore < 2.5 ? 'M' : 'L';

  const scope = {
    itemCount: items.length,
    avgComplexity,
    domainCount: groups.length,
    domains: groups.map(g => g.domain),
    hasMultipleDependencyChains: chainCount > 2,
    groups,
    dependencies: Object.fromEntries(dependencies),
  };

  scope.recommendation = shouldRecommendSinglePhase({
    issueCount: items.length,
    avgComplexity,
    domainCount: groups.length,
    hasMultipleDependencyChains: scope.hasMultipleDependencyChains,
  });

  return scope;
}

/**
 * Check if roadmap scope is simple enough for a single phase-dev-plan
 *
 * @param {Object} scope - Scope analysis object
 * @returns {Object} Recommendation { shouldBeSinglePhase: boolean, reason: string }
 */
function shouldRecommendSinglePhase(scope) {
  const {
    issueCount = 0,
    avgComplexity = 'M',
    domainCount = 1,
    hasMultipleDependencyChains = false,
  } = scope;

  // Simple scope: few issues, low complexity, single domain
  if (issueCount < 5 && avgComplexity === 'S' && domainCount <= 1) {
    return {
      shouldBeSinglePhase: true,
      reason: 'Scope is small enough for a single phase-dev-plan',
    };
  }

  // Too simple for roadmap overhead
  if (issueCount < 3) {
    return {
      shouldBeSinglePhase: true,
      reason: 'Only a few tasks - roadmap overhead not justified',
    };
  }

  // Complex enough for roadmap
  return {
    shouldBeSinglePhase: false,
    reason: null,
  };
}

/**
 * Check if groups have independent workflows (minimal overlap)
 */
export function hasIndependentWorkflows(items, groups) {
  if (groups.length < 2) return false;

  // Check file overlap between groups
  const filesByGroup = groups.map(g => {
    const files = new Set();
    g.items.forEach(item => {
      (item.files || item.source_files || []).forEach(f => files.add(f));
    });
    return files;
  });

  // Count overlapping files between groups
  let overlapCount = 0;
  for (let i = 0; i < filesByGroup.length; i++) {
    for (let j = i + 1; j < filesByGroup.length; j++) {
      const intersection = [...filesByGroup[i]].filter(f => filesByGroup[j].has(f));
      overlapCount += intersection.length;
    }
  }

  // Low overlap indicates independent workflows
  const totalFiles = filesByGroup.reduce((sum, s) => sum + s.size, 0);
  return totalFiles > 0 && (overlapCount / totalFiles) < 0.2;
}

/**
 * Check if items have significant complexity spread
 */
export function hasSignificantComplexitySpread(items) {
  const complexities = items.map(item => estimateComplexity({
    description: item.body || item.description || '',
    goal: item.title || '',
    files: item.files || [],
  }));

  const hasSmall = complexities.includes('S');
  const hasMedium = complexities.includes('M');
  const hasLarge = complexities.includes('L');

  // All three complexity levels present
  return hasSmall && hasMedium && hasLarge;
}

/**
 * Check for explicit project markers in items
 */
export function hasExplicitProjectMarkers(items) {
  const markers = ['project:', 'epic:', 'feature:', 'module:', 'subsystem:'];

  for (const item of items) {
    const text = `${item.title || ''} ${item.body || ''}`.toLowerCase();
    if (markers.some(m => text.includes(m))) {
      return true;
    }
  }

  return false;
}

/**
 * Identify independent tracks that can run in parallel
 * @param {Array} groups - Domain groups
 * @param {Map} dependencies - Dependency map
 * @returns {Array} Groups of independent tracks
 */
export function identifyIndependentTracks(groups, dependencies) {
  if (!groups || groups.length < 2) {
    return [{ tracks: groups || [], canParallelize: false }];
  }

  const independentTracks = [];
  const processedGroups = new Set();

  // Build dependency graph between groups
  const groupDependencies = new Map();

  for (const group of groups) {
    groupDependencies.set(group.domain, new Set());

    for (const item of group.items) {
      const itemId = item.id || item.number;
      const itemDeps = dependencies.get(itemId) || [];

      for (const depId of itemDeps) {
        // Find which group the dependency belongs to
        for (const otherGroup of groups) {
          if (otherGroup === group) continue;
          if (otherGroup.items.some(i => (i.id || i.number) === depId)) {
            groupDependencies.get(group.domain).add(otherGroup.domain);
            break;
          }
        }
      }
    }
  }

  // Find groups with no dependencies (can start immediately)
  const noDeps = groups.filter(g => groupDependencies.get(g.domain).size === 0);

  if (noDeps.length > 1) {
    independentTracks.push({
      tracks: noDeps,
      canParallelize: true,
      reason: 'No inter-group dependencies',
    });
    noDeps.forEach(g => processedGroups.add(g.domain));
  }

  // Find groups with same dependencies (can run in parallel after deps complete)
  const byDependencies = new Map();

  for (const group of groups) {
    if (processedGroups.has(group.domain)) continue;

    const depsKey = JSON.stringify([...groupDependencies.get(group.domain)].sort());
    if (!byDependencies.has(depsKey)) {
      byDependencies.set(depsKey, []);
    }
    byDependencies.get(depsKey).push(group);
  }

  for (const [depsKey, groupList] of byDependencies.entries()) {
    if (groupList.length > 1) {
      independentTracks.push({
        tracks: groupList,
        canParallelize: true,
        sharedDependencies: JSON.parse(depsKey),
        reason: 'Same dependencies - can run after they complete',
      });
    } else if (groupList.length === 1) {
      independentTracks.push({
        tracks: groupList,
        canParallelize: false,
        dependencies: JSON.parse(depsKey),
        reason: 'Has unique dependencies',
      });
    }
  }

  return independentTracks;
}
