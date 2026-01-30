/**
 * Create Agent Command
 *
 * Master command for creating Claude Code agents (L1/L2/L3)
 * with optional RAG pipeline support
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { showHeader, showSuccess, showError, showWarning, showInfo } from '../cli/menu.js';
import {
  generateAgentTemplate,
  generateOrchestratorTemplate,
  AGENT_LEVELS,
} from '../agents/templates.js';
import { runCreateHook } from './create-hook.js';
import { runCreateCommand } from './create-command.js';
import { runCreateSkill } from './create-skill.js';

/**
 * Run the create-agent wizard
 */
export async function runCreateAgent(options) {
  showHeader('Agent Creator');

  // Show the main menu
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'What would you like to create?',
      choices: [
        new inquirer.Separator(chalk.cyan('── AGENTS ──')),
        {
          name: `${chalk.green('1)')} Individual Agent       Standalone specialized agent`,
          value: 'individual',
          short: 'Individual Agent',
        },
        {
          name: `${chalk.green('2)')} L2/L3 Sub-Agent        Add to orchestrator hierarchy`,
          value: 'subagent',
          short: 'Sub-Agent',
        },
        {
          name: `${chalk.green('3)')} RAG Pipeline System    Full autonomous orchestration`,
          value: 'rag-pipeline',
          short: 'RAG Pipeline',
        },
        new inquirer.Separator(chalk.cyan('── SKILLS & WORKFLOWS ──')),
        {
          name: `${chalk.blue('4)')} Skill Package          RAG-enhanced domain expertise`,
          value: 'skill',
          short: 'Skill',
        },
        new inquirer.Separator(chalk.cyan('── ENFORCEMENT & COMMANDS ──')),
        {
          name: `${chalk.yellow('5)')} Hook                   Event-driven enforcement`,
          value: 'hook',
          short: 'Hook',
        },
        {
          name: `${chalk.yellow('6)')} Command                Slash command definition`,
          value: 'command',
          short: 'Command',
        },
        new inquirer.Separator(),
        {
          name: `${chalk.dim('Q)')} Back / Exit`,
          value: 'exit',
          short: 'Exit',
        },
      ],
      pageSize: 12,
    },
  ]);

  if (mode === 'exit') {
    return null;
  }

  // Delegate to appropriate handler
  switch (mode) {
    case 'individual':
      return await createIndividualAgent(options);
    case 'subagent':
      return await createSubAgent(options);
    case 'rag-pipeline':
      return await createRagPipeline(options);
    case 'skill':
      return await runCreateSkill(options);
    case 'hook':
      return await runCreateHook(options);
    case 'command':
      return await runCreateCommand(options);
  }
}

/**
 * Create an individual agent
 */
async function createIndividualAgent(options) {
  showHeader('Create Individual Agent');

  console.log(chalk.dim('Individual agents are standalone specialists for specific tasks.'));
  console.log(chalk.dim('They can be spawned via the Task tool or referenced by skills.\n'));

  // Step 1: Agent name
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Agent name (kebab-case):',
      default: options.name || 'my-agent',
      validate: (input) => {
        if (!/^[a-z][a-z0-9-]*$/.test(input)) {
          return 'Use kebab-case (lowercase letters, numbers, hyphens)';
        }
        return true;
      },
    },
  ]);

  // Step 2: Description
  const { description } = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: 'What does this agent do?',
      default: `Specialized agent for ${name} tasks`,
    },
  ]);

  // Step 3: Level
  console.log('');
  console.log(chalk.cyan.bold('Agent Levels:'));
  Object.entries(AGENT_LEVELS).forEach(([key, level]) => {
    console.log(chalk.dim(`  ${key}: ${level.description} (${level.tokenLimit})`));
  });
  console.log('');

  const { level } = await inquirer.prompt([
    {
      type: 'list',
      name: 'level',
      message: 'Agent level:',
      choices: Object.entries(AGENT_LEVELS).map(([key, level]) => ({
        name: `${key} - ${level.description}`,
        value: key,
        short: key,
      })),
      default: 'L2',
    },
  ]);

  // Step 4: Tools
  const { tools } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'tools',
      message: 'Which tools should this agent have access to?',
      choices: [
        { name: 'Read', value: 'Read', checked: true },
        { name: 'Grep', value: 'Grep', checked: true },
        { name: 'Glob', value: 'Glob', checked: true },
        { name: 'Edit', value: 'Edit', checked: level !== 'L3' },
        { name: 'Write', value: 'Write', checked: level !== 'L3' },
        { name: 'Bash', value: 'Bash', checked: false },
        { name: 'Task', value: 'Task', checked: level === 'L1' },
        { name: 'WebFetch', value: 'WebFetch', checked: false },
        { name: 'WebSearch', value: 'WebSearch', checked: false },
      ],
      validate: (input) => input.length > 0 || 'Select at least one tool',
    },
  ]);

  // Step 5: Model
  const { model } = await inquirer.prompt([
    {
      type: 'list',
      name: 'model',
      message: 'Preferred model:',
      choices: [
        { name: 'Sonnet (balanced)', value: 'sonnet' },
        { name: 'Haiku (fast, lightweight)', value: 'haiku' },
        { name: 'Opus (complex tasks)', value: 'opus' },
        { name: 'Inherit from parent', value: 'inherit' },
      ],
      default: level === 'L3' ? 'haiku' : 'sonnet',
    },
  ]);

  // Step 6: Specialization
  const { specialization } = await inquirer.prompt([
    {
      type: 'input',
      name: 'specialization',
      message: 'Specialization focus (what domain does this agent excel in?):',
      default: `${name} domain tasks`,
    },
  ]);

  // Step 7: When to use
  const { whenToUse } = await inquirer.prompt([
    {
      type: 'input',
      name: 'whenToUse',
      message: 'When should this agent be used? (comma-separated):',
      default: `When ${name} operations are needed, When specialized ${name} expertise is required`,
      filter: (input) =>
        input
          .split(',')
          .map((w) => w.trim())
          .filter(Boolean),
    },
  ]);

  // Step 8: Workflow steps
  const { defineWorkflow } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'defineWorkflow',
      message: 'Define workflow steps?',
      default: true,
    },
  ]);

  const workflow = [];
  if (defineWorkflow) {
    let addingSteps = true;
    let stepNum = 1;

    while (addingSteps) {
      const { stepTitle, stepInstructions } = await inquirer.prompt([
        {
          type: 'input',
          name: 'stepTitle',
          message: `Step ${stepNum} title:`,
          default:
            stepNum === 1 ? 'Analyze' : stepNum === 2 ? 'Execute' : stepNum === 3 ? 'Report' : `Step ${stepNum}`,
        },
        {
          type: 'input',
          name: 'stepInstructions',
          message: `Step ${stepNum} instructions:`,
          default: 'Perform this step.',
        },
      ]);

      workflow.push({ title: stepTitle, instructions: stepInstructions });
      stepNum++;

      if (stepNum > 3) {
        const { continueAdding } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continueAdding',
            message: 'Add another step?',
            default: false,
          },
        ]);
        addingSteps = continueAdding;
      } else {
        addingSteps = true;
      }

      if (stepNum === 4 && addingSteps) {
        const { continueAdding } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continueAdding',
            message: 'Add another step?',
            default: false,
          },
        ]);
        addingSteps = continueAdding;
      }
    }
  }

  // Step 9: Output location
  const { outputPath } = await inquirer.prompt([
    {
      type: 'list',
      name: 'outputPath',
      message: 'Where should the agent be created?',
      choices: [
        { name: '.claude/agents/ (standard location)', value: '.claude/agents' },
        { name: 'Custom location', value: 'custom' },
      ],
    },
  ]);

  let finalPath = join(process.cwd(), outputPath, `${name}.md`);
  if (outputPath === 'custom') {
    const { customPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customPath',
        message: 'Custom path:',
        default: `.claude/agents/${name}.md`,
      },
    ]);
    finalPath = join(process.cwd(), customPath);
  }

  // Generate the agent
  const spinner = ora('Generating agent...').start();

  const agentContent = generateAgentTemplate({
    name,
    description,
    level,
    tools,
    model,
    specialization,
    whenToUse,
    workflow,
  });

  // Ensure directory exists
  const dir = dirname(finalPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write the agent file
  writeFileSync(finalPath, agentContent, 'utf8');

  spinner.succeed('Agent created');

  // Summary
  const details = [
    `Name: ${name}`,
    `Level: ${level}`,
    `Tools: ${tools.join(', ')}`,
    `Model: ${model}`,
    `Workflow steps: ${workflow.length}`,
    '',
    `Location: ${finalPath}`,
  ];

  showSuccess('Agent Created!', details);

  // Instructions
  console.log(chalk.dim('\nTo use this agent:'));
  console.log(chalk.cyan(`
# Via Task tool (subagent_type must be registered)
Task tool with subagent_type: "${name}"

# Reference in skill workflows
.claude/skills/{skill}/workflows/${name}-agent.md
`));

  return { name, path: finalPath, level, tools };
}

/**
 * Create a sub-agent (L2/L3)
 */
async function createSubAgent(options) {
  showHeader('Create Sub-Agent');

  console.log(chalk.dim('Sub-agents are specialists (L2) or workers (L3) in an orchestrator hierarchy.'));
  console.log(chalk.dim('They are spawned by parent orchestrators for specific tasks.\n'));

  // Step 1: Parent skill/orchestrator
  const { parentSkill } = await inquirer.prompt([
    {
      type: 'input',
      name: 'parentSkill',
      message: 'Parent skill name (the skill this agent belongs to):',
      default: 'my-skill',
    },
  ]);

  // Step 2: Agent name
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Sub-agent name:',
      default: `${parentSkill}-specialist`,
    },
  ]);

  // Step 3: Level
  const { level } = await inquirer.prompt([
    {
      type: 'list',
      name: 'level',
      message: 'Agent level:',
      choices: [
        { name: 'L2 - Specialist (deep domain expertise, 1-8K tokens)', value: 'L2' },
        { name: 'L3 - Worker (parallel atomic tasks, 500 tokens)', value: 'L3' },
      ],
      default: 'L2',
    },
  ]);

  // Step 4: Specialty
  const { specialty } = await inquirer.prompt([
    {
      type: 'input',
      name: 'specialty',
      message: 'What does this sub-agent specialize in?',
      default: level === 'L2' ? 'Analysis and recommendations' : 'Atomic task execution',
    },
  ]);

  // Step 5: Tools (limited for L3)
  const toolChoices =
    level === 'L3'
      ? [
          { name: 'Read', value: 'Read', checked: true },
          { name: 'Grep', value: 'Grep', checked: true },
          { name: 'Glob', value: 'Glob', checked: true },
        ]
      : [
          { name: 'Read', value: 'Read', checked: true },
          { name: 'Grep', value: 'Grep', checked: true },
          { name: 'Glob', value: 'Glob', checked: true },
          { name: 'Edit', value: 'Edit', checked: true },
          { name: 'Write', value: 'Write', checked: true },
          { name: 'Bash', value: 'Bash', checked: false },
          { name: 'Task', value: 'Task', checked: false },
        ];

  const { tools } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'tools',
      message: `Tools for this ${level}:`,
      choices: toolChoices,
    },
  ]);

  // Generate the sub-agent
  const spinner = ora('Generating sub-agent...').start();

  const agentContent = generateAgentTemplate({
    name,
    description: specialty,
    level,
    tools,
    model: level === 'L3' ? 'haiku' : 'sonnet',
    specialization: specialty,
    whenToUse: [`When ${parentSkill} orchestrator needs ${specialty.toLowerCase()}`],
    workflow: [
      { title: 'Receive Task', instructions: 'Accept task from orchestrator with context.' },
      { title: 'Execute', instructions: `Perform ${specialty.toLowerCase()}.` },
      { title: 'Report', instructions: 'Return results to orchestrator.' },
    ],
  });

  // Determine path
  const basePath = join(process.cwd(), '.claude', 'skills', parentSkill, 'workflows');
  if (!existsSync(basePath)) {
    mkdirSync(basePath, { recursive: true });
  }

  const finalPath = join(basePath, `${name}-agent.md`);
  writeFileSync(finalPath, agentContent, 'utf8');

  spinner.succeed('Sub-agent created');

  const details = [
    `Name: ${name}`,
    `Parent: ${parentSkill}`,
    `Level: ${level}`,
    `Specialty: ${specialty}`,
    '',
    `Location: ${finalPath}`,
  ];

  showSuccess('Sub-Agent Created!', details);

  return { name, path: finalPath, level, parentSkill };
}

/**
 * Create a RAG pipeline system
 */
async function createRagPipeline(options) {
  showHeader('Create RAG Pipeline');

  console.log(chalk.dim('RAG pipelines are autonomous systems with L1 orchestrator + L2 specialists.'));
  console.log(chalk.dim('They include token monitoring, context compaction, and state persistence.\n'));

  // Step 1: Domain name
  const { domain } = await inquirer.prompt([
    {
      type: 'input',
      name: 'domain',
      message: 'Domain/pipeline name:',
      default: 'my-pipeline',
    },
  ]);

  // Step 2: Description
  const { description } = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: 'What does this pipeline do?',
      default: `Autonomous ${domain} processing`,
    },
  ]);

  // Step 3: L2 Specialists
  console.log('');
  console.log(chalk.cyan.bold('Define L2 Specialists:'));
  console.log(chalk.dim('  Specialists handle specific aspects of the pipeline.\n'));

  const specialists = [];
  let addingSpecialists = true;

  while (addingSpecialists) {
    const { specName, specDesc } = await inquirer.prompt([
      {
        type: 'input',
        name: 'specName',
        message: 'Specialist name:',
        default:
          specialists.length === 0
            ? 'researcher'
            : specialists.length === 1
            ? 'analyzer'
            : 'implementer',
      },
      {
        type: 'input',
        name: 'specDesc',
        message: 'Specialist focus:',
        default: 'Domain-specific tasks',
      },
    ]);

    specialists.push({
      name: specName,
      file: `${specName}-agent.md`,
      description: specDesc,
      level: 'L2',
    });

    const { continueAdding } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueAdding',
        message: 'Add another specialist?',
        default: specialists.length < 3,
      },
    ]);
    addingSpecialists = continueAdding;
  }

  // Step 4: Token thresholds
  const { compactThreshold, respawnThreshold } = await inquirer.prompt([
    {
      type: 'number',
      name: 'compactThreshold',
      message: 'Context compaction threshold (%):',
      default: 75,
      validate: (n) => (n > 50 && n < 95 ? true : 'Enter 50-95'),
    },
    {
      type: 'number',
      name: 'respawnThreshold',
      message: 'Respawn threshold (%):',
      default: 90,
      validate: (n) => (n > 75 && n <= 100 ? true : 'Enter 75-100'),
    },
  ]);

  // Generate the pipeline
  const spinner = ora('Generating RAG pipeline...').start();

  const basePath = join(process.cwd(), '.claude', 'skills', domain);
  const dirs = [basePath, join(basePath, 'context'), join(basePath, 'workflows')];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  const files = [];

  // 1. L1 Orchestrator
  const orchestratorContent = generateOrchestratorTemplate({
    name: domain,
    description,
    specialists,
    tokenLimits: { compact: compactThreshold, respawn: respawnThreshold },
  });
  const orchestratorPath = join(basePath, 'workflows', `${domain}-orchestrator.md`);
  writeFileSync(orchestratorPath, orchestratorContent, 'utf8');
  files.push(orchestratorPath);

  // 2. L2 Specialists
  for (const spec of specialists) {
    const specContent = generateAgentTemplate({
      name: `${domain}-${spec.name}`,
      description: spec.description,
      level: 'L2',
      tools: ['Read', 'Grep', 'Glob', 'Edit', 'Write'],
      model: 'sonnet',
      specialization: spec.description,
      whenToUse: [`When ${domain} orchestrator needs ${spec.name}`],
      workflow: [
        { title: 'Receive', instructions: 'Accept task from orchestrator.' },
        { title: 'Execute', instructions: `Perform ${spec.name} operations.` },
        { title: 'Report', instructions: 'Return results to orchestrator.' },
      ],
    });
    const specPath = join(basePath, 'workflows', spec.file);
    writeFileSync(specPath, specContent, 'utf8');
    files.push(specPath);
  }

  // 3. SKILL.md
  const skillContent = `---
name: ${domain}
description: ${description}
version: 1.0.0
type: rag-pipeline
---

# ${domain} RAG Pipeline

${description}

## Architecture

- **L1 Orchestrator**: Routes, monitors, aggregates
- **L2 Specialists**: ${specialists.map((s) => s.name).join(', ')}

## Token Management

| Threshold | Action |
|-----------|--------|
| ${compactThreshold}% | Compact context |
| ${respawnThreshold}% | Spawn continuation |

## Usage

\`\`\`markdown
skill: "${domain}"

[Your request]
\`\`\`

---
*RAG Pipeline created by gtask*
`;
  const skillPath = join(basePath, 'SKILL.md');
  writeFileSync(skillPath, skillContent, 'utf8');
  files.push(skillPath);

  spinner.succeed('RAG pipeline created');

  const details = [
    `Domain: ${domain}`,
    `Orchestrator: L1`,
    `Specialists: ${specialists.length} (L2)`,
    `Compact: ${compactThreshold}%`,
    `Respawn: ${respawnThreshold}%`,
    '',
    'Files created:',
    ...files.map((f) => `  ${f.replace(process.cwd(), '.')}`),
  ];

  showSuccess('RAG Pipeline Created!', details);

  console.log(chalk.dim('\nTo use this pipeline:'));
  console.log(chalk.cyan(`  skill: "${domain}"`));

  return { domain, path: basePath, specialists, files };
}
