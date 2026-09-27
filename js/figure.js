// Low-poly people, merged into one geometry with vertex colors so they can
// be drawn by the thousand. Faces -z, feet at y = 0.
import * as THREE from 'three';

const SKIN_DEAD = [0.55, 0.57, 0.5], SKIN = [0.78, 0.62, 0.52], CLOTH = [1, 1, 1], PANTS = [0.55, 0.55, 0.6];

function part(out, w, h, d, x, y, z, color, rx = 0) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  if (rx) g.rotateX(rx);
  g.translate(x, y, z);
  out.pos.push(...g.attributes.position.array);
  out.nor.push(...g.attributes.normal.array);
  for (let i = 0; i < g.attributes.position.count; i++) out.col.push(...color);
}

function finish(out) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3));
  return g;
}

// dead: arms reaching forward, gray skin. Otherwise arms at the sides.
export function figureGeometry(dead) {
  const out = { pos: [], nor: [], col: [] };
  const skin = dead ? SKIN_DEAD : SKIN;
  part(out, 0.16, 0.85, 0.18, -0.1, 0.425, 0, PANTS);
  part(out, 0.16, 0.85, 0.18, 0.1, 0.425, 0, PANTS);
  part(out, 0.42, 0.62, 0.24, 0, 1.16, 0, CLOTH);
  part(out, 0.2, 0.24, 0.22, 0, 1.6, 0, skin);
  if (dead) {
    part(out, 0.1, 0.1, 0.55, -0.26, 1.34, -0.24, CLOTH);
    part(out, 0.1, 0.1, 0.55, 0.26, 1.34, -0.24, CLOTH);
  } else {
    part(out, 0.1, 0.6, 0.1, -0.27, 1.12, 0, CLOTH);
  }
  return finish(out);
}

// One arm, hanging from the shoulder (pivot at the origin), for waving.
export function armGeometry() {
  const out = { pos: [], nor: [], col: [] };
  part(out, 0.1, 0.6, 0.1, 0, -0.3, 0, CLOTH);
  return finish(out);
}

export const CLOTHES = [0x5a5048, 0x3e4a5c, 0x6b6a62, 0x4f3a34, 0x7a6f58, 0x384038, 0x5c4a5a, 0x8a8478];
