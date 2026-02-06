# Hook Setup Checklist

## Prerequisites
- [ ] Neovim installed and in PATH
- [ ] plenary.nvim installed
- [ ] `nvim-ccasp/tests/minimal_init.lua` configured
- [ ] PowerShell 5+ available (Windows)

## Installation
- [ ] Run `ccasp init` to deploy hook templates
- [ ] Verify hooks appear in `.claude/settings.json`
- [ ] Test hook by editing any `.lua` file
- [ ] Confirm smoke test runs automatically

## Customization
- [ ] Adjust timeout if tests take longer than 30s
- [ ] Set `CCASP_TEST_VERBOSE=1` for detailed output
- [ ] Configure agent limit (default: 3 concurrent)

## Troubleshooting
- [ ] If hook doesn't fire: check matcher pattern
- [ ] If test hangs: verify `--headless` flag in script
- [ ] If plenary not found: check `minimal_init.lua` paths
