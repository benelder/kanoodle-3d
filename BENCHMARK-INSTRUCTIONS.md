# Kanoodle-3D Performance Benchmark Instructions

This benchmark system allows you to compare the performance of the `solve()` method between the original implementation (origin/master) and the optimized implementation (current branch).

## Overview

The benchmark system automatically:
1. **Generates Test Configurations** - Creates random test cases with 3 pieces each (fresh configs each run)
2. **Runs Benchmark** - Executes solve() and measures performance on both branches
3. **Compares Results** - Analyzes and compares results between branches

## Requirements

Each test configuration:
- Places exactly 3 pieces on the board before calling `solve()`
- All pieces are in valid positions (no collisions)
- Each piece has at least 2 atoms touching the base (z=0)
- Same configurations are used for both branches (apples-to-apples comparison)
- Fresh random configurations are generated on each run for better randomization

## Quick Start

The simplest way to run a benchmark:

```bash
./benchmark.js
```

This will:
1. Generate fresh random test configurations
2. Run benchmark on your current branch (optimized)
3. Automatically switch to origin/master
4. Run the same tests on the original branch
5. Switch back to your original branch
6. Compare results and display a detailed report

## Configurable Test Count

Run with a specific number of tests (1-20):

```bash
./benchmark.js 5      # Run 5 tests
./benchmark.js 10     # Run 10 tests
./benchmark.js 20     # Run all 20 tests (default)
```

Or using flags:

```bash
./benchmark.js --tests 5
./benchmark.js -t 10
./benchmark.js --base <git-ref>  # Compare to a specific commit/tag/branch
```

## What Happens

1. **Generates configurations** (fresh random configs each run)
   - Creates N test cases with 3 pieces each
   - Each piece has ≥2 atoms touching base (z=0)
   - No collisions, valid positions only
   - Ensures randomization across multiple benchmark runs

2. **Runs on current branch** (optimized)
   - Executes solve() for each test
   - Measures precise timing with performance.now()
   - Displays real-time progress

3. **Switches to origin/master**
   - Stashes uncommitted changes (if any)
   - Checks out origin/master branch

4. **Runs on original branch**
   - Executes same tests with original code
   - Uses identical configurations (apples-to-apples)

5. **Returns to your branch**
   - Checks out original branch
   - Restores stashed changes

6. **Compares and reports**
   - Calculates speedup multiplier
   - Shows per-test comparison
   - Displays overall statistics
   - Exports JSON report

## Output Files

- `benchmark-comparison-{timestamp}.json` - Detailed comparison report

## Example Output

```
======================================================================
PERFORMANCE COMPARISON REPORT
======================================================================

CONFIGURATION:
  Original branch:  origin/master
  Optimized branch: optimized
  Test cases:       20

======================================================================
OVERALL PERFORMANCE
======================================================================

Total Time:
  Original:   15420.50ms
  Optimized:  3840.25ms
  Speedup:    4.01x
  Improvement: 75.1% faster
  Time saved: 11580.25ms

Average Time per Test:
  Original:   771.03ms
  Optimized:  192.01ms
  Speedup:    4.01x
```

## Notes

- The benchmark uses `performance.now()` for precise timing
- Each test starts from the same initial board state
- Results include both solved and unsolved cases
- Speedup is calculated as: original_time / optimized_time

## Troubleshooting

**Issue:** "Cannot find module './kanoodle.js'"
- **Solution:** Make sure you're in the project root directory

**Issue:** "Could not checkout origin/master"
- **Solution:** Ensure origin/master exists and is up to date. Try `git fetch origin` first.

**Issue:** Branch switching fails
- **Solution:** Ensure you have no uncommitted changes that can't be stashed, or commit them first

**Issue:** Inconsistent results between runs
- **Solution:** This is expected - configurations are randomly generated each run for better test coverage. Run with more tests (10-20) for better statistical averaging

**Issue:** Benchmark takes too long
- **Solution:** Use fewer tests: `./benchmark.js 5` or `./benchmark.js 3`

## Manual Comparison of Results Files

If you have existing comparison JSON files and want to compare them, you can use:

```bash
node compare-results.js <optimized-results.json> <original-results.json>
```

This standalone tool compares two benchmark result files and displays detailed statistics.

