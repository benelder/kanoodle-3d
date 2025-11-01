/**
 * Represents a 3D coordinate location in the puzzle space.
 * @class
 */
export class Location {
    /**
     * Creates a new Location instance.
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {number} z - The z coordinate
     */
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

/**
 * Represents a single atom/node component of a piece with an offset location.
 * @class
 */
export class Atom {
    /**
     * Creates a new Atom instance.
     * @param {number} x - The x offset coordinate
     * @param {number} y - The y offset coordinate
     * @param {number} z - The z offset coordinate
     */
    constructor(x, y, z) {
        this.offset = new Location(x, y, z);
    }
}

/**
 * Base class representing a puzzle piece with position, rotation, and transformations.
 * @class
 */
export class Piece {
    /**
     * Creates a new Piece instance.
     * @param {Location} rootPosition - The root position of the piece
     * @param {number} rotation - The rotation value (0-5)
     * @param {number} plane - The plane index (0-2)
     * @param {Atom[]} nodes - Array of atoms that make up the piece
     * @param {string} name - The name of the piece
     * @param {string} character - The character identifier for this piece
     */
    constructor(rootPosition, rotation, plane, nodes, name, character) {
        this.rootPosition = rootPosition;
        this.rotation = rotation;
        this.plane = plane;
        this.nodes = nodes;
        this.name = name;
        this.character = character;
    }
    mirrorX;
    lean;
    absolutePosition;
    bitmask;

    /**
     * Calculates the absolute positions of all nodes in the piece after applying
     * transformations (mirror, rotation, lean, plane transpose) and updates the bitmask.
     * @returns {Atom[]} Array of atoms with their absolute positions
     */
    getAbsolutePosition() {
        var toRet = [];
        var mask = 0n;

        for (let i = 0; i < this.nodes.length; i++) {
            let start = applyMirrorX(this.nodes[i].offset, this.mirrorX);
            let offset = rotateOffset(start, this.rotation);
            let leanResult = applyLean(offset, this.lean);
            let origin = new Location(this.rootPosition.x + leanResult.x,
                this.rootPosition.y + leanResult.y,
                this.rootPosition.z + leanResult.z);
            var transpose = transposeToPlane(this.plane, origin);
            toRet.push(new Atom(transpose.x, transpose.y, transpose.z));

            // Calculate bitmask for this position
            // Check for invalid coordinates (negative or out of pyramid bounds)
            if (transpose.x < 0 || transpose.y < 0 || transpose.z < 0 ||
                transpose.x + transpose.y + transpose.z > 5) {
                // Mark as invalid by setting a bit that's definitely not in validBoardMask
                mask |= (1n << 255n);  // Use a high bit as "invalid" marker
            } else {
                const bit = positionToBit(transpose.x, transpose.y, transpose.z);
                mask |= (1n << bit);
            }
        }

        this.bitmask = mask;
        return toRet;
    }

    /**
     * Checks if the piece is out of bounds using optimized bitwise operations.
     * @returns {boolean} True if the piece is out of bounds, false otherwise
     */
    isOutOfBounds() {
        // Optimized: single bitwise operation
        // If any bit in the piece's mask is NOT in the valid board mask, it's out of bounds
        return (this.bitmask & ~validBoardMask) !== 0n;
    }
}


const pieceHelper = new Map();
pieceHelper.set('A', { ctor: () => { return new Lime(); } });
pieceHelper.set('B', { ctor: () => { return new Yellow(); } });
pieceHelper.set('C', { ctor: () => { return new DarkBlue(); } });
pieceHelper.set('D', { ctor: () => { return new LightBlue(); } });
pieceHelper.set('E', { ctor: () => { return new Red(); } });
pieceHelper.set('F', { ctor: () => { return new Pink(); } });
pieceHelper.set('G', { ctor: () => { return new Green(); } });
pieceHelper.set('H', { ctor: () => { return new White(); } });
pieceHelper.set('I', { ctor: () => { return new Orange(); } });
pieceHelper.set('J', { ctor: () => { return new Peach(); } });
pieceHelper.set('K', { ctor: () => { return new Gray(); } });
pieceHelper.set('L', { ctor: () => { return new Purple(); } });

/**
 * Dark Blue piece (character 'C').
 * Shape representation (top-down view):
 * ```
 *         0
 *        0
 *   0 0 0
 * ```
 * @class
 * @extends Piece
 */
export class DarkBlue extends Piece {
    constructor() {
        const nodes = [
            new Atom(0, 0, 0),
            new Atom(1, 0, 0),
            new Atom(2, 0, 0),
            new Atom(2, 1, 0),
            new Atom(2, 2, 0)];
        super(new Location(0, 0, 0), 0, 0, nodes, 'DarkBlue', 'C');
    }
}

/**
 * Gray piece (character 'K').
 * Shape representation (top-down view):
 * ```
 *   0 0
 *  0 0
 * ```
 * @class
 * @extends Piece
 */
export class Gray extends Piece {
    constructor() {
        const nodes = [
            new Atom(0, 0, 0),
            new Atom(1, 0, 0),
            new Atom(0, 1, 0),
            new Atom(1, 1, 0)];
        super(new Location(0, 0, 0), 0, 0, nodes, 'Gray', 'K');
    }
}

/**
 * Red piece (character 'E').
 * Shape representation (top-down view):
 * ```
 *   0 0
 *  0 0 0
 * ```
 * @class
 * @extends Piece
 */
export class Red extends Piece {
    constructor() {
        const nodes = [
            new Atom(0, 0, 0),
            new Atom(1, 0, 0),
            new Atom(2, 0, 0),
            new Atom(0, 1, 0),
            new Atom(1, 1, 0)];
        super(new Location(0, 0, 0), 0, 0, nodes, 'Red', 'E');
    }
}

/**
 * Green piece (character 'G').
 * Shape representation (top-down view):
 * ```
 *   0   0
 *  0 0 0
 * ```
 * @class
 * @extends Piece
 */
export class Green extends Piece {
    constructor() {
        const nodes = [
            new Atom(0, 0, 0),
            new Atom(1, 0, 0),
            new Atom(2, 0, 0),
            new Atom(0, 1, 0),
            new Atom(2, 1, 0)];
        super(new Location(0, 0, 0), 0, 0, nodes, 'Green', 'G');
    }
}

/**
 * Light Blue piece (character 'D').
 * Shape representation (top-down view):
 * ```
 *    0
 *  0 0 0 0
 * ```
 * @class
 * @extends Piece
 */
export class LightBlue extends Piece {
    constructor() {
        const nodes = [
            new Atom(0, 0, 0),
            new Atom(1, 0, 0),
            new Atom(2, 0, 0),
            new Atom(3, 0, 0),
            new Atom(0, 1, 0)];
        super(new Location(0, 0, 0), 0, 0, nodes, 'LightBlue', 'D');
    }
}

/**
 * Lime piece (character 'A').
 * Shape representation (top-down view):
 * ```
 *    0
 *   0 0
 *  0 0
 * ```
 * @class
 * @extends Piece
 */
export class Lime extends Piece {
    constructor() {
        const nodes = [
            new Atom(0, 0, 0),
            new Atom(1, 0, 0),
            new Atom(1, 1, 0),
            new Atom(1, 2, 0),
            new Atom(2, 1, 0)];
        super(new Location(0, 0, 0), 0, 0, nodes, 'Lime', 'A');
    }
}

/**
 * Orange piece (character 'I').
 * Shape representation (top-down view):
 * ```
 *      0
 *     0
 *  0 0
 * ```
 * @class
 * @extends Piece
 */
export class Orange extends Piece {
    constructor() {
        const nodes = [
            new Atom(0, 0, 0),
            new Atom(1, 0, 0),
            new Atom(1, 1, 0),
            new Atom(1, 2, 0)];
        super(new Location(0, 0, 0), 0, 0, nodes, 'Orange', 'I');
    }
}

/**
 * Peach piece (character 'J').
 * Shape representation (top-down view):
 * ```
 *     0 0
 *  0 0
 * ```
 * @class
 * @extends Piece
 */
export class Peach extends Piece {
    constructor() {
        const nodes = [
            new Atom(0, 0, 0),
            new Atom(1, 0, 0),
            new Atom(1, 1, 0),
            new Atom(2, 1, 0)];
        super(new Location(0, 0, 0), 0, 0, nodes, 'Peach', 'J');
    }
}

/**
 * Pink piece (character 'F').
 * Shape representation (top-down view):
 * ```
 *     0
 *  0 0 0 0
 * ```
 * @class
 * @extends Piece
 */
export class Pink extends Piece {
    constructor() {
        const nodes = [
            new Atom(0, 0, 0),
            new Atom(1, 0, 0),
            new Atom(2, 0, 0),
            new Atom(3, 0, 0),
            new Atom(1, 1, 0)];
        super(new Location(0, 0, 0), 0, 0, nodes, 'Pink', 'F');
    }
}

/**
 * Purple piece (character 'L').
 * Shape representation (top-down view):
 * ```
 *     0
 *  0 0 0
 * ```
 * @class
 * @extends Piece
 */
export class Purple extends Piece {
    constructor() {
        const nodes = [
            new Atom(0, 0, 0),
            new Atom(1, 0, 0),
            new Atom(2, 0, 0),
            new Atom(1, 1, 0)];
        super(new Location(0, 0, 0), 0, 0, nodes, 'Purple', 'L');
    }
}

/**
 * White piece (character 'H').
 * Shape representation (top-down view):
 * ```
 *   0
 *  0
 * 0 0 0
 * ```
 * @class
 * @extends Piece
 */
export class White extends Piece {
    constructor() {
        const nodes = [
            new Atom(0, 0, 0),
            new Atom(1, 0, 0),
            new Atom(2, 0, 0),
            new Atom(0, 1, 0),
            new Atom(0, 2, 0)];
        super(new Location(0, 0, 0), 0, 0, nodes, 'White', 'H');
    }
}

/**
 * Yellow piece (character 'B').
 * Shape representation (top-down view):
 * ```
 *     0 0
 *  0 0 0
 * ```
 * @class
 * @extends Piece
 */
export class Yellow extends Piece {
    constructor() {
        const nodes = [
            new Atom(0, 0, 0),
            new Atom(1, 0, 0),
            new Atom(2, 0, 0),
            new Atom(1, 1, 0),
            new Atom(2, 1, 0)];
        super(new Location(0, 0, 0), 0, 0, nodes, 'Yellow', 'B');
    }
}

/**
 * Registry that manages all possible positions for each piece color.
 * Pre-computes and stores all valid placements to optimize puzzle solving.
 * @class
 */
export class PieceRegistry {
    colors = new Map();

    constructor() {
        this.#loadPossiblePositions()
    }

    /**
     * Loads all possible positions for each piece color from the piece helper map.
     * @private
     */
    #loadPossiblePositions() {
        for (let [key, value] of pieceHelper) {
            const result = this.#loadPositionsForColor(value.ctor);
            this.colors.set(key, {
                allPositions: result.positions,
                validPositions: result.positions,
                vposIndex: 0
            });

            // Log position generation statistics (to stderr to avoid interfering with JSON output)
            console.error(`Color ${key}: total=${result.totalGenerated}, invalid=${result.invalidCount}, duplicates=${result.duplicateCount}, valid=${result.validCount}`);
        }
    }

    /**
     * Generates all unique valid positions for a given piece constructor.
     * Enumerates all combinations of root positions, rotations, mirrors, leans, and planes,
     * then filters out duplicates using bitmask comparison.
     * @param {Function} constr - Constructor function for the piece type
     * @returns {{positions: Array, totalGenerated: number, invalidCount: number, duplicateCount: number, validCount: number}} Object containing positions array and statistics
     * @private
     */
    #loadPositionsForColor(constr) {
        const toRet = [];
        const seenMasks = new Set(); // Track bitmasks we've already seen - O(1) lookup
        let totalGenerated = 0;
        let invalidCount = 0;
        let duplicateCount = 0;

        // Build base piece once to access node offsets and character
        const basePiece = constr();
        const baseNodes = basePiece.nodes.map(n => n.offset);

        // Precompute orientation-relative offsets (pre-transpose)
        const orientationCache = [];
        for (let r = 0; r < 6; r++) {
            for (let lean of [false, true]) {
                for (let mirrorX of [false, true]) {
                    const preOffsets = [];
                    for (let i = 0; i < baseNodes.length; i++) {
                        const start = applyMirrorX(baseNodes[i], mirrorX);
                        const rot = rotateOffset(start, r);
                        const leaned = applyLean(rot, lean);
                        preOffsets.push(leaned);
                    }
                    orientationCache.push({ rotation: r, lean: lean, mirrorX: mirrorX, preOffsets });
                }
            }
        }

        // Enumerate roots and planes; translate precomputed offsets and then transpose
        for (let z = 0; z < 6; z++) // for each root position
        {
            for (let y = 0; y < 6; y++) // for each root position
            {
                for (let x = 0; x < 6; x++) // for each root position
                {
                    if (x + y + z > 5) // will be out of bounds
                        continue;

                    for (let p = 0; p < 3; p++) // for each plane
                    {
                        for (let oc = 0; oc < orientationCache.length; oc++) {
                            totalGenerated++; // Count every position attempted before any filtering

                            const { rotation, lean, mirrorX, preOffsets } = orientationCache[oc];

                            // Build absolutePosition and bitmask with explicit bounds checks
                            const abs = [];
                            let mask = 0n;
                            let invalid = false;
                            for (let i = 0; i < preOffsets.length; i++) {
                                const origin = new Location(x + preOffsets[i].x, y + preOffsets[i].y, z + preOffsets[i].z);
                                const t = transposeToPlane(p, origin);
                                // Explicit coordinate validation to avoid negative or out-of-pyramid cells
                                if (t.x < 0 || t.y < 0 || t.z < 0 || (t.x + t.y + t.z) > 5) {
                                    invalid = true;
                                    break;
                                }
                                abs.push(new Atom(t.x, t.y, t.z));
                                const bit = positionToBit(t.x, t.y, t.z);
                                mask |= (1n << bit);
                            }

                            if (invalid) {
                                invalidCount++;
                                continue;
                            }

                            if (!seenMasks.has(mask)) {
                                seenMasks.add(mask);

                                const cells = [];
                                for (let ci = 0; ci < abs.length; ci++) {
                                    const loc = abs[ci].offset;
                                    cells.push(loc.x * 36 + loc.y * 6 + loc.z);
                                }

                                toRet.push({
                                    bitmask: mask,
                                    cells: cells,
                                    character: basePiece.character,
                                    // Preserve fields expected by benchmark/config tooling
                                    rootPosition: new Location(x, y, z),
                                    rotation: rotation,
                                    plane: p,
                                    lean: lean,
                                    mirrorX: mirrorX,
                                    absolutePosition: abs
                                });
                            } else {
                                duplicateCount++;
                            }
                        }
                    }
                }
            }
        }

        const validCount = toRet.length;
        return {
            positions: toRet,
            totalGenerated: totalGenerated,
            invalidCount: invalidCount,
            duplicateCount: duplicateCount,
            validCount: validCount
        };
    }

    /**
     * Resets the registry by restoring all valid positions for each color.
     * Called when the board is reset to allow all positions to be tried again.
     */
    reset() {
        const values = this.colors.values();
        for (let value of values) {
            value.validPositions = value.allPositions;
            value.vposIndex = 0;
        }
    }
}

/**
 * Represents the puzzle board state and provides solving functionality.
 * Uses bitwise operations for efficient collision detection and position tracking.
 * @class
 */
export class Board {
    piecesUsed = new Map();
    pieceRegistry = new PieceRegistry();
    occupancyMask = 0n;

    constructor() {
        this.#initializeBoard();
    }

    /**
     * Initializes the board to an empty state.
     * @private
     */
    #initializeBoard() {
        this.piecesUsed = new Map();
        this.occupancyMask = 0n;
    }

    /**
     * Gets all piece colors that haven't been placed on the board yet.
     * @returns {Array} Array of [key, value] pairs for unused colors
     */
    getUnusedColors() {
        return [...this.pieceRegistry.colors]
            .filter(([k, v]) => !this.piecesUsed.has(k));
    }

    /**
     * Places a piece on the board, updating occupancy and valid positions.
     * Throws an error if the piece would collide with existing pieces.
     * @param {Piece} piece - The piece to place on the board
     * @throws {Error} If the piece collides with existing pieces
     */
    placePiece(piece) {
        // Single collision check at the start using bitmask
        if (this.collision(piece)) {
            throw new Error("Attempt to add piece in used location");
        }

        this.piecesUsed.set(piece.character, piece);
        this.occupancyMask |= piece.bitmask;

        // Automatic constraint propagation - update valid positions for remaining pieces
        this.updateAllValidPositions();
    }

    /**
     * Removes a piece from the board and updates valid positions for remaining pieces.
     * @param {Piece} piece - The piece to remove from the board
     */
    removePiece(piece) {
        this.piecesUsed.delete(piece.character);
        this.occupancyMask &= ~piece.bitmask;

        // Automatic constraint propagation - update valid positions for remaining pieces
        this.updateAllValidPositions();
    }

    /**
     * Checks if a piece collides with any already-placed pieces using bitwise operations.
     * @param {Piece} piece - The piece to check for collisions
     * @returns {boolean} True if the piece collides, false otherwise
     */
    collision(piece) {
        // Optimized: single bitwise AND operation instead of looping
        return (piece.bitmask & this.occupancyMask) !== 0n;
    }

    /**
     * Resets the board to an empty state and restores all piece positions in the registry.
     */
    resetBoard() {
        this.#initializeBoard();
        this.pieceRegistry.reset();
    }

    /**
     * Updates the valid positions list for all unused pieces based on current board occupancy.
     * Filters out positions that would collide with already-placed pieces.
     */
    updateAllValidPositions() {
        for (let [key, value] of this.pieceRegistry.colors) {
            if (this.piecesUsed.has(key)) {
                continue; // only updating valid positions indexes of pieces that have not been used
            }
            else {
                value.validPositions = [];
                for (let i = 0; i < value.allPositions.length; i++) {
                    const piece = value.allPositions[i];
                    if (!this.collision(piece)) {
                        value.validPositions.push(piece);
                    }
                }
            }
        }
    }

    /**
     * Solves the puzzle using backtracking with constraint propagation.
     * Selects pieces with the fewest valid positions first (most constrained variable heuristic).
     * Uses early termination checks to prune impossible solution paths.
     * @returns {boolean} True if a solution is found, false otherwise
     */
    solve() {
        const unusedColors = this.getUnusedColors();

        if (unusedColors.length == 0) {
            return true;
        }

        // Early no-solution guard: union coverage check
        // If the union of all remaining placements cannot cover all empty cells, fail fast
        const emptyMask = validBoardMask & ~this.occupancyMask;
        let unionMask = 0n;
        for (let i = 0; i < unusedColors.length; i++) {
            const colorData = unusedColors[i][1];
            const vpos = colorData.validPositions;
            for (let j = 0; j < vpos.length; j++) {
                unionMask |= vpos[j].bitmask;
            }
        }
        if ((emptyMask & ~unionMask) !== 0n) {
            return false;
        }

        // Find the color with the fewest valid positions
        const pieces = unusedColors
            .reduce((min, val) => val[1].validPositions.length < min[1].validPositions.length ? val : min)[1]
            .validPositions;

        if (pieces.length == 0) {
            return false;
        }

        // Try each piece of the given color in turn
        for (let i = 0; i < pieces.length; i++) {
            const pos = pieces[i];
            // No collision check needed - validPositions is kept accurate via constraint propagation
            this.placePiece(pos);
            // Recursively try to solve the board with the new piece
            const s = this.solve();
            if (s == true) {
                // solution found! bubble up!
                return true;
            }
            // Remove the piece and try the next one
            this.removePiece(pos);
        }

        return false;
    }
}




/**
 * Converts a 3D board position to a bit index for bitmask operations.
 * The board has 56 valid positions where x+y+z <= 5, mapped to bits 0-55 in a BigInt.
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {number} z - The z coordinate
 * @returns {bigint} The bit index corresponding to the position
 */
function positionToBit(x, y, z) {
    return BigInt(x * 36 + y * 6 + z);
}

/**
 * Pre-calculated bitboard mask for all valid board positions.
 * Valid positions are where x, y, z >= 0 and x+y+z <= 5.
 * @constant {bigint}
 */
const validBoardMask = (() => {
    let mask = 0n;
    for (let x = 0; x < 6; x++) {
        for (let y = 0; y < 6; y++) {
            for (let z = 0; z < 6; z++) {
                if (x + y + z <= 5) {
                    const bit = positionToBit(x, y, z);
                    mask |= (1n << bit);
                }
            }
        }
    }
    return mask;
})()

/**
 * Applies X-axis mirroring transformation to an offset location.
 * @param {Location} offset - The location offset to transform
 * @param {boolean} mirrorX - Whether to apply mirroring
 * @returns {Location} The transformed location
 */
function applyMirrorX(offset, mirrorX) {
    return mirrorX ? new Location(offset.x + offset.y, -offset.y, offset.z) : offset;
}

/**
 * Applies lean transformation to an offset location.
 * @param {Location} offset - The location offset to transform
 * @param {boolean} lean - Whether to apply lean transformation
 * @returns {Location} The transformed location
 */
function applyLean(offset, lean) {
    return lean ? new Location(offset.x, 0, offset.y) : offset;
}

/**
 * Rotates a location by the specified number of 60-degree rotations (0-5).
 * @param {Location} location - The location to rotate
 * @param {number} rotation - The rotation value (0-5)
 * @returns {Location} The rotated location
 * @throws {Error} If rotation is greater than 5
 */
function rotateOffset(location, rotation) {
    if (rotation === 0) {
        return location;
    }

    if (rotation > 5) {
        throw new Error('Invalid rotation');
    }

    let r = new Location(location.x, location.y, location.z);
    for (let i = 0; i < rotation; i++) {
        r = new Location(-r.y, r.x + r.y, r.z);
    }
    return r;
}

/**
 * Transposes coordinates to a different plane (0, 1, or 2).
 * @param {number} plane - The target plane (0, 1, or 2)
 * @param {Location} origin - The origin location to transpose
 * @returns {Location} The transposed location
 * @throws {Error} If plane is not between 0 and 2
 */
function transposeToPlane(plane, origin) {
    if (plane === 0) {
        return origin;
    } else if (plane === 1) {
        return new Location(5 - (origin.x + origin.y + origin.z), origin.x, origin.z);
    } else if (plane === 2) {
        return new Location(origin.y, 5 - (origin.x + origin.y + origin.z), origin.z);
    }
    throw new Error('Plane must be between 0 and 2');
}