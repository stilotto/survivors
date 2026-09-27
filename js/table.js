// The kitchen table: who does what tomorrow, the drone prints pinned up,
// and the journal. Plain paper and pencil, no game badges.
import { SKILLS, SKILL_NAMES, HURT } from './people.js';
import { TASKS, AWAY } from './dayend.js';
import { milesFromHome } from './sites.js';

const GOOD_NAMES = { food: 'Food', water: 'Water', fuel: 'Gas', meds: 'Medicine', ammo: 'Ammo', parts: 'Lumber' };

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fortWord = (f) => (f < 1 ? 'Windows wide open' : f < 3 ? 'A few boards up' : f < 6 ? 'Windows boarded' : 'House well boarded');

export function createTable(el, { getGame, sites, onEnd, onClose, onRestart }) {
  const body = el.querySelector('#t-body');
  const siteById = new Map(sites.map((s) => [s.id, s]));
  let tab = 'people';

  for (const b of el.querySelectorAll('[data-tab]')) b.onclick = () => { tab = b.dataset.tab; render(); };
  el.querySelector('#t-close').onclick = () => { el.hidden = true; onClose(); };
  el.querySelector('#t-end').onclick = () => {
    if (getGame().over) { onRestart(); return; }
    onEnd();
    tab = 'journal';
    render();
  };

  // Places the group could go: one entry per photographed site, newest first.
  function targets(game, recruit) {
    const seen = new Map();
    for (const p of [...game.photos].reverse()) {
      if (seen.has(p.site) || !siteById.has(p.site)) continue;
      if (recruit && !p.sign) continue;
      seen.set(p.site, p);
    }
    return [...seen.values()];
  }

  function people(game) {
    const runs = targets(game, false), talks = targets(game, true);
    return game.crew.map((p) => {
      const o = game.orders[p.id] ?? { task: 'rest' };
      const opts = Object.entries(TASKS).map(([k, label]) => {
        const none = (k === 'run' && !runs.length) || (k === 'recruit' && !talks.length);
        const off = none || (AWAY.has(k) && p.hurt >= 2);
        const note = none ? (k === 'run' ? ' (needs a drone photo)' : ' (no one spotted yet)') : '';
        return `<option value="${k}"${o.task === k ? ' selected' : ''}${off ? ' disabled' : ''}>${label}${note}</option>`;
      }).join('');
      const list = o.task === 'run' ? runs : o.task === 'recruit' ? talks : null;
      const where = list ? `<select data-site="${p.id}" aria-label="Where">${list.map((ph) =>
        `<option value="${ph.site}"${o.site === ph.site ? ' selected' : ''}>${esc(ph.name)}, ${milesFromHome(siteById.get(ph.site)).toFixed(1)} mi (photo day ${ph.day})</option>`).join('')}</select>` : '';
      const state = [HURT[p.hurt], p.hungry ? 'hungry' : ''].filter(Boolean).join(', ');
      return `<article class="person">
        <h3>${esc(p.name)}${state ? ` <span class="state">${state}</span>` : ''}</h3>
        <p class="past">${esc(p.first)} ${esc(p.past)}.</p>
        <p class="skills">${SKILLS.map((k) => `${SKILL_NAMES[k]} ${p.skills[k]}`).join(' · ')}</p>
        <select data-task="${p.id}" aria-label="Tomorrow">${opts}</select>${where}
      </article>`;
    }).join('');
  }

  function photos(game) {
    if (!game.photos.length) return '<p class="empty">No prints yet. Fly the drone and take pictures of places worth a look (P or the round button).</p>';
    return `<div class="prints">${[...game.photos].reverse().map((ph) => `<figure class="print">
      <img src="${ph.img}" alt="Drone photo of ${esc(ph.name)}">
      <figcaption><b>${esc(ph.name)}</b> <span>day ${ph.day}</span>
      ${ph.notes.map((n) => `<br>${esc(n)}`).join('')}</figcaption></figure>`).join('')}</div>`;
  }

  function journal(game) {
    return [...game.journal].reverse().map((e) => `<section class="entry">
      <h3>Day ${e.day}, ${e.when}</h3>${e.lines.map((l) => `<p>${esc(l)}</p>`).join('')}</section>`).join('');
  }

  function render() {
    const game = getGame();
    el.querySelector('#t-day').textContent = `Day ${game.day}`;
    el.querySelector('#t-supplies').textContent =
      `${Object.entries(GOOD_NAMES).map(([k, n]) => `${n} ${game.res[k]}`).join(' · ')} · ${fortWord(game.fort)}`;
    for (const b of el.querySelectorAll('[data-tab]')) b.classList.toggle('active', b.dataset.tab === tab);
    body.innerHTML = { people, photos, journal }[tab](game);
    body.scrollTop = 0;
    const end = el.querySelector('#t-end');
    end.textContent = game.over ? 'Start over' : 'End the day';

    for (const s of body.querySelectorAll('[data-task]')) {
      s.onchange = () => {
        const task = s.value;
        const list = task === 'run' ? targets(game, false) : task === 'recruit' ? targets(game, true) : [];
        game.orders[s.dataset.task] = { task, site: list[0]?.site };
        render();
      };
    }
    for (const s of body.querySelectorAll('[data-site]')) {
      s.onchange = () => { game.orders[s.dataset.site].site = +s.value; };
    }
  }

  return {
    open(which) { if (which) tab = which; render(); el.hidden = false; },
    get isOpen() { return !el.hidden; },
  };
}
