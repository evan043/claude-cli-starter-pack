import chalk from 'chalk';
import inquirer from 'inquirer';

/**
 * Display phase table
 */
export function displayPhaseTable(phases) {
  console.log(chalk.dim('┌────┬────────────────────────────────────┬────────────┬─────────────────┐'));
  console.log(chalk.dim('│') + chalk.bold(' #  ') + chalk.dim('│') + chalk.bold(' Phase                              ') + chalk.dim('│') + chalk.bold(' Complexity ') + chalk.dim('│') + chalk.bold(' Dependencies   ') + chalk.dim('│'));
  console.log(chalk.dim('├────┼────────────────────────────────────┼────────────┼─────────────────┤'));

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const num = String(i + 1).padStart(2);
    const title = (phase.phase_title || '').substring(0, 34).padEnd(34);
    const complexity = (phase.complexity || 'M').padEnd(10);
    const deps = (phase.dependencies || []).join(', ').substring(0, 13).padEnd(13) || '-'.padEnd(13);

    console.log(`${chalk.dim('│')  } ${num} ${  chalk.dim('│')  } ${title} ${  chalk.dim('│')  } ${complexity} ${  chalk.dim('│')  } ${deps} ${  chalk.dim('│')}`);
  }

  console.log(chalk.dim('└────┴────────────────────────────────────┴────────────┴─────────────────┘'));
}

/**
 * Edit phases interactively
 */
export async function editPhases(phases) {
  console.log('');
  console.log(chalk.dim('Edit phases (leave blank to keep current value):'));
  console.log('');

  const editedPhases = [];

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    console.log(chalk.cyan(`Phase ${i + 1}: ${phase.phase_title}`));

    const { title, complexity, action } = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Title:',
        default: phase.phase_title,
      },
      {
        type: 'list',
        name: 'complexity',
        message: 'Complexity:',
        choices: ['S', 'M', 'L'],
        default: phase.complexity,
      },
      {
        type: 'list',
        name: 'action',
        message: 'Action:',
        choices: [
          { name: 'Keep', value: 'keep' },
          { name: 'Remove', value: 'remove' },
        ],
      },
    ]);

    if (action === 'keep') {
      editedPhases.push({
        ...phase,
        phase_title: title,
        complexity,
      });
    }
  }

  // Update dependencies to point to new indices
  return editedPhases.map((phase, i) => ({
    ...phase,
    phase_id: `phase-${i + 1}`,
    dependencies: phase.dependencies
      .filter(dep => editedPhases.some(p => p.phase_id === dep))
      .map(dep => {
        const newIdx = editedPhases.findIndex(p => p.phase_id === dep);
        return newIdx >= 0 ? `phase-${newIdx + 1}` : dep;
      }),
  }));
}

/**
 * Display roadmap summary
 */
export function displayRoadmapSummary(roadmap, path, phasePlansResult) {
  console.log('');
  console.log(chalk.cyan('╔═══════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.green.bold('  ✓ Roadmap Created Successfully!                                      ') + chalk.cyan('║'));
  console.log(chalk.cyan('╠═══════════════════════════════════════════════════════════════════════╣'));
  console.log(`${chalk.cyan('║')  }  Roadmap: ${(roadmap.title || '').substring(0, 50).padEnd(58)}${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }  Phases: ${String(roadmap.phases?.length || 0).padEnd(59)}${  chalk.cyan('║')}`);
  console.log(`${chalk.cyan('║')  }  Location: ${path.substring(0, 56).padEnd(57)}${  chalk.cyan('║')}`);

  if (roadmap.metadata?.github_epic_number) {
    console.log(chalk.cyan('║') + chalk.dim(`  GitHub Epic: #${roadmap.metadata.github_epic_number}`.padEnd(69)) + chalk.cyan('║'));
  }

  console.log(chalk.cyan('║') + ''.padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.bold('  Next Steps:'.padEnd(69)) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  1. Review: /roadmap-status ${roadmap.slug}`.substring(0, 69).padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  2. Start: /phase-track ${roadmap.slug}/phase-1`.substring(0, 69).padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('║') + `  3. Edit: /roadmap-edit ${roadmap.slug}`.substring(0, 69).padEnd(69) + chalk.cyan('║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════════╝'));
  console.log('');
}

/**
 * Show roadmap help
 */
export function showRoadmapHelp() {
  console.log('');
  console.log(chalk.cyan.bold('📚 Roadmap Planning Guide'));
  console.log('');

  console.log(chalk.white.bold('When to Create a Roadmap:'));
  console.log(chalk.dim(`
  Create a roadmap instead of a single phase-dev-plan when:
  • 30+ tasks are identified
  • 3+ domains involved (frontend, backend, database, testing)
  • Multiple features that could conflict
  • Long duration (> 2 weeks)
`));

  console.log(chalk.white.bold('Roadmap Modes:'));
  console.log(chalk.dim(`
  ${chalk.green('A) Manual Builder')}
     Describe what you want to build and Claude structures it into phases.
     Best for: New features, greenfield projects, clear requirements.

  ${chalk.cyan('B) GitHub Import')}
     Import existing GitHub issues and organize them into a roadmap.
     Best for: Backlog organization, sprint planning, issue triage.

  ${chalk.magenta('C) Multi-Project Builder')}
     Complex scope decomposed into multiple independent projects.
     Features L2 agent exploration for code analysis and file references.
     Best for: Large refactors, multi-domain features, platform migrations.
`));

  console.log(chalk.white.bold('Phase Patterns:'));
  console.log(chalk.dim(`
  Foundation Pattern (new features):
    1. Foundation → 2. API Layer → 3. UI Layer → 4. Integration → 5. Polish

  Migration Pattern (refactoring):
    1. Analysis → 2. Preparation → 3. Core Migration → 4. Validation → 5. Cleanup

  Feature Pattern (adding capabilities):
    1. Design → 2. Backend → 3. Frontend → 4. Testing → 5. Deploy
`));

  console.log(chalk.white.bold('Commands:'));
  console.log(chalk.dim(`
  /create-roadmap          Create new roadmap (Modes A, B, or C)
  /roadmap-status          View roadmap progress
  /roadmap-edit            Edit phases and structure
  /roadmap-track           Track execution
  /phase-track             Track individual phase
`));

  console.log('');
}
