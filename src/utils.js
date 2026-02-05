/**
 * Utility functions for GitHub Task Kit
 */

import { execSync, exec } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { CcaspConfigError } from './utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get package version
 */
export function getVersion() {
  try {
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.version;
  } catch {
    return '1.0.0';
  }
}

/**
 * Check if a command exists
 * @param {string} cmd - Command name (must be alphanumeric + dash/underscore only)
 * @returns {boolean} True if command exists
 */
export function commandExists(cmd) {
  // Validate command name to prevent injection
  if (!/^[a-zA-Z0-9_-]+$/.test(cmd)) {
    return false;
  }

  try {
    execSync(`${process.platform === 'win32' ? 'where' : 'which'} ${cmd}`, {
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute a shell command and return output
 */
export function execCommand(cmd, options = {}) {
  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      ...options,
    });
    return { success: true, output: result.trim() };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || '',
    };
  }
}

/**
 * Execute command with promise
 */
export function execAsync(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(
      cmd,
      {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        ...options,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject({ error, stdout, stderr });
        } else {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        }
      }
    );
  });
}

/**
 * Check all prerequisites before running
 */
export async function checkPrerequisites() {
  const spinner = ora('Checking prerequisites...').start();
  const issues = [];

  // Check gh CLI
  if (!commandExists('gh')) {
    issues.push({
      name: 'GitHub CLI (gh)',
      message: 'Install from https://cli.github.com/',
      fatal: true,
    });
  } else {
    // Check gh version
    const { output } = execCommand('gh --version');
    const versionMatch = output.match(/gh version ([\d.]+)/);
    if (versionMatch) {
      const version = versionMatch[1];
      const [major, minor] = version.split('.').map(Number);
      if (major < 2 || (major === 2 && minor < 40)) {
        issues.push({
          name: 'GitHub CLI version',
          message: `Current: ${version}, Required: 2.40+. Run: gh upgrade`,
          fatal: false,
        });
      }
    }
  }

  // Check jq
  if (!commandExists('jq')) {
    issues.push({
      name: 'jq (JSON processor)',
      message:
        'Install: brew install jq (macOS) | apt install jq (Linux) | scoop install jq (Windows)',
      fatal: true,
    });
  }

  // Check gh auth
  if (commandExists('gh')) {
    const authResult = execCommand('gh auth status');
    if (!authResult.success) {
      issues.push({
        name: 'GitHub authentication',
        message: 'Run: gh auth login',
        fatal: true,
      });
    }
  }

  if (issues.length > 0) {
    spinner.fail('Prerequisites check failed');
    console.log('');

    for (const issue of issues) {
      const icon = issue.fatal ? chalk.red('✗') : chalk.yellow('⚠');
      console.log(`  ${icon} ${chalk.bold(issue.name)}`);
      console.log(`    ${chalk.dim(issue.message)}`);
    }

    const hasFatal = issues.some((i) => i.fatal);
    if (hasFatal) {
      console.log('');
      console.log(
        chalk.red('Please fix the issues above before continuing.')
      );
      throw new CcaspConfigError('Prerequisites check failed', {
        context: { issues: issues.filter((i) => i.fatal) }
      });
    }

    console.log('');
  } else {
    spinner.succeed('Prerequisites check passed');
  }
}

/**
 * Load configuration from file (async)
 */
export async function loadConfig() {
  const yaml = await import('yaml');
  const configPaths = [
    join(process.cwd(), '.gtaskrc'),
    join(process.cwd(), '.gtaskrc.yaml'),
    join(process.cwd(), '.gtaskrc.json'),
    join(process.env.HOME || process.env.USERPROFILE || '', '.gtaskrc'),
    join(process.env.HOME || process.env.USERPROFILE || '', '.gtaskrc.yaml'),
    join(process.env.HOME || process.env.USERPROFILE || '', '.gtaskrc.json'),
  ];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf8');
        if (configPath.endsWith('.json')) {
          return { config: JSON.parse(content), path: configPath };
        } else {
          // YAML parsing
          return { config: yaml.parse(content), path: configPath };
        }
      } catch (error) {
        console.warn(
          chalk.yellow(`Warning: Could not parse config at ${configPath}`)
        );
      }
    }
  }

  return { config: null, path: null };
}

/**
 * Load config synchronously (for initial checks)
 */
export function loadConfigSync() {
  const configPaths = [
    join(process.cwd(), '.gtaskrc'),
    join(process.cwd(), '.gtaskrc.yaml'),
    join(process.cwd(), '.gtaskrc.json'),
    join(process.env.HOME || process.env.USERPROFILE || '', '.gtaskrc'),
    join(process.env.HOME || process.env.USERPROFILE || '', '.gtaskrc.yaml'),
    join(process.env.HOME || process.env.USERPROFILE || '', '.gtaskrc.json'),
  ];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf8');
        if (configPath.endsWith('.json')) {
          return { config: JSON.parse(content), path: configPath };
        } else {
          // Simple YAML-like parsing for basic configs
          const config = {};
          let currentSection = config;
          const lines = content.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const indent = line.length - line.trimStart().length;
            const match = trimmed.match(/^([^:]+):\s*(.*)$/);

            if (match) {
              const [, key, value] = match;
              if (value) {
                currentSection[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
              } else {
                currentSection[key.trim()] = {};
                currentSection = currentSection[key.trim()];
              }
            }
          }

          return { config, path: configPath };
        }
      } catch (error) {
        // Skip invalid configs
      }
    }
  }

  return { config: null, path: null };
}

/**
 * Check if config exists and is valid
 */
export function hasValidConfig() {
  const { config } = loadConfigSync();
  return config && config.project_board && config.project_board.owner;
}

/**
 * Format a box around text
 */
export function box(text, options = {}) {
  const { padding = 1, borderColor = 'cyan' } = options;
  const lines = text.split('\n');
  const maxWidth = Math.max(...lines.map((l) => l.length));
  const paddedWidth = maxWidth + padding * 2;

  const top = '╔' + '═'.repeat(paddedWidth) + '╗';
  const bottom = '╚' + '═'.repeat(paddedWidth) + '╝';
  const empty = '║' + ' '.repeat(paddedWidth) + '║';

  const content = lines.map((line) => {
    const padded = line.padEnd(maxWidth);
    return '║' + ' '.repeat(padding) + padded + ' '.repeat(padding) + '║';
  });

  const result = [
    top,
    ...Array(padding).fill(empty),
    ...content,
    ...Array(padding).fill(empty),
    bottom,
  ].join('\n');

  return chalk[borderColor](result);
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Get current working directory name
 */
export function getCurrentProjectName() {
  return process.cwd().split(/[/\\]/).pop();
}

/**
 * Get the path to tech-stack.json
 */
export function getTechStackPath() {
  const paths = [
    join(process.cwd(), '.claude', 'config', 'tech-stack.json'),
    join(process.cwd(), '.claude', 'tech-stack.json'),
  ];

  for (const p of paths) {
    if (existsSync(p)) {
      return p;
    }
  }

  // Return default path (even if it doesn't exist yet)
  return paths[0];
}

/**
 * Load tech-stack.json configuration
 * @returns {object} Tech stack configuration or default empty object
 */
export function loadTechStack() {
  const techStackPath = getTechStackPath();

  if (existsSync(techStackPath)) {
    try {
      const content = readFileSync(techStackPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not parse tech-stack.json: ${error.message}`));
      return getDefaultTechStack();
    }
  }

  return getDefaultTechStack();
}

/**
 * Save tech-stack.json configuration
 * @param {object} techStack - Tech stack configuration to save
 */
export function saveTechStack(techStack) {
  const techStackPath = getTechStackPath();
  const configDir = dirname(techStackPath);

  // Ensure directory exists
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Update version timestamp
  techStack._lastModified = new Date().toISOString();

  writeFileSync(techStackPath, JSON.stringify(techStack, null, 2), 'utf8');
}

/**
 * Get default tech stack configuration
 */
export function getDefaultTechStack() {
  return {
    version: '2.0.0',
    project: {
      name: getCurrentProjectName(),
      description: '',
      rootPath: '.',
    },
    frontend: {},
    backend: {},
    database: {},
    deployment: {
      frontend: { platform: 'none' },
      backend: { platform: 'none' },
    },
    devEnvironment: {
      tunnel: { service: 'none' },
    },
    testing: {},
    versionControl: {
      provider: 'github',
      projectBoard: { type: 'none' },
    },
    tokenManagement: { enabled: false },
    happyMode: { enabled: false },
    agents: { enabled: true },
    phasedDevelopment: { enabled: true },
    hooks: { enabled: true },
    _pendingConfiguration: [],
  };
}
