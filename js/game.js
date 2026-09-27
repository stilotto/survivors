// The group's state (day, supplies, people, photos, journal) and saving it.
import { startingCrew } from './people.js';
import { applySiteState, siteState, placeSurvivors } from './sites.js';

const KEY = 'survivors-save-v1';
const MAX_PHOTOS = 40;

export function newGame(sites) {
  const seed = Math.floor(Math.random() * 1e6);
  placeSurvivors(sites, seed);
  return {
    seed, day: 1,
    res: { food: 20, water: 12, fuel: 6, meds: 2, ammo: 12, parts: 4 },
    crew: startingCrew(seed),
    orders: {}, // person id -> { task, site }
    fort: 2, // boards on the windows, braces on the doors
    threat: 1, // how many of the dead the house has drawn in
    photos: [],
    journal: [{ day: 1, when: 'morning', lines: [
      'The radio says stay inside. The phones have been out since Tuesday, but the GPS still works.',
      'We have the drone, a little food, and the old pump in the yard. Somebody needs to go look at what\'s out there.',
    ] }],
    over: false,
  };
}

export function loadGame(sites) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (!saved || !saved.sites) return null;
    applySiteState(sites, saved.sites);
    delete saved.sites;
    return saved;
  } catch {
    return null;
  }
}

export function saveGame(game, sites) {
  const data = { ...game, sites: siteState(sites) };
  for (let n = game.photos.length; n >= 0; n -= 5) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...data, photos: game.photos.slice(-n) }));
      return;
    } catch { /* storage full: keep fewer photos */ }
  }
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* nothing saved */ }
}

export function addPhoto(game, photo) {
  game.photos.push(photo);
  if (game.photos.length > MAX_PHOTOS) game.photos.shift();
}

// The newest photo of a site, if any.
export const latestPhoto = (game, siteId) =>
  game.photos.filter((p) => p.site === siteId).at(-1) ?? null;
