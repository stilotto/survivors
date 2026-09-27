// The person watching the drone feed back at the house. They know the
// area, they count what they can see, and they say so over the radio.
// This is how the player learns what a picture shows: someone talking,
// not labels on the screen.
import { siteName, siteRef, milesFromHome } from './sites.js';
import { HOME } from './geo.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const miles = (m) => (m < 0.3 ? 'a few hundred yards' : `${m.toFixed(1)} miles`);

// Local knowledge about a kind of place.
const HINTS = {
  gas: ['Store inside had food and water. And the tanks, if we can get the pump going.'],
  grocery: ['If anybody hasn\'t cleaned it out yet, that\'s a lot of food.', 'Canned goods. Bottled water. If it\'s still there.'],
  diner: ['Kitchen would have had a walk-in. Cans in the back, maybe.'],
  hardware: ['Lumber, nails, plywood. We could really board up the house.'],
  garage: ['Garages keep gas cans around. Tools too.'],
  clinic: ['There\'d be medicine in there. Bandages at least.'],
  fire: ['Fire hall had med kits and a generator, last I knew.'],
  church: ['Church kept a food pantry in the basement.', 'People went to churches when it started. Some might still be inside.'],
  school: ['Cafeteria stock. Nurse\'s office.'],
  farm: ['Farms have fuel for the tractors. And the old guys all kept rifles.', 'Barn\'s worth a look. Diesel, tools.'],
  house: ['Houses are mostly picked over by now. You never know though.', 'Somebody\'s house. Pantry, medicine cabinet, maybe a deer rifle.'],
  shed: ['Just a garage. Maybe a gas can.'],
  big: ['Big building. No idea what\'s in it.'],
  store: ['Some kind of store. Worth a look if it\'s quiet.'],
  office: ['Offices. Not much to eat in there. Water cooler jugs, maybe.'],
};

const PLACE_LINE = {
  gas: 'I used to fill up there.', grocery: 'We shopped there every week.', diner: 'Used to get breakfast there.',
  church: 'My aunt went there.', school: 'My kids went there.', hardware: 'Bought my deck screws there.',
};

export function describe(obs, roads) {
  const lines = [];
  if (!obs.subject) {
    lines.push(obs.agl > 100 ? 'Too high up. I can\'t make anything out.' : pick(['Just trees and fields in that one.',
      'Nothing there. Point the camera at a building.', 'I don\'t see anything worth going to.']));
    return lines;
  }
  const s = obs.subject;
  const name = siteName(s, roads);

  if (obs.sign) {
    lines.push(obs.sign.word ? `Wait. Somebody painted "${obs.sign.word}" on a sheet.` : 'There\'s a sheet laid out on the grass. Something written on it. Get closer.');
    if (obs.sign.waving) lines.push('Someone\'s waving at us! There are people alive in there.');
    lines.push(`That's ${siteRef(s, roads)}. We should go talk to them.`);
  } else {
    lines.push(s.name ? `That's ${s.name}. ${PLACE_LINE[s.kind] ?? ''}`.trim() : `${name}.`);
  }

  if (obs.tooFar) lines.push('Too far off to tell if anything\'s moving around it. Get closer.');
  else if (obs.dead === 0 && obs.unsure === 0) lines.push(obs.sharp ? 'I don\'t see any of them around it.' : 'Nothing moving that I can see. Hard to be sure from here.');
  else if (obs.dead === 0) lines.push('Something moving by it. Can\'t tell how many from here.');
  else if (obs.dead === 1) lines.push(`One of them hanging around it.${obs.unsure ? ' Maybe more.' : ''}`);
  else if (obs.dead < 5) lines.push(`I count ${obs.dead} of them.${obs.unsure ? ' Could be more.' : ''}`);
  else if (obs.dead < 10) lines.push(`${obs.dead}... no, more. That's too many for two people.`);
  else lines.push('That\'s a crowd. Nobody goes there on foot.');
  if (obs.elsewhere > 2) lines.push('More of them out in the open, too.');

  if (obs.cars === 1) lines.push('A car out front. Could siphon the tank.');
  else if (obs.cars > 1) lines.push(`${obs.cars} cars. That's gas, if we bring a hose.`);

  if (obs.sharp && s.left < 50) lines.push('Door\'s standing open. Somebody\'s already been through it.');
  else if (!obs.sign) lines.push(pick(HINTS[s.kind] ?? HINTS.big));

  const m = milesFromHome(s);
  lines.push(m > 0.8 ? `It's ${miles(m)} out. We'd take the truck.` : `${miles(m)} from here. We could walk it.`);
  if (obs.agl > 90) lines.push('You\'re pretty high, so I\'m guessing some of that.');
  return lines;
}

// Things the spotter says on their own while watching the feed.
export function createWatcher(say) {
  const cool = {};
  const once = new Set();
  const ready = (key, secs, t) => (cool[key] ?? -1e9) + secs < t && (cool[key] = t, true);

  return {
    newDay() { once.clear(); },
    update(t, { drone, walkers, signals, photo, tilt, threat }) {
      const s = drone.state;
      if (s.mode === 'landed') return;
      if (!once.has('up')) { once.add('up'); say(pick(['Feed\'s good. I\'ve got you.', 'I can see you. Go on.', 'Picture\'s clear.'])); }
      const noticing = walkers.noticing;
      if (noticing > 0 && ready('seen', 40, t)) {
        say(noticing > 2 ? 'They\'re all looking up at you. Get some height.' : 'That one heard you. Stay higher.');
      }
      const agl = s.pos.y - drone.groundBelow();
      const home = Math.hypot(s.pos.x - HOME.x, s.pos.z - HOME.z);
      if (s.battery < 30 && home > 2000 && !once.has('far')) { once.add('far'); say(`That's a long way home on ${Math.ceil(s.battery)} percent.`); }
      photo.aim(photo.photoCam, drone, tilt);
      for (const g of signals.list) {
        if (once.has(`sign${g.site}`)) continue;
        const d = Math.hypot(g.x - s.pos.x, g.z - s.pos.z);
        if (d < 260 && photo.inFrame(photo.photoCam, g.x, drone.groundBelow(), g.z)) {
          once.add(`sign${g.site}`);
          say(d < 120 ? 'Stop. Is that writing on the ground? Get a picture of that.' : 'Wait, go back. Something white on the grass over there.');
        }
      }
      if (threat > 5 && home < 400 && agl > 25 && !once.has('horde')) {
        once.add('horde');
        say('Look at the tree line around us. There\'s more of them than yesterday.');
      }
    },
  };
}
