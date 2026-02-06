# Pre-Release UI Testing Checklist

## Before Tagging a Release

- [ ] Run full test suite: `/ui-test`
- [ ] All smoke tests pass
- [ ] All keymap tests pass
- [ ] All layout tests pass
- [ ] Capture layout snapshot: `/ui-snapshot`
- [ ] Compare snapshot against last release baseline
- [ ] No unexpected window dimension changes
- [ ] No z-index regressions

## Appshell-Specific Checks

- [ ] Icon rail renders at 3-column width
- [ ] Flyout opens/closes for each section
- [ ] Header tabline displays correctly
- [ ] Footer renders at bottom
- [ ] Content zone fills remaining space
- [ ] Right panel (if enabled) renders with border

## Classic Layout Checks

- [ ] Sidebar opens correctly
- [ ] Terminal split works
- [ ] Toggle sidebar keybinding works

## Cross-Layout

- [ ] Switching between appshell and classic doesn't error
- [ ] Keymaps register correctly in both layouts
