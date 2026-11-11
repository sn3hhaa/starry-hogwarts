// Landscape kit: hills whose strokes follow the slope, flame-like cypresses,
// trees, Rhône-style water with shivering reflections.

import { fill, paint } from '../engine/patch.js';
import { soft, ellipse } from '../engine/geom.js';
import { RNG, fbm } from '../engine/rng.js';
import { C, clamp, fract } from '../engine/util.js';
import { PAL } from './palette.js';

/** Polygon under a ridge line y = fn(x). */
export function ridge(fn, x0, x1, bottom, step = 36) {
  const pts = [];
  for (let x = x0; x <= x1 + 1; x += step) pts.push([x, fn(x)]);
  pts.push([x1, bottom], [x0, bottom]);
  return pts;
}

/** A hill / field: strokes run along the slope like ploughed furrows. */
export function hill(fn, x0, x1, bottom, o = {}) {
  const slope = (x) => Math.atan2(fn(x + 20) - fn(x - 20), 40);
  return fill(ridge(fn, x0, x1, bottom), {
    flow: (x, y) => slope(x) * clamp(1 - (y - fn(x)) / 400, 0.2, 1) + (o.wave ? Math.sin(x * 0.01 + y * 0.02) * o.wave : 0),
    len: 46, wid: 12, density: 2.3, hug: false, thick: 0.7,
    tone: o.tone ?? ((x, y) => clamp(0.75 - (y - fn(x)) / (o.depth ?? 420) + (fbm(x * 0.004, y * 0.01, 2) - 0.5) * 0.5)),
    ...o,
  });
}

/** Cypress: a dark green flame. */
export function cypress(ht = 420, w = 90, seed = 1, pal = PAL.cypress) {
  const r = RNG(seed);
  const pts = [[0, -ht]];
  const n = 7;
  for (let i = 1; i <= n; i++) pts.push([w * 0.5 * Math.sin((i / n) * Math.PI * 0.95) * (0.8 + r() * 0.4) + 6, -ht + (i / n) * ht]);
  for (let i = n; i >= 1; i--) pts.push([-w * 0.5 * Math.sin((i / n) * Math.PI * 0.95) * (0.8 + r() * 0.4) - 6, -ht + (i / n) * ht]);
  const shape = soft(pts, 2);
  const patch = paint([
    { shape, pal, flow: (x, y) => -1.57 + Math.sin(y * 0.022 + x * 0.06 + seed) * 0.85, curve: 0.4, len: 34, wid: 9, density: 3, hug: false, thick: 0.9, tone: (x, y) => clamp(0.55 - x / (w * 1.4) + Math.sin(y * 0.03) * 0.15) },
  ], seed);
  const warp = (t) => (x, y) => [x + Math.sin(t * 1.1 + y * 0.008 + seed) * 9 * Math.pow(clamp(-y / ht), 1.6), y];
  return { patch, warp, ht };
}
export function drawCypress(S, c, x, y, s, t, o) { S.push(x, y, 0, s); S.draw(c.patch, { ...o, warp: c.warp(t) }); S.pop(); }

/** Round-canopy tree. season: 0 spring → 1 summer → 2 autumn → 3 bare winter */
export function tree(seed = 1, pal = PAL.olive, ht = 300) {
  const r = RNG(seed);
  const trunk = soft([[-14, 0], [-9, -ht * 0.55], [-22, -ht * 0.8], [0, -ht * 0.7], [20, -ht * 0.85], [9, -ht * 0.5], [14, 0]], 1);
  const tp = paint([{ shape: trunk, pal: PAL.earth.slice(0, 4), flow: -1.57, len: 26, wid: 7, density: 2.8 }, { outline: trunk, wid: 3.5 }], seed);
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const cx = (r() - 0.5) * ht * 0.75, cy = -ht * (0.72 + r() * 0.42), rr = ht * (0.2 + r() * 0.12);
    parts.push({ shape: ellipse(cx, cy, rr, rr * 0.85, 14), pal, flow: { ring: [cx, cy] }, curve: 0.3, len: 26, wid: 8.5, density: 2.8, hug: false, under: i < 3, tone: (x, y) => clamp(0.6 - (x - cx) / (rr * 3) - (y - cy) / (rr * 3)) });
  }
  const canopy = paint(parts, seed + 1);
  const warp = (t) => (x, y) => [x + Math.sin(t * 1.3 + y * 0.01 + seed) * 6 * clamp(-y / ht), y];
  return { trunk: tp, canopy, warp, ht };
}
export function drawTree(S, tr, x, y, s, t, o = {}) {
  S.push(x, y, 0, s);
  S.draw(tr.trunk, o);
  if ((o.leaf ?? 1) > 0.01) S.draw(tr.canopy, { ...o, a: (o.a ?? 1) * (o.leaf ?? 1), warp: tr.warp(t), mul: o.leafMul ?? o.mul });
  S.pop();
}

/**
 * Water: a static dark underpainting, shimmering horizontal dashes, and a
 * column of broken reflection under every light.
 * o: { x, y, w, h, pal, lights:[{x, pal, w, a}], seed, len }
 */
export function makeWater(o) {
  const { x, y, w, h } = o;
  const pal = (o.pal ?? PAL.night.slice(0, 6)).map(C);
  const rng = RNG(o.seed ?? 9);
  const under = fill([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { pal: pal.slice(0, 3), flow: 0, jit: 0.06, len: 80, wid: 15, density: 1.8, under: false, hug: false, thick: 0.4, seed: (o.seed ?? 9) + 1 });
  const len = o.len ?? 54, wid = 9;
  const cell = Math.sqrt((len * wid * 0.62) / 1.5);
  const nx = Math.ceil(w / cell), ny = Math.ceil(h / cell), N = nx * ny;
  const A = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { A[i * 4] = x + ((i % nx) + rng()) * cell; A[i * 4 + 1] = y + (Math.floor(i / nx) + rng()) * cell; A[i * 4 + 2] = rng(); A[i * 4 + 3] = rng(); }
  const lights = (o.lights ?? []).map((l) => ({ w: 26, a: 1, n: 26, ...l, pal: (l.pal ?? PAL.lamp).map(C) }));

  function draw(S, t, opt = {}) {
    const a = opt.a ?? 1;
    S.draw(under, { a, unlit: true });
    for (let i = 0; i < N; i++) {
      const q = i * 4, ph = A[q + 2], rnd = A[q + 3];
      const depth = (A[q + 1] - y) / h;
      const px = A[q] + Math.sin(t * 0.9 + ph * 6.28) * 16 * (0.4 + depth), py = A[q + 1] + Math.sin(t * 1.3 + ph * 9) * 2;
      const nz = fbm(px * 0.004 + t * 0.03, py * 0.012, 2);
      const tone = 0.22 + (nz - 0.5) * 1.0 + depth * 0.12 + (opt.lift ?? 0);
      const c = pal[Math.max(0, Math.min(pal.length - 1, Math.round(tone * (pal.length - 1) + (rnd - 0.5) * 1.6)))];
      S.stroke(px, py, Math.sin(ph * 30) * 0.07, len * (0.6 + rnd * 0.8) * (0.7 + depth * 0.5), wid * (0.7 + depth * 0.6), c, a * (0.55 + 0.45 * Math.sin(t * 1.1 + ph * 20)), 0.55, 0, rnd, true);
    }
    for (const l of lights) {
      const lx = l.x + (opt.dx ?? 0);
      for (let i = 0; i < l.n; i++) {
        const u = (i + 0.5) / l.n, hh = fract(Math.sin(i * 91.7 + l.x) * 4375.5);
        const py = y + 6 + u * (l.len ?? h * 0.85);
        const px = lx + Math.sin(t * 1.7 + i * 1.3 + l.x) * l.w * (0.25 + u * 1.1) * 0.5;
        S.stroke(px, py, 0, l.w * (1.1 + u * 1.6) * (0.7 + hh * 0.6), 6 + u * 5, l.pal[Math.min(l.pal.length - 1, Math.floor(hh * 2.2 + u * 2.2))],
          a * l.a * (1 - u * 0.65) * (0.55 + 0.45 * Math.sin(t * 2.3 + i * 2.2)), 0.7, 0, hh, true);
      }
    }
  }
  return { draw };
}
