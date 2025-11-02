#!/usr/bin/env node

import { Board, Location } from './kanoodle.js';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Comprehensive benchmark tool for kanoodle-3d
 * Compares solve() performance between current branch and origin/master
 */

// Parse command line arguments
const args = process.argv.slice(2);
let testCount = 2;
let pieceCount = 3;
let showHelp = false;
let baseRef = 'origin/master';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
        showHelp = true;
    } else if (args[i] === '--tests' || args[i] === '-t') {
        testCount = parseInt(args[i + 1]);
        i++;
    } else if (args[i] === '--pieces' || args[i] === '-p') {
        pieceCount = parseInt(args[i + 1]);
        i++;
    } else if (args[i] === '--base' || args[i] === '-b') {
        baseRef = args[i + 1];
        i++;
    } else if (!isNaN(parseInt(args[i]))) {
        testCount = parseInt(args[i]);
    }
}

if (showHelp) {
    console.log(`
Kanoodle-3D Performance Benchmark Tool

Usage:
  node benchmark.js [options] [testCount]
  ./benchmark.js [options] [testCount]

Options:
  --tests, -t <number>    Number of tests to run (1-20, default: 2)
  --pieces, -p <number>   Number of starting pieces (0-11, default: 3)
  --base, -b <git-ref>    Base git ref to compare against (default: origin/master)
  --help, -h              Show this help message

Examples:
  Basic Usage:
  ./benchmark.js                      # Run with defaults: 2 tests, 3 starting pieces
  ./benchmark.js 5                    # Run 5 tests with 3 starting pieces
  ./benchmark.js --tests 10           # Run 10 tests with 3 starting pieces
  ./benchmark.js -t 20                # Run all 20 tests with 3 starting pieces

  Custom Starting Pieces:
  ./benchmark.js --pieces 5           # Run 2 tests with 5 starting pieces (default)
  ./benchmark.js -p 0                 # Run 2 tests with 0 starting pieces (solve from empty board)
  ./benchmark.js -p 11                # Run 2 tests with 11 starting pieces (only 1 piece to solve)
  ./benchmark.js --tests 10 --pieces 7 # Run 10 tests with 7 starting pieces

  Compare to Specific Git Reference:
  ./benchmark.js -b a1b2c3d           # Compare to commit a1b2c3d with 2 tests, 3 pieces
  ./benchmark.js --base v1.0.0 10     # Compare to tag v1.0.0 with 10 tests, 3 pieces
  ./benchmark.js --base master 5 -p 6 # Compare to master branch with 5 tests, 6 pieces

What This Tool Does:
  1. Generates fresh random test configurations
     - Places configurable starting pieces (default: 3, range: 0-11)
     - Each piece has ≥2 atoms touching base (z=0)
     - No collisions, valid positions only
  2. Runs benchmark on your current branch
     - Executes solve() for each test
     - Measures precise timing with performance.now()
  3. Switches to base ref (default: origin/master)
     - Stashes uncommitted changes if needed
     - Checks out the base branch/commit
  4. Runs same tests on base branch
     - Uses identical configurations (apples-to-apples comparison)
  5. Returns to your original branch
     - Restores stashed changes
  6. Compares and reports results
     - Calculates speedup multiplier
     - Shows per-test comparison
     - Exports JSON report: benchmark-comparison-{timestamp}.json

Output:
  - Real-time progress during execution
  - Detailed performance comparison report
  - JSON file with complete results

For more information, see:
  - BENCHMARK-INSTRUCTIONS.md
`);
    process.exit(0);
}

// Validate test count
if (testCount < 1 || testCount > 20) {
    console.error('Error: Test count must be between 1 and 20');
    process.exit(1);
}

// Validate piece count
if (pieceCount < 0 || pieceCount > 11) {
    console.error('Error: Starting piece count must be between 0 and 11');
    process.exit(1);
}

console.log('='.repeat(70));
console.log('KANOODLE-3D AUTOMATED PERFORMANCE BENCHMARK');
console.log('='.repeat(70));
console.log(`Running ${testCount} test case(s) with ${pieceCount} starting piece(s)`);
console.log('='.repeat(70));
console.log();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function countAtomsAtZLevel(piece, zLevel) {
    return piece.absolutePosition.filter(atom => atom.offset.z === zLevel).length;
}

function generateConfigurations(count, startingPieceCount) {
    const configs = [];
    const board = new Board();
    const maxAttempts = 10000;
    const maxZLevel = 5; // Maximum z-level in the board (x+y+z <= 5)

    console.log(`Generating ${count} benchmark configuration(s) with ${startingPieceCount} starting piece(s)...\n`);

    while (configs.length < count) {
        const caseIndex = configs.length + 1;
        console.log(`Case ${caseIndex}/${count}: start (placing ${startingPieceCount} pieces)`);
        const caseStart = Date.now();
        board.resetBoard();
        const placedPieces = [];
        let validConfig = true;
        let currentTargetLayer = 0; // Start at base layer (z=0)

        for (let pieceNum = 0; pieceNum < startingPieceCount; pieceNum++) {
            console.log(`  Piece ${pieceNum + 1}/${startingPieceCount}: searching on layer z=${currentTargetLayer}...`);
            const unusedColors = Array.isArray(board.getUnusedColors()) ? board.getUnusedColors() : [...board.getUnusedColors()];
            let placed = false;
            let attempts = 0;
            let layerAdvanced = false;

            // Try to place piece at current target layer
            while (!placed && currentTargetLayer <= maxZLevel && unusedColors.length > 0) {
                while (!placed && attempts < maxAttempts && unusedColors.length > 0) {
                    attempts++;
                    if (attempts % 250 === 0) {
                        let colorsWithCandidates = 0;
                        let maxCandidates = 0;
                        for (const [, colorData] of unusedColors) {
                            let count = 0;
                            for (const pos of colorData.allPositions) {
                                if (countAtomsAtZLevel(pos, currentTargetLayer) >= 2 && !board.collision(pos)) count++;
                            }
                            if (count > 0) {
                                colorsWithCandidates++;
                                if (count > maxCandidates) maxCandidates = count;
                            }
                        }
                        console.log(`    ...attempts=${attempts} | layer=z${currentTargetLayer} | colorsWithCandidates=${colorsWithCandidates} | maxCandidates=${maxCandidates}`);
                    }
                    const randomIndex = Math.floor(Math.random() * unusedColors.length);
                    const [colorKey, colorData] = unusedColors[randomIndex];

                    const validPositions = colorData.allPositions.filter(pos => {
                        return countAtomsAtZLevel(pos, currentTargetLayer) >= 2 && !board.collision(pos);
                    });

                    if (validPositions.length > 0) {
                        const randomPos = validPositions[Math.floor(Math.random() * validPositions.length)];

                        try {
                            board.placePiece(randomPos);
                            console.log(`    ✓ placed ${randomPos.character} on layer z=${currentTargetLayer} (candidates=${validPositions.length}, attempts=${attempts})`);
                            placedPieces.push({
                                character: randomPos.character,
                                rootPosition: {
                                    x: randomPos.rootPosition.x,
                                    y: randomPos.rootPosition.y,
                                    z: randomPos.rootPosition.z
                                },
                                rotation: randomPos.rotation,
                                plane: randomPos.plane,
                                lean: randomPos.lean,
                                mirrorX: randomPos.mirrorX
                            });
                            placed = true;
                        } catch (e) {
                            continue;
                        }
                    }
                }

                // If we couldn't place on current layer after maxAttempts, advance to next layer
                if (!placed && currentTargetLayer < maxZLevel) {
                    // Check if there are any valid positions on current layer
                    let hasValidPositions = false;
                    for (const [, colorData] of unusedColors) {
                        for (const pos of colorData.allPositions) {
                            if (countAtomsAtZLevel(pos, currentTargetLayer) >= 2 && !board.collision(pos)) {
                                hasValidPositions = true;
                                break;
                            }
                        }
                        if (hasValidPositions) break;
                    }

                    // Advance to next layer if no valid positions exist, or if we've exhausted attempts
                    currentTargetLayer++;
                    attempts = 0; // Reset attempts for new layer
                    layerAdvanced = true;
                    if (hasValidPositions) {
                        console.log(`    → Advancing to layer z=${currentTargetLayer} (exhausted attempts on previous layer)`);
                    } else {
                        console.log(`    → Advancing to layer z=${currentTargetLayer} (no valid positions on previous layer)`);
                    }
                } else if (!placed) {
                    // Can't place even at max layer
                    break;
                }
            }

            if (!placed) {
                console.log(`    ✗ failed to place piece ${pieceNum + 1} after ${attempts} attempts on layer z=${currentTargetLayer}; restarting case`);
                validConfig = false;
                break;
            }

            if (layerAdvanced) {
                console.log(`  Piece ${pieceNum + 1}/${startingPieceCount}: placed on layer z=${currentTargetLayer} (elapsed ${Date.now() - caseStart}ms)`);
            } else {
                console.log(`  Piece ${pieceNum + 1}/${startingPieceCount}: placed (elapsed ${Date.now() - caseStart}ms)`);
            }
        }

        if (validConfig && placedPieces.length === startingPieceCount) {
            configs.push({
                id: configs.length + 1,
                pieces: placedPieces
            });
            console.log(`  Generated config ${configs.length}/${count} - Pieces: ${placedPieces.map(p => p.character).join(', ')} (elapsed ${Date.now() - caseStart}ms)`);
        }
        console.log(`Case ${caseIndex}/${count}: ${validConfig ? 'complete' : 'retrying'}\n`);
    }

    board.printBoard();
    return configs;
}

function setupBoard(board, config) {
    board.resetBoard();

    for (const pieceConfig of config.pieces) {
        const colorData = board.pieceRegistry.colors.get(pieceConfig.character);

        const piece = colorData.allPositions.find(p =>
            p.rootPosition.x === pieceConfig.rootPosition.x &&
            p.rootPosition.y === pieceConfig.rootPosition.y &&
            p.rootPosition.z === pieceConfig.rootPosition.z &&
            p.rotation === pieceConfig.rotation &&
            p.plane === pieceConfig.plane &&
            p.lean === pieceConfig.lean &&
            p.mirrorX === pieceConfig.mirrorX
        );

        if (!piece) {
            throw new Error(`Could not find piece matching config: ${JSON.stringify(pieceConfig)}`);
        }

        board.placePiece(piece);
    }
}

function compareResults(optimized, original) {
    const repeatCount = 73;
    console.log();
    console.log('='.repeat(repeatCount));
    console.log('PERFORMANCE COMPARISON REPORT');
    console.log('='.repeat(repeatCount));
    console.log();

    const totalSpeedup = original.summary.totalTimeMs / optimized.summary.totalTimeMs;
    const avgSpeedup = original.summary.averageTimeMs / optimized.summary.averageTimeMs;
    const timeSaved = original.summary.totalTimeMs - optimized.summary.totalTimeMs;
    const percentImprovement = ((timeSaved / original.summary.totalTimeMs) * 100);

    console.log('OVERALL PERFORMANCE');
    console.log('-'.repeat(repeatCount));
    console.log();
    console.log('Total Time:');
    console.log(`  Original:   ${original.summary.totalTimeMs.toFixed(2).padStart(12)}ms`);
    console.log(`  Optimized:  ${optimized.summary.totalTimeMs.toFixed(2).padStart(12)}ms`);
    console.log(`  Speedup:    ${totalSpeedup.toFixed(2).padStart(13)}x`);
    console.log(`  Improvement: ${percentImprovement >= 0 ? '+' : ''}${percentImprovement.toFixed(1)}% ${percentImprovement >= 0 ? 'faster' : 'slower'}`);
    console.log(`  Time saved: ${timeSaved.toFixed(2).padStart(12)}ms`);
    console.log();

    console.log('Average Time per Test:');
    console.log(`  Original:   ${original.summary.averageTimeMs.toFixed(2).padStart(12)}ms`);
    console.log(`  Optimized:  ${optimized.summary.averageTimeMs.toFixed(2).padStart(12)}ms`);
    console.log(`  Speedup:    ${avgSpeedup.toFixed(2).padStart(13)}x`);
    console.log();

    console.log('='.repeat(repeatCount));
    console.log('PER-TEST COMPARISON');
    console.log('='.repeat(repeatCount));
    console.log();
    console.log('Test | Pieces     | Original   | Optimized   | Speedup      | Improvement');
    console.log('-'.repeat(repeatCount));

    for (let i = 0; i < optimized.results.length; i++) {
        const opt = optimized.results[i];
        const orig = original.results[i];

        const speedup = parseFloat(orig.duration) / parseFloat(opt.duration);
        const improvement = ((parseFloat(orig.duration) - parseFloat(opt.duration)) / parseFloat(orig.duration) * 100);

        console.log(
            `${opt.id.toString().padStart(4)} | ` +
            `${opt.pieces.padEnd(10)} | ` +
            `${orig.duration.padStart(8)}ms | ` +
            `${opt.duration.padStart(9)}ms | ` +
            `${speedup.toFixed(2)}x`.padStart(12) + ' | ' +
            `${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)}%`.padStart(11)
        );
    }

    console.log();
    console.log('='.repeat(repeatCount));
    console.log('CONCLUSION');
    console.log('='.repeat(repeatCount));
    console.log();

    if (totalSpeedup > 1) {
        console.log(`✓ The optimized version is ${totalSpeedup.toFixed(2)}x FASTER`);
        console.log(`✓ Performance improved by ${percentImprovement.toFixed(1)}%`);
        console.log(`✓ Saved ${timeSaved.toFixed(2)}ms total across ${optimized.summary.totalTests} test(s)`);
    } else {
        console.log(`✗ The optimized version is ${(1 / totalSpeedup).toFixed(2)}x SLOWER`);
        console.log(`✗ Performance decreased by ${Math.abs(percentImprovement).toFixed(1)}%`);
    }
    console.log();
    console.log('='.repeat(repeatCount));

    // Save comparison report
    const reportFile = `benchmark-comparison-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify({
        testCount: optimized.summary.totalTests,
        original: original,
        optimized: optimized,
        speedup: totalSpeedup,
        improvementPercent: percentImprovement
    }, null, 2));
    console.log(`\n✓ Comparison report saved to ${reportFile}\n`);
}

function gitCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch (error) {
        return null;
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    try {
        // Step 1: Generate configurations
        const configurations = generateConfigurations(testCount, pieceCount);

        // Step 2: Get current branch
        const currentBranch = gitCommand('git branch --show-current') || 'current';
        console.log(`Current branch: ${currentBranch}\n`);

        // Prepare persistent child runner and absolute config path so runs survive branch checkout
        const runnerPath = path.join(process.cwd(), '.bench-child-runner.mjs');
        const configPath = path.join(process.cwd(), '.bench-configs.json');
        fs.writeFileSync(configPath, JSON.stringify({ configurations }, null, 0));

        const runnerSource = `import { Board } from './kanoodle.js';\nimport * as fs from 'fs';\nconst args=process.argv.slice(2);let configFile=null;let branchName='current';for(let i=0;i<args.length;i++){if(args[i]==='--config'){configFile=args[i+1];i++;}else if(args[i]==='--branch'){branchName=args[i+1];i++;}}if(!configFile){throw new Error('Missing --config');}const data=JSON.parse(fs.readFileSync(configFile,'utf8'));const configurations=data.configurations;function setupBoard(board, config){board.resetBoard();for(const pieceConfig of config.pieces){const colorData=board.pieceRegistry.colors.get(pieceConfig.character);const piece=colorData.allPositions.find(p=>p.rootPosition.x===pieceConfig.rootPosition.x&&p.rootPosition.y===pieceConfig.rootPosition.y&&p.rootPosition.z===pieceConfig.rootPosition.z&&p.rotation===pieceConfig.rotation&&p.plane===pieceConfig.plane&&p.lean===pieceConfig.lean&&p.mirrorX===pieceConfig.mirrorX);if(!piece){throw new Error('Could not find piece matching config');}board.placePiece(piece);}}function run(configurations, branchName){const board=new Board();const results=[];let totalTime=0;let successCount=0;let failCount=0;for(let idx=0; idx<configurations.length; idx++){const config=configurations[idx];console.error(\`[\${branchName}] Test \${idx+1}/\${configurations.length} start\`);setupBoard(board, config);const startTime=performance.now();const success=board.solve();const endTime=performance.now();const duration=endTime-startTime;console.error(\`[\${branchName}] Test \${idx+1}/\${configurations.length} done in \${duration.toFixed(2)}ms (\${success?'✓':'✗'})\`);totalTime+=duration;if(success){successCount++;}else{failCount++;}results.push({id:config.id,pieces:config.pieces.map(p=>p.character).join(','),duration:duration.toFixed(2),success:success});}return {branch:branchName,timestamp:new Date().toISOString(),summary:{totalTests:configurations.length,solved:successCount,noSolution:failCount,totalTimeMs:parseFloat(totalTime.toFixed(2)),averageTimeMs:parseFloat((totalTime/configurations.length).toFixed(2)),minTimeMs:parseFloat(Math.min(...results.map(r=>parseFloat(r.duration))).toFixed(2)),maxTimeMs:parseFloat(Math.max(...results.map(r=>parseFloat(r.duration))).toFixed(2))},results:results};}const out=run(configurations,branchName);process.stdout.write(JSON.stringify(out));`;
        fs.writeFileSync(runnerPath, runnerSource);

        // Step 3: Run benchmark on current (optimized) branch in child process
        const optimizedJson = execSync(`${process.execPath} ${runnerPath} --config ${configPath} --branch optimized`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] });
        const optimizedResults = JSON.parse(optimizedJson);

        // Step 4: Check for uncommitted changes
        const hasChanges = gitCommand('git status --porcelain');
        let stashed = false;

        if (hasChanges) {
            console.log('\n⚠ Stashing uncommitted changes...');
            gitCommand('git stash push -m "Benchmark temporary stash"');
            stashed = true;
        }

        // Step 5: Switch to base ref
        console.log(`\nSwitching to ${baseRef}...`);
        let checkoutResult = gitCommand(`git checkout ${baseRef} 2>&1`);
        if (!checkoutResult && baseRef === 'origin/master') {
            // Fallback to master only for the default case
            checkoutResult = gitCommand('git checkout master 2>&1');
        }

        if (!checkoutResult) {
            console.error(`Error: Could not checkout ${baseRef}${baseRef === 'origin/master' ? ' or master' : ''}`);
            if (stashed) {
                gitCommand('git stash pop');
            }
            process.exit(1);
        }

        // Step 6: Run benchmark on base ref via child runner
        const originalJson = execSync(`${process.execPath} ${runnerPath} --config ${configPath} --branch ${baseRef}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] });
        const originalResults = JSON.parse(originalJson);

        // Step 7: Return to original branch
        console.log(`\nReturning to ${currentBranch}...`);
        gitCommand(`git checkout ${currentBranch}`);

        if (stashed) {
            console.log('Restoring stashed changes...');
            gitCommand('git stash pop');
        }

        // Step 8: Compare results and cleanup temp files
        compareResults(optimizedResults, originalResults);
        try { fs.unlinkSync(runnerPath); } catch (_) { }
        try { fs.unlinkSync(configPath); } catch (_) { }

    } catch (error) {
        console.error('\n❌ Benchmark failed:', error.message);
        console.error(error.stack);

        // Try to return to original branch
        try {
            const currentBranch = gitCommand('git branch --show-current');
            if (!currentBranch) {
                console.log('\nAttempting to return to previous branch...');
                gitCommand('git checkout -');
            }
            try { fs.unlinkSync(path.join(process.cwd(), '.bench-child-runner.mjs')); } catch (_) { }
            try { fs.unlinkSync(path.join(process.cwd(), '.bench-configs.json')); } catch (_) { }
        } catch (e) {
            // Ignore
        }

        process.exit(1);
    }
}

main();

