import { 
    Location, Atom, Piece,
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

// Current approach: All 3 planes
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
                            const maskStr = mask.toString();
                            seenMasks.add(maskStr);
                        }
                    }
                }
            }
        }
    }
    
    return seenMasks.size;
}

// Proposed approach: Plane 0 only
function proposedApproach(baseNodes) {
    const seenMasks = new Set();
    const validRoots = getValidRoots();
    
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                for (let lean of [false, true]) {
                    // Only plane 0 (identity)
                    const transformedNodes = [];
                    let valid = true;
                    
                    for (const node of baseNodes) {
                        const mirrored = applyMirrorX(node, mirrorX);
                        const rotated = rotateOffset(mirrored, rotation);
                        const leaned = applyLean(rotated, lean);
                        const placed = new Location(root.x + leaned.x, root.y + leaned.y, root.z + leaned.z);
                        // No plane transpose - just use plane 0
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
                        seenMasks.add(maskStr);
                    }
                }
            }
        }
    }
    
    return seenMasks.size;
}

// Test all 12 colors
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
console.log('VERIFICATION: Comparing Current vs Proposed Approach');
console.log('='.repeat(70));
console.log();

const results = [];

for (const { name, ctor } of pieceConstructors) {
    const piece = ctor();
    const baseNodes = piece.nodes.map(n => n.offset);
    
    const currentCount = currentApproach(baseNodes);
    const proposedCount = proposedApproach(baseNodes);
    const match = currentCount === proposedCount;
    
    results.push({
        name,
        current: currentCount,
        proposed: proposedCount,
        match
    });
    
    const status = match ? '✓' : '✗';
    console.log(`${status} Color ${name}: Current=${currentCount}, Proposed=${proposedCount} ${match ? '' : 'MISMATCH!'}`);
}

console.log();
console.log('='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));

const allMatch = results.every(r => r.match);
const totalCurrent = results.reduce((sum, r) => sum + r.current, 0);
const totalProposed = results.reduce((sum, r) => sum + r.proposed, 0);

console.log(`All colors match: ${allMatch ? '✓ YES' : '✗ NO'}`);
console.log(`Total unique positions (current): ${totalCurrent}`);
console.log(`Total unique positions (proposed): ${totalProposed}`);
console.log(`Total match: ${totalCurrent === totalProposed ? '✓ YES' : '✗ NO'}`);

if (!allMatch) {
    console.log('\nMISMATCHES:');
    results.filter(r => !r.match).forEach(r => {
        console.log(`  Color ${r.name}: Current=${r.current}, Proposed=${r.proposed}, Diff=${r.current - r.proposed}`);
    });
}

console.log('\nBreakdown:');
results.forEach(r => {
    const reduction = r.current > 0 ? ((1 - r.proposed / r.current) * 100).toFixed(1) : '0.0';
    console.log(`  ${r.name}: ${r.current} -> ${r.proposed} (${reduction}% reduction)`);
});

