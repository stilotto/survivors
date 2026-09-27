// The farmhouse, modeled on the film-era house: a plain two-story white
// clapboard block with a low side-gable roof, a flat-roofed porch on the
// front-left, and a lower rear section. Front faces south (+z).
import * as THREE from 'three';
import { HOME, toWorld } from './geo.js';
import { outerRings } from './data.js';
import { MAT, box, sidingBox, windowAt, doorAt, gableWall, gableRoof } from './houseparts.js';

const W = 10, D = 7.5, H = 5.8, RISE = 2; // main block
const BASE = 0.4; // floor height above the ground
const WING = { x0: -4, x1: 2.5, depth: 4.5, h: 4.6, rise: 1.6 }; // rear section
const PORCH = { x0: -7, x1: -0.5, depth: 2.4, h: 2.9 };

// Solid boxes for drone collision, relative to the ground at the house.
const SOLIDS = [
  { x0: -W / 2, x1: W / 2, z0: -D / 2, z1: D / 2, top: BASE + H + RISE },
  { x0: WING.x0, x1: WING.x1, z0: -D / 2 - WING.depth, z1: -D / 2, top: BASE + WING.h + WING.rise },
  { x0: PORCH.x0, x1: PORCH.x1, z0: D / 2, z1: D / 2 + PORCH.depth, top: BASE + PORCH.h + 0.3 },
];

// True for a footprint on the farmhouse site (within 30 m).
export function nearHouse(geom) {
  return outerRings(geom).some((ring) => ring.some(([lon, lat]) => Math.hypot(...toWorld(lon, lat)) < 30));
}

// Keeps the drone out of the house, stopping it along the blocked axis.
export function houseCollide(pos, vel, ground) {
  const m = 0.6;
  for (const s of SOLIDS) {
    const top = ground + s.top;
    const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2;
    const hx = (s.x1 - s.x0) / 2 + m, hz = (s.z1 - s.z0) / 2 + m;
    const dx = pos.x - cx, dz = pos.z - cz;
    if (pos.y >= top || Math.abs(dx) >= hx || Math.abs(dz) >= hz) continue;
    const ox = hx - Math.abs(dx), oz = hz - Math.abs(dz), oy = top - pos.y;
    if (oy < ox && oy < oz) { pos.y = top; vel.y = Math.max(vel.y, 0); }
    else if (ox < oz) { pos.x = cx + Math.sign(dx || 1) * hx; vel.x = 0; }
    else { pos.z = cz + Math.sign(dz || 1) * hz; vel.z = 0; }
  }
}

function mainBlock(b) {
  const g = new THREE.Group();
  g.add(box(W + 0.3, 2 + BASE, D + 0.3, MAT.stone, 0, b - (2 + BASE) / 2, 0));
  g.add(box(W, H, D, sidingBox(H), 0, b + H / 2, 0));
  const gable = gableWall(D, RISE, W);
  gable.rotation.y = Math.PI / 2;
  gable.position.y = b + H;
  const roof = gableRoof(W, D, RISE, 0.35);
  roof.position.y = b + H;
  g.add(gable, roof);
  g.add(box(0.8, RISE + 1.4, 0.8, MAT.brick, 2.6, b + H + (RISE + 1.4) / 2, 0)); // chimney

  const up = b + 4.3, low = b + 1.6;
  for (const x of [-3.2, 1.4, 3.3]) g.add(windowAt('z+', D / 2, x, up));
  for (const x of [-4.2, 1.4, 3.3]) g.add(windowAt('z+', D / 2, x, low));
  g.add(doorAt('z+', D / 2, -2.2, b));
  for (const face of ['x+', 'x-']) {
    for (const z of [2, -1.3]) g.add(windowAt(face, W / 2, z, up), windowAt(face, W / 2, z, low));
    g.add(windowAt(face, W / 2, 0, b + H + 0.8, 0.5, 0.7)); // attic
  }
  for (const x of [-4.5, 3.9]) g.add(windowAt('z-', D / 2, -x, up));
  g.add(windowAt('z-', D / 2, -3.9, low));

  // Sloped cellar doors on the east side.
  const cellar = box(1.2, 0.12, 1.5, MAT.door, W / 2 + 0.55, b - 0.05, -2.3);
  cellar.rotation.z = -0.45;
  g.add(cellar, box(1.2, 0.5, 1.5, MAT.stone, W / 2 + 0.55, b - 0.6, -2.3));
  return g;
}

function rearWing(b) {
  const g = new THREE.Group();
  const w = WING.x1 - WING.x0, cx = (WING.x0 + WING.x1) / 2, cz = -D / 2 - WING.depth / 2;
  const z1 = -D / 2 - WING.depth;
  g.add(box(w + 0.3, 2 + BASE, WING.depth, MAT.stone, cx, b - (2 + BASE) / 2, cz));
  g.add(box(w, WING.h, WING.depth, sidingBox(WING.h), cx, b + WING.h / 2, cz));
  const gable = gableWall(w, WING.rise, WING.depth);
  gable.position.set(cx, b + WING.h, cz);
  const roof = gableRoof(WING.depth + 0.2, w, WING.rise, 0.3);
  roof.rotation.y = Math.PI / 2;
  roof.position.set(cx, b + WING.h, cz - 0.1);
  g.add(gable, roof);

  // Kitchen door and windows. Wing faces sit off the origin, so place by hand.
  const door = doorAt('x+', 0, cz + 0.6, b);
  door.position.x = WING.x1;
  const side = windowAt('x+', 0, cz - 1.2, b + 1.6);
  side.position.x = WING.x1;
  const west = windowAt('x-', 0, cz, b + 1.6);
  west.position.x = WING.x0;
  g.add(door, side, west);
  for (const x of [cx - 1.5, cx + 1.5]) g.add(windowAt('z-', -z1, x, b + 1.6));
  g.add(windowAt('z-', -z1, cx, b + WING.h + 0.5, 0.5, 0.6));
  g.add(box(1.4, 0.2, 1.1, MAT.wood, WING.x1 + 0.55, b - 0.1, cz + 0.6)); // stoop
  return g;
}

function porch(b) {
  const g = new THREE.Group();
  const w = PORCH.x1 - PORCH.x0, cx = (PORCH.x0 + PORCH.x1) / 2;
  const z0 = D / 2, z1 = D / 2 + PORCH.depth, cz = (z0 + z1) / 2;
  g.add(box(w, 0.2, PORCH.depth, MAT.wood, cx, b - 0.1, cz));
  const skirt = BASE + 1.8, sy = b - 0.1 - skirt / 2; // reaches below uneven ground
  g.add(box(w, skirt, 0.1, MAT.lattice, cx, sy, z1 - 0.05));
  g.add(box(0.1, skirt, PORCH.depth, MAT.lattice, PORCH.x0 + 0.05, sy, cz));
  g.add(box(0.1, skirt, PORCH.depth, MAT.lattice, PORCH.x1 - 0.05, sy, cz));
  for (const x of [PORCH.x0 + 0.1, cx - w / 6, cx + w / 6, PORCH.x1 - 0.1]) {
    g.add(box(0.16, PORCH.h, 0.16, MAT.trim, x, b + PORCH.h / 2, z1 - 0.15));
  }
  g.add(box(w + 0.3, 0.25, PORCH.depth + 0.3, MAT.trim, cx, b + PORCH.h + 0.12, cz + 0.15)); // fascia
  g.add(box(w + 0.4, 0.08, PORCH.depth + 0.4, MAT.roof, cx, b + PORCH.h + 0.28, cz + 0.15));
  for (let i = 0; i < 2; i++) { // steps
    g.add(box(1.6, 0.2, 0.35, MAT.wood, -2.2, b - 0.3 - i * 0.2, z1 + 0.18 + i * 0.35));
  }
  return g;
}

export function buildHouse(terrain) {
  const group = new THREE.Group();
  const b = terrain.heightAt(0, 0) + BASE;
  group.add(mainBlock(b), rearWing(b), porch(b));

  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24),
    new THREE.MeshLambertMaterial({ color: 0xd9c38a }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(HOME.x, terrain.heightAt(HOME.x, HOME.z) + 0.15, HOME.z);
  group.add(pad);
  return group;
}
