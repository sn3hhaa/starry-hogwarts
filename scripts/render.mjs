// Deterministic offline renderer.
// Launches headless Chrome on src/render/render.html, which paints each frame in
// WebGL and POSTs the pixels back here; frames are piped straight into FFmpeg.
//
//   node scripts/render.mjs --video [--from 0 --to 120] [--scale 1] [--out renders/film.mp4]
//   node scripts/render.mjs --stills 3.2,14,52.5 [--scale 0.5] [--dir renders/stills]
//   node scripts/render.mjs --sheet 0,10,20,...  [--cols 4] [--out renders/sheet.jpg]   (contact sheet)
//   node scripts/render.mjs --sheet shots         one frame from the middle of every shot

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer, ROOT } from './serve.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };

const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, 'story/timeline.json'), 'utf8'));
const fps = Number(opt('fps', timeline.fps));
const scale = Number(opt('scale', flag('video') ? 1 : 0.5));
const W = Math.round((1920 * scale) / 2) * 2, H = Math.round((1080 * scale) / 2) * 2;

function findChrome() {
  const c = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const p of c) if (fs.existsSync(p)) return p;
  throw new Error('Chrome/Edge not found. Set CHROME_PATH.');
}

let mode, times = [], from = 0, to = timeline.duration;
if (flag('video')) { mode = 'video'; from = Number(opt('from', 0)); to = Number(opt('to', timeline.duration)); }
else if (flag('stills') || flag('sheet')) {
  mode = flag('sheet') ? 'sheet' : 'stills';
  const spec = opt(mode, 'shots');
  if (spec === 'shots') times = timeline.shots.map((s) => +(s.t0 + (s.t1 - s.t0) * Number(opt('at', 0.55))).toFixed(3));
  else if (spec.includes(':')) { const [a, b, st] = spec.split(':').map(Number); for (let t = a; t <= b + 1e-6; t += st) times.push(+t.toFixed(3)); }
  else times = spec.split(',').map(Number);
} else { console.error('usage: --video | --stills t1,t2 | --sheet t1,t2|shots|a:b:step'); process.exit(1); }

const outVideo = path.resolve(ROOT, opt('out', mode === 'sheet' ? 'renders/sheet.jpg' : 'renders/film_silent.mp4'));
const stillDir = path.resolve(ROOT, opt('dir', mode === 'sheet' ? 'renders/_sheet' : 'renders/stills'));
fs.mkdirSync(path.dirname(outVideo), { recursive: true });
if (mode !== 'video') { fs.rmSync(stillDir, { recursive: true, force: true }); fs.mkdirSync(stillDir, { recursive: true }); }

let ff = null, frames = 0, done, fail;
const finished = new Promise((res, rej) => { done = res; fail = rej; });
const t0 = Date.now();
const total = mode === 'video' ? Math.round((to - from) * fps) : times.length;

if (mode === 'video') {
  ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(fps), '-i', '-',
    '-vf', 'vflip', '-c:v', 'libx264', '-preset', opt('preset', 'slow'), '-crf', opt('crf', '15'), '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', outVideo], { stdio: ['pipe', 'inherit', 'inherit'] });
  ff.on('error', fail);
}

const handlers = {
  '/__frame': async (req, res, url, body) => {
    if (mode === 'video') { if (!ff.stdin.write(body)) await new Promise((r) => ff.stdin.once('drain', r)); }
    else fs.writeFileSync(path.join(stillDir, `${url.searchParams.get('name')}.png`), body);
    frames++;
    if (frames % 24 === 0 || mode !== 'video') {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r  ${frames}/${total} frames  ${(frames / el).toFixed(1)} fps  eta ${Math.max(0, ((total - frames) / (frames / el))).toFixed(0)}s   `);
    }
  },
  '/__log': async (req, res, url, body) => { console.log('\n[page]', body.toString()); },
  '/__error': async (req, res, url, body) => { console.error('\n[page error]', body.toString()); fail(new Error(body.toString())); },
  '/__done': async () => { done(); },
};

const port = 5200 + Math.floor(Math.random() * 400);
const server = await startServer({ port, handlers, quiet: true });
const q = new URLSearchParams({ mode, w: String(W), h: String(H), fps: String(fps), from: String(from), to: String(to), times: times.join(',') });
const url = `http://127.0.0.1:${port}/src/render/render.html?${q}`;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'starry-chrome-'));
const chrome = spawn(findChrome(), [
  '--headless=new', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--mute-audio',
  '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-unsafe-swiftshader', '--force_high_performance_gpu',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  `--window-size=${W},${H}`, '--hide-scrollbars', url,
], { stdio: 'ignore' });

console.log(`Rendering ${mode} ${W}x${H} @${fps}fps  (${total} frames)`);
let code = 0;
try {
  await Promise.race([finished, new Promise((_, rej) => chrome.on('exit', (c) => setTimeout(() => rej(new Error('Chrome exited early: ' + c)), 500)))]);
} catch (e) { console.error('\nRender failed:', e.message); code = 1; }
chrome.removeAllListeners('exit');
chrome.kill();
server.close();
if (ff) { ff.stdin.end(); await new Promise((r) => ff.on('close', r)); }
console.log(`\n  ${frames} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

if (code === 0 && mode === 'video') console.log('  →', path.relative(ROOT, outVideo));
if (code === 0 && mode === 'stills') console.log('  →', path.relative(ROOT, stillDir));
if (code === 0 && mode === 'sheet') {
  const cols = Number(opt('cols', Math.min(4, Math.ceil(Math.sqrt(times.length)))));
  const rows = Math.ceil(times.length / cols);
  const cellW = Number(opt('cell', 640));
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(stillDir, 'f%04d.png'),
    '-vf', `scale=${cellW}:-1,tile=${cols}x${rows}:padding=6:margin=6:color=0x101018`, '-frames:v', '1', '-q:v', '3', outVideo], { stdio: 'inherit' });
  if (r.status === 0) console.log('  →', path.relative(ROOT, outVideo), `(${cols}x${rows}: ${times.join(', ')})`);
}
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(code);
