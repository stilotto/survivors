// Roof shapes for extruded footprints. Each style pushes triangles into the
// shared position/color arrays that buildings.js merges into one mesh.
// Styles: gable and hip (pitched), parapet and units (flat).

// Minimum-area rectangle around a footprint: center, long axis u, short
// axis v, half lengths a >= b, and how much of it the footprint fills.
export function orientedBox(pts, area) {
  let best = null;
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.01) continue;
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [x, z] of pts) {
      const du = x * ux + z * uz, dv = -x * uz + z * ux;
      u0 = Math.min(u0, du); u1 = Math.max(u1, du); v0 = Math.min(v0, dv); v1 = Math.max(v1, dv);
    }
    const boxArea = (u1 - u0) * (v1 - v0);
    if (best && boxArea >= best.boxArea) continue;
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
    best = { boxArea, cx: cu * ux - cv * uz, cz: cu * uz + cv * ux, u: [ux, uz], v: [-uz, ux],
      a: (u1 - u0) / 2, b: (v1 - v0) / 2 };
  }
  if (best.b > best.a) { // make u the long axis
    [best.a, best.b] = [best.b, best.a];
    best.v = best.u; best.u = [-best.v[1], best.v[0]];
  }
  best.fill = area / best.boxArea;
  return best;
}

// A triangle whose face points along `hint` (flipped if needed).
function tri(out, p, q, r, color, hint) {
  const e1 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], e2 = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
  const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  const flip = n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0;
  out.pos.push(...p, ...(flip ? r : q), ...(flip ? q : r));
  for (let i = 0; i < 3; i++) out.col.push(color.r, color.g, color.b);
}
const quad = (out, p, q, r, s, color, hint) => { tri(out, p, q, r, color, hint); tri(out, p, r, s, color, hint); };

// Point in the box frame: along u, along v, height y.
const at = (box, du, dv, y) => [box.cx + box.u[0] * du + box.v[0] * dv, y, box.cz + box.u[1] * du + box.v[1] * dv];
const out3 = (box, du, dv, up = 0) => [box.u[0] * du + box.v[0] * dv, up, box.u[1] * du + box.v[1] * dv];

// Gable: ridge along the long axis, triangular end walls in the wall color.
export function gable(out, box, eave, rise, roof, wall) {
  const { a, b } = box, o = 0.35, drop = o * rise / b;
  for (const s of [1, -1]) {
    quad(out, at(box, -a - o, s * (b + o), eave - drop), at(box, a + o, s * (b + o), eave - drop),
      at(box, a + o, 0, eave + rise), at(box, -a - o, 0, eave + rise), roof, out3(box, 0, s, 1));
    tri(out, at(box, s * a, -b, eave), at(box, s * a, b, eave), at(box, s * a, 0, eave + rise), wall, out3(box, s, 0));
  }
}

// Hip: all four sides slope; a pyramid when the footprint is square.
export function hip(out, box, eave, rise, roof) {
  const { a, b } = box, o = 0.35, drop = o * rise / b, r = Math.max(a - b, 0);
  const lo = eave - drop, A = a + o, B = b + o;
  for (const s of [1, -1]) {
    quad(out, at(box, -A, s * B, lo), at(box, A, s * B, lo), at(box, r, 0, eave + rise), at(box, -r, 0, eave + rise),
      roof, out3(box, 0, s, 1));
    tri(out, at(box, s * A, -B, lo), at(box, s * A, B, lo), at(box, s * r, 0, eave + rise), roof, out3(box, s, 0, 1));
  }
}

// Flat roof sunk below a parapet: inner faces of the wall ring above the roof.
export function parapet(out, pts, top, depth, wall) {
  const y = top - depth;
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
    // Rings are counter-clockwise seen from above (north up), so the inside
    // is to the left of each edge.
    quad(out, [ax, y, az], [bx, y, bz], [bx, top, bz], [ax, top, az], wall, [bz - az, 0, ax - bx]);
  }
  return y;
}

// Small boxes on a flat roof: air handlers, vents, stair heads.
export function rooftopUnits(out, box, y, color, rand) {
  const n = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const w = 1 + rand() * 2, d = 1 + rand() * 1.5, h = 0.8 + rand() * 1.2;
    const du = (rand() - 0.5) * Math.max(box.a - w, 0), dv = (rand() - 0.5) * Math.max(box.b - d, 0);
    const c = [[-w, -d], [w, -d], [w, d], [-w, d]].map(([x, z]) => [du + x / 2, dv + z / 2]);
    for (let k = 0; k < 4; k++) {
      const [p, q] = [c[k], c[(k + 1) % 4]];
      const mid = [(p[0] + q[0]) / 2 - du, (p[1] + q[1]) / 2 - dv];
      quad(out, at(box, ...p, y), at(box, ...q, y), at(box, ...q, y + h), at(box, ...p, y + h), color, out3(box, ...mid));
    }
    quad(out, at(box, ...c[0], y + h), at(box, ...c[1], y + h), at(box, ...c[2], y + h), at(box, ...c[3], y + h),
      color, [0, 1, 0]);
  }
}
