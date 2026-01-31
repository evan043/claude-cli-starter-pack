# Two-Tier Query Pipeline Pattern

Intent classification followed by specialized execution.

## Overview

A two-tier architecture that separates:
1. **Tier 1**: Intent classification (what kind of request is this?)
2. **Tier 2**: Specialized execution (handle based on intent)

## When to Use

- Multiple types of requests need different handling
- Request routing is complex
- You want to add new handlers without changing core logic

## Architecture

```
User Request
     ↓
┌──────────────────────┐
│   Tier 1: Classifier │  (Fast, lightweight)
│   - Parse intent     │
│   - Extract entities │
│   - Route to handler │
└──────────────────────┘
     ↓
┌──────────────────────┐
│   Tier 2: Handler    │  (Specialized, thorough)
│   - Execute task     │
│   - Return result    │
└──────────────────────┘
```

## Implementation

### Tier 1: Classifier

```typescript
interface ClassificationResult {
  intent: string;
  confidence: number;
  entities: Record<string, string>;
  handler: string;
}

async function classifyIntent(request: string): Promise<ClassificationResult> {
  // Pattern matching for common intents
  const patterns = {
    'create': /create|add|new|make/i,
    'read': /get|show|list|find|search/i,
    'update': /update|edit|modify|change/i,
    'delete': /delete|remove|destroy/i,
    'analyze': /analyze|check|review|audit/i
  };

  for (const [intent, pattern] of Object.entries(patterns)) {
    if (pattern.test(request)) {
      return {
        intent,
        confidence: 0.8,
        entities: extractEntities(request),
        handler: `${intent}Handler`
      };
    }
  }

  return { intent: 'unknown', confidence: 0.5, entities: {}, handler: 'fallbackHandler' };
}
```

### Tier 2: Handlers

```typescript
const handlers = {
  createHandler: async (entities) => {
    // Launch specialized creation agent
    return Task({
      description: `Create ${entities.type}`,
      prompt: `Create a new ${entities.type} with: ${JSON.stringify(entities)}`,
      subagent_type: 'general-purpose'
    });
  },

  readHandler: async (entities) => {
    // Launch exploration agent
    return Task({
      description: `Find ${entities.target}`,
      prompt: `Search for ${entities.target} in the codebase`,
      subagent_type: 'Explore'
    });
  },

  analyzeHandler: async (entities) => {
    // Launch analysis agent
    return Task({
      description: `Analyze ${entities.scope}`,
      prompt: `Perform analysis on ${entities.scope}`,
      subagent_type: 'Plan'
    });
  },

  fallbackHandler: async (entities) => {
    // Ask for clarification
    return { needsClarification: true, entities };
  }
};
```

### Pipeline Execution

```typescript
async function executeQuery(request: string) {
  // Tier 1: Classify
  const classification = await classifyIntent(request);

  if (classification.confidence < 0.7) {
    // Low confidence - ask for clarification
    return askForClarification(classification);
  }

  // Tier 2: Execute
  const handler = handlers[classification.handler];
  if (!handler) {
    throw new Error(`Unknown handler: ${classification.handler}`);
  }

  return handler(classification.entities);
}
```

## Example: Command Router

```typescript
// User asks: "Create a new hook for validating file writes"

// Tier 1 Classification:
{
  intent: 'create',
  confidence: 0.9,
  entities: {
    type: 'hook',
    target: 'file writes',
    purpose: 'validation'
  },
  handler: 'createHandler'
}

// Tier 2 Execution:
// Launches create-hook skill with extracted parameters
```

## Benefits

1. **Separation of Concerns**: Classification logic is separate from execution
2. **Extensibility**: Add new handlers without changing classifier
3. **Testability**: Each tier can be tested independently
4. **Confidence Handling**: Low-confidence routes can be handled specially

## Variations

### Multi-Intent

Handle requests with multiple intents:

```typescript
// "Create a user and send them a welcome email"
// Intent 1: create user
// Intent 2: send email
```

### Fallback Chain

Multiple classifiers with fallback:

```typescript
const classifiers = [patternClassifier, mlClassifier, heuristicClassifier];

async function classifyWithFallback(request) {
  for (const classifier of classifiers) {
    const result = await classifier(request);
    if (result.confidence > 0.7) return result;
  }
  return { intent: 'unknown', confidence: 0 };
}
```

## Related Patterns

- L1→L2 Orchestration
- Multi-Phase Orchestration
