# CCASP Code Refactoring - Large File Decomposition

## Overview

Split 11 large files (>1000 lines) identified by `/refactor-analyze` into focused, maintainable modules. Each file will be decomposed into domain-specific submodules with thin re-export wrappers preserving backwards compatibility.

**Health Score:** 6.5/10 → 8.5/10 (target)
**Total LOC to refactor:** 12,968 lines across 11 files
**Strategy:** Extract → Re-export → Verify → Repeat

## Target Files

| # | File | LOC | Domain | Decomposition Strategy |
|---|------|-----|--------|----------------------|
| 1 | orchestrator.js | 1,900 | Vision | 6 domain orchestrators |
| 2 | menu.js | 1,873 | CLI | Display utils + flow modules |
| 3 | init.js | 1,521 | Commands | 5 focused submodules |
| 4 | wizard/actions.js | 1,451 | Commands | 6 action categories |
| 5 | phase-dev-templates.js | 1,174 | Agents | JSON data extraction |
| 6 | schema.js | 1,053 | Roadmap | validators/generators/migrations |
| 7 | roadmap-manager.js | 1,022 | Roadmap | CRUD/lifecycle/queries |
| 8 | intelligence.js | 954 | Roadmap | analyzer/recommender/classifier |
| 9 | version-check.js | 925 | Utils | checker/updater/registry |
| 10 | state-manager.js | 851 | Agents | store/queries/mutations |
| 11 | generator.js | 832 | Agents | l1/l2/l3/common |

## Phase Summary

### Phase 1: Safety Nets & Quick Wins (2-3 days)
- Golden master snapshots for all 11 files
- Convert phase-dev-templates.js to JSON data files
- **Gate:** 135/135 tests pass

### Phase 2: Commands Domain Decomposition (4-5 days)
- Split init.js → init/{scaffolding,features,templates,deployment,validation}.js
- Split wizard/actions.js → actions/{setup,agents,hooks,skills,github,deployment}.js
- **Gate:** 135/135 tests pass, all exports preserved

### Phase 3: CLI & Menu Refactoring (3-4 days)
- Extract display utilities → cli/display.js
- Extract 20+ flows → cli/flows/{main,settings,github,agents,tools,deployment}.js
- Reduce menu.js to <300 line orchestrator
- **Gate:** 135/135 tests pass

### Phase 4: Roadmap Domain Decomposition (3-4 days)
- Split schema.js → schema/{validators,generators,migrations}.js
- Split roadmap-manager.js → manager/{crud,lifecycle,queries}.js
- Split intelligence.js → intelligence/{analyzer,recommender,classifier}.js
- **Gate:** 135/135 tests pass

### Phase 5: Vision Orchestrator Decomposition (4-5 days)
- Map 1900 LOC to 8 subsystem domains
- Extract into vision/orchestrators/{analysis,security,architecture,autonomous,execution,monitoring}.js
- Reduce to <400 line coordinator
- **Gate:** 135/135 tests pass

### Phase 6: Agents & Utils Cleanup (2-3 days)
- Split state-manager.js → state/{store,queries,mutations}.js
- Split generator.js → generator/{l1,l2,l3,common}.js
- Split version-check.js → version/{checker,updater,registry}.js
- **Gate:** 135/135 tests pass

### Phase 7: Verification & Polish (1-2 days)
- Verify all 11 files <500 lines
- Full test suite + golden master verification
- Lint clean
- Health score measurement (target: 8.5/10)
- CHANGELOG update

## Success Criteria

- [ ] All 11 original files <500 lines (or thin re-export wrappers)
- [ ] All new submodules <500 lines
- [ ] 135/135 tests pass throughout
- [ ] No new lint errors introduced
- [ ] Health score >= 8.5/10
- [ ] Backwards compatibility preserved (all original exports intact)

## Execution

```bash
# Start Phase 1
/roadmap-track ccasp-code-refactoring

# Track individual phase
/phase-track ccasp-code-refactoring/phase-1
```
