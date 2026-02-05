# Retry with Backoff Pattern

Exponential backoff strategy for recovering from transient failures without overwhelming failing systems.

## Overview

The Retry with Backoff pattern automatically retries failed operations with increasing delays between attempts, giving failing systems time to recover while preventing thundering herd problems.

## The Problem

Without backoff:
- Immediate retries overwhelm recovering systems
- Fixed delays waste time on permanent failures
- No differentiation between transient and permanent errors
- Synchronized retries create traffic spikes (thundering herd)

## Backoff Strategies

### 1. Fixed Delay
```
Attempt:  1    2    3    4    5
Delay:    ─────┼────┼────┼────┼────
          1s   1s   1s   1s   1s
```
Simple but inefficient. Use only for predictable failures.

### 2. Linear Backoff
```
Attempt:  1    2    3    4    5
Delay:    ─────┼─────┼──────┼───────┼────────
          1s   2s    3s     4s      5s
```
Better but can still overwhelm at scale.

### 3. Exponential Backoff
```
Attempt:  1    2    3    4      5
Delay:    ─────┼─────┼──────┼────────┼────────────────
          1s   2s    4s     8s       16s
```
**Recommended.** Backs off aggressively, gives system time to recover.

### 4. Exponential with Jitter
```
Attempt:  1    2    3    4      5
Delay:    ─────┼────┼───────┼──────────┼─────────────
          0.8s 1.5s  3.2s    6.4s       13.1s
```
**Best practice.** Adds randomness to prevent synchronized retries.

## Configuration

```typescript
interface RetryConfig {
  // Basic settings
  maxRetries: number;              // Max attempts (default: 3)
  initialDelay: number;            // First delay in ms (default: 1000)
  maxDelay: number;                // Cap delay at this value (default: 60000)

  // Strategy
  strategy: 'fixed' | 'linear' | 'exponential';  // (default: 'exponential')
  backoffMultiplier: number;       // Multiply delay by this (default: 2)
  jitter: boolean;                 // Add randomness (default: true)

  // Error handling
  retryableErrors: string[];       // Only retry these error types
  onRetry?: (attempt, delay, error) => void;  // Hook for logging

  // Timeout per attempt
  timeout: number;                 // ms per attempt (default: 10000)
}
```

## Claude Code Context

Use retry with backoff for:

### 1. API Rate Limits
```typescript
// GitHub API returns 429 on rate limit
const retryConfig: RetryConfig = {
  maxRetries: 5,
  initialDelay: 2000,
  maxDelay: 120000,  // Max 2 minutes
  strategy: 'exponential',
  retryableErrors: ['429', 'RATE_LIMIT_EXCEEDED']
};

await retryWithBackoff(() => callGitHubAPI('/repos/owner/repo'), retryConfig);
```

### 2. MCP Server Calls
```typescript
// MCP servers may have transient failures
const mcpRetry: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  strategy: 'exponential',
  jitter: true,
  retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'MCP_SERVER_BUSY']
};

await retryWithBackoff(
  () => mcp__github__get_issue({ repo: 'owner/repo', issue: 123 }),
  mcpRetry
);
```

### 3. Agent Spawning
```typescript
// Agent quota exceeded, retry with backoff
const agentRetry: RetryConfig = {
  maxRetries: 4,
  initialDelay: 5000,
  maxDelay: 60000,
  strategy: 'exponential',
  retryableErrors: ['QUOTA_EXCEEDED', 'TOO_MANY_REQUESTS'],
  onRetry: (attempt, delay) => {
    console.log(`Retrying agent spawn (attempt ${attempt}) in ${delay}ms`);
  }
};

await retryWithBackoff(() => spawnAgent(config), agentRetry);
```

### 4. Deployment Operations
```typescript
// Railway/Cloudflare deployments may be rate-limited
const deployRetry: RetryConfig = {
  maxRetries: 3,
  initialDelay: 10000,  // Start with 10s
  maxDelay: 300000,     // Max 5 minutes
  strategy: 'exponential',
  timeout: 600000,      // 10 min per attempt
  retryableErrors: ['DEPLOYMENT_FAILED', 'SERVICE_UNAVAILABLE']
};

await retryWithBackoff(() => deployToRailway(config), deployRetry);
```

## Implementation

```typescript
class RetryWithBackoff {
  constructor(private config: RetryConfig) {
    // Set defaults
    this.config.maxRetries ??= 3;
    this.config.initialDelay ??= 1000;
    this.config.maxDelay ??= 60000;
    this.config.strategy ??= 'exponential';
    this.config.backoffMultiplier ??= 2;
    this.config.jitter ??= true;
    this.config.timeout ??= 10000;
    this.config.retryableErrors ??= [];
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(operation);
        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryable(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.config.maxRetries) {
          throw error;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt);

        // Call retry hook
        if (this.config.onRetry) {
          this.config.onRetry(attempt + 1, delay, error);
        }

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error('Operation timeout')),
          this.config.timeout
        )
      )
    ]);
  }

  private isRetryable(error: any): boolean {
    // If no specific errors configured, retry all
    if (this.config.retryableErrors!.length === 0) {
      return true;
    }

    // Check if error matches retryable list
    const errorStr = String(error);
    return this.config.retryableErrors!.some(retryable =>
      errorStr.includes(retryable)
    );
  }

  private calculateDelay(attempt: number): number {
    let delay: number;

    switch (this.config.strategy) {
      case 'fixed':
        delay = this.config.initialDelay!;
        break;

      case 'linear':
        delay = this.config.initialDelay! * (attempt + 1);
        break;

      case 'exponential':
      default:
        delay = this.config.initialDelay! * Math.pow(
          this.config.backoffMultiplier!,
          attempt
        );
        break;
    }

    // Apply max delay cap
    delay = Math.min(delay, this.config.maxDelay!);

    // Apply jitter if enabled
    if (this.config.jitter) {
      delay = this.addJitter(delay);
    }

    return delay;
  }

  private addJitter(delay: number): number {
    // Randomize between 50% and 100% of delay
    const min = delay * 0.5;
    const max = delay;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Helper function for common usage
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retry = new RetryWithBackoff(config as RetryConfig);
  return retry.execute(operation);
}
```

## Usage Examples

### Example 1: Basic Retry
```typescript
import { retryWithBackoff } from './retry-with-backoff';

// Simple retry with defaults
const data = await retryWithBackoff(
  async () => {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
);
```

### Example 2: Per-Error-Type Configuration
```typescript
// Different strategies for different errors
async function callAPIWithSmartRetry(endpoint: string) {
  try {
    return await retryWithBackoff(
      () => fetch(endpoint).then(r => r.json()),
      {
        maxRetries: 5,
        strategy: 'exponential',
        retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED', '429', '503'],
        onRetry: (attempt, delay, error) => {
          if (error.toString().includes('429')) {
            console.log(`Rate limited, backing off ${delay}ms`);
          } else {
            console.log(`Transient error, retry ${attempt} in ${delay}ms`);
          }
        }
      }
    );
  } catch (error) {
    // Non-retryable error or retries exhausted
    console.error('Operation failed permanently:', error);
    throw error;
  }
}
```

### Example 3: Combining with Circuit Breaker
```typescript
import { CircuitBreaker } from './circuit-breaker';
import { retryWithBackoff } from './retry-with-backoff';

// Retry within circuit breaker
const breaker = new CircuitBreaker(
  async (url: string) => {
    return retryWithBackoff(
      () => fetch(url).then(r => r.json()),
      {
        maxRetries: 3,
        initialDelay: 1000,
        strategy: 'exponential'
      }
    );
  },
  {
    failureThreshold: 5,
    recoveryTimeout: 60000
  }
);

// Fails fast if circuit open, retries with backoff if closed
await breaker.execute('https://api.example.com/data');
```

### Example 4: Conditional Retry Logic
```typescript
// Retry only specific errors
async function uploadFile(file: File) {
  return retryWithBackoff(
    async () => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }

      return response.json();
    },
    {
      maxRetries: 3,
      initialDelay: 2000,
      strategy: 'exponential',
      // Only retry network errors and 5xx, not 4xx client errors
      retryableErrors: ['network', '500', '502', '503', '504'],
      onRetry: (attempt, delay) => {
        console.log(`Upload retry ${attempt} in ${delay / 1000}s`);
      }
    }
  );
}
```

## When to Use

Use retry with backoff when:

- Transient failures are expected (network issues, rate limits)
- System can recover given time (service restart, cache refresh)
- Idempotent operations (safe to retry without side effects)
- User can wait for retry attempts

## When NOT to Use

Don't use retry for:

- Non-idempotent operations without deduplication (e.g., payment processing)
- Permanent errors (404, 401, validation failures)
- Operations with strict latency requirements
- Resource-constrained environments (retries consume resources)

## Anti-Patterns

### 1. Retrying Non-Transient Errors
```typescript
// BAD: Retrying auth failures
await retryWithBackoff(() => loginWithBadCredentials());

// GOOD: Only retry transient errors
await retryWithBackoff(
  () => loginAPI(),
  {
    retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED', '503']
    // NOT '401', '403' - these are permanent
  }
);
```

### 2. No Max Delay Cap
```typescript
// BAD: Delay grows unbounded
{ strategy: 'exponential', maxRetries: 10 }
// → 1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 512s (8.5 minutes!)

// GOOD: Cap max delay
{ strategy: 'exponential', maxRetries: 10, maxDelay: 60000 }
// → 1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, 60s, 60s
```

### 3. No Jitter (Thundering Herd)
```typescript
// BAD: All clients retry at same time
{ strategy: 'exponential', jitter: false }
// If 1000 clients fail at once, they all retry at 1s, 2s, 4s...

// GOOD: Add jitter to spread load
{ strategy: 'exponential', jitter: true }
// Clients retry at randomized times: 0.8s, 1.2s, 3.5s, 7.1s...
```

### 4. Infinite Retries
```typescript
// BAD: Will retry forever
const retry = { maxRetries: Infinity };

// GOOD: Always have a limit
const retry = { maxRetries: 5, maxDelay: 60000 };
```

## Advanced: Per-Error Backoff
```typescript
interface AdvancedRetryConfig extends RetryConfig {
  errorStrategies: {
    [errorType: string]: {
      maxRetries: number;
      initialDelay: number;
      strategy: string;
    };
  };
}

// Example: Different backoff for different errors
const config: AdvancedRetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  strategy: 'exponential',
  errorStrategies: {
    '429': {
      // Rate limit: longer backoff
      maxRetries: 5,
      initialDelay: 5000,
      strategy: 'exponential'
    },
    'ETIMEDOUT': {
      // Timeout: shorter backoff
      maxRetries: 3,
      initialDelay: 500,
      strategy: 'linear'
    }
  }
};
```

## Monitoring and Metrics

```typescript
class MonitoredRetry extends RetryWithBackoff {
  private metrics = {
    totalAttempts: 0,
    successOnRetry: 0,
    failures: 0,
    totalDelay: 0
  };

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await super.execute(operation);

      // Track success
      const attempts = this.getCurrentAttempt();
      this.metrics.totalAttempts += attempts;
      if (attempts > 1) {
        this.metrics.successOnRetry++;
      }
      this.metrics.totalDelay += Date.now() - startTime;

      return result;
    } catch (error) {
      // Track failure
      this.metrics.failures++;
      throw error;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageDelay: this.metrics.totalDelay / this.metrics.totalAttempts,
      successRate: this.metrics.successOnRetry / this.metrics.totalAttempts
    };
  }
}
```

## Configuration Guidelines

### Conservative (Production)
```typescript
{
  maxRetries: 5,
  initialDelay: 2000,
  maxDelay: 60000,
  strategy: 'exponential',
  jitter: true,
  timeout: 30000
}
```

### Aggressive (Fast Fail)
```typescript
{
  maxRetries: 2,
  initialDelay: 500,
  maxDelay: 5000,
  strategy: 'exponential',
  jitter: true,
  timeout: 5000
}
```

### Rate-Limited APIs
```typescript
{
  maxRetries: 5,
  initialDelay: 10000,  // Start with 10s
  maxDelay: 300000,     // Max 5 min
  strategy: 'exponential',
  jitter: true,
  retryableErrors: ['429', 'RATE_LIMIT_EXCEEDED']
}
```

## Backoff Calculation Table

With `initialDelay: 1000`, `multiplier: 2`, `maxDelay: 60000`:

| Attempt | Exponential (no jitter) | With Jitter (range) | Cumulative Wait |
|---------|------------------------|---------------------|-----------------|
| 1 | 1,000ms | 500-1,000ms | 500-1,000ms |
| 2 | 2,000ms | 1,000-2,000ms | 1,500-3,000ms |
| 3 | 4,000ms | 2,000-4,000ms | 3,500-7,000ms |
| 4 | 8,000ms | 4,000-8,000ms | 7,500-15,000ms |
| 5 | 16,000ms | 8,000-16,000ms | 15,500-31,000ms |
| 6 | 32,000ms | 16,000-32,000ms | 31,500-63,000ms |
| 7 | 60,000ms (capped) | 30,000-60,000ms | 61,500-123,000ms |

## Related Patterns

- **Circuit Breaker**: Use after retries exhausted
- **Timeout Pattern**: Apply per-attempt timeout
- **Bulkhead Pattern**: Limit concurrent retry attempts

---

*Retry with Backoff Pattern - CCASP v2.3.0*
*Intelligent retry strategy for transient failures*
