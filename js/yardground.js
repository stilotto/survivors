// A finer ground patch around the house: mown lawn, long meadow grass, and
// the dirt lane from the map data, fading into the map's ground at the edges.
import * as THREE from 'three';
import { toWorld } from './geo.js';

const SIZE = 160; // meters across, centered on the house
const PX = 1024;

function rand(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function paint(lanes) {
  const c = Object.assign(document.createElement('canvas'), { width: PX, height: PX });
  const ctx = c.getContext('2d');
  const s = PX / SIZE, at = (x, z) => [(x + SIZE / 2) * s, (z + SIZE / 2) * s];
  const r = rand(7);

  ctx.fillStyle = '#687744';
  ctx.fillRect(0, 0, PX, PX);
  // Mown lawn around the house, ragged at the edge.
  const [hx, hz] = at(0, 2);
  const lawn = ctx.createRadialGradient(hx, hz, 12 * s, hx, hz, 30 * s);
  lawn.addColorStop(0, '#7f9156');
  lawn.addColorStop(1, 'rgba(127,145,86,0)');
  ctx.fillStyle = lawn;
  ctx.fillRect(0, 0, PX, PX);
  // Grass texture: short strokes, darker and longer out in the meadow.
  for (let i = 0; i < 60000; i++) {
    const x = r() * PX, y = r() * PX;
    const d = Math.hypot(x - hx, y - hz) / s;
    const len = d < 22 ? 1.5 : 3 + r() * 3;
    const l = 30 + r() * 25;
    ctx.strokeStyle = `hsla(${70 + r() * 25}, 28%, ${l}%, 0.35)`;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 2, y - len); ctx.stroke();
  }

  // Dirt lanes: two tire ruts with grass down the middle.
  ctx.lineCap = ctx.lineJoin = 'round';
  const trace = (pts) => { ctx.beginPath(); pts.forEach(([x, z], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, ...at(x, z))); };
  for (const pts of lanes) {
    ctx.strokeStyle = '#7a6a50'; ctx.lineWidth = 3.4 * s; trace(pts); ctx.stroke();
    ctx.strokeStyle = '#6f7a48'; ctx.lineWidth = 0.9 * s; trace(pts); ctx.stroke();
  }
  // Gravel where the truck parks by the kitchen door.
  ctx.fillStyle = '#8a8272';
  ctx.beginPath(); ctx.ellipse(...at(9, -14), 6 * s, 4.5 * s, 0.3, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 3000; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    const [x, y] = at(9 + Math.cos(a) * 6 * d, -14 + Math.sin(a) * 4.5 * d);
    ctx.fillStyle = r() < 0.5 ? '#9b9383' : '#6f685b';
    ctx.fillRect(x, y, 2, 2);
  }
  // Worn path from the porch steps into the yard.
  ctx.strokeStyle = 'rgba(122,106,80,0.7)'; ctx.lineWidth = 0.9 * s;
  trace([[-2.2, 7], [-1.5, 10], [0, 13]]); ctx.stroke();

  // Fade the patch out at its edges.
  ctx.globalCompositeOperation = 'destination-in';
  const fade = ctx.createRadialGradient(PX / 2, PX / 2, PX * 0.3, PX / 2, PX / 2, PX / 2);
  fade.addColorStop(0, '#000');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, PX, PX);
  return c;
}

// Service lanes and tracks near the house, as world-space point lists.
export function nearbyLanes(roads) {
  return roads
    .filter((f) => f.geometry.type === 'LineString' && ['service', 'track'].includes(f.properties.class))
    .map((f) => f.geometry.coordinates.map(([lon, lat]) => toWorld(lon, lat)))
    .filter((pts) => pts.some(([x, z]) => Math.hypot(x, z) < SIZE));
}

export function buildYardGround(terrain, lanes, renderer) {
  const tex = new THREE.CanvasTexture(paint(lanes));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, 64, 64).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrain.surfaceAt(pos.getX(i), pos.getZ(i)) + 0.05);
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({
    map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  return new THREE.Mesh(geo, mat);
}
