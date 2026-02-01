# Happy Mobile UI Guidelines

**CRITICAL**: These guidelines apply to ALL CCASP commands that display tables, menus, or formatted output.

## Detection (REQUIRED FIRST STEP)

Before displaying ANY formatted output (tables, menus, cards, lists), check for Happy CLI environment:

```bash
env | grep -E "^HAPPY_(HOME_DIR|SERVER_URL|WEBAPP_URL|EXPERIMENTAL|SESSION)" || echo "NONE"
```

**If ANY Happy variable found → Use Mobile Format**
**If NONE → Use Standard Desktop Format**

## Mobile Formatting Rules

### Width Constraints
- **Maximum width**: 40 characters total
- **Content width**: 36 characters (leaves 4 for borders)
- **Never truncate mid-word**: Always wrap at word boundaries

### Box Drawing Characters
```
Top border:    ┌─────┐
Middle border: ├─────┤
Bottom border: └─────┘
Vertical:      │
Horizontal:    ─
```

### Layout Patterns

#### 1. Simple Menu
```
┌────────────────────────────────────┐
│ Menu Title                         │
└────────────────────────────────────┘

[1] Option One
    Short description here

[2] Option Two
    Another description

──────────────────────────────────────

[Q] Exit

Enter key:
```

#### 2. Card-Based List (like /pr-merge)
```
┌────────────────────────────────────┐
│ [1] #42                     01/15  │
│ @johndoe                           │
├────────────────────────────────────┤
│ Add JWT auth flow with             │
│ refresh tokens for secure          │
│ API access and session mgmt        │
├────────────────────────────────────┤
│ Status: Ready                      │
│ • CI passing                       │
│ • 2 approvals                      │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ [2] #38                     01/12  │
│ @janesmith                         │
├────────────────────────────────────┤
│ Fix memory leak in cache           │
│ manager causing high CPU           │
├────────────────────────────────────┤
│ Status: Behind                     │
│ • Update branch needed             │
└────────────────────────────────────┘
```

#### 3. Stacked Fields
```
┌────────────────────────────────────┐
│ Project Information                │
├────────────────────────────────────┤
│ Name: My Project                   │
│ Version: 1.0.5                     │
│ Tech: React, Node, PostgreSQL      │
├────────────────────────────────────┤
│ Status: Active                     │
│ Last Deploy: 2 hours ago           │
└────────────────────────────────────┘
```

### Text Wrapping Algorithm

When text exceeds 36 characters:

1. Split on word boundaries (spaces)
2. Never break in the middle of a word
3. Fill each line up to 36 chars
4. Continue on next line

**Example:**
```
Input: "Add user authentication with JWT tokens and refresh flow"

Output:
│ Add user authentication with      │
│ JWT tokens and refresh flow       │
```

**BAD (Don't do this):**
```
│ Add user authentication with JW   │  ← Word cut off!
│ T tokens and refresh flow         │
```

### Separator Lines

Use horizontal lines to separate sections:
```
──────────────────────────────────────
```
(36 dashes for content, 40 total with padding)

### Spacing

- Add blank line between cards
- Add blank line after section headers
- Add blank line before prompts

### Status Indicators

Use emoji/symbols sparingly:
```
✓ Success
✗ Error
⚠ Warning
• Bullet point
→ Arrow/continuation
```

## Example Conversions

### Desktop Table → Mobile Cards

**Desktop (76 chars):**
```
╔══════════════════════════════════════════════════════════════════════════╗
║  #   │ Issue        │ Status   │ Priority │ Assigned       │ Updated    ║
╠══════════════════════════════════════════════════════════════════════════╣
║  42  │ Add JWT auth │ Ready    │ High     │ @johndoe       │ 2h ago     ║
║  38  │ Fix leak     │ Behind   │ Medium   │ @janesmith     │ 1d ago     ║
╚══════════════════════════════════════════════════════════════════════════╝
```

**Mobile (40 chars):**
```
┌────────────────────────────────────┐
│ [1] Issue #42                      │
│ Add JWT auth                       │
├────────────────────────────────────┤
│ Status: Ready                      │
│ Priority: High                     │
│ @johndoe • 2h ago                  │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ [2] Issue #38                      │
│ Fix leak                           │
├────────────────────────────────────┤
│ Status: Behind                     │
│ Priority: Medium                   │
│ @janesmith • 1d ago                │
└────────────────────────────────────┘
```

## Commands Requiring Mobile Support

All commands with tables/menus MUST implement Happy detection:

### High Priority (Frequently Used)
- `/menu` - Main menu ✓ (COMPLETED)
- `/pr-merge` - PR selection menu ✓ (Already mobile-friendly)
- `/menu-issues-list` - Issue list
- `/github-task-start` - Task selection
- `/ccasp-panel` - Control panel
- `/update-smart` - Update selection menu

### Medium Priority (Submenus)
- `/project-implementation-for-ccasp` - Setup wizard
- `/ccasp-setup` - Configuration wizard
- `/explore-mcp` - MCP server list
- `/phase-dev-plan` - Phase selection

### Low Priority (Status Displays)
- `/github-update` - Project board status
- `/update-check` - Version info
- `/detect-tech-stack` - Tech stack display

## Implementation Checklist

For each command with formatted output:

- [ ] Add Happy detection check at the start
- [ ] Create mobile-formatted version of all tables/menus
- [ ] Implement word-wrapping for long text
- [ ] Test with HAPPY_HOME_DIR environment variable
- [ ] Verify no horizontal scrolling on 40-char width
- [ ] Ensure all text is readable without truncation

## Testing

To test mobile formatting locally:

```bash
# Set Happy environment variable
export HAPPY_HOME_DIR=/path/to/.happy

# Run command
/menu

# Verify output is max 40 chars wide
# Verify no mid-word breaks
# Verify readable on mobile screen
```

## References

- `/pr-merge` command - Reference implementation
- `src/utils/mobile-table.js` - Formatting utilities
- `src/cli/mobile-menu.js` - Mobile menu renderer
- `.claude/hooks/happy-mode-detector.js` - Detection hook

---

*CCASP Mobile UI Guidelines - v1.0*
