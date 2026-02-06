/**
 * Hierarchical Token Budget Management
 *
 * Implements token allocation and tracking across the hierarchy:
 * - Epic allocates budget to roadmaps
 * - Roadmap allocates budget to phases
 * - Phase tracks usage per task
 *
 * Supports dynamic reallocation and compaction triggers.
 */

/**
 * Budget status indicators
 */
export const BudgetStatus = {
  AVAILABLE: 'available',
  LOW: 'low',
  EXHAUSTED: 'exhausted',
  EXCEEDED: 'exceeded'
};

/**
 * Default compaction threshold (80% used)
 */
export const DEFAULT_COMPACTION_THRESHOLD = 0.8;

/**
 * Create a new token budget structure
 *
 * @param {number} totalBudget - Total tokens available
 * @param {Object} [options] - Budget options
 * @param {number} [options.compactionThreshold] - Threshold for compaction (0.0-1.0)
 * @param {boolean} [options.allowReallocation] - Allow dynamic reallocation
 * @returns {Object} Budget structure
 */
export function createTokenBudget(totalBudget, options = {}) {
  return {
    total: totalBudget,
    used: 0,
    available: totalBudget,
    compaction_threshold: options.compactionThreshold || DEFAULT_COMPACTION_THRESHOLD,
    allow_reallocation: options.allowReallocation !== false,
    allocations: {},
    usage_history: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Allocate budget to a child entity
 *
 * @param {Object} budget - Parent budget structure
 * @param {string} childId - Child entity ID
 * @param {number} amount - Tokens to allocate
 * @param {Object} [metadata] - Optional metadata about allocation
 * @returns {Object} Updated budget structure
 */
export function allocateBudget(budget, childId, amount, metadata = {}) {
  // Validate allocation
  if (amount <= 0) {
    throw new Error('Allocation amount must be positive');
  }

  if (budget.available < amount) {
    throw new Error(`Insufficient budget: requested ${amount}, available ${budget.available}`);
  }

  // Check if already allocated
  if (budget.allocations[childId]) {
    throw new Error(`Budget already allocated to ${childId}`);
  }

  // Create allocation
  budget.allocations[childId] = {
    allocated: amount,
    used: 0,
    available: amount,
    status: BudgetStatus.AVAILABLE,
    metadata,
    allocated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Update parent budget
  budget.available -= amount;
  budget.updated_at = new Date().toISOString();

  return budget;
}

/**
 * Track token usage for a child entity
 *
 * @param {Object} budget - Parent budget structure
 * @param {string} childId - Child entity ID
 * @param {number} tokensUsed - Tokens consumed
 * @returns {Object} Updated budget structure
 */
export function trackUsage(budget, childId, tokensUsed) {
  if (!budget.allocations[childId]) {
    throw new Error(`No allocation found for ${childId}`);
  }

  const allocation = budget.allocations[childId];

  // Update allocation usage
  allocation.used += tokensUsed;
  allocation.available = allocation.allocated - allocation.used;
  allocation.updated_at = new Date().toISOString();

  // Update status based on usage
  const usageRatio = allocation.used / allocation.allocated;
  if (allocation.available <= 0) {
    allocation.status = BudgetStatus.EXHAUSTED;
  } else if (allocation.used > allocation.allocated) {
    allocation.status = BudgetStatus.EXCEEDED;
  } else if (usageRatio >= budget.compaction_threshold) {
    allocation.status = BudgetStatus.LOW;
  } else {
    allocation.status = BudgetStatus.AVAILABLE;
  }

  // Update parent budget totals
  budget.used = Object.values(budget.allocations).reduce((sum, a) => sum + a.used, 0);
  budget.updated_at = new Date().toISOString();

  // Record usage history
  budget.usage_history.push({
    timestamp: new Date().toISOString(),
    child_id: childId,
    tokens_used: tokensUsed,
    total_used: allocation.used,
    remaining: allocation.available
  });

  return budget;
}

/**
 * Check remaining budget for a child entity
 *
 * @param {Object} budget - Parent budget structure
 * @param {string} childId - Child entity ID
 * @returns {Object} Budget check result
 */
export function checkBudget(budget, childId) {
  if (!budget.allocations[childId]) {
    return {
      allocated: false,
      message: `No allocation found for ${childId}`
    };
  }

  const allocation = budget.allocations[childId];
  const usageRatio = allocation.used / allocation.allocated;

  return {
    allocated: true,
    total: allocation.allocated,
    used: allocation.used,
    available: allocation.available,
    usage_percentage: Math.round(usageRatio * 100),
    status: allocation.status,
    should_compact: usageRatio >= budget.compaction_threshold
  };
}

/**
 * Check if compaction is needed for a child entity
 *
 * @param {Object} budget - Parent budget structure
 * @param {string} childId - Child entity ID
 * @param {number} [threshold] - Override compaction threshold
 * @returns {boolean} True if compaction needed
 */
export function shouldCompact(budget, childId, threshold = null) {
  if (!budget.allocations[childId]) {
    return false;
  }

  const allocation = budget.allocations[childId];
  const usageThreshold = threshold || budget.compaction_threshold;
  const usageRatio = allocation.used / allocation.allocated;

  return usageRatio >= usageThreshold;
}

/**
 * Reallocate budget from one child to another
 *
 * Useful when a child completes early and has unused budget.
 *
 * @param {Object} budget - Parent budget structure
 * @param {string} fromChildId - Source child ID
 * @param {string} toChildId - Target child ID
 * @param {number} amount - Tokens to reallocate
 * @returns {Object} Updated budget structure
 */
export function reallocateBudget(budget, fromChildId, toChildId, amount) {
  if (!budget.allow_reallocation) {
    throw new Error('Budget reallocation is not allowed');
  }

  if (!budget.allocations[fromChildId]) {
    throw new Error(`Source allocation not found: ${fromChildId}`);
  }

  if (!budget.allocations[toChildId]) {
    throw new Error(`Target allocation not found: ${toChildId}`);
  }

  const fromAllocation = budget.allocations[fromChildId];

  if (fromAllocation.available < amount) {
    throw new Error(
      `Insufficient available budget in source: requested ${amount}, available ${fromAllocation.available}`
    );
  }

  // Transfer budget
  fromAllocation.allocated -= amount;
  fromAllocation.available -= amount;
  fromAllocation.updated_at = new Date().toISOString();

  const toAllocation = budget.allocations[toChildId];
  toAllocation.allocated += amount;
  toAllocation.available += amount;
  toAllocation.updated_at = new Date().toISOString();

  // Update statuses
  updateAllocationStatus(budget, fromChildId);
  updateAllocationStatus(budget, toChildId);

  budget.updated_at = new Date().toISOString();

  return budget;
}

/**
 * Release unused budget from a completed child
 *
 * Returns unused tokens to parent's available pool.
 *
 * @param {Object} budget - Parent budget structure
 * @param {string} childId - Child entity ID
 * @returns {Object} Updated budget structure with released amount
 */
export function releaseBudget(budget, childId) {
  if (!budget.allocations[childId]) {
    throw new Error(`No allocation found for ${childId}`);
  }

  const allocation = budget.allocations[childId];
  const released = allocation.available;

  if (released > 0) {
    budget.available += released;
    allocation.available = 0;
    allocation.allocated = allocation.used;
    allocation.updated_at = new Date().toISOString();
    budget.updated_at = new Date().toISOString();
  }

  return {
    budget,
    released
  };
}

/**
 * Get budget summary for reporting
 *
 * @param {Object} budget - Budget structure
 * @returns {Object} Budget summary
 */
export function getBudgetSummary(budget) {
  const allocatedTotal = Object.values(budget.allocations).reduce(
    (sum, a) => sum + a.allocated,
    0
  );

  const usedTotal = Object.values(budget.allocations).reduce((sum, a) => sum + a.used, 0);

  const childSummaries = Object.entries(budget.allocations).map(([childId, allocation]) => ({
    child_id: childId,
    allocated: allocation.allocated,
    used: allocation.used,
    available: allocation.available,
    usage_percentage: Math.round((allocation.used / allocation.allocated) * 100),
    status: allocation.status
  }));

  return {
    total: budget.total,
    allocated: allocatedTotal,
    used: usedTotal,
    available: budget.available,
    unallocated: budget.total - allocatedTotal,
    usage_percentage: Math.round((usedTotal / budget.total) * 100),
    children: childSummaries,
    compaction_threshold: budget.compaction_threshold * 100,
    allow_reallocation: budget.allow_reallocation
  };
}

/**
 * Format budget summary for display
 *
 * @param {Object} budget - Budget structure
 * @returns {string} Formatted output
 */
export function formatBudgetSummary(budget) {
  const summary = getBudgetSummary(budget);

  let output = '\nToken Budget Summary\n';
  output += `${'='.repeat(60)  }\n\n`;
  output += `Total Budget:      ${summary.total.toLocaleString()} tokens\n`;
  output += `Allocated:         ${summary.allocated.toLocaleString()} tokens (${Math.round((summary.allocated / summary.total) * 100)}%)\n`;
  output += `Used:              ${summary.used.toLocaleString()} tokens (${summary.usage_percentage}%)\n`;
  output += `Available:         ${summary.available.toLocaleString()} tokens\n`;
  output += `Unallocated:       ${summary.unallocated.toLocaleString()} tokens\n\n`;

  if (summary.children.length > 0) {
    output += 'Child Allocations:\n';
    output += `${'-'.repeat(60)  }\n`;

    for (const child of summary.children) {
      const statusIcon = getStatusIcon(child.status);
      output += `${statusIcon} ${child.child_id}\n`;
      output += `   Allocated: ${child.allocated.toLocaleString()} | Used: ${child.used.toLocaleString()} (${child.usage_percentage}%)\n`;
      output += `   Available: ${child.available.toLocaleString()} | Status: ${child.status}\n\n`;
    }
  }

  return output;
}

/**
 * Update allocation status based on usage
 * @private
 */
function updateAllocationStatus(budget, childId) {
  const allocation = budget.allocations[childId];
  const usageRatio = allocation.used / allocation.allocated;

  if (allocation.available <= 0) {
    allocation.status = BudgetStatus.EXHAUSTED;
  } else if (allocation.used > allocation.allocated) {
    allocation.status = BudgetStatus.EXCEEDED;
  } else if (usageRatio >= budget.compaction_threshold) {
    allocation.status = BudgetStatus.LOW;
  } else {
    allocation.status = BudgetStatus.AVAILABLE;
  }
}

/**
 * Get status icon for display
 * @private
 */
function getStatusIcon(status) {
  switch (status) {
    case BudgetStatus.AVAILABLE:
      return '✓';
    case BudgetStatus.LOW:
      return '⚠';
    case BudgetStatus.EXHAUSTED:
      return '✗';
    case BudgetStatus.EXCEEDED:
      return '!';
    default:
      return '?';
  }
}
