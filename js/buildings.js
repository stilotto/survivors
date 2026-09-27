// Extrudes building footprints into simple flat-roofed blocks, merged into one mesh.
import * as THREE from 'three';
import { toWorld } from './geo.js';
import { outerRings } from './data.js';

const DEFAULT_HEIGHT = { house: 7, residential: 7, semidetached_house: 7, garage: 3.5, shed: 3,
  farm: 8, barn: 9, greenhouse: 3.5, school: 9, commercial: 8, retail: 6, industrial: 9 };

export function buildBuildings(features, terrain) {
  const pos = [], col = [];
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
      const base = Math.min(...pts.map(([x, z]) => terrain.heightAt(x, z))) - 1;
      const top = Math.max(...pts.map(([x, z]) => terrain.heightAt(x, z))) + height;
      const shade = 0.55 + ((cx * 7.3 + cz * 3.1) % 1 + 1) % 1 * 0.2;
      color.setRGB(shade, shade * 0.96, shade * 0.9);
      const start = pos.length;
      for (let i = 0; i < pts.length; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
        pos.push(ax, base, az, bx, base, bz, bx, top, bz, ax, base, az, bx, top, bz, ax, top, az);
      }
      const tris = THREE.ShapeUtils.triangulateShape(pts.map(([x, z]) => new THREE.Vector2(x, -z)), []);
      for (const t of tris) {
        const [a, b, c] = t.map((k) => pts[k]);
        // Keep the roof facing up.
        const up = (b[0] - a[0]) * -(c[1] - a[1]) - (-(b[1] - a[1])) * (c[0] - a[0]) > 0;
        for (const q of up ? [a, b, c] : [a, c, b]) pos.push(q[0], top, q[1]);
      }
      const roof = color.clone().multiplyScalar(0.7);
      for (let i = start, wallEnd = start + pts.length * 18; i < pos.length; i += 3) {
        const c = i < wallEnd ? color : roof;
        col.push(c.r, c.g, c.b);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
}
