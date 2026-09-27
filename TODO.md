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
  - [ ] Roofs on every building: a couple of pitched styles (gable, hip) and
        flat styles (parapet, rooftop units); downtown mostly flat
  - [ ] Trees everywhere (instanced, from land cover)
  - [ ] Distance tiles: near/mid/far detail (when frame rate needs it)
  - [ ] Landmarks: the important cemetery (see `DESIGN.md`), downtown
- [ ] 5. Zombie crowds and the attack scene

## Ideas logged
- [ ] Move the landing pad to a roof (porch roof reached from an upstairs window)
- [ ] Resources: electricity (solar panels + battery bank, gas generators),
      gasoline, ammunition, food, water, medicine
- [ ] Drone charging draws on electricity instead of being free
- [ ] Game clock: when one exists, a warp must advance it by the skipped
      flight time (`drone.warp()` already returns those seconds)

## Housekeeping
- [x] Turn on GitHub Pages (Settings → Pages → `main`, root)
- [x] Add a Survivors card to the stilotto.github.io index page
