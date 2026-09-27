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
import { buildSites, siteName } from './sites.js';
import { buildCars } from './cars.js';
import { createWalkers } from './walkers.js';
import { createSignals } from './signals.js';
import { createCamera } from './photo.js';
import { describe, createWatcher } from './spotter.js';
import { createSubs } from './subs.js';
import { createTable } from './table.js';
import { newGame, loadGame, saveGame, hasSave, clearSave, addPhoto } from './game.js';
import { endDay } from './dayend.js';
import { bestAt } from './people.js';

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

  // The world's contents: what every building holds, who's out there.
  const sites = buildSites(data.buildings, data.places);
  const saved = hasSave() ? loadGame(sites) : null;
  let game = saved ?? newGame(sites);
  const cars = buildCars(sites, terrain);
  scene.add(cars);
  const walkers = createWalkers(terrain);
  scene.add(walkers.mesh);
  const signals = createSignals(terrain);
  scene.add(signals.group);
  const populate = () => { walkers.populate(sites, game.threat, game.day, game.seed); signals.populate(sites); };
  populate();

  const drone = createDrone(terrain, reducedMotion);
  scene.add(drone.model);
  const rig = createCameraRig(camera);
  const hud = createHud($('#hud'));
  drone.onMessage(hud.show);

  drone.setCharger((pct) => {
    // The generator burns a can of gas per full charge.
    if (game.res.fuel <= 0) {
      if (!drone.state.noGas) { drone.state.noGas = true; hud.show('Generator\'s out of gas. No charging until tonight.'); }
      return 0;
    }
    game.charge = (game.charge ?? 0) + pct;
    if (game.charge >= 100) { game.charge -= 100; game.res.fuel--; }
    return pct;
  });

  const subs = createSubs($('#subs'));
  const spotter = () => {
    const p = game.crew.find((c) => game.orders[c.id]?.task === 'watch') ?? bestAt(game.crew, 'tech');
    return p ? p.first : 'Radio';
  };
  const watcher = createWatcher((text) => subs.say(spotter(), text));
  const cam = createCamera();
  const flash = $('#flash');
  function takePhoto() {
    const ctx = { drone, tilt: rig.tilt, sites, walkers, cars, signals, terrain };
    const obs = cam.survey(ctx);
    const img = cam.develop(renderer, scene, drone, rig.tilt);
    flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
    const lines = describe(obs, data.roads);
    subs.sayAll(spotter(), lines);
    if (!obs.subject) return;
    addPhoto(game, { site: obs.subject.id, name: siteName(obs.subject, data.roads), day: game.day, img, notes: lines,
      sign: !!obs.sign, x: obs.subject.x, z: obs.subject.z });
    saveGame(game, sites);
  }

  const table = createTable($('#table'), {
    getGame: () => game, sites,
    onClose: () => saveGame(game, sites),
    onEnd: () => {
      endDay(game, sites, data.roads);
      drone.reset();
      drone.state.noGas = false;
      watcher.newDay();
      populate();
      saveGame(game, sites);
    },
    onRestart: () => { clearSave(); location.reload(); },
  });

  const map = createMap($('#map'), groundCanvas, drone, () => {}, () => game.photos);
  const viewBtn = $('#btn-view');
  const actions = {
    map: () => (map.isOpen ? map.close() : (controls.clear(), map.open())),
    view: () => { viewBtn.textContent = rig.toggle() === 'drone' ? 'View' : 'Cam'; },
    home: () => drone.goHome(),
    warp: () => drone.warp(),
    photo: () => { if (!map.isOpen && !table.isOpen) takePhoto(); },
    house: () => { if (!table.isOpen) { controls.clear(); if (map.isOpen) map.close(); table.open(); } },
  };
  const controls = createControls($('#hud'), actions);
  $('#btn-map').onclick = actions.map;
  viewBtn.onclick = actions.view;
  $('#btn-home').onclick = actions.home;
  const warpBtn = $('#btn-warp');
  warpBtn.onclick = actions.warp;
  $('#btn-photo').onclick = actions.photo;
  $('#btn-house').onclick = actions.house;
  let clock = 0;
  // Handle for scripted tests (index.html?debug).
  if (new URLSearchParams(location.search).has('debug')) window.survivors = { get game() { return game; }, drone, sites, actions };

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const input = map.isOpen || table.isOpen ? { fwd: 0, strafe: 0, climb: 0, yaw: 0, tilt: 0 } : controls.read();
    drone.update(dt, input);
    clock += dt;
    if (table.isOpen) {
      // Nothing to draw behind the table.
    } else if (map.isOpen) {
      map.draw();
    } else {
      forest.update(drone.state.pos.x, drone.state.pos.z);
      walkers.update(dt, drone);
      signals.update(dt, drone);
      watcher.update(clock, { drone, walkers, signals, photo: cam, tilt: rig.tilt, threat: game.threat });
      rig.update(dt, drone, input);
      hud.update(drone, rig);
      warpBtn.hidden = !drone.canWarp();
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }

  launch.disabled = false;
  launch.textContent = saved ? `Continue, day ${game.day}` : 'Launch drone';
  $('#restart').hidden = !saved;
  $('#restart').onclick = () => { clearSave(); location.reload(); };
  launch.onclick = () => {
    $('#title').hidden = true;
    $('#hud').hidden = false;
    if (game.over) table.open('journal');
    else if (!saved) {
      hud.show('Press R or ▲ to take off. Map to pick a spot.');
      subs.say(spotter(), 'Take it up and look around. Get pictures of anything worth going to. I\'ll tell you what I see.');
    }
    last = performance.now();
    requestAnimationFrame(frame);
  };
  // Draw one frame behind the title so the world is ready.
  forest.update(drone.state.pos.x, drone.state.pos.z);
  walkers.update(0, drone);
  rig.update(0, drone, controls.read());
  renderer.render(scene, camera);
}

init().catch((err) => {
  console.error(err);
  launch.textContent = 'Could not load the map';
});
