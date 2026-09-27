// How each of the dead moves. Every walker gets one gait for good; the
// pose function turns its step phase into joint angles each frame.
//
// Angles are radians. Legs and arms swing about the hip or shoulder:
// 0 hangs straight down, positive swings forward (pi/2 points ahead).
// lean tips the torso forward, roll tips it sideways, nod tips the head
// forward (negative looks up).

export const GAITS = {
  // Short dragging steps, arms out in front.
  shuffle: { speed: 0.35, step: 0.25, weight: 30 },
  // Lurching side to side, speeding up and nearly falling, arms loose.
  stagger: { speed: 0.45, step: 0.4, weight: 20 },
  // One stiff leg; dips every time weight lands on it.
  limp: { speed: 0.3, step: 0.3, weight: 15 },
  // Bent forward, long strides, both arms grabbing ahead.
  lunge: { speed: 0.65, step: 0.45, weight: 12 },
  // One leg dragged behind, hauled along a hop at a time.
  drag: { speed: 0.22, step: 0.35, weight: 13 },
  // No legs left that work: pulls itself along the ground.
  crawl: { speed: 0.15, step: 0.3, weight: 10 },
};

const TOTAL = Object.values(GAITS).reduce((a, g) => a + g.weight, 0);
export function pickGait(r) {
  let n = r * TOTAL;
  for (const [name, g] of Object.entries(GAITS)) if ((n -= g.weight) < 0) return name;
  return 'shuffle';
}

const pos = (v) => Math.max(0, v);

// Fills `o` with the pose. k: { gait, ph, seed }, moving, noticed, t: seconds.
export function pose(o, k, moving, noticed, t) {
  const s = moving ? Math.sin(k.ph) : 0, c = moving ? Math.cos(k.ph) : 0;
  const idle = Math.sin(t * 0.7 + k.seed * 20);
  o.hip = 0.85; o.lean = 0.15; o.roll = idle * 0.03; o.twist = 0; o.side = 0;
  o.legL = 0; o.legR = 0; o.armL = 0.15; o.armR = 0.15; o.splay = 0.08;
  o.nod = 0.15 + idle * 0.05; o.tilt = (k.seed - 0.5) * 0.6; o.pace = 1;

  switch (k.gait) {
    case 'shuffle':
      o.legL = 0.22 * s; o.legR = -0.22 * s;
      o.lean = 0.25; o.roll += 0.06 * s;
      o.armL = 1.2 + 0.1 * c + idle * 0.05; o.armR = 1.15 - 0.1 * c;
      break;
    case 'stagger': {
      const lurch = Math.sin(k.ph * 0.5 + k.seed * 6);
      o.legL = 0.35 * s; o.legR = -0.35 * s;
      o.roll = 0.2 * lurch; o.twist = 0.15 * lurch; o.side = 0.12 * lurch;
      o.lean = 0.2 + 0.15 * pos(lurch);
      o.armL = 0.2 - 0.35 * s + 0.2 * lurch; o.armR = 0.2 + 0.35 * s - 0.2 * lurch; o.splay = 0.25;
      o.tilt += 0.25 * lurch;
      o.pace = moving ? 0.4 + 0.9 * pos(lurch) : 1;
      break;
    }
    case 'limp':
      o.legL = 0.1 * s; o.legR = -0.42 * s; // left leg won't bend
      o.hip -= 0.07 * pos(-s); o.roll += 0.14 * pos(-s);
      o.lean = 0.22; o.armR = 1.3 + 0.1 * c; o.armL = 0.1 + 0.15 * s;
      o.pace = moving ? 0.55 + 0.6 * pos(s) : 1;
      break;
    case 'lunge':
      o.legL = 0.45 * s; o.legR = -0.45 * s;
      o.lean = 0.45; o.roll += 0.05 * s;
      o.armL = 1.5 + 0.15 * s; o.armR = 1.5 - 0.15 * s; o.splay = 0.15;
      o.nod = -0.25; // keeps its face up, eyes ahead
      break;
    case 'drag':
      o.legL = moving ? 0.45 * pos(s) - 0.1 : 0; o.legR = -0.4 + 0.05 * s; // right leg trails
      o.roll = 0.18 + 0.08 * s; o.lean = 0.35;
      o.armL = 1.0 + 0.2 * s; o.armR = 0.25; o.splay = 0.15;
      o.pace = moving ? 0.15 + 1.5 * pos(c) : 1;
      break;
    case 'crawl':
      o.hip = 0.22; o.lean = Math.PI / 2 - 0.12; o.roll = 0.08 * s;
      o.legL = -1.45 + 0.08 * s; o.legR = -1.45 - 0.08 * s;
      // Arms reach ahead and pull, one then the other.
      o.armL = 2.45 + 0.45 * s; o.armR = 2.45 - 0.45 * s; o.splay = 0.2;
      o.nod = -1.1; o.tilt *= 0.3;
      o.pace = moving ? 0.25 + 0.9 * pos(c) : 1;
      break;
  }

  if (noticed) {
    // Heard the drone: faces tip up, hands go up toward it.
    o.nod = k.gait === 'crawl' ? -1.4 : -0.7;
    if (k.gait !== 'crawl') { o.armL = 2.2 + 0.2 * s; o.armR = 2.3 - 0.2 * s; o.lean = Math.min(o.lean, 0.1); }
  }

  // Keep the planted foot on the ground: a swung leg lifts the hip less high.
  if (k.gait !== 'crawl') o.hip *= Math.cos(Math.max(Math.abs(o.legL), Math.abs(o.legR)));
}
