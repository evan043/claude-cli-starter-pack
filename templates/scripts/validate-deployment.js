#!/usr/bin/env node
/**
 * Validate Deployment Environment
 *
 * Pre-deployment validation for Railway, Cloudflare, Vercel, and other platforms.
 * Checks environment variables, build artifacts, and configuration.
 *
 * Usage:
 *   node validate-deployment.js --platform railway
 *   node validate-deployment.js --platform cloudflare --project-name my-project
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const PLATFORMS = {
  railway: {
    requiredEnv: ['RAILWAY_API_TOKEN'],
    optionalEnv: ['RAILWAY_PROJECT_ID', 'RAILWAY_ENVIRONMENT_ID', 'RAILWAY_SERVICE_ID'],
    buildArtifacts: ['package.json', 'Dockerfile', 'requirements.txt', 'go.mod'],
    configFiles: ['railway.json', 'railway.toml'],
  },
  cloudflare: {
    requiredEnv: ['CLOUDFLARE_API_TOKEN'],
    optionalEnv: ['CLOUDFLARE_ACCOUNT_ID'],
    buildArtifacts: ['dist/', 'build/', 'public/', '.next/'],
    configFiles: ['wrangler.toml', 'wrangler.json'],
  },
  vercel: {
    requiredEnv: ['VERCEL_TOKEN'],
    optionalEnv: ['VERCEL_PROJECT_ID', 'VERCEL_ORG_ID'],
    buildArtifacts: ['dist/', 'build/', '.next/', '.vercel/'],
    configFiles: ['vercel.json'],
  },
  netlify: {
    requiredEnv: ['NETLIFY_AUTH_TOKEN'],
    optionalEnv: ['NETLIFY_SITE_ID'],
    buildArtifacts: ['dist/', 'build/', 'public/'],
    configFiles: ['netlify.toml'],
  },
};

class DeploymentValidator {
  constructor(platform, options = {}) {
    this.platform = platform;
    this.options = options;
    this.config = PLATFORMS[platform];
    this.errors = [];
    this.warnings = [];
    this.checks = [];
  }

  async validate() {
    console.log(`\n🔍 Validating ${this.platform} deployment...\n`);

    await this.checkEnvironmentVariables();
    await this.checkBuildArtifacts();
    await this.checkConfigFiles();
    await this.checkGitStatus();
    await this.platformSpecificChecks();

    this.printReport();
    return this.errors.length === 0;
  }

  async checkEnvironmentVariables() {
    console.log('📋 Checking environment variables...');

    for (const envVar of this.config.requiredEnv) {
      if (process.env[envVar]) {
        this.checks.push({ name: envVar, status: 'pass', message: 'Set' });
      } else {
        this.errors.push(`Missing required: ${envVar}`);
        this.checks.push({ name: envVar, status: 'fail', message: 'Missing' });
      }
    }

    for (const envVar of this.config.optionalEnv) {
      if (process.env[envVar]) {
        this.checks.push({ name: envVar, status: 'pass', message: 'Set (optional)' });
      } else {
        this.warnings.push(`Optional not set: ${envVar}`);
        this.checks.push({ name: envVar, status: 'warn', message: 'Not set (optional)' });
      }
    }
  }

  async checkBuildArtifacts() {
    console.log('📦 Checking build artifacts...');

    let foundArtifact = false;
    for (const artifact of this.config.buildArtifacts) {
      const path = resolve(process.cwd(), artifact);
      if (existsSync(path)) {
        foundArtifact = true;
        this.checks.push({ name: artifact, status: 'pass', message: 'Found' });
      }
    }

    if (!foundArtifact) {
      this.warnings.push('No build artifacts found. Run build command first.');
    }
  }

  async checkConfigFiles() {
    console.log('⚙️  Checking configuration files...');

    let foundConfig = false;
    for (const configFile of this.config.configFiles) {
      const path = resolve(process.cwd(), configFile);
      if (existsSync(path)) {
        foundConfig = true;
        this.checks.push({ name: configFile, status: 'pass', message: 'Found' });

        // Validate config content
        try {
          const content = readFileSync(path, 'utf8');
          if (configFile.endsWith('.json')) {
            JSON.parse(content);
            this.checks.push({ name: `${configFile} syntax`, status: 'pass', message: 'Valid JSON' });
          }
        } catch (e) {
          this.errors.push(`Invalid ${configFile}: ${e.message}`);
        }
      }
    }

    if (!foundConfig) {
      this.warnings.push(`No ${this.platform} config file found. Using defaults.`);
    }
  }

  async checkGitStatus() {
    console.log('🔀 Checking git status...');

    try {
      const { execSync } = await import('child_process');

      // Check for uncommitted changes
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        this.warnings.push('Uncommitted changes detected. Consider committing first.');
        this.checks.push({ name: 'Git status', status: 'warn', message: 'Uncommitted changes' });
      } else {
        this.checks.push({ name: 'Git status', status: 'pass', message: 'Clean' });
      }

      // Check branch
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      this.checks.push({ name: 'Current branch', status: 'info', message: branch });

    } catch (e) {
      this.warnings.push('Not a git repository or git not available');
    }
  }

  async platformSpecificChecks() {
    switch (this.platform) {
      case 'railway':
        await this.checkRailway();
        break;
      case 'cloudflare':
        await this.checkCloudflare();
        break;
      case 'vercel':
        await this.checkVercel();
        break;
    }
  }

  async checkRailway() {
    // Check for Dockerfile or supported runtime
    const hasDockerfile = existsSync(resolve(process.cwd(), 'Dockerfile'));
    const hasPackageJson = existsSync(resolve(process.cwd(), 'package.json'));
    const hasRequirements = existsSync(resolve(process.cwd(), 'requirements.txt'));

    if (!hasDockerfile && !hasPackageJson && !hasRequirements) {
      this.errors.push('No supported runtime detected (Dockerfile, package.json, or requirements.txt)');
    }

    // Check for Railway-specific health check endpoint
    if (hasPackageJson) {
      try {
        const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
        if (pkg.scripts?.start) {
          this.checks.push({ name: 'Start script', status: 'pass', message: pkg.scripts.start });
        } else {
          this.warnings.push('No "start" script in package.json');
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  async checkCloudflare() {
    const { projectName } = this.options;

    // Check dist folder
    const distPath = resolve(process.cwd(), 'dist');
    if (!existsSync(distPath)) {
      this.errors.push('dist/ folder not found. Run "npm run build" first.');
    }

    // Check for index.html in dist
    const indexPath = resolve(distPath, 'index.html');
    if (existsSync(distPath) && !existsSync(indexPath)) {
      this.warnings.push('No index.html in dist/. Is this a static site?');
    }

    // Validate wrangler.toml if exists
    const wranglerPath = resolve(process.cwd(), 'wrangler.toml');
    if (existsSync(wranglerPath)) {
      const content = readFileSync(wranglerPath, 'utf8');
      if (projectName && !content.includes(projectName)) {
        this.warnings.push(`Project name "${projectName}" not found in wrangler.toml`);
      }
    }
  }

  async checkVercel() {
    // Check for .vercel folder
    const vercelDir = resolve(process.cwd(), '.vercel');
    if (!existsSync(vercelDir)) {
      this.warnings.push('No .vercel folder. Run "vercel link" first.');
    }
  }

  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Validation Report: ${this.platform.toUpperCase()}`);
    console.log('='.repeat(60));

    // Print checks
    console.log('\nChecks:');
    for (const check of this.checks) {
      const icon = check.status === 'pass' ? '✅' :
                   check.status === 'fail' ? '❌' :
                   check.status === 'warn' ? '⚠️' : 'ℹ️';
      console.log(`  ${icon} ${check.name}: ${check.message}`);
    }

    // Print errors
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      for (const error of this.errors) {
        console.log(`   - ${error}`);
      }
    }

    // Print warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      for (const warning of this.warnings) {
        console.log(`   - ${warning}`);
      }
    }

    // Summary
    console.log('\n' + '-'.repeat(60));
    if (this.errors.length === 0) {
      console.log('✅ Validation PASSED - Ready to deploy');
    } else {
      console.log(`❌ Validation FAILED - ${this.errors.length} error(s) found`);
    }
    console.log('-'.repeat(60) + '\n');
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const platformIndex = args.indexOf('--platform');
  const platform = platformIndex >= 0 ? args[platformIndex + 1] : null;

  if (!platform || !PLATFORMS[platform]) {
    console.error('Usage: node validate-deployment.js --platform <railway|cloudflare|vercel|netlify>');
    console.error('Available platforms:', Object.keys(PLATFORMS).join(', '));
    process.exit(1);
  }

  const options = {};
  const projectNameIndex = args.indexOf('--project-name');
  if (projectNameIndex >= 0) {
    options.projectName = args[projectNameIndex + 1];
  }

  const validator = new DeploymentValidator(platform, options);
  const success = await validator.validate();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);
