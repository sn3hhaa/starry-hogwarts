// Living paint effects: everything here is emitted fresh each frame as
// individual strokes — flames, halos, magic, pigment smoke, lightning, rain.

import { C, clamp, fract, lerp, TAU } from '../engine/util.js';

const h = (i, k = 0) => fract(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);
const LAMP = ['#fff8d0', '#fdeb8c', '#fad648', '#f4b62a', '#e8961a'].map(C);
const FIRE = ['#fff4b8', '#fbe36e', '#f7cf3a', '#f0a01e', '#e0601e', '#b4321a'].map(C);
const GOLD = ['#fff4b8', '#fbe36e', '#f7cf3a', '#f0b21e', '#d9911c'].map(C);

export const put = (S, patch, x, y, s = 1, r = 0, o) => { S.push(x, y, r, s); S.draw(patch, o); S.pop(); };
export const putf = (S, patch, x, y, sx, sy, r = 0, o) => { S.push(x, y, r, sx, sy); S.draw(patch, o); S.pop(); };

/** Café-Terrace lamp halo: a bright core and rings of short dabs. */
export function glow(S, x, y, r, t, o = {}) {
  const pal = (o.pal ?? LAMP).map ? (o.pal ?? LAMP).map(C) : LAMP;
  const a = o.a ?? 1, rings = o.rings ?? 4, seed = o.seed ?? 0.2;
  const fl = 1 + 0.06 * Math.sin(t * 7 + seed * 50) + 0.04 * Math.sin(t * 13.3 + seed * 20);
  if (!o.noCore) for (let i = 0; i < 5; i++) S.stroke(x + (h(i, seed) - 0.5) * r * 0.12, y + (h(i, seed + 1) - 0.5) * r * 0.12, i * 1.3, r * 0.34, r * 0.2, pal[0], a, 0.9, 0, h(i, 3), true);
  for (let k = 1; k <= rings; k++) {
    const rad = r * (k / rings) * fl, cnt = Math.round(6 + k * 6 * (o.dense ?? 1));
    const col = pal[Math.min(pal.length - 1, k)];
    for (let i = 0; i < cnt; i++) {
      const an = (i / cnt) * TAU + k * 0.7 + seed * 9 + t * 0.12 * (k % 2 ? 1 : -1);
      const hh = h(i, k + seed * 10);
      S.stroke(x + Math.cos(an) * rad * (0.9 + hh * 0.2), y + Math.sin(an) * rad * (0.9 + hh * 0.2), an + (o.radial ? 0 : Math.PI / 2), r * 0.24, r * 0.085,
        col, a * (1 - (k - 1) / (rings + 0.6)) * (0.7 + 0.3 * hh), 0.7, 0, hh, true);
    }
  }
}

/** Flame made of rising, cooling dabs. */
export function flame(S, x, y, w, ht, t, o = {}) {
  const n = o.n ?? 30, pal = o.pal ? o.pal.map(C) : FIRE, a = o.a ?? 1, seed = o.seed ?? 0;
  for (let i = 0; i < n; i++) {
    const life = fract(t * (o.rate ?? 1.3) * (0.7 + h(i, seed) * 0.6) + h(i, seed + 1));
    const px = x + (h(i, seed + 2) - 0.5) * w * (1 - life * 0.75) + Math.sin(t * 6 + i) * w * 0.06 + (o.lean ?? 0) * life * ht;
    const py = y - life * ht * (0.6 + h(i, seed + 3) * 0.5);
    const c = pal[Math.min(pal.length - 1, Math.floor(life * pal.length * 0.95 + h(i, 5) * 0.8))];
    const sz = (1 - life * 0.65) * w * 0.34;
    S.stroke(px, py, -Math.PI / 2 + Math.sin(t * 4 + i * 1.7) * 0.4 + (o.lean ?? 0), sz * 1.9, sz * 0.62, c, a * Math.pow(1 - life, 0.6), 0.85, 0.15 * (h(i, 7) - 0.5), h(i, 9), true);
  }
}

/** Spiralling magic. o: { r, n, turns, dir, speed, pal, a, size, phase, inward } */
export function swirl(S, x, y, t, o = {}) {
  const n = o.n ?? 90, r = o.r ?? 200, pal = (o.pal ?? GOLD).map(C), a = o.a ?? 1, turns = o.turns ?? 1.6, dir = o.dir ?? 1;
  const sz = o.size ?? 1, arms = o.arms ?? 3;
  for (let i = 0; i < n; i++) {
    let u = fract(i / n + t * (o.speed ?? 0.35) + h(i, 1) * 0.05);
    if (o.inward) u = 1 - u;
    const arm = (i % arms) / arms * TAU;
    const ang = u * turns * TAU * dir + arm + (o.phase ?? 0) + (h(i, 2) - 0.5) * 0.35;
    const rad = r * Math.pow(u, 0.75) * (0.9 + h(i, 3) * 0.2);
    const fade = Math.sin(Math.PI * clamp(u));
    S.stroke(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad * (o.squash ?? 1), ang + dir * (Math.PI / 2 + 0.25), (14 + 22 * u) * sz * (0.7 + h(i, 4) * 0.6), (4 + 5 * u) * sz,
      pal[i % pal.length], a * fade, 0.85, 0.2 * dir, h(i, 5), true);
  }
}

/** Twinkling dabs scattered in a disc. */
export function sparkle(S, x, y, r, t, n = 20, pal = GOLD, a = 1, seed = 0) {
  const P = pal.map(C);
  for (let i = 0; i < n; i++) {
    const tw = Math.sin(t * (3 + h(i, seed) * 5) + i * 2.1);
    if (tw < 0) continue;
    const an = h(i, seed + 1) * TAU, rr = Math.sqrt(h(i, seed + 2)) * r;
    const px = x + Math.cos(an) * rr, py = y + Math.sin(an) * rr;
    const s = 5 + 9 * h(i, seed + 3);
    S.stroke(px, py, 0, s * 2 * tw, s * 0.4, P[i % P.length], a * tw, 0.8, 0, h(i, 4), true);
    S.stroke(px, py, Math.PI / 2, s * 2 * tw, s * 0.4, P[i % P.length], a * tw, 0.8, 0, h(i, 5), true);
  }
}

/** Billowing pigment smoke / steam. o: { n, r, rise, drift, spread, pal, a, rate, seed } */
export function smoke(S, x, y, t, o = {}) {
  const n = o.n ?? 14, pal = (o.pal ?? ['#b4d8ec', '#7db2e0', '#4a87d2', '#2a5fc0', '#1c429c']).map(C), a = o.a ?? 1, seed = o.seed ?? 0;
  const r = o.r ?? 60, per = o.per ?? 9;
  for (let i = 0; i < n; i++) {
    const life = fract(t * (o.rate ?? 0.3) * (0.7 + h(i, seed) * 0.6) + h(i, seed + 1));
    const cx = x + (o.drift ?? 0) * life + (h(i, seed + 2) - 0.5) * (o.spread ?? 60) * (0.3 + life);
    const cy = y - (o.rise ?? 200) * life;
    const rad = r * (0.35 + life * 0.95);
    const col = pal[Math.min(pal.length - 1, Math.floor(life * pal.length))];
    const fade = Math.sin(Math.PI * clamp(life * 0.98 + 0.02)) * a;
    const spin = t * 0.8 * (i % 2 ? 1 : -1) + i;
    for (let k = 0; k < per; k++) {
      const an = (k / per) * TAU + spin, rr = rad * Math.sqrt(h(i * 31 + k, seed)) * 0.95;
      S.stroke(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, an + Math.PI / 2 + (h(k, i) - 0.5) * 0.8, rad * 0.95, rad * 0.4, k % 3 === 0 ? pal[Math.max(0, Math.floor(life * pal.length) - 1)] : col, fade * (o.dense ?? 0.9), 0.75, 0.16, h(i * 17 + k, 3), true);
    }
  }
}

/** Jagged lightning bolt between two points. */
export function bolt(S, x0, y0, x1, y1, seed = 1, a = 1, w = 9, depth = 0) {
  const pts = [[x0, y0]];
  const segs = 9;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  for (let i = 1; i < segs; i++) {
    const u = i / segs, off = (h(i, seed) - 0.5) * len * 0.16;
    pts.push([x0 + dx * u - (dy / len) * off, y0 + dy * u + (dx / len) * off]);
  }
  pts.push([x1, y1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const an = Math.atan2(by - ay, bx - ax), l = Math.hypot(bx - ax, by - ay);
    S.stroke((ax + bx) / 2, (ay + by) / 2, an, l * 1.25, w * 2.4, '#b4d8ec', a * 0.55, 0.5, 0, h(i, seed + 1), true);
    S.stroke((ax + bx) / 2, (ay + by) / 2, an, l * 1.2, w, '#fffbe0', a, 0.9, 0, h(i, seed + 2), true);
    if (depth < 1 && i % 3 === 1) bolt(S, bx, by, bx + (h(i, seed + 4) - 0.3) * len * 0.4, by + len * 0.28, seed + i * 7, a * 0.7, w * 0.55, depth + 1);
  }
}

/** Slanting rain. */
export function rain(S, t, o = {}) {
  const n = o.n ?? 220, ang = o.angle ?? 1.25, sp = o.speed ?? 2.2, col = C(o.color ?? '#9cc4e0'), a = o.a ?? 0.5;
  for (let i = 0; i < n; i++) {
    const u = fract(h(i, 1) + t * sp * (0.8 + h(i, 2) * 0.4));
    const x = S.cam.x * S.par - 200 + h(i, 3) * 2500 - u * 380 * Math.cos(ang), y = S.cam.y * S.par - 100 + u * 1300;
    S.stroke(x, y, ang + Math.PI, 46 + h(i, 4) * 30, 2.6, col, a * (0.5 + 0.5 * h(i, 5)), 0.4, 0, h(i, 6), true);
  }
}

/** Fan of soft light shafts. */
export function rays(S, x, y, a0, a1, len, o = {}) {
  const n = o.n ?? 9, col = C(o.color ?? '#fbe36e'), a = o.a ?? 0.25, t = o.t ?? 0;
  const ps = S.soft; S.soft = 0.7;
  for (let i = 0; i < n; i++) {
    const an = lerp(a0, a1, (i + 0.5) / n) + Math.sin(t * 0.7 + i) * 0.02;
    for (let k = 0; k < 5; k++) {
      const d = len * (0.14 + k * 0.19);
      S.stroke(x + Math.cos(an) * d, y + Math.sin(an) * d, an, len * 0.3, (o.w ?? 26) * (0.6 + k * 0.28), col, a * (1 - k * 0.17) * (0.6 + 0.4 * h(i, k)), 0.2, 0, h(i, k + 2), true);
    }
  }
  S.soft = ps;
}

/** Drifting embers / fireflies / dust motes. */
export function motes(S, x, y, w, ht, t, o = {}) {
  const n = o.n ?? 40, pal = (o.pal ?? GOLD).map(C), a = o.a ?? 0.8, seed = o.seed ?? 0, sz = o.size ?? 1;
  for (let i = 0; i < n; i++) {
    const life = fract(t * (o.rate ?? 0.12) * (0.6 + h(i, seed)) + h(i, seed + 1));
    const px = x + h(i, seed + 2) * w + Math.sin(t * (0.8 + h(i, 6)) + i) * 22;
    const py = y + ht - life * ht * (o.fall ? -1 : 1) - (o.fall ? ht : 0);
    S.stroke(px, py, t * 0.6 + i, 9 * sz, 4 * sz, pal[i % pal.length], a * Math.sin(Math.PI * life), 0.7, 0, h(i, 7), true);
  }
}

/** A ribbon of strokes along a moving path: f(u) → [x, y]; used for wand trails and unwinding cloth. */
export function ribbon(S, f, n, o = {}) {
  const pal = (o.pal ?? GOLD).map(C), a = o.a ?? 1, w = o.w ?? 8;
  let p = f(0);
  for (let i = 1; i <= n; i++) {
    const u = i / n, q = f(u);
    const an = Math.atan2(q[1] - p[1], q[0] - p[0]), l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    S.stroke((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, an, l * 1.5 + 4, w * (o.taper ? 1 - u * 0.7 : 1) * (0.8 + 0.4 * h(i, 1)), pal[i % pal.length], a * (o.fade ? 1 - u : 1), 0.8, 0, h(i, 2), !o.lit);
    p = q;
  }
}

export { h as hash };
