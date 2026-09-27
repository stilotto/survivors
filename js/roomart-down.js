// Pictures of the ground floor and the cellar. What's drawn is what the
// group has: shelves fill and overflow with food, gas cans line the wall,
// boards go up over the windows.
import { W, H, room, windowAt, plank, can, box, jug, gasCan, note, random, person, SHIRTS } from './sketch.js';

const boardsFor = (fort) => Math.min(4, Math.floor(fort / 1.5));

export function kitchen(ctx, game) {
  const r = random(game.seed, 1);
  room(ctx, '#c8c0a0', '#6a5440');
  windowAt(ctx, 380, 50, 120, 90, boardsFor(game.fort));
  // Counter, sink and the old stove.
  ctx.fillStyle = '#e0dccf'; ctx.fillRect(330, 180, 310, 90);
  ctx.fillStyle = '#8a8478'; ctx.fillRect(330, 176, 310, 8);
  ctx.fillStyle = '#9aa0a0'; ctx.fillRect(400, 184, 80, 14);
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(560, 150, 70, 120);
  ctx.fillStyle = '#444'; for (const x of [572, 602]) { ctx.beginPath(); ctx.arc(x, 156, 9, 0, Math.PI * 2); ctx.fill(); }

  // Pantry shelves: three of them, ten cans each. Past that it piles up.
  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(30, 40, 8, 230); ctx.fillRect(282, 40, 8, 230);
  const food = game.res.food;
  let left = food;
  for (const y of [100, 170, 240]) {
    ctx.fillStyle = '#8a6a44'; ctx.fillRect(30, y, 260, 8);
    let x = 44;
    for (let i = 0; i < 10 && left > 0; i++, left--) x += can(ctx, x, y, r) + 8;
    if (x === 44) { ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(44, y - 3, 230, 3); } // dust
  }
  // Overflow: cans on the counter, boxes on the floor.
  for (let x = 340; left > 0 && x < 390; left--) x += can(ctx, x, 176, r) + 2;
  for (let i = 0; left > 0 && i < 8; i++, left -= 4) box(ctx, 40 + i * 34, 330 - (i % 2) * 8, 30, 24, r);
  const days = Math.floor(food / Math.max(1, game.crew.length));
  note(ctx, [food ? `Food: ${days ? `about ${days} day${days > 1 ? 's' : ''}` : 'not a full day'}` : 'No food left', `${game.crew.length} of us`],
    300, 40);
  if (!food) { ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(30, 40, 260, 230); }
}

export function living(ctx, game) {
  const r = random(game.seed, 2);
  room(ctx, '#b8a888', '#5a4636');
  const boards = boardsFor(game.fort);
  windowAt(ctx, 60, 60, 110, 120, boards);
  windowAt(ctx, 250, 60, 110, 120, boards);
  // Fireplace under the chimney, east wall.
  ctx.fillStyle = '#8a4a3a'; ctx.fillRect(470, 60, 150, 210);
  ctx.fillStyle = '#1a1614'; ctx.fillRect(505, 170, 80, 100);
  ctx.fillStyle = '#6a3a2a'; ctx.fillRect(460, 150, 170, 14);
  if (game.fort >= 4) { // the couch shoved against the front windows
    ctx.fillStyle = '#5a6a5a'; ctx.fillRect(40, 190, 340, 60);
    ctx.fillStyle = '#4a5a4a'; ctx.fillRect(40, 170, 340, 26);
  }

  // The stockpile: lumber along the wall, gas cans by the hearth.
  const parts = game.res.parts;
  for (let i = 0; i < Math.min(parts, 14); i++) plank(ctx, 60 + (i % 2) * 20, 330 - i * 9, 240, 9, 0, i % 3 ? '#9a7a50' : '#8a6a40');
  for (let i = 0; i < Math.min(game.res.fuel, 10); i++) gasCan(ctx, 380 + (i % 5) * 30, 340 - Math.floor(i / 5) * 30);
  const extra = Math.max(0, game.res.food - 38);
  for (let i = 0; i < Math.min(8, Math.ceil(extra / 4)); i++) box(ctx, 470 + (i % 4) * 40, 350 - Math.floor(i / 4) * 30, 36, 28, r, 'FOOD');
  note(ctx, [`Gas: ${game.res.fuel} cans`, `Lumber: ${parts}`, fortNote(game.fort)], 400, 30);
}

const fortNote = (f) => (f < 1 ? 'Windows open!' : f < 3 ? 'Few boards up' : f < 6 ? 'Windows boarded' : 'Boarded tight');

export function dining(ctx, game) {
  room(ctx, '#a8b0a0', '#5a4636');
  windowAt(ctx, 40, 60, 100, 110, boardsFor(game.fort));
  // The county map and the drone prints pinned to the wall.
  ctx.fillStyle = '#e8e2c8'; ctx.fillRect(190, 30, 260, 170);
  ctx.strokeStyle = '#9ab09a'; ctx.lineWidth = 2;
  const r = random(game.seed, 3);
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(190, 40 + r() * 150); ctx.bezierCurveTo(260, r() * 200, 380, r() * 200, 450, 40 + r() * 150); ctx.stroke(); }
  ctx.lineWidth = 1;
  const shown = game.photos.slice(-10);
  shown.forEach((p, i) => {
    const x = 200 + (i % 5) * 50, y = 50 + Math.floor(i / 5) * 70;
    ctx.fillStyle = '#fbfaf5'; ctx.fillRect(x, y, 44, 40);
    ctx.fillStyle = '#6a7a5a'; ctx.fillRect(x + 3, y + 3, 38, 26);
    ctx.fillStyle = '#b03a2e'; ctx.fillRect(x + 20, y - 2, 4, 4);
  });
  // The table, chairs pulled up.
  ctx.fillStyle = '#6a4a2a'; ctx.fillRect(140, 230, 360, 22);
  ctx.fillRect(160, 252, 12, 90); ctx.fillRect(468, 252, 12, 90);
  ctx.fillStyle = '#f0ead8'; ctx.fillRect(260, 222, 70, 10); // the notebook
  ctx.fillStyle = '#4a3420';
  for (const x of [110, 520]) { ctx.fillRect(x, 200, 10, 140); ctx.fillRect(x - 10, 260, 30, 8); }
}

export function cellar(ctx, game) {
  const r = random(game.seed, 4);
  // Fieldstone walls, a dirt-and-concrete floor, joists overhead.
  ctx.fillStyle = '#5a5650'; ctx.fillRect(0, 0, W, 280);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = ['#6a665e', '#4e4a44', '#625e56'][i % 3];
    ctx.beginPath(); ctx.ellipse(r() * W, r() * 270, 18 + r() * 14, 10 + r() * 6, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#4a4640'; ctx.fillRect(0, 280, W, H - 280);
  ctx.fillStyle = '#3a2c20'; for (let x = 20; x < W; x += 90) ctx.fillRect(x, 0, 18, 22);
  ctx.fillStyle = '#9aa09a'; ctx.fillRect(470, 40, 90, 34); // the one little window

  // Workbench with the press bolted to it.
  ctx.fillStyle = '#7a5a3a'; ctx.fillRect(40, 200, 340, 18);
  ctx.fillRect(50, 218, 14, 100); ctx.fillRect(356, 218, 14, 100);
  ctx.fillStyle = '#2a4a6a'; // the press: base, column, ram, handle
  ctx.fillRect(90, 180, 60, 20); ctx.fillRect(105, 100, 14, 80); ctx.fillRect(98, 96, 44, 18);
  ctx.fillStyle = '#888'; ctx.fillRect(140, 70, 6, 40); ctx.beginPath(); ctx.arc(143, 68, 7, 0, Math.PI * 2); ctx.fill();
  // Powder and primers left, one tin per ten rounds.
  const press = game.press ?? 0;
  for (let i = 0; i < Math.ceil(press / 10); i++) {
    ctx.fillStyle = i % 2 ? '#8a2a1c' : '#3a3a3a';
    ctx.fillRect(170 + i * 24, 178, 20, 22);
  }
  // Ammo cans on the shelf and under the bench, twenty rounds each.
  ctx.fillStyle = '#7a5a3a'; ctx.fillRect(420, 150, 200, 8);
  const cans = Math.ceil(game.res.ammo / 20);
  for (let i = 0; i < Math.min(cans, 14); i++) {
    const x = i < 5 ? 425 + i * 38 : 70 + (i - 5) * 34, y = i < 5 ? 150 : 318;
    ctx.fillStyle = '#4a5a3a'; ctx.fillRect(x, y - 26, 32, 26);
    ctx.fillStyle = '#3a4a2a'; ctx.fillRect(x + 8, y - 30, 16, 4);
  }
  if (game.crew.some((p) => game.orders[p.id]?.task === 'reload')) person(ctx, 250, 330, SHIRTS[2], 0.9);
  note(ctx, [`Rounds: ${game.res.ammo}`, press ? `Powder for ~${press} more` : 'Out of powder'], 420, 200);
}
