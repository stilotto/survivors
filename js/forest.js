// Trees across the whole map, planted from the land-cover data: woods,
// hedgerows along field edges, and a tree or two by country houses. A coarse
// mask canvas says where trees may grow; roads, buildings and water block it.
import { WORLD, DOWNTOWN, toWorld } from './geo.js';
import { outerRings } from './data.js';
import { plantTrees } from './trees.js';

const MPP = 5; // mask meters per pixel
const YARD = 90; // the farmyard plants its own trees inside this radius
// Meters² of ground per tree, by mask channel.
const PER_TREE = { forest: 120, woods: 480, hedge: 60 };

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

// `thin` scales tree counts down (phones get fewer).
export function buildForest(data, terrain, thin = 1) {
  const { px, w, h } = drawMask(data);
  const r = rand(4242);
  const woods = chooser(WOODS, r), hedge = chooser(HEDGE, r), yards = chooser(YARDS, r);
  const cell = MPP * MPP;
  const trees = [];
  const add = (t, x, z) => { t.x = x; t.z = z; t.y = terrain.surfaceAt(x, z) - 0.3; trees.push(t); };
  const blocked = (x, z) => {
    const i = Math.floor((z - WORLD.minZ) / MPP) * w + Math.floor((x - WORLD.minX) / MPP);
    return !(i >= 0 && i < w * h) || px[i * 4 + 2] > 0;
  };

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4;
      if (px[k + 2]) continue;
      const red = px[k], green = px[k + 1];
      const p = red > 200 ? cell / PER_TREE.forest : red > 64 ? cell / PER_TREE.woods
        : green > 64 ? cell / PER_TREE.hedge : 0;
      if (!p || r() > p * thin) continue;
      const make = red > 64 ? woods : hedge;
      add(make(), WORLD.minX + (i + r()) * MPP, WORLD.minZ + (j + r()) * MPP);
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
      if (!blocked(x, z)) add(yards(), x, z);
    }
  }
  return { mesh: plantTrees(trees, true), count: trees.length };
}
