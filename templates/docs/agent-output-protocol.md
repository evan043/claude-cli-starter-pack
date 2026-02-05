# Agent Output Protocol (AOP) - Standard Specification

**Version:** 1.0.0
**Status:** MANDATORY for all CCASP agents

## Purpose

The Agent Output Protocol (AOP) prevents context window overflow by standardizing how agents return results. All agents MUST follow this protocol.

## The Problem AOP Solves

When agents return full outputs to parent orchestrators:
- Search results: 10,000+ chars dumped into context
- File contents: Full files returned instead of summaries
- Analysis: Verbose explanations instead of key findings
- Build outputs: Complete logs instead of pass/fail

This causes context overflow, session freezing, and degraded AI performance.

## AOP Format Specification

Every agent response MUST include these markers:

```
[AOP:START] {ISO timestamp}
[AOP:TASK] {brief task description, max 50 chars}

... agent work happens here ...

[AOP:SUMMARY]
{1-5 bullet points of key findings}
{Max 500 characters total}

[AOP:DETAILS_FILE] {path to full output file, or "none"}
[AOP:METRICS] {optional: counts, sizes, durations}
[AOP:STATUS] {success | failure | partial}
[AOP:END] {ISO timestamp}
```

## Summary Length Limits by Task Type

| Task Type | Max Summary | Details Location |
|-----------|-------------|------------------|
| Search/Explore | 500 chars | JSON file with paths |
| Analysis | 600 chars | Markdown file |
| Code Changes | 300 chars | Git diff file |
| Test Results | 400 chars | Test output file |
| Build Output | 200 chars | Build log file |
| Documentation | 500 chars | Generated doc file |

## Example Outputs

### Good: Search Agent with AOP

```
[AOP:START] 2026-02-05T10:30:00Z
[AOP:TASK] Search for auth implementations

[AOP:SUMMARY]
- Found 8 auth-related files in src/auth/
- Main handler: src/auth/handler.ts (450 lines)
- Uses JWT + session hybrid approach
- 3 security issues flagged for review

[AOP:DETAILS_FILE] .claude/cache/agent-outputs/search-auth-1707130200.json
[AOP:METRICS] files_scanned: 234, matches: 8, duration: 12s
[AOP:STATUS] success
[AOP:END] 2026-02-05T10:30:12Z
```

### Bad: Search Agent without AOP

```
Found the following files:
1. src/auth/handler.ts
   Contents:
   import { jwt } from 'jsonwebtoken';
   import { session } from './session';
   ... (400 more lines dumped into context) ...

2. src/auth/middleware.ts
   Contents:
   ... (200 more lines) ...

3. src/auth/utils.ts
   ... (continues for 10,000+ characters) ...
```

### Good: Analysis Agent with AOP

```
[AOP:START] 2026-02-05T11:00:00Z
[AOP:TASK] Analyze API performance bottlenecks

[AOP:SUMMARY]
- 3 N+1 query issues in UserController
- Missing index on orders.user_id (causes 2s delays)
- Redis cache not utilized for hot paths
- Recommendation: Add index, implement caching layer

[AOP:DETAILS_FILE] .claude/cache/agent-outputs/analysis-perf-1707131200.json
[AOP:METRICS] endpoints_analyzed: 24, issues_found: 5, severity_high: 2
[AOP:STATUS] success
[AOP:END] 2026-02-05T11:02:30Z
```

### Good: Test Agent with AOP

```
[AOP:START] 2026-02-05T14:00:00Z
[AOP:TASK] Run unit test suite

[AOP:SUMMARY]
- Tests: 156 passed, 3 failed, 2 skipped
- Failed: auth.test.ts (2), api.test.ts (1)
- Coverage: 78% (target: 80%)
- Duration: 45 seconds

[AOP:DETAILS_FILE] .claude/cache/agent-outputs/test-run-1707141600.json
[AOP:STATUS] failure
[AOP:END] 2026-02-05T14:00:45Z
```

## Implementation in Agent Prompts

Add this to EVERY agent prompt:

```
**OUTPUT REQUIREMENTS (MANDATORY - AOP Compliance):**

1. Write detailed results to: {cache_dir}/{agent-id}-{timestamp}.json
2. Return ONLY an AOP-formatted summary:

[AOP:START] {timestamp}
[AOP:TASK] {your task in 50 chars}

[AOP:SUMMARY]
{Your key findings in 3-5 bullets, max 500 chars total}

[AOP:DETAILS_FILE] {path to your output file}
[AOP:STATUS] success|failure|partial
[AOP:END] {timestamp}

3. DO NOT include:
   - Full file contents
   - Complete search results
   - Verbose logs or stack traces
   - Code snippets longer than 5 lines
```

## Parsing AOP Output

```javascript
function parseAOPOutput(output) {
  const result = {
    task: null,
    summary: null,
    detailsFile: null,
    metrics: {},
    status: 'unknown',
    timestamps: { start: null, end: null }
  };

  // Extract markers
  const startMatch = output.match(/\[AOP:START\]\s*(.+)/);
  const taskMatch = output.match(/\[AOP:TASK\]\s*(.+)/);
  const summaryMatch = output.match(/\[AOP:SUMMARY\]([\s\S]*?)\[AOP:/);
  const fileMatch = output.match(/\[AOP:DETAILS_FILE\]\s*(\S+)/);
  const metricsMatch = output.match(/\[AOP:METRICS\]\s*(.+)/);
  const statusMatch = output.match(/\[AOP:STATUS\]\s*(\w+)/);
  const endMatch = output.match(/\[AOP:END\]\s*(.+)/);

  if (startMatch) result.timestamps.start = startMatch[1].trim();
  if (taskMatch) result.task = taskMatch[1].trim();
  if (summaryMatch) result.summary = summaryMatch[1].trim().slice(0, 600);
  if (fileMatch) result.detailsFile = fileMatch[1].trim();
  if (statusMatch) result.status = statusMatch[1].toLowerCase();
  if (endMatch) result.timestamps.end = endMatch[1].trim();

  if (metricsMatch) {
    // Parse key: value pairs
    metricsMatch[1].split(',').forEach(pair => {
      const [key, value] = pair.split(':').map(s => s.trim());
      if (key && value) result.metrics[key] = value;
    });
  }

  return result;
}
```

## Details File Format

The details file (JSON) should include:

```json
{
  "aop_version": "1.0.0",
  "agent_id": "search-auth-1707130200",
  "task": "Search for auth implementations",
  "timestamp": "2026-02-05T10:30:00Z",
  "duration_ms": 12000,

  "results": {
    // Full results here - can be any size
    "files_found": [
      {
        "path": "src/auth/handler.ts",
        "lines": 450,
        "summary": "Main auth handler with JWT validation",
        "relevance": 0.95
      }
      // ... more results
    ],
    "code_snippets": [
      // Full code snippets here
    ],
    "analysis": "Full analysis text..."
  },

  "metadata": {
    "files_scanned": 234,
    "matches": 8,
    "search_patterns": ["auth", "jwt", "session"]
  }
}
```

## Validation Checklist

Before an agent returns results:

- [ ] Output includes [AOP:START] marker
- [ ] [AOP:TASK] is present and under 50 chars
- [ ] [AOP:SUMMARY] is present and under 600 chars
- [ ] [AOP:DETAILS_FILE] points to valid path or "none"
- [ ] [AOP:STATUS] is success, failure, or partial
- [ ] [AOP:END] marker present
- [ ] No full file contents in response
- [ ] No verbose logs or stack traces
- [ ] Details file written if needed

## Migration Guide

### For Existing Agents

1. Add AOP instructions to prompt
2. Ensure agent writes details to file
3. Verify summary length limits
4. Test that parent receives summary only

### For New Agents

1. Start with AOP template in prompt
2. Include details file path in configuration
3. Set appropriate summary limit for task type
4. Add AOP parsing to result handler

## Related Documentation

- [Context-Safe Orchestration](../patterns/context-safe-orchestration.md)
- [L1-L2 Orchestration](../patterns/l1-l2-orchestration.md)
- [Multi-Phase Orchestration](../patterns/multi-phase-orchestration.md)

---

*Agent Output Protocol v1.0.0 - CCASP Context Safety Standard*
