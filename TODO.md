# To-do

The build steps come from `DESIGN.md`. Check items off as they land.

## Build steps
- [x] 1. Terrain, ground texture, farmhouse box, drone (manual + GPS autopilot), tap-to-fly map
- [x] 2. Roads and building footprints from map data (painted roads, extruded buildings)
- [ ] 3. Window view from the house; smoke, aircraft and zombie events
- [ ] 4. Better art: imagery or textures, trees, fields, a detailed farmhouse
  (layered plan in `DESIGN.md`, "Adding detail")
  - [x] Farmhouse modeled on the film-era house
  - [x] Yard: shed, gas pump, trees, driveway, grass
  - [x] Roofs on every building: a couple of pitched styles (gable, hip) and
        flat styles (parapet, rooftop units); downtown mostly flat
  - [x] Trees everywhere (instanced, from land cover)
  - [x] Denser, fuller woods near the drone (with distance tiles)
  - [x] Distance tiles for trees: 200 m tiles; the 3×3 around the drone get
        full-detail, denser trees
  - [ ] Distance tiles for buildings (window/door detail up close), if wanted
  - [ ] Landmarks: the important cemetery (see `DESIGN.md`), downtown
- [ ] 5. Zombie crowds and the attack scene

## Gameplay (first draft, see `DESIGN.md`, "Gameplay loop")
- [x] Sites: every building has hidden supplies, the dead, cars, some holdouts
- [x] The dead as instanced figures that wander and follow a low drone
- [x] Parked cars; holdouts' painted sheets and waving
- [x] Drone photos and the spotter's radio commentary (subtitles)
- [x] Kitchen table: jobs, prints, journal; end of day, runs, recruiting, nights
- [x] Save in the browser
- [ ] Tune numbers after playtesting (supplies, danger, threat growth)
- [ ] Claim nearby buildings; workshops; solar and battery bank
- [ ] Other groups; trading

## Ideas logged
- [ ] Move the landing pad to a roof (porch roof reached from an upstairs window)
- [ ] Resources: electricity (solar panels + battery bank, gas generators),
      gasoline, ammunition, food, water, medicine
- [x] Drone charging draws on electricity instead of being free (generator gas by day, solar overnight)
- [ ] Game clock: when one exists, a warp must advance it by the skipped
      flight time (`drone.warp()` already returns those seconds)

## Housekeeping
- [x] Turn on GitHub Pages (Settings → Pages → `main`, root)
- [x] Add a Survivors card to the stilotto.github.io index page
