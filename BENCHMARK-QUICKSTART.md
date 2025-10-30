# Benchmark Quick Start Guide

## Run Everything Automatically

The easiest way to run the full benchmark:

```bash
./run-full-benchmark.sh
```

This will:
1. Generate 20 test configurations (if needed)
2. Run benchmark on your current branch
3. Switch to origin/master and run the same tests
4. Compare and display the results
5. Return to your original branch

## Manual Steps

If you prefer to run each step manually:

### 1. Generate test configurations

```bash
npm run benchmark:generate
# or
node generate-benchmark-configs.js
```

### 2. Run on current branch

```bash
GIT_BRANCH=optimized npm run benchmark:run
# or
GIT_BRANCH=optimized node run-benchmark.js
```

### 3. Switch to origin/master and run

```bash
git checkout origin/master
GIT_BRANCH=original npm run benchmark:run
git checkout -
```

### 4. Compare results

```bash
npm run benchmark:compare benchmark-results-optimized.json benchmark-results-original.json
# or
node compare-results.js benchmark-results-optimized.json benchmark-results-original.json
```

## What Gets Tested

Each of the 20 test cases:
- Starts with 3 pieces already placed on the board
- Each piece has at least 2 atoms touching the base (z=0)
- No pieces are colliding
- The `solve()` method fills in the remaining 9 pieces

## Output

You'll see:
- Per-test timing results
- Overall statistics (min, max, average, total time)
- Speedup multiplier (how many times faster)
- Percentage improvement
- Best and worst performing tests

## Files Created

- `benchmark-configs.json` - Test configurations (commit this!)
- `benchmark-results-optimized.json` - Results from optimized branch
- `benchmark-results-original.json` - Results from original branch

## Example Results

```
======================================================================
OVERALL PERFORMANCE
======================================================================

Total Time:
  Original:   15420.50ms
  Optimized:  3840.25ms
  Speedup:    4.01x
  Improvement: 75.1% faster
  Time saved: 11580.25ms
```

## Troubleshooting

- **Error: Cannot find module**: Make sure you're in the project root
- **Missing configs**: Run `npm run benchmark:generate` first
- **Different results**: Ensure `benchmark-configs.json` is committed

