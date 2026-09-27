// The dead, drawn as instanced figures. They drift around the buildings
// they were counted at, gather in the woods around the farmhouse as the
// house draws them in, and turn to follow the drone if it flies low.
import * as THREE from 'three';
import { figureGeometry, CLOTHES } from './figure.js';
import { rng } from './rng.js';

const MAX = 6000;
const ACTIVE_RANGE = 650; // meters from the drone; farther ones are too small to see
const NOTICE_AGL = 20, NOTICE_RANGE = 45;

export function createWalkers(terrain) {
  const mesh = new THREE.InstancedMesh(figureGeometry(true), new THREE.MeshLambertMaterial({ vertexColors: true }), MAX);
  mesh.frustumCulled = false;
  mesh.count = 0;
  const color = new THREE.Color();
  for (let i = 0; i < MAX; i++) mesh.setColorAt(i, color.setHex(CLOTHES[i % CLOTHES.length]));

  let w = []; // { x, z, hx, hz, hr, tx, tz, speed, pause, yaw, phase, site }
  let active = [];
  let recheck = 0;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
  const p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);

  // Lays out every walker for the day: around sites, and around the house.
  function populate(sites, threat, day, seed) {
    w = [];
    const r = rng(seed, day, 5);
    for (const s of sites) {
      for (let i = 0; i < s.zombies && w.length < MAX; i++) {
        const a = r() * Math.PI * 2, d = s.radius + 2 + r() * 14;
        add(s.x + Math.cos(a) * d, s.z + Math.sin(a) * d, s.x, s.z, s.radius + 2, 14, s.id, r);
      }
    }
    for (let i = 0; i < Math.round(threat) && w.length < MAX; i++) {
      const a = r() * Math.PI * 2, d = 70 + r() * 150;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      add(x, z, x, z, 0, 20, -1, r);
    }
    recheck = 0;
  }

  function add(x, z, hx, hz, hr, spread, site, r) {
    w.push({ x, z, hx, hz, hr, spread, tx: x, tz: z, speed: 0.3 + r() * 0.35, pause: r() * 6,
      yaw: r() * Math.PI * 2, phase: r() * 10, site, lean: 0.1 + r() * 0.2 });
  }

  function pickTarget(k, r) {
    // Shuffle around the building rather than through it.
    const a = Math.atan2(k.z - k.hz, k.x - k.hx) + (r - 0.5) * 1.6;
    const d = k.hr + Math.random() * k.spread;
    k.tx = k.hx + Math.cos(a) * d;
    k.tz = k.hz + Math.sin(a) * d;
  }

  function update(dt, drone) {
    const { pos } = drone.state;
    const agl = pos.y - drone.groundBelow();
    if ((recheck -= dt) <= 0) {
      recheck = 0.5;
      active = w.filter((k) => Math.abs(k.x - pos.x) < ACTIVE_RANGE && Math.abs(k.z - pos.z) < ACTIVE_RANGE);
    }
    let n = 0;
    for (const k of active) {
      const toDrone = Math.hypot(pos.x - k.x, pos.z - k.z);
      k.noticed = agl < NOTICE_AGL && toDrone < NOTICE_RANGE && drone.state.mode !== 'landed';
      if (k.noticed) { k.tx = pos.x; k.tz = pos.z; k.pause = 0; }
      const dx = k.tx - k.x, dz = k.tz - k.z, d = Math.hypot(dx, dz);
      let moving = false;
      if (k.pause > 0) k.pause -= dt;
      else if (d < 0.5) { k.pause = 2 + Math.random() * 7; pickTarget(k, Math.random()); }
      else {
        const v = Math.min(d, k.speed * (k.noticed ? 1.6 : 1) * dt);
        k.x += dx / d * v; k.z += dz / d * v;
        k.yaw += angleDiff(Math.atan2(-dx, -dz), k.yaw) * Math.min(1, dt * 2);
        k.phase += dt * k.speed * 7;
        moving = true;
      }
      p.set(k.x, terrain.surfaceAt(k.x, k.z) + (moving ? Math.abs(Math.sin(k.phase)) * 0.04 : 0), k.z);
      e.set(k.lean + (k.noticed ? -0.35 : 0), k.yaw, moving ? Math.sin(k.phase * 0.5) * 0.08 : 0);
      mesh.setMatrixAt(n++, m.compose(p, q.setFromEuler(e), one));
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    mesh, populate, update,
    // Visits every walker within r meters of (x, z).
    forEachNear(x, z, r, fn) {
      for (const k of w) if (Math.abs(k.x - x) < r && Math.abs(k.z - z) < r) fn(k.x, terrain.surfaceAt(k.x, k.z), k.z, k);
    },
    get noticing() { return active.filter((k) => k.noticed).length; },
  };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
