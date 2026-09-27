// The farmyard: detailed ground, the old shed, the gas pump, and the trees
// that close in behind the house. Front of the house faces south (+z).
import * as THREE from 'three';
import { box, gableWall, gableRoof } from './houseparts.js';
import { buildYardGround, nearbyLanes } from './yardground.js';
import { plantTrees } from './trees.js';

function boardTexture(repeatX, repeatY) {
  const c = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
  const ctx = c.getContext('2d');
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = ['#4a4038', '#52473d', '#453b33', '#4e443a'][i];
    ctx.fillRect(i * 16, 0, 15, 64);
    ctx.fillStyle = '#2a241f';
    ctx.fillRect(i * 16 + 15, 0, 1, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

const BOARD = 0.3; // board width, meters (four boards per texture tile)
const tin = new THREE.MeshLambertMaterial({ color: 0x55504a });
const dark = new THREE.MeshLambertMaterial({ color: 0x1c1a18 });
const concrete = new THREE.MeshLambertMaterial({ color: 0x8c887e });

// Weathered board shed, open doorway facing the yard.
function shed(ground) {
  const w = 6, d = 4.5, h = 2.8, rise = 1.4;
  const g = new THREE.Group();
  const walls = new THREE.MeshLambertMaterial({ map: boardTexture(w / (4 * BOARD), 1) });
  g.add(box(w, h + 1, d, walls, 0, ground + h / 2 - 0.5, 0));
  const ends = new THREE.MeshLambertMaterial({ map: boardTexture(1 / (4 * BOARD), 1 / rise) });
  const gable = gableWall(d, rise, w, ends);
  gable.rotation.y = Math.PI / 2;
  gable.position.y = ground + h;
  const roof = gableRoof(w, d, rise, 0.3, tin);
  roof.position.y = ground + h;
  g.add(gable, roof, box(2.2, 2.3, 0.1, dark, -0.8, ground + 1.15, d / 2 + 0.01));
  return g;
}

// A 1950s farm gas pump on a concrete pad.
function gasPump(ground) {
  const g = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: 0x7a3a30 });
  const glass = new THREE.MeshLambertMaterial({ color: 0xd8d4c8 });
  g.add(box(1.3, 0.3, 1.3, concrete, 0, ground + 0.05, 0));
  g.add(box(0.55, 1.5, 0.45, red, 0, ground + 0.95, 0));
  g.add(box(0.6, 0.12, 0.5, red, 0, ground + 1.76, 0));
  g.add(box(0.4, 0.3, 0.06, glass, 0, ground + 1.35, 0.24)); // dial face
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), glass);
  globe.position.y = ground + 2.02;
  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 5, 12, Math.PI), dark);
  hose.rotation.y = Math.PI / 2;
  hose.position.set(0.3, ground + 1.1, 0);
  g.add(globe, hose);
  return g;
}

function rand(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function segDist(px, pz, [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
}

// Big spruces flank and back the house; a ragged tree line wraps the north
// side. The front (south) stays open meadow.
function yardTrees(terrain, lanes, keepClear) {
  const r = rand(11);
  const trees = [
    { kind: 'spruce', x: -13, z: -4, h: 17 }, { kind: 'spruce', x: -16, z: 5, h: 14 },
    { kind: 'spruce', x: -10, z: -15, h: 15 }, { kind: 'spruce', x: 13, z: 8, h: 16 },
    { kind: 'oak', x: 22, z: 10, h: 13, spread: 1.1 }, { kind: 'spruce', x: 4, z: -22, h: 18 },
  ];
  // Mix of kinds, with typical height ranges (m) and relative odds.
  const MIX = [['spruce', 9, 20, 4], ['pine', 14, 24, 2], ['broadleaf', 7, 15, 4],
    ['oak', 10, 18, 3], ['poplar', 12, 20, 1], ['bare', 7, 13, 1]];
  const total = MIX.reduce((a, m) => a + m[3], 0);
  const pick = () => { let k = r() * total; return MIX.find((m) => (k -= m[3]) < 0); };
  for (let i = 0; i < 80; i++) {
    const a = Math.PI * (1.05 + r() * 0.9), d = 28 + r() * 50;
    const [kind, lo, hi] = pick();
    trees.push({ kind, x: Math.cos(a) * d, z: Math.sin(a) * d, h: lo + r() * (hi - lo), spread: 0.8 + r() * 0.5 });
  }
  // A few loners out in the meadow, and a dead tree by the lane.
  trees.push({ kind: 'oak', x: -38, z: 30, h: 15, spread: 1.2 }, { kind: 'bare', x: 30, z: 18, h: 11 },
    { kind: 'broadleaf', x: 45, z: 40, h: 11 }, { kind: 'pine', x: -30, z: 8, h: 21 });
  const clear = (t) => keepClear.every(([x, z, rad]) => Math.hypot(t.x - x, t.z - z) > rad)
    && lanes.every((pts) => pts.slice(1).every((p, i) => segDist(t.x, t.z, pts[i], p) > 5));
  return trees.filter(clear).map((t) => ({
    ...t, y: terrain.surfaceAt(t.x, t.z) - 0.3, yaw: r() * Math.PI * 2,
  }));
}

export function buildYard(terrain, roads, renderer) {
  const group = new THREE.Group();
  const lanes = nearbyLanes(roads);
  group.add(buildYardGround(terrain, lanes, renderer));

  const SHED = [17, -22], PUMP = [14, -11];
  const s = shed(terrain.surfaceAt(...SHED));
  s.position.set(SHED[0], 0, SHED[1]);
  s.rotation.y = -0.12;
  const p = gasPump(terrain.surfaceAt(...PUMP));
  p.position.set(PUMP[0], 0, PUMP[1]);
  p.rotation.y = -Math.PI / 2;
  group.add(s, p);

  const keepClear = [[0, 0, 12], [SHED[0], SHED[1], 6], [PUMP[0], PUMP[1], 4], [9, -14, 7], [0, 14, 6]];
  group.add(plantTrees(yardTrees(terrain, lanes, keepClear)));
  return group;
}
