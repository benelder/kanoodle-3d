import { Location, Gray } from './kanoodle.js';

// Helper functions
function applyMirrorX(offset, mirrorX) {
    return mirrorX ? new Location(offset.x + offset.y, -offset.y, offset.z) : offset;
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

// Generate all valid root positions
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

// Approach 1: Generate "flat" positions (rotation + mirror only, plane 0)
// Then flip to other planes
function boardFlipApproach(baseNodes) {
    const seenMasks = new Set();
    const validRoots = getValidRoots();
    
    // Step 1: Generate all "flat" positions on plane 0
    const flatPositions = [];
    
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                // Generate "flat" position (plane 0, no lean)
                const transformedNodes = [];
                let valid = true;
                
                for (const node of baseNodes) {
                    const mirrored = applyMirrorX(node, mirrorX);
                    const rotated = rotateOffset(mirrored, rotation);
                    // No lean - keep it "flat"
                    const placed = new Location(root.x + rotated.x, root.y + rotated.y, root.z + rotated.z);
                    const transposed = transposeToPlane(0, placed); // Plane 0 only
                    
                    if (!isValidPosition(transposed.x, transposed.y, transposed.z)) {
                        valid = false;
                        break;
                    }
                    transformedNodes.push(transposed);
                }
                
                if (valid) {
                    const mask = getPositionMask(transformedNodes);
                    const maskStr = mask.toString();
                    if (!seenMasks.has(maskStr)) {
                        seenMasks.add(maskStr);
                        flatPositions.push(transformedNodes); // Store the actual positions
                    }
                }
            }
        }
    }
    
    console.log(`Step 1: Generated ${flatPositions.length} unique "flat" positions on plane 0`);
    
    // Step 2: "Flip the board" - apply plane transpose to each flat position
    const allFlippedPositions = new Set();
    
    for (const flatPos of flatPositions) {
        // Add the original flat position (plane 0)
        const flatMask = getPositionMask(flatPos).toString();
        allFlippedPositions.add(flatMask);
        
        // Flip to plane 1
        const plane1Pos = flatPos.map(pos => transposeToPlane(1, pos));
        let valid1 = true;
        for (const pos of plane1Pos) {
            if (!isValidPosition(pos.x, pos.y, pos.z)) {
                valid1 = false;
                break;
            }
        }
        if (valid1) {
            allFlippedPositions.add(getPositionMask(plane1Pos).toString());
        }
        
        // Flip to plane 2
        const plane2Pos = flatPos.map(pos => transposeToPlane(2, pos));
        let valid2 = true;
        for (const pos of plane2Pos) {
            if (!isValidPosition(pos.x, pos.y, pos.z)) {
                valid2 = false;
                break;
            }
        }
        if (valid2) {
            allFlippedPositions.add(getPositionMask(plane2Pos).toString());
        }
    }
    
    console.log(`Step 2: After "board flips", total unique positions: ${allFlippedPositions.size}`);
    
    return {
        flatPositions: flatPositions.length,
        totalPositions: allFlippedPositions.size,
        positions: allFlippedPositions
    };
}

// Approach 2: Current approach for comparison
function currentApproach(baseNodes) {
    const seenMasks = new Set();
    const validRoots = getValidRoots();
    
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                for (let plane = 0; plane < 3; plane++) {
                    const transformedNodes = [];
                    let valid = true;
                    
                    for (const node of baseNodes) {
                        const mirrored = applyMirrorX(node, mirrorX);
                        const rotated = rotateOffset(mirrored, rotation);
                        // No lean in this test
                        const placed = new Location(root.x + rotated.x, root.y + rotated.y, root.z + rotated.z);
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
    
    return {
        totalPositions: seenMasks.size
    };
}

console.log('='.repeat(70));
console.log('BOARD-FLIP APPROACH TEST');
console.log('='.repeat(70));
console.log('\nTesting with Gray piece (2x2 square):');
console.log('(Testing WITHOUT lean first to see if board-flip works)');

const gray = new Gray();
const grayNodes = gray.nodes.map(n => n.offset);

const flipResult = boardFlipApproach(grayNodes);
const currentResult = currentApproach(grayNodes);

console.log('\n' + '='.repeat(70));
console.log('COMPARISON');
console.log('='.repeat(70));
console.log(`Board-flip approach: ${flipResult.totalPositions} unique positions`);
console.log(`Current approach:   ${currentResult.totalPositions} unique positions`);
console.log(`Match: ${flipResult.totalPositions === currentResult.totalPositions ? '✓ YES' : '✗ NO'}`);

if (flipResult.totalPositions === currentResult.totalPositions) {
    console.log('\n✓ SUCCESS! Board-flip approach produces same results.');
    console.log(`  Generation efficiency: ${flipResult.flatPositions} flat positions × 3 planes = ${flipResult.flatPositions * 3}`);
    console.log(`  Current approach: 56 roots × 6 rotations × 2 mirrors × 3 planes = ${56 * 6 * 2 * 3}`);
    console.log(`  Potential reduction: ${(56 * 6 * 2 * 3) / (flipResult.flatPositions * 3)}x fewer candidates evaluated`);
} else {
    console.log(`\n✗ MISMATCH: Difference of ${Math.abs(flipResult.totalPositions - currentResult.totalPositions)} positions`);
    console.log(`  Board-flip approach missing ${currentResult.totalPositions - flipResult.totalPositions} positions`);
    console.log(`  or has ${flipResult.totalPositions - currentResult.totalPositions} extra positions`);
}

