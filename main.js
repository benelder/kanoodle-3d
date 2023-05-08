import * as THREE from 'three';
import {OrbitControls}  from 'OrbitControls'
import {Board} from './kanoodle.js'

let placingPiece = null;

// Set up the scene
var scene = new THREE.Scene();

// Set up the camera
//var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
var camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, -500, 100 );
camera.position.z = 1;
camera.position.y= 1;
camera.position.x = 1;


// Set up the renderer
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth * 0.70, window.innerHeight * .70);
const rightPanel = document.querySelector('#right-panel');
rightPanel.appendChild(renderer.domElement);

// Set up the controls
var controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.enableZoom = true;
controls.enableRotate = true;

// Set up the spheres
var radius = 2;
var distancei = 4;
var distancej = 3.3;
var distancek = 3.3;
var spheres = [];

let board = new Board();

// Set up the material with gray color
drawBoard();


// Add ambient light to the scene
var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10, 20, 0); // x, y, z
scene.add(dirLight);

// Create an AxesHelper
var axesHelper = new THREE.AxesHelper(50);

// Add the AxesHelper to the scene
scene.add(axesHelper);

function getMaterial(val){
    if(val == "A")
        return new THREE.MeshLambertMaterial({ color: 0x7bc149 });
    if(val == "B")
        return new THREE.MeshLambertMaterial({ color: 0xdbd11a });
    if(val == "C")
        return new THREE.MeshLambertMaterial({ color: 0x301adb });
    if(val == "D")
        return new THREE.MeshLambertMaterial({ color: 0x1acbdb });
    if(val == "E")
        return new THREE.MeshLambertMaterial({ color: 0xd60a18 });
    if(val == "F")
        return new THREE.MeshLambertMaterial({ color: 0xd60a7a });
    if(val == "G")
        return new THREE.MeshLambertMaterial({ color: 0x074c06 });
    if(val == "H")
        return new THREE.MeshLambertMaterial({ color: 0xededed });
    if(val == "I")
        return new THREE.MeshLambertMaterial({ color: 0xe25300 });
    if(val == "J")
        return new THREE.MeshLambertMaterial({ color: 0xeda1b8 });
    if(val == "K")
        return new THREE.MeshLambertMaterial({ color: 0x9b9b9b });
    if(val == "L")
        return new THREE.MeshLambertMaterial({ color: 0x7c26ff });

    return new THREE.MeshLambertMaterial({ color: 0xDDDDDD });
}

function drawBoard(){
    clearBoard();
    for(let [key, value] of board.boardMap)
    {
        var node = board.boardMap.get(key);
        if(node.value != ' ' && node.value != '-'){
            var geometry = new THREE.SphereGeometry(radius, 32, 32);
            var material = getMaterial(node.value);
            var sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(
                    node.y * distancej  + (node.z),
                    node.z * distancek,
                    node.x * distancei + (node.y+node.z) * 2
            );
            scene.add(sphere);
        }
    }
    updateControlPanel();
}

function updateControlPanel(){
    // var btnAddC = document.getElementById('btnAddC');
    // var btnRemoveC = document.getElementById('btnRemoveC');
    // var btnNextC = document.getElementById('btnNextC');
    // var btnPrevC = document.getElementById('btnPrevC');

    // btnAddC.disabled = board.piecesUsed.has('C');
    // btnRemoveC.disabled = !board.piecesUsed.has('C');
    // btnNextC.disabled = !board.piecesUsed.has('C');
    // btnPrevC.disabled = !board.piecesUsed.has('C');
    
    for(let [key, value] of board.pieceRegistry.colors){
        // are we in placing mode?
        if(placingPiece != null){
            if(key !== placingPiece){
                // disable controls for pieces we are not actively placing
                const colorContainer = document.getElementById('colorContainer' + key);
                colorContainer.style.display = 'none';
            }
            else{
                // hide add button
                const btnAdd = document.getElementById('btnAdd' + key);
                btnAdd.style.display = 'none';
                // show next, prev, remove buttons
                const btnNext = document.getElementById('btnNext' + key);
                btnNext.style.display = 'inline';
                const btnPrev = document.getElementById('btnPrev' + key);
                btnPrev.style.display = 'inline';
                const btnRemove = document.getElementById('btnRemove' + key);
                btnRemove.style.display = 'inline';
            }
        }
        else{

        }
    }

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


for(let [key, value] of board.pieceRegistry.colors){
    const controlPanel = document.getElementById("controlPanel");

    const colorContainer = document.createElement('div');
    colorContainer.id = 'colorContainer' + key;

    const lbl = document.createElement('label');
    lbl.innerText = key;
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


    controlPanel.appendChild(colorContainer);
}

// var btnAddC = document.getElementById('btnAddC');
// var btnPrevC = document.getElementById('btnPrevC');
// var btnNextC = document.getElementById('btnNextC');
// var btnRemoveC = document.getElementById('btnRemoveC');
// btnAddC.addEventListener("click", placeNextPosition('C'));
// btnNextC.addEventListener("click", placeNextPosition('C'));
// btnPrevC.addEventListener("click", placePrevPosition);
// btnRemoveC.addEventListener("click", ()=> removePiece('C'));

function removePiece(char){
    let usedPiece = board.piecesUsed.get(char);
    let color = board.pieceRegistry.colors.get(i);

    if(usedPiece === undefined){
        throw new Error('That piece is not used');
    }
    board.removePiece(usedPiece);
    color.vposIndex = -1;
    drawBoard();
}

function initiatePlacing(i){
    let usedPiece = board.piecesUsed.get(i);
    let color = board.pieceRegistry.colors.get(i);

    if(usedPiece !== undefined){
        throw new Error('That piece is already used');
    }

    if(color.validPositions.length == 0){
        throw new Error('No valid positions exist for that color');
    }

    color.vposIndex = 0;

    board.placePiece(color.validPositions[color.vposIndex]);

    placingPiece = i;

    drawBoard();
}

function placeNextPosition(i){
    let usedPiece = board.piecesUsed.get(i);
    let color = board.pieceRegistry.colors.get(i);

    if(usedPiece !== undefined){
        board.removePiece(usedPiece);
    }

    color.vposIndex++;

    if(color.vposIndex > color.validPositions.length){
        color.vposIndex = 0;
    }
    board.placePiece(color.validPositions[color.vposIndex]);
    drawBoard();
}

function placePrevPosition(i){
    let usedPiece = board.piecesUsed.get(i);
    let color = board.pieceRegistry.colors.get(i);

    if(usedPiece !== undefined){
        board.removePiece(usedPiece);
    }

    color.vposIndex--;

    if(color.vposIndex < 0){
        color.vposIndex = color.validPositions.length;
    }
    board.placePiece(color.validPositions[color.vposIndex]);
    drawBoard();
}


render();
