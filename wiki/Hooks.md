# Hooks

Hooks are enforcement mechanisms that run automatically at specific points during Claude Code CLI execution. They can validate, modify, or block tool calls.

## Hook Types

### PreToolUse

Runs **before** a tool is executed. Can:
- Validate parameters
- Block dangerous operations
- Modify tool inputs
- Add context

### PostToolUse

Runs **after** a tool completes. Can:
- Validate outputs
- Log results
- Trigger follow-up actions
- Update state

### UserPromptSubmit

Runs when the user submits a prompt. Can:
- Analyze user intent
- Load relevant context
- Set session state
- Redirect to appropriate workflows

## Creating Hooks

### Using the Slash Command

Inside Claude Code CLI:
```
/create-hook
```

### Using the Terminal Command

```bash
ccasp create-hook
```

### Hook File Structure

Hooks live in `.claude/hooks/` and are typically JavaScript files:

```
.claude/hooks/
├── pre-tool-use/
│   ├── file-guard.js
│   └── sql-validator.js
├── post-tool-use/
│   ├── test-runner.js
│   └── deployment-tracker.js
└── user-prompt-submit/
    ├── context-loader.js
    └── intent-detector.js
```

## Hook Definition Format

### JavaScript Hook

```javascript
// .claude/hooks/pre-tool-use/file-guard.js

/**
 * File Guard Hook
 * Prevents modifications to protected files
 */

const PROTECTED_PATTERNS = [
  /\.env$/,
  /credentials\.json$/,
  /secrets\//,
  /node_modules\//,
];

export default {
  name: 'file-guard',
  type: 'PreToolUse',
  tools: ['Write', 'Edit'],

  async execute(context) {
    const { tool, params } = context;
    const filePath = params.file_path || params.path;

    for (const pattern of PROTECTED_PATTERNS) {
      if (pattern.test(filePath)) {
        return {
          action: 'block',
          message: `Cannot modify protected file: ${filePath}`,
        };
      }
    }

    return { action: 'allow' };
  }
};
```

### Configuration-Based Hook

```json
{
  "name": "sql-injection-guard",
  "type": "PreToolUse",
  "tools": ["Bash"],
  "rules": [
    {
      "pattern": "DROP TABLE|DELETE FROM|TRUNCATE",
      "action": "block",
      "message": "Destructive SQL operations require explicit approval"
    }
  ]
}
```

## Hook Context

### PreToolUse Context

```javascript
{
  tool: 'Edit',           // Tool being called
  params: {               // Tool parameters
    file_path: '/src/app.ts',
    old_string: '...',
    new_string: '...'
  },
  session: {              // Session state
    startTime: Date,
    tokensUsed: number,
    filesModified: []
  }
}
```

### PostToolUse Context

```javascript
{
  tool: 'Bash',
  params: { command: 'npm test' },
  result: {               // Tool result
    output: '...',
    exitCode: 0
  },
  duration: 1234,         // Execution time in ms
  session: { ... }
}
```

### UserPromptSubmit Context

```javascript
{
  prompt: 'Fix the login bug',
  session: { ... },
  recentTools: [...],     // Recent tool calls
  recentFiles: [...]      // Recently accessed files
}
```

## Hook Actions

### Allow (Default)

Let the operation proceed:
```javascript
return { action: 'allow' };
```

### Block

Stop the operation:
```javascript
return {
  action: 'block',
  message: 'Operation not allowed'
};
```

### Modify

Change the parameters:
```javascript
return {
  action: 'modify',
  params: {
    ...context.params,
    timeout: 60000  // Add timeout
  }
};
```

### Warn

Allow but show warning:
```javascript
return {
  action: 'warn',
  message: 'This operation may take a while'
};
```

## Example Hooks

### Token Budget Guardian

```javascript
// .claude/hooks/pre-tool-use/token-guardian.js

const MAX_TOKENS_PER_SESSION = 100000;

export default {
  name: 'token-guardian',
  type: 'PreToolUse',
  tools: ['*'],  // All tools

  async execute(context) {
    const { session } = context;

    if (session.tokensUsed > MAX_TOKENS_PER_SESSION * 0.8) {
      return {
        action: 'warn',
        message: `Token usage at ${Math.round(session.tokensUsed / MAX_TOKENS_PER_SESSION * 100)}%. Consider archiving context.`
      };
    }

    if (session.tokensUsed > MAX_TOKENS_PER_SESSION) {
      return {
        action: 'block',
        message: 'Token budget exceeded. Please start a new session.'
      };
    }

    return { action: 'allow' };
  }
};
```

### Test Enforcer

```javascript
// .claude/hooks/post-tool-use/test-enforcer.js

export default {
  name: 'test-enforcer',
  type: 'PostToolUse',
  tools: ['Edit', 'Write'],

  async execute(context) {
    const { params, session } = context;
    const filePath = params.file_path;

    // Track modified source files
    if (filePath.match(/\.(ts|tsx|js|jsx)$/) && !filePath.includes('test')) {
      session.pendingTests = session.pendingTests || [];
      session.pendingTests.push(filePath);

      if (session.pendingTests.length >= 3) {
        return {
          action: 'warn',
          message: `${session.pendingTests.length} files modified without tests. Consider running: npm test`
        };
      }
    }

    return { action: 'allow' };
  }
};
```

### Context Auto-Loader

```javascript
// .claude/hooks/user-prompt-submit/context-loader.js

const KEYWORD_CONTEXTS = {
  'deploy': ['.claude/docs/deployment.md', 'railway.json'],
  'test': ['.claude/docs/testing.md', 'playwright.config.ts'],
  'database': ['.claude/docs/database.md', 'prisma/schema.prisma'],
};

export default {
  name: 'context-loader',
  type: 'UserPromptSubmit',

  async execute(context) {
    const { prompt } = context;
    const promptLower = prompt.toLowerCase();

    const filesToLoad = [];

    for (const [keyword, files] of Object.entries(KEYWORD_CONTEXTS)) {
      if (promptLower.includes(keyword)) {
        filesToLoad.push(...files);
      }
    }

    if (filesToLoad.length > 0) {
      return {
        action: 'modify',
        context: {
          additionalFiles: filesToLoad,
          message: `Loaded context for: ${[...new Set(filesToLoad)].join(', ')}`
        }
      };
    }

    return { action: 'allow' };
  }
};
```

### GitHub Progress Hook

```javascript
// .claude/hooks/post-tool-use/github-progress.js

export default {
  name: 'github-progress',
  type: 'PostToolUse',
  tools: ['Bash'],

  async execute(context) {
    const { params, result } = context;

    // Detect git commits
    if (params.command.includes('git commit')) {
      const commitMatch = result.output.match(/\[[\w-]+ ([a-f0-9]+)\]/);

      if (commitMatch) {
        // Could update GitHub issue with progress
        console.log(`Commit detected: ${commitMatch[1]}`);
      }
    }

    return { action: 'allow' };
  }
};
```

## Hook Configuration

### settings.json

Configure hooks in `.claude/settings.json`:

```json
{
  "hooks": {
    "enabled": true,
    "preToolUse": [
      "file-guard",
      "token-guardian"
    ],
    "postToolUse": [
      "test-enforcer",
      "github-progress"
    ],
    "userPromptSubmit": [
      "context-loader"
    ]
  }
}
```

### Disabling Hooks

Temporarily disable all hooks:
```json
{
  "hooks": {
    "enabled": false
  }
}
```

Disable specific hook:
```json
{
  "hooks": {
    "disabled": ["test-enforcer"]
  }
}
```

## Best Practices

### 1. Keep Hooks Fast

Hooks run synchronously. Slow hooks degrade the experience.

```javascript
// ❌ Bad - slow file system scan
async execute(context) {
  const allFiles = await glob('**/*');  // Too slow
}

// ✅ Good - targeted check
async execute(context) {
  const filePath = context.params.file_path;
  return checkFile(filePath);  // Fast
}
```

### 2. Use Specific Tool Filters

Don't use `tools: ['*']` unless necessary:

```javascript
// ❌ Bad - runs on every tool
tools: ['*']

// ✅ Good - only relevant tools
tools: ['Write', 'Edit', 'Bash']
```

### 3. Provide Helpful Messages

```javascript
// ❌ Bad
return { action: 'block', message: 'Error' };

// ✅ Good
return {
  action: 'block',
  message: 'Cannot modify .env files. Use environment variables in railway.json instead.'
};
```

### 4. Handle Errors Gracefully

```javascript
async execute(context) {
  try {
    // Hook logic
  } catch (error) {
    console.error('Hook error:', error);
    // Allow operation to proceed on hook error
    return { action: 'allow' };
  }
}
```

## Troubleshooting

### Hook Not Running

1. Check hook is listed in `settings.json`
2. Verify file is in correct directory
3. Check tool filter matches

### Hook Blocking Everything

Check the `tools` array - it may be too broad.

### Performance Issues

Profile slow hooks and optimize or disable them.

## See Also

- [Agents](Agents) - Trigger agents from hooks
- [Features](Features) - Built-in hooks from features
- [Troubleshooting](Troubleshooting) - Common issues
