import { Location, Gray, Lime, DarkBlue } from './kanoodle.js';

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

// Track positions by mask and their properties
function analyzeDuplicates(baseNodes, pieceName) {
    const positionMap = new Map(); // mask -> array of {properties, root}
    const validRoots = getValidRoots();
    
    // Generate all positions (current approach)
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                for (let lean of [false, true]) {
                    for (let plane = 0; plane < 3; plane++) {
                        const positions = [];
                        let valid = true;
                        
                        for (const node of baseNodes) {
                            const mirrored = applyMirrorX(node, mirrorX);
                            const rotated = rotateOffset(mirrored, rotation);
                            const leaned = applyLean(rotated, lean);
                            const origin = new Location(root.x + leaned.x, root.y + leaned.y, root.z + leaned.z);
                            const t = transposeToPlane(plane, origin);
                            
                            if (!isValidPosition(t.x, t.y, t.z)) {
                                valid = false;
                                break;
                            }
                            positions.push(t);
                        }
                        
                        if (valid) {
                            const mask = getPositionMask(positions);
                            const maskStr = mask.toString();
                            
                            if (!positionMap.has(maskStr)) {
                                positionMap.set(maskStr, []);
                            }
                            
                            positionMap.get(maskStr).push({
                                root: root,
                                rotation: rotation,
                                plane: plane,
                                lean: lean,
                                mirrorX: mirrorX
                            });
                        }
                    }
                }
            }
        }
    }
    
    // Analyze duplicates
    const duplicates = [];
    for (const [mask, positions] of positionMap.entries()) {
        if (positions.length > 1) {
            duplicates.push({
                mask: mask,
                count: positions.length,
                variants: positions
            });
        }
    }
    
    return duplicates;
}

// Analyze patterns in duplicates
function findPatterns(duplicates) {
    const patterns = {
        sameRotation: 0,
        sameLean: 0,
        samePlane: 0,
        sameMirror: 0,
        rotationShift: 0,
        planeRotation: 0,
        other: 0
    };
    
    for (const dup of duplicates) {
        const variants = dup.variants;
        
        // Check if all have same rotation
        const rotations = [...new Set(variants.map(v => v.rotation))];
        if (rotations.length === 1) {
            patterns.sameRotation++;
        }
        
        // Check if all have same lean
        const leans = [...new Set(variants.map(v => v.lean))];
        if (leans.length === 1) {
            patterns.sameLean++;
        }
        
        // Check if all have same plane
        const planes = [...new Set(variants.map(v => v.plane))];
        if (planes.length === 1) {
            patterns.samePlane++;
        }
        
        // Check for rotation shift pattern (r+1, r+2, etc.)
        const sortedRotations = variants.map(v => v.rotation).sort((a, b) => a - b);
        let isRotationShift = true;
        for (let i = 1; i < sortedRotations.length; i++) {
            if (sortedRotations[i] !== (sortedRotations[i-1] + 1) % 6) {
                isRotationShift = false;
                break;
            }
        }
        if (isRotationShift && variants.length > 1) {
            patterns.rotationShift++;
        }
        
        // Check for plane relationship (e.g., plane 0, 1, 2 together)
        const sortedPlanes = variants.map(v => v.plane).sort((a, b) => a - b);
        if (sortedPlanes.length === 3 && sortedPlanes[0] === 0 && sortedPlanes[1] === 1 && sortedPlanes[2] === 2) {
            patterns.planeRotation++;
        }
        
        // Check if there's a pattern between lean+rotation and plane
        // e.g., lean=false, rotation=X, plane=0 == lean=true, rotation=Y, plane=1
        let hasPattern = false;
        for (let i = 0; i < variants.length; i++) {
            for (let j = i + 1; j < variants.length; j++) {
                const v1 = variants[i];
                const v2 = variants[j];
                
                // Check if one lean+rotation combination on plane 0 equals another on plane 1 or 2
                if (v1.lean !== v2.lean && v1.plane !== v2.plane) {
                    hasPattern = true;
                }
            }
        }
        
        if (!hasPattern && patterns.sameRotation === 0 && patterns.sameLean === 0 && patterns.samePlane === 0) {
            patterns.other++;
        }
    }
    
    return patterns;
}

// Detailed analysis of a few duplicates
function analyzeDuplicateExamples(duplicates, pieceName) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Detailed Examples for ${pieceName}:`);
    console.log(`${'='.repeat(70)}`);
    
    // Show first 5 duplicates
    for (let i = 0; i < Math.min(5, duplicates.length); i++) {
        const dup = duplicates[i];
        console.log(`\nDuplicate ${i + 1}: ${dup.count} variants produce same position`);
        console.log('Variants:');
        dup.variants.forEach((v, idx) => {
            console.log(`  ${idx + 1}. root=(${v.root.x},${v.root.y},${v.root.z}) rot=${v.rotation} lean=${v.lean} plane=${v.plane} mirror=${v.mirrorX}`);
        });
        
        // Check if there's a clear pattern
        const rotations = [...new Set(dup.variants.map(v => v.rotation))];
        const planes = [...new Set(dup.variants.map(v => v.plane))];
        const leans = [...new Set(dup.variants.map(v => v.lean))];
        
        console.log(`  Properties: rotations=[${rotations.join(',')}] planes=[${planes.join(',')}] leans=[${leans.join(',')}]`);
        
        if (planes.length > 1 && leans.length === 1 && rotations.length === 1) {
            console.log(`  → Pattern: Same lean/rotation, different planes`);
        } else if (planes.length === 1 && leans.length > 1 && rotations.length === 1) {
            console.log(`  → Pattern: Same rotation/plane, different lean`);
        } else if (rotations.length > 1 && planes.length > 1) {
            console.log(`  → Pattern: Complex - rotation + plane interaction`);
        }
    }
}

console.log('='.repeat(70));
console.log('DUPLICATE PATTERN ANALYSIS');
console.log('='.repeat(70));

const testPieces = [
    { name: 'Gray', piece: new Gray() },
    { name: 'Lime', piece: new Lime() },
    { name: 'DarkBlue', piece: new DarkBlue() }
];

for (const { name, piece } of testPieces) {
    const baseNodes = piece.nodes.map(n => n.offset);
    const duplicates = analyzeDuplicates(baseNodes, name);
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`${name}: ${duplicates.length} duplicate groups found`);
    console.log(`${'='.repeat(70)}`);
    
    if (duplicates.length > 0) {
        const patterns = findPatterns(duplicates);
        console.log('\nPattern summary:');
        console.log(`  Same rotation across duplicates: ${patterns.sameRotation}`);
        console.log(`  Same lean across duplicates: ${patterns.sameLean}`);
        console.log(`  Same plane across duplicates: ${patterns.samePlane}`);
        console.log(`  Rotation shift patterns: ${patterns.rotationShift}`);
        console.log(`  All 3 planes together: ${patterns.planeRotation}`);
        console.log(`  Other patterns: ${patterns.other}`);
        
        analyzeDuplicateExamples(duplicates, name);
    }
}

