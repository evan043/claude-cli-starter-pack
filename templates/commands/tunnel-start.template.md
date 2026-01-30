---
description: Start tunnel service for exposing local development server
model: haiku
---

# /tunnel-start - Start Development Tunnel

Expose your local development server to the internet for mobile testing or webhooks.

{{#if (neq devEnvironment.tunnel.service "none")}}

## Configuration

| Setting | Value |
|---------|-------|
| Service | {{devEnvironment.tunnel.service}} |
| Subdomain | {{devEnvironment.tunnel.subdomain}} |
| Start Command | `{{devEnvironment.tunnel.startCommand}}` |
{{#if devEnvironment.tunnel.adminPort}}
| Admin Port | {{devEnvironment.tunnel.adminPort}} |
{{/if}}

## Start Tunnel

{{#if (eq devEnvironment.tunnel.service "ngrok")}}
### ngrok

```bash
# Start tunnel
{{devEnvironment.tunnel.startCommand}}

# Check status (in another terminal)
curl http://localhost:{{devEnvironment.tunnel.adminPort}}/api/tunnels
```

After starting, get the public URL from:
- Terminal output
- ngrok dashboard at http://localhost:{{devEnvironment.tunnel.adminPort}}
{{/if}}

{{#if (eq devEnvironment.tunnel.service "localtunnel")}}
### localtunnel

```bash
# Install if needed
npm install -g localtunnel

# Start tunnel
{{devEnvironment.tunnel.startCommand}}
```

The public URL will be displayed in terminal output.
{{/if}}

{{#if (eq devEnvironment.tunnel.service "cloudflare-tunnel")}}
### Cloudflare Tunnel

```bash
# Start tunnel (requires cloudflared installed and authenticated)
{{devEnvironment.tunnel.startCommand}}
```

URL will be displayed in terminal. For persistent URL, configure a named tunnel in Cloudflare dashboard.
{{/if}}

{{#if (eq devEnvironment.tunnel.service "serveo")}}
### Serveo

```bash
# Start tunnel (no installation required)
{{devEnvironment.tunnel.startCommand}}
```

The assigned URL will be displayed. Note: Serveo may be unavailable at times.
{{/if}}

## Usage Notes

1. **Mobile Testing**: Use tunnel URL in mobile browser for testing
2. **Webhooks**: Configure webhook services to use tunnel URL
3. **Demos**: Share tunnel URL for quick demos

## Update tech-stack.json

After starting tunnel, update the URL:

```json
{
  "devEnvironment": {
    "tunnel": {
      "url": "<your-tunnel-url>"
    }
  }
}
```

## Instructions for Claude

When this command is invoked:

1. Check if tunnel service is installed
2. Display the start command
3. Offer to run the command
4. If run, capture and display the public URL
5. Update tech-stack.json with tunnel URL

{{else}}

## Tunnel Service Not Configured

No tunnel service is configured for this project.

To configure:
1. Run `/menu` → Project Settings → Tunnel Services
2. Select a tunnel service:
   - **ngrok** - Popular, reliable, requires account for reserved subdomains
   - **localtunnel** - Free, no signup required
   - **cloudflare-tunnel** - Enterprise-grade, requires Cloudflare account
   - **serveo** - Free SSH-based, may be unreliable

3. Optionally set a reserved subdomain

{{/if}}

---

*Generated from tech-stack.json template*
