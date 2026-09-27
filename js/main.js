// Boots the game: loads data, builds the scene, runs the loop.
import * as THREE from 'three';
import { loadTerrain, buildTerrainMesh } from './terrain.js';
import { loadMapData } from './data.js';
import { paintGround, groundTexture } from './ground.js';
import { buildBuildings } from './buildings.js';
import { buildHouse, nearHouse } from './house.js';
import { buildYard } from './yard.js';
import { buildForest } from './forest.js';
import { createDrone } from './drone.js';
import { createControls } from './controls.js';
import { createCameraRig } from './camera.js';
import { createMap } from './map.js';
import { createHud } from './hud.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s) => document.querySelector(s);
const launch = $('#launch');

const renderer = new THREE.WebGLRenderer({ canvas: $('#scene'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const sky = new THREE.Color(0xb8bdb8);
scene.background = sky;
scene.fog = new THREE.Fog(sky, 800, 7000);
scene.add(new THREE.HemisphereLight(0xdfe3e8, 0x4a4a38, 1.6));
const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
sun.position.set(-0.5, 1, 0.35);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 20000);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

async function init() {
  const [terrain, data] = await Promise.all([loadTerrain(), loadMapData()]);
  const small = Math.min(screen.width, screen.height) < 600;
  // Our farmhouse replaces the cabin that stands on the site today.
  data.buildings = data.buildings.filter((f) => !nearHouse(f.geometry));
  const groundCanvas = paintGround(data, small ? 2048 : Math.min(4096, renderer.capabilities.maxTextureSize));
  scene.add(buildTerrainMesh(terrain, groundTexture(groundCanvas, renderer)));
  scene.add(buildBuildings(data.buildings, terrain));
  scene.add(buildHouse(terrain));
  scene.add(buildYard(terrain, data.roads, renderer));
  const forest = buildForest(data, terrain, small ? 0.5 : 1);
  scene.add(forest.group);

  const drone = createDrone(terrain, reducedMotion);
  scene.add(drone.model);
  const rig = createCameraRig(camera);
  const hud = createHud($('#hud'));
  drone.onMessage(hud.show);

  const map = createMap($('#map'), groundCanvas, drone, () => {});
  const viewBtn = $('#btn-view');
  const actions = {
    map: () => (map.isOpen ? map.close() : (controls.clear(), map.open())),
    view: () => { viewBtn.textContent = rig.toggle() === 'drone' ? 'View' : 'Cam'; },
    home: () => drone.goHome(),
    warp: () => drone.warp(),
  };
  const controls = createControls($('#hud'), actions);
  $('#btn-map').onclick = actions.map;
  viewBtn.onclick = actions.view;
  $('#btn-home').onclick = actions.home;
  const warpBtn = $('#btn-warp');
  warpBtn.onclick = actions.warp;

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const input = map.isOpen ? { fwd: 0, strafe: 0, climb: 0, yaw: 0, tilt: 0 } : controls.read();
    drone.update(dt, input);
    forest.update(drone.state.pos.x, drone.state.pos.z);
    if (map.isOpen) {
      map.draw();
    } else {
      rig.update(dt, drone, input);
      hud.update(drone, rig);
      warpBtn.hidden = !drone.canWarp();
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }

  launch.disabled = false;
  launch.textContent = 'Launch drone';
  launch.onclick = () => {
    $('#title').hidden = true;
    $('#hud').hidden = false;
    hud.show('Press R or ▲ to take off. Map to pick a spot.');
    last = performance.now();
    requestAnimationFrame(frame);
  };
  // Draw one frame behind the title so the world is ready.
  forest.update(drone.state.pos.x, drone.state.pos.z);
  rig.update(0, drone, controls.read());
  renderer.render(scene, camera);
}

init().catch((err) => {
  console.error(err);
  launch.textContent = 'Could not load the map';
});
