// Small seeded random helpers, so the world is the same every time a save
// is loaded.

// Hash any list of numbers to [0, 1).
export function hash(...nums) {
  let h = 2166136261;
  for (const n of nums) {
    h ^= Math.floor(n * 1000) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

// A random generator seeded from a list of numbers.
export function rng(...seed) {
  let s = Math.floor(hash(...seed) * 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export const pickOne = (list, r) => list[Math.floor(r() * list.length)];
