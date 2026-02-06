/**
 * Phase-Dev Completion Reporter
 *
 * Standardized completion reporting to parent levels (roadmap/epic).
 * Handles both standalone mode and parent-child hierarchies.
 *
 * DECOMPOSED into:
 * - reporter/metrics.js - Metrics calculation and status queries
 * - reporter/reporting.js - Main reporting logic (parent hierarchy updates + GitHub sync)
 * - reporter/lifecycle.js - Local lifecycle management (marking complete in files)
 */

import { calculateCompletionMetrics, getPhaseDevStatus } from './reporter/metrics.js';
import { reportPhaseDevComplete } from './reporter/reporting.js';
import { markPhaseDevComplete } from './reporter/lifecycle.js';

export { reportPhaseDevComplete, calculateCompletionMetrics, markPhaseDevComplete, getPhaseDevStatus };

export default { reportPhaseDevComplete, calculateCompletionMetrics, markPhaseDevComplete, getPhaseDevStatus };
