import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls'
import { Board } from './kanoodle.js'

// Constants
const BOARD_SIZE = 6;
const BOARD_MAX_SUM = 5;
const SPHERE_RADIUS = 5;
const MATERIAL_SHININESS = 100;
const POSITION_MULTIPLIER_X = 36;
const POSITION_MULTIPLIER_Y = 6;

const board = new Board();
let placingPiece = null;
let showEmptyCells = false;
let emptyCellMeshes = [];
let emptyCellOpacity = 0.2;
let manualStateSnapshot = null; // Stores manually-placed pieces state

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
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
const mainPanel = document.querySelector('#main-panel');

// Set up the camera
const ZOOM_FACTOR = 6;
const camera = new THREE.OrthographicCamera(window.innerWidth / - ZOOM_FACTOR, window.innerWidth / ZOOM_FACTOR, window.innerHeight / ZOOM_FACTOR, window.innerHeight / - ZOOM_FACTOR, -500, 100);
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
        shininess: colorMap[val] ? MATERIAL_SHININESS : undefined,
        flatShading: true  // Enable flat shading to make faces more distinct
    });
}

function drawBoard() {
    clearBoard();
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

// Create a polygonal/faceted sphere with specified material
// Using IcosahedronGeometry which has 20 triangular faces for a faceted look
function createSphere(material, x, y, z) {
    const geometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 1);
    const sphere = new THREE.Mesh(geometry, material);
    const pos = boardToScenePosition(x, y, z);
    sphere.position.set(pos.x, pos.y, pos.z);
    return sphere;
}

// Calculate the 3D distance between two positions in scene coordinates
function getPositionDistance(pos1, pos2) {
    const scenePos1 = boardToScenePosition(pos1.x, pos1.y, pos1.z);
    const scenePos2 = boardToScenePosition(pos2.x, pos2.y, pos2.z);
    const dx = scenePos1.x - scenePos2.x;
    const dy = scenePos1.y - scenePos2.y;
    const dz = scenePos1.z - scenePos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Check if two positions are adjacent (neighbors in the hexagonal close packing)
function arePositionsAdjacent(pos1, pos2) {
    // In hexagonal close packing, adjacent atoms are 2 * SPHERE_RADIUS apart
    // Allow a tolerance for floating point comparison and transformations
    const expectedDistance = 2 * SPHERE_RADIUS;
    const actualDistance = getPositionDistance(pos1, pos2);
    // Increased tolerance to account for floating point precision and transformations
    // (plane transpose, rotations, etc. can cause small variations)
    const tolerance = 1.0; // Increased from 0.5 to account for transformation precision
    return Math.abs(actualDistance - expectedDistance) < tolerance;
}

// Create a connector cylinder between two adjacent positions
function createConnector(material, pos1, pos2) {
    const scenePos1 = boardToScenePosition(pos1.x, pos1.y, pos1.z);
    const scenePos2 = boardToScenePosition(pos2.x, pos2.y, pos2.z);

    // Calculate distance and direction
    const dx = scenePos2.x - scenePos1.x;
    const dy = scenePos2.y - scenePos1.y;
    const dz = scenePos2.z - scenePos1.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Connector radius is 20% of sphere diameter = 0.2 * 2 * SPHERE_RADIUS
    const connectorRadius = 0.2 * 2 * SPHERE_RADIUS;

    // Create cylinder geometry
    const geometry = new THREE.CylinderGeometry(connectorRadius, connectorRadius, distance, 8);
    const cylinder = new THREE.Mesh(geometry, material);

    // Position cylinder at midpoint between positions
    const midX = (scenePos1.x + scenePos2.x) / 2;
    const midY = (scenePos1.y + scenePos2.y) / 2;
    const midZ = (scenePos1.z + scenePos2.z) / 2;
    cylinder.position.set(midX, midY, midZ);

    // Rotate cylinder to align with the direction between positions
    // The cylinder's default orientation is along Y-axis, so we need to rotate it
    const direction = new THREE.Vector3(dx, dy, dz).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, direction);
    cylinder.quaternion.copy(quaternion);

    return cylinder;
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
