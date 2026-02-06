/**
 * L2 Exploration - Orchestration Re-export
 *
 * Provides runL2Exploration to non-command domains (e.g. roadmap/)
 * without creating a direct commands/ → roadmap/ boundary violation.
 */

// eslint-disable-next-line no-restricted-imports -- intentional bridge re-export
export { runL2Exploration } from '../commands/create-phase-dev/l2-orchestrator.js';
