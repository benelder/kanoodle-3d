import * as THREE from 'three';
import {OrbitControls}  from 'OrbitControls'
import {Board} from './kanoodle.js'


let board = new Board();

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
        const colorContainer = document.getElementById('colorContainer' + key);
        colorContainer.style.display = 'block';
        // are we in placing mode?
        if(placingPiece != null){
            if(key !== placingPiece){
                // disable all controls for pieces we are not actively placing
                const colorContainer = document.getElementById('colorContainer' + key);
                colorContainer.style.display = 'none';
            }
            else{
                // hide add button
                const btnAdd = document.getElementById('btnAdd' + key);
                btnAdd.style.display = 'none';
                // show next, prev, remove, set buttons
                const btnNext = document.getElementById('btnNext' + key);
                btnNext.style.display = 'inline';
                const btnPrev = document.getElementById('btnPrev' + key);
                btnPrev.style.display = 'inline';
                const btnRemove = document.getElementById('btnRemove' + key);
                btnRemove.style.display = 'inline';
                const btnSet = document.getElementById('btnSet' + key);
                btnSet.style.display = 'inline';
            }
        }
        else{
            // in piece select mode

            if(board.piecesUsed.has(key)){
                const btnAdd = document.getElementById('btnAdd' + key);
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
                const btnAdd = document.getElementById('btnAdd' + key);
                btnAdd.style.display = 'inline';
                const btnNext = document.getElementById('btnNext' + key);
                btnNext.style.display = 'none';
                const btnPrev = document.getElementById('btnPrev' + key);
                btnPrev.style.display = 'none';
                const btnRemove = document.getElementById('btnRemove' + key);
                btnRemove.style.display = 'none';
                const btnSet = document.getElementById('btnSet' + key);
                btnSet.style.display = 'none';
                const lbl = document.getElementById('lbl' + key);
                lbl.innerText = key + '(' + board.pieceRegistry.colors.get(key).validPositions.length  + ')';
            }

            // show "Add" button for unused pieces
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




function removePiece(char){
    let usedPiece = board.piecesUsed.get(char);
    let color = board.pieceRegistry.colors.get(char);

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
    let color = board.pieceRegistry.colors.get(char);
    color.vposIndex = 0;
    placingPiece = null;
    updateAllValidPositions();
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

render();
