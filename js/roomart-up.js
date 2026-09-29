// Pictures of the upstairs rooms and the attic.
import { W, H, room, windowAt, note, random, sleeper, person, jug, SHIRTS } from './sketch.js';

const boardsFor = (fort) => Math.min(4, Math.floor(fort / 1.5));

// Beds and mattresses on the floor, one per person. The hurt stay in bed.
export function bedrooms(ctx, game) {
  room(ctx, '#b0a8b8', '#6a5440');
  windowAt(ctx, 260, 50, 110, 110, boardsFor(game.fort));
  game.crew.forEach((p, i) => {
    const x = 16 + (i % 4) * 156, y = 312 + Math.floor(i / 4) * 40;
    const bed = i < 2;
    if (bed) { ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x - 6, y - 50, 10, 54); } // headboard
    ctx.fillStyle = '#d8d2c0'; ctx.fillRect(x, y - 16, 140, 20); // mattress
    ctx.fillStyle = '#f0ece0'; ctx.fillRect(x + 4, y - 22, 26, 8); // pillow
    if (p.hurt) sleeper(ctx, x + 6, y - 14, SHIRTS[i % SHIRTS.length], true);
    ctx.fillStyle = ['#8a9aaa', '#aa8a7a', '#8aaa8a', '#a09a7a'][i % 4];
    ctx.fillRect(x + (p.hurt ? 50 : 36), y - (p.hurt ? 26 : 20), p.hurt ? 88 : 102, p.hurt ? 14 : 8); // blanket
  });
  const hurt = game.crew.filter((p) => p.hurt);
  note(ctx, hurt.length ? hurt.map((p) => `${p.first}: ${p.hurt > 1 ? 'badly hurt' : 'hurt'}`) : ['Everyone up and about'], 420, 40);
}

// The medicine cabinet, and the tub filled with water the first night.
export function bathroom(ctx, game) {
  const r = random(game.seed, 5);
  room(ctx, '#c8d0cc', '#8a8a84', false);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, 270); ctx.stroke(); }
  // Cabinet with its door hanging open.
  ctx.fillStyle = '#e8e8e0'; ctx.fillRect(60, 40, 170, 140);
  ctx.fillStyle = '#b8c0c0'; ctx.fillRect(232, 40, 50, 140);
  const meds = game.res.meds;
  for (let i = 0; i < Math.min(meds, 18); i++) {
    const x = 70 + (i % 6) * 26, y = 80 + Math.floor(i / 6) * 44;
    ctx.fillStyle = ['#c87a3a', '#f0f0f0', '#6a8ab0', '#b04a3a'][Math.floor(r() * 4)];
    ctx.fillRect(x, y - 24, 16, 24);
    ctx.fillStyle = '#eee'; ctx.fillRect(x, y - 28, 16, 5);
  }
  ctx.fillStyle = '#9a9a92'; for (const y of [82, 126, 170]) ctx.fillRect(62, y, 166, 3);
  windowAt(ctx, 470, 40, 90, 120, boardsFor(game.fort));
  // Clawfoot tub; the water line is our water.
  const level = Math.min(1, game.res.water / 30);
  ctx.fillStyle = '#f0f0ea'; ctx.fillRect(320, 220, 290, 90);
  ctx.fillStyle = 'rgba(90, 140, 170, 0.8)'; ctx.fillRect(330, 300 - 70 * level, 270, 70 * level);
  ctx.fillStyle = '#e0e0da'; ctx.fillRect(314, 214, 302, 12);
  ctx.fillStyle = '#8a8a84'; for (const x of [330, 590]) ctx.fillRect(x, 310, 12, 18);
  for (let i = 0; i < Math.min(6, Math.floor(game.res.water / 5)); i++) jug(ctx, 60 + i * 26, 330);
  note(ctx, [`Medicine: ${meds}`, `Water: ${game.res.water}`, 'Pump gives ~4 a day'], 60, 220);
}

// The front bedroom: the window onto the porch roof, the radio, the drone.
export function frontBedroom(ctx, game, drone) {
  room(ctx, '#a8a098', '#6a5440');
  windowAt(ctx, 200, 40, 240, 170, 0, '#b8bcb4');
  ctx.fillStyle = '#4a4a48'; ctx.fillRect(200, 180, 240, 30); // porch roof outside
  const home = drone.atHome() && drone.state.mode === 'landed';
  if (home) { ctx.fillStyle = '#222'; ctx.fillRect(300, 186, 40, 8); ctx.fillRect(292, 184, 12, 3); ctx.fillRect(336, 184, 12, 3); }
  // Desk: radio, controller, the charger running off the generator line.
  ctx.fillStyle = '#6a4a2a'; ctx.fillRect(40, 230, 200, 16); ctx.fillRect(48, 246, 10, 90); ctx.fillRect(222, 246, 10, 90);
  ctx.fillStyle = '#3a3a38'; ctx.fillRect(60, 196, 70, 34); ctx.fillStyle = '#c9a13a'; ctx.fillRect(70, 206, 30, 8);
  ctx.fillStyle = '#222'; ctx.fillRect(150, 214, 60, 16);
  ctx.fillStyle = '#6a9a6a'; ctx.fillRect(160, 217, 40, 10);
  const watcher = game.crew.find((p) => game.orders[p.id]?.task === 'watch');
  if (watcher) person(ctx, 280, 340, SHIRTS[1], 1);
  const bat = Math.ceil(drone.state.battery);
  note(ctx, [home ? `Drone on the roof, ${bat}%` : `Drone out, ${bat}%`, watcher ? `${watcher.first} on the feed` : 'Nobody on the feed'], 450, 250);
}

// Up under the roof: the lookout. The dead in the trees are the ones the
// house has drawn in.
export function attic(ctx, game) {
  const r = random(game.seed, game.day, 6);
  ctx.fillStyle = '#4a3e32'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#3a2e24';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W / 2, 0); ctx.lineTo(0, 200); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W / 2, 0); ctx.lineTo(W, 200); ctx.fill();
  ctx.fillStyle = '#5a4a38'; for (let x = 40; x < W; x += 80) ctx.fillRect(x, 0, 10, H);
  ctx.fillStyle = '#6a5a48'; ctx.fillRect(0, 290, W, 70);
  // The gable window, looking out over the fields.
  const x = 200, y = 70, w = 240, h = 150;
  windowAt(ctx, x, y, w, h, 0, '#9aa4a0', r);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const seen = Math.min(40, Math.round(game.threat));
  ctx.fillStyle = '#2a2a24';
  for (let i = 0; i < seen; i++) {
    const fx = x + 8 + r() * (w - 16), fy = y + h * (0.62 + r() * 0.3), s = 0.5 + (fy - y) / h * 0.6;
    ctx.fillRect(fx, fy - 12 * s, 3 * s, 12 * s);
    ctx.fillRect(fx - 0.5, fy - 15 * s, 4 * s, 3.5 * s);
  }
  ctx.restore();
  ctx.fillStyle = '#3a342c'; ctx.fillRect(x + w / 2 - 2, y, 4, h); ctx.fillRect(x, y + h / 2 - 2, w, 4);
  // Cot and a rifle for whoever has the watch.
  ctx.fillStyle = '#5a6a4a'; ctx.fillRect(40, 300, 150, 14);
  ctx.fillStyle = '#2a2a2a'; ctx.save(); ctx.translate(560, 300); ctx.rotate(-0.25); ctx.fillRect(0, -110, 6, 110); ctx.restore();
  const guards = game.crew.filter((p) => game.orders[p.id]?.task === 'guard');
  guards.slice(0, 2).forEach((p, i) => person(ctx, 250 + i * 120, 330, SHIRTS[(i + 3) % SHIRTS.length], 0.9));
  const count = seen === 0 ? 'Nothing in the trees' : seen < 4 ? 'A few in the trees' : seen < 12 ? `${seen} or so in the trees` : 'Too many to count';
  note(ctx, [count, guards.length ? `On watch: ${guards.map((p) => p.first).join(', ')}` : 'No one on watch tonight'], 20, 30);
}
