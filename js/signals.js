// Signs of people still alive: a bedsheet spread on the grass with a word
// painted on it, and, when they hear the drone, someone who comes out and
// waves. Nothing is labeled; you have to notice it.
import * as THREE from 'three';
import { figureGeometry, armGeometry } from './figure.js';
import { rng, pickOne } from './rng.js';

const WORDS = ['HELP', 'HELP', 'SOS', 'ALIVE', 'HELP US', '3 INSIDE'];
const HEAR_RANGE = 300;

function sheetTexture(word, r) {
  const c = Object.assign(document.createElement('canvas'), { width: 256, height: 112 });
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 256, 112);
  g.addColorStop(0, '#e8e6dc'); g.addColorStop(0.5, '#f4f2ea'); g.addColorStop(1, '#dcd9cc');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 112);
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(r() * 256, 0); ctx.lineTo(r() * 256, 112); ctx.stroke(); }
  ctx.fillStyle = r() < 0.5 ? '#8a1c14' : '#1c1a18';
  ctx.font = `bold ${word.length > 5 ? 42 : 64}px Impact, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const step = 220 / word.length;
  [...word].forEach((ch, i) => {
    ctx.save();
    ctx.translate(18 + step * (i + 0.5), 58 + (r() - 0.5) * 8);
    ctx.rotate((r() - 0.5) * 0.15);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createSignals(terrain) {
  const group = new THREE.Group();
  const body = figureGeometry(false), arm = armGeometry();
  let list = [];

  function populate(sites) {
    for (const s of list) group.remove(s.sheet, s.person);
    list = [];
    for (const site of sites) {
      if (!site.people) continue;
      const r = rng(site.id, 21);
      const a = r() * Math.PI * 2, d = site.radius + 5;
      const x = site.x + Math.cos(a) * d, z = site.z + Math.sin(a) * d;
      const word = pickOne(WORDS, r);
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.6),
        new THREE.MeshLambertMaterial({ map: sheetTexture(word, r), polygonOffset: true, polygonOffsetFactor: -2 }));
      // Lie flat, following the slope of the ground.
      const h = (dx, dz) => terrain.surfaceAt(x + dx, z + dz);
      sheet.rotation.set(-Math.PI / 2 + Math.atan2(h(0, 1.3) - h(0, -1.3), 2.6), 0, 0, 'YXZ');
      sheet.rotation.y = r() * 0.6 - 0.3;
      sheet.position.set(x, h(0, 0) + 0.08, z);
      const person = new THREE.Group();
      const shirt = new THREE.MeshLambertMaterial({ vertexColors: true, color: pickOne([0xb03a2e, 0x2e5a88, 0xc9a13a, 0x3a7a4a], r) });
      person.add(new THREE.Mesh(body, shirt));
      const waving = new THREE.Mesh(arm, shirt);
      waving.position.set(0.27, 1.42, 0);
      person.add(waving);
      person.position.set(x + Math.cos(a) * 3.5, 0, z + Math.sin(a) * 3.5);
      person.position.y = terrain.surfaceAt(person.position.x, person.position.z);
      person.visible = false;
      group.add(sheet, person);
      list.push({ site: site.id, x, z, sheet, person, arm: waving, word, phase: r() * 6 });
    }
  }

  function update(dt, drone) {
    const { pos } = drone.state;
    for (const s of list) {
      const d = Math.hypot(pos.x - s.x, pos.z - s.z);
      s.person.visible = d < HEAR_RANGE && drone.state.mode !== 'landed';
      if (!s.person.visible) continue;
      s.phase += dt * 5;
      s.person.rotation.y = Math.atan2(pos.x - s.person.position.x, pos.z - s.person.position.z) + Math.PI;
      s.arm.rotation.z = Math.PI - 0.5 + Math.sin(s.phase) * 0.5;
    }
  }

  return { group, populate, update, get list() { return list; } };
}
