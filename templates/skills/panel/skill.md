# CCASP Control Panel

Launch the CCASP Control Panel in a new terminal window for persistent command access.

## Instructions for Claude

**EXECUTE IMMEDIATELY**: Launch the panel in a new terminal window using the appropriate command for the detected platform.

### Platform Detection

Check the platform and run the appropriate command:

**Windows** (default - check for `COMSPEC` or `windir` environment variable):
```bash
start powershell -NoExit -Command "ccasp panel"
```

**macOS** (check for `TERM_PROGRAM=Apple_Terminal` or Darwin):
```bash
osascript -e 'tell application "Terminal" to do script "ccasp panel"'
```

**Linux** (gnome-terminal):
```bash
gnome-terminal -- ccasp panel &
```

### After Launch

Display this confirmation:

```
✅ CCASP Control Panel launched in a new terminal window!

┌─────────────────────────────────────────────────────────────────┐
│ CCASP Control Panel (NEW WINDOW)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Agents & Skills:                                               │
│    [A] Create Agent     [H] Create Hook      [S] Create Skill  │
│    [M] Explore MCP      [C] Claude Audit     [E] Explore Code  │
│                                                                 │
│  Quick Actions:                                                 │
│    [P] Phase Dev Plan   [G] GitHub Task      [T] Run E2E Tests │
│    [U] Update Check                                             │
│                                                                 │
│  Controls:                                                      │
│    [Q] Quit   [R] Refresh   [X] Clear Queue   [?] Help         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

How to use:
1. Switch to the new terminal window with the panel
2. Press a single key to select a command (e.g., 'A' for Create Agent)
3. Return to this Claude Code session
4. Press Enter on an empty prompt - the command will execute automatically

Note: If commands don't auto-execute, run: ccasp install-panel-hook --global
```

### First-Time Setup

If the user hasn't used the panel before, also mention:

```
First time using the panel? Install the hook for auto-execution:
  ccasp install-panel-hook --global

Then restart Claude Code CLI for the hook to take effect.
```

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│ Panel (NEW terminal)          │ Claude Code (THIS terminal)     │
├───────────────────────────────┼─────────────────────────────────┤
│ User presses 'A'              │                                 │
│   ↓                           │                                 │
│ Queue: /create-agent          │                                 │
│   ↓                           │                                 │
│                               │ User presses Enter              │
│                               │   ↓                             │
│                               │ Hook reads queue                │
│                               │   ↓                             │
│                               │ Executes /create-agent          │
└───────────────────────────────┴─────────────────────────────────┘

Queue file: ~/.claude/ccasp-panel/command-queue.json
```
