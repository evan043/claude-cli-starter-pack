# {{project.name}} - Detailed Gotchas

Problem-solution patterns learned from development experience. Reference this before making changes.

---

## Quick Reference

| Category | Common Issue | Solution |
|----------|--------------|----------|
| Async | Race conditions | Use proper await/locks |
| State | Stale data | Invalidate caches properly |
| UI | Flash of content | Add loading states |
| API | Timeout errors | Implement retry logic |

---

## Async Operations

### Problem: Race Conditions in State Updates

**Symptoms:**
- Intermittent bugs
- Inconsistent state
- "It works sometimes"

**Root Cause:**
Multiple async operations completing out of order.

**Solution:**
```typescript
// BAD - race condition
async function fetchBoth() {
  fetchA().then(setA);
  fetchB().then(setB);
}

// GOOD - controlled ordering
async function fetchBoth() {
  const [a, b] = await Promise.all([fetchA(), fetchB()]);
  setA(a);
  setB(b);
}
```

### Problem: Unhandled Promise Rejections

**Symptoms:**
- Silent failures
- Incomplete operations
- No error messages

**Solution:**
```typescript
// BAD - no error handling
fetchData().then(process);

// GOOD - explicit error handling
fetchData()
  .then(process)
  .catch(error => {
    console.error('Fetch failed:', error);
    showUserError('Unable to load data');
  });

// BETTER - async/await with try/catch
try {
  const data = await fetchData();
  process(data);
} catch (error) {
  handleError(error);
}
```

---

## State Management

### Problem: Stale Closure Data

**Symptoms:**
- Event handlers use old values
- Updates don't reflect current state

**Root Cause:**
Closures capturing stale variable references.

**Solution:**
```typescript
// BAD - stale closure
useEffect(() => {
  const handler = () => console.log(count);
  window.addEventListener('click', handler);
}, []); // count will always be initial value

// GOOD - use ref for current value
const countRef = useRef(count);
countRef.current = count;
useEffect(() => {
  const handler = () => console.log(countRef.current);
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
}, []);
```

### Problem: Cache Invalidation

**Symptoms:**
- Old data displayed after updates
- Refresh required to see changes

**Solution:**
```typescript
// Implement proper cache invalidation
async function updateItem(id, data) {
  await api.update(id, data);
  // Invalidate relevant caches
  cache.delete(`item:${id}`);
  cache.delete('items:list');
  // Refetch if needed
  await refetchQueries(['items']);
}
```

---

## UI Patterns

### Problem: Flash of Unstyled/Wrong Content

**Symptoms:**
- Brief flicker on page load
- Content shifts after hydration

**Solution:**
```typescript
// Add loading states
const [isLoading, setIsLoading] = useState(true);

if (isLoading) {
  return <Skeleton />;
}

// Use CSS for initial state
// globals.css
.app { opacity: 0; }
.app.loaded { opacity: 1; transition: opacity 0.2s; }
```

### Problem: Layout Shift

**Symptoms:**
- Content jumps around
- Poor CLS score

**Solution:**
```css
/* Reserve space for dynamic content */
.image-container {
  aspect-ratio: 16/9;
}

.text-content {
  min-height: 100px;
}
```

---

## API Integration

### Problem: Timeout Errors

**Symptoms:**
- Requests fail on slow connections
- Inconsistent availability

**Solution:**
```typescript
// Implement retry with exponential backoff
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        timeout: 5000 + (i * 2000) // Increase timeout with each retry
      });
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
}
```

### Problem: Rate Limiting

**Symptoms:**
- 429 Too Many Requests
- API blocks after burst traffic

**Solution:**
```typescript
// Implement request queue with rate limiting
const queue = new PQueue({
  concurrency: 2,
  intervalCap: 10,
  interval: 1000
});

async function rateLimitedFetch(url) {
  return queue.add(() => fetch(url));
}
```

---

## Testing

### Problem: Flaky Tests

**Symptoms:**
- Tests pass locally, fail in CI
- Intermittent failures

**Common Causes & Solutions:**

1. **Timing issues:**
   ```typescript
   // BAD
   await click(button);
   expect(modal).toBeVisible();

   // GOOD
   await click(button);
   await waitFor(() => expect(modal).toBeVisible());
   ```

2. **Shared state:**
   ```typescript
   // Reset state between tests
   beforeEach(() => {
     resetTestDatabase();
     clearMocks();
   });
   ```

3. **Order dependency:**
   ```typescript
   // Make tests independent
   // Don't rely on other tests' side effects
   ```

---

## Performance

### Problem: Memory Leaks

**Symptoms:**
- Increasing memory usage
- Slowdown over time

**Common Causes & Solutions:**

```typescript
// BAD - event listener not cleaned up
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// GOOD - cleanup on unmount
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### Problem: Excessive Re-renders

**Symptoms:**
- Slow UI updates
- Laggy interactions

**Solution:**
```typescript
// Use memoization
const MemoizedComponent = React.memo(ExpensiveComponent);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Memoize computed values
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);
```

---

## Git Workflow

### Problem: Merge Conflicts in Lock Files

**Solution:**
```bash
# Don't try to manually merge lock files
git checkout --theirs package-lock.json
npm install
git add package-lock.json
```

### Problem: Accidental Commit to Main

**Solution:**
```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Create new branch with changes
git checkout -b feature/my-changes

# Commit on correct branch
git commit -m "feat: my changes"
```

---

## Debugging Checklist

When something doesn't work:

1. [ ] Check browser console for errors
2. [ ] Check network tab for failed requests
3. [ ] Verify environment variables are set
4. [ ] Clear cache/hard refresh
5. [ ] Check for type errors
6. [ ] Review recent changes
7. [ ] Check dependencies are installed
8. [ ] Verify database/API is running

---

*Add new gotchas as you encounter them. Future you will thank you.*
