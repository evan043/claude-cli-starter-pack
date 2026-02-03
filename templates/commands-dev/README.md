# Dev-Only Command Templates

These templates are **NOT deployed to user projects** by `ccasp init`.

They are for CCASP contributors who clone/fork the repository and need developer tooling.

## Commands in this folder

| Command | Purpose |
|---------|---------|
| `dev-mode` | Set up git worktrees for isolated CCASP development |
| `dev-mode-merge` | Merge worktree changes back to main branch |
| `dev-mode-deploy-to-projects` | Sync worktree changes to registered projects |

## How to use (for CCASP contributors)

After cloning/forking CCASP:

```bash
# Copy dev commands to your .claude/commands/
cp templates/commands-dev/*.template.md .claude/commands/
cd .claude/commands/
for f in *.template.md; do mv "$f" "${f%.template.md}.md"; done

# Or manually copy just what you need
cp templates/commands-dev/dev-mode.template.md .claude/commands/dev-mode.md
```

Then restart Claude Code CLI to see the new commands.

## Why separate?

Regular users installing via `npm install -g claude-cli-advanced-starter-pack` don't need these commands. Keeping them separate prevents cluttering user projects with developer-only tooling.
