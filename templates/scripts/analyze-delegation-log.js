#!/usr/bin/env node
/**
 * Analyze Delegation Log
 *
 * Analyzes Claude Code delegation logs to understand model usage,
 * token consumption, and agent patterns.
 *
 * Usage:
 *   node analyze-delegation-log.js ~/.claude/logs/delegation.jsonl
 *   node analyze-delegation-log.js log.jsonl --cost-estimate
 *   node analyze-delegation-log.js log.jsonl --output json
 */

import { readFileSync, existsSync } from 'fs';

// Approximate costs per 1M tokens (as of 2025)
const MODEL_COSTS = {
  'claude-opus-4-5': { input: 15.00, output: 75.00 },
  'claude-sonnet-4': { input: 3.00, output: 15.00 },
  'claude-haiku': { input: 0.25, output: 1.25 },
  'default': { input: 3.00, output: 15.00 },
};

class DelegationAnalyzer {
  constructor(logPath, options = {}) {
    this.logPath = logPath;
    this.options = options;
    this.entries = [];
    this.analysis = {
      models: {},
      agents: {},
      tools: {},
      sessions: {},
      timeline: [],
    };
  }

  async analyze() {
    console.log(`\n📊 Analyzing delegation log: ${this.logPath}\n`);

    if (!existsSync(this.logPath)) {
      console.error(`Error: File not found: ${this.logPath}`);
      process.exit(1);
    }

    await this.parseLog();
    await this.computeMetrics();

    if (this.options.output === 'json') {
      this.outputJson();
    } else {
      this.outputText();
    }
  }

  async parseLog() {
    const content = readFileSync(this.logPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        this.entries.push(entry);
      } catch (e) {
        // Skip invalid lines
      }
    }

    console.log(`Parsed ${this.entries.length} log entries\n`);
  }

  async computeMetrics() {
    for (const entry of this.entries) {
      // Track by model
      const model = entry.model || 'unknown';
      if (!this.analysis.models[model]) {
        this.analysis.models[model] = {
          calls: 0,
          inputTokens: 0,
          outputTokens: 0,
          errors: 0,
          avgLatency: 0,
          latencies: [],
        };
      }

      const modelStats = this.analysis.models[model];
      modelStats.calls++;
      modelStats.inputTokens += entry.inputTokens || 0;
      modelStats.outputTokens += entry.outputTokens || 0;
      if (entry.error) modelStats.errors++;
      if (entry.latencyMs) modelStats.latencies.push(entry.latencyMs);

      // Track by agent type
      const agentType = entry.agentType || entry.subagentType || 'main';
      if (!this.analysis.agents[agentType]) {
        this.analysis.agents[agentType] = {
          invocations: 0,
          totalTokens: 0,
          avgTokensPerCall: 0,
        };
      }

      const agentStats = this.analysis.agents[agentType];
      agentStats.invocations++;
      agentStats.totalTokens += (entry.inputTokens || 0) + (entry.outputTokens || 0);

      // Track by tool
      if (entry.tool) {
        if (!this.analysis.tools[entry.tool]) {
          this.analysis.tools[entry.tool] = { calls: 0, errors: 0 };
        }
        this.analysis.tools[entry.tool].calls++;
        if (entry.error) this.analysis.tools[entry.tool].errors++;
      }

      // Track by session
      const sessionId = entry.sessionId || 'default';
      if (!this.analysis.sessions[sessionId]) {
        this.analysis.sessions[sessionId] = {
          calls: 0,
          tokens: 0,
          start: entry.timestamp,
          end: entry.timestamp,
        };
      }

      const session = this.analysis.sessions[sessionId];
      session.calls++;
      session.tokens += (entry.inputTokens || 0) + (entry.outputTokens || 0);
      if (entry.timestamp > session.end) session.end = entry.timestamp;
    }

    // Compute averages
    for (const model of Object.keys(this.analysis.models)) {
      const stats = this.analysis.models[model];
      if (stats.latencies.length > 0) {
        stats.avgLatency = Math.round(
          stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length
        );
      }
      delete stats.latencies;
    }

    for (const agent of Object.keys(this.analysis.agents)) {
      const stats = this.analysis.agents[agent];
      stats.avgTokensPerCall = Math.round(stats.totalTokens / stats.invocations);
    }
  }

  estimateCost() {
    let totalCost = 0;
    const breakdown = {};

    for (const [model, stats] of Object.entries(this.analysis.models)) {
      const costs = MODEL_COSTS[model] || MODEL_COSTS['default'];
      const inputCost = (stats.inputTokens / 1_000_000) * costs.input;
      const outputCost = (stats.outputTokens / 1_000_000) * costs.output;
      const modelCost = inputCost + outputCost;

      breakdown[model] = {
        inputCost: inputCost.toFixed(4),
        outputCost: outputCost.toFixed(4),
        totalCost: modelCost.toFixed(4),
      };

      totalCost += modelCost;
    }

    return { breakdown, totalCost: totalCost.toFixed(4) };
  }

  outputText() {
    console.log('='.repeat(70));
    console.log('                    DELEGATION LOG ANALYSIS');
    console.log('='.repeat(70));

    // Model usage
    console.log('\n📊 Model Usage\n');
    console.log('Model                      Calls     Input Tokens    Output Tokens    Errors');
    console.log('-'.repeat(70));

    for (const [model, stats] of Object.entries(this.analysis.models)) {
      const modelName = model.padEnd(24);
      const calls = stats.calls.toString().padStart(6);
      const input = stats.inputTokens.toLocaleString().padStart(15);
      const output = stats.outputTokens.toLocaleString().padStart(16);
      const errors = stats.errors.toString().padStart(8);
      console.log(`${modelName}${calls}${input}${output}${errors}`);
    }

    // Agent usage
    console.log('\n🤖 Agent Types\n');
    console.log('Agent Type              Invocations    Total Tokens    Avg Tokens/Call');
    console.log('-'.repeat(70));

    for (const [agent, stats] of Object.entries(this.analysis.agents)) {
      const agentName = agent.padEnd(22);
      const invocations = stats.invocations.toString().padStart(12);
      const tokens = stats.totalTokens.toLocaleString().padStart(15);
      const avg = stats.avgTokensPerCall.toLocaleString().padStart(17);
      console.log(`${agentName}${invocations}${tokens}${avg}`);
    }

    // Tool usage (top 10)
    const toolEntries = Object.entries(this.analysis.tools)
      .sort((a, b) => b[1].calls - a[1].calls)
      .slice(0, 10);

    if (toolEntries.length > 0) {
      console.log('\n🔧 Top 10 Tools\n');
      console.log('Tool                           Calls    Errors');
      console.log('-'.repeat(50));

      for (const [tool, stats] of toolEntries) {
        const toolName = tool.padEnd(30);
        const calls = stats.calls.toString().padStart(6);
        const errors = stats.errors.toString().padStart(9);
        console.log(`${toolName}${calls}${errors}`);
      }
    }

    // Cost estimate
    if (this.options.costEstimate) {
      const cost = this.estimateCost();

      console.log('\n💰 Cost Estimate\n');
      console.log('Model                       Input Cost    Output Cost    Total Cost');
      console.log('-'.repeat(70));

      for (const [model, costs] of Object.entries(cost.breakdown)) {
        const modelName = model.padEnd(26);
        const input = `$${costs.inputCost}`.padStart(12);
        const output = `$${costs.outputCost}`.padStart(14);
        const total = `$${costs.totalCost}`.padStart(13);
        console.log(`${modelName}${input}${output}${total}`);
      }

      console.log('-'.repeat(70));
      console.log(`${'TOTAL'.padEnd(26)}${''.padStart(26)}$${cost.totalCost}`.padStart(13));
    }

    // Summary
    const totalCalls = Object.values(this.analysis.models)
      .reduce((acc, m) => acc + m.calls, 0);
    const totalTokens = Object.values(this.analysis.models)
      .reduce((acc, m) => acc + m.inputTokens + m.outputTokens, 0);
    const totalErrors = Object.values(this.analysis.models)
      .reduce((acc, m) => acc + m.errors, 0);

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n   Total API Calls: ${totalCalls.toLocaleString()}`);
    console.log(`   Total Tokens:    ${totalTokens.toLocaleString()}`);
    console.log(`   Error Rate:      ${((totalErrors / totalCalls) * 100).toFixed(2)}%`);
    console.log(`   Sessions:        ${Object.keys(this.analysis.sessions).length}`);
    console.log('\n' + '='.repeat(70) + '\n');
  }

  outputJson() {
    const output = {
      analyzedAt: new Date().toISOString(),
      logPath: this.logPath,
      totalEntries: this.entries.length,
      analysis: this.analysis,
    };

    if (this.options.costEstimate) {
      output.costEstimate = this.estimateCost();
    }

    console.log(JSON.stringify(output, null, 2));
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0].startsWith('--')) {
    console.error('Usage: node analyze-delegation-log.js <log-file> [options]');
    console.error('Options:');
    console.error('  --cost-estimate    Include cost estimate');
    console.error('  --output json      Output as JSON');
    process.exit(1);
  }

  const logPath = args[0];
  const options = {
    costEstimate: args.includes('--cost-estimate'),
    output: args.includes('--output') ? args[args.indexOf('--output') + 1] : 'text',
  };

  const analyzer = new DelegationAnalyzer(logPath, options);
  await analyzer.analyze();
}

main().catch(console.error);
