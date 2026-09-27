// Taking a picture with the drone camera: a small print for the board, and
// a plain account of what was actually in the frame and big enough to make
// out. Nothing here is known unless the picture could show it.
import * as THREE from 'three';

const FOV = 60, ASPECT = 1.5;
const FOCAL = 400 / Math.tan(FOV / 2 * Math.PI / 180); // px, for an 800-px-tall frame
const W = 360, H = 240;

export function createCamera() {
  const photoCam = new THREE.PerspectiveCamera(FOV, ASPECT, 0.1, 20000);
  const shotCam = new THREE.PerspectiveCamera(FOV, 1, 0.1, 20000);
  const print = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const v = new THREE.Vector3();

  // The gimbal camera, where the drone is pointing it.
  function aim(cam, drone, tilt) {
    cam.position.set(drone.state.pos.x, drone.state.pos.y + 0.05, drone.state.pos.z);
    cam.rotation.set(tilt, drone.state.yaw, 0, 'YXZ');
    cam.updateMatrixWorld();
  }

  // Screen spot of a world point in the frame, or null if outside it.
  function inFrame(cam, x, y, z) {
    v.set(x, y, z).project(cam);
    return v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95 ? { nx: v.x, ny: v.y } : null;
  }

  // Renders the frame into a small print (JPEG data URL).
  function develop(renderer, scene, drone, tilt) {
    const c = renderer.domElement;
    const a = c.width / c.height;
    // Render the whole canvas so its center 3:2 crop matches photoCam.
    const fit = a >= ASPECT ? 1 : ASPECT / a;
    shotCam.fov = 2 * Math.atan(Math.tan(FOV / 2 * Math.PI / 180) * fit) * 180 / Math.PI;
    shotCam.aspect = a;
    shotCam.updateProjectionMatrix();
    aim(shotCam, drone, tilt);
    const seen = drone.model.visible;
    drone.model.visible = false;
    renderer.render(scene, shotCam);
    drone.model.visible = seen;
    const sw = a >= ASPECT ? c.height * ASPECT : c.width, sh = sw / ASPECT;
    const ctx = print.getContext('2d');
    ctx.drawImage(c, (c.width - sw) / 2, (c.height - sh) / 2, sw, sh, 0, 0, W, H);
    // A little grain and a warm cast, like a print off the house printer.
    ctx.fillStyle = 'rgba(120, 90, 40, 0.06)';
    ctx.fillRect(0, 0, W, H);
    return print.toDataURL('image/jpeg', 0.7);
  }

  // What the frame shows: the building nearest the middle, the dead around
  // it, cars, and any sign of people.
  function survey({ drone, tilt, sites, walkers, cars, signals, terrain }) {
    aim(photoCam, drone, tilt);
    const pos = drone.state.pos;
    const agl = pos.y - drone.groundBelow();
    const px = (size, d) => size / Math.max(d, 1) * FOCAL;
    const visible = (x, y, z) => {
      // Is a hill in the way?
      for (let i = 1; i < 8; i++) {
        const t = i / 8;
        if (terrain.heightAt(pos.x + (x - pos.x) * t, pos.z + (z - pos.z) * t) > pos.y + (y - pos.y) * t + 1) return false;
      }
      return true;
    };

    let subject = null, best = Infinity;
    for (const s of sites) {
      const d = Math.hypot(s.x - pos.x, s.z - pos.z);
      if (d > 900 || px(s.radius * 2, d) < 25) continue;
      const y = terrain.heightAt(s.x, s.z) + 3;
      const f = inFrame(photoCam, s.x, y, s.z);
      if (!f || !visible(s.x, y, s.z)) continue;
      const score = f.nx * f.nx + f.ny * f.ny;
      if (score < best) { best = score; subject = s; }
    }

    // A painted sheet in frame wins over whatever else is there.
    let sign = null;
    for (const g of signals.list) {
      const d = Math.hypot(g.x - pos.x, g.z - pos.z);
      if (px(6, d) < 12) continue;
      const y = terrain.surfaceAt(g.x, g.z);
      if (inFrame(photoCam, g.x, y, g.z) && visible(g.x, y + 1, g.z)) {
        sign = { word: px(6, d) > 25 ? g.word : null, waving: g.person.visible && px(1.8, d) > 4 };
        subject = sites.find((s) => s.id === g.site) ?? subject;
        break;
      }
    }
    if (!subject) return { agl, subject: null, sign };

    const dist = Math.hypot(subject.x - pos.x, subject.z - pos.z);
    let dead = 0, unsure = 0, elsewhere = 0;
    walkers.forEachNear(pos.x, pos.z, 700, (x, y, z, k) => {
      const d = Math.hypot(x - pos.x, y - pos.y, z - pos.z);
      const size = px(1.8, d);
      if (size < 2 || !inFrame(photoCam, x, y + 1, z)) return;
      const near = k.site === subject.id || Math.hypot(x - subject.x, z - subject.z) < subject.radius + 25;
      if (!near) { if (size >= 4) elsewhere++; return; }
      if (size >= 4) dead++; else unsure++;
    });
    let carsSeen = 0;
    for (const c of cars.userData.spots) {
      if (Math.hypot(c.x - subject.x, c.z - subject.z) > subject.radius + 20) continue;
      const d = Math.hypot(c.x - pos.x, c.z - pos.z);
      if (px(4.4, d) > 6 && inFrame(photoCam, c.x, terrain.surfaceAt(c.x, c.z) + 1, c.z)) carsSeen++;
    }
    const sharp = px(subject.radius * 2, dist) > 70;
    return { agl, subject, dist, dead, unsure, elsewhere, cars: carsSeen, sign, sharp,
      tooFar: px(1.8, dist) < 2 };
  }

  return { develop, survey, aim, inFrame, photoCam };
}
