import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import {
    Lime, Yellow, DarkBlue, LightBlue, Red, Pink,
    Green, White, Orange, Peach, Gray, Purple
} from './kanoodle.js';

// Constants
const SPHERE_RADIUS = 5;
const SPHERE_SEGMENTS = 32;
const MATERIAL_SHININESS = 100;

// Set up the scene
const scene = new THREE.Scene();

// Set up the camera (using OrthographicCamera, same as main.js)
const ZOOM_FACTOR = 6;
const camera = new THREE.OrthographicCamera(
    window.innerWidth / -ZOOM_FACTOR,
    window.innerWidth / ZOOM_FACTOR,
    window.innerHeight / ZOOM_FACTOR,
    window.innerHeight / -ZOOM_FACTOR,
    -1000,
    1000
);
camera.position.set(1, 1, 1);

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

// Set up the spheres - same coordinate system as main.js
const sqrt3 = Math.sqrt(3);
const distancei = 2 * SPHERE_RADIUS;
const distancej = sqrt3 * SPHERE_RADIUS;
const distancek = sqrt3 * SPHERE_RADIUS;

// Add ambient light to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10, 20, 0);
scene.add(dirLight);


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

// Convert board coordinates (x, y, z) to 3D scene position
function boardToScenePosition(x, y, z) {
    const hexOffsetX = z * SPHERE_RADIUS * 0.5;
    const hexOffsetZ = (y + z) * SPHERE_RADIUS;
    return {
        x: y * distancej + hexOffsetX,
        y: z * distancek,
        z: x * distancei + hexOffsetZ
    };
}

// Create a sphere with specified material
function createSphere(material, x, y, z, offsetX = 0, offsetY = 0, offsetZ = 0) {
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
    const sphere = new THREE.Mesh(geometry, material);
    const pos = boardToScenePosition(x, y, z);
    sphere.position.set(pos.x + offsetX, pos.y + offsetY, pos.z + offsetZ);
    return sphere;
}

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
const SPACING_X = 80; // Spacing between columns
const SPACING_Z = 80; // Spacing between rows (in Z direction)

// Create and position each piece
pieces.forEach((piece, index) => {
    const row = Math.floor(index / COLUMNS);
    const col = index % COLUMNS;

    // Calculate offset position for this piece in the grid
    const offsetX = (col - COLUMNS / 2 + 0.5) * SPACING_X;
    const offsetZ = (row - ROWS / 2 + 0.5) * SPACING_Z;

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
            0,
            offsetZ
        );
        scene.add(sphere);
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.left = window.innerWidth / -ZOOM_FACTOR;
    camera.right = window.innerWidth / ZOOM_FACTOR;
    camera.top = window.innerHeight / ZOOM_FACTOR;
    camera.bottom = window.innerHeight / -ZOOM_FACTOR;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render the scene
function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update();
}

render();

