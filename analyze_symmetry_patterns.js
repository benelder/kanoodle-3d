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

// Find rotation+plane equivalences
function findRotationPlaneEquivalences(baseNodes) {
    const equivalenceMap = new Map(); // mask -> set of {rotation, plane} combinations
    const validRoots = getValidRoots();
    
    // Test a specific root to find patterns
    const testRoot = new Location(0, 0, 0);
    
    console.log(`\nTesting base position at root (0,0,0) with flat piece (no lean, no mirror):`);
    console.log(`${'='.repeat(70)}`);
    
    const results = [];
    
    for (let rotation = 0; rotation < 6; rotation++) {
        const prePlaneCoords = [];
        let valid = true;
        
        for (const node of baseNodes) {
            const rotated = rotateOffset(node, rotation);
            const origin = new Location(testRoot.x + rotated.x, testRoot.y + rotated.y, testRoot.z + rotated.z);
            prePlaneCoords.push(origin);
        }
        
        if (!valid) continue;
        
        // Try each plane
        const planeResults = {};
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
                const mask = getPositionMask(positions);
                planeResults[plane] = mask.toString();
            }
        }
        
        results.push({ rotation, planeResults });
        console.log(`Rotation ${rotation}:`);
        console.log(`  Plane 0: ${planeResults[0] || 'invalid'}`);
        console.log(`  Plane 1: ${planeResults[1] || 'invalid'}`);
        console.log(`  Plane 2: ${planeResults[2] || 'invalid'}`);
    }
    
    // Find equivalences
    const maskGroups = new Map();
    for (const result of results) {
        for (const [plane, mask] of Object.entries(result.planeResults)) {
            if (!maskGroups.has(mask)) {
                maskGroups.set(mask, []);
            }
            maskGroups.get(mask).push({ rotation: result.rotation, plane: parseInt(plane) });
        }
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log('EQUIVALENCE GROUPS (same mask):');
    console.log(`${'='.repeat(70)}`);
    
    const equivalences = [];
    for (const [mask, variants] of maskGroups.entries()) {
        if (variants.length > 1) {
            equivalences.push({ mask, variants });
            console.log(`\nMask ${mask.substring(0, 20)}... has ${variants.length} variants:`);
            variants.forEach(v => {
                console.log(`  Rotation ${v.rotation} on Plane ${v.plane}`);
            });
            
            // Check for patterns
            const rotations = variants.map(v => v.rotation);
            const planes = variants.map(v => v.plane);
            if (planes.length === 3 && planes.includes(0) && planes.includes(1) && planes.includes(2)) {
                console.log(`  → Pattern: All 3 planes produce same position with rotations [${rotations.join(', ')}]`);
                equivalences[equivalences.length - 1].pattern = 'all_three_planes';
                equivalences[equivalences.length - 1].rotations = rotations;
            }
        }
    }
    
    return equivalences;
}

// Test if we can predict duplicates before generating
function canPredictDuplicates(baseNodes) {
    console.log(`\n${'='.repeat(70)}`);
    console.log('PREDICTION ANALYSIS: Can we avoid generating duplicates?');
    console.log(`${'='.repeat(70)}`);
    
    // Generate base positions (plane 0, flat)
    const baseMasks = new Set();
    const basePositions = [];
    const validRoots = getValidRoots();
    
    for (const root of validRoots) {
        for (let rotation = 0; rotation < 6; rotation++) {
            for (let mirrorX of [false, true]) {
                const prePlaneCoords = [];
                let valid = true;
                
                for (const node of baseNodes) {
                    const mirrored = applyMirrorX(node, mirrorX);
                    const rotated = rotateOffset(mirrored, rotation);
                    const origin = new Location(root.x + rotated.x, root.y + rotated.y, root.z + rotated.z);
                    prePlaneCoords.push(origin);
                }
                
                // Check validity on plane 0
                const mask = getPositionMask(prePlaneCoords.map(origin => transposeToPlane(0, origin)));
                if (mask > 0n) {
                    const maskStr = mask.toString();
                    if (!baseMasks.has(maskStr)) {
                        baseMasks.add(maskStr);
                        basePositions.push({
                            prePlaneCoords: prePlaneCoords,
                            rotation: rotation,
                            mirrorX: mirrorX,
                            root: root
                        });
                    }
                }
            }
        }
    }
    
    console.log(`\nGenerated ${basePositions.length} unique base positions (flat, plane 0)`);
    
    // Check what happens when we flip to all planes
    const finalMasks = new Set();
    const maskToVariants = new Map();
    
    for (const basePos of basePositions) {
        for (let plane = 0; plane < 3; plane++) {
            const positions = [];
            let valid = true;
            
            for (const origin of basePos.prePlaneCoords) {
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
                
                if (!maskToVariants.has(maskStr)) {
                    maskToVariants.set(maskStr, []);
                }
                
                maskToVariants.get(maskStr).push({
                    root: basePos.root,
                    rotation: basePos.rotation,
                    plane: plane,
                    mirrorX: basePos.mirrorX
                });
                
                finalMasks.add(maskStr);
            }
        }
    }
    
    console.log(`After flipping to all 3 planes: ${finalMasks.size} unique final positions`);
    console.log(`Duplicates found: ${basePositions.length * 3 - finalMasks.size}`);
    
    // Analyze if we can predict which base positions will duplicate across planes
    let predictableDuplicates = 0;
    for (const [mask, variants] of maskToVariants.entries()) {
        if (variants.length > 1) {
            const planes = [...new Set(variants.map(v => v.plane))];
            if (planes.length > 1) {
                // This position appears on multiple planes - could we have predicted this?
                const baseVariants = variants.filter(v => v.plane === 0);
                if (baseVariants.length > 0) {
                    predictableDuplicates++;
                }
            }
        }
    }
    
    console.log(`\nPredictable duplicates: ${predictableDuplicates} (positions that appear on plane 0 and other planes)`);
    console.log(`\nInsight: If we generate base positions on plane 0 and flip to planes 1 & 2,`);
    console.log(`some positions will be duplicated across planes. We could track which base`);
    console.log(`positions produce unique results on each plane and skip redundant flips.`);
    
    return { basePositions: basePositions.length, finalMasks: finalMasks.size, predictableDuplicates };
}

console.log('='.repeat(70));
console.log('SYMMETRY PATTERN ANALYSIS');
console.log('='.repeat(70));

const gray = new Gray();
const grayNodes = gray.nodes.map(n => n.offset);

console.log('\nFor Gray piece:');
const grayEquivalences = findRotationPlaneEquivalences(grayNodes);
const grayPrediction = canPredictDuplicates(grayNodes);

const lime = new Lime();
const limeNodes = lime.nodes.map(n => n.offset);

console.log(`\n${'='.repeat(70)}`);
console.log('For Lime piece:');
const limeEquivalences = findRotationPlaneEquivalences(limeNodes);
const limePrediction = canPredictDuplicates(limeNodes);

console.log(`\n${'='.repeat(70)}`);
console.log('SUMMARY:');
console.log(`${'='.repeat(70)}`);
console.log(`\nGray: ${grayPrediction.basePositions} base positions → ${grayPrediction.finalMasks} unique`);
console.log(`  Duplicates: ${grayPrediction.basePositions * 3 - grayPrediction.finalMasks}`);
console.log(`  Could potentially skip: ${grayPrediction.predictableDuplicates} redundant plane flips`);
console.log(`\nLime: ${limePrediction.basePositions} base positions → ${limePrediction.finalMasks} unique`);
console.log(`  Duplicates: ${limePrediction.basePositions * 3 - limePrediction.finalMasks}`);
console.log(`  Could potentially skip: ${limePrediction.predictableDuplicates} redundant plane flips`);

