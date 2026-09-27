// Flight readout and short status messages.
import { toLonLat, HOME } from './geo.js';

export function createHud(root) {
  const readout = root.querySelector('#readout');
  const message = root.querySelector('#message');
  let timer = 0;

  return {
    show(text) {
      message.textContent = text;
      message.classList.add('show');
      clearTimeout(timer);
      timer = setTimeout(() => message.classList.remove('show'), 2500);
    },
    update(drone, cameraRig) {
      const s = drone.state;
      const agl = s.pos.y - drone.groundBelow();
      const speed = Math.hypot(s.vel.x, s.vel.z);
      const home = Math.hypot(s.pos.x - HOME.x, s.pos.z - HOME.z);
      const [lon, lat] = toLonLat(s.pos.x, s.pos.z);
      const heading = ((-s.yaw * 180 / Math.PI) % 360 + 360) % 360;
      const bat = Math.ceil(s.battery);
      const mode = { landed: 'LANDED', manual: 'MANUAL', auto: s.landing ? 'RTH' : 'GPS AUTO' }[s.mode];
      readout.innerHTML =
        `GPS ${lat.toFixed(5)}, ${lon.toFixed(5)}\n` +
        `ALT ${Math.max(0, agl).toFixed(0).padStart(3)} m   HDG ${heading.toFixed(0).padStart(3)}°\n` +
        `SPD ${speed.toFixed(1).padStart(4)} m/s HOME ${home < 1000 ? home.toFixed(0) + ' m' : (home / 1000).toFixed(2) + ' km'}\n` +
        `<span class="${bat < 20 ? 'warn' : ''}">BAT ${String(bat).padStart(3)}%</span>    ${mode}` +
        `${cameraRig.mode === 'chase' ? '' : `  CAM ${Math.round(cameraRig.tilt * 180 / Math.PI)}°`}`;
    },
  };
}
