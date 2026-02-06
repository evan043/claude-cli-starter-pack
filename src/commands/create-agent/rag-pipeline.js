/**
 * RAG Pipeline Creation
 *
 * Creates autonomous RAG pipeline systems with L1 orchestrator + L2 specialists.
 * Includes token monitoring, context compaction, and state persistence.
 *
 * Provides:
 * - createRagPipeline: Full RAG pipeline wizard
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { showHeader, showSuccess } from '../../cli/menu.js';
import {
  generateAgentTemplate,
  generateOrchestratorTemplate,
} from '../../agents/templates.js';
import { claudeAbsolutePath } from '../../utils/paths.js';

/**
 * Create a RAG pipeline system
 */
export async function createRagPipeline(options) {
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

  const basePath = claudeAbsolutePath(process.cwd(), 'skills', domain);
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
