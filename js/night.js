// The night attack, seen from the front bedroom window over the porch roof:
// the world goes dark, the dead come across the meadow, whoever keeps watch
// fires from the upstairs windows, and it ends with the house holding or
// with glass breaking downstairs. Plays after "End the day" when they come.
import * as THREE from 'three';

const BASE = 0.4; // floor height above the ground, as in house.js
const VIEW = { x: -3.2, y: 4.2, z: 4 }; // the front bedroom window
const LENGTH = 20; // seconds
const NIGHT_SKY = new THREE.Color(0x0b0f18);

export function createNight(el, { scene, lights, terrain, walkers, reducedMotion, onDone }) {
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 20000);
  const ground = terrain.heightAt(0, 0) + BASE;
  const sayEl = el.querySelector('#ni-say');
  const moon = new THREE.DirectionalLight(0x8fa2c8, 0.5);
  moon.position.set(0.6, 1, 0.8);
  const flash = new THREE.PointLight(0xffc070, 0, 60, 1.5);
  flash.position.set(VIEW.x, ground + VIEW.y - 0.3, VIEW.z + 0.6);
  let t = 0, plan = null, dead = [], saved = null, sayTimer = 0, look = 0;

  el.querySelector('#ni-skip').onclick = () => finish();
  addEventListener('keydown', (e) => { if (!el.hidden && (e.code === 'Escape' || e.code === 'Space')) finish(); });

  function say(who, text) {
    clearTimeout(sayTimer);
    sayEl.innerHTML = '';
    const b = document.createElement('span');
    b.className = 'who';
    b.textContent = `${who}: `;
    sayEl.append(b, text);
    sayEl.classList.add('show');
    sayTimer = setTimeout(() => sayEl.classList.remove('show'), 1800 + text.length * 55);
  }

  function darken() {
    saved = { bg: scene.background, fog: scene.fog, lights: lights.map((l) => l.intensity) };
    scene.background = NIGHT_SKY;
    scene.fog = new THREE.Fog(NIGHT_SKY, 20, 220);
    lights.forEach((l) => { l.intensity *= 0.12; });
    scene.add(moon, flash);
  }

  function restore() {
    if (!saved) return;
    scene.background = saved.bg;
    scene.fog = saved.fog;
    lights.forEach((l, i) => { l.intensity = saved.lights[i]; });
    scene.remove(moon, flash);
    saved = null;
  }

  // Lines and events on a timeline, from what the night held.
  function script(night, day) {
    const who = night.guards[0] ?? 'Somebody';
    const cues = [[1, who, night.guards.length ? 'Here they come. Out past the porch.' : 'Something\'s out in the meadow. Everybody stay quiet.']];
    const shots = [];
    if (night.shots) {
      const n = Math.min(night.shots, dead.length, 8);
      for (let i = 0; i < n; i++) shots.push(6 + (i * 10) / n);
      cues.push([5.5, who, n > 1 ? 'Taking the shot.' : 'Just one. Taking it.']);
    }
    if (night.outcome === 'held') {
      cues.push([11, who, night.guards.length ? 'They\'re at the porch steps. Keep them off the door.' : 'They\'re on the porch. Don\'t make a sound.']);
      cues.push([17, who, 'They\'re drifting off. The boards held.']);
    } else {
      cues.push([10, who, 'Too many of them. They\'re at the front windows.']);
      cues.push([15.5, 'Downstairs', 'Glass! They\'re through the living room window!']);
      if (night.hurt) cues.push([18, who, night.lost ? `${night.hurt}! No, no...` : `${night.hurt}'s hurt. Push them back out!`]);
    }
    return { cues, shots, day, breach: night.outcome === 'breach' };
  }

  function open(night, day, seed) {
    t = 0; look = 0;
    dead = walkers.attack(night.size, seed + day);
    plan = script(night, day);
    el.querySelector('#ni-title').textContent = `Night, day ${day}`;
    el.classList.remove('breach');
    el.hidden = false;
    darken();
  }

  function finish() {
    if (el.hidden) return;
    el.hidden = true;
    clearTimeout(sayTimer);
    sayEl.classList.remove('show');
    restore();
    onDone();
  }

  function update(dt) {
    t += dt;
    while (plan.cues.length && plan.cues[0][0] <= t) { const [, who, text] = plan.cues.shift(); say(who, text); }
    flash.intensity = Math.max(0, flash.intensity - dt * 60);
    if (plan.shots.length && plan.shots[0] <= t) {
      plan.shots.shift();
      if (!reducedMotion) flash.intensity = 25;
      // The nearest one in front of the house goes down.
      const k = dead.filter((o) => o.z > 2).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0];
      if (k) { walkers.drop(k); dead = dead.filter((o) => o !== k); }
    }
    if (plan.breach && t > 15.5) el.classList.add('breach');
    // Whoever's at the window follows the nearest ones.
    const near = dead.filter((o) => o.z > 3).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z)).slice(0, 3);
    const aim = near.length ? near.reduce((a, o) => a + Math.atan2(o.x - VIEW.x, o.z - VIEW.z), 0) / near.length : 0;
    look += (Math.max(-0.6, Math.min(0.6, aim)) - look) * Math.min(1, dt * (reducedMotion ? 0.3 : 0.8));
    if (t >= LENGTH) finish();
  }

  return {
    open, update, finish,
    get isOpen() { return !el.hidden; },
    get pos() { return { x: VIEW.x, y: ground + VIEW.y, z: VIEW.z }; },
    render(renderer) {
      const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
      if (camera.aspect !== w / h) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
      camera.position.set(VIEW.x, ground + VIEW.y, VIEW.z);
      camera.rotation.set(-0.16, Math.PI + look, 0, 'YXZ');
      renderer.render(scene, camera);
    },
  };
}
