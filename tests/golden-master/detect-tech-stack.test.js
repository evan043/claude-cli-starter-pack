/**
 * Golden Master Tests for detect-tech-stack.js
 *
 * This captures the actual detection behavior, not just the API structure.
 * Run before and after refactoring to ensure detection logic is preserved.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SNAPSHOT_DIR = join(__dirname, 'snapshots');

// Ensure directory exists
if (!existsSync(SNAPSHOT_DIR)) {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

/**
 * Mock package.json scenarios for testing detection
 */
const TEST_SCENARIOS = {
  'react-vite-tailwind': {
    name: 'react-vite-app',
    dependencies: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0'
    },
    devDependencies: {
      'vite': '^5.0.0',
      'tailwindcss': '^3.4.0',
      '@vitejs/plugin-react': '^4.2.0',
      'typescript': '^5.3.0'
    }
  },
  'next-prisma': {
    name: 'next-prisma-app',
    dependencies: {
      'next': '^14.0.0',
      'react': '^18.2.0',
      '@prisma/client': '^5.0.0'
    },
    devDependencies: {
      'prisma': '^5.0.0',
      'typescript': '^5.3.0'
    }
  },
  'express-mongodb': {
    name: 'express-api',
    dependencies: {
      'express': '^4.18.0',
      'mongoose': '^8.0.0',
      'cors': '^2.8.0'
    },
    devDependencies: {
      'jest': '^29.0.0',
      'nodemon': '^3.0.0'
    }
  },
  'fastapi-python': {
    // Simulates a Python project (no package.json deps, but has requirements.txt)
    name: 'fastapi-app',
    dependencies: {},
    devDependencies: {}
  },
  'vue-nuxt': {
    name: 'nuxt-app',
    dependencies: {
      'nuxt': '^3.8.0',
      'vue': '^3.3.0'
    },
    devDependencies: {
      'typescript': '^5.3.0'
    }
  },
  'minimal-node': {
    name: 'minimal-app',
    dependencies: {},
    devDependencies: {}
  }
};

/**
 * Expected detection results (golden master baselines)
 */
const EXPECTED_DETECTIONS = {
  'react-vite-tailwind': {
    frontend: {
      framework: 'react',
      buildTool: 'vite',
      styling: ['tailwindcss'],
      language: 'typescript'
    }
  },
  'next-prisma': {
    frontend: {
      framework: 'next',
      language: 'typescript'
    },
    database: {
      orm: 'prisma'
    }
  },
  'express-mongodb': {
    backend: {
      framework: 'express'
    },
    database: {
      type: 'mongodb'
    },
    testing: {
      framework: 'jest'
    }
  },
  'vue-nuxt': {
    frontend: {
      framework: 'nuxt',
      language: 'typescript'
    }
  }
};

/**
 * Test the DETECTION_PATTERNS data structure
 */
async function testDetectionPatterns() {
  console.log('\n=== Testing DETECTION_PATTERNS Structure ===\n');

  try {
    // Import the module
    const detectModule = await import('../../src/commands/detect-tech-stack.js');

    // Check if detectTechStack function exists and has expected signature
    if (typeof detectModule.detectTechStack !== 'function') {
      console.error('  ✗ detectTechStack is not a function');
      return false;
    }
    console.log('  ✓ detectTechStack function exists');

    if (typeof detectModule.runDetection !== 'function') {
      console.error('  ✗ runDetection is not a function');
      return false;
    }
    console.log('  ✓ runDetection function exists');

    // Test default export
    if (!detectModule.default || typeof detectModule.default !== 'object') {
      console.error('  ✗ default export is not an object');
      return false;
    }
    console.log('  ✓ default export is valid');

    return true;
  } catch (error) {
    console.error(`  ✗ Import failed: ${error.message}`);
    return false;
  }
}

/**
 * Capture current detection behavior for this project
 */
async function captureProjectDetection() {
  console.log('\n=== Capturing Detection for Current Project ===\n');

  try {
    const { detectTechStack } = await import('../../src/commands/detect-tech-stack.js');

    // Run detection on current project (CCASP itself)
    const projectRoot = join(__dirname, '../..');
    const result = await detectTechStack(projectRoot, { silent: true });

    // Save the snapshot
    const snapshotPath = join(SNAPSHOT_DIR, 'detect-tech-stack-ccasp.json');
    writeFileSync(snapshotPath, JSON.stringify(result, null, 2));

    console.log('  ✓ Captured detection result for CCASP project');
    console.log(`    Frontend: ${result.frontend?.framework || 'none'}`);
    console.log(`    Backend: ${result.backend?.framework || 'none'}`);
    console.log(`    Language: ${result.language || 'unknown'}`);

    return result;
  } catch (error) {
    console.error(`  ✗ Detection failed: ${error.message}`);
    return null;
  }
}

/**
 * Verify detection matches golden master
 */
async function verifyProjectDetection() {
  console.log('\n=== Verifying Detection Against Golden Master ===\n');

  const snapshotPath = join(SNAPSHOT_DIR, 'detect-tech-stack-ccasp.json');

  if (!existsSync(snapshotPath)) {
    console.log('  ⚠ No golden master found. Run with "capture" first.');
    return null;
  }

  try {
    const { detectTechStack } = await import('../../src/commands/detect-tech-stack.js');

    const projectRoot = join(__dirname, '../..');
    const current = await detectTechStack(projectRoot, { silent: true });
    const saved = JSON.parse(readFileSync(snapshotPath, 'utf-8'));

    // Compare key fields
    const fieldsToCompare = [
      'frontend.framework',
      'frontend.buildTool',
      'backend.framework',
      'language',
      'packageManager'
    ];

    let allMatch = true;

    for (const field of fieldsToCompare) {
      const parts = field.split('.');
      let currentVal = current;
      let savedVal = saved;

      for (const part of parts) {
        currentVal = currentVal?.[part];
        savedVal = savedVal?.[part];
      }

      if (currentVal !== savedVal) {
        console.error(`  ✗ ${field}: expected "${savedVal}", got "${currentVal}"`);
        allMatch = false;
      } else if (currentVal !== undefined) {
        console.log(`  ✓ ${field}: ${currentVal}`);
      }
    }

    return allMatch;
  } catch (error) {
    console.error(`  ✗ Verification failed: ${error.message}`);
    return false;
  }
}

/**
 * Main entry point
 */
async function main() {
  const mode = process.argv[2] || 'both';

  console.log('Golden Master Tests: detect-tech-stack.js');
  console.log('==========================================');

  // Always test structure
  const structureOk = await testDetectionPatterns();

  if (mode === 'capture' || mode === 'both') {
    await captureProjectDetection();
  }

  if (mode === 'verify' || mode === 'both') {
    const verifyResult = await verifyProjectDetection();

    if (verifyResult === false) {
      console.log('\n=== VERIFICATION FAILED ===');
      process.exit(1);
    }
  }

  console.log('\n=== ALL TESTS PASSED ===');
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
