import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import {
    Lime, Yellow, DarkBlue, LightBlue, Red, Pink,
    Green, White, Orange, Peach, Gray, Purple
} from './kanoodle.js';

// Constants
const SPHERE_RADIUS = 5;
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
        shininess: colorMap[val] ? MATERIAL_SHININESS : undefined,
        flatShading: true  // Enable flat shading to make faces more distinct
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

// Create a polygonal/faceted sphere with specified material
// Using IcosahedronGeometry which has 20 triangular faces for a faceted look
function createSphere(material, x, y, z, offsetX = 0, offsetY = 0, offsetZ = 0) {
    const geometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 1);
    const sphere = new THREE.Mesh(geometry, material);
    const pos = boardToScenePosition(x, y, z);
    sphere.position.set(pos.x + offsetX, pos.y + offsetY, pos.z + offsetZ);
    return sphere;
}

// Calculate the 3D distance between two atoms in scene coordinates
function getAtomDistance(atom1, atom2) {
    const pos1 = boardToScenePosition(atom1.offset.x, atom1.offset.y, atom1.offset.z);
    const pos2 = boardToScenePosition(atom2.offset.x, atom2.offset.y, atom2.offset.z);
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Check if two atoms are adjacent (neighbors in the hexagonal close packing)
function areAdjacent(atom1, atom2) {
    // In hexagonal close packing, adjacent atoms are 2 * SPHERE_RADIUS apart
    // Allow a small tolerance for floating point comparison
    const expectedDistance = 2 * SPHERE_RADIUS;
    const actualDistance = getAtomDistance(atom1, atom2);
    const tolerance = 0.5; // Small tolerance for floating point precision
    return Math.abs(actualDistance - expectedDistance) < tolerance;
}

// Create a connector cylinder between two adjacent atoms
function createConnector(material, atom1, atom2, offsetX = 0, offsetY = 0, offsetZ = 0) {
    const pos1 = boardToScenePosition(atom1.offset.x, atom1.offset.y, atom1.offset.z);
    const pos2 = boardToScenePosition(atom2.offset.x, atom2.offset.y, atom2.offset.z);

    const x1 = pos1.x + offsetX;
    const y1 = pos1.y + offsetY;
    const z1 = pos1.z + offsetZ;
    const x2 = pos2.x + offsetX;
    const y2 = pos2.y + offsetY;
    const z2 = pos2.z + offsetZ;

    // Calculate distance and direction
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Connector radius is 20% of sphere diameter = 0.2 * 2 * SPHERE_RADIUS
    const connectorRadius = 0.2 * 2 * SPHERE_RADIUS;

    // Create cylinder geometry
    const geometry = new THREE.CylinderGeometry(connectorRadius, connectorRadius, distance, 8);
    const cylinder = new THREE.Mesh(geometry, material);

    // Position cylinder at midpoint between atoms
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const midZ = (z1 + z2) / 2;
    cylinder.position.set(midX, midY, midZ);

    // Rotate cylinder to align with the direction between atoms
    // The cylinder's default orientation is along Y-axis, so we need to rotate it
    const direction = new THREE.Vector3(dx, dy, dz).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, direction);
    cylinder.quaternion.copy(quaternion);

    return cylinder;
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

    // Add connectors between adjacent atoms
    for (let i = 0; i < piece.nodes.length; i++) {
        for (let j = i + 1; j < piece.nodes.length; j++) {
            if (areAdjacent(piece.nodes[i], piece.nodes[j])) {
                const connector = createConnector(
                    material,
                    piece.nodes[i],
                    piece.nodes[j],
                    offsetX,
                    0,
                    offsetZ
                );
                scene.add(connector);
            }
        }
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

