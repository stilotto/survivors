// Things happening far off that anyone can see, from the drone or from a
// window: smoke rising from a few burning places each day, and now and
// then a military jet or helicopter crossing the sky.
import * as THREE from 'three';
import { rng } from './rng.js';

const PUFFS = 30, LIFE = 60; // sprites per plume, seconds each one lives
const RISE = 8; // m/s
const WIND = { x: 3, z: 1.2 }; // drift, m/s at the top of the plume

function puffTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const gray = (c) => new THREE.MeshLambertMaterial({ color: c });

function jet() {
  const g = new THREE.Group(), m = gray(0x5a5e60);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 16, 8).rotateX(Math.PI / 2), m));
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11, 0.25, 4), m);
  wing.position.z = 1;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.2, 2), m);
  tail.position.z = 7;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 2.2), m);
  fin.position.set(0, 1.5, 7);
  g.add(wing, tail, fin);
  return g;
}

function helicopter() {
  const g = new THREE.Group(), m = gray(0x4a4f3a);
  g.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 6), m));
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 7), m);
  boom.position.set(0, 0.6, 6);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(15, 0.1, 0.5), gray(0x262826));
  rotor.position.y = 1.6;
  const rotor2 = rotor.clone();
  rotor2.rotation.y = Math.PI / 2;
  const hub = new THREE.Group();
  hub.add(rotor, rotor2);
  g.add(boom, hub);
  g.userData.rotor = hub;
  return g;
}

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
// Compass word for a direction in world space (x east, z south).
export function compass(dx, dz) {
  const a = Math.atan2(dx, -dz); // 0 = north, clockwise
  return COMPASS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
}

export function createAmbient(terrain, reducedMotion) {
  const group = new THREE.Group();
  const tex = puffTexture();
  let plumes = [];
  let craft = null, wait = 30 + Math.random() * 60;
  let seen = () => {};
  const models = { jet: jet(), helicopter: helicopter() };
  for (const m of Object.values(models)) { m.visible = false; group.add(m); }

  // Picks the day's fires: a few buildings well away from the house.
  function populate(sites, day, seed) {
    for (const p of plumes) group.remove(p.group);
    plumes = [];
    const r = rng(seed, day, 9);
    const far = sites.filter((s) => { const d = Math.hypot(s.x, s.z); return d > 1200 && d < 5500; });
    const count = far.length ? 2 + Math.floor(r() * 3) : 0;
    for (let i = 0; i < count; i++) {
      const s = far[Math.floor(r() * far.length)];
      const p = { x: s.x, z: s.z, y: terrain.heightAt(s.x, s.z) + 4, size: 0.7 + r() * 0.6, group: new THREE.Group(), puffs: [] };
      for (let k = 0; k < PUFFS; k++) {
        const mat = new THREE.SpriteMaterial({ map: tex, color: 0x3c3a36, transparent: true, depthWrite: false });
        const sp = new THREE.Sprite(mat);
        p.puffs.push({ sp, age: (k / PUFFS) * LIFE, jx: r() - 0.5, jz: r() - 0.5 });
        p.group.add(sp);
      }
      plumes.push(p);
      group.add(p.group);
    }
    updatePlumes(0);
  }

  function updatePlumes(dt) {
    for (const p of plumes) {
      for (const f of p.puffs) {
        f.age = (f.age + dt) % LIFE;
        const t = f.age / LIFE;
        const h = f.age * RISE * p.size;
        f.sp.position.set(p.x + f.jx * 15 + WIND.x * f.age * t, p.y + h, p.z + f.jz * 15 + WIND.z * f.age * t);
        const s = (20 + t * 150) * p.size;
        f.sp.scale.set(s, s, 1);
        // Dark at the fire, lighter and thinner as it spreads.
        f.sp.material.opacity = Math.min(1, t * 12) * (1 - t) * 0.9;
        f.sp.material.color.setScalar(0.12 + t * 0.3);
      }
    }
  }

  // A jet or helicopter on a straight line across the map, passing near the house.
  function launch() {
    const kind = Math.random() < 0.55 ? 'jet' : 'helicopter';
    const a = Math.random() * Math.PI * 2, off = (Math.random() - 0.5) * 3000;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(off);
    const half = kind === 'jet' ? 9000 : 4000;
    const y = kind === 'jet' ? 300 + Math.random() * 250 : 90 + Math.random() * 90;
    craft = { kind, model: models[kind], dir, from: side.clone().addScaledVector(dir, -half), t: 0,
      len: half * 2, speed: kind === 'jet' ? 240 : 55, y: terrain.heightAt(0, 0) + y, told: false };
    craft.model.visible = true;
    craft.model.rotation.y = Math.atan2(-dir.x, -dir.z);
  }

  function updateCraft(dt) {
    if (!craft) {
      if ((wait -= dt) <= 0) launch();
      return;
    }
    craft.t += craft.speed * dt;
    const p = craft.from.clone().addScaledVector(craft.dir, craft.t);
    craft.model.position.set(p.x, craft.y, p.z);
    if (craft.model.userData.rotor && !reducedMotion) craft.model.userData.rotor.rotation.y += dt * 25;
    if (!craft.told && Math.hypot(p.x, p.z) < 3000) {
      craft.told = true;
      seen(craft.kind, compass(craft.dir.x, craft.dir.z), compass(p.x, p.z));
    }
    if (craft.t > craft.len) {
      craft.model.visible = false;
      craft = null;
      wait = 90 + Math.random() * 150;
    }
  }

  return {
    group, populate,
    update(dt) { updatePlumes(dt); updateCraft(dt); },
    // fn(kind, heading, where): an aircraft has come within sight of the house.
    onSighting(fn) { seen = fn; },
    get plumes() { return plumes.map(({ x, z }) => ({ x, z })); },
  };
}
