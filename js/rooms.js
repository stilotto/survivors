// The farmhouse's rooms, laid out from its outside: a two-story main block
// (front door and porch on the west, chimney on the east), a lower rear
// wing for the kitchen, an attic under the gable, and a cellar behind the
// slanted doors on the east wall. Each room has a picture, a line of
// status for the cutaway, and the job people do there.
import { kitchen, living, dining, cellar } from './roomart-down.js';
import { bedrooms, bathroom, frontBedroom, attic } from './roomart-up.js';

const food = (g) => { const d = Math.floor(g.res.food / Math.max(1, g.crew.length)); return g.res.food ? `Food for ${d} day${d === 1 ? '' : 's'}` : 'Shelves empty'; };

export const ROOMS = [
  { id: 'attic', name: 'Attic', job: 'guard', draw: attic, shape: 'M70 92 L200 36 L330 92 Z', label: [200, 70],
    status: (g) => (g.threat < 1 ? 'Lookout, quiet' : `Lookout, ${Math.round(g.threat) < 4 ? 'a few' : 'many'} in the trees`),
    text: 'Up the pull-down ladder. The little gable window sees over the fields to the tree line. Whoever keeps watch at night sits up here with the rifle.' },
  { id: 'front', name: 'Front bedroom', job: 'watch', draw: frontBedroom, rect: [30, 95, 120, 90],
    status: (g, d) => `Radio, drone ${Math.ceil(d.state.battery)}%`,
    text: 'Its window opens onto the porch roof, so the drone goes out that way and never touches the ground. The radio and the charger live on the desk.' },
  { id: 'bedrooms', name: 'Bedrooms', job: 'rest', draw: bedrooms, rect: [150, 95, 140, 90],
    status: (g) => { const h = g.crew.filter((p) => p.hurt).length; return h ? `${h} hurt` : `${g.crew.length} sleeping here`; },
    text: 'The two back bedrooms, with mattresses dragged in from the other rooms so everyone sleeps upstairs, away from the doors.' },
  { id: 'bath', name: 'Bathroom', draw: bathroom, rect: [290, 95, 80, 90],
    status: (g) => `Medicine ${g.res.meds}`,
    text: 'The medicine cabinet holds whatever we\'ve found. We filled the tub the first night, before the water pressure went.' },
  { id: 'kitchen', name: 'Kitchen', job: 'garden', draw: kitchen, rect: [30, 185, 100, 90],
    status: food,
    text: 'In the back wing. The pantry shelves are the first thing anyone looks at in the morning. The garden and the hand pump are out the back door.' },
  { id: 'dining', name: 'Dining room', draw: dining, rect: [130, 185, 100, 90], plans: true,
    status: (g) => `Plans, ${g.photos.length} photos`,
    text: 'The big table is where we decide who goes where. The county map is on the wall, with the drone prints pinned around it.' },
  { id: 'living', name: 'Living room', job: 'fortify', draw: living, rect: [230, 185, 140, 90],
    status: (g) => `Gas ${g.res.fuel}, lumber ${g.res.parts}`,
    text: 'Nobody sits in here anymore. It\'s where we stack what we bring home. The furniture has gone to block the front windows.' },
  { id: 'cellar', name: 'Cellar', job: 'reload', draw: cellar, rect: [30, 282, 340, 66],
    status: (g) => `Ammo ${g.res.ammo}, press`,
    text: 'Down the kitchen stairs or in through the slanted doors outside. Stone walls, the old owner\'s workbench, and his reloading press, with the powder and primers he left.' },
];

export const roomById = (id) => ROOMS.find((r) => r.id === id);

// A cutaway of the house, drawn like a pencil sketch; each room is a button.
export function cutaway(game, drone) {
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rooms = ROOMS.map((r) => {
    const [cx, cy] = r.label ?? [r.rect[0] + r.rect[2] / 2, r.rect[1] + r.rect[3] / 2];
    const shape = r.shape ? `<path d="${r.shape}"/>` : `<rect x="${r.rect[0]}" y="${r.rect[1]}" width="${r.rect[2]}" height="${r.rect[3]}"/>`;
    return `<g class="room" data-room="${r.id}" role="button" tabindex="0" aria-label="${r.name}">${shape}
      <text x="${cx}" y="${cy - 2}" class="rname">${r.name}</text>
      <text x="${cx}" y="${cy + 15}" class="rstat">${esc(r.status(game, drone))}</text></g>`;
  }).join('');
  return `<svg class="cutaway" viewBox="0 0 400 362" role="group" aria-label="The farmhouse, room by room">
    <path class="roof" d="M18 96 L200 22 L382 96"/>
    <rect class="chimney" x="292" y="30" width="20" height="50"/>
    <path class="porch" d="M2 212 L30 206 M6 212 L6 275 M26 212 L26 275"/>
    <line class="grade" x1="0" y1="278" x2="400" y2="278"/>
    <rect class="earth" x="0" y="279" width="400" height="80"/>
    ${rooms}
  </svg>`;
}
