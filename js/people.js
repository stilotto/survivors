// The people in the group: names, what they're good at, how they're doing.
import { rng, pickOne } from './rng.js';

export const SKILLS = ['fight', 'scav', 'med', 'build', 'tech'];
export const SKILL_NAMES = { fight: 'Fighting', scav: 'Scrounging', med: 'Medicine', build: 'Building', tech: 'Tech' };

const FIRST = ['Dale', 'Rosa', 'Terrence', 'Kim', 'Walt', 'Priya', 'Marcus', 'June', 'Earl', 'Nadia', 'Cody',
  'Lorraine', 'Hank', 'Tasha', 'Ruth', 'Gene', 'Wes', 'Maddie', 'Luis', 'Donna', 'Ray', 'Beth', 'Owen',
  'Carla', 'Vic', 'Shonda', 'Pete', 'Alma', 'Deshawn', 'Irene', 'Mitch', 'Gloria', 'Andy', 'Val', 'Curtis', 'Nell'];
const LAST = ['Kowalski', 'Reyes', 'Hufnagel', 'Byers', 'Stahl', 'Patel', 'Greer', 'Dietrich', 'Novak', 'Shaffer',
  'McKee', 'Ruppert', 'Oyelaran', 'Brandt', 'Lutz', 'Whalen', 'Pasternak', 'Boggs', 'Ferrante', 'Yoder'];

// A line about who they were, keyed by their best skill.
const PAST = {
  fight: ['hunts deer every fall', 'was a county deputy', 'did two tours overseas', 'boxed in high school'],
  scav: ['drove a delivery route through every town around here', 'ran the flea market on Saturdays',
    'knows every back road', 'worked at the Walmart warehouse'],
  med: ['was an EMT with the fire company', 'was a nurse at the hospital in Butler', 'kept a vet practice',
    'did home care for the elderly'],
  build: ['framed houses for twenty years', 'is a farmer, can fix anything', 'welds', 'was a union electrician'],
  tech: ['flew drones for a surveying company', 'fixed phones at the mall', 'is a ham radio nut',
    'was an engineering student at Pitt'],
};

export function makePerson(seed, used = []) {
  const r = rng(seed, 3);
  let first;
  do first = pickOne(FIRST, r); while (used.includes(first) && used.length < FIRST.length);
  const skills = Object.fromEntries(SKILLS.map((k) => [k, 1 + Math.floor(r() * r() * 4)]));
  const best = pickOne(SKILLS, r);
  skills[best] = 3 + Math.floor(r() * 3);
  return { id: Math.floor(r() * 1e9), name: `${first} ${pickOne(LAST, r)}`, first, skills, past: pickOne(PAST[best], r),
    hurt: 0, hungry: 0 };
}

// The group at the start: one of them flies the drone.
export function startingCrew(seed) {
  const crew = [];
  for (let i = 0; i < 4; i++) crew.push(makePerson(seed * 10 + i, crew.map((p) => p.first)));
  const pilot = crew[0];
  pilot.skills.tech = 5;
  pilot.past = PAST.tech[0];
  return crew;
}

export const HURT = ['', 'hurt', 'badly hurt'];

// Best at a skill, ignoring people who are badly hurt.
export const bestAt = (crew, skill) =>
  crew.filter((p) => p.hurt < 2).sort((a, b) => b.skills[skill] - a.skills[skill])[0] ?? crew[0];
