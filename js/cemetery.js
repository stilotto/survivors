// The important cemetery: rows of headstones on the hillside, the stone
// gateposts where the lane comes in off the road, an iron fence along the
// front, a small stone chapel, and a few old shade trees. The outline and
// lanes come from the baked map data; the stones are placed by rule.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toWorld } from './geo.js';
import { outerRings } from './data.js';
import { box, gableWall, gableRoof } from './houseparts.js';
import { plantTrees } from './trees.js';
import { rng, hash } from './rng.js';

const ROW = 3, PLOT = 1.5; // meters between rows (east-west) and between graves in a row
const LANE_CLEAR = 3;

const stoneMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const granite = new THREE.MeshLambertMaterial({ color: 0x8a8780 });
const iron = new THREE.MeshLambertMaterial({ color: 0x1e1d1b });
const slate = new THREE.MeshLambertMaterial({ color: 0x3c3e42 });
const TINTS = [0x9a978f, 0x8a877f, 0x7a786f, 0xb8b4a8, 0xcfcabb, 0x6c6a64, 0xa39d8c];

// Stone shapes, facing ±x (graves run east-west), sitting on y = 0.
function arched(w, h, t) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
  s.lineTo(-w / 2, 0);
  return new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 5 })
    .translate(0, 0, -t / 2).rotateY(Math.PI / 2);
}
const SHAPES = [
  { geo: arched(0.55, 0.8, 0.12), weight: 4 },
  { geo: new THREE.BoxGeometry(0.14, 0.6, 0.7).translate(0, 0.3, 0), weight: 3 },
  { geo: mergeGeometries([ // wide family stone on a base
    new THREE.BoxGeometry(0.4, 0.15, 1.3).translate(0, 0.075, 0),
    new THREE.BoxGeometry(0.22, 0.6, 1.1).translate(0, 0.45, 0)]), weight: 1.5 },
  { geo: mergeGeometries([ // obelisk
    new THREE.BoxGeometry(0.6, 0.3, 0.6).translate(0, 0.15, 0),
    new THREE.CylinderGeometry(0.14, 0.22, 1.9, 4, 1).rotateY(Math.PI / 4).translate(0, 1.25, 0),
    new THREE.ConeGeometry(0.2, 0.3, 4).rotateY(Math.PI / 4).translate(0, 2.35, 0)]), weight: 0.4 },
  { geo: new THREE.BoxGeometry(0.4, 0.12, 0.6).translate(0, 0.06, 0), weight: 1.5 }, // flat marker
  { geo: mergeGeometries([ // cross
    new THREE.BoxGeometry(0.14, 1.1, 0.14).translate(0, 0.55, 0),
    new THREE.BoxGeometry(0.14, 0.12, 0.55).translate(0, 0.78, 0)]), weight: 0.4 },
];
const TOTAL = SHAPES.reduce((a, s) => a + s.weight, 0);
function pickShape(u) {
  let i = 0;
  for (u *= TOTAL; i < SHAPES.length - 1 && u >= SHAPES[i].weight; i++) u -= SHAPES[i].weight;
  return i;
}

function inside(poly, x, z) {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) yes = !yes;
  }
  return yes;
}

function segDist(x, z, [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz;
  const t = l ? Math.min(Math.max(((x - ax) * dx + (z - az) * dz) / l, 0), 1) : 0;
  return Math.hypot(x - ax - t * dx, z - az - t * dz);
}

// A stone gatepost with a capstone.
function gatepost(ground, x, z) {
  const g = new THREE.Group();
  g.add(box(0.7, 2.6, 0.7, granite, x, ground + 1.2, z));
  g.add(box(0.9, 0.2, 0.9, granite, x, ground + 2.55, z));
  g.add(box(0.45, 0.3, 0.45, granite, x, ground + 2.8, z));
  return g;
}

// An iron gate leaf, hinged at (x, z) and swung open by `swing` radians.
function gateLeaf(ground, x, z, len, dir, swing) {
  const g = new THREE.Group();
  for (const y of [0.2, 1.1, 1.7]) g.add(box(len, 0.05, 0.05, iron, dir * len / 2, y, 0));
  for (let i = 0; i <= 10; i++) {
    const h = 1.75 + Math.sin((i / 10) * Math.PI) * 0.3;
    g.add(box(0.03, h, 0.03, iron, dir * (i / 10) * len, h / 2, 0));
  }
  g.position.set(x, ground, z);
  g.rotation.y = dir * swing;
  return g;
}

// A plain stone chapel with a steep slate roof and a little bell cote, its
// door facing the lane.
function chapel(ground) {
  const w = 5.5, d = 8, h = 3.6, rise = 3;
  const g = new THREE.Group();
  const walls = new THREE.MeshLambertMaterial({ color: 0x8f877a });
  g.add(box(w, h + 1.5, d, walls, 0, ground + h / 2 - 0.75, 0));
  const gable = gableWall(w, rise, d, walls);
  gable.position.y = ground + h;
  const roof = gableRoof(d, w, rise, 0.35, slate);
  roof.rotation.y = Math.PI / 2;
  roof.position.y = ground + h;
  g.add(gable, roof);
  const top = ground + h + rise;
  g.add(box(0.9, 1.2, 0.9, walls, 0, top + 0.3, d / 2 - 0.6));
  g.add(box(1.1, 0.12, 1.1, slate, 0, top + 0.95, d / 2 - 0.6));
  g.add(box(0.12, 0.7, 0.12, iron, 0, top + 1.35, d / 2 - 0.6));
  g.add(box(0.45, 0.1, 0.1, iron, 0, top + 1.5, d / 2 - 0.6));
  g.add(box(1.2, 2.2, 0.1, new THREE.MeshLambertMaterial({ color: 0x3a2a20 }), 0, ground + 1.1, d / 2 + 0.03));
  for (const z of [-2, 1]) {
    for (const s of [-1, 1]) g.add(box(0.1, 1.5, 0.7, new THREE.MeshLambertMaterial({ color: 0x1c2226 }), s * (w / 2 + 0.03), ground + 1.9, z));
  }
  g.add(box(2, 0.25, 1, granite, 0, ground + 0.05, d / 2 + 0.6)); // step
  return g;
}

export function buildCemetery(data, terrain, thin = 1) {
  const group = new THREE.Group();
  const lot = data.landuse.find((f) => f.properties.name === 'Evans City Cemetery');
  if (!lot) return group;
  const poly = outerRings(lot.geometry)[0].map(([lon, lat]) => toWorld(lon, lat));
  let [x0, z0, x1, z1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }

  // Lanes through the grounds, as world-space segments.
  const segs = [];
  for (const f of data.roads) {
    if (f.geometry.type !== 'LineString') continue;
    const pts = f.geometry.coordinates.map(([lon, lat]) => toWorld(lon, lat));
    if (!pts.some(([x, z]) => x > x0 - 10 && x < x1 + 10 && z > z0 - 10 && z < z1 + 10)) continue;
    for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1], pts[i]]);
  }
  const nearLane = (x, z, m) => segs.some(([a, b]) => segDist(x, z, a, b) < m);

  // Buildings in the grounds, plus our own features, stay clear of stones.
  const clear = [];
  for (const f of data.buildings) {
    const ring = outerRings(f.geometry)[0];
    if (!ring) continue;
    const pts = ring.map(([lon, lat]) => toWorld(lon, lat));
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    if (cx < x0 || cx > x1 || cz < z0 || cz > z1) continue;
    clear.push([cx, cz, Math.max(...pts.map(([x, z]) => Math.hypot(x - cx, z - cz))) + 3]);
  }

  // The front gate: where the entrance lane crosses the north fence.
  const fenceZ = z0;
  let gateX = null;
  for (const [a, b] of segs) {
    if ((a[1] - fenceZ) * (b[1] - fenceZ) > 0 || a[1] === b[1]) continue;
    const x = a[0] + (b[0] - a[0]) * (fenceZ - a[1]) / (b[1] - a[1]);
    if (x > x0 && x < x1 && (gateX === null || x > gateX)) gateX = x;
  }
  gateX ??= (x0 + x1) / 2;
  const gz = fenceZ + 0.5;
  const gGround = terrain.surfaceAt(gateX, gz);
  group.add(gatepost(gGround, gateX - 2.6, gz), gatepost(gGround, gateX + 2.6, gz));
  group.add(gateLeaf(gGround, gateX - 2.2, gz, 2.1, 1, 1.3), gateLeaf(gGround, gateX + 2.2, gz, 2.1, -1, 1.2));
  clear.push([gateX, gz + 4, 7]);

  // Iron fence along the front, pickets as one instanced mesh.
  const pickets = [];
  const fx0 = Math.min(...poly.filter(([, z]) => z < fenceZ + 1).map(([x]) => x));
  const fx1 = Math.max(...poly.filter(([, z]) => z < fenceZ + 1).map(([x]) => x));
  for (let x = fx0 + 0.2; x < fx1; x += 0.25) if (Math.abs(x - gateX) > 3) pickets.push(x);
  const picket = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 1.3, 0.03).translate(0, 0.65, 0), iron, pickets.length);
  const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.04, 0.04), iron, pickets.length * 2);
  const m = new THREE.Matrix4();
  pickets.forEach((x, i) => {
    const y = terrain.surfaceAt(x, gz);
    picket.setMatrixAt(i, m.makeTranslation(x, y - 0.1, gz));
    rails.setMatrixAt(i * 2, m.makeTranslation(x + 0.125, y + 0.15, gz));
    rails.setMatrixAt(i * 2 + 1, m.makeTranslation(x + 0.125, y + 1.05, gz));
  });
  group.add(picket, rails);

  // The chapel, just inside the gate on the east side of the lane.
  const CH = [gateX + 18, fenceZ + 20];
  if (inside(poly, ...CH) && !nearLane(CH[0], CH[1], 8)) {
    const c = chapel(terrain.surfaceAt(...CH) - 0.1);
    c.position.set(CH[0], 0, CH[1]);
    c.rotation.y = Math.PI; // door faces the road
    group.add(c);
    clear.push([CH[0], CH[1], 9]);
  }

  // Old shade trees scattered through the grounds.
  const r = rng(40762, 80064);
  const trees = [];
  for (let n = 0; n < 60 && trees.length < 22 * thin; n++) {
    const x = x0 + r() * (x1 - x0), z = z0 + 8 + r() * (z1 - z0 - 8);
    if (!inside(poly, x, z) || nearLane(x, z, 5) || clear.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr)) continue;
    const kind = ['oak', 'broadleaf', 'spruce', 'oak'][Math.floor(r() * 4)];
    trees.push({ kind, x, z, y: terrain.surfaceAt(x, z) - 0.3, h: 12 + r() * 9, yaw: r() * 6.28, spread: 0.9 + r() * 0.3 });
    clear.push([x, z, 3]);
  }
  group.add(plantTrees(trees));

  // Headstones: north-south rows, each grave facing east, older sections
  // sparser and more crooked than newer ones.
  const stones = SHAPES.map(() => []);
  for (let x = x0 + 4; x < x1 - 3; x += ROW) {
    for (let z = z0 + 6; z < z1 - 3; z += PLOT) {
      const block = hash(Math.floor(x / 30), Math.floor(z / 24));
      const fill = 0.35 + block * 0.55;
      const h = hash(x, z);
      if (h > fill * thin) continue;
      const sx = x + (hash(z, x) - 0.5) * 0.3, sz = z + (hash(x + 1, z) - 0.5) * 0.3;
      if (!inside(poly, sx, sz) || nearLane(sx, sz, LANE_CLEAR)) continue;
      if (clear.some(([cx, cz, cr]) => Math.hypot(sx - cx, sz - cz) < cr)) continue;
      const old = block < 0.4;
      const k = pickShape(hash(sx, sz, 3));
      const lean = old && hash(sz, 9) < 0.4 ? (hash(sx, 7) - 0.5) * 0.25 : 0;
      const size = 0.85 + hash(sx, sz, 5) * 0.4;
      stones[k].push({ x: sx, z: sz, y: terrain.surfaceAt(sx, sz) - 0.08, lean, size,
        yaw: (hash(sx, sz, 6) - 0.5) * (old ? 0.2 : 0.05),
        tint: TINTS[Math.floor(hash(sx, sz, 8) * TINTS.length)] });
    }
  }
  const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const col = new THREE.Color();
  SHAPES.forEach((shape, k) => {
    const list = stones[k];
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(shape.geo, stoneMat, list.length);
    list.forEach((t, i) => {
      q.setFromEuler(e.set(0, t.yaw, t.lean));
      mesh.setMatrixAt(i, m.compose(v.set(t.x, t.y, t.z), q, s.set(t.size, t.size, t.size)));
      mesh.setColorAt(i, col.setHex(t.tint));
    });
    group.add(mesh);
  });
  return group;
}
