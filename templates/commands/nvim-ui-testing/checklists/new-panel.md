# New Panel Testing Checklist

## When Adding a New Panel to CCASP

- [ ] Panel module has `open()`, `close()`, `toggle()` functions
- [ ] Panel creates floating window with correct `relative` config
- [ ] Panel sets appropriate `zindex`
- [ ] Panel respects appshell content zone bounds
- [ ] Panel registers in the window manager
- [ ] Panel adds keybindings for open/close
- [ ] Panel cleans up buffer on close
- [ ] Smoke test updated to include new panel
- [ ] Layout test validates new panel dimensions
- [ ] Snapshot captures new panel correctly
