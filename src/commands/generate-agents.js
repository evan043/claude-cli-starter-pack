/**
 * Generate Agents Command
 *
 * On-demand generation of stack-specific agents based on detected tech stack.
 * Can be run manually or as part of ccasp init.
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { loadAgentRegistry, saveAgentRegistry, createRegistryFromTechStack } from '../agents/registry.js';
import { getDefaultAgentsForStack, getSupportedFrameworks } from '../agents/stack-mapping.js';
import { generateAgentsForStack, listGeneratedAgents } from '../agents/generator.js';
import { loadDelegationConfig, saveDelegationConfig, createDelegationConfigFromStack } from '../hooks/delegation-config.js';

/**
 * Load tech stack from config
 */
function loadTechStack(projectRoot) {
  const techStackPath = join(projectRoot, '.claude', 'config', 'tech-stack.json');
  if (existsSync(techStackPath)) {
    try {
      return JSON.parse(readFileSync(techStackPath, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Display detected tech stack summary
 */
function displayTechStackSummary(techStack) {
  console.log(chalk.cyan('\n📊 Detected Tech Stack:\n'));

  const sections = [
    { key: 'frontend', label: 'Frontend', value: techStack.frontend?.framework },
    { key: 'stateManager', label: 'State Manager', value: techStack.frontend?.stateManager },
    { key: 'backend', label: 'Backend', value: techStack.backend?.framework },
    { key: 'backendLang', label: 'Backend Language', value: techStack.backend?.language },
    { key: 'database', label: 'Database', value: techStack.database?.primary },
    { key: 'orm', label: 'ORM', value: techStack.database?.orm },
    { key: 'e2eTesting', label: 'E2E Testing', value: techStack.testing?.e2e?.framework },
    { key: 'unitTesting', label: 'Unit Testing', value: techStack.testing?.unit?.framework },
    { key: 'deployBackend', label: 'Backend Deploy', value: techStack.deployment?.backend?.platform },
    { key: 'deployFrontend', label: 'Frontend Deploy', value: techStack.deployment?.frontend?.platform },
  ];

  for (const section of sections) {
    if (section.value) {
      console.log(`  ${chalk.gray('•')} ${chalk.white(section.label)}: ${chalk.green(section.value)}`);
    }
  }

  console.log('');
}

/**
 * Display agents to be generated
 */
function displayAgentsToGenerate(agents) {
  console.log(chalk.cyan('\n🤖 Agents to Generate:\n'));

  const byDomain = {};
  for (const agent of agents) {
    if (!byDomain[agent.domain]) {
      byDomain[agent.domain] = [];
    }
    byDomain[agent.domain].push(agent);
  }

  for (const [domain, domainAgents] of Object.entries(byDomain)) {
    console.log(chalk.white(`  ${domain}:`));
    for (const agent of domainAgents) {
      const framework = agent.framework ? ` (${agent.framework})` : '';
      console.log(`    ${chalk.gray('•')} ${chalk.green(agent.name)}${chalk.gray(framework)}`);
    }
  }

  console.log('');
}

/**
 * Generate agents command handler
 */
export async function generateAgents(options = {}) {
  const projectRoot = options.projectRoot || process.cwd();
  const claudeDir = join(projectRoot, '.claude');

  console.log(chalk.bold.cyan('\n🚀 CCASP Agent Generator\n'));

  // Check if .claude directory exists
  if (!existsSync(claudeDir)) {
    console.log(chalk.red('❌ No .claude directory found. Run `ccasp init` first.\n'));
    return { success: false, error: 'No .claude directory' };
  }

  // Load tech stack
  const techStack = loadTechStack(projectRoot);

  if (!techStack) {
    console.log(chalk.yellow('⚠️  No tech-stack.json found. Running tech stack detection...\n'));

    // Import and run detection
    const { detectTechStack } = await import('./detect-tech-stack.js');
    const detected = await detectTechStack(projectRoot, { silent: true });

    if (!detected || !detected.frontend) {
      console.log(chalk.red('❌ Failed to detect tech stack.\n'));
      return { success: false, error: 'Tech stack detection failed' };
    }

    // Save the detected tech stack
    const configDir = join(projectRoot, '.claude', 'config');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    writeFileSync(join(configDir, 'tech-stack.json'), JSON.stringify(detected, null, 2), 'utf8');
    console.log(chalk.green('  ✓ Saved tech-stack.json\n'));
  }

  // Reload tech stack after potential detection
  const finalTechStack = loadTechStack(projectRoot) || {};

  // Display summary
  displayTechStackSummary(finalTechStack);

  // Get agents to generate
  const agentsToGenerate = getDefaultAgentsForStack(finalTechStack);

  if (agentsToGenerate.length === 0) {
    console.log(chalk.yellow('⚠️  No agents to generate based on detected tech stack.\n'));
    console.log(chalk.gray('Supported frameworks:'));
    const supported = getSupportedFrameworks();
    for (const [category, frameworkMap] of Object.entries(supported)) {
      const frameworkNames = Object.keys(frameworkMap);
      console.log(`  ${category}: ${frameworkNames.join(', ')}`);
    }
    return { success: true, agents: [] };
  }

  // Display agents to generate
  displayAgentsToGenerate(agentsToGenerate);

  // Confirm generation (unless auto mode)
  if (!options.auto) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Generate ${agentsToGenerate.length} agents?`,
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('\nGeneration cancelled.\n'));
      return { success: false, cancelled: true };
    }
  }

  const spinner = ora('Generating agents...').start();

  try {
    // 1. Create agent registry
    spinner.text = 'Creating agent registry...';
    const registry = createRegistryFromTechStack(finalTechStack);
    const registryPath = saveAgentRegistry(registry, projectRoot);
    spinner.succeed(`Created agent registry: ${chalk.gray(registryPath)}`);

    // 2. Generate agent markdown files
    spinner.start('Generating agent files...');
    const generateResult = await generateAgentsForStack(finalTechStack, projectRoot);
    const generatedAgents = generateResult.created || [];
    spinner.succeed(`Generated ${generatedAgents.length} agent files`);

    // 3. Create delegation config
    spinner.start('Creating delegation configuration...');
    const delegationConfig = createDelegationConfigFromStack(finalTechStack);
    const delegationPath = saveDelegationConfig(delegationConfig, projectRoot);
    spinner.succeed(`Created delegation config: ${chalk.gray(delegationPath)}`);

    // 4. Copy hook templates
    spinner.start('Setting up delegation hooks...');
    await setupDelegationHooks(projectRoot);
    spinner.succeed('Set up delegation hooks');

    // Display summary
    console.log(chalk.green('\n✅ Agent generation complete!\n'));

    console.log(chalk.white('Generated files:'));
    console.log(`  ${chalk.gray('•')} .claude/config/agents.json - Agent registry`);
    console.log(`  ${chalk.gray('•')} .claude/config/delegation.json - Routing rules`);
    console.log(`  ${chalk.gray('•')} .claude/agents/*.md - Agent definitions (${generatedAgents.length} files)`);

    if (options.verbose) {
      console.log(chalk.cyan('\nGenerated agents:'));
      for (const agent of generatedAgents) {
        console.log(`  ${chalk.gray('•')} ${agent.name} (${agent.domain})`);
      }
    }

    console.log(chalk.gray('\nTo use agents, restart Claude Code CLI.\n'));

    return {
      success: true,
      agents: generatedAgents,
      registryPath,
      delegationPath,
    };
  } catch (error) {
    spinner.fail(`Generation failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Setup delegation hooks in project
 */
async function setupDelegationHooks(projectRoot) {
  const hooksDir = join(projectRoot, '.claude', 'hooks');

  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  // Get template directory
  const templateDir = join(dirname(import.meta.url.replace('file:///', '')), '..', '..', 'templates', 'hooks');

  // Copy hook templates
  const hookTemplates = ['task-classifier.template.js', 'agent-delegator.template.js', 'delegation-enforcer.template.js'];

  for (const template of hookTemplates) {
    const templatePath = join(templateDir, template);
    const targetName = template.replace('.template', '');
    const targetPath = join(hooksDir, targetName);

    if (existsSync(templatePath)) {
      const content = readFileSync(templatePath, 'utf8');
      writeFileSync(targetPath, content, 'utf8');
    }
  }
}

/**
 * List existing agents command
 */
export async function listAgents(options = {}) {
  const projectRoot = options.projectRoot || process.cwd();

  console.log(chalk.bold.cyan('\n🤖 Generated Agents\n'));

  // Load registry
  const registry = loadAgentRegistry(projectRoot);

  if (!registry || registry.agents.length === 0) {
    console.log(chalk.yellow('No agents found. Run `ccasp generate-agents` to create them.\n'));
    return { success: true, agents: [] };
  }

  // Group by domain
  const byDomain = {};
  for (const agent of registry.agents) {
    if (!byDomain[agent.domain]) {
      byDomain[agent.domain] = [];
    }
    byDomain[agent.domain].push(agent);
  }

  for (const [domain, agents] of Object.entries(byDomain)) {
    console.log(chalk.white(`${domain}:`));
    for (const agent of agents) {
      const framework = agent.framework ? chalk.gray(` (${agent.framework})`) : '';
      const model = chalk.blue(agent.model || 'sonnet');
      console.log(`  ${chalk.green('•')} ${agent.name}${framework} - ${model}`);
    }
    console.log('');
  }

  // Also list generated markdown files
  const generatedFiles = listGeneratedAgents(projectRoot);

  if (generatedFiles.length > 0) {
    console.log(chalk.gray(`Agent files: ${generatedFiles.length} in .claude/agents/`));
  }

  return { success: true, agents: registry.agents };
}

/**
 * CLI command definition
 */
export const command = {
  name: 'generate-agents',
  description: 'Generate stack-specific agents from detected tech stack',
  options: [
    {
      flags: '-a, --auto',
      description: 'Auto-confirm generation without prompts',
    },
    {
      flags: '-v, --verbose',
      description: 'Show detailed output',
    },
    {
      flags: '-l, --list',
      description: 'List existing agents instead of generating',
    },
  ],
  action: async (options) => {
    if (options.list) {
      return listAgents(options);
    }
    return generateAgents(options);
  },
};

export default generateAgents;
