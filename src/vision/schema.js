/**
 * Vision Schema Definition
 * Thin re-export wrapper for organized submodules.
 */

import { VisionStatus, VisionIntent, DriftSeverity, VISION_SCHEMA } from './schema/constants.js';
import { createVision, generateSlug } from './schema/factories.js';
import { validateVision, updateVisionStatus, calculateVisionCompletion, recordDriftEvent, updateAlignment, recordSecurityScan, addCreatedAgent, updateRoadmapProgress } from './schema/mutations.js';

export { VisionStatus, VisionIntent, DriftSeverity, VISION_SCHEMA, createVision, generateSlug, validateVision, updateVisionStatus, calculateVisionCompletion, recordDriftEvent, updateAlignment, recordSecurityScan, addCreatedAgent, updateRoadmapProgress };

export default { VisionStatus, VisionIntent, DriftSeverity, VISION_SCHEMA, createVision, generateSlug, validateVision, updateVisionStatus, calculateVisionCompletion, recordDriftEvent, updateAlignment, recordSecurityScan, addCreatedAgent, updateRoadmapProgress };
