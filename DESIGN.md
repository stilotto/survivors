# Survivors: Design

A browser game (no build step, ES modules, like the other stilotto games). It is
set in and around Evans City, PA, where a classic 1968 horror film was shot. The group holds out in a farmhouse. Their best asset is a drone.

## Setting

- The real terrain and layout of Evans City and the countryside around it,
  as close as we can get. We start rough and raise the fidelity step by step.
- The house stands where the film's farmhouse stood: reported as
  260 Ash Stop Rd, Evans City, off Route 68, about 25 mi north of Pittsburgh.
  The original was demolished and a cabin stands there now, so we build our
  own version of the film-era farmhouse on that spot.
  GPS: 40.784411, -80.027484 (matches a building footprint in
  `data/buildings.json`, about 200 m south of Ash Stop Rd).
- Landmarks to add over time: the important cemetery, the downtown,
  Route 68, farms, woods, creeks.

## The important cemetery

Evans City Cemetery, where the film's opening scene was shot. In the game
and docs we call it "the important cemetery".
GPS: 40.762394, -80.064003.

## Story hook: GPS still works

The grid is failing but the GPS satellites keep broadcasting. That's a
continuity-of-government order: the military keeps the constellation and its
ground stations running, so aircraft and survivors can still navigate. We can
tell this through a radio broadcast, a line in the drone's manual, or a note
from the group's tech. It also explains why jets and helicopters are still
flying overhead.

## Core gameplay (first focus): drone flights

- Launch the drone from the house and see what its camera sees, rendered from
  the sim.
- **Manual flight**: simple controls for up/down, left/right and
  forward/back. Touch buttons on phones, keys on desktop.
- **GPS autopilot**: tap a point on the map, set an altitude, and the drone
  flies there on its own. The player can take over at any time.
- Battery and range limits give each flight weight (tuned later).

## Looking out the windows

- Every room in the house has windows, and each one shows the live sim from
  that spot. The view is the same world the drone flies over.
- Ambient events the player can spot:
  - plumes of smoke rising in the distance
  - a fighter jet or helicopter passing over
  - zombies, most of the time, wandering or closing in on the house
  - now and then zombies catch and eat a victim (the classic scene)

## Later (not now)

Scavenging the house (kitchen, pantry, bedrooms, basement), the basement's
barricade materials and ammunition press, sorties to the shed and garage,
fighting, survivors who ask to be let in, and supply runs for food and
medicine.

## Resources

The group tracks supplies that run down and must be found, made or managed:

- **Electricity**: charges the drone and runs lights, the radio, medical
  equipment and more.
  - Solar panels, with a battery bank to store the power.
  - Generators that burn gasoline (gas is its own resource).
- **Ammunition** (the basement press can reload it).
- **Food** and **water**.
- **Medicine** and medical supplies.

## Drone landing pad

The pad goes on a roof, not in the yard, because the ground is not safe with
zombies around. For example a porch roof reached from an upstairs window.

## Build approach: start bare, add fidelity

Build time and tokens are limited (Claude subscription), so each step should
be small and playable:

1. Real terrain from elevation data, a flat ground texture, the house as a
   simple box, and a few simple buildings downtown. Drone flies with both
   control modes. Map view with tap-to-fly.
2. Roads and building footprints from map data, extruded to simple heights.
3. The window view from the house; smoke, aircraft and zombie events.
4. Better art: aerial imagery or hand-made textures, trees, farm fields,
   a detailed farmhouse.
5. Zombie crowds and the attack scene.

## Adding detail: layers, not map slices

The world is too big to detail by hand, so detail comes in layers applied
to the whole map, plus a few hand-built spots. Each item is one to three
small commits the owner can check on the live site.

1. **Rules, map-wide.** Code that turns data we already have into detail at
   load time, so it costs no new data: pitched roofs on every building
   footprint, trees along woods and field edges (instanced, so thousands
   are cheap), fences, hedgerows, field textures.
2. **Hand-built spots.** Only where the player spends time: the farmhouse
   and yard first, later landmarks such as the cemetery and downtown. One
   small file each.
3. **Detail by distance.** When the frame rate needs it (phones first),
   split the map into tiles and give each tile near/mid/far versions:
   full detail near the drone (under ~300 m), simple shapes in the middle,
   the painted ground far off. Tiles swap as the drone moves.

Roofs: a couple of styles each, picked per building so streets don't repeat.
Pitched (gable, hip) for houses, barns and sheds out in the country; flat
(plain with a parapet, and flat with rooftop units or vents) for most of
downtown and for commercial and industrial buildings.

Trees: a variety of shapes and sizes (spruce, pine, round broadleaf, oak,
poplar, dead trees), with random height, spread and tint per tree.

Order: the yard, roofs everywhere, trees everywhere, distance tiles (when
needed), then landmarks one at a time.

## Tech

- Three.js from a CDN for 3D rendering. Plain JS modules, no bundler.
- Map data is baked into small JSON/image files in the repo, so the game
  never loads it live from third-party servers.
  - Elevation: AWS Terrain Tiles (terrarium PNGs), public; the build sandbox
    can reach them.
  - Roads, buildings, water, land use, places: OpenStreetMap data via
    Overture Maps (public S3, reachable from the sandbox), baked into `data/`
    by `tools/fetch_map.py`. ODbL, credit needed.
  - Aerial imagery: public-domain USDA NAIP or USGS imagery if we can get
    it; otherwise stylized textures.
- Must work at phone width and honor prefers-reduced-motion.
- Links back to https://stilotto.github.io/ from the title screen.
