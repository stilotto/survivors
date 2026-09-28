// Ending the day: people go where they were sent, the house eats and
// drinks, and then the night comes. Returns the journal entry.
import { GOODS, siteRef, milesFromHome, neighborhood } from './sites.js';
import { makePerson, bestAt } from './people.js';
import { latestPhoto } from './game.js';
import { arrive, resolveNight } from './visitors.js';
import { searchOutbuilding, emptied } from './outbuildings.js';

export const TASKS = {
  rest: 'Rest', guard: 'Keep watch at night', fortify: 'Board up the house', garden: 'Work the garden',
  reload: 'Load shells at the press', watch: 'Watch the drone feed', shed: 'Search the shed', garage: 'Search the garage',
  run: 'Supply run', recruit: 'Go talk to them',
};
export const AWAY = new Set(['run', 'recruit']);
export const OUT = new Set(['shed', 'garage']); // out in the yard, back by dark
const WELL = 4; // water a day from the hand pump

const names = (list) => (list.length < 2 ? list[0] : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`);
const firstNames = (people) => names(people.map((p) => p.first));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function haul(got) {
  const parts = GOODS.filter((g) => got[g] > 0).map((g) => `${got[g]} ${g === 'parts' ? 'lumber and parts' : g}`);
  return parts.length ? `Came back with ${names(parts)}.` : 'Came back empty-handed.';
}

// A trip out: getting there, the dead, what they find.
function trip(game, sites, s, party, roads, lines) {
  const res = game.res;
  const place = siteRef(s, roads);
  const m = milesFromHome(s);
  const needFuel = m > 0.8 ? Math.max(1, Math.round(m * 0.6)) : 0;
  const drove = needFuel > 0 && res.fuel >= needFuel;
  if (drove) res.fuel -= needFuel;
  const who = firstNames(party);
  if (needFuel && !drove && m > 3) {
    lines.push(`${who} started out on foot for ${place}, but it's too far to walk. They turned back.`);
    return null;
  }
  const photo = latestPhoto(game, s.id);
  const intel = !photo ? 0 : game.day - photo.day <= 1 ? 1 : 0.5;
  const near = neighborhood(sites, s);
  const z = near.reduce((a, o) => a + o.zombies, 0);
  const shots = z > 0 ? Math.min(res.ammo, z * 2, party.length * 4) : 0;
  res.ammo -= shots;
  const fight = party.reduce((a, p) => a + p.skills.fight, 0) + shots * 0.5;
  const pressure = (z / (fight + 1)) * (1 - 0.35 * intel);
  const kills = z ? Math.min(z, Math.round(fight * rand(0.3, 0.8))) : 0;
  for (let k = kills, i = 0; k > 0 && i < near.length; i++) {
    const n = Math.min(k, near[i].zombies);
    near[i].zombies -= n; k -= n;
  }
  if (shots) game.threat += 0.5;
  if (drove) game.threat += 0.3;

  let story = `${who} ${drove ? 'took the truck' : 'walked'} to ${place}.`;
  if (intel === 1 && z > 0) story += ' The picture from the drone told them where to go in.';
  if (z === 0) story += ' Nothing there.';
  else if (pressure < 0.6) story += ` They put down ${kills === 1 ? 'the one' : `${kills}`} they found.`;
  else if (pressure < 1.6) story += ` It got close. They put down ${kills}${shots ? ` and used ${shots} rounds` : ''}.`;
  else story += ' There were too many of them. They got out fast.';
  lines.push(story);

  for (const p of party) {
    const risk = Math.min(0.75, pressure * 0.3 + (drove ? 0 : 0.05)) + 0.02;
    if (Math.random() < risk) {
      p.hurt++;
      lines.push(p.hurt > 2 ? `${p.first} didn't make it back.` : `${p.first} got ${p.hurt > 1 ? 'badly ' : ''}hurt.`);
    }
  }
  return { retreat: pressure >= 1.6, drove };
}

function scavenge(game, sites, s, party, roads, lines) {
  const out = trip(game, sites, s, party, roads, lines);
  if (!out) return;
  const cap = party.reduce((a, p) => a + p.skills.scav * 3, 0) * (out.retreat ? 0.4 : 1) + (out.drove ? 12 : 0);
  const avail = s.loot.map((v) => Math.floor(v * s.left / 100));
  const total = avail.reduce((a, b) => a + b, 0);
  const f = total ? Math.min(1, cap / total) : 0;
  const got = {};
  GOODS.forEach((g, i) => { got[g] = Math.floor(avail[i] * f * rand(0.8, 1)); game.res[g] += got[g]; });
  s.left = Math.round(s.left * (1 - f * 0.9));
  lines.push(total ? haul(got) : 'Somebody had already cleaned the place out.');
}

function recruit(game, sites, s, party, roads, lines) {
  const out = trip(game, sites, s, party, roads, lines);
  if (!out || out.retreat) return;
  if (!s.people) { lines.push('Nobody answered. Whoever was there is gone.'); return; }
  const fed = game.res.food >= game.crew.length * 3;
  if (Math.random() < 0.5 + party.length * 0.1 + (fed ? 0.15 : -0.1)) {
    const found = [];
    for (let i = 0; i < s.people; i++) {
      const p = makePerson(game.seed + game.day * 31 + s.id + i, game.crew.map((c) => c.first));
      game.crew.push(p);
      found.push(p);
    }
    s.people = 0;
    lines.push(`${names(found.map((p) => `${p.name}, who ${p.past},`))} came back with them.`);
  } else {
    lines.push(fed ? 'They talked through the door, but they wouldn\'t come out. Maybe another day.'
      : 'They asked how much food we have. When they heard, they said no.');
  }
}

const RADIO = [
  'The radio came back on. A man reading an order: the military is keeping the GPS satellites up so aircraft can still navigate. Then static.',
  'Jets went over high this afternoon, heading east.',
  'A helicopter came low along Route 68 and didn\'t stop.',
  'Smoke to the south, toward the turnpike, all afternoon.',
  'Gunshots from the direction of town around dusk. Then nothing.',
  'The radio says the shelters in Pittsburgh are full.',
  'Rain in the evening. We put out every pot we have.',
];

export function endDay(game, sites, roads) {
  const lines = [];
  const bySite = new Map();
  const alive = () => game.crew.filter((p) => p.hurt <= 2);
  const siteById = new Map(sites.map((s) => [s.id, s]));

  for (const p of game.crew) {
    const o = game.orders[p.id] ?? { task: 'rest' };
    if ((AWAY.has(o.task) || OUT.has(o.task)) && p.hurt >= 2) { game.orders[p.id] = { task: 'rest' }; continue; }
    if (AWAY.has(o.task) && siteById.has(o.site)) {
      const key = `${o.task}:${o.site}`;
      if (!bySite.has(key)) bySite.set(key, []);
      bySite.get(key).push(p);
    }
  }
  for (const [key, party] of bySite) {
    const [task, id] = key.split(':');
    (task === 'run' ? scavenge : recruit)(game, sites, siteById.get(+id), party, roads, lines);
  }

  // At home.
  const home = alive().filter((p) => !AWAY.has(game.orders[p.id]?.task));
  const doing = (t) => home.filter((p) => (game.orders[p.id]?.task ?? 'rest') === t);
  for (const id of OUT) {
    const party = doing(id);
    if (!party.length) continue;
    searchOutbuilding(game, id, party, doing('watch')[0], lines);
    if (emptied(game, id)) for (const p of party) game.orders[p.id] = { task: 'rest' };
  }
  for (const p of doing('garden')) game.res.food += 1 + Math.round(p.skills.scav / 2);
  if (doing('garden').length) lines.push(`${firstNames(doing('garden'))} worked the garden.`);
  const boarded = [];
  for (const p of doing('fortify')) {
    if (game.res.parts < 1) { lines.push(`${p.first} ran out of lumber for the windows.`); continue; }
    game.res.parts--;
    game.fort += 0.5 + p.skills.build * 0.25;
    boarded.push(p);
  }
  if (boarded.length) lines.push(`${firstNames(boarded)} nailed up more boards.`);
  for (const p of doing('reload')) {
    // The old owner's powder and primers in the cellar: once they're gone, they're gone.
    const made = Math.min(game.press ?? 0, 4 + p.skills.build * 2);
    game.press = (game.press ?? 0) - made;
    game.res.ammo += made;
    lines.push(made ? `${p.first} spent the day at the press in the cellar and loaded ${made} rounds.`
      : `${p.first} went down to the press, but the powder's all gone.`);
  }
  for (const p of doing('rest')) if (p.hurt && Math.random() < 0.4) p.hurt--;
  const medic = bestAt(home.length ? home : alive(), 'med');
  for (const p of alive()) {
    if (p.hurt && game.res.meds > 0 && medic && medic.skills.med >= 3 && medic !== p) {
      game.res.meds--; p.hurt--;
      lines.push(`${medic.first} patched up ${p.first}.`);
      break;
    }
  }

  // Eating and drinking.
  const n = alive().length;
  game.res.water += WELL - n;
  game.res.food -= n;
  const short = game.res.food < 0 || game.res.water < 0;
  if (game.res.food < 0) lines.push('We ran out of food. Everyone went to bed hungry.');
  if (game.res.water < 0) lines.push('The pump can\'t keep up. We\'re rationing water.');
  game.res.food = Math.max(0, game.res.food);
  game.res.water = Math.max(0, game.res.water);
  for (const p of alive()) {
    p.hungry = short ? p.hungry + 1 : 0;
    if (p.hungry >= 3) { p.hurt++; p.hungry = 1; lines.push(`${p.first} is weak from hunger.`); }
  }

  // The night.
  resolveNight(game, lines);
  game.threat += 0.8 + game.day * 0.06;
  const guards = doing('guard');
  const defense = game.fort + guards.reduce((a, p) => a + p.skills.fight * 1.5, 0) + home.length * 0.4;
  const attack = game.threat * rand(0.3, 1.1);
  // For the night scene: how many came, who fought, how it ended.
  const night = { size: Math.min(24, Math.max(3, Math.round(attack * 2))), guards: guards.map((p) => p.first),
    shots: 0, outcome: 'quiet', hurt: null, lost: false };
  if (attack < 1) lines.push('Quiet night.');
  else if (attack <= defense) {
    night.outcome = 'held';
    lines.push(guards.length ? pick([`They came at the house in the night. ${firstNames(guards)} held them off.`,
      `${firstNames(guards)} spent the night at the upstairs windows. A few came close. None got in.`,
      `Shapes in the yard around three. ${firstNames(guards)} dealt with them.`])
      : pick(['Something scratched at the back door all night. The boards held.',
        'We heard them on the porch until dawn. Nobody slept.']));
    if (guards.length) {
      night.shots = Math.min(game.res.ammo, Math.ceil(attack / 3));
      game.res.ammo -= night.shots;
      game.threat = Math.max(0, game.threat - guards.reduce((a, p) => a + p.skills.fight * 0.4, 0));
    }
  } else {
    night.outcome = 'breach';
    night.shots = guards.length ? Math.min(game.res.ammo, 2) : 0;
    game.res.ammo -= night.shots;
    game.fort = Math.max(0, game.fort - rand(1, 2.5));
    const victim = home[Math.floor(Math.random() * home.length)];
    lines.push('They broke through a window in the night.');
    if (victim) {
      victim.hurt += attack > defense * 2 ? 3 : 1;
      night.hurt = victim.first;
      night.lost = victim.hurt > 2;
      lines.push(victim.hurt > 2 ? `We lost ${victim.first}.` : `${victim.first} got hurt pushing them back out.`);
    }
  }
  game.crew = game.crew.filter((p) => p.hurt <= 2);

  // The world moves on.
  for (const s of sites) {
    if (Math.random() < 0.08) s.zombies = Math.max(0, s.zombies + (Math.random() < 0.55 ? 1 : -1));
  }
  if (game.day === 1) lines.push(RADIO[0]);
  else if (Math.random() < 0.5) lines.push(RADIO[1 + Math.floor(Math.random() * (RADIO.length - 1))]);

  arrive(game, sites, roads, lines);

  for (const [id, o] of Object.entries(game.orders)) if (AWAY.has(o.task)) game.orders[id] = { task: 'rest' };
  const entry = { day: game.day, when: 'night', lines };
  Object.defineProperty(entry, 'night', { value: night }); // for the scene, not the save
  game.day++;
  if (!game.crew.length) {
    game.over = true;
    lines.push('There is no one left to write in this.');
  }
  game.journal.push(entry);
  return entry;
}
