---
description: Deep complexity analysis for refactoring prioritization
model: sonnet
argument-hint: [file path, directory, or 'all']
---

# /refactor-analyze - Code Complexity Analysis

Analyze code complexity, detect code smells, and prioritize refactoring candidates with metrics-driven recommendations.

## Quick Start

```bash
/refactor-analyze                     # Analyze all flagged files
/refactor-analyze src/api/            # Analyze specific directory
/refactor-analyze src/api/client.ts   # Analyze single file
/refactor-analyze --top 10            # Show top 10 worst files
/refactor-analyze --pattern extract   # Find extraction opportunities
```

## Metrics Calculated

### Complexity Metrics

| Metric | Description | Threshold |
|--------|-------------|-----------|
| **Cyclomatic Complexity** | Control flow paths (testability) | >10 = needs refactoring |
| **Cognitive Complexity** | Mental effort to understand | >15 = needs refactoring |
| **Lines of Code (LOC)** | File/function size | >500 file, >50 function |
| **Nesting Depth** | Maximum indentation levels | >4 = needs flattening |
| **Parameter Count** | Function parameters | >5 = needs parameter object |

### Code Smell Detection

| Smell | Detection Criteria | Refactoring Pattern |
|-------|---------------------|---------------------|
| **Long Method** | LOC > 30, Cyclomatic > 10 | Extract Method |
| **Large Class/Module** | LOC > 500, Methods > 20 | Extract Class/Module |
| **Deep Nesting** | Depth > 4 | Early Return, Extract Method |
| **God Object** | High coupling, many responsibilities | Single Responsibility Split |
| **Feature Envy** | Uses external data > internal | Move Method |
| **Duplicate Code** | Similar blocks > 6 lines | Extract Function |
| **Long Parameter List** | Params > 5 | Parameter Object |

### Coupling Metrics

| Metric | Description | Risk Level |
|--------|-------------|------------|
| **Afferent Coupling (Ca)** | External dependents | High = painful to change |
| **Efferent Coupling (Ce)** | External dependencies | High = fragile |
| **Instability (I)** | Ce / (Ce + Ca) | 1 = unstable |

## Output Format

### Summary View (Default)

```
╔═══════════════════════════════════════════════════════════════╗
║  📊 Refactor Analysis - Code Health Report                     ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Files Analyzed: 142                                          ║
║  Refactoring Candidates: 23 (16%)                             ║
║  Critical Issues: 5                                           ║
║  Overall Health Score: 67/100 (Fair)                          ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Top Refactoring Priorities                                   ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  1. src/api/client.ts                                         ║
║     • Lines: 847 | Cyclomatic: 47 | Cognitive: 62            ║
║     • Smells: Long Methods (3), Deep Nesting (2)              ║
║     • Recommended: Extract Service, Split by Domain           ║
║     • Priority Score: 94/100                                  ║
║                                                               ║
║  2. src/components/Dashboard.tsx                              ║
║     • Lines: 623 | Cyclomatic: 31 | Cognitive: 45            ║
║     • Smells: Large Component, Feature Envy                   ║
║     • Recommended: Extract Components, Custom Hooks           ║
║     • Priority Score: 87/100                                  ║
║                                                               ║
║  3. src/utils/helpers.ts                                      ║
║     • Lines: 456 | Duplication: 34%                           ║
║     • Smells: Duplicate Code, Utility Dumping Ground          ║
║     • Recommended: Split by Domain, Extract Shared            ║
║     • Priority Score: 79/100                                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### Detailed View (--verbose)

```json
{
  "summary": {
    "filesAnalyzed": 142,
    "refactoringCandidates": 23,
    "criticalIssues": 5,
    "healthScore": 67,
    "healthGrade": "C"
  },
  "hotspots": [
    {
      "file": "src/api/client.ts",
      "metrics": {
        "loc": 847,
        "cyclomaticComplexity": 47,
        "cognitiveComplexity": 62,
        "maxNestingDepth": 6,
        "afferentCoupling": 12,
        "efferentCoupling": 28,
        "instability": 0.7,
        "duplicationPercentage": 8
      },
      "smells": [
        {
          "type": "long_method",
          "location": "fetchWithRetry:142-298",
          "severity": "high"
        },
        {
          "type": "deep_nesting",
          "location": "handleResponse:301-380",
          "severity": "medium"
        }
      ],
      "recommendations": [
        {
          "pattern": "extract_service",
          "description": "Extract AuthManager to separate file",
          "targetLines": "45-180",
          "estimatedImpact": "high"
        }
      ],
      "priorityScore": 94,
      "changeFrequency": "high"
    }
  ],
  "aggregateMetrics": {
    "avgCyclomaticComplexity": 12.3,
    "avgCognitiveComplexity": 18.7,
    "totalDuplication": 2847,
    "couplingHotspots": 8
  }
}
```

## Instructions for Claude

When `/refactor-analyze` is invoked:

### Step 1: Determine Scope

1. If specific file: Analyze that file only
2. If directory: Analyze all source files recursively
3. If 'all' or no argument: Use flagged files from `.claude/refactor-audit.json`, or scan entire project

### Step 2: Calculate Metrics Per File

For each source file:

```javascript
// Pseudo-code for metrics calculation
const metrics = {
  loc: countLines(file),
  cyclomaticComplexity: countDecisionPoints(file) + 1,
  cognitiveComplexity: calculateCognitive(file), // Weighted nesting
  maxNestingDepth: findMaxIndentation(file),

  // Function-level
  functions: file.functions.map(fn => ({
    name: fn.name,
    loc: fn.lines,
    params: fn.parameters.length,
    cyclomatic: countDecisionPoints(fn),
    startLine: fn.start,
    endLine: fn.end
  })),

  // Dependencies (from imports)
  afferentCoupling: countImportedBy(file),
  efferentCoupling: countImports(file),
  instability: efferent / (efferent + afferent)
};
```

### Step 3: Detect Code Smells

Apply detection rules:

```javascript
const smells = [];

// Long Method
for (const fn of metrics.functions) {
  if (fn.loc > 30 || fn.cyclomatic > 10) {
    smells.push({
      type: 'long_method',
      location: `${fn.name}:${fn.startLine}-${fn.endLine}`,
      severity: fn.loc > 50 ? 'high' : 'medium'
    });
  }
}

// Deep Nesting
if (metrics.maxNestingDepth > 4) {
  smells.push({
    type: 'deep_nesting',
    severity: metrics.maxNestingDepth > 6 ? 'high' : 'medium'
  });
}

// Large File
if (metrics.loc > 500) {
  smells.push({
    type: 'large_file',
    severity: metrics.loc > 800 ? 'high' : 'medium'
  });
}

// Long Parameter List
for (const fn of metrics.functions) {
  if (fn.params > 5) {
    smells.push({
      type: 'long_parameter_list',
      location: fn.name,
      severity: fn.params > 7 ? 'high' : 'medium'
    });
  }
}
```

### Step 4: Calculate Priority Score

```javascript
// Priority Formula (0-100)
const priorityScore = Math.min(100, (
  (metrics.cyclomaticComplexity / 50) * 30 +  // 30% weight
  (metrics.cognitiveComplexity / 60) * 30 +   // 30% weight
  (metrics.efferentCoupling / 30) * 20 +      // 20% weight
  (changeFrequency === 'high' ? 20 :
   changeFrequency === 'medium' ? 10 : 0)     // 20% weight
));
```

### Step 5: Generate Recommendations

Based on detected smells and metrics, recommend specific refactoring patterns:

| Condition | Recommendation |
|-----------|----------------|
| Long methods + High coupling | Extract Service |
| Large file + Multiple domains | Split by Domain |
| Deep nesting | Early Returns, Extract Method |
| Long parameter list | Introduce Parameter Object |
| Duplicate code | Extract Shared Function |
| High efferent coupling | Dependency Injection |

{{#if agents.available}}
### Step 6: Recommend Specialist Agent

Based on file type and detected patterns:

| File Pattern | Recommended Agent |
|--------------|-------------------|
{{#if agents.frontend}}| `.tsx`, `.jsx`, `.vue` | {{agents.frontend.name}} |{{/if}}
{{#if agents.backend}}| `.py` (FastAPI), `.ts` (Express) | {{agents.backend.name}} |{{/if}}
{{#if agents.database}}| `.prisma`, migrations | {{agents.database.name}} |{{/if}}
{{/if}}

### Step 7: Save Analysis Results

Write results to `.claude/refactor-analysis.json`:

```javascript
{
  "timestamp": "2026-01-31T12:00:00Z",
  "scope": "all",
  "summary": { /* ... */ },
  "hotspots": [ /* ... */ ],
  "smellCounts": {
    "long_method": 12,
    "deep_nesting": 8,
    "large_file": 5,
    "duplicate_code": 3
  }
}
```

### Step 8: Ask User How to Proceed

**Use AskUserQuestion:**

```
header: "Analysis Complete"
question: "Found 23 refactoring candidates. How would you like to proceed?"
options:
  - label: "Start Refactoring Top Priority"
    description: "Begin with highest priority file using /refactor-workflow"
  - label: "Generate Golden Master Tests"
    description: "Create characterization tests before refactoring"
  - label: "View Detailed Report"
    description: "Show full metrics for all files"
  - label: "Export to GitHub Issues"
    description: "Create issues for each refactoring candidate"
```

## Tech Stack Integration

{{#if frontend.framework}}
### {{frontend.framework}} Analysis

Additional metrics for {{frontend.framework}}:
- Component render complexity
- Prop drilling depth
- Hook dependency arrays
- Re-render triggers
{{/if}}

{{#if backend.framework}}
### {{backend.framework}} Analysis

Additional metrics for {{backend.framework}}:
{{#if (eq backend.framework "fastapi")}}
- Route handler complexity
- Dependency injection depth
- Pydantic model nesting
{{/if}}
{{#if (eq backend.framework "express")}}
- Middleware chain length
- Route handler complexity
- Error handling coverage
{{/if}}
{{/if}}

## Related Commands

- `/refactor-workflow` - Execute refactoring with full workflow
- `/golden-master` - Generate characterization tests
- `/refactor-scope` - Find specific refactoring opportunities
- `/refactor-audit` - View flagged files from hook

---

*Generated from tech-stack.json template*
