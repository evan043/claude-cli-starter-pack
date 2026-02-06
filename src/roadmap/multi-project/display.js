/**
 * Multi-Project Builder - Display & Editing
 *
 * Handles project table display and interactive editing.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';

/**
 * Display projects in a table
 * @param {Array} projects - Projects to display
 */
export function displayProjectTable(projects) {
  console.log(chalk.dim('┌────┬────────────────────────────────────┬────────────┬─────────────┬────────┐'));
  console.log(chalk.dim('│') + chalk.bold(' #  ') + chalk.dim('│') + chalk.bold(' Project                            ') + chalk.dim('│') + chalk.bold(' Domain     ') + chalk.dim('│') + chalk.bold(' Complexity  ') + chalk.dim('│') + chalk.bold(' Items  ') + chalk.dim('│'));
  console.log(chalk.dim('├────┼────────────────────────────────────┼────────────┼─────────────┼────────┤'));

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const num = String(i + 1).padStart(2);
    const title = (project.project_title || '').substring(0, 34).padEnd(34);
    const domain = (project.domain || 'general').padEnd(10);
    const complexity = (project.complexity || 'M').padEnd(11);
    const items = String(project.itemCount || 0).padEnd(6);

    console.log(chalk.dim('│') + ` ${num} ` + chalk.dim('│') + ` ${title} ` + chalk.dim('│') + ` ${domain} ` + chalk.dim('│') + ` ${complexity} ` + chalk.dim('│') + ` ${items} ` + chalk.dim('│'));
  }

  console.log(chalk.dim('└────┴────────────────────────────────────┴────────────┴─────────────┴────────┘'));
}

/**
 * Edit projects interactively
 * @param {Array} projects - Projects to edit
 * @returns {Array} Edited projects
 */
export async function editProjects(projects) {
  console.log('');
  console.log(chalk.dim('Edit projects (leave blank to keep current value):'));
  console.log('');

  const editedProjects = [];

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    console.log(chalk.cyan(`Project ${i + 1}: ${project.project_title}`));

    const { title, domain, complexity, action } = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Title:',
        default: project.project_title,
      },
      {
        type: 'list',
        name: 'domain',
        message: 'Domain:',
        choices: ['frontend', 'backend', 'database', 'testing', 'deployment', 'general'],
        default: project.domain || 'general',
      },
      {
        type: 'list',
        name: 'complexity',
        message: 'Complexity:',
        choices: ['S', 'M', 'L'],
        default: project.complexity || 'M',
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
      editedProjects.push({
        ...project,
        project_title: title,
        domain,
        complexity,
      });
    }
  }

  // Option to add new projects
  const { addNew } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addNew',
      message: 'Add a new project?',
      default: false,
    },
  ]);

  if (addNew) {
    const { title, domain, complexity, description } = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'New project title:',
        validate: v => v.length > 0 || 'Required',
      },
      {
        type: 'list',
        name: 'domain',
        message: 'Domain:',
        choices: ['frontend', 'backend', 'database', 'testing', 'deployment', 'general'],
      },
      {
        type: 'list',
        name: 'complexity',
        message: 'Complexity:',
        choices: ['S', 'M', 'L'],
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
        default: '',
      },
    ]);

    editedProjects.push({
      project_id: `project-${editedProjects.length + 1}`,
      project_title: title,
      domain,
      complexity,
      description,
      items: [],
      itemCount: 0,
      project_number: editedProjects.length + 1,
    });
  }

  return editedProjects;
}
