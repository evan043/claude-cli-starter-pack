---
description: Mobile-friendly menu optimized for Happy.Engineering CLI (no overflow)
model: sonnet
---

# /menu-for-happy-ui - Mobile-Optimized CCASP Menu

Display the CCASP menu in a mobile-friendly format that doesn't overflow on small screens.

## Purpose

This command is a fallback for when automatic Happy CLI detection fails. It forces the mobile-optimized menu layout regardless of environment.

## When to Use

- Running CCASP through Happy Coder mobile app
- Using a narrow terminal window
- Automatic detection (`HAPPY_*` env vars) not working
- Preference for compact menu layout

## Mobile Menu Features

- **Max 40 character width** - No horizontal scrolling
- **Single-column layout** - Easy vertical scrolling
- **Minimal decorations** - Less visual noise
- **Inline panel** - No new window launch (works with Happy)

## Menu Layout

```
╔══════════════════════════════════╗
║ CCASP v1.x                       ║
║ Mobile Menu                      ║
╚══════════════════════════════════╝
 ✓ Configured

1) Create Task
2) Decompose Issue
3) Sync Tasks
──────────────────────────────────
4) Setup
5) List Tasks
6) Install Command
──────────────────────────────────
P) Panel (inline)
T) Test Setup
A) Agent Creator
M) MCP Explorer
──────────────────────────────────
S) Settings
?) Help
Q) Exit
```

## Instructions for Claude

When this command is invoked:

1. **Display Mobile Banner**
   - Use 36-character width box
   - Show version number (truncated)
   - Show configuration status

2. **Present Menu Options**
   - Single column with numbered shortcuts
   - Separator lines using `─` (34 chars)
   - No descriptions (too wide for mobile)

3. **Handle Selection**
   - Route to appropriate handler
   - For panel: display inline (no new window)
   - Return to menu after each action

4. **Settings Submenu**
   - Same compact format
   - Quick access to: GitHub, Deployment, Tunnel, Token, Happy

## Comparison with Standard Menu

| Feature | Standard | Mobile |
|---------|----------|--------|
| Width | 76 chars | 36 chars |
| Columns | Multi | Single |
| Descriptions | Full | None |
| Panel launch | New window | Inline |
| ASCII art | Full banner | Minimal |

## Automatic Detection

CCASP automatically detects Happy CLI via environment variables:

```javascript
// Auto-detected when any of these are set:
process.env.HAPPY_HOME_DIR
process.env.HAPPY_SERVER_URL
process.env.HAPPY_WEBAPP_URL
```

If these are set, `/menu` automatically uses mobile layout. Use `/menu-for-happy-ui` only when auto-detection fails.

## Related Commands

- `/menu` - Standard menu (auto-detects Happy)
- `/happy-start` - Initialize Happy Mode session
- `/ccasp-panel` - Standard panel (new window)

---

*For Happy.Engineering mobile CLI users*
