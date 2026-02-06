# MCP Neovim Integration

Optional integration between Claude Code MCP servers and Neovim for enhanced UI testing.

## Overview

This integration allows Claude Code to communicate with a running Neovim instance via MCP (Model Context Protocol), enabling:
- Real-time UI state queries
- Programmatic window manipulation
- Live snapshot capture
- Test execution within the running editor

## Status

**Template only** - This integration is documented but not yet implemented. The templates provide the configuration structure for when MCP-Neovim bridges become available.

## Architecture

```
Claude Code CLI
  ├── MCP Server (stdio/sse)
  │   └── neovim-bridge tool
  │       ├── nvim_eval(expr)
  │       ├── nvim_command(cmd)
  │       ├── nvim_get_windows()
  │       └── nvim_capture_snapshot()
  └── Neovim (--listen)
      └── RPC socket
```

## Configuration

See `config.example.json` for the MCP server configuration template.

## Prerequisites

- Neovim started with `--listen` flag: `nvim --listen /tmp/nvim.sock`
- MCP-compatible Neovim bridge (not yet available)
- Claude Code CLI with MCP support

## Future Work

- [ ] Implement MCP bridge using Neovim's RPC API
- [ ] Add real-time layout monitoring
- [ ] Support remote Neovim instances
- [ ] Integrate with test runner for live feedback
