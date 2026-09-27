// Drone model and flight: manual control, GPS autopilot, battery.
import * as THREE from 'three';
import { HOME, WORLD } from './geo.js';
import { houseCollide, houseTop } from './house.js';

const MAX_SPEED = 16, CLIMB_SPEED = 6, YAW_RATE = 1.6, ACCEL = 2.5;
const CRUISE = 18, MIN_AGL = 0.3, MAX_AGL = 400;
const DRAIN = 100 / (12 * 60); // percent per second of flight: 12 minutes
const CHARGE = 2;               // percent per second on the pad (the generator; see setCharger)
const WARP_LEFT = 4;            // seconds of flight a warp leaves
const START_YAW = 70 * Math.PI / 180; // launch heading 290°: house on the right, buildings on the horizon

export function createDrone(terrain, reducedMotion) {
  const model = buildModel();
  model.rotation.order = 'YXZ';
  const houseGround = terrain.heightAt(0, 0);
  // What the drone stands on: the ground, or the house where it's in the way (the pad is on the porch roof).
  const floorAt = (x, z) => Math.max(terrain.heightAt(x, z), houseGround + houseTop(x, z));
  const pos = new THREE.Vector3(HOME.x, floorAt(HOME.x, HOME.z) + MIN_AGL, HOME.z);
  const vel = new THREE.Vector3();
  const state = { pos, vel, yaw: START_YAW, battery: 100, mode: 'landed', target: null, landing: false, rotor: 0 };
  const listeners = [];
  let charger = (pct) => pct; // returns how much charge the house can give
  const say = (msg) => listeners.forEach((fn) => fn(msg));

  function flyTo(x, z, agl, land = false) {
    const m = 20;
    state.target = { x: clamp(x, WORLD.minX + m, WORLD.maxX - m), z: clamp(z, WORLD.minZ + m, WORLD.maxZ - m), agl };
    state.landing = land;
    state.mode = 'auto';
    say(land ? 'Returning home' : 'Autopilot engaged');
  }

  function update(dt, input) {
    const ground = floorAt(pos.x, pos.z);
    const manual = input.fwd || input.strafe || input.climb || input.yaw;
    const dead = state.battery <= 0;
    if (manual && state.mode === 'auto' && !dead) { state.mode = 'manual'; state.target = null; say('Manual control'); }
    if (manual && state.mode === 'landed' && !dead) state.mode = 'manual';

    const want = new THREE.Vector3();
    let yawRate = 0;
    if (dead) {
      want.y = -3;
    } else if (state.mode === 'manual') {
      const fwd = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
      const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
      want.addScaledVector(fwd, input.fwd * MAX_SPEED).addScaledVector(right, input.strafe * MAX_SPEED);
      want.y = input.climb * CLIMB_SPEED;
      yawRate = input.yaw * YAW_RATE;
    } else if (state.mode === 'auto') {
      const t = state.target;
      const dx = t.x - pos.x, dz = t.z - pos.z, dist = Math.hypot(dx, dz);
      // Hold altitude above the higher of the ground here and a bit ahead.
      const ahead = Math.min(dist, 60) / Math.max(dist, 1);
      const floor = Math.max(ground, floorAt(pos.x + dx * ahead, pos.z + dz * ahead));
      const arrived = dist < 1.5;
      const agl = arrived && state.landing ? 0 : t.agl;
      want.y = clamp((floor + agl - pos.y) * 0.8, -CLIMB_SPEED, CLIMB_SPEED);
      const tooLow = pos.y < floor + Math.min(agl, 15) - 2;
      const speed = tooLow ? 0 : Math.min(CRUISE, dist * 0.6);
      if (dist > 0.01) want.x = dx / dist * speed, want.z = dz / dist * speed;
      if (dist > 8) yawRate = clamp(angleDiff(Math.atan2(-dx, -dz), state.yaw) * 2, -YAW_RATE, YAW_RATE);
      if (arrived && !state.landing && Math.abs(pos.y - (floor + agl)) < 1 && t.announce !== false) {
        t.announce = false;
        say('Arrived. Hovering.');
      }
    }

    if (state.mode !== 'landed') {
      vel.lerp(want, 1 - Math.exp(-ACCEL * dt));
      state.yaw += yawRate * dt;
      pos.addScaledVector(vel, dt);
      pos.x = clamp(pos.x, WORLD.minX + 10, WORLD.maxX - 10);
      pos.z = clamp(pos.z, WORLD.minZ + 10, WORLD.maxZ - 10);
      pos.y = Math.min(pos.y, ground + MAX_AGL);
      houseCollide(pos, vel, houseGround);
      const g = floorAt(pos.x, pos.z) + MIN_AGL;
      if (pos.y <= g) {
        pos.y = g;
        if (vel.y < 0) vel.y = 0;
        if (want.y < 0 && Math.hypot(vel.x, vel.z) < 1) land();
      }
      state.battery = Math.max(0, state.battery - DRAIN * dt);
      if (state.battery < 20 && !state.lowWarned) { state.lowWarned = true; say('Battery low. Head home.'); }
      if (state.battery <= 0 && !state.deadWarned) { state.deadWarned = true; say('Battery empty. Descending.'); }
    } else if (atHome()) {
      state.battery = Math.min(100, state.battery + charger(Math.min(CHARGE * dt, 100 - state.battery)));
      if (state.battery > 20) state.lowWarned = state.deadWarned = false;
    }

    model.position.copy(pos);
    model.rotation.set(0, state.yaw, 0);
    if (!reducedMotion) {
      const local = vel.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -state.yaw);
      model.rotation.x = clamp(local.z * 0.02, -0.3, 0.3);
      model.rotation.z = clamp(-local.x * 0.02, -0.3, 0.3);
      if (state.mode !== 'landed') model.userData.rotors.forEach((r) => { r.rotation.y += dt * 40; });
    }
  }

  function land() {
    vel.set(0, 0, 0);
    state.mode = 'landed';
    state.target = null;
    say(atHome() ? 'Landed at home. Charging.' : 'Landed.');
  }

  // Skip most of an autopilot leg. Battery pays for the skipped flight time,
  // and the skipped seconds are returned for a future game clock.
  function canWarp() {
    const t = state.target;
    return state.mode === 'auto' && !!t && Math.hypot(t.x - pos.x, t.z - pos.z) > CRUISE * WARP_LEFT * 2;
  }

  function warp() {
    if (!canWarp()) return 0;
    const t = state.target;
    const dx = t.x - pos.x, dz = t.z - pos.z, dist = Math.hypot(dx, dz);
    const skip = dist - CRUISE * WARP_LEFT;
    const secs = skip / CRUISE;
    pos.x += dx / dist * skip;
    pos.z += dz / dist * skip;
    pos.y = Math.max(pos.y, terrain.heightAt(pos.x, pos.z) + Math.min(t.agl, 15));
    vel.set(dx / dist * CRUISE, 0, dz / dist * CRUISE);
    state.yaw = Math.atan2(-dx, -dz);
    state.battery = Math.max(0, state.battery - DRAIN * secs);
    say(`Warped ${Math.round(secs)} s ahead`);
    return secs;
  }

  function atHome() { return Math.hypot(pos.x - HOME.x, pos.z - HOME.z) < 8; }

  return {
    state, model, flyTo, update, atHome, canWarp, warp,
    goHome: () => flyTo(HOME.x, HOME.z, 40, true),
    setCharger: (fn) => { charger = fn; },
    // Back on the pad with a full battery (overnight on the solar panels).
    reset() {
      pos.set(HOME.x, floorAt(HOME.x, HOME.z) + MIN_AGL, HOME.z);
      vel.set(0, 0, 0);
      Object.assign(state, { yaw: START_YAW, battery: 100, mode: 'landed', target: null, landing: false,
        lowWarned: false, deadWarned: false });
    },
    onMessage: (fn) => listeners.push(fn),
    groundBelow: () => terrain.heightAt(pos.x, pos.z),
  };
}

function buildModel() {
  const g = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.45), dark);
  body.position.y = 0.15;
  g.add(body);
  const rotors = [];
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.42), dark);
    arm.position.set(x / 2, 0.15, z / 2);
    arm.rotation.y = Math.atan2(x, z);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.01, 0.03),
      new THREE.MeshLambertMaterial({ color: 0x777777 }));
    rotor.position.set(x, 0.2, z);
    rotors.push(rotor);
    g.add(arm, rotor);
  }
  const light = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02),
    new THREE.MeshBasicMaterial({ color: 0xff4030 }));
  light.position.set(0, 0.15, -0.23);
  g.add(light);
  g.userData.rotors = rotors;
  return g;
}

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
