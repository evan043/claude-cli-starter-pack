/**
 * Result Aggregator
 *
 * Collects and aggregates results from multiple L3 workers
 * for consumption by L2 specialists
 */

import fs from 'fs';
import path from 'path';

/**
 * Aggregation strategies
 */
const AGGREGATION_STRATEGIES = {
  /**
   * Merge all results into a single list
   */
  merge: (results) => {
    const merged = {
      items: [],
      totalCount: 0,
      errors: [],
    };

    results.forEach(result => {
      if (result.status === 'completed' && result.data) {
        merged.items.push(...result.data);
        merged.totalCount += result.data.length;
      } else if (result.status === 'failed') {
        merged.errors.push({
          workerId: result.id,
          error: result.error,
        });
      }
    });

    return merged;
  },

  /**
   * Group results by worker
   */
  grouped: (results) => {
    const grouped = {
      workers: {},
      successCount: 0,
      failureCount: 0,
    };

    results.forEach(result => {
      grouped.workers[result.id] = {
        status: result.status,
        data: result.data || null,
        error: result.error || null,
        metrics: result.metrics || null,
      };

      if (result.status === 'completed') {
        grouped.successCount++;
      } else {
        grouped.failureCount++;
      }
    });

    return grouped;
  },

  /**
   * Sum numeric values across results
   */
  sum: (results, field = 'totalOccurrences') => {
    let total = 0;
    const breakdown = [];

    results.forEach(result => {
      if (result.status === 'completed' && result[field] !== undefined) {
        total += result[field];
        breakdown.push({
          workerId: result.id,
          value: result[field],
        });
      }
    });

    return { total, breakdown };
  },

  /**
   * Deduplicate items across results
   */
  dedupe: (results, keyFn = (item) => item) => {
    const seen = new Set();
    const unique = [];

    results.forEach(result => {
      if (result.status === 'completed' && result.data) {
        result.data.forEach(item => {
          const key = typeof keyFn === 'function' ? keyFn(item) : item;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        });
      }
    });

    return {
      items: unique,
      totalUnique: unique.length,
      duplicatesRemoved: results.reduce((acc, r) => acc + (r.data?.length || 0), 0) - unique.length,
    };
  },
};

/**
 * Result Aggregator class
 */
export class ResultAggregator {
  constructor(options = {}) {
    this.results = new Map();
    this.pendingWorkers = new Set();
    this.options = {
      timeout: options.timeout || 60000, // 1 minute default
      strategy: options.strategy || 'merge',
      ...options,
    };
    this.startTime = Date.now();
    this.correlationId = options.correlationId || `agg-${Date.now()}`;
  }

  /**
   * Register workers to wait for
   */
  registerWorkers(workerIds) {
    workerIds.forEach(id => this.pendingWorkers.add(id));
    return this;
  }

  /**
   * Add a result from a worker
   */
  addResult(workerId, result) {
    this.results.set(workerId, {
      ...result,
      receivedAt: new Date().toISOString(),
    });
    this.pendingWorkers.delete(workerId);
    return this;
  }

  /**
   * Check if all results are collected
   */
  isComplete() {
    return this.pendingWorkers.size === 0;
  }

  /**
   * Check if timeout exceeded
   */
  isTimedOut() {
    return Date.now() - this.startTime > this.options.timeout;
  }

  /**
   * Get pending worker count
   */
  getPendingCount() {
    return this.pendingWorkers.size;
  }

  /**
   * Get completion percentage
   */
  getProgress() {
    const total = this.results.size + this.pendingWorkers.size;
    if (total === 0) return 100;
    return Math.round((this.results.size / total) * 100);
  }

  /**
   * Aggregate results using specified strategy
   */
  aggregate(strategy = this.options.strategy) {
    const results = Array.from(this.results.values());
    const aggregator = AGGREGATION_STRATEGIES[strategy];

    if (!aggregator) {
      throw new Error(`Unknown aggregation strategy: ${strategy}. Valid: ${Object.keys(AGGREGATION_STRATEGIES).join(', ')}`);
    }

    const aggregated = aggregator(results);

    return {
      correlationId: this.correlationId,
      strategy,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      workerCount: this.results.size,
      pendingCount: this.pendingWorkers.size,
      complete: this.isComplete(),
      timedOut: this.isTimedOut(),
      result: aggregated,
    };
  }

  /**
   * Generate L2 aggregation report
   */
  generateReport() {
    const aggregated = this.aggregate();

    let report = `L3_AGGREGATION: ${this.correlationId}\n`;
    report += `WORKERS: [${Array.from(this.results.keys()).join(', ')}]\n`;
    report += `STATUS: ${aggregated.complete ? 'complete' : 'partial'}\n`;
    report += `DURATION: ${aggregated.duration}ms\n`;

    if (aggregated.result.items) {
      report += `COMBINED_RESULT:\n`;
      aggregated.result.items.slice(0, 20).forEach(item => {
        report += `- ${item}\n`;
      });
      if (aggregated.result.items.length > 20) {
        report += `- ... and ${aggregated.result.items.length - 20} more\n`;
      }
    }

    if (aggregated.result.errors && aggregated.result.errors.length > 0) {
      report += `ERRORS:\n`;
      aggregated.result.errors.forEach(err => {
        report += `- ${err.workerId}: ${err.error}\n`;
      });
    }

    return report;
  }

  /**
   * Get raw results map
   */
  getRawResults() {
    return Object.fromEntries(this.results);
  }
}

/**
 * Create aggregator for a batch of L3 workers
 */
export function createAggregator(workerConfigs, options = {}) {
  const aggregator = new ResultAggregator({
    correlationId: workerConfigs[0]?.correlationId,
    ...options,
  });

  const workerIds = workerConfigs.map(w => w.id);
  aggregator.registerWorkers(workerIds);

  return aggregator;
}

/**
 * Wait for all workers with polling
 */
export async function waitForWorkers(aggregator, checkFn, pollInterval = 1000) {
  while (!aggregator.isComplete() && !aggregator.isTimedOut()) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    // Call check function to potentially add new results
    if (typeof checkFn === 'function') {
      await checkFn(aggregator);
    }
  }

  return aggregator.aggregate();
}

/**
 * Aggregate results from state file
 */
export function aggregateFromState(statePath, correlationId, strategy = 'merge') {
  if (!fs.existsSync(statePath)) {
    throw new Error(`State file not found: ${statePath}`);
  }

  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  // Find completed L3 workers for this correlation
  const l3Results = state.messages
    ?.filter(m =>
      m.type === 'l3_result' &&
      (m.correlationId === correlationId || m.payload?.correlationId === correlationId)
    )
    .map(m => m.payload) || [];

  const aggregator = new ResultAggregator({ strategy, correlationId });

  l3Results.forEach(result => {
    aggregator.addResult(result.id || result.subtaskId, result);
  });

  return aggregator.aggregate();
}

/**
 * Available strategies for external reference
 */
export const STRATEGIES = Object.keys(AGGREGATION_STRATEGIES);

export default {
  ResultAggregator,
  createAggregator,
  waitForWorkers,
  aggregateFromState,
  STRATEGIES,
  AGGREGATION_STRATEGIES,
};
