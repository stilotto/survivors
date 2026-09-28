// Trips out to the shed and the garage: close to the house, but out in the
// open where the dead can catch you. Each holds a fixed stash that runs out.
// Someone watching the drone feed can call out what's coming.

export const OUTBUILDINGS = {
  shed: { name: 'the shed', stash: { parts: 8, food: 2, fuel: 1 },
    finds: { parts: 'a box of roofing nails and a stack of fence boards', food: 'seed potatoes in a feed sack',
      fuel: 'half a can of gas for the tiller' } },
  garage: { name: 'the garage', stash: { fuel: 6, parts: 4, meds: 1, ammo: 4 },
    finds: { fuel: 'two gas cans behind the mower', parts: 'plywood up in the rafters',
      meds: 'a first-aid kit in the old Ford', ammo: 'a coffee can of .30-06 shells' } },
};
const LABEL = { parts: 'lumber and parts', food: 'food', fuel: 'gas', meds: 'meds', ammo: 'rounds' };

const names = (list) => (list.length < 2 ? list[0] : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`);

// What's still out there, by building. Older saves start full.
export function stashOf(game, id) {
  game.out ??= {};
  game.out[id] ??= { ...OUTBUILDINGS[id].stash, found: [] };
  return game.out[id];
}

export const emptied = (game, id) => Object.keys(OUTBUILDINGS[id].stash).every((k) => !stashOf(game, id)[k]);

export function searchOutbuilding(game, id, party, watcher, lines) {
  const b = OUTBUILDINGS[id], left = stashOf(game, id);
  const who = names(party.map((p) => p.first));
  // The dead drawn to the house hang around the yard.
  const risk = Math.min(0.5, game.threat * 0.035) * (watcher ? 0.4 : 1);
  let spooked = false;
  for (const p of party) {
    if (Math.random() >= risk) continue;
    spooked = true;
    p.hurt++;
    lines.push(p.hurt > 2 ? `One of them was waiting in ${b.name}. ${p.first} didn't make it back to the house.`
      : `${p.first} got grabbed coming out of ${b.name} and got ${p.hurt > 1 ? 'badly ' : ''}hurt.`);
  }
  if (!spooked && watcher && game.threat > 3 && Math.random() < 0.5 && !emptied(game, id)) lines.push(`${watcher.first} watched the yard on the drone feed and called ${who} back inside twice.`);

  let cap = party.reduce((a, p) => a + 2 + p.skills.scav * 2, 0) * (spooked ? 0.5 : 1);
  const got = [], took = [];
  for (const k of Object.keys(b.stash)) {
    const n = Math.min(left[k], Math.round(cap / Object.keys(b.stash).length + Math.random()));
    if (n <= 0) continue;
    left[k] -= n; cap -= n;
    game.res[k] += n;
    got.push(`${n} ${LABEL[k]}`);
    took.push(k);
  }
  // The first time something turns up, say what it was.
  const k = took.find((t) => !left.found.includes(t));
  const find = k ? b.finds[k] : null;
  if (k) left.found.push(k);
  lines.push(got.length ? `${who} went through ${b.name}${find ? ` and found ${find}` : ''}. Brought back ${names(got)}.`
    : `${who} went out to ${b.name}. There's nothing left in it worth carrying.`);
}
