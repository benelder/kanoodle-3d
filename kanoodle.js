
export class Location{
    constructor(x, y, z){
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

export class Atom{
    constructor(x, y, z){
        this.offset = new Location(x, y, z);
    }
}

export class Piece{
    constructor(rootPosition, rotation, plane, nodes, name, character){
        this.rootPosition = rootPosition;
        this.rotation = rotation;
        this.plane = plane;
        this.nodes = nodes;
        this.name = name;
        this.character = character;
    }
    mirrorX;
    lean;

    #applyLean(offset){
        if(this.lean === true){
            return new Location(offset.x, 0, offset.y);
        } else{
            return offset;
        }
    }

    #applyMirrorX(offset){
        return new Location(offset.x + offset.y, -offset.y, offset.z);
    }

    #transposeToPlane(origin){
        if(this.plane === 0){
            return origin;
        }else if(this.plane === 1){
            return new Location(5-(origin.x + origin.y + origin.z), origin.x, origin.z);
        }else if(this.plane === 2){
            return new Location(origin.y, 5 - (origin.x + origin.y + origin.z), origin.z);
        }
        
        throw new Error('Plane must be between 0 and 2');
    }

    #rotate(location){
        if(this.rotation == 0){
            return location;
        }

        if(this.rotation > 5){
            throw new Error('Invalid rotation');
        }

        let toRet = new Location(location.x, location.y, location.z);

        for (let i = 0; i < this.rotation; i++) {
            toRet = new Location(-toRet.y, toRet.x + toRet.y, toRet.z);
        }

        return toRet;
    }

    getAbsolutePosition(){
        var toRet = [];

        for (let i = 0; i < this.nodes.length; i++) {
            let start = (this.mirrorX ? this.#applyMirrorX(this.nodes[i].offset) : this.nodes[i].offset);
            let offset = this.#rotate(start);
            let lean = this.#applyLean(offset);
            let origin = new Location(this.rootPosition.x + lean.x,
                this.rootPosition.y + lean.y,
                this.rootPosition.z + lean.z);
            var transpose = this.#transposeToPlane(origin);            
            toRet.push(new Atom(transpose.x, transpose.y, transpose.z));        
        }

        return toRet;
    }

    isOutOfBounds(){
        let abs = this.getAbsolutePosition();

        if(abs.some((m) => m.offset.z < 0)){
            return true;
        }
        if(abs.some((m) => m.offset.x < 0)){
            return true;
        }
        if(abs.some((m) => m.offset.y < 0)){
            return true;
        }   
        if(abs.some((m) => m.offset.x + m.offset.y + m.offset.z > 5)){
            return true;
        }

        return false;
    }

    isInSamePositionAs(piece){
        if(piece.nodes.length != this.nodes.length){
            return false;
        }

        let t = this.getAbsolutePosition();
        let p = piece.getAbsolutePosition();

        for (let i = 0; i < t.length; i++) {
            let nodeMatch = false;
            for (let j = 0; j < p.length; j++) {
                if(t[i].offset === p[j].offset){
                    nodeMatch = true;
                    break;
                }                
            }
            if(!nodeMatch){
                return false;
            }
        }

        return true;
    }
}

export class PieceRegistry{
    darkBluePositions = [];
    colors = [];

    constructor(){
        this.#loadPossiblePositions()
    }

    #loadPossiblePositions(){
        this.darkBluePositions = this.#loadPositionsForColor(function(){return new DarkBlue();});

        this.colors['C'] = this.darkBluePositions;
    }

    #loadPositionsForColor(constr){
        var toRet = [];

        for (let z = 0; z < 6; z++) // for each root position
        {
            for (let y = 0; y < 6; y++) // for each root position
            {
                for (let x = 0; x < 6; x++) // for each root position
                {
                    if (x + y + z > 5) // will be out of bounds
                        continue;

                    for (let r = 0; r < 6; r++) // for each rotated position
                    {
                        for (let p = 0; p < 3; p++) // for each plane
                        {
                            let piece = constr();
                            piece.rootPosition = new Location(x,y,z);
                            piece.plane = p;
                            piece.rotation = r;
                            piece.lean = false;
                            piece.mirrorX = false;

                            if (piece.isOutOfBounds() === false)
                            {
                                if (toRet.some(m => m.isInSamePositionAs(piece)) === false)
                                {
                                    toRet.push(piece);
                                }
                            }

                            piece = constr();
                            piece.rootPosition = new Location(x,y,z);
                            piece.plane = p;
                            piece.rotation = r;
                            piece.lean = true;
                            piece.mirrorX = false;

                            if (piece.isOutOfBounds() === false)
                            {
                                if (toRet.some(m => m.isInSamePositionAs(piece)) === false)
                                {
                                    toRet.push(piece);
                                }
                            }


                            // flip x
                            piece = constr();
                            piece.rootPosition = new Location(x,y,z);
                            piece.plane = p;
                            piece.rotation = r;
                            piece.lean = false;
                            piece.mirrorX = true;

                            if (piece.isOutOfBounds() === false)
                            {
                                if (toRet.some(m => m.isInSamePositionAs(piece)) === false)
                                {
                                    toRet.push(piece);
                                }
                            }

                            piece = new constr();
                            piece.rootPosition = new Location(x,y,z);
                            piece.plane = p;
                            piece.rotation = r;
                            piece.lean = true;
                            piece.mirrorX = true;

                            if (piece.isOutOfBounds() === false)
                            {
                                if (toRet.some(m => m.isInSamePositionAs(piece)) === false)
                                {
                                    toRet.push(piece);
                                }
                            }
                        }
                    }
                }
            }
        }

        return toRet;
    }
}

export class Board{
    boardMap = [];
    usedLocations = [];
    piecesUsed = [];
    pieceRegistry = new PieceRegistry();

    constructor(){
        this.initializeBoard();
    }

    initializeBoard(){
        this.boardMap = [];

        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 6; j++) {
                for (let k = 0; k < 6; k++) {
                    
                    if (i + j + k < 6){
                        this.boardMap.push({ x: i, y: j, z: k, value : '-' }) ;
                    } else{
                        this.boardMap.push({ x:i, y:j, z:k, value : ' ' }) ;
                    }
                }                
            }            
        }

        this.piecesUsed = [];
        this.usedLocations = [];
    }

    isPieceUsed(key){
        return key in piecesUsed;
    }

    getUnusedColors(){
        return this.pieceRegistry.colors.filter(m=> !(this.isPieceUsed(m.key)))
    }

    placePiece(piece){
        try {
            let abs = piece.getAbsolutePosition();
            for (let i = 0; i < abs.length; i++) {
                let mapNode = this.boardMap.find(m=> m.x === abs[i].offset.x && m.y === abs[i].offset.y && m.z === abs[i].offset.z);
                if(mapNode.value != '-'){
                    throw new Error("Attempt to add piece in used location");
                }
                mapNode.value = piece.character;
                this.usedLocations.push(abs[i].offset);
            }
            this.piecesUsed[piece.character] = piece;
        } catch (error) {
            this.removePiece(piece);
            throw new Error('Error placing piece');
        }
    }

    removePiece(piece){
        let abs = piece.getAbsolutePosition();
        for (let i = 0; i < abs.length; i++) {
            let mapNode = this.boardMap.find(m=> m.x === abs[i].offset.x && m.y === abs[i].offset.y && m.z === abs[i].offset.z);
            mapNode.value = '-';
            let temp = [];
            for (let j = 0; j < this.usedLocations.length; j++) {
                let loc = this.usedLocations[j];
                if(loc.x === mapNode.x && loc.y === mapNode.y && loc.z === mapNode.z){
                    continue;
                } else{
                    temp.push(loc);
                }                
            }
            this.usedLocations = temp;
        }
        delete this.piecesUsed[piece.character]; 
    }
}

export class DarkBlue extends Piece{
    constructor(){
        const nodes = [ 
            new Atom(0,0,0), 
            new Atom(1,0,0),
            new Atom(2,0,0),
            new Atom(2,1,0),
            new Atom(2,2,0)];
        super(new Location(0,0,0), 0, 0, nodes, 'DarkBlue', 'C');
    }
}

