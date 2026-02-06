/**
 * Vision Mode Observer
 * Thin re-export wrapper for organized submodules.
 */

import { calculateAlignment, detectDrift, identifyDriftAreas, shouldTriggerReplan } from './observer/detection.js';
import { generateAdjustments, formatDriftReport } from './observer/adjustments.js';
import { observeProgress } from './observer/progress.js';

export { observeProgress, calculateAlignment, detectDrift, identifyDriftAreas, generateAdjustments, shouldTriggerReplan, formatDriftReport };

export default { observeProgress, calculateAlignment, detectDrift, identifyDriftAreas, generateAdjustments, shouldTriggerReplan, formatDriftReport };
