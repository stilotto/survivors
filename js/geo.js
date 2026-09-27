// Local flat projection. World units are meters: x east, z south, y up.
// The origin is the farmhouse at 260 Ash Stop Rd.
export const BBOX = [-80.12, 40.74, -79.99, 40.82]; // lon/lat, matches the baked data
export const HOUSE = { lon: -80.027484, lat: 40.784411 };

const LAT0 = (BBOX[1] + BBOX[3]) / 2;
const MX = 111320 * Math.cos(LAT0 * Math.PI / 180);
const MZ = 110574;

export function toWorld(lon, lat) {
  return [(lon - HOUSE.lon) * MX, -(lat - HOUSE.lat) * MZ];
}

export function toLonLat(x, z) {
  return [HOUSE.lon + x / MX, HOUSE.lat - z / MZ];
}

const [minX, minZ] = toWorld(BBOX[0], BBOX[3]);
const [maxX, maxZ] = toWorld(BBOX[2], BBOX[1]);
export const WORLD = { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ };

// Where the drone lands and recharges, in the yard south of the house.
export const HOME = { x: 0, z: 14 };

// Evans City's Main St, by the borough office and library.
export const DOWNTOWN = { at: toWorld(-80.0615, 40.7687), radius: 350 };
