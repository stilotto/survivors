// Building blocks for the farmhouse: materials, siding, windows, doors.
import * as THREE from 'three';

const BOARD = 0.2; // clapboard exposure, meters

function sidingTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, '#ebe8df');
  g.addColorStop(0.85, '#dcd8cc');
  g.addColorStop(1, '#9a958a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const siding = sidingTexture();
const lambert = (color) => new THREE.MeshLambertMaterial({ color });

export const MAT = {
  trim: lambert(0x3a3834),
  roof: lambert(0x3a3936),
  stone: lambert(0x7d7a72),
  brick: lambert(0x7a4032),
  glass: lambert(0x1c2226),
  wood: lambert(0x857563),
  door: lambert(0x5b4636),
  lattice: lambert(0x55504a),
};

// Siding for a box wall of the given height (box UVs span 0..1 per face).
export function sidingBox(height) {
  const map = siding.clone();
  map.repeat.set(1, height / BOARD);
  return new THREE.MeshLambertMaterial({ map });
}

// Siding for extruded shapes, whose cap UVs are in meters.
export const sidingMeters = (() => {
  const map = siding.clone();
  map.repeat.set(1, 1 / BOARD);
  return new THREE.MeshLambertMaterial({ map });
})();

export function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// A double-hung window centered at (x, y) on a wall. `face` is the outward
// normal: 'x+', 'x-', 'z+' or 'z-'. The wall surface is at `at`.
export function windowAt(face, at, u, y, w = 0.75, h = 1.6) {
  const g = new THREE.Group();
  g.add(box(w + 0.2, h + 0.2, 0.08, MAT.trim, 0, 0, 0.04));
  g.add(box(w, h, 0.1, MAT.glass, 0, 0, 0.06));
  g.add(box(w, 0.06, 0.12, MAT.trim, 0, 0, 0.07)); // meeting rail
  g.add(box(0.05, h, 0.12, MAT.trim, 0, 0, 0.07)); // muntin
  g.add(box(w + 0.3, 0.07, 0.16, MAT.trim, 0, -h / 2 - 0.12, 0.08)); // sill
  return place(g, face, at, u, y);
}

export function doorAt(face, at, u, y, w = 1, h = 2.1) {
  const g = new THREE.Group();
  g.add(box(w + 0.24, h + 0.12, 0.08, MAT.trim, 0, 0.06, 0.04));
  g.add(box(w, h, 0.1, MAT.door, 0, 0, 0.06));
  g.add(box(w * 0.6, h * 0.3, 0.12, MAT.glass, 0, h * 0.22, 0.06));
  return place(g, face, at, u, y + h / 2);
}

function place(g, face, at, u, y) {
  const rot = { 'z+': 0, 'x+': Math.PI / 2, 'z-': Math.PI, 'x-': -Math.PI / 2 }[face];
  g.rotation.y = rot;
  if (face[0] === 'z') g.position.set(u, y, face[1] === '+' ? at : -at);
  else g.position.set(face[1] === '+' ? at : -at, y, u);
  return g;
}

// A gable-end wall triangle of the given base width and rise, in the x/y
// plane, extruded `depth` along z.
export function gableWall(width, rise, depth, mat = sidingMeters) {
  const shape = new THREE.Shape([
    new THREE.Vector2(-width / 2, 0), new THREE.Vector2(width / 2, 0), new THREE.Vector2(0, rise),
  ]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geo, mat);
}

// A gable roof of two slabs, ridge along local x. `span` is the wall depth
// under it; the group's origin sits at the eave line, centered.
export function gableRoof(len, span, rise, overhang = 0.4, mat = MAT.roof) {
  const g = new THREE.Group();
  const a = Math.atan2(rise, span / 2);
  const L = Math.hypot(rise, span / 2) + overhang, t = 0.15;
  for (const s of [1, -1]) {
    const slab = box(len + 2 * overhang, t, L, mat,
      0, rise - (L / 2) * Math.sin(a) + (t / 2) * Math.cos(a), s * ((L / 2) * Math.cos(a) + (t / 2) * Math.sin(a)));
    slab.rotation.x = s * a;
    g.add(slab);
  }
  return g;
}
