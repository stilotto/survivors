// Parked cars and trucks left where their owners abandoned them. They are
// a clue from the air: cars mean gas in the tanks, a full lot means a
// place people ran to.
import * as THREE from 'three';
import { rng } from './rng.js';

const PAINT = [0x8a8d90, 0x2c2e33, 0xd8d8d4, 0x6e2020, 0x2a3c5a, 0x4a5a48, 0x9a8a6a, 0x5c5f62, 0x1e2a22];

function carGeometry() {
  const parts = [[1.8, 0.75, 4.4, 0.55, 0], [1.6, 0.6, 2.3, 1.2, 0.3]];
  const pos = [], nor = [];
  for (const [w, h, d, y, z] of parts) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    g.translate(0, y, z);
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

export function buildCars(sites, terrain) {
  const spots = [];
  for (const s of sites) {
    if (!s.cars) continue;
    const r = rng(s.id, 11);
    const a0 = r() * Math.PI * 2, lot = s.cars > 2;
    for (let i = 0; i < s.cars; i++) {
      // A row in a lot, or a car or two in the drive.
      const a = a0 + (lot ? 0 : (r() - 0.5) * 0.8);
      const d = s.radius + 3 + (lot ? 4 : r() * 2);
      const off = lot ? (i - s.cars / 2) * 2.8 : i * 2.6;
      const x = s.x + Math.cos(a) * d - Math.sin(a) * off, z = s.z + Math.sin(a) * d + Math.cos(a) * off;
      spots.push({ x, z, yaw: -a + (lot ? 0 : (r() - 0.5) * 0.4), color: PAINT[Math.floor(r() * PAINT.length)] });
    }
  }
  const mesh = new THREE.InstancedMesh(carGeometry(), new THREE.MeshLambertMaterial(), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  spots.forEach((s, i) => {
    p.set(s.x, terrain.surfaceAt(s.x, s.z), s.z);
    mesh.setMatrixAt(i, m.compose(p, q.setFromAxisAngle(up, s.yaw), one));
    mesh.setColorAt(i, c.setHex(s.color));
  });
  mesh.userData.spots = spots;
  return mesh;
}
