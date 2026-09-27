// Keyboard and touch-button input, merged into one set of axes.
const KEYS = {
  KeyW: ['fwd', 1], KeyS: ['fwd', -1], KeyA: ['strafe', -1], KeyD: ['strafe', 1],
  KeyQ: ['yaw', 1], KeyE: ['yaw', -1], ArrowLeft: ['yaw', 1], ArrowRight: ['yaw', -1],
  KeyR: ['climb', 1], KeyF: ['climb', -1], ArrowUp: ['climb', 1], ArrowDown: ['climb', -1],
  Space: ['climb', 1], ShiftLeft: ['climb', -1], KeyT: ['tilt', 1], KeyG: ['tilt', -1],
};

export function createControls(root, actions) {
  const held = new Map(); // source -> [axis, value]

  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input')) return;
    if (KEYS[e.code]) { held.set(e.code, KEYS[e.code]); e.preventDefault(); return; }
    const action = { KeyM: 'map', KeyC: 'view', KeyH: 'home' }[e.code];
    if (action && !e.repeat) actions[action]?.();
  });
  addEventListener('keyup', (e) => held.delete(e.code));
  addEventListener('blur', () => held.clear());

  for (const btn of root.querySelectorAll('[data-hold]')) {
    const [axis, value] = btn.dataset.hold.split(':');
    const id = `btn:${btn.dataset.hold}`;
    const on = (e) => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); held.set(id, [axis, +value]); btn.classList.add('active'); };
    const off = () => { held.delete(id); btn.classList.remove('active'); };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  return {
    read() {
      const input = { fwd: 0, strafe: 0, climb: 0, yaw: 0, tilt: 0 };
      for (const [axis, value] of held.values()) input[axis] = Math.max(-1, Math.min(1, input[axis] + value));
      return input;
    },
    clear: () => held.clear(),
  };
}
