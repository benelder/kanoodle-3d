import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls'
import { Board } from './kanoodle.js'
import {
    createScene,
    createOrthographicCamera,
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
let showAxesHelper = false; // Tracks axes helper visibility
let manualStateSnapshot = null; // Stores manually-placed pieces state
let boardMesh = null; // Reference to the board mesh
let boardSeats = []; // Array to store seat meshes
let boardCylinder = []; // Array to store cylinder wall and bottom meshes

const btnSolve = document.getElementById("btnSolve");
btnSolve.addEventListener('click', () => attemptSolve());

const btnReset = document.getElementById("btnReset");
btnReset.addEventListener('click', () => reset());

const btnResetToManual = document.getElementById("btnResetToManual");
btnResetToManual.addEventListener('click', () => resetToManualState());

const btnToggleEmptyCells = document.getElementById("btnToggleEmptyCells");
btnToggleEmptyCells.addEventListener('click', () => toggleEmptyCells());

const btnToggleAxesHelper = document.getElementById("btnToggleAxesHelper");
btnToggleAxesHelper.addEventListener('click', () => toggleAxesHelper());

const sliderEmptyCellOpacity = document.getElementById("sliderEmptyCellOpacity");
const lblEmptyCellOpacity = document.getElementById("lblEmptyCellOpacity");
lblEmptyCellOpacity.innerText = emptyCellOpacity.toFixed(2);
sliderEmptyCellOpacity.addEventListener('input', () => updateEmptyCellOpacity());

// Initialize lighting controls
const sliderAmbientIntensity = document.getElementById("sliderAmbientIntensity");
const lblAmbientIntensity = document.getElementById("lblAmbientIntensity");
sliderAmbientIntensity.addEventListener('input', () => updateAmbientIntensity());

const sliderDirLightIntensity = document.getElementById("sliderDirLightIntensity");
const lblDirLightIntensity = document.getElementById("lblDirLightIntensity");
sliderDirLightIntensity.addEventListener('input', () => updateDirLightIntensity());

const sliderDirLightX = document.getElementById("sliderDirLightX");
const lblDirLightX = document.getElementById("lblDirLightX");
sliderDirLightX.addEventListener('input', () => updateDirLightPosition());

const sliderDirLightY = document.getElementById("sliderDirLightY");
const lblDirLightY = document.getElementById("lblDirLightY");
sliderDirLightY.addEventListener('input', () => updateDirLightPosition());

const sliderDirLightZ = document.getElementById("sliderDirLightZ");
const lblDirLightZ = document.getElementById("lblDirLightZ");
sliderDirLightZ.addEventListener('input', () => updateDirLightPosition());

const sliderDirLight2Intensity = document.getElementById("sliderDirLight2Intensity");
const lblDirLight2Intensity = document.getElementById("lblDirLight2Intensity");
sliderDirLight2Intensity.addEventListener('input', () => updateDirLight2Intensity());

const sliderDirLight2X = document.getElementById("sliderDirLight2X");
const lblDirLight2X = document.getElementById("lblDirLight2X");
sliderDirLight2X.addEventListener('input', () => updateDirLight2Position());

const sliderDirLight2Y = document.getElementById("sliderDirLight2Y");
const lblDirLight2Y = document.getElementById("lblDirLight2Y");
sliderDirLight2Y.addEventListener('input', () => updateDirLight2Position());

const sliderDirLight2Z = document.getElementById("sliderDirLight2Z");
const lblDirLight2Z = document.getElementById("lblDirLight2Z");
sliderDirLight2Z.addEventListener('input', () => updateDirLight2Position());

const btnResetLighting = document.getElementById("btnResetLighting");
btnResetLighting.addEventListener('click', () => resetLighting());

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
const { scene, ambientLight, dirLight, dirLight2 } = createScene();
scene.up.set(0, 0, 1);

// Store default lighting values for reset functionality
const defaultLighting = {
    ambientIntensity: 0.7,
    dirLightIntensity: 1.5,
    dirLightPosition: { x: 0, y: 10, z: 20 },
    dirLight2Intensity: 0.3,
    dirLight2Position: { x: -10, y: -10, z: 10 }
};


// Add axes helper to visualize rotation axes
const axisLength = 70;
const axesHelper = new THREE.AxesHelper(axisLength); // 100 units length
scene.add(axesHelper);
axesHelper.visible = showAxesHelper;

// Add axis labels
function createAxisLabel(text, color, position) {
    // Create a canvas element to draw text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 64;

    // Draw text on canvas
    context.fillStyle = 'rgba(0, 0, 0, 0)'; // Transparent background
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = 'Bold 48px Arial';
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);

    // Create sprite material
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1
    });

    // Create sprite
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(10, 10, 1); // Scale the sprite
    sprite.position.copy(position);

    return sprite;
}

// Add labels at the end of each axis (110 units from origin)
const labelOffset = 80;
const axesLabels = [
    createAxisLabel('X', '#ff0000', new THREE.Vector3(labelOffset, 0, 0)), // Red X axis
    createAxisLabel('Y', '#00ff00', new THREE.Vector3(0, labelOffset, 0)), // Green Y axis
    createAxisLabel('Z', '#0000ff', new THREE.Vector3(0, 0, labelOffset))  // Blue Z axis
];

axesLabels.forEach(label => scene.add(label));
axesLabels.forEach(label => label.visible = showAxesHelper);

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

// Set up the camera to look at the origin initially
// The target will be updated when the board is created
camera.lookAt(0, 0, 0);
controls.target.set(0, 0, 0);
controls.update();



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
    // Remove all mesh objects from the scene (except the board, seats, and cylinder)
    const meshesToRemove = [];
    scene.children.forEach(child => {
        if (child.type === 'Mesh' && child !== boardMesh &&
            !boardSeats.includes(child) && !boardCylinder.includes(child)) {
            meshesToRemove.push(child);
        }
    });
    meshesToRemove.forEach(mesh => scene.remove(mesh));
    // Clear empty cell meshes array
    emptyCellMeshes = [];
}

/**
 * Creates a hemisphere geometry using SphereGeometry with clipping parameters
 * @param {number} radius - Radius of the hemisphere
 * @returns {THREE.BufferGeometry} Geometry representing the bottom half of a sphere
 */
function createIcosahedronHemisphere(radius) {
    // Create hemisphere using SphereGeometry with clipping parameters
    // In Three.js SphereGeometry:
    // - phi: angle around Y axis (horizontal sweep, longitude) - 0 to 2*Math.PI
    // - theta: angle from positive Y axis (vertical sweep, latitude) - 0 (top) to Math.PI (bottom)
    // For bottom hemisphere (y <= 0): thetaStart = Math.PI/2 (equator), thetaLength = Math.PI/2 (to bottom)
    const hemisphereGeometry = new THREE.SphereGeometry(
        radius,
        8, // widthSegments (horizontal resolution)
        3,  // heightSegments (vertical resolution)
        0,  // phiStart (start at 0 degrees horizontally)
        Math.PI * 2, // phiLength (full circle horizontally)
        Math.PI / 2, // thetaStart (start at equator, y=0)
        Math.PI / 2  // thetaLength (go to bottom - creates bottom hemisphere)
    );

    return hemisphereGeometry;
}

/**
 * Creates the board with recessed seats for the base layer (z=0)
 */
function createBoard() {
    // Clean up existing seats if any
    boardSeats.forEach(seat => scene.remove(seat));
    boardSeats = [];

    // Clean up existing cylinder if any
    boardCylinder.forEach(part => scene.remove(part));
    boardCylinder = [];

    const boardRadius = 8 * SPHERE_RADIUS;
    const holeRadius = .85 * SPHERE_RADIUS;
    const boardThickness = 0.5; // Small thickness for the board
    const seatDepth = 2.5;
    const wallHeight = 1.5 * SPHERE_RADIUS;
    const wallThickness = 0.3; // Thickness of the cylinder wall

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
    let centroidY = 0;
    for (const pos of basePositions) {
        centroidX += pos.x;
        centroidY += pos.y;
    }
    centroidX /= basePositions.length;
    centroidY /= basePositions.length;

    // Create holes for each base position, centered within the circle
    // Since the board is in the x-y plane (z=0), we use x and y coordinates
    for (const pos of basePositions) {
        const hole = new THREE.Path();
        // Offset holes by centroid to center the triangle
        hole.absarc(pos.x - centroidX, pos.y - centroidY, holeRadius, 0, Math.PI * 2, true); // true = clockwise (creates hole)
        boardShape.holes.push(hole);
    }

    // Create geometry from shape and extrude it
    const extrudeSettings = {
        depth: boardThickness,
        bevelEnabled: false
    };
    const boardGeometry = new THREE.ExtrudeGeometry(boardShape, extrudeSettings);

    // Position the board at z=0 (base layer height)
    // The geometry is created in x-y plane, which is correct for z-up
    // Extrude along Z direction, so translate in Z
    boardGeometry.translate(0, 0, -boardThickness / 2 - seatDepth);

    // Create material for the board
    const boardMaterial = new THREE.MeshPhongMaterial({
        color: 0x222222,
        flatShading: true,
        shininess: MATERIAL_SHININESS
    });

    // Create mesh and position it at the centroid so the triangle is centered
    boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
    boardMesh.position.set(centroidX, centroidY, 0);
    scene.add(boardMesh);

    // Calculate board surface level in world coordinates
    // Board mesh is at z=0, geometry is translated -boardThickness/2 - seatDepth
    // So board surface (top) is at: 0 + (-boardThickness/2 - seatDepth) + boardThickness/2 = -seatDepth
    const boardSurfaceZ = -seatDepth;

    // Create material for the seats - double-sided so interior is visible and opaque
    const seatMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        flatShading: true,
        shininess: MATERIAL_SHININESS,
        side: THREE.DoubleSide // Render both sides so interior is visible when looking down
    });

    const rootSeatMaterial = new THREE.MeshPhongMaterial({
        color: 0x444444,
        flatShading: true,
        shininess: MATERIAL_SHININESS,
        side: THREE.DoubleSide // Render both sides so interior is visible when looking down
    });

    // Create hollow hemispherical seats for each base position
    for (const pos of basePositions) {
        // Create hollow icosahedron hemisphere geometry (surface only, no volume)
        const seatGeometry = createIcosahedronHemisphere(holeRadius);

        // Position seat at the hole location (using scene coordinates directly)
        const seatX = pos.x;
        const seatY = pos.y;

        // Position the hemisphere so the top (equator) aligns with board surface
        // The hemisphere center is at the origin, so we position it so the equator is at boardSurfaceZ
        // Hemisphere is created with equator at y=0, so we rotate it to have equator at z=0
        const seatZ = boardSurfaceZ;

        const seat = new THREE.Mesh(seatGeometry, seatX === 0 && seatY === 0 ? rootSeatMaterial : seatMaterial);
        seat.position.set(seatX, seatY, seatZ);

        // Rotate hemisphere so equator is horizontal (in X-Y plane) for Z-up
        // Original hemisphere has equator in X-Z plane, rotate 90 degrees around X to put it in X-Y plane
        seat.rotateX(Math.PI / 2);

        // Flatten the seat to make it more shallow (scale Z dimension down)
        const seatShallowness = 0.4; // 0.4 = 40% of original depth, making it more shallow
        seat.scale.y = seatShallowness;

        scene.add(seat);
        boardSeats.push(seat); // Store seat reference so it doesn't get removed by clearBoard
    }

    // Create hollow cylinder wall around the board
    const cylinderWallMaterial = new THREE.MeshPhongMaterial({
        color: 0x222222,
        flatShading: true,
        shininess: MATERIAL_SHININESS,
        side: THREE.DoubleSide
    });

    // Create hollow cylinder wall (tube) using a ring shape
    const outerRadius = boardRadius;
    const innerRadius = outerRadius - wallThickness;

    // Create ring shape for the wall cross-section
    const ringShape = new THREE.Shape();
    ringShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    const innerHole = new THREE.Path();
    innerHole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true); // true = clockwise (creates hole)
    ringShape.holes.push(innerHole);

    // Extrude the ring to create the cylinder wall
    const wallExtrudeSettings = {
        depth: wallHeight,
        bevelEnabled: false
    };
    const wallGeometry = new THREE.ExtrudeGeometry(ringShape, wallExtrudeSettings);

    // Extrude creates in X-Y plane, extruding along Z, which is correct for Z-up
    // Position the wall so it extends from board surface down (negative Z)
    // Geometry is created with z=0 at front, z=depth at back
    // Board surface is at z = -seatDepth in world coordinates
    // Wall mesh is positioned at z=0 (world), so we need geometry top (local z=0) at world z=-seatDepth
    // This means we translate the geometry by -seatDepth in Z
    wallGeometry.translate(0, 0, -seatDepth - wallHeight);

    const wallBottomZ = -seatDepth - wallHeight;

    const cylinderWall = new THREE.Mesh(wallGeometry, cylinderWallMaterial);
    cylinderWall.position.set(centroidX, centroidY, 0);
    scene.add(cylinderWall);
    boardCylinder.push(cylinderWall);

    // Create bottom disc to close the cylinder (no holes)
    const bottomShape = new THREE.Shape();
    bottomShape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    // No holes in the bottom - it's a solid disc

    // Extrude the bottom disc
    const bottomExtrudeSettings = {
        depth: boardThickness,
        bevelEnabled: false
    };
    const bottomGeometry = new THREE.ExtrudeGeometry(bottomShape, bottomExtrudeSettings);

    // Extrude creates in X-Y plane, extruding along Z, which is correct for Z-up
    // Position at the bottom of the cylinder
    bottomGeometry.translate(0, 0, -boardThickness / 2);

    const cylinderBottom = new THREE.Mesh(bottomGeometry, boardMaterial);
    cylinderBottom.position.set(centroidX, centroidY, wallBottomZ);
    scene.add(cylinderBottom);
    boardCylinder.push(cylinderBottom);
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

function toggleAxesHelper() {
    showAxesHelper = !showAxesHelper;
    axesHelper.visible = showAxesHelper;
    // Also toggle axis labels visibility
    axesLabels.forEach(label => {
        label.visible = showAxesHelper;
    });
    btnToggleAxesHelper.innerText = showAxesHelper ? 'Axes Off' : 'Axes On';
}

function updateEmptyCellOpacity() {
    emptyCellOpacity = parseFloat(sliderEmptyCellOpacity.value);
    lblEmptyCellOpacity.innerText = emptyCellOpacity.toFixed(2);

    // Update opacity of existing empty cell meshes
    emptyCellMeshes.forEach(mesh => {
        mesh.material.opacity = emptyCellOpacity;
    });
}

function updateAmbientIntensity() {
    const intensity = parseFloat(sliderAmbientIntensity.value);
    ambientLight.intensity = intensity;
    lblAmbientIntensity.innerText = intensity.toFixed(1);
}

function updateDirLightIntensity() {
    const intensity = parseFloat(sliderDirLightIntensity.value);
    dirLight.intensity = intensity;
    lblDirLightIntensity.innerText = intensity.toFixed(1);
}

function updateDirLightPosition() {
    const x = parseFloat(sliderDirLightX.value);
    const y = parseFloat(sliderDirLightY.value);
    const z = parseFloat(sliderDirLightZ.value);
    dirLight.position.set(x, y, z);
    lblDirLightX.innerText = x;
    lblDirLightY.innerText = y;
    lblDirLightZ.innerText = z;
}

function updateDirLight2Intensity() {
    const intensity = parseFloat(sliderDirLight2Intensity.value);
    dirLight2.intensity = intensity;
    lblDirLight2Intensity.innerText = intensity.toFixed(1);
}

function updateDirLight2Position() {
    const x = parseFloat(sliderDirLight2X.value);
    const y = parseFloat(sliderDirLight2Y.value);
    const z = parseFloat(sliderDirLight2Z.value);
    dirLight2.position.set(x, y, z);
    lblDirLight2X.innerText = x;
    lblDirLight2Y.innerText = y;
    lblDirLight2Z.innerText = z;
}

function resetLighting() {
    // Reset ambient light
    ambientLight.intensity = defaultLighting.ambientIntensity;
    sliderAmbientIntensity.value = defaultLighting.ambientIntensity;
    lblAmbientIntensity.innerText = defaultLighting.ambientIntensity.toFixed(1);

    // Reset dirLight
    dirLight.intensity = defaultLighting.dirLightIntensity;
    sliderDirLightIntensity.value = defaultLighting.dirLightIntensity;
    lblDirLightIntensity.innerText = defaultLighting.dirLightIntensity.toFixed(1);
    dirLight.position.set(
        defaultLighting.dirLightPosition.x,
        defaultLighting.dirLightPosition.y,
        defaultLighting.dirLightPosition.z
    );
    sliderDirLightX.value = defaultLighting.dirLightPosition.x;
    sliderDirLightY.value = defaultLighting.dirLightPosition.y;
    sliderDirLightZ.value = defaultLighting.dirLightPosition.z;
    lblDirLightX.innerText = defaultLighting.dirLightPosition.x;
    lblDirLightY.innerText = defaultLighting.dirLightPosition.y;
    lblDirLightZ.innerText = defaultLighting.dirLightPosition.z;

    // Reset dirLight2
    dirLight2.intensity = defaultLighting.dirLight2Intensity;
    sliderDirLight2Intensity.value = defaultLighting.dirLight2Intensity;
    lblDirLight2Intensity.innerText = defaultLighting.dirLight2Intensity.toFixed(1);
    dirLight2.position.set(
        defaultLighting.dirLight2Position.x,
        defaultLighting.dirLight2Position.y,
        defaultLighting.dirLight2Position.z
    );
    sliderDirLight2X.value = defaultLighting.dirLight2Position.x;
    sliderDirLight2Y.value = defaultLighting.dirLight2Position.y;
    sliderDirLight2Z.value = defaultLighting.dirLight2Position.z;
    lblDirLight2X.innerText = defaultLighting.dirLight2Position.x;
    lblDirLight2Y.innerText = defaultLighting.dirLight2Position.y;
    lblDirLight2Z.innerText = defaultLighting.dirLight2Position.z;
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
