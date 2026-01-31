#!/usr/bin/env node
/**
 * Roadmap Scanner
 *
 * Scans for roadmap files and generates a progress dashboard.
 * Detects phase status, completion percentages, and blockers.
 *
 * Usage:
 *   node roadmap-scanner.js                  # Scan current directory
 *   node roadmap-scanner.js --path ./docs    # Scan specific directory
 *   node roadmap-scanner.js --output json    # JSON output
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, basename } from 'path';

const ROADMAP_PATTERNS = [
  /roadmap/i,
  /phase[-_]?dev/i,
  /implementation[-_]?plan/i,
  /project[-_]?plan/i,
];

const STATUS_PATTERNS = {
  complete: [/✅/, /\[x\]/i, /complete/i, /done/i, /finished/i],
  inProgress: [/🟨/, /\[ \]/, /in.?progress/i, /wip/i, /started/i],
  blocked: [/❌/, /blocked/i, /stuck/i, /waiting/i],
  notStarted: [/⬜/, /not.?started/i, /pending/i, /todo/i],
};

class RoadmapScanner {
  constructor(options = {}) {
    this.path = options.path || process.cwd();
    this.output = options.output || 'text';
    this.recursive = options.recursive !== false;
    this.roadmaps = [];
  }

  async scan() {
    console.log(`\n📋 Scanning for roadmaps in: ${this.path}\n`);

    await this.findRoadmaps(this.path);

    if (this.roadmaps.length === 0) {
      console.log('No roadmap files found.');
      return;
    }

    console.log(`Found ${this.roadmaps.length} roadmap(s)\n`);

    for (const roadmap of this.roadmaps) {
      await this.analyzeRoadmap(roadmap);
    }

    if (this.output === 'json') {
      this.outputJson();
    } else {
      this.outputText();
    }
  }

  async findRoadmaps(dir) {
    try {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory() && this.recursive) {
          if (!entry.startsWith('.') && entry !== 'node_modules') {
            await this.findRoadmaps(fullPath);
          }
        } else if (stat.isFile() && entry.endsWith('.md')) {
          if (ROADMAP_PATTERNS.some(pattern => pattern.test(entry))) {
            this.roadmaps.push({
              path: fullPath,
              name: basename(entry, '.md'),
              phases: [],
              metrics: {},
            });
          }
        }
      }
    } catch (e) {
      // Ignore access errors
    }
  }

  async analyzeRoadmap(roadmap) {
    const content = readFileSync(roadmap.path, 'utf8');
    const lines = content.split('\n');

    let currentPhase = null;
    let totalTasks = 0;
    let completedTasks = 0;
    let blockedTasks = 0;

    for (const line of lines) {
      // Detect phase headers
      const phaseMatch = line.match(/^#+\s*phase\s*(\d+)/i);
      if (phaseMatch) {
        if (currentPhase) {
          roadmap.phases.push(currentPhase);
        }
        currentPhase = {
          number: parseInt(phaseMatch[1]),
          name: line.replace(/^#+\s*/, '').trim(),
          status: 'not_started',
          tasks: [],
          notes: [],
        };
        continue;
      }

      // Detect status markers in phase headers or status tables
      if (currentPhase) {
        // Check for task markers
        const taskMatch = line.match(/^\s*[-*]\s*\[([ x])\]/i);
        if (taskMatch) {
          totalTasks++;
          const isComplete = taskMatch[1].toLowerCase() === 'x';
          if (isComplete) completedTasks++;
          currentPhase.tasks.push({
            text: line.replace(/^\s*[-*]\s*\[[ x]\]\s*/i, ''),
            complete: isComplete,
          });
        }

        // Check for status indicators
        for (const [status, patterns] of Object.entries(STATUS_PATTERNS)) {
          if (patterns.some(p => p.test(line))) {
            if (status === 'blocked') {
              blockedTasks++;
              currentPhase.status = 'blocked';
            } else if (status === 'complete' && currentPhase.status !== 'blocked') {
              currentPhase.status = 'complete';
            } else if (status === 'inProgress' && !['complete', 'blocked'].includes(currentPhase.status)) {
              currentPhase.status = 'in_progress';
            }
          }
        }

        // Check for version info
        const versionMatch = line.match(/v?(\d+\.\d+\.\d+)/);
        if (versionMatch) {
          currentPhase.version = versionMatch[1];
        }
      }
    }

    // Add last phase
    if (currentPhase) {
      roadmap.phases.push(currentPhase);
    }

    // Calculate metrics
    roadmap.metrics = {
      totalPhases: roadmap.phases.length,
      completedPhases: roadmap.phases.filter(p => p.status === 'complete').length,
      inProgressPhases: roadmap.phases.filter(p => p.status === 'in_progress').length,
      blockedPhases: roadmap.phases.filter(p => p.status === 'blocked').length,
      totalTasks,
      completedTasks,
      blockedTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }

  outputText() {
    console.log('='.repeat(70));
    console.log('                         ROADMAP DASHBOARD');
    console.log('='.repeat(70));

    for (const roadmap of this.roadmaps) {
      console.log(`\n📄 ${roadmap.name}`);
      console.log(`   Path: ${roadmap.path}`);
      console.log('-'.repeat(70));

      // Progress bar
      const progress = roadmap.metrics.progress;
      const barLength = 40;
      const filled = Math.round((progress / 100) * barLength);
      const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
      console.log(`\n   Progress: [${bar}] ${progress}%`);

      // Metrics
      const m = roadmap.metrics;
      console.log(`\n   Phases: ${m.completedPhases}/${m.totalPhases} complete`);
      console.log(`   Tasks:  ${m.completedTasks}/${m.totalTasks} complete`);

      if (m.blockedPhases > 0) {
        console.log(`   ⚠️  ${m.blockedPhases} phase(s) blocked`);
      }

      // Phase details
      console.log('\n   Phase Status:');
      for (const phase of roadmap.phases) {
        const icon = phase.status === 'complete' ? '✅' :
                     phase.status === 'in_progress' ? '🔄' :
                     phase.status === 'blocked' ? '❌' : '⬜';
        const version = phase.version ? ` (v${phase.version})` : '';
        console.log(`     ${icon} ${phase.name}${version}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));

    const totals = this.roadmaps.reduce((acc, r) => ({
      phases: acc.phases + r.metrics.totalPhases,
      completed: acc.completed + r.metrics.completedPhases,
      tasks: acc.tasks + r.metrics.totalTasks,
      doneTasks: acc.doneTasks + r.metrics.completedTasks,
    }), { phases: 0, completed: 0, tasks: 0, doneTasks: 0 });

    console.log(`\n   Total Roadmaps: ${this.roadmaps.length}`);
    console.log(`   Total Phases:   ${totals.completed}/${totals.phases} complete`);
    console.log(`   Total Tasks:    ${totals.doneTasks}/${totals.tasks} complete`);
    console.log(`   Overall:        ${totals.tasks > 0 ? Math.round((totals.doneTasks / totals.tasks) * 100) : 0}%`);
    console.log('\n' + '='.repeat(70) + '\n');
  }

  outputJson() {
    const output = {
      scannedAt: new Date().toISOString(),
      path: this.path,
      roadmaps: this.roadmaps,
      summary: {
        totalRoadmaps: this.roadmaps.length,
        totalPhases: this.roadmaps.reduce((acc, r) => acc + r.metrics.totalPhases, 0),
        completedPhases: this.roadmaps.reduce((acc, r) => acc + r.metrics.completedPhases, 0),
        totalTasks: this.roadmaps.reduce((acc, r) => acc + r.metrics.totalTasks, 0),
        completedTasks: this.roadmaps.reduce((acc, r) => acc + r.metrics.completedTasks, 0),
      },
    };

    console.log(JSON.stringify(output, null, 2));
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);

  const getArg = (name) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : null;
  };

  const options = {
    path: getArg('path') || process.cwd(),
    output: getArg('output') || 'text',
    recursive: !args.includes('--no-recursive'),
  };

  const scanner = new RoadmapScanner(options);
  await scanner.scan();
}

main().catch(console.error);
