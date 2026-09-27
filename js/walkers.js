// The dead, drawn as instanced figures with jointed legs, arms and heads,
// each moving in one of several gaits (see gaits.js). They drift around the
// buildings they were counted at, gather in the woods around the farmhouse
// as the house draws them in, and turn to follow the drone if it flies low.
import * as THREE from 'three';
import { CLOTHES } from './figure.js';
import { GAITS, pickGait, pose } from './gaits.js';
import { rng } from './rng.js';

const MAX = 6000;
const ACTIVE_RANGE = 650; // meters from the drone; farther ones are too small to see
const NOTICE_AGL = 20, NOTICE_RANGE = 45;
const PANTS = [0x3a3a40, 0x4a4238, 0x2e3440, 0x55504a, 0x3c3228];
const SKIN = 0x8a9080;

// A box hanging from (or standing on) its joint at the origin.
const limb = (w, h, d, cy) => new THREE.BoxGeometry(w, h, d).translate(0, cy, 0);

export function createWalkers(terrain) {
  const group = new THREE.Group();
  const part = (geo, color) => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color }), MAX);
    m.frustumCulled = false;
    m.count = 0;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(m);
    return m;
  };
  const torso = part(limb(0.42, 0.62, 0.24, 0.31), 0xffffff);
  const head = part(limb(0.2, 0.24, 0.22, 0.12), SKIN);
  const legL = part(limb(0.16, 0.85, 0.18, -0.425), 0xffffff);
  const legR = part(limb(0.16, 0.85, 0.18, -0.425), 0xffffff);
  const armL = part(limb(0.1, 0.6, 0.1, -0.3), 0xffffff);
  const armR = part(limb(0.1, 0.6, 0.1, -0.3), 0xffffff);
  const cloth = [torso, armL, armR], pants = [legL, legR];
  const color = new THREE.Color();
  for (const m of [...cloth, ...pants]) m.setColorAt(0, color.setHex(0xffffff));

  let w = [];
  let active = [];
  let recheck = 0, clock = 0;
  const o = {};
  const pelvis = new THREE.Matrix4(), body = new THREE.Matrix4(), local = new THREE.Matrix4(), out = new THREE.Matrix4();
  const e = new THREE.Euler();

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
    const gait = pickGait(r());
    w.push({ x, z, hx, hz, hr, spread, tx: x, tz: z, gait, speed: GAITS[gait].speed * (0.8 + r() * 0.4),
      pause: r() * 6, yaw: r() * Math.PI * 2, ph: r() * 10, seed: r(), site,
      cloth: color.setHex(CLOTHES[Math.floor(r() * CLOTHES.length)]).toArray(),
      pants: color.setHex(PANTS[Math.floor(r() * PANTS.length)]).toArray() });
  }

  function pickTarget(k, r) {
    // Shuffle around the building rather than through it.
    const a = Math.atan2(k.z - k.hz, k.x - k.hx) + (r - 0.5) * 1.6;
    const d = k.hr + Math.random() * k.spread;
    k.tx = k.hx + Math.cos(a) * d;
    k.tz = k.hz + Math.sin(a) * d;
  }

  // out = parent * translate(x, y, z) * rotZ(rz) * rotX(rx), written to slot n.
  function joint(mesh, n, parent, x, y, z, rx, rz) {
    local.makeRotationFromEuler(e.set(rx, 0, rz, 'ZXY')).setPosition(x, y, z);
    out.multiplyMatrices(parent, local).toArray(mesh.instanceMatrix.array, n * 16);
  }

  function update(dt, drone) {
    const { pos } = drone.state;
    const agl = pos.y - drone.groundBelow();
    clock += dt;
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
      else moving = true;

      pose(o, k, moving, k.noticed, clock);
      if (moving) {
        const speed = k.speed * (k.noticed ? 1.5 : 1);
        const v = Math.min(d, speed * o.pace * dt);
        k.x += dx / d * v; k.z += dz / d * v;
        k.yaw += angleDiff(Math.atan2(-dx, -dz), k.yaw) * Math.min(1, dt * 2);
        // Feet keep time with the ground covered, so they don't skate.
        k.ph += v * Math.PI / GAITS[k.gait].step;
      }

      const y = terrain.surfaceAt(k.x, k.z) + o.hip;
      const cy = Math.cos(k.yaw), sy = Math.sin(k.yaw);
      pelvis.makeRotationFromEuler(e.set(0, k.yaw + o.twist, o.roll, 'YXZ'))
        .setPosition(k.x + cy * o.side, y, k.z - sy * o.side);
      local.makeRotationX(-o.lean);
      body.multiplyMatrices(pelvis, local);
      body.toArray(torso.instanceMatrix.array, n * 16);
      joint(head, n, body, 0, 0.64, 0, -o.nod, o.tilt);
      joint(armL, n, body, -0.27, 0.55, 0, o.armL, -o.splay);
      joint(armR, n, body, 0.27, 0.55, 0, o.armR, o.splay);
      joint(legL, n, pelvis, -0.1, 0, 0, o.legL, 0);
      joint(legR, n, pelvis, 0.1, 0, 0, o.legR, 0);
      for (const m of cloth) m.instanceColor.array.set(k.cloth, n * 3);
      for (const m of pants) m.instanceColor.array.set(k.pants, n * 3);
      n++;
    }
    for (const m of group.children) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  return {
    mesh: group, populate, update,
    // Visits every walker within r meters of (x, z).
    forEachNear(x, z, r, fn) {
      for (const k of w) if (Math.abs(k.x - x) < r && Math.abs(k.z - z) < r) fn(k.x, terrain.surfaceAt(k.x, k.z), k.z, k);
    },
    get noticing() { return active.filter((k) => k.noticed).length; },
    get all() { return w; },
  };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
