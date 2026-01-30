# MCP Servers

Model Context Protocol (MCP) servers extend Claude Code CLI with additional capabilities. CCASP helps you discover and configure MCP servers for your tech stack.

## What is MCP?

MCP (Model Context Protocol) is Anthropic's standard for connecting Claude to external tools and services. MCP servers provide:

- **Tools** - Functions Claude can call
- **Resources** - Data Claude can access
- **Prompts** - Predefined instructions

## Exploring MCP Servers

### Via Slash Command

```
/explore-mcp
```

### Via Terminal

```bash
ccasp explore-mcp              # Interactive menu
ccasp explore-mcp --recommend  # Auto-recommend based on codebase
ccasp explore-mcp --testing    # Quick install testing servers
```

## Available Categories

### Testing

| Server | Purpose |
|--------|---------|
| `playwright` | Browser automation and E2E testing |
| `puppeteer` | Chrome automation |
| `browser-monitor` | Monitor browser state |

### Version Control

| Server | Purpose |
|--------|---------|
| `github` | GitHub API integration |
| `gitlab` | GitLab API integration |

### Deployment

| Server | Purpose |
|--------|---------|
| `railway` | Railway deployment management |
| `cloudflare` | Cloudflare Workers/Pages |
| `vercel` | Vercel deployments |

### Database

| Server | Purpose |
|--------|---------|
| `postgres` | PostgreSQL queries |
| `sqlite` | SQLite database |
| `redis` | Redis cache |

### Communication

| Server | Purpose |
|--------|---------|
| `slack` | Slack messaging |
| `discord` | Discord bot |
| `email` | Email sending |

### Utilities

| Server | Purpose |
|--------|---------|
| `filesystem` | File operations |
| `fetch` | HTTP requests |
| `memory` | Persistent memory |

## Configuring MCP Servers

### Claude Desktop Config

MCP servers are configured in Claude's config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`

### Configuration Format

```json
{
  "mcpServers": {
    "railway": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-railway"],
      "env": {
        "RAILWAY_API_TOKEN": "your-token"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "your-token"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-playwright"]
    }
  }
}
```

## Common MCP Servers

### Railway MCP

Deploy and manage Railway services:

```json
{
  "railway": {
    "command": "npx",
    "args": ["-y", "@anthropic/mcp-server-railway"],
    "env": {
      "RAILWAY_API_TOKEN": "your-api-token"
    }
  }
}
```

**Available Tools**:
- `deployment_trigger` - Start deployment
- `deployment_status` - Check status
- `deployment_logs` - View logs
- `service_list` - List services
- `variable_set` - Set env vars

**Usage in Claude**:
```
mcp__railway-mcp-server__deployment_trigger({
  projectId: "abc123",
  serviceId: "def456"
})
```

### GitHub MCP

Interact with GitHub API:

```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "@anthropic/mcp-server-github"],
    "env": {
      "GITHUB_TOKEN": "ghp_xxxx"
    }
  }
}
```

**Available Tools**:
- `create_issue` - Create issues
- `list_issues` - List issues
- `create_pull_request` - Create PRs
- `get_file_contents` - Read files
- `search_code` - Search code

### Playwright MCP

Browser automation:

```json
{
  "playwright": {
    "command": "npx",
    "args": ["-y", "@anthropic/mcp-server-playwright"]
  }
}
```

**Available Tools**:
- `browser_navigate` - Go to URL
- `browser_click` - Click element
- `browser_fill` - Fill form
- `browser_screenshot` - Take screenshot
- `browser_snapshot` - Get page state

### Memory MCP

Persistent knowledge storage:

```json
{
  "memory": {
    "command": "npx",
    "args": ["-y", "@anthropic/mcp-server-memory"]
  }
}
```

**Available Tools**:
- `store` - Save information
- `retrieve` - Get information
- `list` - List stored items
- `delete` - Remove items

## Using MCP Tools

### Direct Invocation

In Claude Code CLI, MCP tools are available as:
```
mcp__<server-name>__<tool-name>
```

Example:
```
mcp__railway-mcp-server__deployment_trigger({
  projectId: "abc123",
  serviceId: "def456",
  environmentId: "ghi789"
})
```

### In Slash Commands

Reference MCP tools in your commands:

```markdown
## Deploy Backend

Use the Railway MCP to deploy:

mcp__railway-mcp-server__deployment_trigger with:
- projectId: {{deployment.backend.projectId}}
- serviceId: {{deployment.backend.serviceId}}
```

### In Agents

Agents can use MCP tools:

```markdown
---
name: deployment-agent
type: L2
---

## Tools Available
- mcp__railway-mcp-server__deployment_trigger
- mcp__railway-mcp-server__deployment_status
- mcp__railway-mcp-server__deployment_logs
```

## CCASP Integration

### Auto-Detection

CCASP detects which MCP servers would be useful:

```bash
ccasp explore-mcp --recommend
```

Based on your tech stack:
- React project → Playwright recommended
- Railway in config → Railway MCP recommended
- GitHub repo → GitHub MCP recommended

### Quick Install

```bash
ccasp explore-mcp --testing    # Install Playwright + Puppeteer
ccasp explore-mcp --deployment # Install Railway + Cloudflare
ccasp explore-mcp --all        # Install all recommended
```

### Configuration Generation

CCASP can generate MCP config:

```bash
ccasp explore-mcp --generate-config
```

Creates or updates your Claude config file.

## Troubleshooting

### MCP Server Not Found

1. Check server is in config:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. Verify package exists:
   ```bash
   npx -y @anthropic/mcp-server-railway --help
   ```

3. Restart Claude Code CLI

### Authentication Errors

1. Check env vars are set:
   ```json
   {
     "env": {
       "RAILWAY_API_TOKEN": "must-be-valid"
     }
   }
   ```

2. Regenerate tokens if expired

3. Check token permissions

### Tool Not Available

1. Check tool name is correct (case-sensitive)

2. Verify server provides that tool:
   ```bash
   npx @anthropic/mcp-server-railway --list-tools
   ```

3. Restart Claude after config changes

### Performance Issues

1. Limit concurrent MCP servers

2. Use local servers when possible

3. Check network connectivity for remote servers

## Best Practices

### 1. Minimal Configuration

Only add MCP servers you'll use:
```json
{
  "mcpServers": {
    "railway": { ... },  // Only if deploying to Railway
    "playwright": { ... } // Only if doing E2E tests
  }
}
```

### 2. Secure Tokens

Never commit tokens to git:
```bash
# Use environment variables
export RAILWAY_API_TOKEN="your-token"
```

Or use a secret manager.

### 3. Version Lock

Pin MCP server versions for stability:
```json
{
  "args": ["-y", "@anthropic/mcp-server-railway@1.2.3"]
}
```

### 4. Test Before Using

Verify MCP servers work:
```bash
# Test the server directly
npx @anthropic/mcp-server-railway --test
```

## See Also

- [Features](Features) - CCASP features using MCP
- [Templates](Templates) - MCP in templates
- [Troubleshooting](Troubleshooting) - More help
