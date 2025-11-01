import { Location, Atom, Piece, Gray, Lime } from './kanoodle.js';

// Helper functions (copied from kanoodle.js for analysis)
function applyMirrorX(offset, mirrorX) {
    return mirrorX ? new Location(offset.x + offset.y, -offset.y, offset.z) : offset;
}

function applyLean(offset, lean) {
    return lean ? new Location(offset.x, 0, offset.y) : offset;
}

function rotateOffset(location, rotation) {
    if (rotation === 0) return location;
    if (rotation > 5) throw new Error('Invalid rotation');
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

// Analysis functions
function analyzeApproach1_RotateMirrorOnly(baseNodes, sampleRoot) {
    console.log('\n=== APPROACH 1: Rotation + Mirror Only (Plane 0, No Lean) ===');
    const seenMasks = new Set();
    const positions = [];
    
    for (let rotation = 0; rotation < 6; rotation++) {
        for (let mirrorX of [false, true]) {
            const transformedNodes = [];
            let valid = true;
            
            for (const node of baseNodes) {
                const mirrored = applyMirrorX(node, mirrorX);
                const rotated = rotateOffset(mirrored, rotation);
                // No lean applied
                const placed = new Location(sampleRoot.x + rotated.x, sampleRoot.y + rotated.y, sampleRoot.z + rotated.z);
                const transposed = transposeToPlane(0, placed); // Only plane 0
                
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
                    positions.push({
                        rotation,
                        mirrorX,
                        lean: false,
                        plane: 0,
                        mask: maskStr
                    });
                }
            }
        }
    }
    
    console.log(`Generated ${positions.length} unique positions with rotation+mirror only (plane 0, no lean)`);
    return { positions, uniqueCount: positions.length };
}

function analyzeApproach2_AddPlaneTranspose(baseNodes, sampleRoot, basePositions) {
    console.log('\n=== APPROACH 2: Add Plane Transpose ===');
    const seenMasks = new Set();
    const allPositions = [];
    
    for (const base of basePositions) {
        // Reconstruct the position
        const transformedNodes = [];
        for (const node of baseNodes) {
            const mirrored = applyMirrorX(node, base.mirrorX);
            const rotated = rotateOffset(mirrored, base.rotation);
            const placed = new Location(sampleRoot.x + rotated.x, sampleRoot.y + rotated.y, sampleRoot.z + rotated.z);
            transformedNodes.push(placed);
        }
        
        // Try each plane
        for (let plane = 0; plane < 3; plane++) {
            const planeNodes = transformedNodes.map(placed => transposeToPlane(plane, placed));
            let valid = true;
            for (const pos of planeNodes) {
                if (!isValidPosition(pos.x, pos.y, pos.z)) {
                    valid = false;
                    break;
                }
            }
            
            if (valid) {
                const mask = getPositionMask(planeNodes);
                const maskStr = mask.toString();
                if (!seenMasks.has(maskStr)) {
                    seenMasks.add(maskStr);
                    allPositions.push({
                        rotation: base.rotation,
                        mirrorX: base.mirrorX,
                        lean: false,
                        plane,
                        mask: maskStr
                    });
                }
            }
        }
    }
    
    console.log(`Total unique positions after adding plane transpose: ${allPositions.length}`);
    console.log(`(Base positions: ${basePositions.length}, with 3 planes: ${basePositions.length * 3}, unique: ${allPositions.length})`);
    return { allPositions, uniqueCount: allPositions.length };
}

function analyzeApproach3_AddLean(baseNodes, sampleRoot) {
    console.log('\n=== APPROACH 3: Current Approach (Rotation + Mirror + Lean + Planes) ===');
    const seenMasks = new Set();
    const allPositions = [];
    
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
                        const placed = new Location(sampleRoot.x + leaned.x, sampleRoot.y + leaned.y, sampleRoot.z + leaned.z);
                        const transposed = transposeToPlane(plane, placed);
                        
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
                            allPositions.push({
                                rotation,
                                mirrorX,
                                lean,
                                plane,
                                mask: maskStr
                            });
                        }
                    }
                }
            }
        }
    }
    
    console.log(`Total unique positions with current approach: ${allPositions.length}`);
    console.log(`(Total combinations tried: 6 rotations × 2 mirrors × 2 leans × 3 planes = 72)`);
    return { allPositions, uniqueCount: allPositions.length };
}

function analyzeLeanAsTransform(baseNodes, sampleRoot) {
    console.log('\n=== ANALYZING: Is Lean Just a Coordinate Transform? ===');
    
    // Test: Can we map lean=false positions to lean=true positions using a transform?
    const leanFalsePositions = new Set();
    const leanTruePositions = new Set();
    
    for (let rotation = 0; rotation < 6; rotation++) {
        for (let mirrorX of [false, true]) {
            // lean = false
            const nodesNoLean = [];
            let valid1 = true;
            for (const node of baseNodes) {
                const mirrored = applyMirrorX(node, mirrorX);
                const rotated = rotateOffset(mirrored, rotation);
                const placed = new Location(sampleRoot.x + rotated.x, sampleRoot.y + rotated.y, sampleRoot.z + rotated.z);
                const transposed = transposeToPlane(0, placed);
                if (!isValidPosition(transposed.x, transposed.y, transposed.z)) {
                    valid1 = false;
                    break;
                }
                nodesNoLean.push(transposed);
            }
            if (valid1) {
                leanFalsePositions.add(getPositionMask(nodesNoLean).toString());
            }
            
            // lean = true
            const nodesWithLean = [];
            let valid2 = true;
            for (const node of baseNodes) {
                const mirrored = applyMirrorX(node, mirrorX);
                const rotated = rotateOffset(mirrored, rotation);
                const leaned = applyLean(rotated, true);
                const placed = new Location(sampleRoot.x + leaned.x, sampleRoot.y + leaned.y, sampleRoot.z + leaned.z);
                const transposed = transposeToPlane(0, placed);
                if (!isValidPosition(transposed.x, transposed.y, transposed.z)) {
                    valid2 = false;
                    break;
                }
                nodesWithLean.push(transposed);
            }
            if (valid2) {
                leanTruePositions.add(getPositionMask(nodesWithLean).toString());
            }
        }
    }
    
    console.log(`Lean=false unique positions: ${leanFalsePositions.size}`);
    console.log(`Lean=true unique positions: ${leanTruePositions.size}`);
    console.log(`Overlap: ${[...leanFalsePositions].filter(m => leanTruePositions.has(m)).length} positions appear in both`);
    console.log(`Lean-only positions: ${[...leanTruePositions].filter(m => !leanFalsePositions.has(m)).length}`);
    
    // Check if there's a simple coordinate transform mapping
    if (leanTruePositions.size > 0 && [...leanTruePositions].every(m => leanFalsePositions.has(m))) {
        console.log('✓ Lean=true positions are subset of lean=false positions (lean is redundant)');
    } else if (leanFalsePositions.size > 0 && [...leanFalsePositions].every(m => leanTruePositions.has(m))) {
        console.log('✓ Lean=false positions are subset of lean=true positions');
    } else {
        console.log('✗ Lean produces some unique positions that cannot be reached without it');
    }
}

// Main analysis
console.log('='.repeat(70));
console.log('TRANSFORMATION ANALYSIS');
console.log('='.repeat(70));

// Test with a simple piece (Gray - 2x2 square)
const gray = new Gray();
const grayNodes = gray.nodes.map(n => n.offset);
console.log('\nTesting with Gray piece (2x2 square):');
const sampleRoot1 = new Location(0, 0, 0);

const result1 = analyzeApproach1_RotateMirrorOnly(grayNodes, sampleRoot1);
const result2 = analyzeApproach2_AddPlaneTranspose(grayNodes, sampleRoot1, result1.positions);
const result3 = analyzeApproach3_AddLean(grayNodes, sampleRoot1);
analyzeLeanAsTransform(grayNodes, sampleRoot1);

// Test with a more complex piece (Lime)
const lime = new Lime();
const limeNodes = lime.nodes.map(n => n.offset);
console.log('\n\nTesting with Lime piece (T-shape):');
const sampleRoot2 = new Location(0, 0, 0);

const result1b = analyzeApproach1_RotateMirrorOnly(limeNodes, sampleRoot2);
const result2b = analyzeApproach2_AddPlaneTranspose(limeNodes, sampleRoot2, result1b.positions);
const result3b = analyzeApproach3_AddLean(limeNodes, sampleRoot2);
analyzeLeanAsTransform(limeNodes, sampleRoot2);

console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log('\nGray piece:');
console.log(`  Rotate+Mirror only: ${result1.uniqueCount} unique positions`);
console.log(`  + Plane transpose: ${result2.uniqueCount} unique positions`);
console.log(`  + Lean (current): ${result3.uniqueCount} unique positions`);
console.log(`  Reduction potential: ${result3.uniqueCount} -> ${result2.uniqueCount} (if lean is redundant)`);

console.log('\nLime piece:');
console.log(`  Rotate+Mirror only: ${result1b.uniqueCount} unique positions`);
console.log(`  + Plane transpose: ${result2b.uniqueCount} unique positions`);
console.log(`  + Lean (current): ${result3b.uniqueCount} unique positions`);
console.log(`  Reduction potential: ${result3b.uniqueCount} -> ${result2b.uniqueCount} (if lean is redundant)`);

