// Terrain mesh and height lookups from data/elevation.png.
import * as THREE from 'three';
import { WORLD } from './geo.js';

const MESH_STEP = 25; // meters between terrain mesh grid points

export async function loadTerrain() {
  const meta = await (await fetch('data/elevation.json')).json();
  const img = new Image();
  img.src = 'data/elevation.png';
  await img.decode();
  const { width: w, height: h } = meta;
  const ctx = Object.assign(document.createElement('canvas'), { width: w, height: h })
    .getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, w, h).data;
  const heights = new Float32Array(w * h);
  for (let i = 0; i < heights.length; i++) heights[i] = (px[i * 4] * 256 + px[i * 4 + 1]) / 10;

  function heightAt(x, z) {
    const u = Math.min(Math.max((x - WORLD.minX) / WORLD.width, 0), 1) * (w - 1);
    const v = Math.min(Math.max((z - WORLD.minZ) / WORLD.depth, 0), 1) * (h - 1);
    const i = Math.min(Math.floor(u), w - 2), j = Math.min(Math.floor(v), h - 2);
    const fu = u - i, fv = v - j, k = j * w + i;
    return heights[k] * (1 - fu) * (1 - fv) + heights[k + 1] * fu * (1 - fv)
      + heights[k + w] * (1 - fu) * fv + heights[k + w + 1] * fu * fv;
  }

  // Height of the drawn mesh (flat triangles between grid points), for
  // things that must sit exactly on the visible ground.
  const cols = Math.ceil(WORLD.width / MESH_STEP) + 1, rows = Math.ceil(WORLD.depth / MESH_STEP) + 1;
  const cw = WORLD.width / (cols - 1), ch = WORLD.depth / (rows - 1);
  function surfaceAt(x, z) {
    const u = Math.min(Math.max((x - WORLD.minX) / cw, 0), cols - 1.001);
    const v = Math.min(Math.max((z - WORLD.minZ) / ch, 0), rows - 1.001);
    const c = Math.floor(u), r = Math.floor(v), fu = u - c, fv = v - r;
    const at = (i, j) => heightAt(WORLD.minX + i * cw, WORLD.minZ + j * ch);
    const hb = at(c + 1, r), hd = at(c, r + 1);
    if (fu + fv <= 1) { const ha = at(c, r); return ha + fu * (hb - ha) + fv * (hd - ha); }
    const he = at(c + 1, r + 1);
    return he + (1 - fu) * (hd - he) + (1 - fv) * (hb - he);
  }

  let min = Infinity;
  for (const v of heights) min = Math.min(min, v);
  return { heightAt, surfaceAt, minHeight: min };
}

// Grid mesh over the whole area, textured with the painted ground canvas.
export function buildTerrainMesh(terrain, texture, step = MESH_STEP) {
  const cols = Math.ceil(WORLD.width / step) + 1, rows = Math.ceil(WORLD.depth / step) + 1;
  const pos = new Float32Array(cols * rows * 3), uv = new Float32Array(cols * rows * 2);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fx = c / (cols - 1), fz = r / (rows - 1), i = r * cols + c;
      const x = WORLD.minX + fx * WORLD.width, z = WORLD.minZ + fz * WORLD.depth;
      pos.set([x, terrain.heightAt(x, z), z], i * 3);
      uv.set([fx, 1 - fz], i * 2);
    }
  }
  const idx = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let n = 0;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      idx.set([a, d, b, b, d, e], n); n += 6;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: texture }));

  // A plain skirt beyond the mapped area so the edge fades into fog.
  const skirt = new THREE.Mesh(new THREE.PlaneGeometry(80000, 80000),
    new THREE.MeshLambertMaterial({ color: 0x5f6b45 }));
  skirt.rotation.x = -Math.PI / 2;
  skirt.position.set((WORLD.minX + WORLD.maxX) / 2, terrain.minHeight - 2, (WORLD.minZ + WORLD.maxZ) / 2);
  const group = new THREE.Group();
  group.add(mesh, skirt);
  return group;
}
