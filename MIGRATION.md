# Migration Guide

This guide helps you upgrade CCASP to the latest version while preserving your customizations.

---

## Quick Upgrade

```bash
# Update CCASP globally
npm update -g claude-cli-advanced-starter-pack

# Sync new features to your project
cd /path/to/your/project
ccasp init

# Restart Claude Code CLI (required)
claude .
```

**Note**: `ccasp init` preserves your customizations automatically using hash comparison.

---

## Upgrading to v2.3.0 (from v2.2.x)

### New Features

- Enhanced documentation system
  - `CHANGELOG.md` following Keep a Changelog format
  - `templates/INDEX.md` comprehensive command catalog
  - `templates/VARIABLES.md` complete variable reference
  - `templates/hooks/INDEX.md` hook documentation
- Improved discoverability for all templates
- Migration guide (this file)

### Breaking Changes

**None** - This is a documentation-focused release.

### Migration Steps

1. **Update CCASP package**
   ```bash
   npm update -g claude-cli-advanced-starter-pack
   ```

2. **Sync new documentation**
   ```bash
   cd /path/to/your/project
   ccasp init
   ```

3. **Verify new files**
   ```bash
   # Check for new documentation
   ls -la CHANGELOG.md
   ls -la templates/INDEX.md
   ls -la templates/VARIABLES.md
   ls -la templates/hooks/INDEX.md
   ```

4. **Restart Claude Code CLI**
   ```bash
   claude .
   ```

5. **Explore new documentation**
   - Run `/menu` to see all commands
   - Check `templates/INDEX.md` for command reference
   - Read `templates/VARIABLES.md` to understand variables

### Configuration Changes

**None required** - All existing configurations remain valid.

---

## Upgrading to v2.2.19 (from v2.2.18)

### New Features

- **Neovim Integration (nvim-ccasp)**
  - Zero-setup launcher: `ccasp neovim`
  - Multi-session Claude CLI terminals
  - Color-coded titlebars (8 colors)
  - Auto-insert mode on session click
  - Collapsible sidebar
  - Prompt injector v1.1.0

### Breaking Changes

**None**

### Migration Steps

1. **Update package**
   ```bash
   npm update -g claude-cli-advanced-starter-pack
   ```

2. **Try Neovim integration (optional)**
   ```bash
   ccasp neovim  # Auto-installs Neovim if missing
   ```

3. **Install permanently (optional)**
   ```bash
   ccasp nvim-setup
   ```

---

## Upgrading to v2.2.18 (from v2.2.17)

### New Features

- Critical commands auto-update system
- Self-healing `/update-check` command
- Auto-upgrade detection for outdated projects

### Breaking Changes

**None**

### Migration Steps

1. **Update package**
   ```bash
   npm update -g claude-cli-advanced-starter-pack
   ```

2. **Run init (auto-detects upgrade needs)**
   ```bash
   ccasp init
   ```

3. **Verify sync marker**
   ```bash
   # Check for sync marker
   cat .claude/commands/__ccasp-sync-marker.md
   ```

---

## Upgrading to v2.2.15 (from v2.2.14)

### New Features

- `.cjs` hook extension support
- `github-progress-hook.cjs` for TodoWrite matcher

### Breaking Changes

**Hook Registration**: If you have custom `.cjs` hooks, re-run `ccasp init` to register them.

### Migration Steps

1. **Update package**
   ```bash
   npm update -g claude-cli-advanced-starter-pack
   ```

2. **Re-register hooks**
   ```bash
   ccasp init
   ```

3. **Verify hook registration**
   ```bash
   cat .claude/settings.json | grep "\.cjs"
   ```

---

## Upgrading to v2.2.12 (from v2.2.11)

### New Features

- Type-specific GitHub issue templates (Feature, Refactor, Bug, Testing)
- CCASP-META machine-parseable comments
- Hook-based automatic GitHub sync

### Breaking Changes

**None**

### Migration Steps

1. **Update package**
   ```bash
   npm update -g claude-cli-advanced-starter-pack
   ```

2. **Sync new templates**
   ```bash
   ccasp init
   ```

3. **Copy issue templates to GitHub**
   ```bash
   mkdir -p .github/ISSUE_TEMPLATE
   cp .claude/.github/ISSUE_TEMPLATE/*.md .github/ISSUE_TEMPLATE/
   git add .github/ISSUE_TEMPLATE
   git commit -m "feat: add CCASP issue templates"
   git push
   ```

---

## Upgrading to v2.2.5 (from v2.2.4)

### New Features

- Smart sync for dev mode
- `/dev-mode-deploy-to-projects` command
- `/menu-happy` dedicated mobile menu

### Breaking Changes

**Mobile Menu**: `/menu` no longer auto-detects mobile mode. Use `/menu-happy` explicitly.

### Migration Steps

1. **Update package**
   ```bash
   npm update -g claude-cli-advanced-starter-pack
   ```

2. **Update Happy.engineering workflows**
   - Change `/menu` → `/menu-happy` in mobile sessions
   - Or keep using `/menu` for desktop

3. **Sync new commands**
   ```bash
   ccasp init
   ```

---

## Upgrading to v2.2.4 (from v2.2.3)

### New Features

- Comprehensive Playwright E2E integration
- Credential injection for tests
- Tunnel services integration

### Breaking Changes

**Happy Mode Detection**: `HAPPY_SERVER_URL` alone no longer triggers mobile mode. Requires active session indicators.

### Migration Steps

1. **Update package**
   ```bash
   npm update -g claude-cli-advanced-starter-pack
   ```

2. **Update Happy sessions**
   - Ensure Happy.engineering sets proper session indicators
   - Or manually trigger mobile mode with `/menu-happy`

3. **Configure E2E testing (if using Playwright)**
   ```bash
   ccasp init  # Syncs new Playwright integration
   ```

4. **Add test credentials to settings.json**
   ```json
   {
     "testing": {
       "e2e": {
         "credentials": {
           "testUser": "test@example.com",
           "testPassword": "secure-test-password"
         }
       }
     }
   }
   ```

---

## Upgrading from v2.1.x or earlier

### Major Changes in v2.2.0

- Vision Driver Bot (VDB) autonomous development
- GitHub Epic System with multi-issue workflows
- Modular command architecture
- L1/L2/L3 agent hierarchy

### Breaking Changes

**Command Structure**: Several large command files were split into modules. Custom integrations may need updates.

### Migration Steps

1. **Backup customizations**
   ```bash
   cp -r .claude .claude.backup
   ```

2. **Update package**
   ```bash
   npm update -g claude-cli-advanced-starter-pack
   ```

3. **Re-initialize**
   ```bash
   ccasp init --force  # Force full refresh
   ```

4. **Restore customizations**
   - Compare `.claude.backup` with new `.claude`
   - Manually merge custom changes

5. **Test slash commands**
   ```bash
   claude .
   /menu  # Verify all commands load
   ```

---

## Preserving Customizations

CCASP's smart sync preserves your customizations automatically:

### How It Works

1. **Hash Comparison**: During `ccasp init`, CCASP compares file hashes
2. **Skip Customized Files**: Files you've modified are skipped
3. **Add New Files**: New templates are added without overwriting

### Manual Override

To force update a specific file:

```bash
# Re-sync specific command
cp templates/commands/deploy-full.template.md .claude/commands/deploy-full.md

# Or force full refresh
ccasp init --force
```

### Preserving Settings

Your `.claude/settings.json` is **never overwritten** by `ccasp init`.

---

## Common Migration Issues

### Issue: Commands Don't Appear After Upgrade

**Solution**: Restart Claude Code CLI
```bash
# Exit current session
# Restart
claude .
```

### Issue: Hook Errors After Upgrade

**Solution**: Re-register hooks
```bash
ccasp init
# Restart Claude Code CLI
```

### Issue: Old Commands Still Running

**Solution**: Check for duplicate commands
```bash
# Remove old commands
rm -rf .claude/commands
# Re-sync
ccasp init
```

### Issue: Custom Agents Lost

**Solution**: Restore from backup
```bash
cp .claude.backup/agents/my-custom-agent.md .claude/agents/
```

### Issue: GitHub Integration Broken

**Solution**: Verify settings.json
```bash
cat .claude/settings.json | grep github
# Ensure projectNumber and projectId are present
```

---

## Rollback Instructions

If you need to rollback to a previous version:

1. **Uninstall current version**
   ```bash
   npm uninstall -g claude-cli-advanced-starter-pack
   ```

2. **Install specific version**
   ```bash
   npm install -g claude-cli-advanced-starter-pack@2.2.18
   ```

3. **Restore previous .claude directory**
   ```bash
   rm -rf .claude
   cp -r .claude.backup .claude
   ```

4. **Restart Claude Code CLI**
   ```bash
   claude .
   ```

---

## Version Compatibility Matrix

| CCASP Version | Claude Code CLI | Node.js | Features |
|---------------|-----------------|---------|----------|
| v2.3.0 | v0.5.0+ | 18+ | Documentation enhancement |
| v2.2.19 | v0.5.0+ | 18+ | Neovim integration |
| v2.2.18 | v0.5.0+ | 18+ | Self-healing updates |
| v2.2.15 | v0.5.0+ | 18+ | .cjs hook support |
| v2.2.12 | v0.5.0+ | 18+ | GitHub auto-sync |
| v2.2.5 | v0.5.0+ | 18+ | Smart sync |
| v2.2.4 | v0.5.0+ | 18+ | Playwright integration |
| v2.2.0 | v0.5.0+ | 18+ | VDB, Epic System |

---

## Getting Help

### Check Version

```bash
# CCASP version
npm list -g claude-cli-advanced-starter-pack

# Claude Code CLI version
claude --version
```

### Verify Installation

```bash
# Check for sync marker
cat .claude/commands/__ccasp-sync-marker.md

# List all commands
ls -la .claude/commands/*.md

# List all hooks
ls -la .claude/hooks/*.js
```

### Debug Issues

```bash
# Enable debug mode
export CLAUDE_DEBUG=1
export CLAUDE_DEBUG_HOOKS=1

# Run Claude Code CLI
claude .

# Check logs
cat .claude/logs/*.log
```

### Community Support

- [GitHub Issues](https://github.com/evan043/claude-cli-advanced-starter-pack/issues)
- [Discussions](https://github.com/evan043/claude-cli-advanced-starter-pack/discussions)
- [Wiki](https://github.com/evan043/claude-cli-advanced-starter-pack/wiki)

---

## Best Practices

1. **Always backup before major upgrades**
   ```bash
   cp -r .claude .claude.backup
   ```

2. **Test in non-production first**
   - Upgrade a development project first
   - Verify all commands work
   - Then upgrade production projects

3. **Read release notes**
   - Check [CHANGELOG.md](./CHANGELOG.md)
   - Review breaking changes
   - Plan migration steps

4. **Keep Claude Code CLI updated**
   ```bash
   npm update -g @anthropic/claude-code
   ```

5. **Restart after every upgrade**
   - Always restart Claude Code CLI after running `ccasp init`

---

## Future Migrations

### Upcoming in v2.4.0 (Planned)

- Jira Integration
- Linear Sync
- Vision Driver Bot v2
- Autonomous lint fixing

### Preparing for v2.4.0

1. Review your `.claude/settings.json` structure
2. Backup custom agents and hooks
3. Test with dev projects first
4. Monitor [GitHub releases](https://github.com/evan043/claude-cli-advanced-starter-pack/releases)

---

## Questions?

If you encounter issues during migration:

1. Check [CHANGELOG.md](./CHANGELOG.md) for version-specific notes
2. Search [GitHub Issues](https://github.com/evan043/claude-cli-advanced-starter-pack/issues)
3. Create a new issue with:
   - CCASP version (`npm list -g claude-cli-advanced-starter-pack`)
   - Claude Code CLI version (`claude --version`)
   - Error messages
   - Steps to reproduce
