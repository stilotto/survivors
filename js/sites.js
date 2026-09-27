// Every building on the map is a site: something the group might search,
// with supplies, the dead nearby, and now and then people still alive
// inside. What a site holds is hidden; the drone and the runs find it out.
import { toWorld, DOWNTOWN, HOME } from './geo.js';
import { outerRings } from './data.js';
import { rng, pickOne } from './rng.js';

export const GOODS = ['food', 'water', 'fuel', 'meds', 'ammo', 'parts'];

// Supplies by kind, before scaling by size: [food, water, fuel, meds, ammo, parts].
const KINDS = {
  house: { word: 'house', loot: [6, 4, 0.5, 1, 1, 1] },
  farm: { word: 'farm', loot: [6, 3, 4, 0.5, 1.5, 4] },
  shed: { word: 'garage', loot: [0, 0, 2, 0, 0.3, 2] },
  big: { word: 'building', loot: [3, 2, 1, 1, 0, 6] },
  store: { word: 'store', loot: [4, 4, 0, 1, 0, 2] },
  gas: { word: 'gas station', loot: [8, 8, 10, 1, 0, 1] },
  grocery: { word: 'grocery', loot: [20, 12, 0, 2, 0, 0] },
  diner: { word: 'restaurant', loot: [6, 4, 0, 0, 0, 0] },
  hardware: { word: 'hardware store', loot: [0, 1, 2, 0, 1, 15] },
  garage: { word: 'garage', loot: [0, 1, 6, 0, 0, 8] },
  clinic: { word: 'clinic', loot: [1, 2, 0, 8, 0, 0] },
  fire: { word: 'fire hall', loot: [2, 4, 4, 6, 0, 4] },
  church: { word: 'church', loot: [5, 5, 0, 2, 0, 0] },
  school: { word: 'school', loot: [8, 4, 0, 3, 0, 2] },
  office: { word: 'office', loot: [1, 2, 0, 1, 0, 3] },
};

const CATEGORY_KIND = {
  gas_station: 'gas', convenience_store: 'gas', food_and_beverage_store: 'grocery', shopping: 'grocery',
  restaurant: 'diner', casual_eatery: 'diner', bar: 'diner',
  hardware_home_and_garden_store: 'hardware', building_or_construction_service: 'hardware',
  supplier_or_distributor: 'hardware', home_service: 'hardware',
  automotive_service: 'garage', auto_dealer: 'garage', vehicle_dealer: 'garage', vehicle_parts_store: 'garage',
  dental_clinic: 'clinic', senior_living_facility: 'clinic', fire_station: 'fire',
  christian_place_of_worship: 'church', civic_organization: 'church', social_or_community_service: 'church',
  farm: 'farm', high_school: 'school', middle_school: 'school', place_of_learning: 'school',
  government_office: 'office', public_utility: 'office', financial_service: 'office',
};

const kindFor = (cls, area, town, category) => {
  if (category) return CATEGORY_KIND[category] ?? 'store';
  if (cls === 'farm' || cls === 'barn') return 'farm';
  if (cls === 'garage' || cls === 'shed' || area < 45) return 'shed';
  if (cls === 'school') return 'school';
  if (area > 650) return town > 0.4 ? 'store' : 'big';
  if (area > 260 && town < 0.15) return 'farm';
  return 'house';
};

// Builds the site list. The same buildings always make the same sites.
export function buildSites(buildings, places) {
  const sites = [];
  for (const [id, f] of buildings.entries()) {
    const ring = outerRings(f.geometry)[0];
    if (!ring) continue;
    const pts = ring.slice(0, -1).map(([lon, lat]) => toWorld(lon, lat));
    let x = 0, z = 0, area = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      x += a[0] / pts.length; z += a[1] / pts.length;
      area += a[0] * b[1] - b[0] * a[1];
    }
    area = Math.abs(area) / 2;
    const town = Math.exp(-Math.hypot(x - DOWNTOWN.at[0], z - DOWNTOWN.at[1]) / 700);
    sites.push({ id, x, z, area, radius: Math.sqrt(area) / 2 + 4, town, cls: f.properties.class });
  }

  // Named places sit near a building; give that building the name.
  for (const p of places) {
    if (!p.properties.name || p.geometry.type !== 'Point') continue;
    const [px, pz] = toWorld(...p.geometry.coordinates);
    let best = null, bestD = 45;
    for (const s of sites) {
      const d = Math.hypot(s.x - px, s.z - pz);
      if (d < bestD && !s.name) { best = s; bestD = d; }
    }
    if (best) { best.name = p.properties.name; best.category = p.properties.category; }
  }

  for (const s of sites) {
    const r = rng(s.id, 7);
    s.kind = kindFor(s.cls, s.area, s.town, s.category);
    const k = KINDS[s.kind];
    s.word = k.word;
    const size = Math.min(3, Math.max(0.5, s.area / 120));
    s.loot = k.loot.map((v) => Math.round(v * size * (0.5 + r())));
    const home = Math.hypot(s.x - HOME.x, s.z - HOME.z);
    // The dead gather where people lived close together; the woods around
    // the farmhouse are quiet at first.
    const expect = home < 350 ? 0 : (0.25 + 5 * s.town + s.area / 600) * Math.min(1, (home - 350) / 900);
    s.zombies = Math.floor(expect * r() * 2 + (r() < 0.04 ? 6 * r() : 0));
    s.zombies0 = s.zombies;
    s.cars = s.kind === 'garage' || s.kind === 'gas' ? 2 + Math.floor(r() * 5)
      : s.kind === 'shed' ? 0 : r() < (s.kind === 'house' ? 0.35 : 0.5) ? 1 + Math.floor(r() * 2) : 0;
    s.loot[2] += Math.round(s.cars * 1.5); // gas left in the tanks
    s.people = 0;
    s.left = 100; // percent of the supplies still there
  }
  return sites;
}

// Scatters a few holdouts: always one within easy reach, the rest farther.
export function placeSurvivors(sites, seed) {
  const r = rng(seed, 99);
  const ok = sites.filter((s) => ['house', 'farm', 'church', 'school', 'store'].includes(s.kind));
  const dist = (s) => Math.hypot(s.x - HOME.x, s.z - HOME.z);
  const near = ok.filter((s) => dist(s) > 700 && dist(s) < 1500 && s.zombies <= 2);
  const first = pickOne(near.length ? near : ok, r);
  first.people = 1 + Math.floor(r() * 2);
  for (let i = 0; i < 11; i++) {
    const s = pickOne(ok, r);
    if (dist(s) > 900) s.people = 1 + Math.floor(r() * 3);
  }
}

// Sites keep their changes (searched, cleared, people found) in the save.
export function applySiteState(sites, st) {
  for (const s of sites) {
    s.left = st.left[s.id] ?? 100;
    if (st.zombies[s.id] !== undefined) s.zombies = st.zombies[s.id];
    if (st.people[s.id] !== undefined) s.people = st.people[s.id];
  }
}

export function siteState(sites) {
  const st = { left: {}, zombies: {}, people: {} };
  for (const s of sites) {
    if (s.left !== 100) st.left[s.id] = s.left;
    if (s.zombies !== s.zombies0) st.zombies[s.id] = s.zombies;
    if (s.people) st.people[s.id] = s.people;
  }
  return st;
}

// "the Hartmann place"-style names, from the map or the nearest road.
let named = null;
export function siteName(s, roads) {
  if (s.name) return s.name;
  if (!named) {
    named = [];
    for (const f of roads) {
      if (!f.properties.name || f.properties.kind !== 'road') continue;
      const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const line of lines) named.push({ name: f.properties.name, pts: line.map(([lon, lat]) => toWorld(lon, lat)) });
    }
  }
  let best = null, bestD = Infinity;
  for (const road of named) {
    for (let i = 0; i < road.pts.length - 1; i++) {
      const d = segDist(s.x, s.z, road.pts[i], road.pts[i + 1]);
      if (d < bestD) { bestD = d; best = road.name; }
    }
  }
  const word = s.word[0].toUpperCase() + s.word.slice(1);
  if (!best || bestD > 400) return `${word} in the fields`;
  return `${word} ${bestD < 60 ? 'on' : 'off'} ${best}`;
}

function segDist(px, pz, [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l)) : 0;
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
}

// The name as it reads mid-sentence: "Kelly's Market", "the house on Mars Rd".
export function siteRef(s, roads) {
  const n = siteName(s, roads);
  return s.name ? n : `the ${n[0].toLowerCase()}${n.slice(1)}`;
}

// The site and its neighbors close enough that their dead are in the way.
export function neighborhood(sites, s) {
  return sites.filter((o) => Math.abs(o.x - s.x) < 80 && Math.abs(o.z - s.z) < 80
    && Math.hypot(o.x - s.x, o.z - s.z) < s.radius + 30);
}

export const milesFromHome = (s) => Math.hypot(s.x - HOME.x, s.z - HOME.z) / 1609;
