// Renders every Furge asset from source. Usage: node render.mjs [icon|stills|gifs|all] [name]
import { chromium } from 'playwright';
import opentype from 'opentype.js';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const BRAND = join(ROOT, 'assets/brand');
const README = join(ROOT, 'assets/readme');
const MOCKUPS = join(ROOT, 'assets/mockups');
const TMP = process.env.FURGE_TMP || join(HERE, '.frames');
const GIFSICLE = process.env.GIFSICLE || 'gifsicle';

const page_url = (name, query = '') => pathToFileURL(join(HERE, 'src', `${name}.html`)).href + query;

// Stills are a page at a fixed time. GIFs step the same page through window.seek(t).
const BLUEPRINTS = join(ROOT, 'assets/blueprints');
const sheet = (name, theme, out, vector) => ({ page: 'blueprint', query: `?sheet=${name}&theme=${theme}`, w: 1400, h: 990, scale: 1.5, out: join(BLUEPRINTS, `${out}.png`), svg: vector && join(BLUEPRINTS, `${out}.svg`) });
const STILLS = [
  sheet('shark', 'cyan', 'shark', true),
  sheet('bodysuit', 'cyan', 'bodysuit', true),
  sheet('head', 'cyan', 'head-base', true),
  sheet('head', 'ink', 'head-base-ink'),
  sheet('head', 'paper', 'head-base-paper'),
  { page: 'studio', query: '?still=1', w: 1120, h: 700, scale: 1.5, out: join(MOCKUPS, 'blueprint-studio.png') },
  { page: 'art', w: 1120, h: 700, scale: 1.5, out: join(MOCKUPS, 'art-studio.png') },
  { page: 'firstrun', w: 1120, h: 700, scale: 1.5, out: join(MOCKUPS, 'first-run.png') },
  { page: 'board', w: 1600, h: 900, scale: 1.5, out: join(BRAND, 'brand-board.png') },
  { page: 'social', w: 1280, h: 640, scale: 1, out: join(BRAND, 'social-preview.png') },
];
const GIFS = [
  { page: 'hero', start: 3.2, w: 1200, h: 600, fps: 18, dur: 8, out: join(README, 'hero.gif'), lossy: 12 },
  { page: 'studio', start: 6.4, w: 1120, h: 700, fps: 14, dur: 10, out: join(README, 'studio.gif'), lossy: 30 },
  { page: 'species', w: 960, h: 420, fps: 15, dur: 7.2, out: join(README, 'species.gif'), lossy: 30 },
  { page: 'portable', start: 4, w: 960, h: 440, fps: 15, dur: 7, out: join(README, 'portable.gif'), lossy: 30 },
  { page: 'ticker', w: 960, h: 60, fps: 25, dur: 4, out: join(README, 'ticker.gif'), lossy: 20 },
];

async function renderIcon(browser) {
  await import(pathToFileURL(join(HERE, 'src/furge.js')).href);
  const { Furge } = globalThis;
  writeFileSync(join(BRAND, 'icon.svg'), Furge.iconSVG());
  writeFileSync(join(BRAND, 'icon-small.svg'), Furge.iconSVG({ small: true }));
  writeLogos(Furge);
  const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  mkdirSync(join(BRAND, 'png'), { recursive: true });
  for (const size of sizes) {
    const svg = Furge.iconSVG({ small: size <= 48, size });
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
    await page.screenshot({ path: join(BRAND, 'png', `icon-${size}.png`), omitBackground: true });
  }
  await page.close();
  const pyBin = join(HERE, 'icons.py');
  execFileSync('python3', ['-I', pyBin, join(BRAND, 'png'), BRAND], { stdio: 'inherit' });
}

// Wordmark and lockups as real outlines, so they render the same without the font installed.
function writeLogos(Furge) {
  const font = opentype.loadSync(join(HERE, 'fonts/Inter-Display-SemiBold.ttf'));
  const path = font.getPath('Furge', 0, 0, 200, { letterSpacing: -0.035 });
  const box = path.getBoundingBox();
  const d = path.toPathData(1);
  const w = Math.ceil(box.x2 - box.x1), h = Math.ceil(box.y2 - box.y1);
  const word = (fill) => `<path transform="translate(${-box.x1} ${-box.y1})" d="${d}" fill="${fill}"/>`;
  writeFileSync(join(BRAND, 'wordmark-white.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${word('#f5f5f7')}</svg>`);
  writeFileSync(join(BRAND, 'wordmark-black.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${word('#000000')}</svg>`);
  const icon = Furge.iconSVG({ uid: 'l', size: 260 }).replace('<svg ', '<svg x="-20" y="-20" ');
  const lockup = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 ${w + 294} 240" width="${w + 294}" height="240">${icon}<g transform="translate(264 ${110 - h / 2 - 2})">${word(fill)}</g></svg>`;
  writeFileSync(join(BRAND, 'logo-white.svg'), lockup('#f5f5f7'));
  writeFileSync(join(BRAND, 'logo-black.svg'), lockup('#000000'));
}

async function renderStill(browser, s) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.scale });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error(`[${s.page}]`, e.message));
  await page.goto(page_url(s.page, s.query || ''));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  await page.screenshot({ path: s.out });
  if (s.svg) writeFileSync(s.svg, await page.evaluate(() => window.sheetSource));
  await ctx.close();
  console.log('still', s.out);
}

async function renderGif(browser, g) {
  const dir = join(TMP, g.page);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: g.w, height: g.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error(`[${g.page}]`, e.message));
  await page.goto(page_url(g.page));
  await page.evaluate(() => document.fonts.ready);
  const frames = Math.round(g.fps * g.dur);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.seek(t), (i / g.fps + (g.start || 0)) % g.dur); // start picks the first frame, which is what still previews show
    await page.screenshot({ path: join(dir, `${String(i).padStart(4, '0')}.png`) });
  }
  await ctx.close();
  const raw = join(dir, 'raw.gif');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(g.fps), '-i', join(dir, '%04d.png'),
    '-filter_complex', '[0:v]split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle',
    '-loop', '0', raw]);
  execFileSync(GIFSICLE, ['-O3', `--lossy=${g.lossy}`, '--no-comments', '-o', g.out, raw]);
  rmSync(dir, { recursive: true, force: true });
  console.log('gif', g.out, `${(statSync(g.out).size / 1048576).toFixed(2)} MB`, `${frames} frames`);
}

const [mode = 'all', only] = process.argv.slice(2);
for (const d of [BRAND, README, MOCKUPS, BLUEPRINTS]) mkdirSync(d, { recursive: true });
execFileSync('node', [join(HERE, 'freesewing.mjs'), join(BLUEPRINTS, 'freesewing'), join(HERE, 'src/generated/fs-data.js')], { cwd: HERE, stdio: 'ignore' });
const browser = await chromium.launch();
try {
  if (mode === 'icon' || mode === 'all') await renderIcon(browser);
  if (mode === 'stills' || mode === 'all') for (const s of STILLS) if (!only || s.page === only) await renderStill(browser, s);
  if (mode === 'gifs' || mode === 'all') for (const g of GIFS) if (!only || g.page === only) await renderGif(browser, g);
} finally {
  await browser.close();
}
