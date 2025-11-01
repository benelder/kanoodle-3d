import { 
    Location,
    DarkBlue, Gray, Red, Green, LightBlue, Lime,
    Orange, Peach, Pink, Purple, White, Yellow,
    PieceRegistry
} from './kanoodle.js';

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

// Board-flip approach
function boardFlipApproach(baseNodes) {
    const seenMasks = new Set();
    const validRoots = getValidRoots();
    
    // Generate base positions (flat and leaned separately, plane 0 only)
    const flatPositions = [];
    const leanedPositions = [];
    const flatSet = new Set();
    const leanedSet = new Set();
    
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                // Flat positions (no lean)
                const flatNodes = [];
                let validFlat = true;
                for (const node of baseNodes) {
                    const mirrored = applyMirrorX(node, mirrorX);
                    const rotated = rotateOffset(mirrored, rotation);
                    const placed = new Location(root.x + rotated.x, root.y + rotated.y, root.z + rotated.z);
                    const transposed = transposeToPlane(0, placed);
                    if (!isValidPosition(transposed.x, transposed.y, transposed.z)) {
                        validFlat = false;
                        break;
                    }
                    flatNodes.push(transposed);
                }
                if (validFlat) {
                    const mask = getPositionMask(flatNodes);
                    const maskStr = mask.toString();
                    if (!flatSet.has(maskStr)) {
                        flatSet.add(maskStr);
                        flatPositions.push(flatNodes);
                    }
                }
                
                // Leaned positions (with lean)
                const leanedNodes = [];
                let validLeaned = true;
                for (const node of baseNodes) {
                    const mirrored = applyMirrorX(node, mirrorX);
                    const rotated = rotateOffset(mirrored, rotation);
                    const leaned = applyLean(rotated, true);
                    const placed = new Location(root.x + leaned.x, root.y + leaned.y, root.z + leaned.z);
                    const transposed = transposeToPlane(0, placed);
                    if (!isValidPosition(transposed.x, transposed.y, transposed.z)) {
                        validLeaned = false;
                        break;
                    }
                    leanedNodes.push(transposed);
                }
                if (validLeaned) {
                    const mask = getPositionMask(leanedNodes);
                    const maskStr = mask.toString();
                    if (!leanedSet.has(maskStr)) {
                        leanedSet.add(maskStr);
                        leanedPositions.push(leanedNodes);
                    }
                }
            }
        }
    }
    
    // Flip all base positions to all 3 planes
    const allPositions = new Set();
    const allBase = [...flatPositions, ...leanedPositions];
    
    for (const basePos of allBase) {
        for (let plane = 0; plane < 3; plane++) {
            const flippedPos = basePos.map(pos => transposeToPlane(plane, pos));
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
    
    return {
        flatCount: flatPositions.length,
        leanedCount: leanedPositions.length,
        baseCount: flatPositions.length + leanedPositions.length,
        totalUnique: allPositions.size,
        candidatesEvaluated: (flatPositions.length + leanedPositions.length) * 3
    };
}

// Get actual results from implementation
const registry = new PieceRegistry();

const pieceConstructors = [
    { name: 'A', ctor: () => new Lime() },
    { name: 'B', ctor: () => new Yellow() },
    { name: 'C', ctor: () => new DarkBlue() },
    { name: 'D', ctor: () => new LightBlue() },
    { name: 'E', ctor: () => new Red() },
    { name: 'F', ctor: () => new Pink() },
    { name: 'G', ctor: () => new Green() },
    { name: 'H', ctor: () => new White() },
    { name: 'I', ctor: () => new Orange() },
    { name: 'J', ctor: () => new Peach() },
    { name: 'K', ctor: () => new Gray() },
    { name: 'L', ctor: () => new Purple() },
];

console.log('='.repeat(70));
console.log('VERIFYING BOARD-FLIP APPROACH FOR ALL COLORS');
console.log('='.repeat(70));
console.log();

const results = [];
let totalCurrentCandidates = 0;
let totalProposedCandidates = 0;

for (const { name, ctor } of pieceConstructors) {
    const piece = ctor();
    const baseNodes = piece.nodes.map(n => n.offset);
    
    const flipResult = boardFlipApproach(baseNodes);
    const actualData = registry.colors.get(name);
    const actualCount = actualData ? actualData.allPositions.length : 0;
    
    const match = flipResult.totalUnique === actualCount;
    results.push({
        name,
        actual: actualCount,
        flipResult: flipResult.totalUnique,
        flatCount: flipResult.flatCount,
        leanedCount: flipResult.leanedCount,
        candidates: flipResult.candidatesEvaluated,
        match
    });
    
    totalCurrentCandidates += 4032; // Current: 56 × 6 × 2 × 2 × 3
    totalProposedCandidates += flipResult.candidatesEvaluated;
    
    const status = match ? '✓' : '✗';
    console.log(`${status} ${name}: Actual=${actualCount}, Board-flip=${flipResult.totalUnique} (${flipResult.flatCount} flat + ${flipResult.leanedCount} leaned, ${flipResult.candidatesEvaluated} candidates)`);
}

console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));

const allMatch = results.every(r => r.match);
console.log(`All colors match: ${allMatch ? '✓ YES' : '✗ NO'}`);

if (allMatch) {
    console.log('\n✓ SUCCESS! Board-flip approach produces identical results for all colors.');
    console.log(`\nEfficiency Comparison:`);
    console.log(`  Current approach candidates: ${totalCurrentCandidates.toLocaleString()} (${12 * 4032} total)`);
    console.log(`  Board-flip candidates: ${totalProposedCandidates.toLocaleString()}`);
    console.log(`  Reduction: ${(totalCurrentCandidates / totalProposedCandidates).toFixed(1)}x fewer candidates`);
    console.log(`  Average per color: ${(totalProposedCandidates / 12).toFixed(0)} vs ${4032} candidates`);
} else {
    console.log('\n✗ MISMATCHES:');
    results.filter(r => !r.match).forEach(r => {
        console.log(`  ${r.name}: Actual=${r.actual}, Board-flip=${r.flipResult}, Diff=${Math.abs(r.actual - r.flipResult)}`);
    });
}

