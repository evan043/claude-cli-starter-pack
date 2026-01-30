/**
 * Tech Stack Detection
 *
 * Auto-detects the project's technology stack by scanning:
 * - Package files (package.json, requirements.txt, Cargo.toml, etc.)
 * - Config files (vite.config.ts, next.config.js, etc.)
 * - Source directories and file patterns
 * - Git remote URLs
 * - Existing .claude configurations
 */

import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

/**
 * Detection patterns for various technologies
 */
const DETECTION_PATTERNS = {
  // Frontend frameworks
  frontend: {
    react: {
      packages: ['react', 'react-dom'],
      files: ['src/App.tsx', 'src/App.jsx', 'src/index.tsx'],
      configFiles: ['vite.config.ts', 'vite.config.js', 'craco.config.js'],
    },
    vue: {
      packages: ['vue'],
      files: ['src/App.vue', 'src/main.ts'],
      configFiles: ['vue.config.js', 'vite.config.ts'],
    },
    angular: {
      packages: ['@angular/core'],
      files: ['src/app/app.component.ts'],
      configFiles: ['angular.json'],
    },
    svelte: {
      packages: ['svelte'],
      files: ['src/App.svelte'],
      configFiles: ['svelte.config.js'],
    },
    nextjs: {
      packages: ['next'],
      configFiles: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    },
    nuxt: {
      packages: ['nuxt'],
      configFiles: ['nuxt.config.ts', 'nuxt.config.js'],
    },
    astro: {
      packages: ['astro'],
      configFiles: ['astro.config.mjs'],
    },
  },

  // Build tools
  buildTool: {
    vite: {
      packages: ['vite'],
      configFiles: ['vite.config.ts', 'vite.config.js'],
    },
    webpack: {
      packages: ['webpack'],
      configFiles: ['webpack.config.js', 'webpack.config.ts'],
    },
    esbuild: {
      packages: ['esbuild'],
    },
    parcel: {
      packages: ['parcel'],
    },
    turbopack: {
      packages: ['turbo'],
      configFiles: ['turbo.json'],
    },
  },

  // State managers
  stateManager: {
    zustand: { packages: ['zustand'] },
    redux: { packages: ['@reduxjs/toolkit', 'redux'] },
    mobx: { packages: ['mobx'] },
    jotai: { packages: ['jotai'] },
    recoil: { packages: ['recoil'] },
    pinia: { packages: ['pinia'] },
    vuex: { packages: ['vuex'] },
  },

  // Backend languages/frameworks
  backend: {
    fastapi: {
      pythonPackages: ['fastapi'],
      files: ['main.py', 'run_api.py', 'app/main.py'],
    },
    express: {
      packages: ['express'],
      files: ['server.js', 'app.js', 'index.js'],
    },
    nestjs: {
      packages: ['@nestjs/core'],
      files: ['src/main.ts'],
    },
    django: {
      pythonPackages: ['django'],
      files: ['manage.py'],
    },
    flask: {
      pythonPackages: ['flask'],
      files: ['app.py', 'wsgi.py'],
    },
    rails: {
      gemPackages: ['rails'],
      files: ['Gemfile', 'config/routes.rb'],
    },
    gin: {
      goPackages: ['github.com/gin-gonic/gin'],
    },
  },

  // Databases
  database: {
    postgresql: {
      envPatterns: ['DATABASE_URL.*postgres', 'POSTGRES_'],
      packages: ['pg', 'psycopg2', 'asyncpg'],
    },
    mysql: {
      envPatterns: ['DATABASE_URL.*mysql', 'MYSQL_'],
      packages: ['mysql2', 'mysqlclient'],
    },
    mongodb: {
      packages: ['mongodb', 'mongoose', 'pymongo'],
    },
    sqlite: {
      files: ['*.db', '*.sqlite', '*.sqlite3'],
    },
  },

  // ORMs
  orm: {
    prisma: {
      packages: ['prisma', '@prisma/client'],
      configFiles: ['prisma/schema.prisma'],
    },
    drizzle: {
      packages: ['drizzle-orm'],
    },
    typeorm: {
      packages: ['typeorm'],
    },
    sqlalchemy: {
      pythonPackages: ['sqlalchemy'],
    },
    sequelize: {
      packages: ['sequelize'],
    },
  },

  // Testing frameworks
  e2eFramework: {
    playwright: {
      packages: ['@playwright/test', 'playwright'],
      configFiles: ['playwright.config.ts', 'playwright.config.js'],
    },
    cypress: {
      packages: ['cypress'],
      configFiles: ['cypress.config.js', 'cypress.config.ts'],
    },
    puppeteer: {
      packages: ['puppeteer'],
    },
  },

  unitFramework: {
    vitest: {
      packages: ['vitest'],
      configFiles: ['vitest.config.ts'],
    },
    jest: {
      packages: ['jest'],
      configFiles: ['jest.config.js', 'jest.config.ts'],
    },
    mocha: {
      packages: ['mocha'],
    },
    pytest: {
      pythonPackages: ['pytest'],
      configFiles: ['pytest.ini', 'pyproject.toml'],
    },
  },

  // Deployment platforms (detected from config files)
  deployment: {
    vercel: {
      configFiles: ['vercel.json'],
    },
    netlify: {
      configFiles: ['netlify.toml'],
    },
    cloudflare: {
      configFiles: ['wrangler.toml', 'wrangler.json'],
    },
    railway: {
      configFiles: ['railway.json', 'railway.toml'],
    },
    docker: {
      configFiles: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
    },
  },

  // Tunnel services
  tunnel: {
    ngrok: {
      configFiles: ['ngrok.yml', 'ngrok.yaml'],
      processPatterns: ['ngrok'],
    },
    cloudflare: {
      configFiles: ['.cloudflared/'],
    },
  },
};

/**
 * Read and parse package.json
 */
function readPackageJson(projectRoot) {
  const pkgPath = join(projectRoot, 'package.json');
  if (!existsSync(pkgPath)) return null;

  try {
    return JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Read Python requirements
 */
function readPythonRequirements(projectRoot) {
  const files = ['requirements.txt', 'pyproject.toml', 'Pipfile'];
  const packages = [];

  for (const file of files) {
    const filePath = join(projectRoot, file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf8');
      // Extract package names (simplified)
      const matches = content.match(/^[a-zA-Z][a-zA-Z0-9_-]*/gm);
      if (matches) packages.push(...matches);
    }
  }

  return packages;
}

/**
 * Check if any files match patterns
 */
function fileExists(projectRoot, patterns) {
  if (!patterns) return false;

  for (const pattern of patterns) {
    const filePath = join(projectRoot, pattern);
    if (existsSync(filePath)) return true;
  }
  return false;
}

/**
 * Check if packages are installed
 */
function hasPackages(pkgJson, packages) {
  if (!pkgJson || !packages) return false;

  const allDeps = {
    ...(pkgJson.dependencies || {}),
    ...(pkgJson.devDependencies || {}),
  };

  return packages.some((pkg) => allDeps[pkg]);
}

/**
 * Detect port from various config files
 */
function detectPort(projectRoot, type) {
  // Check vite.config.ts/js
  const viteConfigs = ['vite.config.ts', 'vite.config.js'];
  for (const config of viteConfigs) {
    const configPath = join(projectRoot, config);
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf8');
      const portMatch = content.match(/port:\s*(\d+)/);
      if (portMatch) return parseInt(portMatch[1]);
    }
  }

  // Check package.json scripts
  const pkgJson = readPackageJson(projectRoot);
  if (pkgJson?.scripts?.dev) {
    const portMatch = pkgJson.scripts.dev.match(/--port[=\s]+(\d+)/);
    if (portMatch) return parseInt(portMatch[1]);
  }

  // Default ports
  return type === 'frontend' ? 5173 : 8000;
}

/**
 * Detect Git remote info
 */
function detectGitInfo(projectRoot) {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', {
      cwd: projectRoot,
      encoding: 'utf8',
    }).trim();

    // Parse GitHub URL
    const githubMatch = remoteUrl.match(
      /github\.com[:/]([^/]+)\/([^/.]+)/
    );
    if (githubMatch) {
      return {
        provider: 'github',
        owner: githubMatch[1],
        repo: githubMatch[2].replace('.git', ''),
      };
    }

    // Parse GitLab URL
    const gitlabMatch = remoteUrl.match(
      /gitlab\.com[:/]([^/]+)\/([^/.]+)/
    );
    if (gitlabMatch) {
      return {
        provider: 'gitlab',
        owner: gitlabMatch[1],
        repo: gitlabMatch[2].replace('.git', ''),
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect default branch
 */
function detectDefaultBranch(projectRoot) {
  try {
    // Try to get from git
    const branch = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    return branch.replace('refs/remotes/origin/', '');
  } catch {
    // Check if main or master exists
    try {
      execSync('git rev-parse --verify main', {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      return 'main';
    } catch {
      return 'master';
    }
  }
}

/**
 * Detect selectors from existing test files
 */
function detectSelectors(projectRoot) {
  const testDirs = ['tests', 'test', 'e2e', '__tests__', 'playwright'];
  const defaultSelectors = {
    strategy: 'data-testid',
    username: '[data-testid="username-input"]',
    password: '[data-testid="password-input"]',
    loginButton: '[data-testid="login-submit"]',
    loginSuccess: '[data-testid="dashboard"]',
  };

  // Scan for existing test files
  for (const dir of testDirs) {
    const testDir = join(projectRoot, dir);
    if (!existsSync(testDir)) continue;

    try {
      const files = readdirSync(testDir, { recursive: true });
      for (const file of files) {
        if (!file.toString().match(/\.(ts|js|spec|test)/)) continue;

        const filePath = join(testDir, file.toString());
        if (!statSync(filePath).isFile()) continue;

        const content = readFileSync(filePath, 'utf8');

        // Look for data-testid patterns
        const testIdMatch = content.match(
          /\[data-testid=["']([^"']+)["']\]/
        );
        if (testIdMatch) {
          defaultSelectors.strategy = 'data-testid';
          // Try to find specific patterns
          const usernameMatch = content.match(
            /\[data-testid=["']([^"']*(?:user|login|email)[^"']*)["']\]/i
          );
          const passwordMatch = content.match(
            /\[data-testid=["']([^"']*(?:pass|pwd)[^"']*)["']\]/i
          );
          const submitMatch = content.match(
            /\[data-testid=["']([^"']*(?:submit|login|signin)[^"']*)["']\]/i
          );

          if (usernameMatch) defaultSelectors.username = `[data-testid="${usernameMatch[1]}"]`;
          if (passwordMatch) defaultSelectors.password = `[data-testid="${passwordMatch[1]}"]`;
          if (submitMatch) defaultSelectors.loginButton = `[data-testid="${submitMatch[1]}"]`;

          return defaultSelectors;
        }

        // Look for name attribute patterns
        const nameMatch = content.match(/name=["'](\w+)["']/);
        if (nameMatch) {
          defaultSelectors.strategy = 'name';
        }
      }
    } catch {
      // Continue if directory scan fails
    }
  }

  return defaultSelectors;
}

/**
 * Detect existing ngrok or tunnel configuration
 */
function detectTunnelConfig(projectRoot) {
  // Check for ngrok.yml
  const ngrokConfig = join(projectRoot, 'ngrok.yml');
  if (existsSync(ngrokConfig)) {
    const content = readFileSync(ngrokConfig, 'utf8');
    const subdomainMatch = content.match(/subdomain:\s*(\S+)/);
    return {
      service: 'ngrok',
      subdomain: subdomainMatch?.[1] || null,
      startCommand: 'ngrok http {{FRONTEND_PORT}}',
      adminPort: 4040,
    };
  }

  // Check for localtunnel in package.json
  const pkgJson = readPackageJson(projectRoot);
  if (pkgJson?.devDependencies?.localtunnel) {
    return {
      service: 'localtunnel',
      startCommand: 'lt --port {{FRONTEND_PORT}}',
    };
  }

  return {
    service: 'none',
    url: null,
    subdomain: null,
  };
}

/**
 * Main detection function
 */
export async function detectTechStack(projectRoot, options = {}) {
  const spinner = options.silent ? null : ora('Detecting tech stack...').start();
  const result = {
    version: '1.0.0',
    project: {
      name: basename(projectRoot),
      rootPath: '.',
    },
    frontend: {},
    backend: {},
    database: {},
    deployment: { frontend: {}, backend: {} },
    devEnvironment: {},
    testing: { e2e: {}, unit: {}, selectors: {}, credentials: {} },
    versionControl: {},
    urls: { local: {}, tunnel: {}, production: {} },
    _detected: [], // Track what was auto-detected
  };

  // Read package.json
  const pkgJson = readPackageJson(projectRoot);
  const pythonPackages = readPythonRequirements(projectRoot);

  // --- FRONTEND DETECTION ---
  if (spinner) spinner.text = 'Detecting frontend framework...';

  for (const [framework, patterns] of Object.entries(DETECTION_PATTERNS.frontend)) {
    if (
      hasPackages(pkgJson, patterns.packages) ||
      fileExists(projectRoot, patterns.files) ||
      fileExists(projectRoot, patterns.configFiles)
    ) {
      result.frontend.framework = framework;
      result._detected.push(`frontend.framework: ${framework}`);
      break;
    }
  }

  // Detect build tool
  for (const [tool, patterns] of Object.entries(DETECTION_PATTERNS.buildTool)) {
    if (
      hasPackages(pkgJson, patterns.packages) ||
      fileExists(projectRoot, patterns.configFiles)
    ) {
      result.frontend.buildTool = tool;
      result._detected.push(`frontend.buildTool: ${tool}`);
      break;
    }
  }

  // Detect state manager
  for (const [manager, patterns] of Object.entries(DETECTION_PATTERNS.stateManager)) {
    if (hasPackages(pkgJson, patterns.packages)) {
      result.frontend.stateManager = manager;
      result._detected.push(`frontend.stateManager: ${manager}`);
      break;
    }
  }

  // Detect frontend port
  result.frontend.port = detectPort(projectRoot, 'frontend');
  result._detected.push(`frontend.port: ${result.frontend.port}`);

  // Detect styling
  if (hasPackages(pkgJson, ['tailwindcss'])) {
    result.frontend.styling = 'tailwind';
  } else if (hasPackages(pkgJson, ['styled-components'])) {
    result.frontend.styling = 'styled-components';
  } else if (hasPackages(pkgJson, ['@emotion/react'])) {
    result.frontend.styling = 'emotion';
  }

  // --- BACKEND DETECTION ---
  if (spinner) spinner.text = 'Detecting backend framework...';

  for (const [framework, patterns] of Object.entries(DETECTION_PATTERNS.backend)) {
    const hasPkg = hasPackages(pkgJson, patterns.packages);
    const hasPyPkg = patterns.pythonPackages?.some((p) =>
      pythonPackages.includes(p)
    );
    const hasFiles = fileExists(projectRoot, patterns.files);

    if (hasPkg || hasPyPkg || hasFiles) {
      result.backend.framework = framework;
      result._detected.push(`backend.framework: ${framework}`);

      // Set language based on framework
      if (['fastapi', 'django', 'flask'].includes(framework)) {
        result.backend.language = 'python';
      } else if (['express', 'nestjs'].includes(framework)) {
        result.backend.language = 'node';
      } else if (framework === 'rails') {
        result.backend.language = 'ruby';
      } else if (framework === 'gin') {
        result.backend.language = 'go';
      }
      break;
    }
  }

  result.backend.port = detectPort(projectRoot, 'backend');
  result.backend.healthEndpoint = '/api/health';

  // --- DATABASE DETECTION ---
  if (spinner) spinner.text = 'Detecting database...';

  for (const [db, patterns] of Object.entries(DETECTION_PATTERNS.database)) {
    if (hasPackages(pkgJson, patterns.packages)) {
      result.database.primary = db;
      result._detected.push(`database.primary: ${db}`);
      break;
    }
  }

  // Detect ORM
  for (const [orm, patterns] of Object.entries(DETECTION_PATTERNS.orm)) {
    if (
      hasPackages(pkgJson, patterns.packages) ||
      fileExists(projectRoot, patterns.configFiles)
    ) {
      result.database.orm = orm;
      result._detected.push(`database.orm: ${orm}`);
      break;
    }
  }

  // --- TESTING DETECTION ---
  if (spinner) spinner.text = 'Detecting testing frameworks...';

  for (const [framework, patterns] of Object.entries(DETECTION_PATTERNS.e2eFramework)) {
    if (
      hasPackages(pkgJson, patterns.packages) ||
      fileExists(projectRoot, patterns.configFiles)
    ) {
      result.testing.e2e.framework = framework;
      result._detected.push(`testing.e2e.framework: ${framework}`);

      // Set config file
      if (patterns.configFiles) {
        for (const cfg of patterns.configFiles) {
          if (existsSync(join(projectRoot, cfg))) {
            result.testing.e2e.configFile = cfg;
            break;
          }
        }
      }
      break;
    }
  }

  for (const [framework, patterns] of Object.entries(DETECTION_PATTERNS.unitFramework)) {
    if (
      hasPackages(pkgJson, patterns.packages) ||
      fileExists(projectRoot, patterns.configFiles)
    ) {
      result.testing.unit.framework = framework;
      result._detected.push(`testing.unit.framework: ${framework}`);
      break;
    }
  }

  // Detect selectors
  result.testing.selectors = detectSelectors(projectRoot);

  // --- DEPLOYMENT DETECTION ---
  if (spinner) spinner.text = 'Detecting deployment platforms...';

  for (const [platform, patterns] of Object.entries(DETECTION_PATTERNS.deployment)) {
    if (fileExists(projectRoot, patterns.configFiles)) {
      // Determine if frontend or backend
      if (['vercel', 'netlify', 'cloudflare'].includes(platform)) {
        result.deployment.frontend.platform = platform;
        result._detected.push(`deployment.frontend.platform: ${platform}`);
      } else if (platform === 'railway') {
        result.deployment.backend.platform = platform;
        result._detected.push(`deployment.backend.platform: ${platform}`);
      }
    }
  }

  // --- DEV ENVIRONMENT ---
  if (spinner) spinner.text = 'Detecting dev environment...';

  // Detect package manager
  if (existsSync(join(projectRoot, 'pnpm-lock.yaml'))) {
    result.devEnvironment.packageManager = 'pnpm';
  } else if (existsSync(join(projectRoot, 'yarn.lock'))) {
    result.devEnvironment.packageManager = 'yarn';
  } else if (existsSync(join(projectRoot, 'bun.lockb'))) {
    result.devEnvironment.packageManager = 'bun';
  } else if (existsSync(join(projectRoot, 'package-lock.json'))) {
    result.devEnvironment.packageManager = 'npm';
  } else if (existsSync(join(projectRoot, 'requirements.txt'))) {
    result.devEnvironment.packageManager = 'pip';
  } else if (existsSync(join(projectRoot, 'poetry.lock'))) {
    result.devEnvironment.packageManager = 'poetry';
  }

  // Detect tunnel
  result.devEnvironment.tunnel = detectTunnelConfig(projectRoot);

  // Detect container
  if (fileExists(projectRoot, ['Dockerfile', 'docker-compose.yml'])) {
    result.devEnvironment.container = 'docker';
  }

  // --- VERSION CONTROL ---
  if (spinner) spinner.text = 'Detecting version control...';

  const gitInfo = detectGitInfo(projectRoot);
  if (gitInfo) {
    result.versionControl = {
      ...gitInfo,
      defaultBranch: detectDefaultBranch(projectRoot),
      projectBoard: { type: 'none' },
    };
    result._detected.push(`versionControl: ${gitInfo.provider}/${gitInfo.owner}/${gitInfo.repo}`);
  }

  // --- BUILD URLs ---
  result.urls.local = {
    frontend: `http://localhost:${result.frontend.port || 5173}`,
    backend: `http://localhost:${result.backend.port || 8000}`,
    api: `http://localhost:${result.backend.port || 8000}/api`,
  };

  if (spinner) spinner.succeed('Tech stack detection complete');

  return result;
}

/**
 * Run detection and output results
 */
export async function runDetection(options = {}) {
  const projectRoot = options.projectRoot || process.cwd();

  console.log(chalk.cyan('\n📦 Tech Stack Detection\n'));
  console.log(chalk.dim(`Project: ${projectRoot}\n`));

  const result = await detectTechStack(projectRoot, options);

  // Display results
  console.log(chalk.green('\n✓ Detected Technologies:\n'));

  if (result.frontend.framework) {
    console.log(chalk.white(`  Frontend: ${chalk.cyan(result.frontend.framework)}`));
    if (result.frontend.buildTool) {
      console.log(chalk.dim(`    Build: ${result.frontend.buildTool}`));
    }
    if (result.frontend.stateManager) {
      console.log(chalk.dim(`    State: ${result.frontend.stateManager}`));
    }
    console.log(chalk.dim(`    Port: ${result.frontend.port}`));
  }

  if (result.backend.framework) {
    console.log(chalk.white(`  Backend: ${chalk.cyan(result.backend.framework)} (${result.backend.language})`));
    console.log(chalk.dim(`    Port: ${result.backend.port}`));
  }

  if (result.database.primary) {
    console.log(chalk.white(`  Database: ${chalk.cyan(result.database.primary)}`));
    if (result.database.orm) {
      console.log(chalk.dim(`    ORM: ${result.database.orm}`));
    }
  }

  if (result.testing.e2e.framework) {
    console.log(chalk.white(`  E2E Tests: ${chalk.cyan(result.testing.e2e.framework)}`));
  }

  if (result.testing.unit.framework) {
    console.log(chalk.white(`  Unit Tests: ${chalk.cyan(result.testing.unit.framework)}`));
  }

  if (result.versionControl.provider) {
    console.log(chalk.white(`  Git: ${chalk.cyan(`${result.versionControl.owner}/${result.versionControl.repo}`)}`));
  }

  if (result.devEnvironment.packageManager) {
    console.log(chalk.white(`  Package Manager: ${chalk.cyan(result.devEnvironment.packageManager)}`));
  }

  console.log('');

  return result;
}

export default { detectTechStack, runDetection };
