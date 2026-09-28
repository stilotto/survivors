// Inside the farmhouse: a cutaway of the house to pick a room, and each
// room drawn as it is today (full shelves or bare ones, boards on the
// windows, the press in the cellar). The dining room is where the group
// plans: jobs, the drone prints, the journal.
import { SKILLS, SKILL_NAMES, HURT } from './people.js';
import { TASKS, AWAY, OUT } from './dayend.js';
import { emptied } from './outbuildings.js';
import { milesFromHome } from './sites.js';
import { ROOMS, roomById, cutaway } from './rooms.js';
import { canvasFor } from './sketch.js';
import { windowsFor } from './lookout.js';
import { visitorToday, letIn, turnAway, medicNote } from './visitors.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createInside(el, { getGame, getDrone, sites, onEnd, onClose, onRestart, onLook }) {
  const body = el.querySelector('#t-body');
  const tabs = el.querySelector('#t-tabs');
  const siteById = new Map(sites.map((s) => [s.id, s]));
  let where = 'house', tab = 'people';

  for (const b of el.querySelectorAll('[data-tab]')) b.onclick = () => { tab = b.dataset.tab; render(); };
  el.querySelector('#t-close').onclick = () => {
    if (where !== 'house') { where = 'house'; render(); return; }
    el.hidden = true;
    onClose();
  };
  // Step through the rooms with the edge arrows or the arrow keys.
  const prev = el.querySelector('#t-prev'), next = el.querySelector('#t-next');
  const step = (d) => {
    const i = ROOMS.findIndex((r) => r.id === where);
    if (i < 0) return;
    where = ROOMS[(i + d + ROOMS.length) % ROOMS.length].id;
    render();
  };
  prev.onclick = () => step(-1);
  next.onclick = () => step(1);
  addEventListener('keydown', (e) => {
    if (el.hidden || e.target.closest?.('input, select, textarea')) return;
    if (e.code === 'ArrowLeft') step(-1);
    else if (e.code === 'ArrowRight') step(1);
  });

  el.querySelector('#t-end').onclick = () => {
    if (getGame().over) { onRestart(); return; }
    onEnd();
    where = 'dining'; tab = 'journal';
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
        const bare = OUT.has(k) && emptied(game, k);
        const off = none || bare || ((AWAY.has(k) || OUT.has(k)) && p.hurt >= 2);
        const note = none ? (k === 'run' ? ' (needs a drone photo)' : ' (no one spotted yet)') : bare ? ' (nothing left)' : '';
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

  // Who works in this room tomorrow, and a way to send someone else.
  function staff(game, room) {
    const here = game.crew.filter((p) => (game.orders[p.id]?.task ?? 'rest') === room.job);
    const others = game.crew.filter((p) => !here.includes(p) && !(AWAY.has(room.job) && p.hurt >= 2));
    return `<p class="staff"><b>${TASKS[room.job]}:</b> ${here.length ? esc(here.map((p) => p.first).join(', ')) : 'nobody'}</p>
      ${others.length ? `<select data-assign="${room.job}" aria-label="Send someone here"><option value="">Send someone here…</option>
      ${others.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>` : ''}`;
  }

  function roster(game) {
    return game.crew.map((p) => {
      const state = [HURT[p.hurt], p.hungry ? 'hungry' : ''].filter(Boolean).join(', ');
      return `<article class="person"><h3>${esc(p.name)}${state ? ` <span class="state">${state}</span>` : ''}</h3>
        <p class="past">${esc(p.first)} ${esc(p.past)}.</p>
        <p class="skills">${SKILLS.map((k) => `${SKILL_NAMES[k]} ${p.skills[k]}`).join(' · ')}</p></article>`;
    }).join('');
  }

  // Someone on the porch, waiting on an answer.
  function door(game) {
    const v = visitorToday(game);
    if (!v || game.over) return '';
    const medic = medicNote(game, v);
    return `<section class="door"><h3>Someone at the front door</h3>
      <p>${v.people.length > 1 ? 'Two people' : 'A stranger'}, ${esc(v.from)}.${v.gift ? ' They say they have food to share.' : ''}</p>
      ${v.people.map((p, i) => `<p><b>${esc(p.name)}</b> ${esc(p.past)}. Up close, ${esc(p.first)} ${esc(v.notes[i])}.</p>`).join('')}
      ${medic ? `<p class="medic">${esc(medic)}</p>` : ''}
      <div class="door-btns"><button data-door="in">Let them in</button><button data-door="out">Send them away</button></div></section>`;
  }

  function wireDoor(game) {
    for (const b of body.querySelectorAll('[data-door]')) {
      b.onclick = () => { (b.dataset.door === 'in' ? letIn : turnAway)(game); render(); };
    }
  }

  function render() {
    const game = getGame();
    const room = roomById(where);
    el.querySelector('#t-day').textContent = room ? room.name : `Day ${game.day}`;
    el.querySelector('#t-where').textContent = room ? `Day ${game.day}` : 'The farmhouse. Tap a room.';
    el.querySelector('#t-close').textContent = room ? '← House' : 'Back to the drone';
    tabs.hidden = !room?.plans;
    prev.hidden = next.hidden = !room;
    el.classList.toggle('in-room', !!room);
    for (const b of el.querySelectorAll('[data-tab]')) b.classList.toggle('active', b.dataset.tab === tab);
    el.querySelector('#t-end').textContent = game.over ? 'Start over' : 'End the day';
    body.innerHTML = '';
    body.scrollTop = 0;

    if (!room) {
      body.innerHTML = door(game) + cutaway(game, getDrone());
      wireDoor(game);
      for (const g of body.querySelectorAll('[data-room]')) {
        const go = () => { where = g.dataset.room; render(); };
        g.addEventListener('click', go);
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      }
      return;
    }

    room.draw(canvasFor(body), game, getDrone());
    const text = document.createElement('div');
    text.className = 'room-text';
    const looks = windowsFor(room.id);
    text.innerHTML = (['living', 'dining'].includes(room.id) ? door(game) : '')
      + `<p>${esc(room.text)}</p>`
      + (looks.length ? `<div class="looks">${looks.map((v, i) => `<button data-look="${i}">Look out: ${esc(v.name.toLowerCase())}</button>`).join('')}</div>` : '')
      + (room.job ? staff(game, room) : '')
      + (room.id === 'bedrooms' ? roster(game) : '')
      + (room.plans ? { people, photos, journal }[tab](game) : '');
    body.append(text);
    wireDoor(game);

    for (const b of body.querySelectorAll('[data-look]')) {
      b.onclick = () => { el.hidden = true; onLook(room, +b.dataset.look); };
    }
    for (const s of body.querySelectorAll('[data-assign]')) {
      s.onchange = () => { if (s.value) { game.orders[s.value] = { task: s.dataset.assign }; render(); } };
    }
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
    open(which) {
      if (which === 'journal') { where = 'dining'; tab = 'journal'; } else where = roomById(which) ? which : 'house';
      render();
      el.hidden = false;
    },
    get isOpen() { return !el.hidden; },
  };
}
