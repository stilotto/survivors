// The farmhouse: a simple two-story box with a gable roof, plus a landing pad.
import * as THREE from 'three';
import { HOME, toWorld } from './geo.js';
import { outerRings } from './data.js';

const W = 12, D = 9, H = 7, RIDGE = 3.5;

// True for a footprint on the farmhouse site (within 30 m).
export function nearHouse(geom) {
  return outerRings(geom).some((ring) => ring.some(([lon, lat]) => Math.hypot(...toWorld(lon, lat)) < 30));
}

// Keeps the drone out of the house block, stopping it along the blocked axis.
export function houseCollide(pos, vel, ground) {
  const m = 0.6, hx = W / 2 + m, hz = D / 2 + m, top = ground + H + RIDGE;
  if (pos.y >= top || Math.abs(pos.x) >= hx || Math.abs(pos.z) >= hz) return;
  const ox = hx - Math.abs(pos.x), oz = hz - Math.abs(pos.z), oy = top - pos.y;
  if (oy < ox && oy < oz) { pos.y = top; vel.y = Math.max(vel.y, 0); }
  else if (ox < oz) { pos.x = Math.sign(pos.x || 1) * hx; vel.x = 0; }
  else { pos.z = Math.sign(pos.z || 1) * hz; vel.z = 0; }
}

export function buildHouse(terrain) {
  const group = new THREE.Group();
  const w = W, d = D, h = H, ridge = RIDGE;
  const ground = terrain.heightAt(0, 0);

  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h + 2, d),
    new THREE.MeshLambertMaterial({ color: 0xd8d2c2 }));
  walls.position.y = ground + h / 2 - 1;

  const roofShape = new THREE.Shape([
    new THREE.Vector2(-d / 2 - 0.5, 0), new THREE.Vector2(d / 2 + 0.5, 0), new THREE.Vector2(0, ridge),
  ]);
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: w + 1, bevelEnabled: false });
  roofGeo.translate(0, 0, -(w + 1) / 2);
  const roof = new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0x3b3a38 }));
  roof.rotation.y = Math.PI / 2;
  roof.position.y = ground + h;

  const porch = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, 3),
    new THREE.MeshLambertMaterial({ color: 0x8a7a62 }));
  porch.position.set(0, ground + 0.6, d / 2 + 1.5);

  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24),
    new THREE.MeshLambertMaterial({ color: 0xd9c38a }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(HOME.x, terrain.heightAt(HOME.x, HOME.z) + 0.15, HOME.z);

  group.add(walls, roof, porch, pad);
  return group;
}
