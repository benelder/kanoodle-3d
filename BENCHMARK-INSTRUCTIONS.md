# Kanoodle-3D Performance Benchmark Instructions

This benchmark system allows you to compare the performance of the `solve()` method between the original implementation (origin/master) and the optimized implementation (current branch).

## Overview

The benchmark system consists of:
1. **Configuration Generator** - Creates 20 test cases with 3 pieces each
2. **Benchmark Runner** - Executes solve() and measures performance
3. **Results Comparator** - Analyzes and compares results between branches

## Requirements

Each test configuration:
- Places exactly 3 pieces on the board before calling `solve()`
- All pieces are in valid positions (no collisions)
- Each piece has at least 2 atoms touching the base (z=0)
- Same configurations are used for both branches (apples-to-apples comparison)

## Step-by-Step Instructions

### Step 1: Generate Test Configurations (on current branch)

First, generate the 20 test configurations that will be used for both branches:

```bash
node generate-benchmark-configs.js
```

This creates `benchmark-configs.json` with 20 test cases.

**Important:** Commit this file so it's available to both branches!

```bash
git add benchmark-configs.json
git commit -m "Add benchmark configurations for performance testing"
```

### Step 2: Run Benchmark on Current (Optimized) Branch

Run the benchmark on your current optimized branch:

```bash
GIT_BRANCH=optimized node run-benchmark.js
```

This will:
- Run all 20 test cases
- Measure solve() performance for each
- Display results in the console
- Save results to `benchmark-results-optimized-{timestamp}.json`

Rename the results file for easier comparison:

```bash
# Find the most recent optimized results file and rename it
mv benchmark-results-optimized-*.json benchmark-results-optimized.json
```

### Step 3: Run Benchmark on Original Branch

Switch to the original branch and run the same tests:

```bash
# Stash or commit any changes
git stash

# Switch to origin/master
git checkout origin/master

# Run benchmark with the same configurations
GIT_BRANCH=original node run-benchmark.js

# Rename results file
mv benchmark-results-original-*.json benchmark-results-original.json

# Return to your optimized branch
git checkout -

# Restore any stashed changes
git stash pop
```

### Step 4: Compare Results

Compare the performance between both branches:

```bash
node compare-results.js benchmark-results-optimized.json benchmark-results-original.json
```

This will display:
- Overall speedup and improvement percentage
- Per-test comparison
- Statistical analysis
- Best/worst improvements

## Automated Benchmark Script

For convenience, you can use the provided shell script to automate the entire process:

```bash
./run-full-benchmark.sh
```

This script will:
1. Generate configurations (if not already present)
2. Run benchmark on current branch
3. Run benchmark on origin/master
4. Compare and display results
5. Return to your original branch

## Output Files

- `benchmark-configs.json` - Test configurations (20 cases)
- `benchmark-results-optimized.json` - Results from optimized branch
- `benchmark-results-original.json` - Results from original branch

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

**Issue:** "benchmark-configs.json not found"
- **Solution:** Run `node generate-benchmark-configs.js` first

**Issue:** Different number of tests between branches
- **Solution:** Ensure `benchmark-configs.json` is committed and available in both branches

