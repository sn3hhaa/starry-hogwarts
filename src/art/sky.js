// Living skies. A sky is a flow field (wind + vortices + star eddies); thousands
// of dashes ride the field, fading in and out, so the heavens move the way
// The Starry Night looks like it wants to.

import { RNG, fbm, noise2 } from '../engine/rng.js';
import { fill } from '../engine/patch.js';
import { rect } from '../engine/geom.js';
import { C, clamp, fract, TAU } from '../engine/util.js';
import { PAL } from './palette.js';

/**
 * o: { x, y, w, h, seed, pal (dark→light), glow (palette for bright cores), accent,
 *      wind (angle), vortices:[{x,y,r,spin,k}], stars:[{x,y,r,seed?}], moon:{x,y,r,phase},
 *      len, wid, density, speed, base (0..1 overall brightness), contrast }
 */
export function makeSky(o) {
  const rng = RNG(o.seed ?? 5);
  const X = o.x ?? -200, Y = o.y ?? -100, W = o.w ?? 2320, H = o.h ?? 900;
  const pal = (o.pal ?? PAL.night).map(C);
  const glow = (o.glow ?? ['#fbe36e', '#fff4b8', '#cfe6ea']).map(C);
  const accent = (o.accent ?? ['#1c6450', '#2c2058', '#2c8468']).map(C);
  const len = o.len ?? 46, wid = o.wid ?? 11;
  const vort = o.vortices ?? [];
  const stars = (o.stars ?? []).map((s, i) => ({ seed: i * 0.37 + 0.11, ...s }));
  const wind = o.wind ?? -0.12;
  const base = o.base ?? 0.3, contrast = o.contrast ?? 0.5;
  const wx = Math.cos(wind), wy = Math.sin(wind);

  // field → [vx, vy, lightness boost]
  const field = (x, y, t, out) => {
    let vx = wx, vy = wy + Math.sin(x * 0.0042 + y * 0.0027 + t * 0.25) * 0.42 + Math.sin(x * 0.0011 - t * 0.13) * 0.25;
    let lite = 0;
    for (let i = 0; i < vort.length; i++) {
      const v = vort[i], dx = x - v.x, dy = y - v.y;
      const r = Math.hypot(dx, dy) + 1e-3;
      const f = Math.exp(-(r * r) / (v.r * v.r)) * (v.k ?? 3.2);
      vx += f * (-dy / r * v.spin - dx / r * 0.22);
      vy += f * (dx / r * v.spin - dy / r * 0.22);
      // rotating spiral arms of light
      const arm = 0.5 + 0.5 * Math.sin(Math.log(r + 20) * 5.2 - Math.atan2(dy, dx) * v.spin * 2 + t * 0.9 * v.spin + i);
      lite += Math.min(1, f * 0.42) * (0.25 + 0.75 * arm) * (v.lite ?? 1);
    }
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i], dx = x - s.x, dy = y - s.y;
      const r2 = dx * dx + dy * dy, rr = s.r * 2.6;
      if (r2 > rr * rr * 6) continue;
      const r = Math.sqrt(r2) + 1e-3;
      const f = Math.exp(-r2 / (rr * rr));
      vx += f * 2.6 * (-dy / r); vy += f * 2.6 * (dx / r);
      lite += f * 0.55;
    }
    out[0] = vx; out[1] = vy; out[2] = lite;
  };

  const tmp = [0, 0, 0];
  const under = fill(rect(X, Y, W, H), {
    pal: pal.slice(0, Math.max(2, Math.ceil(pal.length * 0.55))), len: len * 1.5, wid: wid * 2.2, density: 1.7, under: false, hug: false,
    flow: (x, y) => { field(x, y, 0, tmp); return Math.atan2(tmp[1], tmp[0]); }, seed: (o.seed ?? 5) + 1, thick: 0.35, jit: 0.25,
  });

  // dash anchors
  const cell = Math.sqrt((len * wid * 0.62) / (o.density ?? 2.0));
  const nx = Math.ceil(W / cell), ny = Math.ceil(H / cell);
  const N = nx * ny;
  const A = new Float32Array(N * 6); // x, y, phase, rnd, lenMul, seed
  let k = 0;
  const order = [];
  for (let i = 0; i < N; i++) order.push(i);
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
  for (const id of order) {
    const i = id % nx, j = (id - i) / nx;
    A[k++] = X + (i + rng()) * cell; A[k++] = Y + (j + rng()) * cell;
    A[k++] = rng(); A[k++] = rng(); A[k++] = 0.7 + rng() * 0.6; A[k++] = rng();
  }

  const speed = o.speed ?? 1;
  const n = pal.length;

  function draw(S, t, opt = {}) {
    const a = opt.a ?? 1;
    const lift = opt.lift ?? 0;         // global brightening (lightning, dawn)
    S.draw(under, { a, unlit: true, mul: opt.mul });
    const rate = 0.11 * speed;
    for (let i = 0; i < N; i++) {
      const q = i * 6;
      const life = fract(t * rate * (0.7 + A[q + 3] * 0.6) + A[q + 2]);
      let x = A[q], y = A[q + 1];
      field(x, y, t, tmp);
      const mag = clamp(Math.hypot(tmp[0], tmp[1]), 0.5, 3.2);
      const D = (life - 0.5) * 150 * mag;
      // two Euler steps along the flow
      let inv = 1 / (Math.hypot(tmp[0], tmp[1]) || 1);
      x += tmp[0] * inv * D * 0.5; y += tmp[1] * inv * D * 0.5;
      field(x, y, t, tmp);
      inv = 1 / (Math.hypot(tmp[0], tmp[1]) || 1);
      x += tmp[0] * inv * D * 0.5; y += tmp[1] * inv * D * 0.5;
      field(x, y, t, tmp);
      const ang = Math.atan2(tmp[1], tmp[0]);
      const fade = Math.sin(Math.PI * life);
      const nz = fbm(x * 0.0026 + 3.1, y * 0.0042 + t * 0.02, 2);
      let tone = base + (nz - 0.5) * contrast * 1.6 + tmp[2] * 0.62 + lift;
      const rnd = A[q + 3];
      let c;
      if (tone > 0.93 + rnd * 0.25) c = glow[(rnd * 97 | 0) % glow.length];
      else if (rnd > 0.972) c = accent[(rnd * 131 | 0) % accent.length];
      else c = pal[Math.max(0, Math.min(n - 1, Math.round(clamp(tone) * (n - 1) + (A[q + 5] - 0.5) * 1.5)))];
      const cv = Math.min(0.5, tmp[2] * 0.35) * (A[q + 5] > 0.5 ? 1 : -1) * 0.25;
      S.stroke(x, y, ang, len * A[q + 4] * (0.8 + 0.25 * mag), wid * (0.8 + A[q + 5] * 0.5), opt.mul ? [c[0] * opt.mul[0], c[1] * opt.mul[1], c[2] * opt.mul[2]] : c,
        a * Math.pow(fade, 0.55), 0.62, cv, A[q + 5], true);
    }
    if (!opt.noStars) for (const s of stars) star(S, s.x, s.y, s.r, t, s.seed, a * (s.a ?? 1), s.pal);
    if (o.moon && !opt.noMoon) moon(S, o.moon, t, a);
  }

  return { draw, field, stars, X, Y, W, H };
}

const STAR_PAL = [['#fffbe0', '#fff4b8'], ['#fbe36e', '#f7cf3a'], ['#f0b21e', '#f7cf3a', '#c6cf74'], ['#cfe6ea', '#7db2e0', '#f7cf3a'], ['#7db2e0', '#4a87d2']];

/** A Starry-Night star: a bright core wrapped in rotating rings of dashes. */
export function star(S, x, y, r, t, seed = 0.3, a = 1, pal = STAR_PAL, rings = 4) {
  const tw = 1 + 0.07 * Math.sin(t * 2.3 + seed * 40);
  // core
  const core = pal[0].map(C);
  for (let i = 0; i < 7; i++) {
    const an = i * 2.4 + seed * 9, rr = (i === 0 ? 0 : r * 0.2);
    S.stroke(x + Math.cos(an) * rr, y + Math.sin(an) * rr, an + 1.2, r * 0.62, r * 0.36, core[i % core.length], a, 0.95, 0, fract(seed + i * 0.13), true);
  }
  for (let k = 1; k <= rings; k++) {
    const rad = r * (0.42 + 0.44 * k) * tw;
    const cnt = Math.round(7 + k * 5.5);
    const cols = pal[Math.min(pal.length - 1, k)].map(C);
    const rot = t * 0.22 * (k % 2 ? 1 : -1) + seed * 7 + k;
    for (let i = 0; i < cnt; i++) {
      const an = (i / cnt) * TAU + rot;
      const h = fract(Math.sin(i * 12.9898 + k * 78.233 + seed * 43.7) * 43758.5453);
      const rr = rad * (0.93 + h * 0.14);
      S.stroke(x + Math.cos(an) * rr, y + Math.sin(an) * rr, an + Math.PI / 2, r * (0.44 + 0.12 * h) * (1 + k * 0.06), r * (0.2 - k * 0.018),
        cols[(i + (h * 3 | 0)) % cols.length], a * (1 - (k - 1) * 0.17) * (0.75 + 0.25 * Math.sin(t * 1.7 + i + k)), 0.8, 0.12, h, true);
    }
  }
}

/** Crescent moon inside a burning halo. */
export function moon(S, m, t, a = 1) {
  const { x, y, r } = m;
  star(S, x, y, r * 0.95, t, 0.77, a, [['#f7cf3a', '#fbe36e'], ['#f7cf3a', '#f0b21e'], ['#fbe36e', '#c6cf74'], ['#cfe6ea', '#f7cf3a'], ['#7db2e0']], 4);
  // crescent: orange arc strokes
  const cols = ['#f0a01e', '#f7cf3a', '#e8861a'].map(C);
  for (let i = 0; i < 16; i++) {
    const an = -2.2 + (i / 15) * 3.4 + (m.phase ?? 0);
    const rr = r * 0.46;
    S.stroke(x + Math.cos(an) * rr, y + Math.sin(an) * rr, an + Math.PI / 2, r * 0.42, r * (0.14 + 0.2 * Math.sin((i / 15) * Math.PI)), cols[i % 3], a, 1, 0.14, i * 0.061, true);
  }
}

export { noise2 };
