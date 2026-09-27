# Map data

Baked GeoJSON for Evans City, PA and the Ash Stop Rd farmhouse area
(bbox lon -80.12..-79.99, lat 40.74..40.82). Coordinates are lon/lat, 5 decimals.

| File | What |
|---|---|
| roads.json | road, rail and path lines (`kind`, `class`, `name`) |
| buildings.json | footprints (`height`/`floors` where known) |
| water.json | creeks, ponds |
| landuse.json | farmland, residential, cemetery, parks, etc. |
| landcover.json | forest, grass, crop, etc. |
| places.json | named points of interest |

Source: [Overture Maps](https://overturemaps.org) release 2026-09-23.1, fetched with
`tools/fetch_map.py`. Overture builds these layers from OpenStreetMap.

Credit (show in game): © OpenStreetMap contributors (ODbL), Overture Maps Foundation.
