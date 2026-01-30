# Skills

Skills are RAG-enhanced capability packages that give Claude Code CLI specialized knowledge and workflows for specific domains.

## What are Skills?

Skills combine:
- **Context documents** - Domain knowledge, patterns, examples
- **Workflows** - Step-by-step procedures
- **Templates** - Code snippets, configurations
- **Validation rules** - Quality checks

## Skill Structure

```
.claude/skills/
└── my-skill/
    ├── skill.md           # Main skill definition
    ├── context/           # RAG context files
    │   ├── patterns.md
    │   ├── examples.md
    │   └── gotchas.md
    ├── templates/         # Code templates
    │   ├── component.tsx
    │   └── test.spec.ts
    └── workflows/         # Step-by-step guides
        ├── create-feature.md
        └── debug-issue.md
```

## Creating Skills

### Using the Slash Command

Inside Claude Code CLI:
```
/create-skill
```

### Using the Terminal Command

```bash
ccasp create-skill
```

### Skill Definition Format

```markdown
<!-- .claude/skills/react-component/skill.md -->
---
name: react-component
description: Create React components following project patterns
version: 1.0.0
triggers:
  - "create component"
  - "new component"
  - "add component"
---

# React Component Skill

## Purpose
Create React components that follow project conventions.

## Context Files
- context/patterns.md - Component patterns
- context/examples.md - Real examples from codebase
- context/gotchas.md - Common mistakes to avoid

## Workflow

### 1. Gather Requirements
- Component name
- Props interface
- State requirements
- Event handlers needed

### 2. Check Existing Patterns
Load: context/patterns.md

### 3. Generate Component
Use template: templates/component.tsx

### 4. Generate Tests
Use template: templates/test.spec.ts

### 5. Validate
- TypeScript compiles
- Tests pass
- Follows naming conventions

## Templates

### Component Template
```tsx
// templates/component.tsx
import React from 'react';

interface {{ComponentName}}Props {
  {{props}}
}

export function {{ComponentName}}({ {{destructuredProps}} }: {{ComponentName}}Props) {
  return (
    <div className="{{className}}">
      {{children}}
    </div>
  );
}
```

### Test Template
```tsx
// templates/test.spec.ts
import { render, screen } from '@testing-library/react';
import { {{ComponentName}} } from './{{ComponentName}}';

describe('{{ComponentName}}', () => {
  it('renders correctly', () => {
    render(<{{ComponentName}} {{defaultProps}} />);
    expect(screen.getByRole('{{role}}')).toBeInTheDocument();
  });
});
```
```

## Context Files

Context files provide domain knowledge that Claude uses when executing the skill.

### patterns.md

```markdown
# Component Patterns

## Naming Conventions
- PascalCase for component names
- camelCase for props
- Suffix with purpose: UserCard, UserList, UserForm

## File Organization
- One component per file
- Co-locate tests: Component.tsx, Component.test.tsx
- Co-locate styles: Component.module.css

## Props Interface
Always define explicit interface:
```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick: () => void;
  children: React.ReactNode;
}
```

## State Management
- Local state for UI-only state
- Zustand for shared state
- React Query for server state
```

### examples.md

```markdown
# Real Examples

## UserCard Component
From: src/components/UserCard.tsx

```tsx
interface UserCardProps {
  user: User;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h3 className="font-semibold">{user.name}</h3>
      <p className="text-gray-600">{user.email}</p>
      {onEdit && <button onClick={onEdit}>Edit</button>}
      {onDelete && <button onClick={onDelete}>Delete</button>}
    </div>
  );
}
```
```

### gotchas.md

```markdown
# Common Gotchas

## 1. Missing Keys in Lists
❌ Wrong:
```tsx
{items.map(item => <Item item={item} />)}
```

✅ Correct:
```tsx
{items.map(item => <Item key={item.id} item={item} />)}
```

## 2. Inline Object Props
❌ Wrong (causes re-renders):
```tsx
<Component style={{ color: 'red' }} />
```

✅ Correct:
```tsx
const style = useMemo(() => ({ color: 'red' }), []);
<Component style={style} />
```

## 3. Event Handler Binding
❌ Wrong:
```tsx
<button onClick={() => handleClick(id)}>
```

✅ Better:
```tsx
const handleButtonClick = useCallback(() => handleClick(id), [id]);
<button onClick={handleButtonClick}>
```
```

## Workflow Files

Workflows define step-by-step procedures:

```markdown
<!-- workflows/create-feature.md -->
# Create Feature Workflow

## Prerequisites
- Feature requirements defined
- Design approved

## Steps

### Step 1: Create Branch
```bash
git checkout -b feature/{{feature-name}}
```

### Step 2: Create Component Structure
1. Create folder: src/features/{{feature-name}}/
2. Create index.ts for exports
3. Create types.ts for interfaces

### Step 3: Implement Components
Use skill: react-component

### Step 4: Add State Management
Create store: src/features/{{feature-name}}/store.ts

### Step 5: Add Tests
- Unit tests for components
- Integration tests for workflows

### Step 6: Documentation
Update: docs/features/{{feature-name}}.md

## Validation Checklist
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Documentation complete
- [ ] PR created
```

## Using Skills

### Automatic Trigger

Skills can auto-trigger based on keywords:

```yaml
triggers:
  - "create component"
  - "new component"
```

When you say "create a new component for user profiles", the skill activates.

### Manual Invocation

```
/skill react-component
```

Or reference in another command:
```markdown
## Implementation
Use skill: react-component to create the UI
```

### Chaining Skills

Skills can reference other skills:

```markdown
## Workflow

1. Use skill: database-migration for schema changes
2. Use skill: api-endpoint for backend
3. Use skill: react-component for frontend
```

## Built-in Skills

CCASP can generate these common skills:

| Skill | Purpose |
|-------|---------|
| `api-endpoint` | Create REST API endpoints |
| `react-component` | React component with tests |
| `database-migration` | Schema migrations |
| `test-suite` | Comprehensive test coverage |
| `documentation` | Generate docs from code |

## Best Practices

### 1. Keep Context Focused

Each context file should cover one topic:
- ✅ `authentication-patterns.md`
- ✅ `error-handling.md`
- ❌ `everything-you-need.md`

### 2. Include Real Examples

Examples from your actual codebase are more valuable than generic ones.

### 3. Document Gotchas

Capture lessons learned to prevent repeated mistakes.

### 4. Version Your Skills

```yaml
version: 1.0.0
```

Track changes and allow rollback.

### 5. Test Your Skills

Create test cases that validate skill outputs.

## Example: Complete API Skill

```markdown
---
name: api-endpoint
description: Create FastAPI endpoints following project patterns
version: 1.0.0
triggers:
  - "create endpoint"
  - "new api"
  - "add route"
---

# API Endpoint Skill

## Context
- context/patterns.md - API patterns
- context/auth.md - Authentication patterns
- context/validation.md - Input validation

## Workflow

### 1. Define Endpoint
- HTTP method (GET, POST, PUT, DELETE)
- Path with parameters
- Request/Response schemas

### 2. Create Schema
Location: backend/schemas/{{resource}}.py

```python
from pydantic import BaseModel

class {{Resource}}Create(BaseModel):
    {{fields}}

class {{Resource}}Response(BaseModel):
    id: int
    {{fields}}

    class Config:
        from_attributes = True
```

### 3. Create Router
Location: backend/routers/{{resource}}.py

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/{{resource}}", tags=["{{resource}}"])

@router.post("/", response_model={{Resource}}Response)
async def create_{{resource}}(
    data: {{Resource}}Create,
    db: Session = Depends(get_db)
):
    # Implementation
    pass
```

### 4. Add Tests
Location: backend/tests/test_{{resource}}.py

### 5. Update OpenAPI
Verify at: /api/docs

## Validation
- [ ] Endpoint responds correctly
- [ ] Authentication works
- [ ] Validation rejects bad input
- [ ] Tests pass
```

## Troubleshooting

### Skill Not Triggering

Check that triggers match your phrasing:
```yaml
triggers:
  - "create component"  # Matches "create a component"
  - "new component"     # Matches "I need a new component"
```

### Context Not Loading

Ensure paths are relative to skill directory:
```yaml
# ✅ Correct
context/patterns.md

# ❌ Wrong
.claude/skills/my-skill/context/patterns.md
```

### Templates Not Rendering

Check placeholder syntax:
```
{{variableName}}  # Correct
{variableName}    # Wrong
${variableName}   # Wrong
```

## See Also

- [Agents](Agents) - Combine skills with agents
- [Templates](Templates) - Template engine details
- [Phased Development](Phased-Development) - Multi-phase workflows
