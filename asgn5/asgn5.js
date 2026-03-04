import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(0, 8, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const cubeTextureLoader = new THREE.CubeTextureLoader();
const skyboxTexture = cubeTextureLoader.load([
    'resources/images/skybox/skybox_left.png',
    'resources/images/skybox/skybox_right.png',
    'resources/images/skybox/skybox_up.png',
    'resources/images/skybox/skybox_down.png',
    'resources/images/skybox/skybox_front.png',
    'resources/images/skybox/skybox_back.png',
]);
scene.background = skyboxTexture;

const sunLight = new THREE.DirectionalLight(0xfff4cc, 8);
sunLight.position.set(0, 10, 150);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x224466, 1.2);
fillLight.position.set(-40, -20, 30);
scene.add(fillLight);

const hemisphereLight = new THREE.HemisphereLight(0x112244, 0x221100, 1.5);
scene.add(hemisphereLight);

const pointLight = new THREE.PointLight(0xff00ff, 80, 40);
pointLight.position.set(0, 5, 0);
scene.add(pointLight);

const loader = new THREE.TextureLoader();
function loadColorTexture(path) {
    const texture = loader.load(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

const metalMat   = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.8, roughness: 0.3 });
const glowMat    = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.6 });
const redMat     = new THREE.MeshStandardMaterial({ color: 0xff2222 });
const orangeMat  = new THREE.MeshStandardMaterial({ color: 0xff8800 });
const purpleMat  = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x440088, emissiveIntensity: 0.3 });
const yellowMat  = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0x886600, emissiveIntensity: 0.2 });
const moonMat    = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 1.0 });
const planetMat  = new THREE.MeshStandardMaterial({ color: 0x4466aa });
const planet2Mat = new THREE.MeshStandardMaterial({ color: 0xcc4400 });
const planet3Mat = new THREE.MeshStandardMaterial({ color: 0x8833cc });
const planet4Mat = new THREE.MeshStandardMaterial({ color: 0x228833 });
const planet5Mat = new THREE.MeshStandardMaterial({ color: 0xaa2244 });
const hullMat    = new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.9, roughness: 0.2 });
const accentMat  = new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.7, roughness: 0.3 });
const engineMat  = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 1.2 });
const noseMat    = new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.95, roughness: 0.1 });

const stripMat   = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0044bb, emissiveIntensity: 0.5 });

let myModel = null;

const crateMat = [
    new THREE.MeshStandardMaterial({ map: loadColorTexture('resources/images/flower-1.jpg') }),
    new THREE.MeshStandardMaterial({ map: loadColorTexture('resources/images/flower-2.jpg') }),
    new THREE.MeshStandardMaterial({ map: loadColorTexture('resources/images/flower-3.jpg') }),
    new THREE.MeshStandardMaterial({ map: loadColorTexture('resources/images/flower-4.jpg') }),
    new THREE.MeshStandardMaterial({ map: loadColorTexture('resources/images/flower-5.jpg') }),
    new THREE.MeshStandardMaterial({ map: loadColorTexture('resources/images/flower-6.jpg') }),
];

const sunMat = new THREE.MeshStandardMaterial({
    color: 0xffee66,
    emissive: 0xffaa00,
    emissiveIntensity: 5.0,
    roughness: 1.0,
});
const sun = new THREE.Mesh(new THREE.SphereGeometry(55, 32, 32), sunMat);
sun.position.set(0, -4, 150);
scene.add(sun);

const coronaMat = new THREE.MeshStandardMaterial({
    color: 0xff8800,
    emissive: 0xff5500,
    emissiveIntensity: 3.0,
    transparent: true,
    opacity: 0.7,
});
[65, 75, 88].forEach((r) => {
    const corona = new THREE.Mesh(new THREE.TorusGeometry(r, 1.5, 8, 64), coronaMat);
    corona.position.set(0, -4, 150);
    corona.rotation.x = Math.PI / 4;
    scene.add(corona);
});

//ship
const hull = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 35, 24), hullMat);
hull.rotation.x = Math.PI / 2;
hull.position.set(0, -4, -2);
scene.add(hull);

const shipNose = new THREE.Mesh(new THREE.ConeGeometry(5, 12, 24), noseMat);
shipNose.rotation.x = -Math.PI / 2;
shipNose.position.set(0, -4, -25);
scene.add(shipNose);

[-8, 0, 8].forEach((z) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5.15, 0.18, 8, 24), stripMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -4, z);
    scene.add(ring);
});

const deck = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.4, 30), metalMat);
deck.position.set(0, 1.2, -2);
scene.add(deck);

const trimL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 30), stripMat);
trimL.position.set(-4.7, 1.45, -2);
scene.add(trimL);

const trimR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 30), stripMat);
trimR.position.set(4.7, 1.45, -2);
scene.add(trimR);

const wingL = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 14), accentMat);
wingL.position.set(-11, -3.8, 4);
wingL.rotation.z = 0.1;
scene.add(wingL);

const wingRootL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, 12), accentMat);
wingRootL.position.set(-5.5, -2, 4);
scene.add(wingRootL);

const wingR = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 14), accentMat);
wingR.position.set(11, -3.8, 4);
wingR.rotation.z = -0.1;
scene.add(wingR);

const wingRootR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, 12), accentMat);
wingRootR.position.set(5.5, -2, 4);
scene.add(wingRootR);

const wingTrimL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 14), stripMat);
wingTrimL.position.set(-16.9, -3.5, 4);
scene.add(wingTrimL);

const wingTrimR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 14), stripMat);
wingTrimR.position.set(16.9, -3.5, 4);
scene.add(wingTrimR);

[[-3.5, 0], [3.5, 0], [0, -3.5], [0, 3.5]].forEach(([ox, oz]) => {
    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7, 6), accentMat);
    tailFin.position.set(ox, -7.5, 11 + oz * 0.2);
    scene.add(tailFin);
});

[-3.5, 0, 3.5].forEach((x) => {
    const nozzleOuter = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.9, 2.5, 16), accentMat);
    nozzleOuter.rotation.x = Math.PI / 2;
    nozzleOuter.position.set(x, -4, 15.5);
    scene.add(nozzleOuter);

    const nozzleInner = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, 3, 16), engineMat);
    nozzleInner.rotation.x = Math.PI / 2;
    nozzleInner.position.set(x, -4, 16.8);
    scene.add(nozzleInner);
});

[-10, -3, 5].forEach((z) => {
    [-1, 1].forEach((side) => {
        const px = side * 5.15;
        const porthole = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.12, 8, 16), stripMat);
        porthole.position.set(px, -2, z);
        porthole.rotation.y = Math.PI / 2;
        scene.add(porthole);

        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.52, 16), glowMat);
        glass.position.set(px + side * 0.05, -2, z);
        glass.rotation.y = Math.PI / 2;
        scene.add(glass);
    });
});

const towerBase = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 5), hullMat);
towerBase.position.set(0, 2.8, -3);
scene.add(towerBase);

const towerTop = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 4), accentMat);
towerTop.position.set(0, 4.5, -3);
scene.add(towerTop);

[-0.8, 0, 0.8].forEach((x) => {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), glowMat);
    win.position.set(x, 4.5, -1.01);
    scene.add(win);
});

const dishStand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 8), metalMat);
dishStand.position.set(0, 5.5, -3);
scene.add(dishStand);

const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), stripMat);
dish.position.set(0, 6.1, -3);
dish.rotation.x = Math.PI;
scene.add(dish);

[[-3.5, -10], [3.5, -10], [-3.5, -2], [3.5, -2], [-3.5, 6], [3.5, 6]].forEach(([x, z]) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.5, 8), metalMat);
    pillar.position.set(x, 3.2, z);
    scene.add(pillar);

    const tipLight = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), stripMat);
    tipLight.position.set(x, 5.0, z);
    scene.add(tipLight);
});

const core = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), glowMat);
core.position.set(0, 3.5, 4);
scene.add(core);

const coreRing = new THREE.Mesh(new THREE.TorusGeometry(2, 0.08, 8, 48), glowMat);
coreRing.position.set(0, 3.5, 4);
scene.add(coreRing);

const coreRing2 = new THREE.Mesh(new THREE.TorusGeometry(2, 0.08, 8, 48), purpleMat);
coreRing2.position.set(0, 3.5, 4);
coreRing2.rotation.x = Math.PI / 2;
scene.add(coreRing2);

const cubes = [];
[[-3, 1.7, 8], [-3, 2.8, 8], [3, 1.7, 8], [-3, 1.7, -10], [3, 1.7, -10]].forEach(([x, y, z]) => {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), crateMat);
    crate.position.set(x, y, z);
    scene.add(crate);
    cubes.push(crate);
});

const crystals = [];
[[-4, 1.7, 5], [4, 1.7, 5], [0, 1.7, -8], [-4, 1.7, -1], [4, 1.7, -1]].forEach(([x, y, z], i) => {
    const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.5),
        [purpleMat, glowMat, yellowMat, redMat, orangeMat][i]
    );
    crystal.position.set(x, y + 0.5, z);
    scene.add(crystal);
    crystals.push(crystal);
});

const artifact = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9), purpleMat);
artifact.position.set(0, 7, 4);
scene.add(artifact);

function makeRocket(x, y, z, tiltX, tiltZ, noseColor, finColor) {
    const group = new THREE.Group();

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 4, 16), metalMat);
    group.add(body);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 16), noseColor);
    nose.position.set(0, 2.75, 0);
    group.add(nose);

    [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2].forEach((angle) => {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.8), finColor);
        fin.position.set(Math.sin(angle) * 0.65, -1.4, Math.cos(angle) * 0.65);
        fin.rotation.y = angle;
        group.add(fin);
    });

    group.position.set(x, y, z);
    group.rotation.x = tiltX;
    group.rotation.z = tiltZ;
    scene.add(group);
}

makeRocket(25,  0,  8,  -0.2,  0.30, redMat,    orangeMat);
makeRocket(45, 20, -20, -0.6, -0.20, purpleMat, glowMat);
makeRocket(-28,  8,  5, -0.3, -0.40, yellowMat, redMat);
makeRocket(-50, 30, -15, -0.8,  0.10, glowMat,   purpleMat);
makeRocket(8,  -2, 22,   0.5, -0.10, orangeMat, metalMat);

const planet1 = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 32), planetMat);
planet1.position.set(-80, 2, -80);
scene.add(planet1);

const planet1Ring = new THREE.Mesh(new THREE.TorusGeometry(8, 0.25, 8, 64), yellowMat);
planet1Ring.position.set(-80, 2, -80);
planet1Ring.rotation.x = Math.PI / 3;
scene.add(planet1Ring);

const moon1 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), moonMat);
moon1.position.set(-68, 2, -80);
scene.add(moon1);

const planet2 = new THREE.Mesh(new THREE.SphereGeometry(4, 32, 32), planet2Mat);
planet2.position.set(90, 25, -70);
scene.add(planet2);

const planet2Ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.18, 8, 64), orangeMat);
planet2Ring.position.set(90, 25, -70);
planet2Ring.rotation.x = Math.PI / 4;
scene.add(planet2Ring);

const moon2 = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), moonMat);
moon2.position.set(100, 25, -70);
scene.add(moon2);

const planet3 = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), planet3Mat);
planet3.position.set(5, 60, -120);
scene.add(planet3);

const planet4 = new THREE.Mesh(new THREE.SphereGeometry(7, 32, 32), planet4Mat);
planet4.position.set(120, -10, -90);
scene.add(planet4);

const planet4Ring = new THREE.Mesh(new THREE.TorusGeometry(10, 0.3, 8, 64), glowMat);
planet4Ring.position.set(120, -10, -90);
planet4Ring.rotation.x = Math.PI / 5;
scene.add(planet4Ring);

const planet5 = new THREE.Mesh(new THREE.SphereGeometry(2.5, 32, 32), planet5Mat);
planet5.position.set(-50, 45, -70);
scene.add(planet5);

const asteroids = [];
[
    [22, 10, -18], [-25, 8, -12], [28, -3, -25],
    [-15, 14, -30], [12, 16, -22], [-30, 3, -20],
    [18, 20, -35]
].forEach(([x, y, z]) => {
    const asteroid = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.4 + Math.random() * 0.5, 0),
        moonMat
    );
    asteroid.position.set(x, y, z);
    scene.add(asteroid);
    asteroids.push(asteroid);
});


const gltfLoader = new GLTFLoader();
gltfLoader.load('models/scene.gltf', (gltf) => {
    const model = gltf.scene;
    myModel = model; 
    
    scene.add(model);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    model.position.set(-20, 20, 20);
    model.scale.set(10, 10, 10);
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 2, 0);
controls.update();

const keys = {};
document.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup',   (e) => keys[e.key.toLowerCase()] = false);
const moveSpeed = 0.15;

function handleMovement() {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const right = new THREE.Vector3();
    right.crossVectors(direction, camera.up).normalize();
    if (keys['w']) camera.position.addScaledVector(direction,  moveSpeed);
    if (keys['s']) camera.position.addScaledVector(direction, -moveSpeed);
    if (keys['a']) camera.position.addScaledVector(right,     -moveSpeed);
    if (keys['d']) camera.position.addScaledVector(right,      moveSpeed);
    controls.target.addScaledVector(direction, keys['w'] ? moveSpeed : keys['s'] ? -moveSpeed : 0);
    controls.target.addScaledVector(right,     keys['d'] ? moveSpeed : keys['a'] ? -moveSpeed : 0);
}

function animate(time) {
    const t = time * 0.001;

    cubes.forEach((cube, i) => { cube.rotation.y = t * 0.5 + i; });

    core.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
    coreRing.rotation.z  = t * 0.8;
    coreRing2.rotation.y = t * 1.2;

    if (myModel) {
        myModel.rotation.y += 0.03; 

    }

    crystals.forEach((c, i) => {
        c.rotation.y = t + i * 1.2;
        c.position.y = 2.2 + Math.sin(t * 1.5 + i) * 0.25;
    });

    artifact.rotation.y  = t * 0.5;
    artifact.position.y  = 7 + Math.sin(t) * 0.4;

    sun.scale.setScalar(1 + Math.sin(t * 0.5) * 0.02);

    moon1.position.x = -80 + Math.cos(t * 0.4) * 14;
    moon1.position.z = -80 + Math.sin(t * 0.4) * 14;
    moon2.position.x =  90 + Math.cos(t * 0.3) * 12;
    moon2.position.z = -70 + Math.sin(t * 0.3) * 12;

    planet1Ring.rotation.z = t * 0.2;
    planet2Ring.rotation.z = t * 0.15;
    planet4Ring.rotation.z = t * 0.1;

    asteroids.forEach((a, i) => {
        a.rotation.x = t * 0.3 + i;
        a.rotation.y = t * 0.5 + i;
    });

    handleMovement();
    controls.update();
    renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);