import * as THREE from 'three';

// Constants
export const SPHERE_RADIUS = 5;
export const MATERIAL_SHININESS = 100;
export const ZOOM_FACTOR = 6;

// Coordinate system constants for hexagonal close packing
const sqrt3 = Math.sqrt(3);
export const distancei = 2 * SPHERE_RADIUS;      // Spacing along x direction (maps to X coordinate)
export const distancej = sqrt3 * SPHERE_RADIUS;  // Spacing along y direction (maps to Y coordinate) = 2r * sin(60°)
export const distancek = sqrt3 * SPHERE_RADIUS;  // Spacing along z direction (maps to Z coordinate/vertical) = 2r * sin(60°)

/**
 * Get material for a piece by its character identifier
 * @param {string} val - The character identifier (A-L)
 * @returns {THREE.MeshPhongMaterial} Material with appropriate color and flat shading
 */
export function getMaterial(val) {
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

/**
 * Convert board coordinates (x, y, z) to 3D scene position
 * @param {number} x - The x coordinate on the board
 * @param {number} y - The y coordinate on the board
 * @param {number} z - The z coordinate on the board
 * @returns {{x: number, y: number, z: number}} Scene position
 */
export function boardToScenePosition(x, y, z) {
    // Hexagonal close packing pattern:
    return {
        x: x * distancei + (y + z) * SPHERE_RADIUS,
        y: y * distancej + z * SPHERE_RADIUS * 0.5,
        z: z * distancek
    };
}

/**
 * Extract x, y, z coordinates from either a Location object or an Atom object
 * @param {Object} obj - Either {x, y, z} Location or {offset: {x, y, z}} Atom
 * @returns {{x: number, y: number, z: number}} Coordinates
 */
function extractCoordinates(obj) {
    if (obj.offset) {
        // It's an Atom object
        return obj.offset;
    }
    // It's a Location object (has x, y, z directly)
    return obj;
}

/**
 * Calculate the 3D distance between two positions in scene coordinates
 * Works with both Location objects and Atom objects
 * @param {Object} pos1 - Location object {x, y, z} or Atom object {offset: {x, y, z}}
 * @param {Object} pos2 - Location object {x, y, z} or Atom object {offset: {x, y, z}}
 * @returns {number} Distance in scene coordinates
 */
export function getPositionDistance(pos1, pos2) {
    const coords1 = extractCoordinates(pos1);
    const coords2 = extractCoordinates(pos2);
    const scenePos1 = boardToScenePosition(coords1.x, coords1.y, coords1.z);
    const scenePos2 = boardToScenePosition(coords2.x, coords2.y, coords2.z);
    const dx = scenePos1.x - scenePos2.x;
    const dy = scenePos1.y - scenePos2.y;
    const dz = scenePos1.z - scenePos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Check if two positions are adjacent (neighbors in the hexagonal close packing)
 * Works with both Location objects and Atom objects
 * @param {Object} pos1 - Location object {x, y, z} or Atom object {offset: {x, y, z}}
 * @param {Object} pos2 - Location object {x, y, z} or Atom object {offset: {x, y, z}}
 * @returns {boolean} True if positions are adjacent
 */
export function arePositionsAdjacent(pos1, pos2) {
    // In hexagonal close packing, adjacent atoms are 2 * SPHERE_RADIUS apart
    // Allow a tolerance for floating point comparison and transformations
    const expectedDistance = 2 * SPHERE_RADIUS;
    const actualDistance = getPositionDistance(pos1, pos2);
    // Increased tolerance to account for floating point precision and transformations
    // (plane transpose, rotations, etc. can cause small variations)
    const tolerance = 1.0;
    return Math.abs(actualDistance - expectedDistance) < tolerance;
}

/**
 * Create a polygonal/faceted sphere with specified material
 * Using IcosahedronGeometry which has 20 triangular faces for a faceted look
 * @param {THREE.Material} material - Material to apply to the sphere
 * @param {number} x - Board x coordinate
 * @param {number} y - Board y coordinate
 * @param {number} z - Board z coordinate
 * @param {number} offsetX - Optional X offset in scene coordinates
 * @param {number} offsetY - Optional Y offset in scene coordinates
 * @param {number} offsetZ - Optional Z offset in scene coordinates
 * @returns {THREE.Mesh} Sphere mesh
 */
export function createSphere(material, x, y, z, offsetX = 0, offsetY = 0, offsetZ = 0) {
    const geometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 1);
    const sphere = new THREE.Mesh(geometry, material);
    const pos = boardToScenePosition(x, y, z);
    sphere.position.set(pos.x + offsetX, pos.y + offsetY, pos.z + offsetZ);
    return sphere;
}

/**
 * Create a connector cylinder between two adjacent positions
 * Works with both Location objects and Atom objects
 * @param {THREE.Material} material - Material to apply to the connector
 * @param {Object} pos1 - Location object {x, y, z} or Atom object {offset: {x, y, z}}
 * @param {Object} pos2 - Location object {x, y, z} or Atom object {offset: {x, y, z}}
 * @param {number} offsetX - Optional X offset in scene coordinates
 * @param {number} offsetY - Optional Y offset in scene coordinates
 * @param {number} offsetZ - Optional Z offset in scene coordinates
 * @returns {THREE.Mesh} Connector cylinder mesh
 */
export function createConnector(material, pos1, pos2, offsetX = 0, offsetY = 0, offsetZ = 0) {
    const coords1 = extractCoordinates(pos1);
    const coords2 = extractCoordinates(pos2);
    const scenePos1 = boardToScenePosition(coords1.x, coords1.y, coords1.z);
    const scenePos2 = boardToScenePosition(coords2.x, coords2.y, coords2.z);

    const x1 = scenePos1.x + offsetX;
    const y1 = scenePos1.y + offsetY;
    const z1 = scenePos1.z + offsetZ;
    const x2 = scenePos2.x + offsetX;
    const y2 = scenePos2.y + offsetY;
    const z2 = scenePos2.z + offsetZ;

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

    // Position cylinder at midpoint between positions
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const midZ = (z1 + z2) / 2;
    cylinder.position.set(midX, midY, midZ);

    // Rotate cylinder to align with the direction between position
    const direction = new THREE.Vector3(dx, dy, dz).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, direction);
    cylinder.quaternion.copy(quaternion);

    return cylinder;
}

/**
 * Set up Three.js scene with lighting
 * @returns {THREE.Scene} Configured scene
 */
export function createScene() {
    const scene = new THREE.Scene();

    // Set a lighter background color for better visibility
    scene.background = new THREE.Color(0x242c38); // Dark blue/gray background instead of black

    // Add ambient light to the scene - increased intensity for better board visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Main directional light - increased intensity
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(0, 10, 20);
    scene.add(dirLight);

    // Add a second directional light from opposite direction to reduce harsh shadows
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-10, -10, 10);
    scene.add(dirLight2);


    return scene;
}

/**
 * Set up orthographic camera
 * @param {number} near - Near clipping plane
 * @param {number} far - Far clipping plane
 * @returns {THREE.OrthographicCamera} Configured camera
 */
export function createOrthographicCamera(near = -500, far = 100) {
    const camera = new THREE.OrthographicCamera(
        window.innerWidth / -ZOOM_FACTOR,
        window.innerWidth / ZOOM_FACTOR,
        window.innerHeight / ZOOM_FACTOR,
        window.innerHeight / -ZOOM_FACTOR,
        near,
        far
    );
    camera.position.set(1, 1, 1);
    camera.up.set(0, 0, 1);
    return camera;
}

/**
 * Update camera for window resize
 * @param {THREE.OrthographicCamera} camera - Camera to update
 */
export function updateCameraOnResize(camera) {
    camera.left = window.innerWidth / -ZOOM_FACTOR;
    camera.right = window.innerWidth / ZOOM_FACTOR;
    camera.top = window.innerHeight / ZOOM_FACTOR;
    camera.bottom = window.innerHeight / -ZOOM_FACTOR;
    camera.updateProjectionMatrix();
}

