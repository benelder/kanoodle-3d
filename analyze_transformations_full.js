import { Location, Atom, Piece, Gray, Lime, DarkBlue } from './kanoodle.js';

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

// Approach 1: Rotation + Mirror only (Plane 0, No Lean)
function approach1_RotateMirrorOnly(baseNodes) {
    const seenMasks = new Set();
    const validRoots = getValidRoots();
    
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                const transformedNodes = [];
                let valid = true;
                
                for (const node of baseNodes) {
                    const mirrored = applyMirrorX(node, mirrorX);
                    const rotated = rotateOffset(mirrored, rotation);
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
                    if (!seenMasks.has(maskStr)) {
                        seenMasks.add(maskStr);
                    }
                }
            }
        }
    }
    
    return { uniqueCount: seenMasks.size };
}

// Approach 2: Rotation + Mirror + Plane Transpose (No Lean)
function approach2_RotateMirrorPlane(baseNodes) {
    const seenMasks = new Set();
    const validRoots = getValidRoots();
    
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                // Build transformed nodes once
                const baseTransformed = [];
                for (const node of baseNodes) {
                    const mirrored = applyMirrorX(node, mirrorX);
                    const rotated = rotateOffset(mirrored, rotation);
                    baseTransformed.push(rotated);
                }
                
                // Try each plane
                for (let plane = 0; plane < 3; plane++) {
                    const transformedNodes = [];
                    let valid = true;
                    
                    for (const transformedOffset of baseTransformed) {
                        const placed = new Location(root.x + transformedOffset.x, root.y + transformedOffset.y, root.z + transformedOffset.z);
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
                        }
                    }
                }
            }
        }
    }
    
    return { uniqueCount: seenMasks.size };
}

// Approach 3: Current approach (Rotation + Mirror + Lean + Plane)
function approach3_Current(baseNodes) {
    const seenMasks = new Set();
    const validRoots = getValidRoots();
    let totalGenerated = 0;
    let invalidCount = 0;
    
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                for (let lean of [false, true]) {
                    for (let plane = 0; plane < 3; plane++) {
                        totalGenerated++;
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
                        
                        if (!valid) {
                            invalidCount++;
                            continue;
                        }
                        
                        const mask = getPositionMask(transformedNodes);
                        const maskStr = mask.toString();
                        if (!seenMasks.has(maskStr)) {
                            seenMasks.add(maskStr);
                        }
                    }
                }
            }
        }
    }
    
    return { 
        uniqueCount: seenMasks.size, 
        totalGenerated,
        invalidCount,
        duplicateCount: totalGenerated - invalidCount - seenMasks.size
    };
}

// Analyze whether lean can be mapped from non-lean positions
function analyzeLeanMapping(baseNodes) {
    const seenMasksNoLean = new Set();
    const seenMasksWithLean = new Set();
    const validRoots = getValidRoots();
    
    // Generate positions without lean
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                for (let plane = 0; plane < 3; plane++) {
                    const transformedNodes = [];
                    let valid = true;
                    
                    for (const node of baseNodes) {
                        const mirrored = applyMirrorX(node, mirrorX);
                        const rotated = rotateOffset(mirrored, rotation);
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
                        seenMasksNoLean.add(mask.toString());
                    }
                }
            }
        }
    }
    
    // Generate positions with lean
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                for (let plane = 0; plane < 3; plane++) {
                    const transformedNodes = [];
                    let valid = true;
                    
                    for (const node of baseNodes) {
                        const mirrored = applyMirrorX(node, mirrorX);
                        const rotated = rotateOffset(mirrored, rotation);
                        const leaned = applyLean(rotated, true);
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
                        seenMasksWithLean.add(mask.toString());
                    }
                }
            }
        }
    }
    
    const overlap = [...seenMasksNoLean].filter(m => seenMasksWithLean.has(m)).length;
    const leanOnly = [...seenMasksWithLean].filter(m => !seenMasksNoLean.has(m)).length;
    const noLeanOnly = [...seenMasksNoLean].filter(m => !seenMasksWithLean.has(m)).length;
    
    return {
        noLeanCount: seenMasksNoLean.size,
        withLeanCount: seenMasksWithLean.size,
        overlap,
        leanOnly,
        noLeanOnly
    };
}

// Main analysis
console.log('='.repeat(70));
console.log('FULL TRANSFORMATION ANALYSIS (All Root Positions)');
console.log('='.repeat(70));

function analyzePiece(name, piece) {
    const baseNodes = piece.nodes.map(n => n.offset);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Analyzing: ${name}`);
    console.log(`${'='.repeat(70)}`);
    
    const result1 = approach1_RotateMirrorOnly(baseNodes);
    console.log(`\nApproach 1 (Rotate + Mirror, Plane 0, No Lean):`);
    console.log(`  Unique positions: ${result1.uniqueCount}`);
    
    const result2 = approach2_RotateMirrorPlane(baseNodes);
    console.log(`\nApproach 2 (Rotate + Mirror + Plane Transpose, No Lean):`);
    console.log(`  Unique positions: ${result2.uniqueCount}`);
    console.log(`  Potential: ${result1.uniqueCount} base × 3 planes ≈ ${result1.uniqueCount * 3} (actual: ${result2.uniqueCount})`);
    
    const result3 = approach3_Current(baseNodes);
    console.log(`\nApproach 3 (Current: Rotate + Mirror + Lean + Plane):`);
    console.log(`  Unique positions: ${result3.uniqueCount}`);
    console.log(`  Total generated: ${result3.totalGenerated}`);
    console.log(`  Invalid: ${result3.invalidCount}`);
    console.log(`  Duplicates: ${result3.duplicateCount}`);
    
    const leanAnalysis = analyzeLeanMapping(baseNodes);
    console.log(`\nLean Analysis:`);
    console.log(`  Positions without lean: ${leanAnalysis.noLeanCount}`);
    console.log(`  Positions with lean: ${leanAnalysis.withLeanCount}`);
    console.log(`  Overlap: ${leanAnalysis.overlap}`);
    console.log(`  Lean-only positions: ${leanAnalysis.leanOnly}`);
    console.log(`  No-lean-only positions: ${leanAnalysis.noLeanOnly}`);
    
    console.log(`\nReduction Analysis:`);
    console.log(`  If lean is redundant: ${result3.uniqueCount} -> ${result2.uniqueCount} positions`);
    console.log(`  If lean adds value: ${result3.uniqueCount} = ${result2.uniqueCount} + ${leanAnalysis.leanOnly} lean-only positions`);
    console.log(`  Search space reduction: ${result3.totalGenerated} -> ${(56 * 6 * 2 * 3)} (${56 * 6 * 2} for approach 2)`);
    console.log(`  Reduction factor: ${(result3.totalGenerated / (56 * 6 * 2 * 3)).toFixed(1)}x smaller`);
}

analyzePiece('Gray (2x2 square)', new Gray());
analyzePiece('Lime (T-shape)', new Lime());
analyzePiece('DarkBlue (L-shape)', new DarkBlue());

