---
description: Complete CCASP project setup - tech stack detection, agents, CLAUDE.md, GitHub, MCP configuration
model: sonnet
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
  - Write
  - Edit
  - Bash
  - AskUserQuestion
  - WebSearch
---

# /project-implementation-for-ccasp - Full Project Implementation

**This is the main command for CCASP project setup inside Claude Code CLI.**

After running `ccasp wizard` in the terminal, this command handles ALL intelligent operations:
- Tech stack detection and `tech-stack.json` generation
- **Stack-specific agent generation and configuration**
- CLAUDE.md audit and enhancement
- GitHub Project Board configuration
- MCP server recommendations
- Deployment automation setup

## Auto-Run Flow

When invoked (typically auto-injected after wizard completes):

### Step 1: Tech Stack Detection (ALWAYS FIRST)

**Deploy Explore agent** to scan the codebase:

1. **Scan package.json** for:
   - Framework: react, vue, angular, svelte, next, nuxt
   - State: redux, zustand, mobx, pinia, jotai
   - Styling: tailwind, styled-components, emotion, sass
   - Testing: jest, vitest, playwright, cypress
   - Build: vite, webpack, esbuild, parcel

2. **Check config files:**
   - `vite.config.*`, `webpack.config.*`, `rollup.config.*`
   - `tsconfig.json`, `jsconfig.json`
   - `tailwind.config.*`, `postcss.config.*`
   - `.eslintrc.*`, `prettier.config.*`
   - `playwright.config.*`, `jest.config.*`

3. **Identify backend (if present):**
   - `requirements.txt`, `pyproject.toml` → Python
   - `go.mod` → Go
   - `Cargo.toml` → Rust
   - `package.json` scripts with `node`, `ts-node` → Node.js

4. **Detect deployment configs:**
   - `railway.json`, `railway.toml` → Railway
   - `vercel.json` → Vercel
   - `wrangler.toml` → Cloudflare
   - `Dockerfile`, `docker-compose.yml` → Docker
   - `.github/workflows/` → GitHub Actions

5. **Save to `.claude/config/tech-stack.json`**

6. **MANDATORY: Display detected stack to user:**

```
╔═══════════════════════════════════════════════════════════════╗
║  🔍 TECH STACK DETECTED                                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Frontend:                                                    ║
║    Framework: React 19                                        ║
║    State: Zustand                                             ║
║    Styling: Tailwind CSS v4                                   ║
║    Build: Vite                                                ║
║                                                               ║
║  Backend:                                                     ║
║    Runtime: Node.js                                           ║
║    Framework: Express                                         ║
║                                                               ║
║  Testing:                                                     ║
║    Unit: Vitest                                               ║
║    E2E: Playwright                                            ║
║                                                               ║
║  Deployment:                                                  ║
║    Frontend: Cloudflare Pages                                 ║
║    Backend: Railway                                           ║
║    CI/CD: GitHub Actions                                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**IMPORTANT:** You MUST always display this summary to the user after detection completes. Never skip showing the detected tech stack.

---

### Step 2: Configure CCASP Customized Agents (CRITICAL)

**This step ensures stack-specific specialist agents are set up.**

1. **Check existing agents:**
   - Read `.claude/agents/` directory
   - Check `.claude/config/agents.json` registry
   - Identify if only example-agent exists (needs setup)

2. **If agents need configuration:**

   a. **Use AskUserQuestion:**
   ```
   header: "Agents"
   question: "Set up stack-specific specialist agents?"
   options:
     - "Yes - generate agents for my tech stack (recommended)"
     - "Skip - I'll configure agents manually"
   ```

   b. **If Yes, generate agents based on detected stack:**

   Map detected technologies to specialist agents:
   | Detected Tech | Agent Generated |
   |--------------|-----------------|
   | React | `frontend-react-specialist` |
   | Vue | `frontend-vue-specialist` |
   | FastAPI | `backend-fastapi-specialist` |
   | Express | `backend-express-specialist` |
   | Zustand | `state-zustand-specialist` |
   | Redux | `state-redux-specialist` |
   | PostgreSQL | `db-postgresql-specialist` |
   | Prisma | `orm-prisma-specialist` |
   | Playwright | `test-playwright-specialist` |
   | Vitest/Jest | `test-unit-specialist` |
   | Railway | `deploy-railway-specialist` |
   | Cloudflare | `deploy-cloudflare-specialist` |

   c. **Create agent files in `.claude/agents/`:**
   - Each agent gets a markdown file with frontmatter
   - Include: name, level (L2), domain, framework, tools, model, triggers, file patterns
   - Add framework-specific guidance in body

   d. **Create/update `.claude/config/agents.json` registry:**
   ```json
   {
     "version": "1.0",
     "generated": "2026-02-02T...",
     "techStack": { ... },
     "agents": [ ... ],
     "delegationRules": { ... }
   }
   ```

   e. **Set up delegation hooks** (if not already configured):
   - `task-classifier.js` - Routes tasks by keywords/patterns
   - `agent-delegator.js` - Delegates to appropriate specialist
   - Register hooks in `.claude/settings.json`

3. **Display generated agents:**
```
╔═══════════════════════════════════════════════════════════════╗
║  🤖 AGENTS CONFIGURED                                          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Generated 5 specialist agents for your stack:                ║
║                                                               ║
║  • frontend-react-specialist (L2)                             ║
║    Triggers: component, hook, jsx, tsx, react                 ║
║                                                               ║
║  • state-zustand-specialist (L2)                              ║
║    Triggers: store, state, zustand, slice                     ║
║                                                               ║
║  • test-playwright-specialist (L2)                            ║
║    Triggers: e2e, playwright, test, spec                      ║
║                                                               ║
║  • deploy-railway-specialist (L2)                             ║
║    Triggers: railway, deploy, backend                         ║
║                                                               ║
║  • deploy-cloudflare-specialist (L2)                          ║
║    Triggers: cloudflare, pages, frontend, wrangler            ║
║                                                               ║
║  Delegation hooks: ✓ Installed                                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

4. **If agents already configured:**
   - Show existing agent count and list
   - Offer to regenerate if tech stack changed

---

### Step 3: CLAUDE.md Setup

**Ask user via AskUserQuestion:**
```
header: "CLAUDE.md"
question: "How would you like to set up CLAUDE.md?"
options:
  - "Generate from scratch (recommended)"
  - "Enhance existing CLAUDE.md"
  - "Skip - I'll configure manually"
```

**If Generate/Enhance:**
1. Generate content based on detected stack:
   - Project overview
   - Tech stack summary
   - Key commands (build, test, dev, deploy)
   - Important paths and files
   - Architecture notes
   - Common gotchas

2. Show preview of generated content

3. Write to CLAUDE.md (backup existing if present)

---

### Step 4: GitHub Project Board (Optional)

**Ask user via AskUserQuestion:**
```
header: "GitHub"
question: "Connect to GitHub Project Board?"
options:
  - "Yes - configure now"
  - "Skip for now"
```

**If Yes:**
1. Check `gh` CLI authentication status
2. Detect existing project boards
3. Save configuration to `.claude/config/github-project.json`

---

### Step 5: MCP Server Discovery (Dynamic)

**IMPORTANT:** MCP recommendations MUST be discovered dynamically based on the user's actual tech stack. Do NOT hardcode or assume any specific platform.

1. **Default for web projects ONLY:**
   - Playwright MCP (if frontend detected) - Browser automation & E2E testing

2. **Dynamic Discovery (REQUIRED):**
   Use WebSearch to find relevant MCPs for the user's detected stack:

   a. **Build search queries from detected tech:**
   - If backend is Supabase → Search "Supabase MCP Claude"
   - If backend is AWS → Search "AWS MCP Claude integration"
   - If database is MongoDB → Search "MongoDB MCP server"
   - If deployment is Vercel → Search "Vercel MCP Claude"
   - If deployment is Railway → Search "Railway MCP Claude"
   - If deployment is Cloudflare → Search "Cloudflare MCP Claude"
   - etc.

   b. **Search queries to run:**
   ```
   "MCP server {detected-backend} Claude"
   "MCP server {detected-database} Claude"
   "MCP server {detected-deployment} Claude"
   "@modelcontextprotocol {technology} npm"
   "Claude MCP {framework} integration 2026"
   ```

   c. **For each discovered MCP, extract:**
   - Name and npm package
   - Description
   - API key requirements
   - Available tools

3. **Present discovered MCPs to user:**
   - Show source: [detected] = matched tech stack, [discovered] = from web search
   - Pre-check MCPs that match detected technologies
   - Allow user to select which to configure

4. **Example output:**
   ```
   ╔═══════════════════════════════════════════════════════════════╗
   ║  🔌 MCP SERVERS DISCOVERED                                     ║
   ╠═══════════════════════════════════════════════════════════════╣
   ║                                                               ║
   ║  Based on your detected stack (Supabase, Vercel, PostgreSQL): ║
   ║                                                               ║
   ║  [x] Playwright MCP [default for web]                         ║
   ║      Browser automation & E2E testing                         ║
   ║                                                               ║
   ║  [x] Supabase MCP [detected]                                  ║
   ║      Database queries, auth, storage                          ║
   ║                                                               ║
   ║  [x] Vercel MCP [detected]                                    ║
   ║      Deployment management, env vars                          ║
   ║                                                               ║
   ║  [ ] PostgreSQL MCP [discovered]                              ║
   ║      Direct database access (alt to Supabase)                 ║
   ║                                                               ║
   ║  [ ] Context7 MCP [discovered]                                ║
   ║      Documentation lookup                                     ║
   ║                                                               ║
   ╚═══════════════════════════════════════════════════════════════╝
   ```

**CRITICAL RULES:**
- NEVER recommend Railway MCP unless `railway.json` or `railway.toml` detected
- NEVER recommend Cloudflare MCP unless `wrangler.toml` detected
- NEVER recommend Vercel MCP unless `vercel.json` detected
- ALWAYS use WebSearch to discover MCPs for detected technologies
- ALWAYS show Playwright MCP if building a website (frontend detected)

---

### Step 6: Summary & Next Steps

Display intermediate completion summary:
```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ CCASP Core Setup Complete                                  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Tech Stack: ✓ Detected and saved                             ║
║  Agents:     ✓ 5 specialists configured                       ║
║  CLAUDE.md:  ✓ Generated/Enhanced                             ║
║  GitHub:     ✓ Connected (or skipped)                         ║
║  MCPs:       ✓ Configured (dynamically discovered)            ║
║                                                               ║
║  Proceeding to testing configuration...                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Step 7: Configure Testing Setup (Always Offered)

**IMPORTANT:** Always offer testing configuration at the end of project setup.

#### 7a. Detect Existing Testing Frameworks

1. **Detect existing testing frameworks:**
   - Check for `playwright.config.*` → Playwright E2E
   - Check for `cypress.config.*` → Cypress E2E
   - Check for `vitest.config.*` or jest in package.json → Unit testing
   - Check for `pytest.ini` or pytest in requirements.txt → Python testing

2. **Ask user via AskUserQuestion:**
   ```
   header: "Testing"
   question: "Would you like to configure your testing setup?"
   options:
     - "Yes - configure E2E and unit testing (recommended)"
     - "E2E only (Playwright/Cypress)"
     - "Unit tests only (Vitest/Jest/pytest)"
     - "Skip - I'll configure testing later"
   ```

#### 7b. E2E and Unit Testing Setup (if selected)

   a. **E2E Testing Setup:**
   - Detect or recommend framework:
     - Web project with JS → Playwright (recommended)
     - Existing Cypress → Use Cypress
   - Configure:
     - Base URL (localhost port or custom)
     - Browser selection (chromium, firefox, webkit)
     - Headless mode preference
     - Test directory location

   b. **Unit Testing Setup:**
   - Detect or recommend framework:
     - Vite project → Vitest
     - React/Node → Jest or Vitest
     - Python → pytest
   - Configure:
     - Test patterns (`**/*.test.ts`, `test_*.py`)
     - Coverage settings

#### 7c. Test Environment Configuration (NEW)

**Ask user about default test environment:**
```
header: "Test Environment"
question: "Where should E2E tests run by default?"
options:
  - "Always ask (recommended) - prompt each time tests run"
  - "Localhost with tunnel - test against local dev server"
  - "Production - test against deployed app"
```

**Save preference to tech-stack.json:**
```json
{
  "testing": {
    "environment": {
      "defaultMode": "ask"  // "ask" | "localhost" | "production"
    }
  }
}
```

#### 7d. Tunnel Service Configuration (NEW - if localhost selected or "always ask")

**Ask about tunnel service for exposing localhost:**
```
header: "Tunnel Service"
question: "How will you expose localhost for E2E testing?"
options:
  - "ngrok (recommended) - reliable, free tier available"
  - "localtunnel - free, no signup"
  - "cloudflare-tunnel - enterprise-grade, requires Cloudflare account"
  - "None - tests will use direct localhost (http://localhost:PORT)"
```

**If tunnel service selected, ask for optional subdomain:**
```
header: "Subdomain"
question: "Do you have a reserved subdomain? (Leave blank to skip)"
options:
  - "Enter subdomain" (text input)
  - "Skip - use random subdomain"
```

**Save tunnel configuration:**
```json
{
  "devEnvironment": {
    "tunnel": {
      "service": "ngrok",
      "subdomain": "my-app",
      "startCommand": "ngrok http 5173",
      "adminPort": 4040,
      "autoStart": false
    }
  }
}
```

**Display tunnel setup instructions:**
```
╔═══════════════════════════════════════════════════════════════╗
║  🚇 TUNNEL CONFIGURED                                          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Service: ngrok                                               ║
║  Subdomain: my-app (https://my-app.ngrok.dev)                 ║
║                                                               ║
║  Start tunnel with:                                           ║
║    ngrok http 5173                                            ║
║                                                               ║
║  Or use the slash command:                                    ║
║    /tunnel-start                                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

#### 7e. Backend Proxy Configuration (NEW - for frontend projects)

**Check if frontend framework detected. If yes, ask:**
```
header: "Backend Proxy"
question: "Does your frontend need to proxy API calls to a backend?"
options:
  - "Yes - configure Vite/Webpack proxy"
  - "No - frontend is standalone or uses direct API calls"
```

**If proxy needed:**
```
header: "Backend URL"
question: "Enter your backend API URL (e.g., Railway production URL):"
options:
  - (text input for URL)
```

**If Vite detected, offer to configure vite.config.ts:**
```
╔═══════════════════════════════════════════════════════════════╗
║  🔄 BACKEND PROXY SETUP                                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Add this to your vite.config.ts:                             ║
║                                                               ║
║  server: {                                                    ║
║    proxy: {                                                   ║
║      '/api': {                                                ║
║        target: 'https://bo360-backend.railway.app',           ║
║        changeOrigin: true,                                    ║
║        secure: true                                           ║
║      }                                                        ║
║    }                                                          ║
║  }                                                            ║
║                                                               ║
║  This routes /api/* calls to your Railway backend.            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**Ask if Claude should add the proxy config:**
```
header: "Auto-Configure"
question: "Would you like me to add the proxy configuration to vite.config.ts?"
options:
  - "Yes - add proxy configuration"
  - "No - I'll add it manually"
```

**Save backend proxy configuration:**
```json
{
  "devEnvironment": {
    "backendProxy": {
      "enabled": true,
      "target": "https://bo360-backend.railway.app",
      "pathPrefix": "/api"
    }
  }
}
```

#### 7f. Credentials Configuration (ENHANCED)

**Ask about credential management:**
```
header: "Test Credentials"
question: "How should test credentials be managed?"
options:
  - "Environment variables (recommended, secure)"
  - "Prompt on each run"
  - "Skip - no login required for tests"
```

**If environment variables selected, ask about injection:**
```
header: "Credential Setup"
question: "Would you like to set up test credentials now?"
options:
  - "Yes - save credentials to .env file now"
  - "No - I'll add them manually later"
```

**If yes, prompt for credentials:**
```
header: "Username"
question: "Enter test account username:"
(text input)

header: "Password"
question: "Enter test account password:"
(password input - masked)
```

**Inject credentials to .env file:**
1. Read existing .env (or create if not exists)
2. Add/update lines:
   ```
   # Test credentials (added by CCASP)
   TEST_USER_USERNAME=user@example.com
   TEST_USER_PASSWORD=testpassword123
   ```
3. Ensure .env is in .gitignore
4. Display confirmation:

```
╔═══════════════════════════════════════════════════════════════╗
║  🔐 CREDENTIALS CONFIGURED                                     ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Credentials saved to: .env                                   ║
║                                                               ║
║  Environment variables:                                       ║
║    TEST_USER_USERNAME = user@example.com                      ║
║    TEST_USER_PASSWORD = ********                              ║
║                                                               ║
║  ✓ .env added to .gitignore                                   ║
║                                                               ║
║  IMPORTANT: Never commit credentials to git!                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

#### 7g. Login Selectors Configuration

**Ask about login form selectors:**
```
header: "Login Selectors"
question: "Configure login form selectors for Playwright?"
options:
  - "Yes - I'll provide CSS selectors"
  - "Use defaults (data-testid attributes)"
  - "Skip - no login required"
```

**If custom selectors:**
```
header: "Username Selector"
question: "CSS selector for username input:"
default: "[data-testid=\"username-input\"]"

header: "Password Selector"
question: "CSS selector for password input:"
default: "[data-testid=\"password-input\"]"

header: "Login Button Selector"
question: "CSS selector for login button:"
default: "[data-testid=\"login-submit\"]"

header: "Success Indicator"
question: "CSS selector that appears after successful login:"
default: "[data-testid=\"dashboard\"]"
```

#### 7h. Ralph Loop Configuration

```
header: "Ralph Loop"
question: "Enable Ralph Loop for automated test-fix cycles?"
options:
  - "Yes - auto-fix failing tests (recommended)"
  - "No - manual testing only"
```

#### 7i. Save Complete Testing Configuration

**Save all testing configuration to `tech-stack.json`:**
```json
{
  "testing": {
    "e2e": {
      "framework": "playwright",
      "configFile": "playwright.config.ts",
      "baseUrl": "http://localhost:5173"
    },
    "unit": {
      "framework": "vitest",
      "testCommand": "npm test"
    },
    "environment": {
      "defaultMode": "ask"
    },
    "selectors": {
      "username": "[data-testid=\"username-input\"]",
      "password": "[data-testid=\"password-input\"]",
      "loginButton": "[data-testid=\"login-submit\"]",
      "loginSuccess": "[data-testid=\"dashboard\"]"
    },
    "credentials": {
      "source": "env",
      "usernameEnvVar": "TEST_USER_USERNAME",
      "passwordEnvVar": "TEST_USER_PASSWORD",
      "autoInject": true
    },
    "ralphLoop": {
      "enabled": true,
      "maxIterations": 10
    }
  },
  "devEnvironment": {
    "tunnel": {
      "service": "ngrok",
      "subdomain": "my-app",
      "startCommand": "ngrok http 5173",
      "autoStart": false
    },
    "backendProxy": {
      "enabled": true,
      "target": "https://backend.railway.app",
      "pathPrefix": "/api"
    }
  }
}
```

#### 7j. Display Complete Testing Summary

```
╔═══════════════════════════════════════════════════════════════╗
║  🧪 TESTING CONFIGURED                                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  E2E Testing:                                                 ║
║    Framework: Playwright                                      ║
║    Config: playwright.config.ts                               ║
║    Base URL: http://localhost:5173                            ║
║    Default Environment: Always Ask                            ║
║                                                               ║
║  Tunnel Service:                                              ║
║    Service: ngrok                                             ║
║    Command: ngrok http 5173                                   ║
║    URL: https://my-app.ngrok.dev (when active)                ║
║                                                               ║
║  Backend Proxy:                                               ║
║    Target: https://backend.railway.app                        ║
║    Path: /api/*                                               ║
║                                                               ║
║  Credentials:                                                 ║
║    Source: Environment variables (.env)                       ║
║    Username var: TEST_USER_USERNAME                           ║
║    Password var: TEST_USER_PASSWORD                           ║
║                                                               ║
║  Unit Testing:                                                ║
║    Framework: Vitest                                          ║
║    Command: npm test                                          ║
║                                                               ║
║  Ralph Loop: ✓ Enabled (max 10 iterations)                    ║
║                                                               ║
║  Run tests with:                                              ║
║    /e2e-test        - Run E2E tests                           ║
║    /ralph           - Auto test-fix cycle                     ║
║    /tunnel-start    - Start tunnel for localhost testing      ║
║    npm test         - Unit tests                              ║
║                                                               ║
║  Change settings:                                             ║
║    /menu → Settings → Testing Configuration                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Step 8: Final Summary

Display final completion summary:
```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ CCASP Setup Complete                                       ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Tech Stack: ✓ Detected and saved                             ║
║  Agents:     ✓ 5 specialists configured                       ║
║  CLAUDE.md:  ✓ Generated/Enhanced                             ║
║  GitHub:     ✓ Connected (or skipped)                         ║
║  MCPs:       ✓ Configured (dynamically discovered)            ║
║  Testing:    ✓ Configured                                     ║
║                                                               ║
║  Your stack-specific agents:                                  ║
║  • frontend-react-specialist                                  ║
║  • state-zustand-specialist                                   ║
║  • test-playwright-specialist                                 ║
║  • deploy-railway-specialist                                  ║
║  • deploy-cloudflare-specialist                               ║
║                                                               ║
║  Next steps:                                                  ║
║  • Type /menu to see all available commands                   ║
║  • Type /github-update to view project board                  ║
║  • Type /explore-mcp to discover more MCPs                    ║
║  • Type /e2e-test or /ralph to run tests                      ║
║  • Use Task tool to delegate to your specialists!             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Manual Menu (Alternative)

If user invokes command manually (not auto-injected):

| Key | Action | Description |
|-----|--------|-------------|
| **1** | Detect Tech Stack | Scan codebase and save tech-stack.json |
| **2** | Configure Agents | Generate stack-specific specialist agents |
| **3** | Audit CLAUDE.md | Analyze configuration against best practices |
| **4** | Enhance CLAUDE.md | Generate/improve documentation from codebase |
| **5** | Configure GitHub | Connect to GitHub Project Board |
| **6** | Discover MCPs | Web search for stack-specific MCP servers |
| **7** | Configure Testing | Set up E2E, unit tests, and Ralph Loop |
| **A** | Run All | Execute full setup flow (Steps 1-7) |
| **B** | Back to /menu | Return to main menu |

---

## Audit CLAUDE.md Details

When auditing:

1. **Read CLAUDE.md and .claude/ folder** to understand current setup
2. **Check length** - warn if >60 lines, error if >300 lines (Anthropic best practice)
3. **Find anti-patterns:**
   - Vague instructions ("be careful", "try to")
   - Long code blocks (>20 lines)
   - Missing runnable commands
   - No emphasis keywords (IMPORTANT, MUST, NEVER)
4. **Find good patterns:**
   - Emphasis keywords (IMPORTANT, MUST, CRITICAL)
   - Runnable bash commands
   - @imports for context
   - Clear, specific instructions
5. **Score and report findings:**
   - Green: Excellent (score 80-100)
   - Yellow: Good with improvements (score 60-79)
   - Red: Needs work (score <60)

---

## Mark Setup Complete

**IMPORTANT:** After completing the full setup flow, update the state file:

Use the Edit tool to update `.claude/config/ccasp-state.json`:
- Set `"projectImplCompleted": true`

This removes the setup recommendation banner from `/menu`.

---

## Terminal Alternative

```bash
npx ccasp wizard          # Terminal wizard (deploys files)
npx ccasp detect-stack    # Detect tech stack only
npx ccasp claude-audit    # Audit CLAUDE.md only
```

---

*Part of Claude CLI Advanced Starter Pack*
