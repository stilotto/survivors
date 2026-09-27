// Full-screen map: pan, zoom, tap a spot, pick an altitude, fly there.
import { WORLD, HOME } from './geo.js';

export function createMap(el, groundCanvas, drone, onClose) {
  const canvas = el.querySelector('#map-canvas');
  const ctx = canvas.getContext('2d');
  const panel = el.querySelector('#map-panel');
  const hint = el.querySelector('#map-hint');
  const alt = el.querySelector('#alt'), altOut = el.querySelector('#alt-out');
  const pxPerM = groundCanvas.width / WORLD.width;
  let cx = 0, cz = 0, scale = 0.25; // view center (world m) and screen px per meter
  let pick = null;
  const pointers = new Map();
  let drag = null;

  const dpr = () => Math.min(devicePixelRatio || 1, 2);
  const toScreen = (x, z) => [(x - cx) * scale + canvas.clientWidth / 2, (z - cz) * scale + canvas.clientHeight / 2];
  const toWorldPt = (sx, sy) => [(sx - canvas.clientWidth / 2) / scale + cx, (sy - canvas.clientHeight / 2) / scale + cz];
  const zoom = (f, sx = canvas.clientWidth / 2, sy = canvas.clientHeight / 2) => {
    const [wx, wz] = toWorldPt(sx, sy);
    scale = Math.min(4, Math.max(0.03, scale * f));
    cx = wx - (sx - canvas.clientWidth / 2) / scale;
    cz = wz - (sy - canvas.clientHeight / 2) / scale;
  };

  alt.addEventListener('input', () => { altOut.value = alt.value; });
  el.querySelector('#map-close').onclick = () => close();
  el.querySelector('#map-center').onclick = () => { cx = drone.state.pos.x; cz = drone.state.pos.z; };
  el.querySelector('#map-zoom-in').onclick = () => zoom(1.5);
  el.querySelector('#map-zoom-out').onclick = () => zoom(1 / 1.5);
  el.querySelector('#fly-here').onclick = () => {
    if (!pick) return;
    drone.flyTo(pick[0], pick[1], +alt.value);
    close();
  };

  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.offsetX, e.offsetY); }, { passive: false });
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, [e.offsetX, e.offsetY]);
    drag = { x: e.offsetX, y: e.offsetY, moved: 0, pinch: pointers.size > 1 ? spread() : 0 };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !drag) return;
    const [px, py] = pointers.get(e.pointerId);
    pointers.set(e.pointerId, [e.offsetX, e.offsetY]);
    if (pointers.size > 1) {
      const s = spread();
      if (drag.pinch) zoom(s / drag.pinch, ...midpoint());
      drag.pinch = s;
      drag.moved = Infinity;
      return;
    }
    cx -= (e.offsetX - px) / scale;
    cz -= (e.offsetY - py) / scale;
    drag.moved += Math.hypot(e.offsetX - px, e.offsetY - py);
  });
  const up = (e) => {
    if (drag && drag.moved < 8 && pointers.size === 1) {
      pick = toWorldPt(e.offsetX, e.offsetY);
      panel.hidden = false;
      hint.hidden = true;
    }
    pointers.delete(e.pointerId);
    if (!pointers.size) drag = null;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); drag = null; });

  function spread() {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
  function midpoint() {
    const [a, b] = [...pointers.values()];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }

  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight, r = dpr();
    if (canvas.width !== Math.round(w * r) || canvas.height !== Math.round(h * r)) {
      canvas.width = Math.round(w * r); canvas.height = Math.round(h * r);
    }
    ctx.setTransform(r, 0, 0, r, 0, 0);
    ctx.fillStyle = '#1a1c1a';
    ctx.fillRect(0, 0, w, h);
    const [ox, oy] = toScreen(WORLD.minX, WORLD.minZ);
    ctx.imageSmoothingEnabled = scale / pxPerM < 2;
    ctx.drawImage(groundCanvas, ox, oy, WORLD.width * scale, WORLD.depth * scale);

    const [hx, hy] = toScreen(0, 0);
    ctx.fillStyle = '#d9c38a'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx, hy - 10); ctx.lineTo(hx + 8, hy - 2); ctx.lineTo(hx + 6, hy + 7);
    ctx.lineTo(hx - 6, hy + 7); ctx.lineTo(hx - 8, hy - 2); ctx.closePath(); ctx.stroke(); ctx.fill();
    label('Home', hx, hy + 20);

    const t = drone.state.target;
    const s = drone.state;
    const [dx, dy] = toScreen(s.pos.x, s.pos.z);
    if (t) {
      const [tx, ty] = toScreen(t.x, t.z);
      ctx.setLineDash([6, 6]); ctx.strokeStyle = '#d9c38a';
      ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
    }
    if (pick) marker(...toScreen(...pick), '#e0715c');
    ctx.save();
    ctx.translate(dx, dy); ctx.rotate(-s.yaw);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111';
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath();
    ctx.stroke(); ctx.fill();
    ctx.restore();
  }

  function marker(x, y, color) {
    ctx.fillStyle = color; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 14, 7, 0, Math.PI * 2); ctx.moveTo(x - 5, y - 10); ctx.lineTo(x, y); ctx.lineTo(x + 5, y - 10);
    ctx.stroke(); ctx.fill();
  }
  function label(text, x, y) {
    ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(text, x, y);
    ctx.fillStyle = '#fff'; ctx.fillText(text, x, y);
  }

  function open() {
    cx = drone.state.pos.x; cz = drone.state.pos.z;
    pick = null; panel.hidden = true; hint.hidden = false;
    el.hidden = false;
  }
  function close() { el.hidden = true; onClose(); }

  return { open, close, draw, get isOpen() { return !el.hidden; } };
}
