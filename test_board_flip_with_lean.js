import { Location, Gray } from './kanoodle.js';

// Helper functions
function applyMirrorX(offset, mirrorX) {
    return mirrorX ? new Location(offset.x + offset.y, -offset.y, offset.z) : offset;
}

function applyLean(offset, lean) {
    return lean ? new Location(offset.x, 0, offset.y) : offset;
}

function rotateOffset(location, rotation) {
    if (rotation === 0) return location;
    let r = new Location(location.x, location.y, location.z);
    for (let i = 0; i < rotation; i++) {
        r = new Location(-r.y, r.x + r.y, r.z);
    }
    return r;
}

function transposeToPlane(plane, origin) {
    if (plane === 0) return origin;
    else if (plane === 1) return new Location(5 - (origin.x + origin.y + origin.z), origin.x, origin.z);
    else if (plane === 2) return new Location(origin.y, 5 - (origin.x + origin.y + origin.z), origin.z);
    throw new Error('Plane must be between 0 and 2');
}

function positionToBit(x, y, z) {
    return BigInt(x * 36 + y * 6 + z);
}

function isValidPosition(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && (x + y + z) <= 5;
}

function getPositionMask(positions) {
    let mask = 0n;
    for (const pos of positions) {
        if (isValidPosition(pos.x, pos.y, pos.z)) {
            const bit = positionToBit(pos.x, pos.y, pos.z);
            mask |= (1n << bit);
        }
    }
    return mask;
}

function getValidRoots() {
    const roots = [];
    for (let x = 0; x < 6; x++) {
        for (let y = 0; y < 6; y++) {
            for (let z = 0; z < 6; z++) {
                if (x + y + z <= 5) {
                    roots.push(new Location(x, y, z));
                }
            }
        }
    }
    return roots;
}

// Board-flip approach WITH lean
function boardFlipApproachWithLean(baseNodes) {
    const seenMasks = new Set();
    const validRoots = getValidRoots();
    
    // Step 1: Generate all "flat" positions (no lean, plane 0)
    const flatPositions = [];
    const flatPositionsSet = new Set();
    
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                const transformedNodes = [];
                let valid = true;
                
                for (const node of baseNodes) {
                    const mirrored = applyMirrorX(node, mirrorX);
                    const rotated = rotateOffset(mirrored, rotation);
                    // No lean - keep it "flat"
                    const placed = new Location(root.x + rotated.x, root.y + rotated.y, root.z + rotated.z);
                    const transposed = transposeToPlane(0, placed);
                    
                    if (!isValidPosition(transposed.x, transposed.y, transposed.z)) {
                        valid = false;
                        break;
                    }
                    transformedNodes.push(transposed);
                }
                
                if (valid) {
                    const mask = getPositionMask(transformedNodes);
                    const maskStr = mask.toString();
                    if (!flatPositionsSet.has(maskStr)) {
                        flatPositionsSet.add(maskStr);
                        flatPositions.push(transformedNodes);
                    }
                }
            }
        }
    }
    
    // Step 1b: Generate all "leaned" positions (with lean, plane 0)
    const leanedPositions = [];
    const leanedPositionsSet = new Set();
    
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                const transformedNodes = [];
                let valid = true;
                
                for (const node of baseNodes) {
                    const mirrored = applyMirrorX(node, mirrorX);
                    const rotated = rotateOffset(mirrored, rotation);
                    const leaned = applyLean(rotated, true); // Apply lean
                    const placed = new Location(root.x + leaned.x, root.y + leaned.y, root.z + leaned.z);
                    const transposed = transposeToPlane(0, placed);
                    
                    if (!isValidPosition(transposed.x, transposed.y, transposed.z)) {
                        valid = false;
                        break;
                    }
                    transformedNodes.push(transposed);
                }
                
                if (valid) {
                    const mask = getPositionMask(transformedNodes);
                    const maskStr = mask.toString();
                    if (!leanedPositionsSet.has(maskStr)) {
                        leanedPositionsSet.add(maskStr);
                        leanedPositions.push(transformedNodes);
                    }
                }
            }
        }
    }
    
    console.log(`Step 1a: Generated ${flatPositions.length} unique "flat" positions (no lean, plane 0)`);
    console.log(`Step 1b: Generated ${leanedPositions.length} unique "leaned" positions (with lean, plane 0)`);
    
    // Step 2: "Flip the board" for flat positions
    const allPositions = new Set();
    
    // Flip flat positions to all 3 planes
    for (const flatPos of flatPositions) {
        for (let plane = 0; plane < 3; plane++) {
            const flippedPos = flatPos.map(pos => transposeToPlane(plane, pos));
            let valid = true;
            for (const pos of flippedPos) {
                if (!isValidPosition(pos.x, pos.y, pos.z)) {
                    valid = false;
                    break;
                }
            }
            if (valid) {
                allPositions.add(getPositionMask(flippedPos).toString());
            }
        }
    }
    
    // Flip leaned positions to all 3 planes
    for (const leanedPos of leanedPositions) {
        for (let plane = 0; plane < 3; plane++) {
            const flippedPos = leanedPos.map(pos => transposeToPlane(plane, pos));
            let valid = true;
            for (const pos of flippedPos) {
                if (!isValidPosition(pos.x, pos.y, pos.z)) {
                    valid = false;
                    break;
                }
            }
            if (valid) {
                allPositions.add(getPositionMask(flippedPos).toString());
            }
        }
    }
    
    console.log(`Step 2: After "board flips", total unique positions: ${allPositions.size}`);
    
    return {
        flatPositions: flatPositions.length,
        leanedPositions: leanedPositions.length,
        totalPositions: allPositions.size
    };
}

// Current approach for comparison
function currentApproach(baseNodes) {
    const seenMasks = new Set();
    const validRoots = getValidRoots();
    
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                for (let lean of [false, true]) {
                    for (let plane = 0; plane < 3; plane++) {
                        const transformedNodes = [];
                        let valid = true;
                        
                        for (const node of baseNodes) {
                            const mirrored = applyMirrorX(node, mirrorX);
                            const rotated = rotateOffset(mirrored, rotation);
                            const leaned = applyLean(rotated, lean);
                            const placed = new Location(root.x + leaned.x, root.y + leaned.y, root.z + leaned.z);
                            const transposed = transposeToPlane(plane, placed);
                            
                            if (!isValidPosition(transposed.x, transposed.y, transposed.z)) {
                                valid = false;
                                break;
                            }
                            transformedNodes.push(transposed);
                        }
                        
                        if (valid) {
                            const mask = getPositionMask(transformedNodes);
                            seenMasks.add(mask.toString());
                        }
                    }
                }
            }
        }
    }
    
    return {
        totalPositions: seenMasks.size
    };
}

console.log('='.repeat(70));
console.log('BOARD-FLIP APPROACH TEST (WITH LEAN)');
console.log('='.repeat(70));
console.log('\nTesting with Gray piece:');

const gray = new Gray();
const grayNodes = gray.nodes.map(n => n.offset);

const flipResult = boardFlipApproachWithLean(grayNodes);
const currentResult = currentApproach(grayNodes);

console.log('\n' + '='.repeat(70));
console.log('COMPARISON');
console.log('='.repeat(70));
console.log(`Board-flip approach: ${flipResult.totalPositions} unique positions`);
console.log(`  (${flipResult.flatPositions} flat + ${flipResult.leanedPositions} leaned, each flipped to 3 planes)`);
console.log(`Current approach:   ${currentResult.totalPositions} unique positions`);
console.log(`Match: ${flipResult.totalPositions === currentResult.totalPositions ? '✓ YES' : '✗ NO'}`);

if (flipResult.totalPositions === currentResult.totalPositions) {
    console.log('\n✓ SUCCESS! Board-flip approach produces same results.');
    console.log(`\nGeneration efficiency:`);
    console.log(`  Board-flip: Generate ${flipResult.flatPositions + flipResult.leanedPositions} base positions, then flip each to 3 planes`);
    console.log(`    = ${flipResult.flatPositions + flipResult.leanedPositions} × 3 = ${(flipResult.flatPositions + flipResult.leanedPositions) * 3} candidates evaluated`);
    console.log(`  Current: 56 roots × 6 rotations × 2 mirrors × 2 leans × 3 planes`);
    console.log(`    = ${56 * 6 * 2 * 2 * 3} = ${56 * 6 * 2 * 2 * 3} candidates evaluated`);
    const reduction = (56 * 6 * 2 * 2 * 3) / ((flipResult.flatPositions + flipResult.leanedPositions) * 3);
    console.log(`  Reduction: ${reduction.toFixed(1)}x fewer candidates evaluated`);
} else {
    console.log(`\n✗ MISMATCH: Difference of ${Math.abs(flipResult.totalPositions - currentResult.totalPositions)} positions`);
}

