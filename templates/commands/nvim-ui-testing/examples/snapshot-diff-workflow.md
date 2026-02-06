# Example: Snapshot Diff Workflow

## Scenario
You've refactored the flyout panel and want to verify layout dimensions haven't regressed.

## Steps

1. Capture baseline (before changes):
   ```
   /ui-snapshot
   ```
   Saves to `nvim-ccasp/tests/artifacts/last-snapshot.txt`

2. Make your code changes

3. Capture new snapshot:
   ```
   /ui-snapshot
   ```

4. Claude will compare the two snapshots and report:
   - Windows added/removed
   - Dimension changes
   - Z-index changes
   - Float config differences

## Snapshot Format
```
=== CCASP Layout Snapshot ===
Timestamp: 2026-02-06 20:30:00
Editor: 120 cols x 40 lines

Windows (5 total, 3 floating):
  [1001] main      | 120x40 | normal     | active
  [1002] icon_rail | 3x36   | float(0,0) | z:50
  [1003] header    | tabline
  [1004] footer    | 120x2  | float(37,0)| z:50
  [1005] flyout    | 35x36  | float(1,3) | z:60
```
