import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls'
import { Board } from './kanoodle.js'

// Constants
const BOARD_SIZE = 6;
const BOARD_MAX_SUM = 5;
const SPHERE_RADIUS = 5;
const SPHERE_SEGMENTS = 32;
const MATERIAL_SHININESS = 100;
const POSITION_MULTIPLIER_X = 36;
const POSITION_MULTIPLIER_Y = 6;

const board = new Board();
let placingPiece = null;
let showEmptyCells = false;
let emptyCellMeshes = [];
let emptyCellOpacity = 0.2;

const btnSolve = document.getElementById("btnSolve");
btnSolve.addEventListener('click', () => attemptSolve());

const btnReset = document.getElementById("btnReset");
btnReset.addEventListener('click', () => reset());

const btnToggleEmptyCells = document.getElementById("btnToggleEmptyCells");
btnToggleEmptyCells.addEventListener('click', () => toggleEmptyCells());

const sliderEmptyCellOpacity = document.getElementById("sliderEmptyCellOpacity");
const lblEmptyCellOpacity = document.getElementById("lblEmptyCellOpacity");
lblEmptyCellOpacity.innerText = emptyCellOpacity.toFixed(2);
sliderEmptyCellOpacity.addEventListener('input', () => updateEmptyCellOpacity());

// Initialize filter dropdowns
const filterDropdowns = [
    'ddlX', 'ddlY', 'ddlZ', 'ddlRotation', 'ddlLean',
    'ddlPlane', 'ddlMirrorX', 'ddlRootX', 'ddlRootY', 'ddlRootZ'
];
const filterControls = {};
filterDropdowns.forEach(id => {
    filterControls[id] = document.getElementById(id);
    filterControls[id].addEventListener('change', () => filterChanged());
});
const { ddlX, ddlY, ddlZ, ddlRotation, ddlLean, ddlPlane, ddlMirrorX, ddlRootX, ddlRootY, ddlRootZ } = filterControls;

// add control panel
const colorControls = document.getElementById("colorControls");
for (let [key, value] of board.pieceRegistry.colors) {
    const colorContainer = document.createElement('div');
    colorContainer.id = 'colorContainer' + key;
    colorContainer.className = 'color-container';

    const lbl = document.createElement('label');
    lbl.classList.add('color-label');
    lbl.id = 'lbl' + key;

    if (board.piecesUsed.has(key)) {
        lbl.innerText = key;
    } else {
        lbl.innerText = key + '(' + value.validPositions.length + ')';
    }

    colorContainer.appendChild(lbl);

    colorContainer.appendChild(createButton('Add', key, 'btn-primary', () => initiatePlacing(key)));
    colorContainer.appendChild(createButton('Prev', key, 'btn-primary', () => placePrevPosition(key)));
    colorContainer.appendChild(createButton('Cut', key, 'btn-danger', () => removePiece(key)));
    colorContainer.appendChild(createButton('Set', key, 'btn-success', () => setPiece(key)));
    colorContainer.appendChild(createButton('Next', key, 'btn-primary', () => placeNextPosition(key)));

    colorControls.appendChild(colorContainer);
}

function createButton(name, key, className, clickHandler) {
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
const camera = new THREE.OrthographicCamera(window.innerWidth / - 16, window.innerWidth / 16, window.innerHeight / 16, window.innerHeight / - 16, -500, 100);
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
// For hexagonal close packing in triangular coordinate system:
// - Adjacent spheres are exactly 2 * radius apart
// - In hexagonal grid: cos(60°) = 0.5, sin(60°) = √3/2
// - For triangular coordinates: each step is 2*radius, but offsets account for 60° angles
const sqrt3 = Math.sqrt(3);
const distancei = 2 * SPHERE_RADIUS;      // Spacing along x direction (maps to Z coordinate)
const distancej = sqrt3 * SPHERE_RADIUS;  // Spacing along y direction (maps to X coordinate) = 2r * sin(60°)
const distancek = sqrt3 * SPHERE_RADIUS;  // Spacing along z direction (maps to Y coordinate) = 2r * sin(60°)

// Add ambient light to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10, 20, 0); // x, y, z
scene.add(dirLight);

// Create an AxesHelper
//scene.add(new THREE.GridHelper(80, 20));
scene.add(new THREE.AxesHelper(50));

function getMaterial(val) {
    const colorMap = {
        'A': 0x7bc149, 'B': 0xdbd11a, 'C': 0x301adb, 'D': 0x1acbdb,
        'E': 0xd60a18, 'F': 0xd60a7a, 'G': 0x074c06, 'H': 0xededed,
        'I': 0xe25300, 'J': 0xeda1b8, 'K': 0x9b9b9b, 'L': 0x7c26ff
    };
    const color = colorMap[val] || 0xDDDDDD;
    return new THREE.MeshPhongMaterial({
        color,
        shininess: colorMap[val] ? MATERIAL_SHININESS : undefined
    });
}

function drawBoard() {
    clearBoard();
    // Iterate over placed pieces and draw their positions
    for (const piece of board.piecesUsed.values()) {
        const material = getMaterial(piece.character);
        for (const atom of piece.absolutePosition) {
            const sphere = createSphere(material, atom.offset.x, atom.offset.y, atom.offset.z);
            scene.add(sphere);
        }
    }
    drawEmptyCells();
    updateControlPanel();
}

function resetAllFilters() {
    filterDropdowns.forEach(id => {
        filterControls[id].value = 'All';
    });
}

function updateControlPanel() {
    const btnSolve = document.getElementById('btnSolve');
    btnSolve.disabled = board.piecesUsed.size < 3;
    btnSolve.style.display = 'inline';

    const btnReset = document.getElementById('btnReset');
    btnReset.style.display = 'inline';

    const filters = document.getElementById('filters');
    filters.style.display = 'none';

    const lblNoSolution = document.getElementById('lblNoSolution');
    lblNoSolution.style.display = 'none';

    for (let [key, value] of board.pieceRegistry.colors) {
        const colorContainer = document.getElementById('colorContainer' + key);
        const btnAdd = document.getElementById('btnAdd' + key);
        const lbl = document.getElementById('lbl' + key);

        // Reset controls
        colorContainer.classList.add('select-mode');
        colorContainer.classList.remove('place-mode');
        btnAdd.disabled = false;

        // Are we in placing mode?
        if (placingPiece != null) {
            btnReset.style.display = 'none';
            btnSolve.style.display = 'none';
            filters.style.display = 'block';

            if (key !== placingPiece) {
                colorContainer.classList.remove('select-mode');
                colorContainer.classList.add('place-mode');
            } else {
                btnAdd.style.display = 'none';
                showPlacingButtons(key);
            }
        } else {
            // In piece select mode
            resetAllFilters();

            if (board.piecesUsed.has(key)) {
                btnAdd.style.display = 'none';
                hidePlacingButtons(key);
                const btnCut = document.getElementById('btnCut' + key);
                btnCut.style.display = 'inline';
                lbl.innerText = key + ' (---)';
            } else {
                btnAdd.style.display = 'inline';
                btnAdd.disabled = value.validPositions.length === 0;
                hidePlacingButtons(key);
                lbl.innerText = key + '(' + value.validPositions.length + ')';
            }
        }
    }
}

function setButtonVisibility(key, visible) {
    const display = visible ? 'inline' : 'none';
    ['Next', 'Prev', 'Cut', 'Set'].forEach(name => {
        const btn = document.getElementById('btn' + name + key);
        if (btn) btn.style.display = display;
    });
}

function showPlacingButtons(key) {
    setButtonVisibility(key, true);
}

function hidePlacingButtons(key) {
    setButtonVisibility(key, false);
}

function clearBoard() {
    // Remove all mesh objects from the scene
    const meshesToRemove = [];
    scene.children.forEach(child => {
        if (child.type === 'Mesh') {
            meshesToRemove.push(child);
        }
    });
    meshesToRemove.forEach(mesh => scene.remove(mesh));
    // Clear empty cell meshes array
    emptyCellMeshes = [];
}

function positionToBit(x, y, z) {
    return BigInt(x * POSITION_MULTIPLIER_X + y * POSITION_MULTIPLIER_Y + z);
}

// Convert board coordinates (x, y, z) to 3D scene position
function boardToScenePosition(x, y, z) {
    const hexOffsetX = z * SPHERE_RADIUS * 0.5;      // Offset in X: half radius per z unit
    const hexOffsetZ = (y + z) * SPHERE_RADIUS;      // Offset in Z: full radius per (y+z) unit
    return {
        x: y * distancej + hexOffsetX,
        y: z * distancek,
        z: x * distancei + hexOffsetZ
    };
}

// Create a sphere with specified material
function createSphere(material, x, y, z) {
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
    const sphere = new THREE.Mesh(geometry, material);
    const pos = boardToScenePosition(x, y, z);
    sphere.position.set(pos.x, pos.y, pos.z);
    return sphere;
}

function positionUsesLocation(position, x, y, z) {
    // Check if the position uses the specified location
    // If x, y, or z is null, it means "All" was selected, so we only check non-null values
    if (!position.absolutePosition) {
        return false;
    }
    for (let i = 0; i < position.absolutePosition.length; i++) {
        const atom = position.absolutePosition[i];
        const matchesX = x === null || atom.offset.x === x;
        const matchesY = y === null || atom.offset.y === y;
        const matchesZ = z === null || atom.offset.z === z;
        if (matchesX && matchesY && matchesZ) {
            return true;
        }
    }
    return false;
}

function applyFilters(positions) {
    // Apply location filters (X, Y, Z)
    if (ddlX.value !== "All" || ddlY.value !== "All" || ddlZ.value !== "All") {
        const x = ddlX.value === "All" ? null : Number(ddlX.value);
        const y = ddlY.value === "All" ? null : Number(ddlY.value);
        const z = ddlZ.value === "All" ? null : Number(ddlZ.value);
        positions = positions.filter(m => positionUsesLocation(m, x, y, z));
    }

    // Apply numeric filters
    const numericFilters = [
        { dropdown: ddlRotation, field: 'rotation' },
        { dropdown: ddlPlane, field: 'plane' }
    ];
    numericFilters.forEach(({ dropdown, field }) => {
        if (dropdown.value !== "All") {
            const value = Number(dropdown.value);
            positions = positions.filter(m => m[field] === value);
        }
    });

    // Apply boolean filters
    const booleanFilters = [
        { dropdown: ddlLean, field: 'lean' },
        { dropdown: ddlMirrorX, field: 'mirrorX' }
    ];
    booleanFilters.forEach(({ dropdown, field }) => {
        if (dropdown.value !== "All") {
            const value = dropdown.value === "true";
            positions = positions.filter(m => m[field] === value);
        }
    });

    // Apply root position filters
    const rootFilters = [
        { dropdown: ddlRootX, field: 'rootPosition', subField: 'x' },
        { dropdown: ddlRootY, field: 'rootPosition', subField: 'y' },
        { dropdown: ddlRootZ, field: 'rootPosition', subField: 'z' }
    ];
    rootFilters.forEach(({ dropdown, field, subField }) => {
        if (dropdown.value !== "All") {
            const value = Number(dropdown.value);
            positions = positions.filter(m => m[field][subField] === value);
        }
    });

    return positions;
}

function drawEmptyCells() {
    // Clear existing empty cell meshes
    emptyCellMeshes.forEach(mesh => scene.remove(mesh));
    emptyCellMeshes = [];

    if (!showEmptyCells) {
        return;
    }

    const emptyCellMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: emptyCellOpacity,
        shininess: MATERIAL_SHININESS
    });

    // Iterate through all valid board positions
    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let z = 0; z < BOARD_SIZE; z++) {
                // Check if position is valid (x + y + z <= 5)
                if (x + y + z <= BOARD_MAX_SUM) {
                    // Only show empty cells on outside faces of the prism
                    const isOnOutsideFace = x === 0 || y === 0 || z === 0 || (x + y + z === BOARD_MAX_SUM);
                    if (isOnOutsideFace) {
                        const bit = positionToBit(x, y, z);
                        // Check if position is empty (not occupied)
                        if ((board.occupancyMask & (1n << bit)) === 0n) {
                            const sphere = createSphere(emptyCellMaterial, x, y, z);
                            scene.add(sphere);
                            emptyCellMeshes.push(sphere);
                        }
                    }
                }
            }
        }
    }
}

function toggleEmptyCells() {
    showEmptyCells = !showEmptyCells;
    drawEmptyCells();
    btnToggleEmptyCells.innerText = showEmptyCells ? 'Hide Empty Cells' : 'Show Empty Cells';
}

function updateEmptyCellOpacity() {
    emptyCellOpacity = parseFloat(sliderEmptyCellOpacity.value);
    lblEmptyCellOpacity.innerText = emptyCellOpacity.toFixed(2);

    // Update opacity of existing empty cell meshes
    emptyCellMeshes.forEach(mesh => {
        mesh.material.opacity = emptyCellOpacity;
    });
}

// Render the scene
function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update(); // Update the controls
}

function removePiece(char) {
    const usedPiece = board.piecesUsed.get(char);
    const color = board.pieceRegistry.colors.get(char);

    if (usedPiece === undefined) {
        throw new Error('That piece is not used');
    }
    board.removePiece(usedPiece);
    color.vposIndex = 0;
    placingPiece = null;
    drawBoard();
}

function setPiece(char) {
    const color = board.pieceRegistry.colors.get(char);
    color.vposIndex = 0;
    placingPiece = null;
    drawBoard();
}

function initiatePlacing(i) {
    const usedPiece = board.piecesUsed.get(i);
    const color = board.pieceRegistry.colors.get(i);

    if (usedPiece !== undefined) {
        throw new Error('That piece is already used');
    }

    let positions = color.validPositions;

    // Apply all filters
    positions = applyFilters(positions);

    if (positions.length == 0) {
        return false;
    }

    const lbl = document.getElementById('lbl' + i);
    lbl.innerText = i + '(' + positions.length + ')';

    color.vposIndex = 0;

    board.placePiece(positions[color.vposIndex]);
    updatePieceDetailsPanel(positions[color.vposIndex]);
    placingPiece = i;

    drawBoard();

    return true;
}

function navigatePosition(i, direction) {
    const usedPiece = board.piecesUsed.get(i);
    const color = board.pieceRegistry.colors.get(i);

    if (usedPiece !== undefined) {
        board.removePiece(usedPiece);
    }

    let positions = applyFilters(color.validPositions);

    if (direction === 'next') {
        color.vposIndex = (color.vposIndex + 1) % positions.length;
    } else {
        color.vposIndex = (color.vposIndex - 1 + positions.length) % positions.length;
    }

    board.placePiece(positions[color.vposIndex]);
    updatePieceDetailsPanel(positions[color.vposIndex]);
    drawBoard();
}

function placeNextPosition(i) {
    navigatePosition(i, 'next');
}

function placePrevPosition(i) {
    navigatePosition(i, 'prev');
}

function updatePieceDetailsPanel(position) {
    const lblPieceName = document.getElementById('lblPieceName');
    const pieceName = position.name || position.character;
    lblPieceName.innerText = "Name: " + pieceName + '(' + position.character + ")";
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

function filterChanged() {
    const i = placingPiece;
    const usedPiece = board.piecesUsed.get(placingPiece);
    const color = board.pieceRegistry.colors.get(placingPiece);
    // remove placingPiece
    if (usedPiece != undefined) {
        board.removePiece(usedPiece);
    }
    color.vposIndex = 0;
    drawBoard();

    var positionsExist = initiatePlacing(i);

    if (!positionsExist) {
        hidePlacingButtons(i);
    } else {
        showPlacingButtons(i);
    }
}

function attemptSolve() {
    const success = board.solve();
    if (success) {
        console.log("Successfully solved");
        drawBoard();
    } else {
        const lbl = document.getElementById('lblNoSolution');
        lbl.style.display = 'inline';
    }
}

function reset() {
    board.resetBoard();
    drawBoard();
}

drawBoard();
render();
