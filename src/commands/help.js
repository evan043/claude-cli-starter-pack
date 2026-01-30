/**
 * Help Command
 *
 * Show detailed help and examples
 */

import chalk from 'chalk';

/**
 * Show help with examples
 */
export function showHelp() {
  const help = `
${chalk.cyan.bold('GitHub Task Kit')}
${chalk.dim('Comprehensive GitHub Issue Creator with Codebase Analysis')}

${chalk.yellow('USAGE')}

  ${chalk.bold('gtask')}                    Interactive menu
  ${chalk.bold('gtask create')}             Create a new task/issue
  ${chalk.bold('gtask setup')}              Configure GitHub project connection
  ${chalk.bold('gtask list')}               List recent tasks
  ${chalk.bold('gtask install')}            Install Claude Code integration

${chalk.yellow('CREATE OPTIONS')}

  ${chalk.bold('-t, --title <title>')}      Issue title
  ${chalk.bold('-d, --description <desc>')} Issue description
  ${chalk.bold('-p, --priority <P0-P3>')}   Priority level
  ${chalk.bold('-l, --labels <labels>')}    Comma-separated labels
  ${chalk.bold('--qa')}                     Requires QA validation
  ${chalk.bold('--no-qa')}                  Skip QA validation
  ${chalk.bold('--batch')}                  Non-interactive mode
  ${chalk.bold('--skip-analysis')}          Skip codebase analysis

${chalk.yellow('SETUP OPTIONS')}

  ${chalk.bold('-o, --owner <owner>')}      GitHub username or organization
  ${chalk.bold('-r, --repo <repo>')}        Repository name
  ${chalk.bold('-p, --project <number>')}   Project board number
  ${chalk.bold('--global')}                 Save config globally (~/.gtaskrc)

${chalk.yellow('LIST OPTIONS')}

  ${chalk.bold('-n, --limit <number>')}     Number of issues to show (default: 10)
  ${chalk.bold('--mine')}                   Only show issues assigned to me
  ${chalk.bold('--status <status>')}        Filter by status (open, closed, all)

${chalk.yellow('EXAMPLES')}

  ${chalk.dim('# Interactive task creation')}
  ${chalk.bold('gtask create')}

  ${chalk.dim('# Quick task with flags')}
  ${chalk.bold('gtask create -t "Fix login bug" -p P1 -l "bug,frontend"')}

  ${chalk.dim('# Batch mode for automation')}
  ${chalk.bold('gtask create --batch -t "Add dark mode" -d "Implement dark mode toggle" -l "feature,frontend" -p P2')}

  ${chalk.dim('# Setup for a new project')}
  ${chalk.bold('gtask setup -o myuser -r myrepo -p 1')}

  ${chalk.dim('# List my open issues')}
  ${chalk.bold('gtask list --mine')}

  ${chalk.dim('# Install Claude Code command')}
  ${chalk.bold('gtask install')}

${chalk.yellow('CONFIGURATION')}

  Configuration is stored in ${chalk.bold('.gtaskrc')} (YAML format).

  Searched locations (in order):
    1. ${chalk.dim('./.gtaskrc')}           (current directory)
    2. ${chalk.dim('~/.gtaskrc')}           (home directory)

  Example .gtaskrc:
  ${chalk.dim(`
  project_board:
    owner: "myuser"
    repo: "myrepo"
    project_number: 1
    project_id: "PVT_xxx"

  field_ids:
    status: "PVTSSF_xxx"
    priority: "PVTSSF_xxx"

  status_options:
    todo: "abc123"
    in_progress: "def456"
    done: "ghi789"
  `)}

${chalk.yellow('PREREQUISITES')}

  ${chalk.bold('gh')}   GitHub CLI (https://cli.github.com/)
  ${chalk.bold('jq')}   JSON processor

  Run ${chalk.bold('gh auth login')} to authenticate with GitHub.

${chalk.yellow('CLAUDE CODE INTEGRATION')}

  Run ${chalk.bold('gtask install')} to add the command to your Claude Code project.

  This creates ${chalk.dim('.claude/commands/github-create-task.md')} which provides:
  - Interactive issue creation within Claude Code
  - Automatic codebase analysis
  - Project board integration

${chalk.yellow('CODEBASE ANALYSIS')}

  When creating a task, GitHub Task Kit can analyze your codebase to:
  - Find relevant files matching the issue keywords
  - Identify key functions and components
  - Extract code snippets for context
  - Suggest patterns to follow

  Skip with ${chalk.bold('--skip-analysis')} if not needed.

${chalk.yellow('MORE INFO')}

  GitHub: ${chalk.blue('https://github.com/yourname/github-task-kit')}
  Issues: ${chalk.blue('https://github.com/yourname/github-task-kit/issues')}
`;

  console.log(help);
}
