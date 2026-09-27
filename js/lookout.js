// Looking out a window of the farmhouse: the live world, seen from that
// spot through the sash and whatever boards are nailed across it. Drag to
// look around a little. Whoever is at the window says what they see.
import * as THREE from 'three';
import { compass } from './ambient.js';

const BASE = 0.4; // floor height above the ground, as in house.js
const FACE = { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };

// Each room's windows, in house coordinates (see house.js), just outside the
// glass so the house's own walls don't block the camera. `boards` windows
// get the boards the group has nailed up; the front bedroom's stays clear
// for the drone, and nobody bothers with the attic.
const WINDOWS = {
  attic: [{ name: 'West gable', x: -5.25, y: 6.5, z: 0, face: 'w' },
    { name: 'East gable', x: 5.25, y: 6.5, z: 0, face: 'e' }],
  front: [{ name: 'Over the porch roof', x: -3.2, y: 4.2, z: 4, face: 's' },
    { name: 'West side', x: -5.25, y: 4.2, z: 2, face: 'w' }],
  bedrooms: [{ name: 'Out the back', x: 4.2, y: 4.2, z: -4, face: 'n', boards: true },
    { name: 'East side', x: 5.25, y: 4.2, z: 2, face: 'e', boards: true }],
  bath: [{ name: 'East side', x: 5.25, y: 4.2, z: -1.3, face: 'e', boards: true }],
  kitchen: [{ name: 'Toward the shed', x: 2.75, y: 1.5, z: -7.2, face: 'e', boards: true },
    { name: 'The back field', x: -2.25, y: 1.5, z: -8.5, face: 'n', boards: true }],
  dining: [{ name: 'The side yard', x: 5.25, y: 1.5, z: 2, face: 'e', boards: true }],
  living: [{ name: 'The front yard', x: 3.3, y: 1.5, z: 4, face: 's', boards: true },
    { name: 'West side', x: -5.25, y: 1.5, z: -1.3, face: 'w', boards: true }],
};

export const windowsFor = (room) => WINDOWS[room] ?? [];
const boardsFor = (fort) => Math.min(4, Math.floor(fort / 1.5)); // as in the room pictures

const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

export function createLookout(el, { terrain, walkers, ambient, onClose }) {
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 20000);
  const ground = terrain.heightAt(0, 0) + BASE;
  const boardsEl = el.querySelector('.lo-boards');
  const sayEl = el.querySelector('#lo-say');
  const nextBtn = el.querySelector('#lo-next');
  let room = null, index = 0, view = null, look = { yaw: 0, pitch: 0 };
  let sayTimer = 0, drag = null;

  el.querySelector('#lo-back').onclick = close;
  nextBtn.onclick = () => show((index + 1) % windowsFor(room.id).length);
  addEventListener('keydown', (e) => {
    if (el.hidden) return;
    if (e.code === 'Escape' || e.code === 'KeyB') close();
    else if (e.code === 'KeyN' && !nextBtn.hidden) nextBtn.click();
  });

  // Drag to turn the head, within what the window frame allows.
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    drag = { x: e.clientX, y: e.clientY, yaw: look.yaw, pitch: look.pitch };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = 1.6 / Math.max(innerWidth, innerHeight);
    look.yaw = clamp(drag.yaw + (e.clientX - drag.x) * k, -0.7, 0.7);
    look.pitch = clamp(drag.pitch + (e.clientY - drag.y) * k, -0.45, 0.3);
  });
  const end = () => { drag = null; };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  function boards(n) {
    boardsEl.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const b = document.createElement('div');
      b.className = 'lo-board';
      const top = n === 1 ? 58 : 8 + (i * 80) / (n - 1);
      b.style.top = `${top}%`;
      b.style.transform = `rotate(${((i * 37) % 7 - 3) * 1.1}deg)`;
      boardsEl.append(b);
    }
  }

  // What someone at this window would notice, in a line or two.
  function report() {
    const [x, z] = [view.x, view.z], face = FACE[view.face];
    const inView = (dx, dz) => Math.abs(angle(Math.atan2(-dx, -dz) - face)) < 0.6;
    let near = 0, far = 0;
    walkers.forEachNear(x, z, 400, (wx, wy, wz) => {
      const d = Math.hypot(wx - x, wz - z);
      if (!inView(wx - x, wz - z)) return;
      if (d < 120) near++; else far++;
    });
    const lines = [];
    if (near) lines.push(near === 1 ? 'One of them, close to the house.' : `${NUM[near] ?? 'A lot'} of them, close to the house.`);
    else if (far) lines.push(far === 1 ? 'One of them, way out by the trees.' : `${NUM[far] ?? 'A lot'} of them out along the tree line.`);
    else lines.push('Nothing moving out there right now.');
    const smoke = ambient.plumes.find((p) => inView(p.x - x, p.z - z));
    if (smoke) lines.push(`Smoke to the ${compass(smoke.x, smoke.z)}. Something big is burning.`);
    return lines;
  }

  let who = 'Someone';
  function say(lines) {
    clearTimeout(sayTimer);
    const next = () => {
      const line = lines.shift();
      sayEl.classList.toggle('show', !!line);
      if (!line) return;
      sayEl.innerHTML = '';
      const b = document.createElement('span');
      b.className = 'who';
      b.textContent = `${who}: `;
      sayEl.append(b, line);
      sayTimer = setTimeout(next, 1800 + line.length * 55);
    };
    next();
  }

  function show(i) {
    const list = windowsFor(room.id);
    index = i;
    view = list[i];
    look = { yaw: 0, pitch: -0.05 };
    el.querySelector('#lo-room').textContent = room.name;
    el.querySelector('#lo-name').textContent = `${view.name}, looking ${{ n: 'north', s: 'south', e: 'east', w: 'west' }[view.face]}`;
    nextBtn.hidden = list.length < 2;
    boards(view.boards ? boardsFor(game.fort) : 0);
    say(report());
  }

  let game = null;
  function open(r, i, g, person) {
    room = r; game = g; who = person;
    el.hidden = false;
    show(i);
  }

  function close() {
    el.hidden = true;
    clearTimeout(sayTimer);
    onClose(room.id);
  }

  return {
    open, close,
    get isOpen() { return !el.hidden; },
    get pos() { return { x: view.x, y: ground + view.y, z: view.z }; },
    // A line from whoever is at the window, like a sighting.
    say: (line) => say([line]),
    render(renderer, scene) {
      const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
      if (camera.aspect !== w / h) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
      camera.position.set(view.x, ground + view.y, view.z);
      camera.rotation.set(look.pitch, FACE[view.face] - look.yaw, 0, 'YXZ');
      renderer.render(scene, camera);
    },
  };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function angle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
