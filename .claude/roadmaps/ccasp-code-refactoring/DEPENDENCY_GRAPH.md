# Dependency Graph - CCASP Code Refactoring

## Phase Dependencies

```mermaid
graph TD
    P1[Phase 1: Safety Nets & Quick Wins] --> P2[Phase 2: Commands Decomposition]
    P1 --> P3[Phase 3: CLI & Menu Refactoring]
    P1 --> P4[Phase 4: Roadmap Decomposition]
    P1 --> P5[Phase 5: Vision Orchestrator]
    P2 --> P6[Phase 6: Agents & Utils Cleanup]
    P3 --> P6
    P4 --> P6
    P5 --> P6
    P6 --> P7[Phase 7: Verification & Polish]

    style P1 fill:#e1f5fe
    style P2 fill:#fff3e0
    style P3 fill:#fff3e0
    style P4 fill:#fff3e0
    style P5 fill:#fff3e0
    style P6 fill:#f3e5f5
    style P7 fill:#e8f5e9
```

## Parallel Execution Opportunities

Phases 2, 3, 4, and 5 can run in parallel after Phase 1 completes:

```
Phase 1 (Safety Nets)
    ├── Phase 2 (Commands)  ──┐
    ├── Phase 3 (CLI/Menu)  ──┤
    ├── Phase 4 (Roadmap)   ──├── Phase 6 (Agents/Utils) ── Phase 7 (Verify)
    └── Phase 5 (Vision)    ──┘
```

## File Dependency Map

```mermaid
graph LR
    subgraph Commands
        init[init.js] --> init_sub[init/]
        actions[wizard/actions.js] --> actions_sub[actions/]
    end

    subgraph CLI
        menu[menu.js] --> display[cli/display.js]
        menu --> flows[cli/flows/]
    end

    subgraph Roadmap
        schema[schema.js] --> schema_sub[schema/]
        rm[roadmap-manager.js] --> rm_sub[manager/]
        intel[intelligence.js] --> intel_sub[intelligence/]
    end

    subgraph Vision
        orch[orchestrator.js] --> orch_sub[orchestrators/]
    end

    subgraph Agents
        sm[state-manager.js] --> sm_sub[state/]
        gen[generator.js] --> gen_sub[generator/]
        pdt[phase-dev-templates.js] --> pdt_json[*.json files]
    end

    subgraph Utils
        vc[version-check.js] --> vc_sub[version/]
    end
```

## Risk Assessment

| Phase | Risk Level | Mitigation |
|-------|-----------|------------|
| Phase 1 | Low | Golden masters provide safety net |
| Phase 2 | Medium | High function count in init.js (169) - careful domain grouping needed |
| Phase 3 | Medium | Menu flows have complex state transitions - preserve navigation logic |
| Phase 4 | Medium | Schema exports widely consumed - re-export wrapper critical |
| Phase 5 | High | Largest file, most complex domain interactions - map functions first |
| Phase 6 | Low | Smaller files, patterns established from earlier phases |
| Phase 7 | Low | Verification only |
