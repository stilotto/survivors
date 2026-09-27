// Trees across the whole map, planted from the land-cover data: woods,
// hedgerows along field edges, and a tree or two by country houses. A coarse
// mask canvas says where trees may grow; roads, buildings and water block it.
import { WORLD, DOWNTOWN, toWorld } from './geo.js';
import { outerRings } from './data.js';
import * as THREE from 'three';
import { plantTrees, showTree, flushTrees, removeTrees } from './trees.js';

const MPP = 5; // mask meters per pixel
const YARD = 90; // the farmyard plants its own trees inside this radius
// Meters² of ground per tree, by mask channel.
const PER_TREE = { forest: 120, woods: 480, hedge: 60 };
// Denser planting in the tiles around the drone.
const PER_TREE_NEAR = { forest: 45, woods: 150, hedge: 25 };
const TILE = 200; // meters
const NEAR = 1; // tiles each way from the drone's tile that get full detail

// Kind, height range (m), relative odds. Mixed hardwoods, some conifers.
const WOODS = [['broadleaf', 8, 18, 4], ['oak', 10, 20, 3], ['spruce', 9, 20, 1.5],
  ['pine', 14, 24, 1], ['poplar', 12, 20, 0.5], ['bare', 7, 14, 0.5]];
const HEDGE = [['broadleaf', 7, 14, 4], ['oak', 9, 16, 2], ['bare', 6, 12, 1], ['poplar', 10, 18, 1]];
const YARDS = [['broadleaf', 7, 13, 3], ['spruce', 7, 15, 2], ['oak', 9, 15, 1], ['poplar', 10, 16, 1]];

function rand(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function drawMask(data) {
  const w = Math.ceil(WORLD.width / MPP), h = Math.ceil(WORLD.depth / MPP);
  const ctx = Object.assign(document.createElement('canvas'), { width: w, height: h })
    .getContext('2d', { willReadFrequently: true });
  const pt = ([lon, lat]) => { const [x, z] = toWorld(lon, lat); return [(x - WORLD.minX) / MPP, (z - WORLD.minZ) / MPP]; };
  const path = (ring) => ring.forEach((c, i) => (i ? ctx.lineTo : ctx.moveTo).apply(ctx, pt(c)));
  const polys = (features, test, style, stroke = false) => {
    ctx.beginPath();
    for (const f of features) {
      if (!test(f.properties)) continue;
      for (const ring of outerRings(f.geometry)) { path(ring); ctx.closePath(); }
    }
    if (stroke) { ctx.strokeStyle = style; ctx.stroke(); } else { ctx.fillStyle = style; ctx.fill(); }
  };
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  // Red: woods (128) or forest (255). Green: hedgerows along field edges.
  polys(data.landcover, (p) => p.kind === 'shrub', 'rgb(128,0,0)');
  polys(data.landcover, (p) => p.kind === 'forest', 'rgb(255,0,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 1.2;
  polys(data.landcover, (p) => p.kind === 'crop', 'rgb(0,255,0)', true);
  polys(data.landuse, (p) => p.class === 'agriculture', 'rgb(0,255,0)', true);
  ctx.globalCompositeOperation = 'source-over';

  // Blue marks blocked ground.
  ctx.fillStyle = ctx.strokeStyle = 'rgb(0,0,255)';
  polys(data.landcover, (p) => p.kind === 'urban', 'rgb(0,0,255)');
  polys(data.landuse, (p) => ['golf', 'cemetery', 'landfill', 'recreation', 'education', 'developed'].includes(p.class),
    'rgb(0,0,255)');
  polys(data.water, () => true, 'rgb(0,0,255)');
  ctx.lineCap = 'round';
  for (const f of [...data.roads, ...data.water]) {
    if (f.geometry.type !== 'LineString') continue;
    ctx.lineWidth = (f.properties.kind === 'rail' ? 14 : 12) / MPP;
    ctx.beginPath(); path(f.geometry.coordinates); ctx.stroke();
  }
  ctx.lineWidth = 6 / MPP;
  polys(data.buildings, () => true, 'rgb(0,0,255)');
  polys(data.buildings, () => true, 'rgb(0,0,255)', true);
  const [hx, hz] = [(0 - WORLD.minX) / MPP, (0 - WORLD.minZ) / MPP];
  ctx.beginPath(); ctx.arc(hx, hz, YARD / MPP, 0, Math.PI * 2); ctx.fill();
  const [dx, dz] = [(DOWNTOWN.at[0] - WORLD.minX) / MPP, (DOWNTOWN.at[1] - WORLD.minZ) / MPP];
  ctx.beginPath(); ctx.arc(dx, dz, (DOWNTOWN.radius + 50) / MPP, 0, Math.PI * 2); ctx.fill();
  return { px: ctx.getImageData(0, 0, w, h).data, w, h };
}

function chooser(mix, r) {
  const total = mix.reduce((a, m) => a + m[3], 0);
  return () => {
    let k = r() * total;
    const [kind, lo, hi] = mix.find((m) => (k -= m[3]) < 0) ?? mix[0];
    return { kind, h: lo + r() * (hi - lo), spread: 0.8 + r() * 0.5, yaw: r() * Math.PI * 2 };
  };
}

// Mask pixel classes.
const NONE = 0, WOODS_PX = 1, FOREST_PX = 2, HEDGE_PX = 3, BLOCKED = 4;

function classify({ px, w, h }) {
  const cls = new Uint8Array(w * h);
  for (let k = 0; k < cls.length; k++) {
    const red = px[k * 4], green = px[k * 4 + 1];
    cls[k] = px[k * 4 + 2] ? BLOCKED : red > 200 ? FOREST_PX : red > 64 ? WOODS_PX : green > 64 ? HEDGE_PX : NONE;
  }
  return cls;
}

// `thin` scales tree counts down (phones get fewer). Returns the far trees
// as one group, plus a near group that update() keeps filled with full-detail,
// denser trees in the tiles around a point (the drone).
export function buildForest(data, terrain, thin = 1) {
  const mask = drawMask(data), { w, h } = mask;
  const cls = classify(mask);
  const r = rand(4242);
  const woods = chooser(WOODS, r), hedge = chooser(HEDGE, r), yards = chooser(YARDS, r);
  const cell = MPP * MPP;
  const tilesX = Math.ceil(WORLD.width / TILE), tilesZ = Math.ceil(WORLD.depth / TILE);
  const tileOf = (x, z) => Math.floor((z - WORLD.minZ) / TILE) * tilesX + Math.floor((x - WORLD.minX) / TILE);
  const baseByTile = new Map();
  const place = (t, x, z, list) => {
    t.x = x; t.z = z; t.y = terrain.surfaceAt(x, z) - 0.3;
    list.push(t);
    return t;
  };
  const addBase = (t, x, z) => {
    const k = tileOf(x, z);
    if (!baseByTile.has(k)) baseByTile.set(k, []);
    place(t, x, z, baseByTile.get(k));
  };
  const clsAt = (x, z) => {
    const i = Math.floor((x - WORLD.minX) / MPP), j = Math.floor((z - WORLD.minZ) / MPP);
    return i >= 0 && j >= 0 && i < w && j < h ? cls[j * w + i] : BLOCKED;
  };
  const odds = (c, per) => (c === FOREST_PX ? cell / per.forest : c === WOODS_PX ? cell / per.woods
    : c === HEDGE_PX ? cell / per.hedge : 0);

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const c = cls[j * w + i], p = odds(c, PER_TREE);
      if (!p || r() > p * thin) continue;
      addBase((c === HEDGE_PX ? hedge : woods)(), WORLD.minX + (i + r()) * MPP, WORLD.minZ + (j + r()) * MPP);
    }
  }

  // A tree or two beside country houses.
  for (const f of data.buildings) {
    const ring = outerRings(f.geometry)[0];
    if (!ring || r() > 0.6 * thin) continue;
    const [cx, cz] = toWorld(...ring[0]);
    if (Math.hypot(cx - DOWNTOWN.at[0], cz - DOWNTOWN.at[1]) < DOWNTOWN.radius) continue;
    for (let n = 1 + Math.floor(r() * 2); n > 0; n--) {
      const a = r() * Math.PI * 2, d = 10 + r() * 8;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (clsAt(x, z) !== BLOCKED) addBase(yards(), x, z);
    }
  }

  const base = [...baseByTile.values()].flat();
  const far = plantTrees(base, true, true);

  // Extra trees that only exist up close, made the same way every time.
  const extras = new Map();
  function extrasFor(k) {
    if (extras.has(k)) return extras.get(k);
    const list = [], tr = rand(k * 7919 + 17), tw = chooser(WOODS, tr), th = chooser(HEDGE, tr);
    const x0 = WORLD.minX + (k % tilesX) * TILE, z0 = WORLD.minZ + Math.floor(k / tilesX) * TILE;
    for (let z = z0; z < z0 + TILE; z += MPP) {
      for (let x = x0; x < x0 + TILE; x += MPP) {
        const c = clsAt(x, z), p = odds(c, PER_TREE_NEAR) - odds(c, PER_TREE);
        if (p > 0 && tr() < p * thin) place((c === HEDGE_PX ? th : tw)(), x + tr() * MPP, z + tr() * MPP, list);
      }
    }
    extras.set(k, list);
    return list;
  }

  const group = new THREE.Group();
  group.add(far);
  let nearTiles = new Set(), near = null, current = -1;

  // Swaps detail around (x, z) when it moves into a new tile.
  function update(x, z) {
    const k = tileOf(x, z);
    if (k === current) return;
    current = k;
    const tx = k % tilesX, tz = Math.floor(k / tilesX), next = new Set();
    for (let dz = -NEAR; dz <= NEAR; dz++) {
      for (let dx = -NEAR; dx <= NEAR; dx++) {
        const ix = tx + dx, iz = tz + dz;
        if (ix >= 0 && iz >= 0 && ix < tilesX && iz < tilesZ) next.add(iz * tilesX + ix);
      }
    }
    for (const t of nearTiles) if (!next.has(t)) (baseByTile.get(t) ?? []).forEach((tree) => showTree(tree, true));
    for (const t of next) if (!nearTiles.has(t)) (baseByTile.get(t) ?? []).forEach((tree) => showTree(tree, false));
    flushTrees(far);
    nearTiles = next;
    if (near) removeTrees(near);
    near = plantTrees([...next].flatMap((t) => [...(baseByTile.get(t) ?? []), ...extrasFor(t)]));
    group.add(near);
  }

  return { group, update, count: base.length };
}
