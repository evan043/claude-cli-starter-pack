/**
 * Interactive ASCII Menu System
 * Thin orchestrator that delegates to flow modules
 */

// Re-export display functions for backwards compatibility
export {
  showHeader,
  showSuccess,
  showError,
  showWarning,
  showInfo,
} from './menu/display.js';

// Re-export main menu function
export { showMainMenu } from './flows/main.js';

// Re-export settings menu function
export { showProjectSettingsMenu } from './flows/settings.js';
