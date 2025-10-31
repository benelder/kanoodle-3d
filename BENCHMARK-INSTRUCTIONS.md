# Kanoodle-3D Performance Benchmark Instructions

This benchmark system allows you to compare the performance of the `solve()` method between the original implementation (origin/master) and the optimized implementation (current branch).

## Overview

The benchmark system automatically:
1. **Generates Test Configurations** - Creates random test cases with configurable starting pieces (default: 3, range: 0-11)
2. **Runs Benchmark** - Executes solve() and measures performance on both branches
3. **Compares Results** - Analyzes and compares results between branches

### Features

✓ **Fully automated** - No manual intervention needed  
✓ **Configurable test count** - Run 1-20 tests (default: 2)  
✓ **Configurable starting pieces** - Run with 0-11 starting pieces (default: 3)  
✓ **Branch management** - Automatically switches branches  
✓ **Stash handling** - Saves and restores your changes  
✓ **Comparison report** - Detailed performance analysis  
✓ **JSON export** - Saves results for later reference  
✓ **Error recovery** - Returns to original branch on failure  

## Requirements

Each test configuration:
- Places a configurable number of pieces on the board before calling `solve()` (default: 3, range: 0-11)
- All pieces are in valid positions (no collisions)
- Each piece has at least 2 atoms touching the base (z=0)
- Same configurations are used for both branches (apples-to-apples comparison)
- Fresh random configurations are generated on each run for better randomization

## Quick Start

The simplest way to run a benchmark:

```bash
./benchmark.js
```

This will (using default settings: 2 tests, 3 starting pieces):
1. Generate fresh random test configurations
2. Run benchmark on your current branch (optimized)
3. Automatically switch to origin/master
4. Run the same tests on the original branch
5. Switch back to your original branch
6. Compare results and display a detailed report

### Quick Examples

**Fast test** (2 tests, ~10 seconds):
```bash
./benchmark.js 2
```

**Medium test** (5 tests, ~2-5 minutes):
```bash
./benchmark.js 5
```

**Full benchmark** (20 tests, ~15-30 minutes):
```bash
./benchmark.js 20
```

## Command Line Options

### Basic Usage

```bash
./benchmark.js               # Default: 2 tests, 3 starting pieces
./benchmark.js 10            # Run 10 tests, 3 starting pieces
./benchmark.js --tests 5     # Run 5 tests, 3 starting pieces
./benchmark.js -t 3          # Run 3 tests, 3 starting pieces
./benchmark.js --help        # Show help message
```

### Configurable Test Count

Run with a specific number of tests (1-20):

```bash
./benchmark.js 5      # Run 5 tests
./benchmark.js 10     # Run 10 tests
./benchmark.js 20     # Run 20 tests
```

Or using flags:

```bash
./benchmark.js --tests 5
./benchmark.js -t 10
./benchmark.js --base <git-ref>  # Compare to a specific commit/tag/branch
```

### Configurable Starting Piece Count

Run with a specific number of starting pieces (0-11, default: 3):

```bash
./benchmark.js --pieces 5        # Run 2 tests with 5 starting pieces (default)
./benchmark.js -p 0              # Run 2 tests with 0 starting pieces (solve from empty board, default)
./benchmark.js -p 11            # Run 2 tests with 11 starting pieces (only 1 piece to solve, default)
./benchmark.js --tests 10 --pieces 7  # Run 10 tests with 7 starting pieces
```

**Starting Piece Options:**
- `--pieces 0`: Solve from empty board (all 12 pieces)
- `--pieces 3`: Default - solve remaining 9 pieces
- `--pieces 11`: Solve remaining 1 piece

### Compare to Specific Git Reference

```bash
./benchmark.js -b a1b2c3d           # Compare to commit a1b2c3d with 2 tests, 3 pieces
./benchmark.js --base v1.0.0 10     # Compare to tag v1.0.0 with 10 tests, 3 pieces
./benchmark.js --base master 5 -p 6 # Compare to master branch with 5 tests, 6 pieces
```

## What Happens

1. **Generates configurations** (fresh random configs each run)
   - Creates N test cases with configurable starting pieces (default: 3, range: 0-11)
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
PER-TEST COMPARISON
======================================================================

Test | Pieces     | Original  | Optimized | Speedup | Improvement
----------------------------------------------------------------------
   1 | D,H,E      |  2500.34ms |    620.18ms |   4.03x |      +75.2%
   2 | G,F,D      |  3200.45ms |    780.22ms |   4.10x |      +75.6%
   ...

======================================================================
CONCLUSION
======================================================================

✓ The optimized version is 4.01x FASTER
✓ Performance improved by 75.1%
✓ Saved 11580.25ms total across 20 test(s)
```

## Understanding Results

### Expected Performance Characteristics

- **Small test counts (1-3)**: May show minimal improvement or slight overhead
  - Constraint propagation overhead vs pruning benefits
  - Statistical variance with small samples
  
- **Medium test counts (5-10)**: Should show moderate improvements
  - 2-3x speedup typical
  - Benefits of pruning start to show
  
- **Large test counts (15-20)**: Should show significant improvements  
  - 3-5x speedup expected
  - Constraint propagation pays off
  - Better pruning of search space

### Optimization Benefits

The optimized branch includes:

1. **Bitmask collision detection** - Single bitwise AND vs multiple Map lookups
2. **Bitmask duplicate detection** - O(1) Set lookup vs O(n) array scan
3. **Bitmask bounds checking** - Single bitwise AND vs multiple array iterations
4. **Constraint propagation** - Prunes invalid positions after each placement
5. **Removed redundant collision checks** - Trust validPositions accuracy

## Tips

- **Quick validation**: Run `./benchmark.js 2` or `./benchmark.js 3` to quickly verify improvements
- **Consistent comparison**: Run with same test count each time for trending
- **Statistical significance**: Use 10+ tests for reliable results
- **Time budget**: Each test takes 1-60 seconds on average

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

**Issue:** Want to see intermediate results
- **Solution:** Watch real-time output during execution

## Manual Comparison of Results Files

If you have existing comparison JSON files and want to compare them, you can use:

```bash
node compare-results.js <optimized-results.json> <original-results.json>
```

This standalone tool compares two benchmark result files and displays detailed statistics.

## Files You Can Commit

- ✓ `benchmark.js` - Main executable
- ✓ `BENCHMARK-INSTRUCTIONS.md` - This documentation
- ✗ `benchmark-comparison-*.json` - Results (in .gitignore)
