---
description: Start a Happy Mode session for mobile app integration
model: sonnet
---

# /happy-start - Launch Happy CLI Session

Launches a new PowerShell terminal with Happy CLI wrapping Claude Code for mobile app control.

## What This Does

1. Opens a **new PowerShell window** in the current project directory
2. Runs the `happy` command (from `happy-coder` npm package)
3. Happy wraps Claude Code, enabling:
   - QR code for mobile app connection
   - Remote control from phone via Happy app
   - Push notifications for permission requests and errors

## Prerequisites

- `happy-coder` npm package installed globally: `npm install -g happy-coder`
- Claude Code CLI authenticated: `claude auth`
- Happy app: https://app.happy.engineering

## Instructions for Claude

**When this command is invoked, IMMEDIATELY execute the following Bash command:**

```bash
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '${CWD}'; happy"
```

After executing, respond with:

```
Happy Terminal Launched
──────────────────────
A new PowerShell window has opened running Happy CLI.

Look for the QR code in the new terminal to connect your mobile device.

This terminal session will close normally. The Happy session runs in the new window.
```

## Happy CLI Quick Reference

| Flag | Description |
|------|-------------|
| `happy` | Start with Claude Code (default) |
| `happy -m opus` | Use Opus model |
| `happy -p auto` | Auto-approve permissions |
| `happy auth` | Show QR code for mobile connection |

{{#if happyMode.enabled}}
## Project Configuration

| Setting | Value |
|---------|-------|
| Dashboard URL | {{happyMode.dashboardUrl}} |
| Default Verbosity | {{happyMode.verbosity}} |
{{/if}}

## Mobile App Connection

1. Install Happy app on your phone
2. Scan QR code shown in the new terminal
3. Control Claude Code from your phone!

---

*Requires: happy-coder npm package*
