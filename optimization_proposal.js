import { Location, Gray, Lime } from './kanoodle.js';
import { PieceRegistry } from './kanoodle.js';

// Test current implementation
const registry = new PieceRegistry();
const testColors = ['A', 'B', 'K', 'L']; // Gray, Lime, DarkBlue, White

console.log('='.repeat(70));
console.log('CURRENT DUPLICATE ANALYSIS');
console.log('='.repeat(70));

for (const key of testColors) {
    const data = registry.colors.get(key);
    if (data) {
        console.log(`Color ${key}: ${data.allPositions.length} unique positions`);
    }
}

console.log('\n' + '='.repeat(70));
console.log('DUPLICATE PATTERN INSIGHTS:');
console.log('='.repeat(70));
console.log(`
1. All duplicates have the SAME lean value (either all false or all true)
   → This suggests that lean generation is correctly separated

2. Many duplicates involve different rotations + planes producing same position
   Example: rotation 0 on plane 0 = rotation 4 on plane 1 = rotation 2 on plane 2
   → This is a symmetry of the triangular prism board

3. Some positions appear on ALL 3 planes with different rotations
   → These are positions that have full 3-fold symmetry

4. The duplicates occur because the same final position can be reached via:
   - Different rotations on different planes
   - Same base position flipped to multiple planes produces duplicates

OPTIMIZATION OPPORTUNITY:
Since we generate base positions once and flip them to all 3 planes, we could:
1. Track masks as we flip to each plane
2. Skip flipping to planes 1 & 2 if we've already seen the position
3. But this requires checking masks, which is what we're already doing

However, a more efficient approach might be:
- For each base position, flip to plane 0 first
- If that position already exists (from another base position), skip planes 1 & 2
- Otherwise, flip to planes 1 & 2 and track which planes produce unique results

But this is complex because we need to know if plane 0 position is unique
before flipping to other planes, and base positions are independent.

PRACTICAL RECOMMENDATION:
The current approach (generate all, deduplicate by bitmask) is actually quite
efficient. The duplicates are already being filtered out quickly with Set lookups.
Any optimization to avoid generating duplicates would require predicting them
in advance, which might be more expensive than generating and checking.

The real question is: are these duplicates a performance bottleneck?
If deduplication is fast (O(1) Set lookup), then generating a few extra
positions and filtering them is likely faster than complex prediction logic.
`);

