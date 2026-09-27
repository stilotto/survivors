// Extrudes building footprints into blocks with roofs, merged into one mesh.
// Downtown and commercial buildings get flat roofs; houses, barns and sheds
// get pitched ones. See roofs.js for the styles.
import * as THREE from 'three';
import { toWorld, DOWNTOWN } from './geo.js';
import { outerRings } from './data.js';
import { orientedBox, gable, hip, parapet, rooftopUnits } from './roofs.js';

const DEFAULT_HEIGHT = { house: 7, residential: 7, semidetached_house: 7, garage: 3.5, shed: 3,
  farm: 8, barn: 9, greenhouse: 3.5, school: 9, commercial: 8, retail: 6, industrial: 9 };
const FLAT_CLASS = new Set(['commercial', 'retail', 'industrial', 'school', 'post_office', 'service', 'roof']);
const BARN_CLASS = new Set(['farm', 'barn']);

const PITCHED_ROOF = [0x4a4a48, 0x5a4a3e, 0x3a3b3d, 0x55504a, 0x4f5a52];
const BARN_ROOF = [0x6b3b32, 0x5f6260, 0x4f5a52];
const FLAT_ROOF = [0x74726c, 0x65635e, 0x827d73];

function seeded(x, z) {
  let s = (Math.abs(Math.floor(x * 73.1 + z * 19.7)) % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
const pick = (list, r) => new THREE.Color(list[Math.floor(r() * list.length)]);

function roofStyle(cls, area, fill, downtown, r) {
  const flat = FLAT_CLASS.has(cls) || area > 900 || fill < 0.6
    || (downtown && area > 80 && cls !== 'house' && r() < 0.85);
  if (flat) return r() < (downtown ? 0.65 : 0.4) ? 'parapet' : 'units';
  return BARN_CLASS.has(cls) || r() < 0.7 ? 'gable' : 'hip';
}

export function buildBuildings(features, terrain) {
  const out = { pos: [], col: [] };
  const color = new THREE.Color();
  for (const f of features) {
    const p = f.properties;
    const height = p.height ?? (p.floors ? p.floors * 3.2 : DEFAULT_HEIGHT[p.class] ?? 6);
    for (const ring of outerRings(f.geometry)) {
      const pts = ring.slice(0, -1).map(([lon, lat]) => toWorld(lon, lat));
      if (pts.length < 3) continue;
      const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length;
      const cz = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      // Make the ring counter-clockwise seen from above (x east, north up).
      let area = 0;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        area += a[0] * -b[1] - b[0] * -a[1];
      }
      if (area < 0) pts.reverse();
      area = Math.abs(area) / 2;

      const r = seeded(cx, cz);
      const box = orientedBox(pts, area);
      const downtown = Math.hypot(cx - DOWNTOWN.at[0], cz - DOWNTOWN.at[1]) < DOWNTOWN.radius;
      const style = roofStyle(p.class, area, box.fill, downtown, r);
      const pitched = style === 'gable' || style === 'hip';

      const base = Math.min(...pts.map(([x, z]) => terrain.heightAt(x, z))) - 1;
      const ground = Math.max(...pts.map(([x, z]) => terrain.heightAt(x, z)));
      const rise = pitched ? Math.min(box.b * (0.45 + r() * 0.35), 5) : 0;
      const top = ground + (pitched ? Math.max(2.6, height - rise) : height);

      const shade = 0.55 + ((cx * 7.3 + cz * 3.1) % 1 + 1) % 1 * 0.2;
      color.setRGB(shade, shade * 0.96, shade * 0.9);
      for (let i = 0; i < pts.length; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
        out.pos.push(ax, base, az, bx, base, bz, bx, top, bz, ax, base, az, bx, top, bz, ax, top, az);
        for (let k = 0; k < 6; k++) out.col.push(color.r, color.g, color.b);
      }

      if (style === 'gable') gable(out, box, top, rise, pick(BARN_CLASS.has(p.class) ? BARN_ROOF : PITCHED_ROOF, r), color);
      else if (style === 'hip') hip(out, box, top, rise, pick(PITCHED_ROOF, r));
      else {
        const roof = pick(FLAT_ROOF, r);
        const y = style === 'parapet' ? parapet(out, pts, top, 0.6 + r() * 0.4, color) : top;
        const tris = THREE.ShapeUtils.triangulateShape(pts.map(([x, z]) => new THREE.Vector2(x, -z)), []);
        for (const t of tris) {
          const [a, b, c] = t.map((k) => pts[k]);
          // Keep the roof facing up.
          const up = (b[0] - a[0]) * -(c[1] - a[1]) - (-(b[1] - a[1])) * (c[0] - a[0]) > 0;
          for (const q of up ? [a, b, c] : [a, c, b]) { out.pos.push(q[0], y, q[1]); out.col.push(roof.r, roof.g, roof.b); }
        }
        if (style === 'units') rooftopUnits(out, box, y, roof.clone().multiplyScalar(0.8), r);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
}
