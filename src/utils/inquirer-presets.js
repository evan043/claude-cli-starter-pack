/**
 * Shared Inquirer Prompt Presets
 * Reduces duplication across 15+ command files that use identical prompts.
 */
import inquirer from 'inquirer';

/**
 * Kebab-case name prompt with validation
 * @param {object} options - Override options
 * @returns {object} Inquirer prompt config
 */
export function kebabCasePrompt(options = {}) {
  const config = {
    type: 'input',
    name: options.name || 'name',
    message: options.message || 'Name (kebab-case):',
    default: options.default !== undefined ? options.default : 'my-item',
    validate: (input) => {
      if (!/^[a-z][a-z0-9-]*$/.test(input)) {
        return 'Use kebab-case (lowercase letters, numbers, hyphens)';
      }
      return true;
    },
  };
  return config;
}

/**
 * Description prompt
 * @param {object} options - Override options
 * @returns {object} Inquirer prompt config
 */
export function descriptionPrompt(options = {}) {
  const config = {
    type: 'input',
    name: options.name || 'description',
    message: options.message || 'Description:',
    default: options.default || '',
  };
  if (options.validate) {
    config.validate = options.validate;
  }
  return config;
}

/**
 * Output path prompt with directory validation
 * @param {object} options - Override options
 * @returns {object} Inquirer prompt config
 */
export function outputPathPrompt(options = {}) {
  return {
    type: 'input',
    name: options.name || 'outputPath',
    message: options.message || 'Output path:',
    default: options.default || '.claude/',
  };
}

/**
 * Confirmation prompt
 * @param {string} message - Confirmation message
 * @param {boolean} defaultValue - Default value
 * @returns {object} Inquirer prompt config
 */
export function confirmPrompt(message = 'Continue?', defaultValue = true) {
  return {
    type: 'confirm',
    name: 'confirmed',
    message,
    default: defaultValue,
  };
}

/**
 * Run a sequence of prompts and return merged answers
 * @param {object[]} prompts - Array of Inquirer prompt configs
 * @returns {Promise<object>} Merged answers
 */
export async function promptSequence(prompts) {
  const answers = {};
  for (const prompt of prompts) {
    const answer = await inquirer.prompt([prompt]);
    Object.assign(answers, answer);
  }
  return answers;
}
