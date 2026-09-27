// Renders screenshots of the scene in headless Chromium, for checking art
// changes without a browser. Works in the cloud sandbox, where the CDN is
// blocked: three.js requests are served from a local npm copy instead.
//
//   node tools/preview.mjs <out-dir> [view ...]
//
// A view is a preset name (see VIEWS) or name=x,y,z,lx,ly,lz (camera and
// look-at point in world meters: x east, z south; y is height above the
// ground at the look point). "game" screenshots the real game after launch;
// "look:<room>[:n]" screenshots the game looking out that room's window.
// Examples:
//   node tools/preview.mjs /tmp/shots house air
//   node tools/preview.mjs /tmp/shots barn=120,20,-40,100,5,-60 game look:front
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, extname, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.186.1'; // keep in step with index.html
const VIEWS = {
  house: [-18, 5, 20, 0, 4, -1], // front-left of the farmhouse
  poster: [-6, 2, 45, 0, 5, -5], // low across the meadow, like the film poster
  yard: [30, 4, -2, 5, 3, -12], // east side: shed and gas pump
  air: [300, 250, 600, -200, 0, -200], // countryside around the house
  downtown: [-2700, 90, 1880, -2868, 0, 1737], // Evans City, Main St
  high: [0, 800, 1500, 0, 0, -1000], // wide view of the map
};

const [outDir, ...names] = process.argv.slice(2);
if (!outDir) {
  console.log('usage: node tools/preview.mjs <out-dir> [view ...]\nviews:', Object.keys(VIEWS).join(', '), ', game');
  process.exit(1);
}
await mkdir(outDir, { recursive: true });

// Local copy of three.js from npm (the registry is reachable; the CDN isn't).
const threeDir = join(tmpdir(), `survivors-three-${THREE_VERSION}`);
if (!existsSync(join(threeDir, 'node_modules/three'))) {
  execSync(`npm i --silent --prefix ${threeDir} three@${THREE_VERSION}`, { stdio: 'inherit' });
}
const { chromium } = await import(join(execSync('npm root -g').toString().trim(), 'playwright/index.mjs'));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  try {
    const path = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!path.startsWith(ROOT)) throw new Error('outside root');
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404); res.end();
  }
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.route(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.*)/, (route) => {
  const rel = route.request().url().replace(/.*three@[^/]+\//, '');
  route.fulfill({ path: join(threeDir, 'node_modules/three', rel), contentType: 'text/javascript' });
});
// Fonts can't load in the sandbox; don't wait on them.
await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

const list = names.length ? names : ['house', 'air'];
const scene = list.filter((n) => n !== 'game' && !n.startsWith('look:'));
try {
  if (scene.length) {
    await page.goto(`${base}/tools/preview.html`);
    await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
    for (const name of scene) {
      const [label, spec] = name.includes('=') ? name.split('=') : [name, null];
      const view = spec ? spec.split(',').map(Number) : VIEWS[label];
      if (!view) { console.log(`unknown view: ${label}`); continue; }
      const tris = await page.evaluate((v) => window.shot(...v), view);
      const file = join(outDir, `${label}.png`);
      await page.locator('#c').screenshot({ path: file });
      console.log(`${file}  (${tris.toLocaleString()} triangles)`);
    }
  }
  if (list.includes('game')) {
    await page.goto(`${base}/index.html`);
    await page.waitForFunction(() => !document.querySelector('#launch').disabled, null, { timeout: 120000 });
    await page.click('#launch');
    await page.waitForTimeout(2000);
    const file = join(outDir, 'game.png');
    await page.screenshot({ path: file });
    console.log(file);
  }
  for (const name of list.filter((n) => n.startsWith('look:'))) {
    const [, room, n = 0] = name.split(':');
    await page.goto(`${base}/index.html`);
    await page.waitForFunction(() => !document.querySelector('#launch').disabled, null, { timeout: 120000 });
    await page.click('#launch');
    await page.click('#btn-house');
    await page.click(`[data-room="${room}"]`);
    await page.click(`[data-look="${n}"]`);
    await page.waitForTimeout(1500);
    const file = join(outDir, `look-${room}-${n}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
} finally {
  await browser.close();
  server.close();
}
