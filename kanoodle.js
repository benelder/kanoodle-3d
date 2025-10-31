// Helper function to convert board position to bit index
// Board has 56 valid positions where x+y+z <= 5
// We map them to bits 0-55 in a BigInt
function positionToBit(x, y, z) {
    return BigInt(x * 36 + y * 6 + z);
}

// Pre-calculate a bitboard for all valid board positions
// Valid positions are where x, y, z >= 0 and x+y+z <= 5
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

// Shared transform functions used by both Piece and PieceRegistry
function applyMirrorX(offset, mirrorX) {
    return mirrorX ? new Location(offset.x + offset.y, -offset.y, offset.z) : offset;
}

function applyLean(offset, lean) {
    return lean ? new Location(offset.x, 0, offset.y) : offset;
}

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

export class Location {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

export class Atom {
    constructor(x, y, z) {
        this.offset = new Location(x, y, z);
    }
}

export class Piece {
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

    isOutOfBounds() {
        // Optimized: single bitwise operation
        // If any bit in the piece's mask is NOT in the valid board mask, it's out of bounds
        return (this.bitmask & ~validBoardMask) !== 0n;
    }
}

export class PieceRegistry {
    colors = new Map();

    constructor() {
        this.#loadPossiblePositions()
    }

    #loadPossiblePositions() {
        for (let [key, value] of pieceHelper) {
            const positions = this.#loadPositionsForColor(value.ctor);
            this.colors.set(key, {
                allPositions: positions,
                validPositions: positions,
                vposIndex: 0
            })
        }
    }

    #loadPositionsForColor(constr) {
        const toRet = [];
        const seenMasks = new Set(); // Track bitmasks we've already seen - O(1) lookup

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
                            }
                        }
                    }
                }
            }
        }

        return toRet;
    }

    reset() {
        const values = this.colors.values();
        for (let value of values) {
            value.validPositions = value.allPositions;
            value.vposIndex = 0;
        }
    }
}

export class Board {
    boardMap = new Map();
    piecesUsed = new Map();
    pieceRegistry = new PieceRegistry();
    occupancyMask = 0n;

    constructor() {
        this.#initializeBoard();
    }

    #initializeBoard() {
        this.boardMap = new Map();

        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 6; j++) {
                for (let k = 0; k < 6; k++) {
                    const key = i * 36 + j * 6 + k;

                    if (i + j + k < 6) {
                        this.boardMap.set(key, { x: i, y: j, z: k, value: '-' })
                    } else {
                        this.boardMap.set(key, { x: i, y: j, z: k, value: ' ' })
                    }
                }
            }
        }

        this.piecesUsed = new Map();
        this.occupancyMask = 0n;
    }

    getUnusedColors() {
        return [...this.pieceRegistry.colors]
            .filter(([k, v]) => !this.piecesUsed.has(k));
    }

    placePiece(piece) {
        // Single collision check at the start using bitmask
        if (this.collision(piece)) {
            throw new Error("Attempt to add piece in used location");
        }

        const cells = piece.cells;
        for (let i = 0; i < cells.length; i++) {
            const key = cells[i];
            const mapNode = this.boardMap.get(key);
            if (!mapNode) {
                throw new Error(`Invalid board position key ${key} for piece ${piece.character}`);
            }
            mapNode.value = piece.character;
        }
        this.piecesUsed.set(piece.character, piece);
        this.occupancyMask |= piece.bitmask;

        // Automatic constraint propagation - update valid positions for remaining pieces
        this.updateAllValidPositions();
    }

    removePiece(piece) {
        const cells = piece.cells;
        for (let i = 0; i < cells.length; i++) {
            const key = cells[i];
            const mapNode = this.boardMap.get(key);
            if (!mapNode) {
                throw new Error(`Invalid board position key ${key} during remove for piece ${piece.character}`);
            }
            mapNode.value = '-';
        }
        this.piecesUsed.delete(piece.character);
        this.occupancyMask &= ~piece.bitmask;

        // Automatic constraint propagation - update valid positions for remaining pieces
        this.updateAllValidPositions();
    }

    collision(piece) {
        // Optimized: single bitwise AND operation instead of looping
        return (piece.bitmask & this.occupancyMask) !== 0n;
    }

    resetBoard() {
        this.#initializeBoard();
        this.pieceRegistry.reset();
    }

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

        const pieces = unusedColors
            .reduce((min, val) => val[1].validPositions.length < min[1].validPositions.length ? val : min)[1]
            .validPositions;

        if (pieces.length == 0) {
            return false;
        }

        for (let i = 0; i < pieces.length; i++) {
            const pos = pieces[i];
            // No collision check needed - validPositions is kept accurate via constraint propagation
            this.placePiece(pos);
            const s = this.solve();
            if (s == true) {
                return true;
            }
            this.removePiece(pos);
        }

        return false;
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

