import { Location } from './kanoodle.js';

function applyLean(offset, lean) {
    return lean ? new Location(offset.x, 0, offset.y) : offset;
}

function transposeToPlane(plane, origin) {
    if (plane === 0) return origin;
    else if (plane === 1) return new Location(5 - (origin.x + origin.y + origin.z), origin.x, origin.z);
    else if (plane === 2) return new Location(origin.y, 5 - (origin.x + origin.y + origin.z), origin.z);
    throw new Error('Plane must be between 0 and 2');
}

console.log('='.repeat(70));
console.log('CONCRETE EXAMPLE: A Single Piece Node');
console.log('='.repeat(70));

console.log('\nImagine a piece node with offset (0, 1, 0)');
console.log('Place it at root position (2, 1, 1)');
console.log('\n');

const nodeOffset = new Location(0, 1, 0);
const root = new Location(2, 1, 1);

console.log('SCENARIO 1: NO LEAN, PLANE 0 (base case)');
console.log('-'.repeat(70));
const placed1 = new Location(root.x + nodeOffset.x, root.y + nodeOffset.y, root.z + nodeOffset.z);
const final1 = transposeToPlane(0, placed1);
console.log(`  Node offset:     (${nodeOffset.x}, ${nodeOffset.y}, ${nodeOffset.z})`);
console.log(`  Root position:  (${root.x}, ${root.y}, ${root.z})`);
console.log(`  Placed:         (${placed1.x}, ${placed1.y}, ${placed1.z}) = root + offset`);
console.log(`  Plane 0 (final): (${final1.x}, ${final1.y}, ${final1.z})`);
console.log(`  → Piece lies flat on top face, y-component preserved`);

console.log('\nSCENARIO 2: WITH LEAN, PLANE 0');
console.log('-'.repeat(70));
const leaned = applyLean(nodeOffset, true);
const placed2 = new Location(root.x + leaned.x, root.y + leaned.y, root.z + leaned.z);
const final2 = transposeToPlane(0, placed2);
console.log(`  Node offset:     (${nodeOffset.x}, ${nodeOffset.y}, ${nodeOffset.z})`);
console.log(`  After lean:      (${leaned.x}, ${leaned.y}, ${leaned.z}) ← y became z, y became 0`);
console.log(`  Root position:  (${root.x}, ${root.y}, ${root.z})`);
console.log(`  Placed:         (${placed2.x}, ${placed2.y}, ${placed2.z}) = root + leaned offset`);
console.log(`  Plane 0 (final): (${final2.x}, ${final2.y}, ${final2.z})`);
console.log(`  → Piece is TILTED - the offset changed before placement`);
console.log(`  → Compare: Without lean y=${placed1.y}, with lean y=${placed2.y} (changed!)`);

console.log('\nSCENARIO 3: NO LEAN, PLANE 1 (BOARD FLIP)');
console.log('-'.repeat(70));
const final3 = transposeToPlane(1, placed1);
console.log(`  Start with:     (${placed1.x}, ${placed1.y}, ${placed1.z}) ← from Scenario 1`);
console.log(`  Plane 1 transform: (5-${placed1.x + placed1.y + placed1.z}, ${placed1.x}, ${placed1.z})`);
console.log(`  Final:          (${final3.x}, ${final3.y}, ${final3.z})`);
console.log(`  → Same piece position, but mapped to a DIFFERENT BOARD COORDINATE`);
console.log(`  → This is viewing the position from the side of the triangular prism`);
console.log(`  → The piece shape didn't change, just the coordinate system`);

console.log('\nSCENARIO 4: WITH LEAN, PLANE 1 (BOTH)');
console.log('-'.repeat(70));
const final4 = transposeToPlane(1, placed2);
console.log(`  Start with:     (${placed2.x}, ${placed2.y}, ${placed2.z}) ← from Scenario 2 (with lean)`);
console.log(`  Plane 1 transform: (5-${placed2.x + placed2.y + placed2.z}, ${placed2.x}, ${placed2.z})`);
console.log(`  Final:          (${final4.x}, ${final4.y}, ${final4.z})`);
console.log(`  → Piece is tilted (lean) AND viewed from side (plane flip)`);
console.log(`  → This is a completely different position!`);

console.log('\n' + '='.repeat(70));
console.log('KEY INSIGHT:');
console.log('='.repeat(70));
console.log(`
LEAN transforms the PIECE:
  • Happens BEFORE placement
  • Changes: (0, 1, 0) → (0, 0, 1)
  • The piece itself is reoriented
  • Result: Different physical placement on the same board view

BOARD FLIP transforms the BOARD:
  • Happens AFTER placement
  • Changes: (2, 2, 1) → (0, 2, 1)  [plane 1 transform]
  • The coordinate system is rotated
  • Result: Same physical placement viewed from different board face

They are INDEPENDENT operations:
  • You can have lean without board flip: (Scenario 2)
  • You can have board flip without lean: (Scenario 3)
  • You can have both: (Scenario 4)
  • All four scenarios produce DIFFERENT final positions!
`);

console.log('\n' + '='.repeat(70));
console.log('WHY "LEAN IS LIKE BOARD FLIP" IS NOT QUITE RIGHT:');
console.log('='.repeat(70));
console.log(`
Your mental model: "Leaning a piece = flipping the board"

The confusion comes from thinking both change how we view things, but:

1. LEAN changes the PIECE:
   • The piece itself rotates/tilts in 3D space
   • Example: A flat 2x2 square becomes an upright rectangle
   • This is a PHYSICAL change to the piece orientation

2. BOARD FLIP changes the VIEWPOINT:
   • We rotate the coordinate system to look at the board from a different angle
   • The piece stays in the same orientation, but we're viewing it from the side
   • This is a COORDINATE SYSTEM change

Analogy:
  • LEAN = "Rotate the piece 90 degrees"
  • BOARD FLIP = "Walk around the board and look at it from the side"
  
  • With lean: The piece itself is different (flat vs upright)
  • With board flip: We're seeing the same piece from a different angle
  
That's why they create COMPLETELY DIFFERENT sets of positions with ZERO overlap!
`);

