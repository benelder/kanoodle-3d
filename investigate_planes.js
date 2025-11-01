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

// Compare: positions on plane 0 vs positions on planes 1 and 2
function comparePlanes(baseNodes) {
    const plane0Positions = new Set();
    const plane1Positions = new Set();
    const plane2Positions = new Set();
    
    const validRoots = [];
    for (let x = 0; x < 6; x++) {
        for (let y = 0; y < 6; y++) {
            for (let z = 0; z < 6; z++) {
                if (x + y + z <= 5) {
                    validRoots.push(new Location(x, y, z));
                }
            }
        }
    }
    
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                for (let lean of [false, true]) {
                    // Plane 0
                    const nodes0 = [];
                    let valid0 = true;
                    for (const node of baseNodes) {
                        const mirrored = applyMirrorX(node, mirrorX);
                        const rotated = rotateOffset(mirrored, rotation);
                        const leaned = applyLean(rotated, lean);
                        const placed = new Location(root.x + leaned.x, root.y + leaned.y, root.z + leaned.z);
                        const transposed = transposeToPlane(0, placed);
                        if (!isValidPosition(transposed.x, transposed.y, transposed.z)) {
                            valid0 = false;
                            break;
                        }
                        nodes0.push(transposed);
                    }
                    if (valid0) {
                        plane0Positions.add(getPositionMask(nodes0).toString());
                    }
                    
                    // Plane 1
                    const nodes1 = [];
                    let valid1 = true;
                    for (const node of baseNodes) {
                        const mirrored = applyMirrorX(node, mirrorX);
                        const rotated = rotateOffset(mirrored, rotation);
                        const leaned = applyLean(rotated, lean);
                        const placed = new Location(root.x + leaned.x, root.y + leaned.y, root.z + leaned.z);
                        const transposed = transposeToPlane(1, placed);
                        if (!isValidPosition(transposed.x, transposed.y, transposed.z)) {
                            valid1 = false;
                            break;
                        }
                        nodes1.push(transposed);
                    }
                    if (valid1) {
                        plane1Positions.add(getPositionMask(nodes1).toString());
                    }
                    
                    // Plane 2
                    const nodes2 = [];
                    let valid2 = true;
                    for (const node of baseNodes) {
                        const mirrored = applyMirrorX(node, mirrorX);
                        const rotated = rotateOffset(mirrored, rotation);
                        const leaned = applyLean(rotated, lean);
                        const placed = new Location(root.x + leaned.x, root.y + leaned.y, root.z + leaned.z);
                        const transposed = transposeToPlane(2, placed);
                        if (!isValidPosition(transposed.x, transposed.y, transposed.z)) {
                            valid2 = false;
                            break;
                        }
                        nodes2.push(transposed);
                    }
                    if (valid2) {
                        plane2Positions.add(getPositionMask(nodes2).toString());
                    }
                }
            }
        }
    }
    
    // Analysis
    const allPlanes = new Set([...plane0Positions, ...plane1Positions, ...plane2Positions]);
    const plane1Only = [...plane1Positions].filter(m => !plane0Positions.has(m));
    const plane2Only = [...plane2Positions].filter(m => !plane0Positions.has(m));
    const plane0Only = [...plane0Positions].filter(m => !plane1Positions.has(m) && !plane2Positions.has(m));
    
    return {
        plane0: plane0Positions.size,
        plane1: plane1Positions.size,
        plane2: plane2Positions.size,
        allPlanes: allPlanes.size,
        plane1Only: plane1Only.length,
        plane2Only: plane2Only.length,
        plane0Only: plane0Only.length,
        overlap01: [...plane0Positions].filter(m => plane1Positions.has(m)).length,
        overlap02: [...plane0Positions].filter(m => plane2Positions.has(m)).length,
        overlap12: [...plane1Positions].filter(m => plane2Positions.has(m)).length
    };
}

const gray = new Gray();
const grayNodes = gray.nodes.map(n => n.offset);

console.log('='.repeat(70));
console.log('INVESTIGATING PLANE OVERLAP');
console.log('='.repeat(70));
console.log('\nTesting with Gray piece:');
const results = comparePlanes(grayNodes);

console.log(`Plane 0 unique positions: ${results.plane0}`);
console.log(`Plane 1 unique positions: ${results.plane1}`);
console.log(`Plane 2 unique positions: ${results.plane2}`);
console.log(`All planes combined: ${results.allPlanes}`);
console.log(`\nOverlap analysis:`);
console.log(`  Positions only on plane 0: ${results.plane0Only}`);
console.log(`  Positions only on plane 1: ${results.plane1Only}`);
console.log(`  Positions only on plane 2: ${results.plane2Only}`);
console.log(`  Overlap between plane 0 and 1: ${results.overlap01}`);
console.log(`  Overlap between plane 0 and 2: ${results.overlap02}`);
console.log(`  Overlap between plane 1 and 2: ${results.overlap12}`);
console.log(`\nVerification: ${results.plane0} + ${results.plane1} + ${results.plane2} - overlaps = ${results.allPlanes}`);
console.log(`  Math: ${results.plane0} + ${results.plane1} + ${results.plane2} - ${results.overlap01} - ${results.overlap02} - ${results.overlap12} = ${results.plane0 + results.plane1 + results.plane2 - results.overlap01 - results.overlap02 - results.overlap12}`);

