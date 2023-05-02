import * as THREE from 'three';
import {OrbitControls}  from 'OrbitControls'

fetch('https://localhost:44377/game/020')
  .then(response => response.json())
  .then(data => {
    console.log(data); // Do something with the data

    
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
var distancej = 3.2;
var distancek = 4;
var spheres = [];

// Set up the material with gray color

for(var i = 0; i<data.length; i++)
{
    var node = data[i];
    if(node.value != "-"){
        var geometry = new THREE.SphereGeometry(radius, 32, 32);
        var material = getMaterial(node.value);
        var sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(
                
                node.y * distancej  + (node.z*1.5),
                node.z * distancek,
                node.x * distancei + (node.y+node.z) * 2
        );
        scene.add(sphere);
    }
}

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
// Render the scene
function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update(); // Update the controls
  }
  render();

  })
  .catch(error => {
    console.error(error);
  });

