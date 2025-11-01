import { Location, Gray, Lime } from './kanoodle.js';

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

// Generate leaned positions on plane 0
function generateLeanedPositions(baseNodes) {
    const leanedMasks = new Set();
    const validRoots = getValidRoots();
    
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                const positions = [];
                let valid = true;
                
                for (const node of baseNodes) {
                    const mirrored = applyMirrorX(node, mirrorX);
                    const rotated = rotateOffset(mirrored, rotation);
                    const leaned = applyLean(rotated, true);
                    const origin = new Location(root.x + leaned.x, root.y + leaned.y, root.z + leaned.z);
                    const t = transposeToPlane(0, origin); // Plane 0 only
                    
                    if (!isValidPosition(t.x, t.y, t.z)) {
                        valid = false;
                        break;
                    }
                    positions.push(t);
                }
                
                if (valid) {
                    leanedMasks.add(getPositionMask(positions).toString());
                }
            }
        }
    }
    
    return leanedMasks;
}

// Generate flat positions on plane 0, then flip to each plane
function generateFlatAndFlipToPlanes(baseNodes) {
    const planeMasks = {
        plane0: new Set(),
        plane1: new Set(),
        plane2: new Set()
    };
    const validRoots = getValidRoots();
    
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                // Generate flat position (no lean)
                const prePlaneCoords = [];
                let valid = true;
                
                for (const node of baseNodes) {
                    const mirrored = applyMirrorX(node, mirrorX);
                    const rotated = rotateOffset(mirrored, rotation);
                    // No lean
                    const origin = new Location(root.x + rotated.x, root.y + rotated.y, root.z + rotated.z);
                    prePlaneCoords.push(origin);
                }
                
                // Flip to each plane
                for (let plane = 0; plane < 3; plane++) {
                    const positions = [];
                    let planeValid = true;
                    
                    for (const origin of prePlaneCoords) {
                        const t = transposeToPlane(plane, origin);
                        if (!isValidPosition(t.x, t.y, t.z)) {
                            planeValid = false;
                            break;
                        }
                        positions.push(t);
                    }
                    
                    if (planeValid) {
                        const mask = getPositionMask(positions);
                        planeMasks[`plane${plane}`].add(mask.toString());
                    }
                }
            }
        }
    }
    
    return planeMasks;
}

console.log('='.repeat(70));
console.log('ANALYZING: Is Lean Redundant with Plane Transforms?');
console.log('='.repeat(70));

function analyzePiece(name, piece) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Analyzing: ${name}`);
    console.log(`${'='.repeat(70)}`);
    
    const baseNodes = piece.nodes.map(n => n.offset);
    
    // Generate leaned positions (with lean, plane 0)
    const leanedMasks = generateLeanedPositions(baseNodes);
    console.log(`\nLeaned positions (with lean, plane 0): ${leanedMasks.size} unique positions`);
    
    // Generate flat positions and flip to all planes
    const planeMasks = generateFlatAndFlipToPlanes(baseNodes);
    console.log(`Flat positions flipped to plane 0: ${planeMasks.plane0.size} unique positions`);
    console.log(`Flat positions flipped to plane 1: ${planeMasks.plane1.size} unique positions`);
    console.log(`Flat positions flipped to plane 2: ${planeMasks.plane2.size} unique positions`);
    
    // Check overlaps
    const leanVsPlane0 = [...leanedMasks].filter(m => planeMasks.plane0.has(m)).length;
    const leanVsPlane1 = [...leanedMasks].filter(m => planeMasks.plane1.has(m)).length;
    const leanVsPlane2 = [...leanedMasks].filter(m => planeMasks.plane2.has(m)).length;
    
    console.log(`\nOverlap Analysis:`);
    console.log(`  Leaned vs Plane 0: ${leanVsPlane0} positions overlap`);
    console.log(`  Leaned vs Plane 1: ${leanVsPlane1} positions overlap`);
    console.log(`  Leaned vs Plane 2: ${leanVsPlane2} positions overlap`);
    
    if (leanVsPlane0 === leanedMasks.size && leanVsPlane0 === planeMasks.plane0.size) {
        console.log(`  ✓ Lean positions = Plane 0 positions (redundant!)`);
    } else if (leanVsPlane1 === leanedMasks.size && leanVsPlane1 === planeMasks.plane1.size) {
        console.log(`  ✓ Lean positions = Plane 1 positions (redundant!)`);
    } else if (leanVsPlane2 === leanedMasks.size && leanVsPlane2 === planeMasks.plane2.size) {
        console.log(`  ✓ Lean positions = Plane 2 positions (redundant!)`);
    } else {
        console.log(`  ✗ Lean positions are NOT redundant with any single plane`);
        console.log(`    Leaned-only positions: ${leanedMasks.size - Math.max(leanVsPlane0, leanVsPlane1, leanVsPlane2)}`);
    }
    
    // Check if all leaned positions can be covered by all three planes combined
    const allPlanes = new Set([...planeMasks.plane0, ...planeMasks.plane1, ...planeMasks.plane2]);
    const leanOnly = [...leanedMasks].filter(m => !allPlanes.has(m)).length;
    const coveredByPlanes = leanedMasks.size - leanOnly;
    
    console.log(`\nCoverage Analysis:`);
    console.log(`  Leaned positions covered by any plane: ${coveredByPlanes}/${leanedMasks.size}`);
    console.log(`  Leaned-only positions (not in any plane): ${leanOnly}`);
    
    if (leanOnly === 0) {
        console.log(`  ✓ All leaned positions can be generated via plane transforms!`);
        console.log(`  → Lean generation could be skipped!`);
    } else {
        console.log(`  ✗ ${leanOnly} leaned positions cannot be generated via plane transforms`);
    }
}

analyzePiece('Gray (2x2 square)', new Gray());
analyzePiece('Lime (T-shape)', new Lime());

