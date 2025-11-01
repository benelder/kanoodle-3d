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

console.log('='.repeat(70));
console.log('QUESTION: Can we skip lean generation by flipping to a specific plane?');
console.log('='.repeat(70));
console.log('\nHypothesis: Maybe leaned positions on plane 0 can be generated');
console.log('by taking flat positions and flipping them to plane 1 or plane 2?');
console.log('\n' + '='.repeat(70));

const gray = new Gray();
const baseNodes = gray.nodes.map(n => n.offset);
const validRoots = getValidRoots();

// Generate leaned positions (with lean, plane 0)
const leanedPositions = new Set();

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
                const t = transposeToPlane(0, origin);
                
                if (!isValidPosition(t.x, t.y, t.z)) {
                    valid = false;
                    break;
                }
                positions.push(t);
            }
            
            if (valid) {
                leanedPositions.add(getPositionMask(positions).toString());
            }
        }
    }
}

console.log(`\nLeaned positions (with lean, plane 0): ${leanedPositions.size} unique positions`);

// Generate flat positions and try each plane
const flatPlane0 = new Set();
const flatPlane1 = new Set();
const flatPlane2 = new Set();

for (const root of validRoots) {
    for (let rotation = 0; rotation < 6; rotation++) {
        for (let mirrorX of [false, true]) {
            // Calculate pre-plane coordinates (no lean)
            const prePlaneCoords = [];
            for (const node of baseNodes) {
                const mirrored = applyMirrorX(node, mirrorX);
                const rotated = rotateOffset(mirrored, rotation);
                const origin = new Location(root.x + rotated.x, root.y + rotated.y, root.z + rotated.z);
                prePlaneCoords.push(origin);
            }
            
            // Try each plane
            for (let plane = 0; plane < 3; plane++) {
                const positions = [];
                let valid = true;
                
                for (const origin of prePlaneCoords) {
                    const t = transposeToPlane(plane, origin);
                    if (!isValidPosition(t.x, t.y, t.z)) {
                        valid = false;
                        break;
                    }
                    positions.push(t);
                }
                
                if (valid) {
                    const mask = getPositionMask(positions).toString();
                    if (plane === 0) flatPlane0.add(mask);
                    else if (plane === 1) flatPlane1.add(mask);
                    else if (plane === 2) flatPlane2.add(mask);
                }
            }
        }
    }
}

console.log(`Flat positions on plane 0: ${flatPlane0.size} unique positions`);
console.log(`Flat positions on plane 1: ${flatPlane1.size} unique positions`);
console.log(`Flat positions on plane 2: ${flatPlane2.size} unique positions`);

// Check if leaned positions match any flat plane
const leanVsPlane0 = [...leanedPositions].filter(m => flatPlane0.has(m)).length;
const leanVsPlane1 = [...leanedPositions].filter(m => flatPlane1.has(m)).length;
const leanVsPlane2 = [...leanedPositions].filter(m => flatPlane2.has(m)).length;

console.log(`\n` + '='.repeat(70));
console.log('MATCH ANALYSIS:');
console.log('='.repeat(70));
console.log(`Leaned positions matching flat plane 0: ${leanVsPlane0}/${leanedPositions.size}`);
console.log(`Leaned positions matching flat plane 1: ${leanVsPlane1}/${leanedPositions.size}`);
console.log(`Leaned positions matching flat plane 2: ${leanVsPlane2}/${leanedPositions.size}`);

if (leanVsPlane0 === leanedPositions.size && leanVsPlane0 === flatPlane0.size) {
    console.log(`\n✓ SUCCESS: Leaned positions = Flat positions on plane 0`);
    console.log(`  → We can skip lean generation!`);
} else if (leanVsPlane1 === leanedPositions.size && leanVsPlane1 === flatPlane1.size) {
    console.log(`\n✓ SUCCESS: Leaned positions = Flat positions on plane 1`);
    console.log(`  → We can skip lean generation by flipping flat positions to plane 1!`);
} else if (leanVsPlane2 === leanedPositions.size && leanVsPlane2 === flatPlane2.size) {
    console.log(`\n✓ SUCCESS: Leaned positions = Flat positions on plane 2`);
    console.log(`  → We can skip lean generation by flipping flat positions to plane 2!`);
} else {
    console.log(`\n✗ NO MATCH: Leaned positions are unique`);
    console.log(`  → Lean generation cannot be skipped`);
    console.log(`\nMath:`);
    console.log(`  Lean transforms: (x, y, z) -> (x, 0, y) on PIECE offsets`);
    console.log(`  Plane transforms: (x, y, z) -> (5-(x+y+z), x, z) or (y, 5-(x+y+z), z) on BOARD coords`);
    console.log(`\nThese operate at different stages, so they cannot be equivalent.`);
}

