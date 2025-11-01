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
     * Validates that a transposed coordinate is within board bounds.
     * @param {Location} transposed - The transposed location to validate
     * @returns {boolean} True if the coordinate is valid, false otherwise
     * @private
     */
    #isValidTransposed(transposed) {
        return transposed.x >= 0 && transposed.y >= 0 && transposed.z >= 0 &&
            (transposed.x + transposed.y + transposed.z) <= 5;
    }

    /**
     * Calculates a bitmask from an array of coordinates on a given plane.
     * @param {Location[]} coords - Array of pre-plane coordinates
     * @param {number} plane - The plane to transpose to (0, 1, or 2)
     * @returns {bigint} The bitmask representing the position
     * @private
     */
    #calculateBitmask(coords, plane) {
        let mask = 0n;
        for (let i = 0; i < coords.length; i++) {
            const t = transposeToPlane(plane, coords[i]);
            if (!this.#isValidTransposed(t)) {
                return null; // Invalid position
            }
            const bit = positionToBit(t.x, t.y, t.z);
            mask |= (1n << bit);
        }
        return mask;
    }

    /**
     * Transposes coordinates to a plane and creates atoms, validating as we go.
     * @param {Location[]} prePlaneCoords - Array of pre-plane coordinates
     * @param {number} plane - The plane to transpose to (0, 1, or 2)
     * @returns {{atoms: Atom[], mask: bigint} | null} Object with atoms and bitmask, or null if invalid
     * @private
     */
    #transposeAndBuildAtoms(prePlaneCoords, plane) {
        const atoms = [];
        let mask = 0n;

        for (let i = 0; i < prePlaneCoords.length; i++) {
            const origin = prePlaneCoords[i];
            const t = transposeToPlane(plane, origin);
            if (!this.#isValidTransposed(t)) {
                return null; // Invalid position
            }
            atoms.push(new Atom(t.x, t.y, t.z));
            const bit = positionToBit(t.x, t.y, t.z);
            mask |= (1n << bit);
        }

        return { atoms, mask };
    }

    /**
     * Builds the cells array from an array of atoms.
     * @param {Atom[]} atoms - Array of atoms with their offset locations
     * @returns {number[]} Array of cell indices
     * @private
     */
    #buildCellsArray(atoms) {
        const cells = [];
        for (let i = 0; i < atoms.length; i++) {
            const loc = atoms[i].offset;
            cells.push(loc.x * 36 + loc.y * 6 + loc.z);
        }
        return cells;
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
     * Generates base positions on plane 0 for a given lean setting.
     * @param {Location[]} baseNodes - The base node offsets for the piece
     * @param {boolean} applyLeanTransform - Whether to apply lean transformation
     * @param {Set} basePositionsSet - Set to track and deduplicate base positions by bitmask
     * @returns {{basePositions: Array, totalGenerated: number, invalidCount: number}} Object containing base positions and statistics
     * @private
     */
    #generateBasePositions(baseNodes, applyLeanTransform, basePositionsSet) {
        const basePositions = [];
        let totalGenerated = 0;
        let invalidCount = 0;

        for (let z = 0; z < 6; z++) {
            for (let y = 0; y < 6; y++) {
                for (let x = 0; x < 6; x++) {
                    if (x + y + z > 5) continue;

                    for (let rotation = 0; rotation < 6; rotation++) {
                        for (let mirrorX of [false, true]) {
                            totalGenerated++;

                            // Build position: calculate pre-plane coordinates
                            const prePlaneCoords = [];
                            for (let i = 0; i < baseNodes.length; i++) {
                                const start = applyMirrorX(baseNodes[i], mirrorX);
                                const rot = rotateOffset(start, rotation);
                                const transformed = applyLeanTransform ? applyLean(rot, true) : rot;
                                const origin = new Location(x + transformed.x, y + transformed.y, z + transformed.z);
                                prePlaneCoords.push(origin);
                            }

                            // Calculate mask for plane 0 to deduplicate base positions
                            const mask = this.#calculateBitmask(prePlaneCoords, 0);
                            if (mask === null) {
                                invalidCount++;
                                continue;
                            }

                            const maskStr = mask.toString();
                            if (!basePositionsSet.has(maskStr)) {
                                basePositionsSet.add(maskStr);
                                basePositions.push({
                                    prePlaneCoords: prePlaneCoords,
                                    rootPosition: new Location(x, y, z),
                                    rotation: rotation,
                                    lean: applyLeanTransform,
                                    mirrorX: mirrorX
                                });
                            }
                        }
                    }
                }
            }
        }

        return { basePositions, totalGenerated, invalidCount };
    }

    /**
     * Flips base positions to all 3 planes and deduplicates final positions.
     * @param {Array} basePositions - Array of base position objects with pre-plane coordinates
     * @param {string} character - The piece character identifier
     * @param {Set} seenMasks - Set to track final positions by bitmask
     * @returns {{positions: Array, totalGenerated: number, invalidCount: number, duplicateCount: number}} Object containing final positions and statistics
     * @private
     */
    #flipBasePositionsToPlanes(basePositions, character, seenMasks) {
        const positions = [];
        let totalGenerated = 0;
        let invalidCount = 0;
        let duplicateCount = 0;

        for (const basePos of basePositions) {
            for (let plane = 0; plane < 3; plane++) {
                totalGenerated++;

                // Apply plane transpose to pre-plane coordinates
                const result = this.#transposeAndBuildAtoms(basePos.prePlaneCoords, plane);
                if (result === null) {
                    invalidCount++;
                    continue;
                }

                const { atoms: flippedAbs, mask } = result;
                const maskStr = mask.toString();
                if (!seenMasks.has(maskStr)) {
                    seenMasks.add(maskStr);

                    const cells = this.#buildCellsArray(flippedAbs);

                    positions.push({
                        bitmask: mask,
                        cells: cells,
                        character: character,
                        rootPosition: basePos.rootPosition,
                        rotation: basePos.rotation,
                        plane: plane,
                        lean: basePos.lean,
                        mirrorX: basePos.mirrorX,
                        absolutePosition: flippedAbs
                    });
                } else {
                    duplicateCount++;
                }
            }
        }

        return { positions, totalGenerated, invalidCount, duplicateCount };
    }

    /**
     * Generates all unique valid positions for a given piece constructor using the board-flip approach.
     * First generates base positions "flat" on plane 0 (with and without lean), then "flips" each
     * base position to all 3 board faces (planes). This is more efficient than generating positions
     * for each plane separately.
     * @param {Function} constr - Constructor function for the piece type
     * @returns {{positions: Array, totalGenerated: number, invalidCount: number, duplicateCount: number, validCount: number}} Object containing positions array and statistics
     * @private
     */
    #loadPositionsForColor(constr) {
        const seenMasks = new Set(); // Track bitmasks we've already seen - O(1) lookup
        let totalGenerated = 0;
        let invalidCount = 0;
        let duplicateCount = 0;

        // Build base piece once to access node offsets and character
        const basePiece = constr();
        const baseNodes = basePiece.nodes.map(n => n.offset);

        // Step 1: Generate base positions on plane 0 (flat and leaned separately)
        const basePositionsSet = new Set(); // Deduplicate base positions on plane 0

        // Generate flat positions (no lean)
        const flatResult = this.#generateBasePositions(baseNodes, false, basePositionsSet);
        totalGenerated += flatResult.totalGenerated;
        invalidCount += flatResult.invalidCount;

        // Generate leaned positions (with lean)
        const leanedResult = this.#generateBasePositions(baseNodes, true, basePositionsSet);
        totalGenerated += leanedResult.totalGenerated;
        invalidCount += leanedResult.invalidCount;

        const allBasePositions = [...flatResult.basePositions, ...leanedResult.basePositions];

        // Step 2: "Flip the board" - map each base position to all 3 planes
        const flipResult = this.#flipBasePositionsToPlanes(allBasePositions, basePiece.character, seenMasks);
        totalGenerated += flipResult.totalGenerated;
        invalidCount += flipResult.invalidCount;
        duplicateCount += flipResult.duplicateCount;

        const validCount = flipResult.positions.length;
        return {
            positions: flipResult.positions,
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