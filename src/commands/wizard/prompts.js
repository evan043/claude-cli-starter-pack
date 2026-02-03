/**
 * Wizard Prompt Configurations
 *
 * Menu options, feature categories, and prompt definitions
 * used by the setup wizard.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';

/**
 * Streamlined setup options - Auto vs Custom Install
 * Auto: Install ALL features without prompts (recommended)
 * Custom: Show checkbox UI for feature selection
 */
export const SETUP_OPTIONS = [
  {
    name: `${chalk.green('1.')} Auto-Install ${chalk.dim('- All features, no prompts (recommended)')}`,
    value: 'auto',
    short: 'Auto-Install',
  },
  {
    name: `${chalk.yellow('2.')} Custom Install ${chalk.dim('- Choose specific features')}`,
    value: 'custom',
    short: 'Custom Install',
  },
  {
    name: `${chalk.cyan('3.')} Reinstall (Clean) ${chalk.dim('- Backup, remove, fresh install')}`,
    value: 'reinstall',
    short: 'Reinstall',
  },
  {
    name: `${chalk.cyan('4.')} GitHub Setup ${chalk.dim('- Connect project board only')}`,
    value: 'github',
    short: 'GitHub',
  },
  {
    name: `${chalk.dim('5.')} More Options ${chalk.dim('- Templates, releases')}`,
    value: 'more',
    short: 'More',
  },
  {
    name: `${chalk.red('6.')} Uninstall CCASP ${chalk.dim('- Remove from this project')}`,
    value: 'uninstall',
    short: 'Uninstall',
  },
  {
    name: `${chalk.magenta('7.')} Install Happy.engineering ${chalk.dim('- Mobile app + hooks')}`,
    value: 'happy',
    short: 'Happy',
  },
  {
    name: `${chalk.dim('0.')} Exit`,
    value: 'exit',
    short: 'Exit',
  },
];

/**
 * Advanced options submenu - accessed via "More Options"
 * Contains: View Templates, Prior Releases, Remove CCASP
 */
export const ADVANCED_OPTIONS = [
  {
    name: `${chalk.yellow('1.')} View Templates ${chalk.dim('- Browse available items')}`,
    value: 'templates',
    short: 'Templates',
  },
  {
    name: `${chalk.yellow('2.')} Prior Releases ${chalk.dim('- Add features from past versions')}`,
    value: 'releases',
    short: 'Releases',
  },
  {
    name: `${chalk.dim('0.')} Back`,
    value: 'back',
    short: 'Back',
  },
];

/**
 * Feature categories organized by type
 * All features pre-selected by default - user can deselect
 */
export const FEATURE_CATEGORIES = [
  {
    name: 'COMMANDS',
    features: [
      { name: 'GitHub (update, task, issues)', value: 'githubIntegration', checked: true, short: 'GitHub integration' },
      { name: 'Planning (phase-dev, task-list)', value: 'phasedDevelopment', checked: true, short: 'Phased development' },
      { name: 'Testing (e2e-test, smoke)', value: 'testing', checked: true, short: 'Testing commands' },
      { name: 'Deploy (full, tunnel)', value: 'deploymentAutomation', checked: true, short: 'Deployment automation' },
      { name: 'Refactor (check, cleanup)', value: 'refactoring', checked: true, short: 'Refactoring tools' },
      { name: 'MCP Explorer', value: 'mcpExplorer', checked: true, short: 'MCP discovery' },
      { name: 'Analysis (codebase, audit)', value: 'analysis', checked: true, short: 'Code analysis' },
    ],
  },
  {
    name: 'AGENTS',
    features: [
      { name: 'Auto Stack Agents + Delegation', value: 'autoStackAgents', checked: true, short: 'Smart agent routing' },
      { name: 'Example Agent', value: 'exampleAgent', checked: true, short: 'Example agent template' },
      { name: 'Create Agent Command', value: 'createAgent', checked: true, short: 'Agent creator' },
    ],
  },
  {
    name: 'HOOKS',
    features: [
      { name: 'Update Checker', value: 'updateChecker', checked: true, short: 'Auto-update check' },
      { name: 'Advanced Hook Suite', value: 'advancedHooks', checked: true, short: 'Advanced hooks' },
    ],
  },
  {
    name: 'SKILLS',
    features: [
      { name: 'Example Skill', value: 'exampleSkill', checked: true, short: 'Example skill template' },
      { name: 'Skill Templates', value: 'skillTemplates', checked: true, short: 'Skill creators' },
    ],
  },
  {
    name: 'EXTRAS',
    features: [
      { name: 'Token Management', value: 'tokenManagement', checked: true, short: 'Token budget tracking' },
      { name: 'Tunnel Services', value: 'tunnelServices', checked: true, short: 'Dev tunnels' },
      { name: 'Happy Mode', value: 'happyMode', checked: true, short: 'Mobile app integration' },
    ],
  },
  {
    name: 'DOCUMENTATION',
    features: [
      { name: 'INDEX.md', value: 'indexMd', checked: true, short: 'Command index' },
      { name: 'README.md', value: 'readmeMd', checked: true, short: 'Slash commands docs' },
    ],
  },
];

/**
 * Flatten all features for checkbox prompt
 * @returns {Array} Array of inquirer choices with separators
 */
export function getAllFeatures() {
  const features = [];
  for (const category of FEATURE_CATEGORIES) {
    // Add category header as separator
    features.push(new inquirer.Separator(chalk.bold.cyan(`\n  ${category.name}`)));
    for (const feature of category.features) {
      features.push({
        name: `  ${feature.name}`,
        value: feature.value,
        checked: feature.checked,
        short: feature.short,
      });
    }
  }
  return features;
}

/**
 * Map feature selections to init.js feature names
 * @param {Array<string>} selectedFeatures - Array of selected feature values
 * @returns {Array<string>} Array of init.js feature names
 */
export function mapFeaturesToInit(selectedFeatures) {
  const featureMap = {
    // Commands
    githubIntegration: 'githubIntegration',
    phasedDevelopment: 'phasedDevelopment',
    testing: 'testing',
    deploymentAutomation: 'deploymentAutomation',
    refactoring: 'refactoring',
    mcpExplorer: null, // Always included in base
    analysis: null, // Always included in base
    // Agents
    autoStackAgents: 'autoStackAgents', // Agent generation + delegation hooks
    exampleAgent: null, // Handled by init
    createAgent: null, // Always included
    // Hooks
    updateChecker: null, // Always included
    advancedHooks: 'advancedHooks',
    // Skills
    exampleSkill: null, // Handled by init
    skillTemplates: 'skillTemplates',
    // Extras
    tokenManagement: 'tokenManagement',
    tunnelServices: 'tunnelServices',
    happyMode: 'happyMode',
    // Documentation
    indexMd: null, // Always included
    readmeMd: null, // Always included
  };

  return selectedFeatures
    .map((f) => featureMap[f])
    .filter((f) => f !== null && f !== undefined);
}

/**
 * Get all feature values that are checked by default
 * @returns {Array<string>} Array of default feature values
 */
export function getDefaultFeatures() {
  const defaults = [];
  for (const category of FEATURE_CATEGORIES) {
    for (const feature of category.features) {
      if (feature.checked) {
        defaults.push(feature.value);
      }
    }
  }
  return defaults;
}

/**
 * Get the full list of init features for auto-install
 * @returns {Array<string>} Array of all optional feature names for init.js
 */
export function getAllInitFeatures() {
  return [
    'githubIntegration',
    'phasedDevelopment',
    'testing',
    'deploymentAutomation',
    'refactoring',
    'advancedHooks',
    'skillTemplates',
    'tokenManagement',
    'tunnelServices',
    'happyMode',
  ];
}

export default {
  SETUP_OPTIONS,
  ADVANCED_OPTIONS,
  FEATURE_CATEGORIES,
  getAllFeatures,
  mapFeaturesToInit,
  getDefaultFeatures,
  getAllInitFeatures,
};
