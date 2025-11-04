import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import {
    Lime, Yellow, DarkBlue, LightBlue, Red, Pink,
    Green, White, Orange, Peach, Gray, Purple
} from './kanoodle.js';
import {
    createScene,
    createOrthographicCamera,
    updateCameraOnResize,
    getMaterial,
    createSphere,
    arePositionsAdjacent,
    createConnector
} from './renderer-utils.js';

// Set up the scene
const scene = createScene();

// Set up the camera (using OrthographicCamera, with wider near/far for shapes view)
const camera = createOrthographicCamera(-1000, 1000);

// Set up the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
const mainPanel = document.querySelector('#main-panel');
mainPanel.appendChild(renderer.domElement);

// Set up the controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = true;
controls.enableZoom = true;
controls.enableRotate = true;

// Create all 12 pieces
const pieces = [
    new Lime(),      // A
    new Yellow(),    // B
    new DarkBlue(),  // C
    new LightBlue(), // D
    new Red(),       // E
    new Pink(),      // F
    new Green(),     // G
    new White(),     // H
    new Orange(),    // I
    new Peach(),     // J
    new Gray(),      // K
    new Purple()     // L
];

// Arrange pieces in a 4x3 grid
const COLUMNS = 4;
const ROWS = 3;
const SPACING_X = 50; // Spacing between columns
const SPACING_Y = 40; // Spacing between rows (in Z direction)

// Create and position each piece
pieces.forEach((piece, index) => {
    const row = Math.floor(index / COLUMNS);
    const col = index % COLUMNS;

    // Calculate offset position for this piece in the grid
    const offsetX = (col - COLUMNS / 2 + 0.5) * SPACING_X;
    const offsetY = (row - ROWS / 2 + 0.5) * SPACING_Y;

    // Get material for this piece
    const material = getMaterial(piece.character);

    // Render each node of the piece
    for (const node of piece.nodes) {
        const sphere = createSphere(
            material,
            node.offset.x,
            node.offset.y,
            node.offset.z,
            offsetX,
            offsetY,
            0
        );
        scene.add(sphere);
    }

    // Add connectors between adjacent atoms
    for (let i = 0; i < piece.nodes.length; i++) {
        for (let j = i + 1; j < piece.nodes.length; j++) {
            if (arePositionsAdjacent(piece.nodes[i], piece.nodes[j])) {
                const connector = createConnector(
                    material,
                    piece.nodes[i],
                    piece.nodes[j],
                    offsetX,
                    offsetY,
                    0
                );
                scene.add(connector);
            }
        }
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    updateCameraOnResize(camera);
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render the scene
function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update();
}

render();

