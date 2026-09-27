// Paints the ground texture (land cover, fields, water, roads, rooftops) onto
// a canvas. The 3D terrain and the map view both use it.
import * as THREE from 'three';
import { WORLD, toWorld } from './geo.js';

const COVER = { crop: '#8d9458', shrub: '#4f6135', forest: '#3a4f2a', barren: '#8a7e5e', urban: '#7a7c6c' };
const USE = {
  farmland: '#9a9d5c', grass: '#78904f', pitch: '#6e9a4c', green: '#77a05a', golf_course: '#6f9650',
  garden: '#6f8a48', park: '#6b8c4c', residential: '#86877a', industrial: '#8a8478', retail: '#8f8a80',
  commercial: '#8f8a80', school: '#8f8a80', cemetery: '#6f8060', grave_yard: '#6f8060', landfill: '#7d7560',
  pedestrian: '#9c9888', playground: '#7f9658', track: '#8c6e52', stadium: '#76925a', plant_nursery: '#6f8a48',
};
const ROAD = { // width in meters, color
  motorway: [16, '#5a5a58'], primary: [11, '#5e5e5a'], secondary: [10, '#62625e'], tertiary: [8, '#666660'],
  residential: [7, '#6c6b64'], unclassified: [6, '#6c6b64'], unknown: [5, '#706e66'], service: [4, '#76746b'],
  track: [3, '#7d6f55'], footway: [1.5, '#8a8270'], path: [1.5, '#8a8270'], steps: [1.5, '#8a8270'],
};

export function paintGround(data, maxSize) {
  const W = Math.min(maxSize, 4096);
  const H = Math.round(W * WORLD.depth / WORLD.width);
  const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const ctx = canvas.getContext('2d');
  const s = W / WORLD.width; // pixels per meter
  const pt = ([lon, lat]) => {
    const [x, z] = toWorld(lon, lat);
    return [(x - WORLD.minX) * s, (z - WORLD.minZ) * s];
  };
  const path = (coords) => {
    coords.forEach((c, i) => { const [x, y] = pt(c); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  };
  const fillPolys = (features, colorOf) => {
    for (const f of features) {
      const color = colorOf(f.properties);
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.beginPath();
      const g = f.geometry;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      for (const rings of polys) for (const ring of rings) { path(ring); ctx.closePath(); }
      ctx.fill('evenodd');
    }
  };

  ctx.fillStyle = '#6a7845';
  ctx.fillRect(0, 0, W, H);
  fillPolys(data.landcover, (p) => COVER[p.kind]);
  fillPolys(data.landuse, (p) => USE[p.class]);
  fillPolys(data.water, (p) => (p.class === 'swimming_pool' ? '#7fa8b0' : '#4d6670'));

  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.strokeStyle = '#4d6670';
  for (const f of data.water) {
    if (f.geometry.type !== 'LineString') continue;
    ctx.lineWidth = Math.max(1, (f.properties.class === 'river' ? 14 : 4) * s);
    ctx.beginPath(); path(f.geometry.coordinates); ctx.stroke();
  }
  const roads = data.roads.filter((f) => f.properties.kind === 'road')
    .sort((a, b) => (ROAD[a.properties.class]?.[0] ?? 5) - (ROAD[b.properties.class]?.[0] ?? 5));
  for (const f of roads) {
    const [width, color] = ROAD[f.properties.class] ?? ROAD.unknown;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, width * s);
    ctx.beginPath(); path(f.geometry.coordinates); ctx.stroke();
  }
  ctx.strokeStyle = '#3e3630';
  ctx.lineWidth = Math.max(1, 3 * s);
  for (const f of data.roads) {
    if (f.properties.kind !== 'rail') continue;
    ctx.beginPath(); path(f.geometry.coordinates); ctx.stroke();
  }
  fillPolys(data.buildings, () => '#55524c');
  return canvas;
}

export function groundTexture(canvas, renderer) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}
