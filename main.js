import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls'
import { Board } from './kanoodle.js'
import { CSG } from 'three-csg-ts';
import {
    createScene,
    createOrthographicCamera,
    updateCameraOnResize,
    getMaterial,
    createSphere,
    arePositionsAdjacent,
    createConnector,
    MATERIAL_SHININESS,
    SPHERE_RADIUS,
    boardToScenePosition
} from './renderer-utils.js';

// Constants
const BOARD_SIZE = 6;
const BOARD_MAX_SUM = 5;
const POSITION_MULTIPLIER_X = 36;
const POSITION_MULTIPLIER_Y = 6;

const board = new Board();
let placingPiece = null;
let showEmptyCells = false;
let emptyCellMeshes = [];
let emptyCellOpacity = 0.2;
let manualStateSnapshot = null; // Stores manually-placed pieces state
let boardMesh = null; // Reference to the board mesh

const btnSolve = document.getElementById("btnSolve");
btnSolve.addEventListener('click', () => attemptSolve());

const btnReset = document.getElementById("btnReset");
btnReset.addEventListener('click', () => reset());

const btnResetToManual = document.getElementById("btnResetToManual");
btnResetToManual.addEventListener('click', () => resetToManualState());

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
const scene = createScene();

// Add axes helper to visualize rotation axes
const axesHelper = new THREE.AxesHelper(100); // 100 units length
scene.add(axesHelper);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0x1a1a1a, 1); // Dark gray background for better visibility
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2; // Slightly brighter exposure
const mainPanel = document.querySelector('#main-panel');

// Set up the camera (using default near/far for solver)
const camera = createOrthographicCamera(-500, 100);
// Set up the renderer
renderer.setSize(window.innerWidth, window.innerHeight);

mainPanel.appendChild(renderer.domElement);

// Set up the controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.enableZoom = true;
controls.enableRotate = true;



function drawBoard() {
    clearBoard();

    // Create or update the board
    if (!boardMesh) {
        createBoard();
    }

    // Iterate over placed pieces and draw their positions
    for (const piece of board.piecesUsed.values()) {
        const material = getMaterial(piece.character);

        // Ensure absolutePosition exists
        if (!piece.absolutePosition || piece.absolutePosition.length === 0) {
            console.warn(`Piece ${piece.character} has no absolutePosition`);
            continue;
        }

        // Draw all atoms/spheres for this piece
        for (const atom of piece.absolutePosition) {
            const sphere = createSphere(material, atom.offset.x, atom.offset.y, atom.offset.z);
            scene.add(sphere);
        }
        // Add connectors between adjacent atoms in this piece
        for (let i = 0; i < piece.absolutePosition.length; i++) {
            for (let j = i + 1; j < piece.absolutePosition.length; j++) {
                const pos1 = piece.absolutePosition[i].offset;
                const pos2 = piece.absolutePosition[j].offset;
                if (arePositionsAdjacent(pos1, pos2)) {
                    const connector = createConnector(material, pos1, pos2);
                    scene.add(connector);
                }
            }
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

    updateResetToManualButton();

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
    // Remove all mesh objects from the scene (except the board)
    const meshesToRemove = [];
    scene.children.forEach(child => {
        if (child.type === 'Mesh' && child !== boardMesh) {
            meshesToRemove.push(child);
        }
    });
    meshesToRemove.forEach(mesh => scene.remove(mesh));
    // Clear empty cell meshes array
    emptyCellMeshes = [];
}

/**
 * Calculates the bounds of the pyramid in scene coordinates
 * by iterating through all valid pyramid positions
 */
function calculatePyramidBounds() {
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    // Iterate through all valid pyramid positions (x+y+z <= 5, x,y,z >= 0)
    for (let x = 0; x < 6; x++) {
        for (let y = 0; y < 6; y++) {
            for (let z = 0; z < 6; z++) {
                if (x + y + z <= 5) {
                    const pos = boardToScenePosition(x, y, z);
                    minX = Math.min(minX, pos.x);
                    maxX = Math.max(maxX, pos.x);
                    minZ = Math.min(minZ, pos.z);
                    maxZ = Math.max(maxZ, pos.z);
                }
            }
        }
    }

    return { minX, maxX, minZ, maxZ };
}

/**
 * Creates the board with recessed seats for the base layer (z=0)
 */
function createBoard() {
    const boardRadius = 8 * SPHERE_RADIUS;
    const holeRadius = .85 * SPHERE_RADIUS;
    const boardThickness = 0.5; // Small thickness for the board
    const seatDepth = 2.5;

    // Create the outer circle shape
    const boardShape = new THREE.Shape();
    boardShape.absarc(0, 0, boardRadius, 0, Math.PI * 2, false);

    // Collect all valid base layer positions (z=0, x+y <= 5)
    const basePositions = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
            const z = 0;
            if (x + y + z <= BOARD_MAX_SUM) {
                // Convert board coordinates to scene coordinates
                const scenePos = boardToScenePosition(x, y, z);
                basePositions.push(scenePos);
            }
        }
    }

    // Calculate centroid of all base positions to center the triangle
    let centroidX = 0;
    let centroidZ = 0;
    for (const pos of basePositions) {
        centroidX += pos.x;
        centroidZ += pos.z;
    }
    centroidX /= basePositions.length;
    centroidZ /= basePositions.length;

    // Create holes for each base position, centered within the circle
    // Since the board is in the x-z plane (y=0), we use x and z coordinates
    for (const pos of basePositions) {
        const hole = new THREE.Path();
        // Offset holes by centroid to center the triangle
        hole.absarc(pos.x - centroidX, pos.z - centroidZ, holeRadius, 0, Math.PI * 2, true); // true = clockwise (creates hole)
        boardShape.holes.push(hole);
    }

    // Create geometry from shape and extrude it
    const extrudeSettings = {
        depth: boardThickness,
        bevelEnabled: false
    };
    const boardGeometry = new THREE.ExtrudeGeometry(boardShape, extrudeSettings);

    // Position the board at y=0 (base layer height)
    // The geometry is created in x-y plane, so we rotate it to lie in x-z plane
    boardGeometry.rotateX(-Math.PI / 2);
    boardGeometry.translate(0, -boardThickness / 2 - seatDepth, 0);

    // Create material for the board
    const boardMaterial = new THREE.MeshPhongMaterial({
        color: 0x888888,
        flatShading: true,
        shininess: MATERIAL_SHININESS
    });

    // Create mesh and position it at the centroid so the triangle is centered
    boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
    boardMesh.position.set(centroidX, 0, centroidZ);
    scene.add(boardMesh);
}

function positionToBit(x, y, z) {
    return BigInt(x * POSITION_MULTIPLIER_X + y * POSITION_MULTIPLIER_Y + z);
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
        shininess: MATERIAL_SHININESS,
        flatShading: true  // Enable flat shading to make faces more distinct
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
    btnToggleEmptyCells.innerText = showEmptyCells ? 'Empty Cells Off' : 'Empty Cells On';
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
    // Update snapshot after removing a piece (in case it was manually placed)
    captureManualStateSnapshot();
    drawBoard();
}

function setPiece(char) {
    const color = board.pieceRegistry.colors.get(char);
    color.vposIndex = 0;
    placingPiece = null;
    captureManualStateSnapshot();
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
    manualStateSnapshot = null;
    updateResetToManualButton();
    drawBoard();
}

function captureManualStateSnapshot() {
    // Only capture snapshot if there are pieces on the board
    if (board.piecesUsed.size === 0) {
        manualStateSnapshot = null;
        updateResetToManualButton();
        return;
    }

    // Deep clone the piecesUsed Map
    const clonedPiecesUsed = new Map();
    for (const [key, piece] of board.piecesUsed.entries()) {
        // Clone the piece object and its properties
        clonedPiecesUsed.set(key, {
            character: piece.character,
            rootPosition: {
                x: piece.rootPosition.x,
                y: piece.rootPosition.y,
                z: piece.rootPosition.z
            },
            rotation: piece.rotation,
            plane: piece.plane,
            lean: piece.lean,
            mirrorX: piece.mirrorX,
            bitmask: piece.bitmask,
            absolutePosition: piece.absolutePosition.map(atom => ({
                offset: {
                    x: atom.offset.x,
                    y: atom.offset.y,
                    z: atom.offset.z
                }
            }))
        });
    }

    manualStateSnapshot = {
        piecesUsed: clonedPiecesUsed,
        occupancyMask: board.occupancyMask
    };
    updateResetToManualButton();
}

function restoreManualStateSnapshot() {
    if (!manualStateSnapshot) {
        return false;
    }

    // Clear the board
    board.resetBoard();

    // Restore pieces from snapshot - we need to find the matching piece objects from the registry
    for (const [char, snapshotPiece] of manualStateSnapshot.piecesUsed.entries()) {
        const color = board.pieceRegistry.colors.get(char);
        if (!color) continue;

        // Find the matching piece in allPositions by comparing key properties
        let matchingPiece = null;
        for (const pos of color.allPositions) {
            if (pos.character === snapshotPiece.character &&
                pos.rootPosition.x === snapshotPiece.rootPosition.x &&
                pos.rootPosition.y === snapshotPiece.rootPosition.y &&
                pos.rootPosition.z === snapshotPiece.rootPosition.z &&
                pos.rotation === snapshotPiece.rotation &&
                pos.plane === snapshotPiece.plane &&
                pos.lean === snapshotPiece.lean &&
                pos.mirrorX === snapshotPiece.mirrorX &&
                pos.bitmask === snapshotPiece.bitmask) {
                matchingPiece = pos;
                break;
            }
        }

        if (matchingPiece) {
            board.placePiece(matchingPiece);
        }
    }

    drawBoard();
    return true;
}

function resetToManualState() {
    if (restoreManualStateSnapshot()) {
        console.log("Restored to manually-placed pieces state");
    }
}

function updateResetToManualButton() {
    const btnResetToManual = document.getElementById('btnResetToManual');
    if (btnResetToManual) {
        btnResetToManual.disabled = manualStateSnapshot === null;
    }
}

drawBoard();
updateResetToManualButton();
render();
