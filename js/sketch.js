// Small drawing helpers for the room pictures: walls, floors, windows and
// the things people stockpile. Flat, muted shapes on a 640x360 canvas.
import { rng } from './rng.js';

export const W = 640, H = 360;

export function canvasFor(el) {
  const c = document.createElement('canvas');
  const r = Math.min(devicePixelRatio || 1, 2);
  c.width = W * r; c.height = H * r;
  c.className = 'room-art';
  const wrap = document.createElement('div');
  wrap.className = 'room-art-wrap';
  wrap.append(c);
  el.append(wrap);
  const ctx = c.getContext('2d');
  ctx.scale(r, r);
  return ctx;
}

export const random = (...seed) => rng(...seed);

// Back wall (with faint wallpaper stripes) and floorboards.
export function room(ctx, wall, floor, stripes = true, floorY = 270) {
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, floorY);
  if (stripes) {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let x = 0; x < W; x += 28) ctx.fillRect(x, 0, 10, floorY);
  }
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY, W, H - floorY);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  for (let y = floorY + 14; y < H; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, floorY - 6, W, 6); // baseboard
}

// A window onto a gray sky; boards nailed across it as the house is fortified.
// Each window drawn is remembered on the context, so it can be tapped.
export function windowAt(ctx, x, y, w, h, boards = 0, sky = '#aeb4b0', r = random(x, y)) {
  (ctx.windows ??= []).push({ x, y, w, h });
  ctx.fillStyle = '#3a342c';
  ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#5d6b4a'; // tree line
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  for (let i = 0; i <= 8; i++) ctx.lineTo(x + (w * i) / 8, y + h * (0.55 + r() * 0.2));
  ctx.lineTo(x + w, y + h);
  ctx.fill();
  ctx.fillStyle = '#3a342c';
  ctx.fillRect(x + w / 2 - 2, y, 4, h);
  ctx.fillRect(x, y + h / 2 - 2, w, 4);
  for (let i = 0; i < boards; i++) plank(ctx, x - 12, y + 8 + (i * (h - 16)) / Math.max(1, boards - 1) - 8, w + 24, 16, (r() - 0.5) * 0.25);
}

export function plank(ctx, x, y, w, h, angle = 0, color = '#8a6a44') {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#333';
  ctx.fillRect(-w / 2 + 4, -1, 3, 3); ctx.fillRect(w / 2 - 7, -1, 3, 3);
  ctx.restore();
}

export function can(ctx, x, y, r) {
  const colors = ['#b5452f', '#c9a13a', '#4a7a5a', '#d8d2c0', '#3e5a7a', '#8a4a6a'];
  const tall = 12 + r() * 8, wide = 11 + r() * 5;
  ctx.fillStyle = '#9a9a92';
  ctx.fillRect(x, y - tall, wide, tall);
  ctx.fillStyle = colors[Math.floor(r() * colors.length)];
  ctx.fillRect(x, y - tall * 0.8, wide, tall * 0.55);
  return wide + 2;
}

export function box(ctx, x, y, w, h, r, label) {
  ctx.fillStyle = ['#a8865a', '#b89468', '#9a7a50'][Math.floor(r() * 3)];
  ctx.fillRect(x, y - h, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.strokeRect(x, y - h, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(x, y - h, w, 4);
  if (label) { ctx.fillStyle = '#3a2a1a'; ctx.font = '10px sans-serif'; ctx.fillText(label, x + 4, y - h / 2 + 3); }
}

export function jug(ctx, x, y, level = 1) {
  ctx.fillStyle = 'rgba(200, 220, 230, 0.55)';
  ctx.fillRect(x, y - 30, 18, 30);
  ctx.fillStyle = 'rgba(90, 140, 180, 0.7)';
  ctx.fillRect(x, y - 30 * level, 18, 30 * level);
  ctx.fillStyle = '#2a5a8a';
  ctx.fillRect(x + 6, y - 35, 6, 5);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.strokeRect(x, y - 30, 18, 30);
}

export function gasCan(ctx, x, y) {
  ctx.fillStyle = '#b0302a';
  ctx.fillRect(x, y - 28, 24, 28);
  ctx.fillStyle = '#8a2420';
  ctx.fillRect(x + 4, y - 34, 12, 6);
  ctx.fillRect(x + 18, y - 36, 4, 10);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.strokeRect(x, y - 28, 24, 28);
}

// Someone lying down (in bed or on a mattress), head to the left.
export function sleeper(ctx, x, y, shirt, hurt) {
  ctx.fillStyle = shirt;
  ctx.fillRect(x + 20, y - 14, 70, 14);
  ctx.fillStyle = '#c9a48a';
  ctx.beginPath(); ctx.arc(x + 12, y - 8, 8, 0, Math.PI * 2); ctx.fill();
  if (hurt) {
    ctx.fillStyle = '#eee';
    ctx.fillRect(x + 4, y - 12, 16, 4); // head bandage
    ctx.fillStyle = '#9a2a1c';
    ctx.fillRect(x + 12, y - 12, 4, 4);
  }
}

// A standing person seen from the side or front, feet at (x, y).
export function person(ctx, x, y, shirt, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#3a3a40';
  ctx.fillRect(-9, -50, 7, 50); ctx.fillRect(2, -50, 7, 50);
  ctx.fillStyle = shirt;
  ctx.fillRect(-12, -88, 24, 40);
  ctx.fillStyle = '#c9a48a';
  ctx.beginPath(); ctx.arc(0, -98, 9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export const SHIRTS = ['#6a5a4a', '#3e5a7a', '#7a3a34', '#4a6a4a', '#8a7a5a', '#5a4a6a', '#9a8a70'];

// A pencil note in the corner, like an inventory scrawled on the wall.
export function note(ctx, lines, x = 16, y = 22) {
  ctx.font = '600 17px Caveat, "Comic Sans MS", cursive';
  ctx.textBaseline = 'alphabetic';
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20;
  ctx.fillStyle = 'rgba(250, 247, 235, 0.92)';
  ctx.fillRect(x, y - 16, w, lines.length * 20 + 10);
  ctx.fillStyle = '#6a6a6a';
  ctx.fillRect(x + w / 2 - 3, y - 18, 6, 6); // tack
  ctx.fillStyle = '#2a2a3a';
  lines.forEach((l, i) => ctx.fillText(l, x + 10, y + 6 + i * 20));
}
