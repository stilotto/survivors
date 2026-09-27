// Survivors at the door: now and then, at first light, someone walks up
// the lane and knocks. They stand on the porch (under the drone pad) until
// the group lets them in or sends them away. Some are hiding a bite.
import * as THREE from 'three';
import { figureGeometry } from './figure.js';
import { makePerson } from './people.js';
import { siteRef, milesFromHome } from './sites.js';
import { pickOne } from './rng.js';

const names = (list) => (list.length < 2 ? list[0] : `${list.slice(0, -1).join(' and ')} and ${list.at(-1)}`);
const WHERE_FROM = ['up the lane from Ash Stop Road', 'across the field from the tree line', 'down Route 68 on foot'];
const TELLS = ['keeps one arm wrapped in a dish towel', 'is sweating, though it\'s cool out', 'won\'t take off a long coat',
  'has blood on a sleeve and says it isn\'t theirs'];
const LOOKS = ['looks like they haven\'t slept in days', 'is carrying everything they own in a pillowcase',
  'has a hunting rifle but no shells', 'keeps looking back at the road', 'is barefoot, shoes in hand'];

// At the end of a night: maybe someone comes at dawn. Pushes journal lines.
export function arrive(game, sites, roads, lines) {
  if (game.visitor || game.day < 2 || !game.crew.length || game.crew.length >= 10 || Math.random() > 0.3) return;
  const from = sites.filter((s) => s.people && milesFromHome(s) < 4);
  const site = from.length && Math.random() < 0.6 ? pickOne(from, Math.random) : null;
  const count = site ? site.people : 1 + (Math.random() < 0.3 ? 1 : 0);
  if (site) site.people = 0;
  const people = [];
  for (let i = 0; i < count; i++) {
    people.push(makePerson(game.seed + game.day * 97 + i * 13 + 5, [...game.crew, ...people].map((c) => c.first)));
  }
  const bitten = Math.random() < 0.25 ? pickOne(people, Math.random).id : null;
  const gift = Math.random() < 0.4 ? { food: 2 + Math.floor(Math.random() * 5) } : null;
  game.visitor = {
    day: game.day + 1, people, bitten, gift,
    from: site ? `from ${siteRef(site, roads)}` : pickOne(WHERE_FROM, Math.random),
    notes: people.map((p) => (p.id === bitten && Math.random() < 0.7 ? pickOne(TELLS, Math.random) : pickOne(LOOKS, Math.random))),
  };
  game.threat += 0.3; // the dead follow people
  lines.push(`At first light someone knocked on the front door. ${people.length > 1 ? 'Two people' : 'A stranger'}, ${game.visitor.from}. They want in.`);
}

// Before the night: whoever is left on the porch gives up, and anyone we let
// in with a bite turns.
export function resolveNight(game, lines) {
  const v = game.visitor;
  if (v && v.day <= game.day) {
    lines.push('Nobody answered the door. The people on the porch gave up and went back down the lane.');
    game.visitor = null;
  }
  const turned = game.crew.find((p) => p.bitten);
  if (!turned) return;
  game.crew = game.crew.filter((p) => p !== turned);
  const near = game.crew.filter((p) => p.hurt <= 2);
  const victim = near[Math.floor(Math.random() * near.length)];
  lines.push(`${turned.first} had a bite and didn't tell anyone. In the night ${turned.first} turned.`);
  if (victim) {
    victim.hurt += 1;
    lines.push(victim.hurt > 2 ? `${victim.first} didn't survive it.` : `${victim.first} got hurt putting ${turned.first} down.`);
  }
}

// Who's on the porch right now, for the house screen.
export const visitorToday = (game) => (game.visitor && game.visitor.day === game.day ? game.visitor : null);

export function letIn(game) {
  const v = game.visitor;
  for (const p of v.people) { if (p.id === v.bitten) p.bitten = true; game.crew.push(p); }
  const line = [`We let in ${names(v.people.map((p) => p.name))}.`];
  if (v.gift) { game.res.food += v.gift.food; line.push(`They brought ${v.gift.food} cans of food.`); }
  game.journal.push({ day: game.day, when: 'morning', lines: line });
  game.visitor = null;
}

export function turnAway(game) {
  const v = game.visitor;
  game.journal.push({ day: game.day, when: 'morning', lines: [
    `We told ${names(v.people.map((p) => p.first))} to go. ${v.people.length > 1 ? 'They' : v.people[0].first} stood on the porch a long time, then walked back down the lane.`] });
  game.visitor = null;
}

// A medic in the group may notice what the visitor is hiding.
export function medicNote(game, v) {
  const medic = game.crew.filter((p) => p.hurt < 2).sort((a, b) => b.skills.med - a.skills.med)[0];
  if (!medic || medic.skills.med < 3 || !v.bitten) return '';
  const who = v.people.find((p) => p.id === v.bitten);
  return `${medic.first} doesn't like how ${who.first} is holding that arm.`;
}

// The figures on the porch, facing the front door.
export function createPorch(terrain) {
  const group = new THREE.Group();
  const body = figureGeometry(false);
  const spots = [[-2.2, 5.3], [-1.4, 5.6]];
  const figs = spots.map(([x, z], i) => {
    const m = new THREE.Mesh(body, new THREE.MeshLambertMaterial({ vertexColors: true, color: [0x6a5a4a, 0x3e5a7a][i] }));
    m.position.set(x, terrain.heightAt(0, 0) + 0.4, z);
    m.rotation.y = i ? -0.3 : 0;
    m.visible = false;
    group.add(m);
    return m;
  });
  return { group, show: (n) => figs.forEach((m, i) => { m.visible = i < n; }) };
}
