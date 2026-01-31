# Phase Development Checklist

Validation gates for phased development execution.

## Overview

Three levels of validation ensure quality at each development stage:

- **L1**: Quick sanity checks (< 1 minute)
- **L2**: Standard validation (1-5 minutes)
- **L3**: Comprehensive verification (5+ minutes)

---

## L1 Validation (Quick Check)

Run after each task completion.

### Checklist

- [ ] **Syntax Valid** - No parse errors
- [ ] **Imports Resolve** - No missing modules
- [ ] **Types Check** - No type errors (if TypeScript)
- [ ] **Lint Clean** - No blocking lint errors

### Commands

```bash
# JavaScript/TypeScript
npx eslint --quiet <changed-files>
npx tsc --noEmit

# Python
python -m py_compile <changed-files>
ruff check <changed-files>
```

### Pass Criteria

- Zero syntax errors
- Zero type errors
- Zero blocking lint errors

---

## L2 Validation (Standard Check)

Run at phase completion, before phase advancement.

### Checklist

- [ ] **All L1 Checks Pass**
- [ ] **Unit Tests Pass** - Affected tests run
- [ ] **No Regressions** - Existing tests still pass
- [ ] **Files Created** - Expected outputs exist
- [ ] **Documentation Updated** - If API changed

### Commands

```bash
# Run affected tests
npm run test -- --findRelatedTests <changed-files>

# Verify expected files
ls -la <expected-output-files>

# Check documentation
grep -r "TODO: document" docs/
```

### Pass Criteria

- All unit tests pass
- Expected files exist
- No TODO documentation items for changed APIs

---

## L3 Validation (Comprehensive Check)

Run at project milestones, before deployment.

### Checklist

- [ ] **All L2 Checks Pass**
- [ ] **Full Test Suite Pass** - All tests
- [ ] **E2E Tests Pass** - Critical paths
- [ ] **Performance Check** - No degradation
- [ ] **Security Scan** - No vulnerabilities
- [ ] **Build Succeeds** - Production build works

### Commands

```bash
# Full test suite
npm test

# E2E tests
npm run test:e2e

# Performance audit
npx lighthouse --output=json --quiet

# Security scan
npm audit
npx snyk test

# Production build
npm run build
```

### Pass Criteria

- 100% test pass rate
- E2E tests cover critical paths
- No high/critical vulnerabilities
- Build completes without errors

---

## Phase-Specific Gates

### Phase 1: Foundation

| Gate | Criteria |
|------|----------|
| Structure | All directories created |
| Config | Configuration files valid |
| Dependencies | All packages installed |
| Base Tests | Setup tests pass |

### Phase 2: Implementation

| Gate | Criteria |
|------|----------|
| Features | All tasks complete |
| Coverage | >80% on new code |
| Integration | API tests pass |
| Types | Full type coverage |

### Phase 3: Polish & Deploy

| Gate | Criteria |
|------|----------|
| E2E | All flows tested |
| Performance | Meets thresholds |
| Security | No vulnerabilities |
| Docs | Complete and current |

---

## Automated Gate Checks

### PROGRESS.json Validation

```json
{
  "validation_gates": {
    "tasks_complete": true,
    "files_created": true,
    "tests_passing": true,
    "no_errors": true,
    "token_budget": true
  }
}
```

### Gate Runner Script

```javascript
// Run all gates for current phase
async function runValidationGates(phase) {
  const results = {
    tasks_complete: await checkTasksComplete(phase),
    files_created: await checkFilesCreated(phase),
    tests_passing: await checkTestsPassing(phase),
    no_errors: await checkNoErrors(phase),
    token_budget: await checkTokenBudget(phase)
  };

  const allPassed = Object.values(results).every(r => r);

  return { allPassed, results };
}
```

---

## Failure Handling

### L1 Failure

1. Fix immediately before proceeding
2. Re-run L1 checks
3. Continue with task

### L2 Failure

1. Identify failing gate
2. Create remediation task
3. Fix and re-validate
4. Update PROGRESS.json

### L3 Failure

1. Document failure details
2. Create tracking issue
3. Roll back if needed
4. Plan remediation
5. Re-execute full L3

---

## Quick Commands

```bash
# L1 Quick Check
npm run validate:l1

# L2 Phase Check
npm run validate:l2

# L3 Comprehensive Check
npm run validate:l3

# All checks
npm run validate:all
```

---

## Integration with Phased Development

1. **Task Complete** → Run L1
2. **Phase Complete** → Run L2
3. **Ready to Deploy** → Run L3
4. **All Gates Pass** → Proceed to next phase

---

*Use these checklists to ensure quality at every stage*
