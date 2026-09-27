// Drone camera (first person, with a tiltable gimbal) and a chase view.
import * as THREE from 'three';

export function createCameraRig(camera) {
  let mode = 'chase'; // start behind the drone so players see where they are
  let tilt = -0.35; // radians, gimbal pitch
  const chasePos = new THREE.Vector3();

  function update(dt, drone, input) {
    tilt = Math.min(0.3, Math.max(-Math.PI / 2, tilt + input.tilt * dt * 0.9));
    const { pos, yaw } = drone.state;
    drone.model.visible = mode !== 'drone'; // don't see our own airframe from the camera
    if (mode === 'drone') {
      camera.position.set(pos.x, pos.y + 0.05, pos.z);
      camera.rotation.set(tilt, yaw, 0, 'YXZ');
    } else {
      const back = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const want = pos.clone().addScaledVector(back, 6).add(new THREE.Vector3(0, 2.5, 0));
      if (chasePos.lengthSq() === 0) chasePos.copy(want);
      chasePos.lerp(want, 1 - Math.exp(-5 * dt));
      chasePos.y = Math.max(chasePos.y, drone.groundBelow() + 1);
      camera.position.copy(chasePos);
      camera.lookAt(pos.x, pos.y + 0.5, pos.z);
    }
  }

  return {
    update,
    toggle() { mode = mode === 'drone' ? 'chase' : 'drone'; chasePos.set(0, 0, 0); return mode; },
    get mode() { return mode; },
    get tilt() { return tilt; },
  };
}
