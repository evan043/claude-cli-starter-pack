# Example: Auto Smoke Test on Save

## Scenario
Every time you edit a Lua file in `nvim-ccasp/`, the smoke test runs automatically.

## Hook Configuration (settings.json)
```json
{
  "hooks": {
    "afterEditTool": [
      {
        "matcher": "nvim-ccasp/**/*.lua",
        "command": "powershell -ExecutionPolicy Bypass -File scripts/nvim-smoke.ps1",
        "timeout": 30000
      }
    ]
  }
}
```

## What Happens
1. You edit `nvim-ccasp/lua/ccasp/appshell/icon_rail.lua`
2. Hook fires after the Edit tool completes
3. `nvim-smoke.ps1` runs headless smoke test
4. If test fails, Claude sees the failure output and can auto-fix

## Opting Out
To skip the hook for a specific edit, use the `--no-hooks` flag or temporarily disable in settings.
