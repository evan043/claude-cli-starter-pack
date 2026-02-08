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

### Step 0.5: Read CCASP Panel Configuration (ALWAYS FIRST)

**MANDATORY:** Before asking ANY questions, check if the user has pre-configured their preferences via the nvim-ccasp Project Configuration panel.

1. **Read the panel config file:**
   - **Path:** `~/.ccasp/project-config.json` (cross-platform: use `$HOME/.ccasp/project-config.json`)
   - Use the Read tool to check if this file exists

2. **If the file exists, parse it:**
   ```json
   {
     "version": "1.0.0",
     "app_mode": "commercial_saas" | "commercial_single" | "personal",
     "features": {
       "compliance": boolean,
       "multi_tenancy": boolean,
       "rbac": boolean,
       "billing": boolean,
       "api_contracts": boolean,
       "route_maps": boolean,
       "deployment": boolean,
       "agents": boolean,
       "github_integration": boolean,
       "mcp_servers": boolean,
       "phased_dev": boolean,
       "hooks": boolean
     }
   }
   ```

3. **Use the config to AUTO-SELECT decisions throughout this workflow:**

   | Panel Config Key | Affects Step | Auto-Selection |
   |-----------------|-------------|----------------|
   | `app_mode = "commercial_saas"` | Step 1.5 | Skip question, select "Yes - commercial SaaS" |
   | `app_mode = "commercial_single"` | Step 1.5 | Skip question, select "Yes - commercial but single-tenant" |
   | `app_mode = "personal"` | Step 1.5 | Skip question, select "No - internal/personal project" |
   | `features.compliance = false` | Step 7k | Skip compliance documentation setup |
   | `features.multi_tenancy = false` | Step 1.6b | Skip multi-tenancy configuration |
   | `features.rbac = false` | Step 1.6c | Skip RBAC role definition |
   | `features.billing = false` | Step 1.6 | Skip entire billing & entitlements configuration |
   | `features.api_contracts = false` | Step 7k | Skip API_CONTRACT.md generation |
   | `features.route_maps = false` | Step 7k | Skip ROUTES.md generation |
   | `features.deployment = false` | Step 5 | Skip deployment MCP recommendations |
   | `features.agents = false` | Step 2 | Skip agent generation entirely |
   | `features.github_integration = false` | Step 4 | Skip GitHub Project Board setup |
   | `features.mcp_servers = false` | Step 5 | Skip MCP server discovery |
   | `features.phased_dev = false` | Step 7l | Skip roadmap enforcement setup |
   | `features.hooks = false` | Step 2e | Skip delegation hook setup |

4. **Stub behavior for disabled features in commercial modes:**
   - When `app_mode` is `"commercial_saas"` or `"commercial_single"` AND a feature is disabled:
     - Still create the config entry in `tech-stack.json` but mark it as `"stubbed": true`
     - Add comment: `"_note": "CCASP:STUB — enable via Project Configuration panel"`
   - When `app_mode` is `"personal"` AND a feature is disabled:
     - Skip entirely — do not create any config entry for that feature

5. **Display detected panel config:**

```
╔═══════════════════════════════════════════════════════════════╗
║  CCASP Panel Configuration Detected                          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Source: ~/.ccasp/project-config.json                         ║
║                                                               ║
║  App Mode: Commercial SaaS                                    ║
║                                                               ║
║  Enabled Features:                                            ║
║    ✓ Compliance    ✓ Multi-Tenancy    ✓ RBAC                  ║
║    ✓ Billing       ✓ API Contracts    ✗ Route Maps            ║
║    ✓ Deployment    ✓ Agents           ✓ GitHub                ║
║    ✓ MCP Servers   ✓ Phased Dev       ✓ Hooks                 ║
║                                                               ║
║  Disabled features will be: stubbed (CCASP:STUB)              ║
║                                                               ║
║  Using these preferences for auto-configuration.              ║
║  Questions for disabled features will be skipped.             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

6. **If the file does NOT exist:**
   - Continue with the normal question-based flow (no auto-selection)
   - Display notice: "Tip: Use the Project Configuration panel in nvim-ccasp to pre-configure these settings."

7. **Save panel config reference to `tech-stack.json`:**
   ```json
   {
     "panel_config": {
       "source": "~/.ccasp/project-config.json",
       "loaded_at": "{{timestamp}}",
       "app_mode": "{{panel_config.app_mode}}",
       "features": { ... }
     }
   }
   ```

---

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

### Step 1.5: Detect Commercial Application Mode

**FIRST: Check panel config from Step 0.5.**

If `panel_config` was loaded AND `panel_config.app_mode` is set:
- **Auto-select** the application type based on `panel_config.app_mode`:
  - `"commercial_saas"` → select "Yes - commercial SaaS"
  - `"commercial_single"` → select "Yes - commercial but single-tenant"
  - `"personal"` → select "No - internal/personal project"
- Display: "App mode auto-configured from CCASP panel: **{mode}**"
- **Skip the question below** — proceed directly to the corresponding action

**ONLY if panel config was NOT loaded**, fall back to detection + question:

**Check for commercial SaaS indicators:**
1. Scan project for auth/tenancy patterns (auth middleware, tenant models, RBAC decorators)
2. Check CLAUDE.md or project description for keywords: "SaaS", "commercial", "multi-tenant", "production", "sell"
3. Check if competitor URLs were previously analyzed (`.claude/visions/*/compliance-audit.json`)

**Ask user about application type:**

```
header: "App Type"
question: "Is this a commercial/SaaS application?"
options:
  - label: "Yes - commercial SaaS (Recommended for production apps)"
    description: "Full compliance: multi-tenancy, RBAC, API contracts, route maps, licensing"
  - label: "Yes - commercial but single-tenant"
    description: "IP compliance + RBAC + API contracts (no multi-tenancy)"
  - label: "No - internal/personal project"
    description: "Skip commercial compliance setup"
```

**If commercial SaaS selected:**
1. Store compliance mode in `tech-stack.json`:
   ```json
   {
     "compliance": {
       "mode": "commercial-saas",
       "enabled": true,
       "configured_at": "{{timestamp}}"
     }
   }
   ```
2. Create `.claude/compliance/` directory
3. Copy `commercial-saas-rules.md` policy to `.claude/compliance/COMMERCIAL_SAAS_RULES.md`
4. Copy `commercial-compliance-policy.md` to `.claude/compliance/IP_COMPLIANCE_POLICY.md`
5. **Proceed to billing & entitlements configuration (Step 1.6)**
6. Display compliance activation notice:

```
╔═══════════════════════════════════════════════════════════════╗
║  Commercial SaaS Compliance Activated                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Mode: Commercial SaaS (Full Compliance)                     ║
║                                                              ║
║  Enabled:                                                    ║
║  • Multi-tenancy (default ON)                                ║
║  • Role-based access control (RBAC)                          ║
║  • SPA route map enforcement                                 ║
║  • API contract documentation                                ║
║  • IP/originality compliance                                 ║
║  • Dependency license auditing                               ║
║                                                              ║
║  Policy files saved to .claude/compliance/                   ║
║                                                              ║
╚═══════════════════════════════════════════════════════════════╝
```

**If single-tenant selected:**
1. Store `compliance.mode = "ip-only"` in `tech-stack.json`
2. Create `.claude/compliance/` with IP policy only
3. Skip multi-tenancy requirements

**If internal/personal selected:**
1. Store `compliance.mode = "disabled"` in `tech-stack.json`
2. Skip compliance setup entirely

---

### Step 1.6: SaaS Billing & Entitlements Configuration (If Commercial SaaS)

**IMPORTANT:** This step ONLY runs when `compliance.mode === "commercial-saas"` was selected in Step 1.5. Billing and entitlements are a FIRST-CLASS foundation — they MUST be designed BEFORE major feature development begins.

**Panel config gate:** If `panel_config.features.billing === false`, skip this entire step. In commercial modes, save a stub entry to `tech-stack.json`:
```json
{ "billing": { "stubbed": true, "_note": "CCASP:STUB — enable via Project Configuration panel" } }
```
Similarly, if `panel_config.features.multi_tenancy === false`, skip Step 1.6b (multi-tenancy). If `panel_config.features.rbac === false`, skip Step 1.6c (RBAC).

#### 1.6a. Subscription Plan Definition

**Ask user about pricing model:**
```
header: "Pricing"
question: "How many subscription tiers will your app have?"
options:
  - "3 tiers (Free, Pro, Business) (Recommended)"
  - "4 tiers (Free, Starter, Pro, Business)"
  - "4 tiers + Enterprise (custom pricing)"
  - "Custom - I'll define tiers manually"
```

**For each selected tier model, pre-populate plan scaffolding:**
- **Free**: $0/mo, limited features, no payment required
- **Starter** (if 4-tier): $9–19/mo, core features, limited seats/storage
- **Pro**: $29–49/mo, full features, higher limits
- **Business**: $99–199/mo, all features, team management, priority support
- **Enterprise** (if selected): Custom pricing, SLA, dedicated support

**Ask about billing periods:**
```
header: "Billing"
question: "Which billing periods should be supported?"
options:
  - "Monthly + Annual with discount (Recommended)"
  - "Monthly only"
  - "Annual only"
  - "Monthly + Annual + Lifetime"
```

**Ask about free trial policy:**
```
header: "Free Trial"
question: "Offer a free trial for paid plans?"
options:
  - "14-day free trial (Recommended)"
  - "7-day free trial"
  - "30-day free trial"
  - "No free trial"
```

**Save billing configuration to `tech-stack.json`:**
```json
{
  "billing": {
    "provider": "stripe",
    "plans": {
      "tier_count": 3,
      "tiers": ["free", "pro", "business"],
      "enterprise": false
    },
    "billing_periods": ["monthly", "annual"],
    "annual_discount_percent": 20,
    "free_trial": {
      "enabled": true,
      "days": 14
    },
    "configured_at": "{{timestamp}}"
  }
}
```

#### 1.6b. Multi-Tenancy Strategy

**Ask about tenant resolution:**
```
header: "Tenancy"
question: "How should tenants be identified?"
options:
  - "tenant_id in JWT claims (Recommended for APIs)"
  - "Subdomain-based (e.g., acme.yourapp.com)"
  - "Path-based (e.g., /org/acme/...)"
  - "Custom - I'll define the strategy"
```

**Ask about tenant isolation level:**
```
header: "Isolation"
question: "Tenant data isolation strategy?"
options:
  - "Row-level isolation with tenant_id column (Recommended)"
  - "Schema-per-tenant (stronger isolation, more complex)"
  - "Database-per-tenant (strongest, enterprise-only)"
```

**Save tenancy config:**
```json
{
  "compliance": {
    "multi_tenancy": {
      "enabled": true,
      "strategy": "jwt_tenant_id",
      "isolation": "row_level"
    }
  }
}
```

#### 1.6c. RBAC Role Definition

**Ask about roles:**
```
header: "Roles"
question: "Which roles does your application need?"
multiSelect: true
options:
  - "user (default member)"
  - "admin (tenant administrator)"
  - "super_admin (system-wide, your team only)"
  - "viewer (read-only access)"
```

**Save RBAC config:**
```json
{
  "compliance": {
    "rbac": {
      "enabled": true,
      "roles": ["user", "admin", "super_admin"],
      "enforcement": "server_side"
    }
  }
}
```

#### 1.6d. Stripe Integration Preferences

**Ask about Stripe checkout flow:**
```
header: "Stripe Flow"
question: "Which Stripe checkout method?"
options:
  - "Stripe Checkout (hosted page, fastest to implement) (Recommended)"
  - "Stripe Elements (embedded in your UI, more control)"
  - "Stripe Payment Links (no-code, simplest)"
```

**Ask about billing portal:**
```
header: "Self-Service"
question: "Enable Stripe Billing Portal for self-service?"
options:
  - "Yes - customers manage their own billing (Recommended)"
  - "No - admin-only billing management"
```

**Save Stripe preferences:**
```json
{
  "billing": {
    "stripe": {
      "checkout_method": "stripe_checkout",
      "billing_portal": true,
      "webhooks_required": [
        "checkout.session.completed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "invoice.payment_succeeded",
        "invoice.payment_failed"
      ]
    }
  }
}
```

#### 1.6e. Display Billing Foundation Summary

```
╔═══════════════════════════════════════════════════════════════╗
║  SaaS Billing Foundation Configured                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Subscription Plans:                                         ║
║    Tiers: Free / Pro / Business                              ║
║    Billing: Monthly + Annual (20% annual discount)           ║
║    Free Trial: 14 days                                       ║
║                                                              ║
║  Multi-Tenancy:                                              ║
║    Strategy: JWT tenant_id                                   ║
║    Isolation: Row-level (tenant_id column)                   ║
║                                                              ║
║  RBAC Roles: user, admin, super_admin                        ║
║    Enforcement: Server-side (mandatory)                      ║
║                                                              ║
║  Stripe Integration:                                         ║
║    Checkout: Stripe Checkout (hosted)                        ║
║    Billing Portal: Enabled                                   ║
║    Webhooks: 6 events configured                             ║
║                                                              ║
║  IMPORTANT: Billing foundation will be Phase 1 of any        ║
║  roadmap generated for this project. Feature development     ║
║  MUST NOT begin until billing + entitlements are working.    ║
║                                                              ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Step 2: Configure CCASP Customized Agents (CRITICAL)

**Panel config gate:** If `panel_config.features.agents === false`, skip this entire step. Display: "Agent generation skipped (disabled in panel config)."

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
   | Commercial SaaS mode | `compliance-saas-specialist` |
   | Stripe/Billing (SaaS) | `billing-saas-specialist` |

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

**Panel config gate:** If `panel_config.features.github_integration === false`, skip this entire step. Display: "GitHub integration skipped (disabled in panel config)."

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

**Panel config gate:** If `panel_config.features.mcp_servers === false`, skip this entire step. Display: "MCP server discovery skipped (disabled in panel config)." If `panel_config.features.deployment === false`, skip deployment-related MCP recommendations (Railway, Cloudflare, Vercel) but still offer non-deployment MCPs.

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

### Step 7k: Compliance Documentation Setup (If Commercial Mode Active)

**Panel config gates for individual documents:**
- If `panel_config.features.compliance === false`: Skip this entire step
- If `panel_config.features.api_contracts === false`: Skip API_CONTRACT.md generation
- If `panel_config.features.route_maps === false`: Skip ROUTES.md generation
- If `panel_config.features.rbac === false`: Skip RBAC.md generation
- If `panel_config.features.billing === false`: Skip billing deliverables (PLANS_AND_ENTITLEMENTS.md, ENTITLEMENTS_SPEC.md, STRIPE_SPEC.md)

**Check if commercial compliance was activated in Step 1.5:**
```javascript
const compliance = techStack.compliance || {};
const isCommercial = compliance.mode === 'commercial-saas';
const isSingleTenant = compliance.mode === 'ip-only';
```

**If commercial SaaS mode is active**, scaffold mandatory compliance documents:

1. **Generate ROUTES.md:**
   - Read the project's router configuration (React Router, Vue Router, etc.)
   - Pre-populate routes from detected patterns
   - Ask user to confirm or extend the route list
   - Save to project root as `ROUTES.md`
   - Template: `templates/compliance/routes.template.md`

2. **Generate API_CONTRACT.md:**
   - Scan for existing API endpoints (Express routes, FastAPI paths, etc.)
   - Ask user for API base URL
   - Pre-populate endpoints from detected patterns
   - Save to project root as `API_CONTRACT.md`
   - Template: `templates/compliance/api-contract.template.md`

3. **Generate RBAC.md:**
   - Ask user for role definitions or use defaults (user/admin/super_admin)
   - Generate permission matrix from routes + endpoints
   - Save to project root as `RBAC.md`
   - Template: `templates/compliance/rbac.template.md`

4. **Generate DESIGN_ORIGIN.md:**
   - Use existing template: `templates/compliance/design-origin.template.md`
   - Pre-populate with project name and date
   - Save to project root as `DESIGN_ORIGIN.md`

5. **If SaaS billing was configured in Step 1.6, generate billing deliverables:**

   a. **Generate PLANS_AND_ENTITLEMENTS.md:**
      - Read billing config from `tech-stack.json` (`billing.plans`, `billing.free_trial`)
      - For each tier, scaffold:
        - Price and billing period (monthly/annual)
        - Plan limits (seats, storage, projects, API calls)
        - Included features by `feature_key`
        - Upgrade/downgrade behavior and proration strategy
      - Include feature inventory table with columns:
        - `feature_key` (stable identifier, e.g., `feat_advanced_analytics`)
        - Plan availability (which tiers include it)
        - Limit model (`boolean` on/off OR `metered` with cap)
        - Role restrictions (admin-only features)
        - Tenant-level vs user-level entitlement
      - Save to project root as `PLANS_AND_ENTITLEMENTS.md`

   b. **Generate ENTITLEMENTS_SPEC.md:**
      - Define how entitlements are computed, stored, cached, and enforced
      - MUST include:
        - Server-side entitlement computation (source of truth)
        - `GET /api/me/entitlements` snapshot endpoint spec
        - Frontend consumption pattern (read-only, never enforce alone)
        - API middleware enforcement pattern
        - Route guard enforcement pattern
        - Background job entitlement checks (if applicable)
      - Gating must apply to: routes, UI components, API endpoints, background jobs
      - Save to project root as `ENTITLEMENTS_SPEC.md`

   c. **Generate STRIPE_SPEC.md:**
      - Read Stripe config from `tech-stack.json` (`billing.stripe`)
      - Include:
        - Stripe Products/Prices mapping to app tiers
        - Checkout flow (Checkout, Elements, or Payment Links — as configured)
        - Billing Portal configuration
        - Webhook events and their handlers:
          - `checkout.session.completed`
          - `customer.subscription.created/updated/deleted`
          - `invoice.payment_succeeded`
          - `invoice.payment_failed`
        - Database fields for billing objects:
          - `tenant_id`, `stripe_customer_id`, `stripe_subscription_id`
          - `plan_id`/`price_id`, `status`, `current_period_end`
          - `cancel_at_period_end`, `trial_end`
        - Webhook signature verification requirement
        - Upgrade/downgrade/cancel flows
      - Save to project root as `STRIPE_SPEC.md`

   d. **Enhance existing API_CONTRACT.md with billing endpoints:**
      - Add billing-specific endpoints:
        - `POST /api/billing/create-checkout-session` (auth, any role, tenant-scoped)
        - `POST /api/billing/webhook` (no auth, Stripe signature verified)
        - `GET /api/billing/subscription` (auth, admin, tenant-scoped)
        - `POST /api/billing/portal-session` (auth, admin, tenant-scoped)
        - `GET /api/me/entitlements` (auth, any role, tenant-scoped)
      - Each endpoint declares: auth requirement, role requirement, tenant scope, entitlement gate

   e. **Enhance existing ROUTES.md with entitlement gates:**
      - Add entitlement column to route table
      - Mark which routes require specific plan tier or feature_key
      - Add billing-specific routes:
        - `/billing` (admin, authenticated)
        - `/billing/plans` (public or authenticated)
        - `/billing/success` (authenticated, post-checkout)
        - `/billing/cancel` (authenticated)
        - `/settings/subscription` (admin, authenticated)

6. **Save compliance config to tech-stack.json:**
   ```json
   {
     "compliance": {
       "mode": "commercial-saas",
       "enabled": true,
       "configured_at": "{{timestamp}}",
       "multi_tenancy": {
         "enabled": true,
         "strategy": "jwt_tenant_id",
         "isolation": "row_level"
       },
       "rbac": {
         "enabled": true,
         "roles": ["user", "admin", "super_admin"]
       },
       "documentation": {
         "design_origin": "draft",
         "routes_md": "draft",
         "api_contract": "draft",
         "rbac_md": "draft",
         "plans_and_entitlements": "draft",
         "entitlements_spec": "draft",
         "stripe_spec": "draft"
       }
     }
   }
   ```

7. **Display compliance documentation summary:**
```
╔═══════════════════════════════════════════════════════════════╗
║  Compliance & Billing Documentation Generated               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Core Compliance:                                            ║
║  ROUTES.md:               ✓ Generated (+ entitlement gates)  ║
║  API_CONTRACT.md:         ✓ Generated (+ billing endpoints)  ║
║  RBAC.md:                 ✓ Generated (review and update)    ║
║  DESIGN_ORIGIN.md:        ✓ Generated (review and update)    ║
║                                                              ║
║  SaaS Billing (NEW):                                         ║
║  PLANS_AND_ENTITLEMENTS.md: ✓ Plan tiers + feature matrix    ║
║  ENTITLEMENTS_SPEC.md:      ✓ Gating architecture spec       ║
║  STRIPE_SPEC.md:            ✓ Stripe integration spec        ║
║                                                              ║
║  These are living documents — update them as you build.      ║
║  Roadmap compliance gates will check these before execution. ║
║                                                              ║
║  CRITICAL: Billing foundation (tenant + RBAC + Stripe +      ║
║  entitlements) MUST be Phase 1 of your roadmap. Do NOT       ║
║  implement premium features until gating works end-to-end.   ║
║                                                              ║
╚═══════════════════════════════════════════════════════════════╝
```

**If single-tenant mode (ip-only):**
- Generate only DESIGN_ORIGIN.md
- Skip ROUTES.md, API_CONTRACT.md, RBAC.md (optional for single-tenant)

**If compliance disabled:**
- Skip this entire step

---

### Step 7l: SaaS Billing Roadmap Enforcement (If Commercial SaaS)

**Panel config gate:** If `panel_config.features.phased_dev === false`, skip roadmap enforcement. If `panel_config.features.billing === false`, skip billing-specific enforcement rules but keep general compliance rules.

**IMPORTANT:** This step configures enforcement rules that ALL subsequent roadmap/phase-dev operations MUST respect. This ensures billing infrastructure is built BEFORE feature code.

#### Roadmap Phase Ordering (MANDATORY for SaaS projects)

When `/phase-dev-plan` or `/create-roadmap` is invoked for a commercial SaaS project, the roadmap MUST follow this phase ordering:

**Phase 1 — Billing Foundation (MUST be first):**
1. Tenant model + membership table (user ↔ tenant ↔ role)
2. RBAC middleware (server-side enforcement)
3. Stripe customer creation on tenant signup
4. Stripe subscription lifecycle (create, upgrade, downgrade, cancel)
5. Webhook handlers for all configured events
6. Entitlements snapshot endpoint (`GET /api/me/entitlements`)
7. Feature gating middleware for API routes
8. Route guards on frontend (read entitlements, gate components)

**Phase 2 — User Registration & Tenant Onboarding:**
1. User signup → creates user + tenant + membership records
2. Invite flow (user joins existing tenant)
3. Admin member management
4. Role assignment rules
5. Post-signup billing redirect (if paid plan required)

**Phase 3+ — Feature Development (ONLY after Phases 1-2 pass audit):**
- All feature code MUST use the entitlements system
- Every new endpoint MUST declare: auth, role, tenant scope, entitlement gate
- Every new route MUST declare: auth, role, entitlement requirement
- No "premium" feature may be implemented without a corresponding `feature_key`

#### Implementation Rules (Saved to `.claude/compliance/BILLING_RULES.md`)

Generate and save the following enforcement rules:

```markdown
# SaaS Billing Implementation Rules

## FORBIDDEN — Do NOT proceed if any of these are true:
- Premium features implemented without plan gating
- API endpoints without auth + role + tenant scope declarations
- Frontend enforcing entitlements without server-side backup
- Direct database access from frontend
- Raw card details stored anywhere (Stripe handles payment data)
- Webhook handlers without signature verification
- Cross-tenant data accessible via any endpoint

## REQUIRED — Before implementing feature modules:
1. Multi-tenancy enforced on ALL data queries
2. RBAC enforced server-side on ALL routes and APIs
3. Stripe subscription state synced via webhooks (NOT polling)
4. Plan → entitlements → feature gating works end-to-end
5. All routes and endpoints declare required entitlements
6. Entitlements snapshot endpoint returns correct data per tenant+plan

## Self-Audit Checklist (Run before each phase):
- [ ] Can a user from Tenant A access Tenant B's data? (MUST be NO)
- [ ] Can a non-admin user access admin-only endpoints? (MUST be NO)
- [ ] Does the frontend gate features that the API also gates? (MUST be YES)
- [ ] Are Stripe webhooks the source of truth for subscription state? (MUST be YES)
- [ ] Is every new feature mapped to a feature_key in PLANS_AND_ENTITLEMENTS.md? (MUST be YES)

## Default Fallback — When uncertain:
- Choose server-side enforcement
- Choose explicit entitlements over implicit
- Choose conservative permissions
- Choose strong tenant isolation
```

#### Save Enforcement Config

**Add to `tech-stack.json`:**
```json
{
  "billing": {
    "enforcement": {
      "roadmap_phase_1": "billing_foundation",
      "roadmap_phase_2": "registration_onboarding",
      "feature_dev_gate": "phases_1_2_must_pass_audit",
      "rules_file": ".claude/compliance/BILLING_RULES.md"
    }
  }
}
```

**Display enforcement activation:**
```
╔═══════════════════════════════════════════════════════════════╗
║  SaaS Billing Roadmap Enforcement Active                    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Phase ordering enforced:                                    ║
║    Phase 1: Billing Foundation (tenant, RBAC, Stripe, gates) ║
║    Phase 2: Registration & Onboarding                        ║
║    Phase 3+: Feature development (gated by audit)            ║
║                                                              ║
║  Rules saved to: .claude/compliance/BILLING_RULES.md         ║
║                                                              ║
║  Any /phase-dev-plan or /create-roadmap for this project     ║
║  will enforce billing-first phase ordering.                  ║
║                                                              ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### Step 8: Final Summary

Display final completion summary:
```
╔═══════════════════════════════════════════════════════════════╗
║  CCASP Setup Complete                                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Tech Stack:  ✓ Detected and saved                            ║
║  Agents:      ✓ Specialists configured                        ║
║  CLAUDE.md:   ✓ Generated/Enhanced                            ║
║  GitHub:      ✓ Connected (or skipped)                        ║
║  MCPs:        ✓ Configured (dynamically discovered)           ║
║  Testing:     ✓ Configured                                    ║
║  Compliance:  ✓ Commercial SaaS (or: Disabled)                ║
║  Billing:     ✓ SaaS billing configured (or: N/A)             ║
║                                                               ║
║  Next steps:                                                  ║
║  • Type /menu to see all available commands                   ║
║  • Type /github-update to view project board                  ║
║  • Type /explore-mcp to discover more MCPs                    ║
║  • Type /e2e-test or /ralph to run tests                      ║
║  • Use Task tool to delegate to your specialists!             ║
║                                                               ║
║  If SaaS billing is active:                                   ║
║  • /phase-dev-plan will enforce billing-first phase ordering  ║
║  • Review PLANS_AND_ENTITLEMENTS.md before feature dev        ║
║  • Review STRIPE_SPEC.md before Stripe integration            ║
║  • Review ENTITLEMENTS_SPEC.md for gating architecture        ║
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
| **8** | SaaS Billing Setup | Configure plans, Stripe, entitlements, and gating |
| **A** | Run All | Execute full setup flow (Steps 1-8) |
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
