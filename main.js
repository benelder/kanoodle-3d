import * as THREE from 'three';
import {OrbitControls}  from 'OrbitControls'
import {Board} from './kanoodle.js'


const board = new Board();
let placingPiece = null;

const btnSolve = document.getElementById("btnSolve");
btnSolve.addEventListener('click', ()=> attemptSolve());

const btnReset = document.getElementById("btnReset");
btnReset.addEventListener('click', ()=> reset());

const ddlX = document.getElementById("ddlX");
ddlX.addEventListener('change', () => filterChanged());
const ddlY = document.getElementById("ddlY");
ddlY.addEventListener('change', () => filterChanged());
const ddlZ = document.getElementById("ddlZ");
ddlZ.addEventListener('change', () => filterChanged());

// add control panel
for(let [key, value] of board.pieceRegistry.colors){
    const controlPanel = document.getElementById("controlPanel");

    const colorContainer = document.createElement('div');
    colorContainer.id = 'colorContainer' + key;

    const lbl = document.createElement('label');
    lbl.id= 'lbl' + key;

    if(board.piecesUsed.has(key)){
        lbl.innerText = key;
    } else{
        lbl.innerText = key + '(' + board.pieceRegistry.colors.get(key).validPositions.length  + ')';
    }

    colorContainer.appendChild(lbl);

    const btnAdd = document.createElement('button');
    btnAdd.innerText = 'Add';
    btnAdd.id = 'btnAdd' + key;
    btnAdd.addEventListener('click', ()=> initiatePlacing(key));    
    colorContainer.appendChild(btnAdd);

    const btnNext = document.createElement('button');
    btnNext.innerText = 'Next';
    btnNext.id = 'btnNext' + key;
    btnNext.style.display = 'none';
    btnNext.addEventListener('click', ()=> placeNextPosition(key));
    colorContainer.appendChild(btnNext);

    const btnPrev = document.createElement('button');
    btnPrev.innerText = 'Prev';
    btnPrev.id = 'btnPrev' + key;
    btnPrev.style.display = 'none';
    btnPrev.addEventListener('click', ()=> placePrevPosition(key));
    colorContainer.appendChild(btnPrev);

    const btnRemove = document.createElement('button');
    btnRemove.innerText = 'Remove';
    btnRemove.id = 'btnRemove' + key;
    btnRemove.style.display = 'none';
    btnRemove.addEventListener('click', ()=> removePiece(key));
    colorContainer.appendChild(btnRemove);

    const btnSet = document.createElement('button');
    btnSet.innerText = 'Set';
    btnSet.id = 'btnSet' + key;
    btnSet.style.display = 'none';
    btnSet.addEventListener('click', ()=> setPiece(key));
    colorContainer.appendChild(btnSet);


    controlPanel.appendChild(colorContainer);
}

// Set up the scene
const scene = new THREE.Scene();
// Set up the camera
//var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, -500, 100 );
camera.position.z = 1;
camera.position.y= 1;
camera.position.x = 1;


// Set up the renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth * 0.70, window.innerHeight * .70);
const rightPanel = document.querySelector('#right-panel');
rightPanel.appendChild(renderer.domElement);

// Set up the controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.enableZoom = true;
controls.enableRotate = true;

// Set up the spheres
const radius = 2;
const distancei = 4;
const distancej = 3.3;
const distancek = 3.3;

drawBoard();


// Add ambient light to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10, 20, 0); // x, y, z
scene.add(dirLight);

// Create an AxesHelper
const axesHelper = new THREE.AxesHelper(50);

// Add the AxesHelper to the scene
scene.add(axesHelper);

function getMaterial(val){
    const s = 100;
    if(val == "A")
        return new THREE.MeshPhongMaterial({ color: 0x7bc149, shininess: s });
    if(val == "B")
        return new THREE.MeshPhongMaterial({ color: 0xdbd11a, shininess: s });
    if(val == "C")
        return new THREE.MeshPhongMaterial({ color: 0x301adb, shininess: s });
    if(val == "D")
        return new THREE.MeshPhongMaterial({ color: 0x1acbdb, shininess: s });
    if(val == "E")
        return new THREE.MeshPhongMaterial({ color: 0xd60a18, shininess: s });
    if(val == "F")
        return new THREE.MeshPhongMaterial({ color: 0xd60a7a, shininess: s });
    if(val == "G")
        return new THREE.MeshPhongMaterial({ color: 0x074c06, shininess: s });
    if(val == "H")
        return new THREE.MeshPhongMaterial({ color: 0xededed, shininess: s });
    if(val == "I")
        return new THREE.MeshPhongMaterial({ color: 0xe25300, shininess: s });
    if(val == "J")
        return new THREE.MeshPhongMaterial({ color: 0xeda1b8, shininess: s });
    if(val == "K")
        return new THREE.MeshPhongMaterial({ color: 0x9b9b9b, shininess: s });
    if(val == "L")
        return new THREE.MeshPhongMaterial({ color: 0x7c26ff, shininess: s });

    return new THREE.MeshPhongMaterial({ color: 0xDDDDDD });
}

function drawBoard(){
    clearBoard();
    const values = board.boardMap.values();
    for(let value of values)
    {
        if(value.value != ' ' && value.value != '-'){
            const geometry = new THREE.SphereGeometry(radius, 32, 32);
            const material = getMaterial(value.value);
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(
                    value.y * distancej  + (value.z),
                    value.z * distancek,
                    value.x * distancei + (value.y + value.z) * 2
            );
            scene.add(sphere);
        }
    }
    updateControlPanel();
}

function updateControlPanel(){

    const btnSolve = document.getElementById('btnSolve');
    btnSolve.disabled = board.piecesUsed.size < 3;
    btnSolve.style.display = 'inline';

    const btnReset = document.getElementById('btnReset');
    btnReset.style.display = 'inline';

    const filters = document.getElementById('filters');
    filters.style.display = 'none';

    
    for(let [key, value] of board.pieceRegistry.colors){

        // reset some controls
        const colorContainer = document.getElementById('colorContainer' + key);
        colorContainer.style.display = 'block';
        const btnAdd = document.getElementById('btnAdd' + key);
        btnAdd.disabled = false;
        

        // are we in placing mode?
        if(placingPiece != null){
            btnReset.style.display = 'none';
            btnSolve.style.display = 'none';
            filters.style.display = 'block';

            if(key !== placingPiece){
                // disable all controls for pieces we are not actively placing
                const colorContainer = document.getElementById('colorContainer' + key);
                colorContainer.style.display = 'none';
            }
            else{
                // actively placing, hide add button
                btnAdd.style.display = 'none';
                // show next, prev, remove, set buttons
                showPlacingButtons(key);
            }
        }
        else{
            // in piece select mode
            ddlX.value = 'All';
            ddlY.value = 'All';
            ddlZ.value = 'All';

            if(board.piecesUsed.has(key)){
                btnAdd.style.display = 'none';
                const btnNext = document.getElementById('btnNext' + key);
                btnNext.style.display = 'none';
                const btnPrev = document.getElementById('btnPrev' + key);
                btnPrev.style.display = 'none';
                const btnRemove = document.getElementById('btnRemove' + key);
                btnRemove.style.display = 'inline';
                const btnSet = document.getElementById('btnSet' + key);
                btnSet.style.display = 'none';
                const lbl = document.getElementById('lbl' + key);
                lbl.innerText = key + ' (placed)';
            }else{
                btnAdd.style.display = 'inline';

                if(value.validPositions.length == 0){
                    btnAdd.disabled = true;
                }

                hidePlacingButtons(key);

                const lbl = document.getElementById('lbl' + key);
                lbl.innerText = key + '(' + board.pieceRegistry.colors.get(key).validPositions.length  + ')';
            }

            // show "Add" button for unused pieces
        }
    }
}

function showPlacingButtons(key){
    const btnNext = document.getElementById('btnNext' + key);
    btnNext.style.display = 'inline';
    const btnPrev = document.getElementById('btnPrev' + key);
    btnPrev.style.display = 'inline';
    const btnRemove = document.getElementById('btnRemove' + key);
    btnRemove.style.display = 'inline';
    const btnSet = document.getElementById('btnSet' + key);
    btnSet.style.display = 'inline';
}

function hidePlacingButtons(key){
    const btnNext = document.getElementById('btnNext' + key);
    btnNext.style.display = 'none';
    const btnPrev = document.getElementById('btnPrev' + key);
    btnPrev.style.display = 'none';
    const btnRemove = document.getElementById('btnRemove' + key);
    btnRemove.style.display = 'none';
    const btnSet = document.getElementById('btnSet' + key);
    btnSet.style.display = 'none';
}



function clearBoard(){
    for( var i = scene.children.length - 1; i >= 0; i--) { 
        let obj = scene.children[i];
        if(scene.children[i].type === 'Mesh'){
            scene.remove(obj); 
        }
   }
}

// Render the scene
function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update(); // Update the controls
}




function removePiece(char){
    const usedPiece = board.piecesUsed.get(char);
    const color = board.pieceRegistry.colors.get(char);

    if(usedPiece === undefined){
        throw new Error('That piece is not used');
    }
    board.removePiece(usedPiece);
    color.vposIndex = 0;
    placingPiece = null;
    updateAllValidPositions();
    drawBoard();
}

function setPiece(char){
    const color = board.pieceRegistry.colors.get(char);
    color.vposIndex = 0;
    placingPiece = null;
    updateAllValidPositions();
    drawBoard();
}

function initiatePlacing(i){
    const usedPiece = board.piecesUsed.get(i);
    const color = board.pieceRegistry.colors.get(i);

    if(usedPiece !== undefined){
        throw new Error('That piece is already used');
    }

    let positions = color.validPositions;

    if(ddlX.value != "All" || ddlY.value != "All" || ddlZ.value != "All"){
        const x = ddlX.value == "All" ? null : Number(ddlX.value);
        const y = ddlY.value == "All" ? null : Number(ddlY.value);
        const z = ddlZ.value == "All" ? null : Number(ddlZ.value);
        positions = positions.filter(m=> m.usesLocation(x, y, z));
    }

    if(positions.length == 0){
        return false;
    }

    const lbl = document.getElementById('lbl' + i);
    lbl.innerText = i + '(' + positions.length  + ')';

    color.vposIndex = 0;

    board.placePiece(positions[color.vposIndex]);

    placingPiece = i;

    drawBoard();

    return true;
}

function placeNextPosition(i){
    const usedPiece = board.piecesUsed.get(i);
    const color = board.pieceRegistry.colors.get(i);

    if(usedPiece !== undefined){
        board.removePiece(usedPiece);
    }

    let positions = color.validPositions;

    if(ddlX.value != "All" || ddlY.value != "All" || ddlZ.value != "All"){
        const x = ddlX.value == "All" ? null : Number(ddlX.value);
        const y = ddlY.value == "All" ? null : Number(ddlY.value);
        const z = ddlZ.value == "All" ? null : Number(ddlZ.value);
        positions = positions.filter(m=> m.usesLocation(x, y, z));
    }

    color.vposIndex++;

    if(color.vposIndex >= positions.length){
        color.vposIndex = 0;
    }

    board.placePiece(positions[color.vposIndex]);
    drawBoard();
}

function placePrevPosition(i){
    const usedPiece = board.piecesUsed.get(i);
    const color = board.pieceRegistry.colors.get(i);

    if(usedPiece !== undefined){
        board.removePiece(usedPiece);
    }

    let positions = color.validPositions;

    if(ddlX.value != "All" || ddlY.value != "All" || ddlZ.value != "All"){
        const x = ddlX.value == "All" ? null : Number(ddlX.value);
        const y = ddlY.value == "All" ? null : Number(ddlY.value);
        const z = ddlZ.value == "All" ? null : Number(ddlZ.value);
        positions = positions.filter(m=> m.usesLocation(x, y, z));
    }

    color.vposIndex--;

    if(color.vposIndex < 0){
        color.vposIndex = positions.length - 1;
    }
    board.placePiece(positions[color.vposIndex]);
    drawBoard();
}

function updateAllValidPositions(){
    for(let [key, value] of board.pieceRegistry.colors){
        if(board.piecesUsed.has(key)){
            continue; // only updating valid positions indexes of pieces that have not been used
        }
        else{
            value.validPositions = [];
            for (let i = 0; i < value.allPositions.length; i++) {
                const piece = value.allPositions[i];
                if(!board.collision(piece)){
                    value.validPositions.push(piece);
                }
            }
        }
    }
}



function filterChanged(){
    const i = placingPiece;
    const usedPiece = board.piecesUsed.get(placingPiece);
    const color = board.pieceRegistry.colors.get(placingPiece);
    // remove placingPiece
    if(usedPiece != undefined){
        board.removePiece(usedPiece);
    }
    color.vposIndex = 0;
    drawBoard();

    var positionsExist = initiatePlacing(i);

    if(!positionsExist){
        hidePlacingButtons(i);
    }else{
        showPlacingButtons(i);
    }
    //update count of validPositions
}

function attemptSolve(){
    const success = board.solve();
    if(success){
        console.log("Successfully solved");
    } else{
        console.log("Unsuccessful solve attempt - there are no valid solutions");
    }
    drawBoard();
}

function reset(){
    board.resetBoard();
    drawBoard();
}

render();
