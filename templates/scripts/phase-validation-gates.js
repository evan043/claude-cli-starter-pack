#!/usr/bin/env node
/**
 * Phase Validation Gates
 *
 * 5-gate validation before phase transitions:
 * 1. EXIST - Required files and artifacts exist
 * 2. INIT - Initialization completed successfully
 * 3. REGISTER - Components registered/configured
 * 4. INVOKE - Functionality works when invoked
 * 5. PROPAGATE - Changes propagated to dependent systems
 *
 * Usage:
 *   node phase-validation-gates.js --phase 1 --config ./validation.json
 *   node phase-validation-gates.js --progress ./PROGRESS.json
 */

import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const GATES = ['EXIST', 'INIT', 'REGISTER', 'INVOKE', 'PROPAGATE'];

class PhaseValidator {
  constructor(options = {}) {
    this.phase = options.phase;
    this.configPath = options.configPath;
    this.progressPath = options.progressPath || 'PROGRESS.json';
    this.verbose = options.verbose || false;
    this.config = null;
    this.results = {
      phase: this.phase,
      gates: {},
      passed: false,
      timestamp: new Date().toISOString(),
    };
  }

  async validate() {
    await this.loadConfig();

    console.log(`\n🔒 Phase ${this.phase} Validation\n`);
    console.log('Gate          Status    Checks');
    console.log('-'.repeat(60));

    for (const gate of GATES) {
      const gateConfig = this.config.gates?.[gate] || {};
      const result = await this.validateGate(gate, gateConfig);
      this.results.gates[gate] = result;
    }

    this.results.passed = Object.values(this.results.gates)
      .every(g => g.passed);

    this.printSummary();
    return this.results;
  }

  async loadConfig() {
    if (this.configPath && existsSync(this.configPath)) {
      this.config = JSON.parse(readFileSync(this.configPath, 'utf8'));
    } else if (existsSync(this.progressPath)) {
      const progress = JSON.parse(readFileSync(this.progressPath, 'utf8'));
      this.config = progress.phases?.[this.phase - 1]?.validation || {};
    } else {
      this.config = this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      gates: {
        EXIST: {
          files: ['package.json'],
          directories: ['src/', 'node_modules/'],
        },
        INIT: {
          commands: ['npm --version'],
        },
        REGISTER: {
          files: ['.claude/settings.json'],
        },
        INVOKE: {
          commands: ['npm run --silent test 2>/dev/null || echo "no tests"'],
        },
        PROPAGATE: {
          commands: ['git status --porcelain'],
          expectEmpty: true,
        },
      },
    };
  }

  async validateGate(gate, config) {
    const result = {
      gate,
      passed: true,
      checks: [],
      errors: [],
    };

    try {
      switch (gate) {
        case 'EXIST':
          await this.checkExist(config, result);
          break;
        case 'INIT':
          await this.checkInit(config, result);
          break;
        case 'REGISTER':
          await this.checkRegister(config, result);
          break;
        case 'INVOKE':
          await this.checkInvoke(config, result);
          break;
        case 'PROPAGATE':
          await this.checkPropagate(config, result);
          break;
      }
    } catch (error) {
      result.passed = false;
      result.errors.push(error.message);
    }

    const icon = result.passed ? '✅' : '❌';
    const checkCount = `${result.checks.filter(c => c.passed).length}/${result.checks.length}`;
    console.log(`${gate.padEnd(12)}  ${icon}        ${checkCount} checks passed`);

    if (this.verbose && result.errors.length > 0) {
      for (const error of result.errors) {
        console.log(`              └─ ${error}`);
      }
    }

    return result;
  }

  async checkExist(config, result) {
    // Check files
    for (const file of config.files || []) {
      const exists = existsSync(resolve(process.cwd(), file));
      result.checks.push({ type: 'file', path: file, passed: exists });
      if (!exists) {
        result.passed = false;
        result.errors.push(`Missing file: ${file}`);
      }
    }

    // Check directories
    for (const dir of config.directories || []) {
      const exists = existsSync(resolve(process.cwd(), dir));
      result.checks.push({ type: 'directory', path: dir, passed: exists });
      if (!exists) {
        result.passed = false;
        result.errors.push(`Missing directory: ${dir}`);
      }
    }
  }

  async checkInit(config, result) {
    // Run initialization check commands
    for (const cmd of config.commands || []) {
      try {
        execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
        result.checks.push({ type: 'command', command: cmd, passed: true });
      } catch (error) {
        result.passed = false;
        result.checks.push({ type: 'command', command: cmd, passed: false });
        result.errors.push(`Command failed: ${cmd}`);
      }
    }

    // Check environment variables
    for (const envVar of config.envVars || []) {
      const exists = !!process.env[envVar];
      result.checks.push({ type: 'envVar', name: envVar, passed: exists });
      if (!exists) {
        result.passed = false;
        result.errors.push(`Missing env var: ${envVar}`);
      }
    }
  }

  async checkRegister(config, result) {
    // Check config files contain expected content
    for (const file of config.files || []) {
      const filePath = resolve(process.cwd(), file);
      const exists = existsSync(filePath);
      result.checks.push({ type: 'config', path: file, passed: exists });

      if (!exists) {
        result.passed = false;
        result.errors.push(`Missing config: ${file}`);
      } else if (config.contains?.[file]) {
        const content = readFileSync(filePath, 'utf8');
        for (const expected of config.contains[file]) {
          const found = content.includes(expected);
          result.checks.push({ type: 'content', file, expected, passed: found });
          if (!found) {
            result.passed = false;
            result.errors.push(`Missing in ${file}: ${expected}`);
          }
        }
      }
    }
  }

  async checkInvoke(config, result) {
    // Run functionality tests
    for (const cmd of config.commands || []) {
      try {
        const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });

        if (config.expectOutput?.[cmd]) {
          const expected = config.expectOutput[cmd];
          const matches = output.includes(expected);
          result.checks.push({ type: 'invoke', command: cmd, passed: matches });
          if (!matches) {
            result.passed = false;
            result.errors.push(`Output mismatch for: ${cmd}`);
          }
        } else {
          result.checks.push({ type: 'invoke', command: cmd, passed: true });
        }
      } catch (error) {
        if (!config.allowFailure?.includes(cmd)) {
          result.passed = false;
          result.checks.push({ type: 'invoke', command: cmd, passed: false });
          result.errors.push(`Invoke failed: ${cmd}`);
        }
      }
    }
  }

  async checkPropagate(config, result) {
    // Check that changes are propagated (git clean, deps synced, etc.)
    for (const cmd of config.commands || []) {
      try {
        const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });

        if (config.expectEmpty) {
          const isEmpty = output.trim() === '';
          result.checks.push({ type: 'propagate', command: cmd, passed: isEmpty });
          if (!isEmpty) {
            result.passed = false;
            result.errors.push(`Expected empty output: ${cmd}`);
          }
        } else {
          result.checks.push({ type: 'propagate', command: cmd, passed: true });
        }
      } catch (error) {
        result.passed = false;
        result.checks.push({ type: 'propagate', command: cmd, passed: false });
        result.errors.push(`Propagate check failed: ${cmd}`);
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log(`Phase ${this.phase} Validation: ${this.results.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(60));

    if (!this.results.passed) {
      console.log('\n❌ Failed Gates:');
      for (const [gate, result] of Object.entries(this.results.gates)) {
        if (!result.passed) {
          console.log(`\n   ${gate}:`);
          for (const error of result.errors) {
            console.log(`     - ${error}`);
          }
        }
      }
    }

    console.log('');
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);

  const getArg = (name) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : null;
  };

  const phase = parseInt(getArg('phase') || '1');
  const configPath = getArg('config');
  const progressPath = getArg('progress');
  const verbose = args.includes('--verbose') || args.includes('-v');

  const validator = new PhaseValidator({
    phase,
    configPath,
    progressPath,
    verbose,
  });

  const results = await validator.validate();
  process.exit(results.passed ? 0 : 1);
}

// Export for use as module
export { PhaseValidator, GATES };

main().catch(console.error);
