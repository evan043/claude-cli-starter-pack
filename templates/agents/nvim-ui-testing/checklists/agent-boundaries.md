# Agent Boundaries Checklist

## ui-driver Agent
- [x] Can open/close CCASP UI
- [x] Can navigate menus and panels
- [x] Can trigger actions (flyout, rail, right panel)
- [x] Can validate window existence and config
- [x] Can capture snapshots
- [ ] CANNOT modify production code
- [ ] CANNOT fix bugs (delegates to ui-debugger)

## ui-debugger Agent
- [x] Can read test output and error logs
- [x] Can modify production code to fix bugs
- [x] Can modify test code
- [x] Can run tests to verify fixes
- [ ] CANNOT approve its own fixes (reports back)

## nvim-test-runner Agent
- [x] Can execute test scripts
- [x] Can parse test output
- [x] Can report pass/fail results
- [x] Can delegate failures to other agents
- [ ] CANNOT modify code
- [ ] CANNOT make judgment calls on test quality
