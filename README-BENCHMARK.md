# Benchmark Tool - Quick Reference

## Single Command Benchmarking

Run the complete benchmark (both branches, full comparison) with one command:

```bash
./benchmark.js
```

## Configurable Test Count

Run with a specific number of tests (1-20):

```bash
./benchmark.js 5      # Run first 5 tests
./benchmark.js 10     # Run first 10 tests
./benchmark.js 20     # Run all 20 tests (default)
```

Or using the flag:

```bash
./benchmark.js --tests 5
./benchmark.js -t 10
```

## Using NPM Scripts

```bash
npm run benchmark        # Run all 20 tests
npm run benchmark:5      # Run 5 tests
npm run benchmark:10     # Run 10 tests
```

## What It Does

1. ✓ Generates test configurations (if needed)
2. ✓ Runs benchmark on your current branch (optimized)
3. ✓ Automatically switches to `origin/master`
4. ✓ Runs the same tests on the original branch
5. ✓ Switches back to your original branch
6. ✓ Compares results and shows detailed performance report
7. ✓ Saves comparison report to JSON file

## Output

You'll see:
- Real-time progress for each test
- Summary statistics for both branches
- Overall speedup multiplier
- Per-test comparison table
- Performance improvement percentage
- Conclusion with key metrics

### Example Output:

```
======================================================================
PERFORMANCE COMPARISON REPORT
======================================================================

OVERALL PERFORMANCE
----------------------------------------------------------------------

Total Time:
  Original:      15420.50ms
  Optimized:      3840.25ms
  Speedup:    4.01x
  Improvement: +75.1% faster
  Time saved: 11580.25ms

Average Time per Test:
  Original:        771.03ms
  Optimized:       192.01ms
  Speedup:    4.01x

======================================================================
CONCLUSION
======================================================================

✓ The optimized version is 4.01x FASTER
✓ Performance improved by 75.1%
✓ Saved 11580.25ms total across 20 test(s)
```

## Features

- **Automatic branch management** - Handles stashing, switching, and restoring
- **Configurable test count** - Run 1-20 tests as needed
- **Apples-to-apples comparison** - Same configurations for both branches
- **Detailed reporting** - Per-test and aggregate statistics
- **Error recovery** - Returns to original branch even if errors occur
- **JSON export** - Saves detailed comparison report

## Test Requirements

Each test:
- Places 3 pieces on the board before solving
- All pieces have ≥2 atoms touching the base (z=0)
- No collisions between pieces
- Solves for the remaining 9 pieces

## Files Created

- `benchmark-configs-{N}.json` - Test configurations for N tests
- `benchmark-comparison-{timestamp}.json` - Detailed comparison report

## Help

```bash
./benchmark.js --help
```

## Quick Start

To quickly test if the optimizations work:

```bash
# Fast test with just 3 cases
./benchmark.js 3
```

To run a comprehensive benchmark:

```bash
# Full benchmark with all 20 tests
./benchmark.js 20
```

