# Test Writing Checklist

## Before Writing a Test
- [ ] Identify what behavior you're testing
- [ ] Determine if it's a smoke, keymap, or layout test
- [ ] Check if an existing test already covers this

## Test Structure
- [ ] File named `*_spec.lua` in `nvim-ccasp/tests/`
- [ ] Uses `describe()` / `it()` from plenary/busted
- [ ] Has `before_each()` for setup
- [ ] Has `after_each()` for cleanup
- [ ] Uses `helpers.lua` utilities where available

## Assertions
- [ ] Uses `assert.equals()` for exact values
- [ ] Uses `assert.truthy()` / `assert.falsy()` for conditions
- [ ] Provides descriptive messages: `assert.truthy(x, "reason")`

## Floating Windows
- [ ] Tests floating windows via `nvim_list_wins()` + `nvim_win_get_config()`
- [ ] Does NOT rely on visual rendering (headless mode)
- [ ] Validates `relative`, `width`, `height`, `zindex`

## Timing
- [ ] Uses `vim.wait()` with timeout and polling interval
- [ ] Does NOT use `vim.defer_fn` for test flow control
- [ ] Sets reasonable timeouts (1000-5000ms)

## Cleanup
- [ ] All floating windows closed in `after_each`
- [ ] No global state leaked between tests
- [ ] Buffers cleaned up
