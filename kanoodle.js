
class Location{
    constructor(x, y, z){
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

class Atom{
    constructor(x, y, z){
        this.offset = new Location(x, y, z);
    }
}

class Piece{
    constructor(rootPosition, rotation, plane, nodes, name, charater){
        this.rootPosition = rootPosition;
        this.rotation = rotation;
        this.plane = plane;
        this.nodes = nodes;
        this.name = name;
        this.charater = charater;
    }
    mirrorX;
    lean;

    #applyLean(offset){
        if(this.lean){
            return new Location(offset.x, 0, offset.y);
        } else{
            return offset;
        }
    }

    #applyMirrorX(offset){
        return new Location(offset.x + offset.y, -offset.y, offset.z);
    }

    #transposeToPlane(origin){
        if(this.plane == 0){
            return origin;
        }else if(this.plane == 1){
            return new Location(5-(origin.x + origin.y + origin.z), origin.x, origin.z);
        }else if(this.plane == 2){
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
        if(abs.some((m) => m.offset.z < 0)){
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

class PieceRegistry{
    darkBluePositions = [];

    
}

class Board{
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
                        BoardMap.push(new { x=i, y=j, z=k, value = '-' }) ;
                    } else{
                        BoardMap.push(new { x=i, y=j, z=k, value = ' ' }) ;
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


}

class DarkBlue extends Piece{
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

let b = new DarkBlue();
b.rootPosition = new Location(0,1,0);
b.rotation = 3;
b.lean = true;
let x = b.getAbsolutePosition();
console.log(x);