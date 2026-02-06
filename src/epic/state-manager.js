/**
 * Epic State Manager
 *
 * Wrapper for decomposed epic state management modules.
 * Re-exports all functions from submodules for backward compatibility.
 */

import { initEpicDirectory, loadEpic, saveEpic, initEpicOrchestratorState, loadOrchestratorState, saveOrchestratorState } from './state/store.js';
import { updateRoadmapStatus, updateRoadmapProgress, advanceToNextRoadmap, checkGatingRequirements, addActiveRoadmap, completeRoadmap, failRoadmap, updateTokenBudget, createCheckpoint } from './state/transitions.js';
import { getEpicStatus } from './state/queries.js';

export { initEpicDirectory, loadEpic, saveEpic, initEpicOrchestratorState, loadOrchestratorState, saveOrchestratorState, updateRoadmapStatus, updateRoadmapProgress, advanceToNextRoadmap, checkGatingRequirements, addActiveRoadmap, completeRoadmap, failRoadmap, updateTokenBudget, createCheckpoint, getEpicStatus };

export default { initEpicDirectory, loadEpic, saveEpic, initEpicOrchestratorState, loadOrchestratorState, saveOrchestratorState, updateRoadmapStatus, updateRoadmapProgress, advanceToNextRoadmap, checkGatingRequirements, addActiveRoadmap, completeRoadmap, failRoadmap, updateTokenBudget, createCheckpoint, getEpicStatus };
