// Loads the baked map layers from data/.
const LAYERS = ['roads', 'buildings', 'water', 'landuse', 'landcover'];

export async function loadMapData() {
  const entries = await Promise.all(LAYERS.map(async (name) => {
    const res = await fetch(`data/${name}.json`);
    return [name, (await res.json()).features];
  }));
  return Object.fromEntries(entries);
}

// Outer rings of a Polygon or MultiPolygon, as lon/lat arrays.
export function outerRings(geom) {
  if (geom.type === 'Polygon') return [geom.coordinates[0]];
  if (geom.type === 'MultiPolygon') return geom.coordinates.map((p) => p[0]);
  return [];
}
