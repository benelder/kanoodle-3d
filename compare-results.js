import * as fs from 'fs';

/**
 * Compares benchmark results between two branches
 */

function loadResults(filename) {
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data);
}

function compareResults(optimizedFile, originalFile) {
    const optimized = loadResults(optimizedFile);
    const original = loadResults(originalFile);

    console.log('='.repeat(70));
    console.log('PERFORMANCE COMPARISON REPORT');
    console.log('='.repeat(70));
    console.log();

    console.log('CONFIGURATION:');
    console.log(`  Original branch:  ${original.branch || 'unknown'}`);
    console.log(`  Optimized branch: ${optimized.branch || 'unknown'}`);
    console.log(`  Test cases:       ${optimized.summary.totalTests}`);
    console.log();

    console.log('='.repeat(70));
    console.log('OVERALL PERFORMANCE');
    console.log('='.repeat(70));

    const totalSpeedup = original.summary.totalTimeMs / optimized.summary.totalTimeMs;
    const avgSpeedup = original.summary.averageTimeMs / optimized.summary.averageTimeMs;
    const timeSaved = original.summary.totalTimeMs - optimized.summary.totalTimeMs;
    const percentImprovement = ((timeSaved / original.summary.totalTimeMs) * 100);

    console.log();
    console.log('Total Time:');
    console.log(`  Original:   ${original.summary.totalTimeMs.toFixed(2)}ms`);
    console.log(`  Optimized:  ${optimized.summary.totalTimeMs.toFixed(2)}ms`);
    console.log(`  Speedup:    ${totalSpeedup.toFixed(2)}x`);
    console.log(`  Improvement: ${percentImprovement.toFixed(1)}% faster`);
    console.log(`  Time saved: ${timeSaved.toFixed(2)}ms`);
    console.log();

    console.log('Average Time per Test:');
    console.log(`  Original:   ${original.summary.averageTimeMs.toFixed(2)}ms`);
    console.log(`  Optimized:  ${optimized.summary.averageTimeMs.toFixed(2)}ms`);
    console.log(`  Speedup:    ${avgSpeedup.toFixed(2)}x`);
    console.log();

    console.log('Min Time:');
    console.log(`  Original:   ${original.summary.minTimeMs.toFixed(2)}ms`);
    console.log(`  Optimized:  ${optimized.summary.minTimeMs.toFixed(2)}ms`);
    console.log(`  Speedup:    ${(original.summary.minTimeMs / optimized.summary.minTimeMs).toFixed(2)}x`);
    console.log();

    console.log('Max Time:');
    console.log(`  Original:   ${original.summary.maxTimeMs.toFixed(2)}ms`);
    console.log(`  Optimized:  ${optimized.summary.maxTimeMs.toFixed(2)}ms`);
    console.log(`  Speedup:    ${(original.summary.maxTimeMs / optimized.summary.maxTimeMs).toFixed(2)}x`);
    console.log();

    console.log('='.repeat(70));
    console.log('PER-TEST COMPARISON');
    console.log('='.repeat(70));
    console.log();
    console.log('Test | Pieces     | Original  | Optimized | Speedup | Improvement');
    console.log('-'.repeat(70));

    let testImprovements = [];

    for (let i = 0; i < optimized.results.length; i++) {
        const opt = optimized.results[i];
        const orig = original.results[i];

        const speedup = parseFloat(orig.duration) / parseFloat(opt.duration);
        const improvement = ((parseFloat(orig.duration) - parseFloat(opt.duration)) / parseFloat(orig.duration) * 100);

        testImprovements.push({
            id: opt.id,
            speedup: speedup,
            improvement: improvement
        });

        console.log(
            `${opt.id.toString().padStart(4)} | ` +
            `${opt.pieces.padEnd(10)} | ` +
            `${orig.duration.padStart(8)}ms | ` +
            `${opt.duration.padStart(9)}ms | ` +
            `${speedup.toFixed(2)}x`.padStart(7) + ' | ' +
            `${improvement.toFixed(1)}%`.padStart(11)
        );
    }

    console.log();
    console.log('='.repeat(70));
    console.log('SPEEDUP STATISTICS');
    console.log('='.repeat(70));
    console.log();

    const speedups = testImprovements.map(t => t.speedup);
    const avgTestSpeedup = speedups.reduce((a, b) => a + b, 0) / speedups.length;
    const minTestSpeedup = Math.min(...speedups);
    const maxTestSpeedup = Math.max(...speedups);

    console.log(`Average speedup per test: ${avgTestSpeedup.toFixed(2)}x`);
    console.log(`Min speedup:              ${minTestSpeedup.toFixed(2)}x`);
    console.log(`Max speedup:              ${maxTestSpeedup.toFixed(2)}x`);
    console.log();

    // Find best and worst improvements
    const sortedBySpeedup = [...testImprovements].sort((a, b) => b.speedup - a.speedup);

    console.log('Best improvements:');
    for (let i = 0; i < Math.min(5, sortedBySpeedup.length); i++) {
        const test = sortedBySpeedup[i];
        const testData = optimized.results.find(r => r.id === test.id);
        console.log(`  Test ${test.id} (${testData.pieces}): ${test.speedup.toFixed(2)}x faster (${test.improvement.toFixed(1)}% improvement)`);
    }

    console.log();
    console.log('Smallest improvements:');
    for (let i = Math.max(0, sortedBySpeedup.length - 5); i < sortedBySpeedup.length; i++) {
        const test = sortedBySpeedup[i];
        const testData = optimized.results.find(r => r.id === test.id);
        console.log(`  Test ${test.id} (${testData.pieces}): ${test.speedup.toFixed(2)}x faster (${test.improvement.toFixed(1)}% improvement)`);
    }

    console.log();
    console.log('='.repeat(70));
    console.log('CONCLUSION');
    console.log('='.repeat(70));
    console.log();

    if (totalSpeedup > 1) {
        console.log(`✓ The optimized version is ${totalSpeedup.toFixed(2)}x FASTER`);
        console.log(`✓ Performance improved by ${percentImprovement.toFixed(1)}%`);
        console.log(`✓ Saved ${timeSaved.toFixed(2)}ms total across all tests`);
    } else {
        console.log(`✗ The optimized version is ${(1 / totalSpeedup).toFixed(2)}x SLOWER`);
    }
    console.log();
    console.log('='.repeat(70));
}

// Get filenames from command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
    console.error('Usage: node compare-results.js <optimized-results.json> <original-results.json>');
    console.error('Example: node compare-results.js benchmark-results-optimized.json benchmark-results-original.json');
    process.exit(1);
}

try {
    compareResults(args[0], args[1]);
} catch (error) {
    console.error('Comparison failed:', error);
    process.exit(1);
}

