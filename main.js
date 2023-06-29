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
    colorContainer.className = 'color-container';

    const lbl = document.createElement('label');
    lbl.classList.add('color-label');
    lbl.id= 'lbl' + key;

    if(board.piecesUsed.has(key)){
        lbl.innerText = key;
    } else{
        lbl.innerText = key + '(' + board.pieceRegistry.colors.get(key).validPositions.length  + ')';
    }

    colorContainer.appendChild(lbl);

    colorContainer.appendChild(createButton('Add', key, 'btn-primary', ()=> initiatePlacing(key)));
    colorContainer.appendChild(createButton('Prev', key, 'btn-primary', ()=> placePrevPosition(key)));
    colorContainer.appendChild(createButton('Cut', key, 'btn-danger', ()=> removePiece(key)));
    colorContainer.appendChild(createButton('Set', key, 'btn-success', ()=> setPiece(key)));
    colorContainer.appendChild(createButton('Next', key, 'btn-primary', ()=> placeNextPosition(key)));


    controlPanel.appendChild(colorContainer);
}

function createButton(name, key, className, clickHandler){
    const btnAdd = document.createElement('button');
    btnAdd.innerText = name;
    btnAdd.id = 'btn' + name + key;
    btnAdd.classList.add('btn');
    btnAdd.classList.add(className);
    btnAdd.classList.add('btn-sm');
    btnAdd.addEventListener('click', clickHandler);    
    return btnAdd;
}

// Set up the scene
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
const mainPanel = document.querySelector('#main-panel');

// Set up the camera
const camera = new THREE.OrthographicCamera( window.innerWidth / - 16, window.innerWidth / 16, window.innerHeight / 16, window.innerHeight / - 16, -500, 100 );
camera.position.set(1, 1, 1);
// Set up the renderer
renderer.setSize(window.innerWidth, window.innerHeight);

mainPanel.appendChild(renderer.domElement);

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

// Add ambient light to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10, 20, 0); // x, y, z
scene.add(dirLight);

// Create an AxesHelper
//scene.add(new THREE.GridHelper(80, 20));
scene.add(new THREE.AxesHelper(50));

function getMaterial(val){
    const s = 100;

    switch (val) {
        case 'A': 
            return new THREE.MeshPhongMaterial({ color: 0x7bc149, shininess: s });
        case 'B':
            return new THREE.MeshPhongMaterial({ color: 0xdbd11a, shininess: s });   
        case 'C':
            return new THREE.MeshPhongMaterial({ color: 0x301adb, shininess: s });
        case 'D': 
            return new THREE.MeshPhongMaterial({ color: 0x1acbdb, shininess: s });
        case 'E':
            return new THREE.MeshPhongMaterial({ color: 0xd60a18, shininess: s });
        case 'F':
            return new THREE.MeshPhongMaterial({ color: 0xd60a7a, shininess: s });
        case 'G':
            return new THREE.MeshPhongMaterial({ color: 0x074c06, shininess: s });
        case 'H':
            return new THREE.MeshPhongMaterial({ color: 0xededed, shininess: s });
        case 'I':
            return new THREE.MeshPhongMaterial({ color: 0xe25300, shininess: s });
        case 'J':
            return new THREE.MeshPhongMaterial({ color: 0xeda1b8, shininess: s });
        case 'K':
            return new THREE.MeshPhongMaterial({ color: 0x9b9b9b, shininess: s });
        case 'L':
            return new THREE.MeshPhongMaterial({ color: 0x7c26ff, shininess: s });
        default:
            return new THREE.MeshPhongMaterial({ color: 0xDDDDDD });
    }
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

    const lblNoSolution = document.getElementById('lblNoSolution');
    lblNoSolution.style.display = 'none';

    
    for(let [key, value] of board.pieceRegistry.colors){

        // reset some controls
        const colorContainer = document.getElementById('colorContainer' + key);
        colorContainer.classList.add('select-mode');
        colorContainer.classList.remove('place-mode');
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
                colorContainer.classList.remove('select-mode');
                colorContainer.classList.add('place-mode');
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
                const btnCut = document.getElementById('btnCut' + key);
                btnCut.style.display = 'inline';
                const btnSet = document.getElementById('btnSet' + key);
                btnSet.style.display = 'none';
                const lbl = document.getElementById('lbl' + key);
                lbl.innerText = key + ' (---)';
            }else{
                btnAdd.style.display = 'inline';

                if(value.validPositions.length == 0){
                    btnAdd.disabled = true;
                }

                hidePlacingButtons(key);

                const lbl = document.getElementById('lbl' + key);
                lbl.innerText = key + '(' + board.pieceRegistry.colors.get(key).validPositions.length  + ')';
            }
        }
    }
}

function showPlacingButtons(key){
    const btnNext = document.getElementById('btnNext' + key);
    btnNext.style.display = 'inline';
    const btnPrev = document.getElementById('btnPrev' + key);
    btnPrev.style.display = 'inline';
    const btnCut = document.getElementById('btnCut' + key);
    btnCut.style.display = 'inline';
    const btnSet = document.getElementById('btnSet' + key);
    btnSet.style.display = 'inline';
}

function hidePlacingButtons(key){
    const btnNext = document.getElementById('btnNext' + key);
    btnNext.style.display = 'none';
    const btnPrev = document.getElementById('btnPrev' + key);
    btnPrev.style.display = 'none';
    const btnCut = document.getElementById('btnCut' + key);
    btnCut.style.display = 'none';
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
    board.updateAllValidPositions();
    drawBoard();
}

function setPiece(char){
    const color = board.pieceRegistry.colors.get(char);
    color.vposIndex = 0;
    placingPiece = null;
    board.updateAllValidPositions();
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
    updatePieceDetailsPanel(positions[color.vposIndex]);
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
    updatePieceDetailsPanel(positions[color.vposIndex]);
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
    updatePieceDetailsPanel(positions[color.vposIndex]);
    drawBoard();
}

function updatePieceDetailsPanel(position){
    const lblPieceName = document.getElementById('lblPieceName');
    lblPieceName.innerText = "Name: " + position.name + '(' + position.character + ")";
    const lblRootPosition = document.getElementById('lblRootPosition');
    lblRootPosition.innerText = "Root: [" + position.rootPosition.x + ", " + position.rootPosition.y + ", " + position.rootPosition.z + "]";
    const lblRotation = document.getElementById('lblRotation');
    lblRotation.innerText = "Rotation: " + position.rotation;
    const lblLean = document.getElementById('lblLean');
    lblLean.innerText = "Lean: " + position.lean;
    const lblTranspose = document.getElementById('lblTranspose');
    lblTranspose.innerText = "Transpose Plane: " + position.plane;
    const lblMirror = document.getElementById('lblMirror');
    lblMirror.innerText = "Mirror X: " + position.mirrorX;
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
}

function attemptSolve(){
    const success = board.solve();
    if(success){
        console.log("Successfully solved");
        drawBoard();
    } else{
        const lbl = document.getElementById('lblNoSolution');
        lbl.style.display = 'inline';
    }
}

function reset(){
    board.resetBoard();
    drawBoard();
}

drawBoard();
render();
