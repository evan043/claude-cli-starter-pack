# Troubleshooting

Common issues and solutions for CCASP.

## Installation Issues

### `ccasp` command not found

**Problem**: After installation, `ccasp` command isn't recognized.

**Solutions**:

1. Check global installation:
   ```bash
   npm list -g claude-cli-advanced-starter-pack
   ```

2. Check npm global bin is in PATH:
   ```bash
   npm bin -g
   # Add this to your PATH if not present
   ```

3. Reinstall globally:
   ```bash
   npm uninstall -g claude-cli-advanced-starter-pack
   npm install -g claude-cli-advanced-starter-pack
   ```

4. Use npx instead:
   ```bash
   npx ccasp wizard
   ```

### Permission denied during install

**Problem**: `EACCES` errors during npm install.

**Solutions**:

1. Fix npm permissions:
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   # Add ~/.npm-global/bin to PATH
   ```

2. Or use sudo (not recommended):
   ```bash
   sudo npm install -g claude-cli-advanced-starter-pack
   ```

### Postinstall script fails

**Problem**: Postinstall message doesn't appear or errors.

**Solutions**:

1. Check Node.js version (18+ required):
   ```bash
   node --version
   ```

2. Skip postinstall temporarily:
   ```bash
   CCASP_SKIP_POSTINSTALL=1 npm install -g claude-cli-advanced-starter-pack
   ```

---

## Setup Issues

### Slash commands not available

**Problem**: After running `ccasp init`, slash commands don't work.

**Solutions**:

1. **Restart Claude Code CLI** - This is the most common issue:
   ```bash
   # Exit current session
   # Then restart
   claude .
   ```

2. Check .claude folder exists:
   ```bash
   ls -la .claude/commands/
   ```

3. Verify command files:
   ```bash
   cat .claude/commands/menu.md
   ```

4. Re-run init:
   ```bash
   ccasp init --force
   ```

### Tech stack detection fails

**Problem**: `ccasp detect-stack` shows wrong or empty results.

**Solutions**:

1. Check you're in the project root:
   ```bash
   pwd
   ls package.json  # Should exist for JS projects
   ```

2. Run with verbose output:
   ```bash
   ccasp detect-stack --verbose
   ```

3. Manually create tech-stack.json:
   ```json
   {
     "project": { "name": "my-project" },
     "frontend": { "framework": "react" }
   }
   ```

### .claude folder not created

**Problem**: Running init doesn't create .claude folder.

**Solutions**:

1. Check for errors:
   ```bash
   ccasp init 2>&1 | head -50
   ```

2. Check write permissions:
   ```bash
   touch .test-write && rm .test-write
   ```

3. Create manually and re-run:
   ```bash
   mkdir .claude
   ccasp init
   ```

---

## Command Issues

### `/menu` shows error

**Problem**: Menu command fails or shows incomplete.

**Solutions**:

1. Verify menu.md exists:
   ```bash
   cat .claude/commands/menu.md
   ```

2. Check for syntax errors in command file

3. Regenerate menu:
   ```bash
   ccasp init --command menu --force
   ```

### Commands missing features

**Problem**: Expected commands aren't available.

**Solutions**:

1. Check which features are enabled:
   ```bash
   cat .claude/tech-stack.json | grep -A 10 features
   ```

2. Re-run setup with needed features:
   ```bash
   ccasp wizard
   # Select features
   ```

### Command arguments not working

**Problem**: Slash command ignores arguments.

**Solution**: Arguments work differently in Claude Code CLI:
```
# Wrong - arguments as command
/github-task-start 123

# Right - Claude interprets naturally
/github-task-start
# Then say: "Start task 123"
```

---

## Agent Issues

### Agent not found

**Problem**: Task tool can't find the agent.

**Solutions**:

1. Check agent file exists:
   ```bash
   ls .claude/agents/
   ```

2. Verify frontmatter is valid:
   ```yaml
   ---
   name: my-agent
   type: L2
   ---
   ```

3. Restart Claude Code CLI after creating agent

### Agent not executing properly

**Problem**: Agent runs but doesn't do expected work.

**Solutions**:

1. Check agent has correct tools listed:
   ```yaml
   ## Tools Available
   - Read, Write, Edit
   - Bash
   ```

2. Verify model is appropriate:
   ```yaml
   model: sonnet  # Not haiku for complex tasks
   ```

3. Check context files are accessible:
   ```yaml
   ## Context Files
   - src/components/**/*.tsx  # Verify this pattern matches
   ```

---

## Hook Issues

### Hook not triggering

**Problem**: Hook doesn't run when expected.

**Solutions**:

1. Check hook is enabled in settings.json:
   ```json
   {
     "hooks": {
       "enabled": true,
       "preToolUse": ["my-hook"]
     }
   }
   ```

2. Verify hook file is valid JavaScript:
   ```bash
   node --check .claude/hooks/pre-tool-use/my-hook.js
   ```

3. Check tool filter matches:
   ```javascript
   tools: ['Edit', 'Write']  // Must match tool being used
   ```

### Hook blocking everything

**Problem**: All operations are blocked.

**Solutions**:

1. Check hook logic for bugs

2. Temporarily disable hooks:
   ```json
   {
     "hooks": { "enabled": false }
   }
   ```

3. Check for overly broad tool filters:
   ```javascript
   // ❌ Blocks everything
   tools: ['*']

   // ✅ Specific tools
   tools: ['Bash']
   ```

### Hook performance issues

**Problem**: Claude is slow due to hooks.

**Solutions**:

1. Profile slow hooks

2. Avoid file system scans in hooks:
   ```javascript
   // ❌ Slow
   const files = await glob('**/*');

   // ✅ Fast
   const file = context.params.file_path;
   ```

3. Use caching for expensive operations

---

## GitHub Integration Issues

### GitHub commands fail

**Problem**: `/github-update` or related commands error.

**Solutions**:

1. Check gh CLI is authenticated:
   ```bash
   gh auth status
   ```

2. Verify project configuration:
   ```json
   {
     "github": {
       "owner": "username",
       "repo": "repo-name",
       "projectNumber": 3
     }
   }
   ```

3. Check repo access:
   ```bash
   gh repo view owner/repo
   ```

### Project Board not syncing

**Problem**: Changes don't appear on GitHub.

**Solutions**:

1. Verify project board exists and is accessible

2. Check project number (not ID):
   ```bash
   gh project list
   ```

3. Ensure proper permissions for project boards

---

## Phased Development Issues

### PROGRESS.json not updating

**Problem**: Task completion not saved.

**Solutions**:

1. Check file is writable:
   ```bash
   ls -la .claude/phase-dev/project/PROGRESS.json
   ```

2. Verify JSON is valid:
   ```bash
   cat .claude/phase-dev/project/PROGRESS.json | jq .
   ```

3. Manually fix corrupted JSON

### Phase stuck

**Problem**: Can't move to next phase.

**Solutions**:

1. Check success criteria:
   ```
   /phase-track project --show-criteria
   ```

2. Force phase completion:
   ```json
   // Edit PROGRESS.json
   { "phases": [{ "status": "completed" }] }
   ```

3. Check for blockers:
   ```
   /phase-track project --show-blockers
   ```

---

## Template Issues

### Placeholders not resolving

**Problem**: `{{variable}}` appears in output instead of value.

**Solutions**:

1. Check variable exists in tech-stack.json:
   ```bash
   cat .claude/tech-stack.json | jq '.deployment.backend'
   ```

2. Use conditionals for optional values:
   ```handlebars
   {{#if deployment.backend}}
   {{deployment.backend.platform}}
   {{/if}}
   ```

3. Run template with debug:
   ```bash
   ccasp process-template --debug template.md
   ```

### Conditional blocks not working

**Problem**: `{{#if}}` blocks always/never show.

**Solutions**:

1. Check condition value is truthy:
   ```javascript
   // These are falsy:
   null, undefined, false, 0, ""

   // These are truthy:
   true, 1, "string", {}, []
   ```

2. Use equality check for strings:
   ```handlebars
   {{#if (eq platform "railway")}}
   ```

---

## Performance Issues

### Claude sessions are slow

**Problem**: Responses take too long.

**Solutions**:

1. Check token usage:
   ```
   /context-audit
   ```

2. Reduce context by archiving:
   - Split into smaller tasks
   - Start new session

3. Disable unused hooks

4. Reduce context files in agents/skills

### High memory usage

**Problem**: Node.js process uses too much memory.

**Solutions**:

1. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

2. Reinstall dependencies:
   ```bash
   npm uninstall -g claude-cli-advanced-starter-pack
   npm install -g claude-cli-advanced-starter-pack
   ```

---

## Getting Help

### Check Logs

```bash
# Terminal output
ccasp command 2>&1 | tee output.log

# Claude Code logs (location varies)
# macOS: ~/Library/Logs/Claude/
# Linux: ~/.local/share/claude/logs/
```

### Report Issues

1. Search existing issues:
   https://github.com/evan043/claude-cli-advanced-starter-pack/issues

2. Create new issue with:
   - CCASP version: `ccasp --version`
   - Node.js version: `node --version`
   - OS and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant logs

### Community

- GitHub Discussions
- Issues for bugs
- PRs welcome!
