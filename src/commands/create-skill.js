/**
 * Create Skill Command
 *
 * Interactive wizard for creating Claude Code RAG-enhanced skills
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { showHeader, showSuccess, showError, showWarning, showInfo } from '../cli/menu.js';
import {
  generateSkillTemplate,
  generateSkillContextReadme,
  generateSkillWorkflowsReadme,
  generateAgentTemplate,
} from '../agents/templates.js';

/**
 * Run the create-skill wizard
 */
export async function runCreateSkill(options) {
  showHeader('Create Skill Package');

  console.log(chalk.dim('Skills are RAG-enhanced packages with context, patterns, and workflows.'));
  console.log(chalk.dim('They can be invoked with skill: "name" or via slash commands.\n'));

  // Step 1: Skill name
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Skill name (kebab-case):',
      default: options.name || 'my-skill',
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
      message: 'What does this skill provide?',
      default: `${name} domain expertise and workflows`,
    },
  ]);

  // Step 3: Triggers
  console.log('');
  console.log(chalk.cyan.bold('Triggers:'));
  console.log(chalk.dim('  Skills activate on slash commands, keywords, or explicit invocation.'));
  console.log('');

  const { triggers } = await inquirer.prompt([
    {
      type: 'input',
      name: 'triggers',
      message: 'Trigger patterns (comma-separated):',
      default: `/${name}, skill: "${name}"`,
      filter: (input) =>
        input
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
    },
  ]);

  // Step 4: Knowledge areas
  const { knowledgeAreas } = await inquirer.prompt([
    {
      type: 'input',
      name: 'knowledgeAreas',
      message: 'Areas of expertise (comma-separated):',
      default: 'Best practices, Common patterns, Domain knowledge',
      filter: (input) =>
        input
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
    },
  ]);

  // Step 5: Create workflows?
  const { createWorkflows } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createWorkflows',
      message: 'Create agent workflows for this skill?',
      default: true,
    },
  ]);

  const workflows = [];
  if (createWorkflows) {
    let addingWorkflows = true;

    while (addingWorkflows) {
      const { workflowName, workflowDesc } = await inquirer.prompt([
        {
          type: 'input',
          name: 'workflowName',
          message: 'Workflow name:',
          default: workflows.length === 0 ? 'analyzer' : 'implementer',
        },
        {
          type: 'input',
          name: 'workflowDesc',
          message: 'Workflow description:',
          default: `${name} workflow agent`,
        },
      ]);

      workflows.push({
        name: workflowName,
        file: `${workflowName}-agent.md`,
        description: workflowDesc,
      });

      const { continueAdding } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAdding',
          message: 'Add another workflow?',
          default: workflows.length < 2,
        },
      ]);
      addingWorkflows = continueAdding;
    }
  }

  // Step 6: Create hooks?
  const { createHooks } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createHooks',
      message: 'Create enforcement hooks for this skill?',
      default: false,
    },
  ]);

  const hooks = [];
  if (createHooks) {
    const { hookName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'hookName',
        message: 'Hook name:',
        default: `${name}-enforcer`,
      },
    ]);
    hooks.push(`${hookName}.js`);
  }

  // Step 7: Output location
  const { outputPath } = await inquirer.prompt([
    {
      type: 'list',
      name: 'outputPath',
      message: 'Where should the skill be created?',
      choices: [
        { name: '.claude/skills/ (standard location)', value: '.claude/skills' },
        { name: 'Custom location', value: 'custom' },
      ],
    },
  ]);

  let basePath = join(process.cwd(), outputPath, name);
  if (outputPath === 'custom') {
    const { customPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customPath',
        message: 'Custom base path:',
        default: `.claude/skills/${name}`,
      },
    ]);
    basePath = join(process.cwd(), customPath);
  }

  // Generate the skill
  const spinner = ora('Generating skill package...').start();

  // Create directory structure
  const dirs = [basePath, join(basePath, 'context'), join(basePath, 'context', 'patterns'), join(basePath, 'workflows')];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // Generate files
  const files = [];

  // 1. SKILL.md
  const skillContent = generateSkillTemplate({
    name,
    description,
    triggers,
    knowledgeAreas,
    workflows,
    hooks,
  });
  const skillPath = join(basePath, 'SKILL.md');
  writeFileSync(skillPath, skillContent, 'utf8');
  files.push(skillPath);

  // 2. Context README
  const contextReadme = generateSkillContextReadme({
    name,
    description,
    knowledgeAreas,
  });
  const contextPath = join(basePath, 'context', 'README.md');
  writeFileSync(contextPath, contextReadme, 'utf8');
  files.push(contextPath);

  // 3. Workflows README
  const workflowsReadme = generateSkillWorkflowsReadme({
    name,
    workflows,
  });
  const workflowsPath = join(basePath, 'workflows', 'README.md');
  writeFileSync(workflowsPath, workflowsReadme, 'utf8');
  files.push(workflowsPath);

  // 4. Generate workflow agent files
  for (const workflow of workflows) {
    const agentContent = generateAgentTemplate({
      name: `${name}-${workflow.name}`,
      description: workflow.description,
      level: 'L2',
      tools: ['Read', 'Grep', 'Glob', 'Task'],
      model: 'sonnet',
      specialization: `Specialized for ${workflow.name} tasks in the ${name} domain.`,
      whenToUse: [
        `When ${workflow.name} operations are needed`,
        `When working within the ${name} skill context`,
      ],
      workflow: [
        { title: 'Analyze', instructions: 'Analyze the request and gather context.' },
        { title: 'Execute', instructions: 'Perform the workflow task.' },
        { title: 'Report', instructions: 'Summarize findings and next steps.' },
      ],
    });
    const agentPath = join(basePath, 'workflows', workflow.file);
    writeFileSync(agentPath, agentContent, 'utf8');
    files.push(agentPath);
  }

  // 5. Create patterns placeholder
  const patternsReadme = `# ${name} - Patterns

Common patterns and best practices for ${name}.

## Contents

Add pattern documentation here:
- \`naming-conventions.md\`
- \`common-patterns.md\`
- \`anti-patterns.md\`

---
*Part of ${name} skill*
`;
  const patternsPath = join(basePath, 'context', 'patterns', 'README.md');
  writeFileSync(patternsPath, patternsReadme, 'utf8');
  files.push(patternsPath);

  spinner.succeed('Skill package created');

  // Summary
  const details = [
    `Name: ${name}`,
    `Triggers: ${triggers.join(', ')}`,
    `Knowledge areas: ${knowledgeAreas.length}`,
    `Workflows: ${workflows.length}`,
    hooks.length > 0 ? `Hooks: ${hooks.join(', ')}` : '',
    '',
    'Files created:',
    ...files.map((f) => `  ${f.replace(process.cwd(), '.')}`),
  ].filter(Boolean);

  showSuccess('Skill Package Created!', details);

  // Directory structure
  console.log(chalk.dim('\nDirectory structure:'));
  console.log(chalk.cyan(`
${basePath.replace(process.cwd(), '.')}/
├── SKILL.md              # Main skill definition
├── context/
│   ├── README.md         # Context overview
│   └── patterns/
│       └── README.md     # Pattern documentation
└── workflows/
    ├── README.md         # Workflow index
${workflows.map((w) => `    └── ${w.file}`).join('\n')}
`));

  // Instructions
  console.log(chalk.dim('To use this skill in Claude Code:'));
  console.log(chalk.cyan(`  skill: "${name}"`));
  console.log('');

  return { name, path: basePath, files, workflows };
}
