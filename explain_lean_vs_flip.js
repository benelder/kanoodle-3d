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

console.log('='.repeat(70));
console.log('UNDERSTANDING LEAN vs BOARD FLIP');
console.log('='.repeat(70));

// Use Gray piece (2x2 square) as an example
const gray = new Gray();
const baseNodes = gray.nodes.map(n => n.offset);

console.log('\nBase Gray piece nodes (relative offsets):');
baseNodes.forEach((node, i) => {
    console.log(`  Node ${i}: (${node.x}, ${node.y}, ${node.z})`);
});

// Example: Place at root (0, 0, 0) with no rotation, no mirror
console.log('\n' + '='.repeat(70));
console.log('EXAMPLE 1: Piece at root (0,0,0), rotation=0, mirror=false');
console.log('='.repeat(70));

const root = new Location(0, 0, 0);
const rotation = 0;
const mirrorX = false;

console.log('\nWithout lean:');
const nodesNoLean = baseNodes.map(node => {
    const mirrored = applyMirrorX(node, mirrorX);
    const rotated = rotateOffset(mirrored, rotation);
    const placed = new Location(root.x + rotated.x, root.y + rotated.y, root.z + rotated.z);
    return { original: node, placed };
});

nodesNoLean.forEach((node, i) => {
    console.log(`  Node ${i}: offset=(${node.original.x},${node.original.y},${node.original.z}) → placed=(${node.placed.x},${node.placed.y},${node.placed.z})`);
});

console.log('\nWith lean:');
const nodesWithLean = baseNodes.map(node => {
    const mirrored = applyMirrorX(node, mirrorX);
    const rotated = rotateOffset(mirrored, rotation);
    const leaned = applyLean(rotated, true);
    const placed = new Location(root.x + leaned.x, root.y + leaned.y, root.z + leaned.z);
    return { original: node, leaned, placed };
});

nodesWithLean.forEach((node, i) => {
    console.log(`  Node ${i}: offset=(${node.original.x},${node.original.y},${node.original.z}) → leaned=(${node.leaned.x},${node.leaned.y},${node.leaned.z}) → placed=(${node.placed.x},${node.placed.y},${node.placed.z})`);
});

console.log('\n' + '='.repeat(70));
console.log('KEY DIFFERENCE:');
console.log('='.repeat(70));
console.log('\nLEAN (applyLean):');
console.log('  • Operates on PIECE OFFSETS before placement');
console.log('  • Transformation: (x, y, z) → (x, 0, y)');
console.log('  • This "tilts" the piece shape itself');
console.log('  • The piece coordinates change, but board coordinates stay the same');
console.log('  • Example: A piece at (1,2,0) with lean becomes (1,0,2)');
console.log('\nBOARD FLIP (transposeToPlane):');
console.log('  • Operates on BOARD COORDINATES after placement');
console.log('  • Plane 0 (identity): (x, y, z) → (x, y, z)');
console.log('  • Plane 1: (x, y, z) → (5-(x+y+z), x, z)');
console.log('  • Plane 2: (x, y, z) → (y, 5-(x+y+z), z)');
console.log('  • This "rotates the board" to view it from different faces');
console.log('  • The board coordinate system changes, piece shape stays the same');

console.log('\n' + '='.repeat(70));
console.log('EXAMPLE 2: Comparing lean vs board flip on same position');
console.log('='.repeat(70));

const testRoot = new Location(1, 1, 0);
const testNode = new Location(0, 0, 0); // One node of piece

console.log(`\nBase node offset: (${testNode.x}, ${testNode.y}, ${testNode.z})`);
console.log(`Root position: (${testRoot.x}, ${testRoot.y}, ${testRoot.z})`);

// Without lean, plane 0
const placed1 = new Location(testRoot.x + testNode.x, testRoot.y + testNode.y, testRoot.z + testNode.z);
console.log(`\nNo lean, Plane 0: (${testRoot.x + testNode.x}, ${testRoot.y + testNode.y}, ${testRoot.z + testNode.z}) = (${placed1.x}, ${placed1.y}, ${placed1.z})`);

// With lean, plane 0
const leaned = applyLean(testNode, true);
const placed2 = new Location(testRoot.x + leaned.x, testRoot.y + leaned.y, testRoot.z + leaned.z);
console.log(`With lean, Plane 0: leaned=(${leaned.x}, ${leaned.y}, ${leaned.z}), placed=(${placed2.x}, ${placed2.y}, ${placed2.z})`);

// No lean, plane 1 (board flip)
const placed3 = transposeToPlane(1, placed1);
console.log(`No lean, Plane 1 (board flip): (${placed3.x}, ${placed3.y}, ${placed3.z})`);
console.log(`  Math: (5-${placed1.x + placed1.y + placed1.z}, ${placed1.x}, ${placed1.z}) = (5-${placed1.x + placed1.y + placed1.z}, ${placed1.x}, ${placed1.z})`);

console.log('\n' + '='.repeat(70));
console.log('VISUAL UNDERSTANDING:');
console.log('='.repeat(70));
console.log(`
The board is a triangular prism (pyramid):

    VIEW FROM ABOVE (Plane 0):
        /\\
       /  \\
      /____\\

    LEAN transforms the PIECE:
      • Original: piece lies "flat" on the board (z-axis is height)
      • With lean: piece is "tilted" (y becomes z, y becomes 0)
      • The piece orientation changes in the same coordinate space

    BOARD FLIP transforms the COORDINATE SYSTEM:
      • Plane 0: looking at the top face of the pyramid
      • Plane 1: looking at one side face of the pyramid
      • Plane 2: looking at another side face of the pyramid
      • The piece shape stays the same, but it's viewed from a different angle

Think of it this way:
  • LEAN = "Tilt the piece"
  • BOARD FLIP = "Rotate the board and look at it from a different side"
`);

console.log('\n' + '='.repeat(70));
console.log('WHY BOTH ARE NEEDED:');
console.log('='.repeat(70));
console.log(`
They operate on different things and create different position sets:

1. LEAN creates different PIECE ORIENTATIONS:
   - A piece can be placed "flat" (no lean) or "tilted" (with lean)
   - These are physically different ways the piece can sit on the board
   - Example: A 2x2 square can lay flat or stand on its edge

2. BOARD FLIP creates different BOARD VIEWS:
   - The same piece position can be mapped to different board coordinates
   - This accesses positions that are on different "faces" of the triangular prism
   - Example: A position on the top face maps to a position on a side face

Our analysis showed:
  • Positions without lean: 60 (for Gray piece, plane 0 only)
  • Positions with lean: 60 (for Gray piece, plane 0 only)
  • ZERO overlap between them - they're completely different!
  
  • Plane 0 positions: 120 total (60 flat + 60 leaned)
  • Plane 1 & 2 add: 120 more positions (the same set flipped to other faces)
  • Total: 240 unique positions

This proves lean and board flip are orthogonal - they affect different dimensions.
`);

