/**
 * Feature Selection
 * Handles interactive feature selection and npm package installation
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

/**
 * Select features to enable
 * @param {Array} OPTIONAL_FEATURES - Available features
 * @param {Object} options - Command options
 * @param {Function} getDefaultFeatures - Function to get defaults
 * @returns {Promise<Object>} Selected features and metadata
 */
export async function selectFeatures(OPTIONAL_FEATURES, options, getDefaultFeatures) {
  let selectedFeatures;

  if (options.skipPrompts) {
    // Use features passed from wizard, or default features in CI mode
    selectedFeatures = options.features || getDefaultFeatures().map(f => f.name);
    console.log(chalk.bold('Step 4: Using pre-selected features\n'));
    if (selectedFeatures.length > 0) {
      console.log(chalk.dim(`  Features: ${selectedFeatures.join(', ')}`));
    } else {
      console.log(chalk.dim('  Minimal mode - essential commands only'));
    }
    console.log('');
  } else {
    console.log(chalk.bold('Step 4: Select optional features\n'));
    console.log(chalk.dim('  Each feature adds commands and hooks to your project.'));
    console.log(chalk.dim('  Features marked with (*) require additional configuration via /menu after installation.\n'));

    // Display feature descriptions
    displayFeatureDescriptions(OPTIONAL_FEATURES);

    const result = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedFeatures',
        message: 'Select features to enable:',
        choices: OPTIONAL_FEATURES.map((feature) => ({
          name: `${feature.label}${feature.requiresPostConfig ? ' (*)' : ''} - ${feature.commands.length} commands, ${feature.hooks.length} hooks`,
          value: feature.name,
          checked: feature.default,
        })),
        pageSize: 10,
      },
    ]);
    selectedFeatures = result.selectedFeatures;
  }

  // Store selected features for later use
  const enabledFeatures = OPTIONAL_FEATURES.filter((f) => selectedFeatures.includes(f.name));
  const featuresRequiringConfig = enabledFeatures.filter((f) => f.requiresPostConfig);

  // Collect feature-specific assets
  const { featureCommands, featureHooks, featureSkills, featureBinaries } = collectFeatureAssets(enabledFeatures);

  // Display what will be added
  displayFeatureAssets(featureCommands, featureHooks, featureSkills, featuresRequiringConfig);

  // Handle npm package installs
  await handleNpmPackages(enabledFeatures, options);

  console.log('');

  return {
    selectedFeatures,
    enabledFeatures,
    featuresRequiringConfig,
    featureCommands,
    featureHooks,
    featureSkills,
    featureBinaries,
  };
}

/**
 * Display feature descriptions
 */
function displayFeatureDescriptions(OPTIONAL_FEATURES) {
  for (const feature of OPTIONAL_FEATURES) {
    const marker = feature.default ? chalk.green('●') : chalk.dim('○');
    const postConfig = feature.requiresPostConfig ? chalk.yellow(' (*)') : '';
    console.log(`  ${marker} ${chalk.bold(feature.label)}${postConfig}`);
    console.log(chalk.dim(`     ${feature.description}`));
    if (feature.commands.length > 0) {
      console.log(chalk.dim(`     Adds: ${feature.commands.map(c => `/${  c}`).join(', ')}`));
    }
    console.log('');
  }
}

/**
 * Collect assets from enabled features
 */
function collectFeatureAssets(enabledFeatures) {
  const featureCommands = [];
  const featureHooks = [];
  const featureSkills = [];
  const featureBinaries = [];

  for (const feature of enabledFeatures) {
    featureCommands.push(...feature.commands);
    featureHooks.push(...(feature.hooks || []));
    featureSkills.push(...(feature.skills || []));
    featureBinaries.push(...(feature.binaries || []));
  }

  return { featureCommands, featureHooks, featureSkills, featureBinaries };
}

/**
 * Display what feature assets will be added
 */
function displayFeatureAssets(featureCommands, featureHooks, featureSkills, featuresRequiringConfig) {
  if (featureCommands.length > 0) {
    console.log('');
    console.log(chalk.green(`  ✓ Selected features will add ${featureCommands.length} command(s):`));
    console.log(chalk.dim(`    ${featureCommands.map(c => `/${  c}`).join(', ')}`));
  }

  if (featureHooks.length > 0) {
    console.log(chalk.green(`  ✓ Selected features will add ${featureHooks.length} hook(s):`));
    console.log(chalk.dim(`    ${featureHooks.join(', ')}`));
  }

  if (featureSkills.length > 0) {
    console.log(chalk.green(`  ✓ Selected features will add ${featureSkills.length} skill(s):`));
    console.log(chalk.dim(`    ${featureSkills.join(', ')}`));
  }

  if (featuresRequiringConfig.length > 0) {
    console.log('');
    console.log(chalk.yellow('  ℹ The following features require configuration after installation:'));
    for (const feature of featuresRequiringConfig) {
      console.log(chalk.yellow(`    • ${feature.label}`));
    }
    console.log(chalk.dim('    Run /menu → Project Settings after installation to complete setup.'));
  }
}

/**
 * Handle npm package installations for features
 */
async function handleNpmPackages(enabledFeatures, options) {
  const featuresWithNpm = enabledFeatures.filter((f) => f.npmPackage);

  if (featuresWithNpm.length === 0) {
    return;
  }

  if (!options.skipPrompts) {
    console.log('');
    console.log(chalk.bold('  Optional Package Installation\n'));

    for (const feature of featuresWithNpm) {
      const { installPackage } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'installPackage',
          message: feature.npmInstallPrompt || `Install ${feature.npmPackage} globally?`,
          default: true,
        },
      ]);

      if (installPackage) {
        const npmSpinner = ora(`Installing ${feature.npmPackage}...`).start();
        try {
          const { execSync } = await import('child_process');
          execSync(`npm install -g ${feature.npmPackage}`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 120000, // 2 minutes timeout
          });
          npmSpinner.succeed(`Installed ${feature.npmPackage} globally`);
        } catch (error) {
          npmSpinner.fail(`Failed to install ${feature.npmPackage}`);
          console.log(chalk.dim(`    Run manually: npm install -g ${feature.npmPackage}`));
        }
      } else {
        console.log(chalk.dim(`  Skipped. Install later with: npm install -g ${feature.npmPackage}`));
      }
    }
  } else {
    // In skipPrompts mode, just inform about optional packages
    console.log(chalk.dim(`  ℹ Optional packages available: ${featuresWithNpm.map(f => f.npmPackage).join(', ')}`));
    console.log(chalk.dim('    Install manually if needed.'));
  }

  // Handle local dev dependency packages (npmDevPackages)
  const featuresWithDevDeps = enabledFeatures.filter((f) => f.npmDevPackages?.length);

  if (featuresWithDevDeps.length === 0) {
    return;
  }

  if (!options.skipPrompts) {
    console.log('');
    console.log(chalk.bold('  Optional Dev Dependencies\n'));

    for (const feature of featuresWithDevDeps) {
      const packages = feature.npmDevPackages.join(', ');
      const { installDevPackages } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'installDevPackages',
          message: feature.npmDevInstallPrompt || `Install dev deps for ${feature.label}? (${packages})`,
          default: false,
        },
      ]);

      if (installDevPackages) {
        const npmSpinner = ora(`Installing ${packages} as dev dependencies...`).start();
        try {
          const { execSync } = await import('child_process');
          execSync(`npm install -D ${feature.npmDevPackages.join(' ')}`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 300000, // 5 minutes timeout (lighthouse is large)
          });
          npmSpinner.succeed(`Installed dev deps: ${packages}`);
        } catch (error) {
          npmSpinner.fail(`Failed to install dev deps: ${packages}`);
          console.log(chalk.dim(`    Run manually: npm install -D ${feature.npmDevPackages.join(' ')}`));
        }
      } else {
        console.log(chalk.dim(`  Skipped. Install later with: npm install -D ${feature.npmDevPackages.join(' ')}`));
      }
    }
  } else {
    // In skipPrompts mode, just inform about available dev packages
    const allDevPkgs = featuresWithDevDeps.flatMap(f => f.npmDevPackages);
    console.log(chalk.dim(`  ℹ Optional dev packages available: ${allDevPkgs.join(', ')}`));
    console.log(chalk.dim('    Install manually with: npm install -D <package>'));
  }
}
