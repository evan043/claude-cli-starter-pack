# CLAUDE.md Guide

CLAUDE.md is the primary configuration file for Claude Code CLI. It tells Claude about your project, coding standards, and special instructions.

## What is CLAUDE.md?

CLAUDE.md is a markdown file in your project root that Claude reads at the start of every session. It provides:

- Project overview
- Tech stack information
- Coding conventions
- Important paths and patterns
- Special instructions

## Location

```
your-project/
├── CLAUDE.md           # Project-level instructions
├── .claude/
│   └── ...
└── ...
```

You can also have a global CLAUDE.md:
```
~/.claude/CLAUDE.md     # User-level instructions (all projects)
```

## Basic Structure

```markdown
# Project Name

Brief description of the project.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19, Vite, Tailwind |
| Backend | FastAPI, PostgreSQL |
| Testing | Vitest, Playwright |

## Key Locations

| Type | Path |
|------|------|
| Frontend | apps/web/ |
| Backend | backend/ |
| Tests | tests/ |

## Important Commands

```bash
# Development
npm run dev

# Testing
npm test

# Build
npm run build
```

## Coding Conventions

- Use TypeScript strict mode
- Prefer functional components
- Use Zustand for state management

## Special Instructions

- Always run tests before committing
- Use conventional commits
```

## Best Practices

### 1. Keep It Concise

Claude reads this at every session start. Shorter is better.

```markdown
# ❌ Too verbose
This project is a comprehensive full-stack web application that
provides users with the ability to manage their tasks and
collaborate with team members in real-time. It was started in
2023 and has grown to support over 10,000 users...

# ✅ Concise
Task management app with real-time collaboration.
Tech: React, FastAPI, PostgreSQL, WebSockets.
```

### 2. Use Tables for Structure

```markdown
# ❌ Hard to scan
The frontend is in apps/web and uses React. The backend is in
backend/ and uses FastAPI. Tests are in tests/ and use Pytest.

# ✅ Easy to scan
| Component | Path | Tech |
|-----------|------|------|
| Frontend | apps/web/ | React |
| Backend | backend/ | FastAPI |
| Tests | tests/ | Pytest |
```

### 3. Include Critical Patterns

Document patterns that are easy to get wrong:

```markdown
## Critical Patterns

### Database Access
Always use repository pattern:
```python
from repositories.user import UserRepository
repo = UserRepository(db)
user = repo.get_by_id(id)
```
Never use raw SQL queries.

### API Authentication
All endpoints require JWT:
```python
@router.get("/users")
async def get_users(user: User = Depends(get_current_user)):
```
```

### 4. Document Gotchas

```markdown
## Gotchas

1. **BaseTab initialization**: Set ALL instance vars BEFORE `super().__init__()`
2. **Worker threads**: NEVER update UI from `worker.run()`
3. **Config access**: Always use `ConfigLoader.load_campaign()`
```

### 5. Include Deployment Info

```markdown
## Deployment

| Environment | URL | Platform |
|-------------|-----|----------|
| Production | https://app.example.com | Cloudflare |
| API | https://api.example.com | Railway |
| Staging | https://staging.example.com | Vercel |

### Deploy Commands
```bash
# Frontend
npx wrangler pages deploy dist --project-name=my-app

# Backend (use MCP)
mcp__railway-mcp-server__deployment_trigger
```
```

## CCASP Enhancement

CCASP can generate or improve your CLAUDE.md:

### Generate New CLAUDE.md

```bash
ccasp wizard
# Select: 5. Enhance CLAUDE.md
# Select: Generate new
```

Or inside Claude:
```
/ccasp-setup
# Select: 5
```

### Audit Existing CLAUDE.md

```bash
ccasp claude-audit
```

Checks for:
- Missing sections
- Outdated information
- Anthropic best practices
- Completeness

### Enhancement Templates

CCASP provides templates for different project types:

| Template | Best For |
|----------|----------|
| `minimal` | Small projects, scripts |
| `standard` | Most web apps |
| `fullstack` | Frontend + backend |
| `monorepo` | Multi-package repos |

## Section Reference

### Recommended Sections

| Section | Purpose | Priority |
|---------|---------|----------|
| Tech Stack | What technologies are used | High |
| Key Locations | Where to find things | High |
| Commands | How to run/build/test | High |
| Coding Conventions | Style and patterns | Medium |
| Deployment | How to deploy | Medium |
| Gotchas | Common mistakes | Medium |
| Architecture | System design | Low |

### Optional Sections

| Section | Purpose |
|---------|---------|
| Quick Start Menu | Startup shortcuts |
| MCP Servers | Available MCP tools |
| Skills | Available skills |
| GitHub Integration | Project board info |

## Example: Complete CLAUDE.md

```markdown
# TaskFlow - Task Management App

Real-time collaborative task management with team features.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Tailwind, Zustand |
| Backend | FastAPI, SQLAlchemy, PostgreSQL |
| Testing | Vitest, Playwright, Pytest |
| Deploy | Cloudflare Pages, Railway |

## Key Locations

| Type | Path |
|------|------|
| Frontend | apps/web/ |
| Backend | backend/ |
| Shared Types | packages/types/ |
| E2E Tests | tests/e2e/ |

## Commands

```bash
# Development
npm run dev          # Start frontend (port 5173)
python run_api.py    # Start backend (port 8001)

# Testing
npm test             # Unit tests
npm run test:e2e     # E2E tests
pytest               # Backend tests

# Build
npm run build
```

## Coding Conventions

### TypeScript
- Strict mode enabled
- Explicit return types on functions
- Use `interface` over `type` for objects

### React
- Functional components only
- Custom hooks in `src/hooks/`
- Zustand for global state

### Python
- Type hints required
- Repository pattern for DB access
- Pydantic for validation

## Deployment

| Target | Command |
|--------|---------|
| Frontend | `npx wrangler pages deploy dist` |
| Backend | Use Railway MCP |

### Railway IDs
- Project: `abc123`
- Service: `def456`
- Environment: `ghi789`

## Gotchas

1. **CORS**: Backend must allow frontend origin
2. **Auth**: JWT tokens expire after 24h
3. **Migrations**: Always create backup before running

## Startup Menu

| Key | Action |
|-----|--------|
| 1 | Start dev servers |
| 2 | Run all tests |
| 3 | Deploy production |
| M | Show /menu |
```

## Troubleshooting

### Claude Ignoring CLAUDE.md

1. Check file is in project root
2. Ensure file is named exactly `CLAUDE.md`
3. Restart Claude Code CLI

### CLAUDE.md Too Long

Keep under 500 lines. Move detailed docs to `.claude/docs/`.

### Conflicting Instructions

Global `~/.claude/CLAUDE.md` is loaded first, then project CLAUDE.md. Project instructions take precedence.

## See Also

- [Getting Started](Getting-Started) - Initial setup
- [Templates](Templates) - Template syntax
- [Features](Features) - Feature configuration
