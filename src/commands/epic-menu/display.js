import chalk from 'chalk';

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

export function showSessionRestartWarning() {
  console.log('');
  console.log(chalk.yellow('╔═══════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.yellow('║') + chalk.bold.yellow('                      SESSION RESTART REQUIRED                              ') + chalk.yellow('║'));
  console.log(chalk.yellow('╠═══════════════════════════════════════════════════════════════════════════╣'));
  console.log(`${chalk.yellow('║')  }                                                                           ${  chalk.yellow('║')}`);
  console.log(`${chalk.yellow('║')  }  The GitHub Epic system with tech stack enabled agents has been           ${  chalk.yellow('║')}`);
  console.log(`${chalk.yellow('║')  }  initialized but requires a session restart to activate the agent         ${  chalk.yellow('║')}`);
  console.log(`${chalk.yellow('║')  }  configurations.                                                          ${  chalk.yellow('║')}`);
  console.log(`${chalk.yellow('║')  }                                                                           ${  chalk.yellow('║')}`);
  console.log(chalk.yellow('║') + chalk.cyan('  Please:                                                                   ') + chalk.yellow('║'));
  console.log(chalk.yellow('║') + chalk.cyan('  1. Exit this Claude Code session                                         ') + chalk.yellow('║'));
  console.log(chalk.yellow('║') + chalk.cyan('  2. Restart Claude Code CLI                                               ') + chalk.yellow('║'));
  console.log(chalk.yellow('║') + chalk.cyan('  3. Run /github-epic-menu again                                           ') + chalk.yellow('║'));
  console.log(`${chalk.yellow('║')  }                                                                           ${  chalk.yellow('║')}`);
  console.log(chalk.yellow('║') + chalk.dim('  This ensures all agent configurations and hooks are properly loaded.     ') + chalk.yellow('║'));
  console.log(`${chalk.yellow('║')  }                                                                           ${  chalk.yellow('║')}`);
  console.log(chalk.yellow('╚═══════════════════════════════════════════════════════════════════════════╝'));
  console.log('');
}

export function displayDesktopTable(epics) {
  console.log(chalk.cyan('╔════════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold('                           GITHUB EPIC MANAGEMENT                               ') + chalk.cyan('║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════════════════════╝'));
  console.log('');

  if (epics.length === 0) {
    console.log(chalk.yellow('  No epics found. Create one with /create-github-epic'));
    console.log('');
    return;
  }

  console.log(chalk.dim('┌────┬─────────────────────────────┬────────┬──────────┬─────────┬──────────────────┐'));
  console.log(chalk.dim('│') + chalk.bold(' #  ') + chalk.dim('│') + chalk.bold(' Epic Name                   ') + chalk.dim('│') + chalk.bold(' Phases ') + chalk.dim('│') + chalk.bold(' Progress ') + chalk.dim('│') + chalk.bold(' GitHub  ') + chalk.dim('│') + chalk.bold(' Last Updated     ') + chalk.dim('│'));
  console.log(chalk.dim('├────┼─────────────────────────────┼────────┼──────────┼─────────┼──────────────────┤'));

  for (let i = 0; i < epics.length; i++) {
    const epic = epics[i];
    const num = String(i + 1).padStart(2);
    const name = (epic.title || epic.roadmap_name || 'Untitled').substring(0, 27).padEnd(27);
    const phases = String(epic.phases?.length || epic.total_projects || 0).padEnd(6);
    const pct = epic.metadata?.completion_percentage || epic.completion_percentage || 0;
    const progress = `${pct}%`.padEnd(8);
    const github = epic.metadata?.github_epic_number ? `#${epic.metadata.github_epic_number}`.padEnd(7) : '-'.padEnd(7);
    const updated = formatDate(epic.updated || epic.last_updated).padEnd(16);

    let progressColored = progress;
    if (pct === 100) progressColored = chalk.green(progress);
    else if (pct > 0) progressColored = chalk.yellow(progress);
    else progressColored = chalk.dim(progress);

    console.log(`${chalk.dim('│')  } ${num} ${  chalk.dim('│')  } ${name} ${  chalk.dim('│')  } ${phases} ${  chalk.dim('│')  } ${progressColored} ${  chalk.dim('│')  } ${github} ${  chalk.dim('│')  } ${updated} ${  chalk.dim('│')}`);
  }

  console.log(chalk.dim('└────┴─────────────────────────────┴────────┴──────────┴─────────┴──────────────────┘'));
  console.log('');
}

export function displayMobileList(epics) {
  console.log(chalk.cyan('+============================+'));
  console.log(chalk.cyan('|') + chalk.bold('      GITHUB EPICS         ') + chalk.cyan('|'));
  console.log(chalk.cyan('+============================+'));
  console.log('');

  if (epics.length === 0) {
    console.log(chalk.yellow('  No epics. [N]ew'));
    console.log('');
    return;
  }

  for (let i = 0; i < epics.length; i++) {
    const epic = epics[i];
    const name = (epic.title || epic.roadmap_name || 'Untitled').substring(0, 15);
    const pct = epic.metadata?.completion_percentage || epic.completion_percentage || 0;
    const github = epic.metadata?.github_epic_number ? `#${epic.metadata.github_epic_number}` : '-';

    let line = `[${i + 1}] ${name} (${pct}%) ${github}`;
    if (pct === 100) line = chalk.green(line);
    else if (pct > 0) line = chalk.yellow(line);

    console.log(line);
  }

  console.log('');
}

export function displayEpicDetails(epic, isMobile = false) {
  const title = epic.title || epic.roadmap_name || 'Untitled';
  const description = epic.description || epic.primary_goal || 'No description';
  const phases = epic.phases || [];
  const pct = epic.metadata?.completion_percentage || epic.completion_percentage || 0;
  const githubNum = epic.metadata?.github_epic_number;

  if (isMobile) {
    console.log(chalk.cyan(`Epic: ${title.substring(0, 25)}`));
    console.log(chalk.dim(`${pct}% | ${phases.length} phases | ${githubNum ? `#${  githubNum}` : 'No GH'}`));
    console.log('');

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const status = phase.status === 'completed' ? chalk.green('[C]')
        : phase.status === 'in_progress' ? chalk.yellow('[>]')
        : chalk.dim('[P]');
      console.log(`${status} ${i + 1}. ${(phase.phase_title || 'Phase').substring(0, 20)}`);
    }
  } else {
    console.log(chalk.cyan('╔════════════════════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold(`  EPIC: ${title.substring(0, 70).padEnd(70)}`) + chalk.cyan('║'));
    console.log(chalk.cyan('╠════════════════════════════════════════════════════════════════════════════════╣'));
    console.log(`${chalk.cyan('║')  }                                                                                ${  chalk.cyan('║')}`);
    console.log(chalk.cyan('║') + chalk.dim(`  ${description.substring(0, 74).padEnd(74)}`) + chalk.cyan('║'));
    console.log(`${chalk.cyan('║')  }                                                                                ${  chalk.cyan('║')}`);
    console.log(`${chalk.cyan('║')  }  Status: ${(epic.status || 'planning').padEnd(15)} | Progress: ${String(pct).padEnd(3)}% | GitHub: ${(githubNum ? `#${  githubNum}` : '-').padEnd(10)}${  chalk.cyan('║')}`);
    console.log(`${chalk.cyan('║')  }                                                                                ${  chalk.cyan('║')}`);
    console.log(chalk.cyan('╠════════════════════════════════════════════════════════════════════════════════╣'));
    console.log(chalk.cyan('║') + chalk.bold('  Phases:                                                                       ') + chalk.cyan('║'));

    console.log(chalk.cyan('║') + chalk.dim('  ┌───┬─────────────────────────────┬────────────┬────────────┬─────────────┐  ') + chalk.cyan('║'));
    console.log(chalk.cyan('║') + chalk.dim('  │') + chalk.bold(' # ') + chalk.dim('│') + chalk.bold(' Phase                       ') + chalk.dim('│') + chalk.bold(' Complexity ') + chalk.dim('│') + chalk.bold(' Status     ') + chalk.dim('│') + chalk.bold(' Dependencies ') + chalk.dim('│  ') + chalk.cyan('║'));
    console.log(chalk.cyan('║') + chalk.dim('  ├───┼─────────────────────────────┼────────────┼────────────┼─────────────┤  ') + chalk.cyan('║'));

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const num = String(i + 1).padStart(2);
      const name = (phase.phase_title || 'Phase').substring(0, 27).padEnd(27);
      const complexity = (phase.complexity || 'M').padEnd(10);
      const status = (phase.status || 'pending').substring(0, 10).padEnd(10);
      const deps = (phase.dependencies || []).join(',').substring(0, 11).padEnd(11) || '-'.padEnd(11);

      let statusColored = status;
      if (phase.status === 'completed') statusColored = chalk.green(status);
      else if (phase.status === 'in_progress') statusColored = chalk.yellow(status);

      console.log(`${chalk.cyan('║') + chalk.dim('  │')  } ${num}${  chalk.dim('│')  } ${name} ${  chalk.dim('│')  } ${complexity} ${  chalk.dim('│')  } ${statusColored} ${  chalk.dim('│')  } ${deps} ${  chalk.dim('│  ')  }${chalk.cyan('║')}`);
    }

    console.log(chalk.cyan('║') + chalk.dim('  └───┴─────────────────────────────┴────────────┴────────────┴─────────────┘  ') + chalk.cyan('║'));
    console.log(`${chalk.cyan('║')  }                                                                                ${  chalk.cyan('║')}`);
    console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════════════════════╝'));
  }

  console.log('');
}
