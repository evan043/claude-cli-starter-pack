/**
 * Integration Configuration Wizard
 *
 * Interactive setup for PM tool integrations (Jira, Linear, ClickUp).
 * Called from the main CCASP wizard during GitHub configuration phase.
 *
 * This file is a thin re-export wrapper.
 * Implementation split into submodules under ./integration-wizard/
 */

export { runIntegrationWizard, promptForIntegrations } from './integration-wizard/wizard.js';
