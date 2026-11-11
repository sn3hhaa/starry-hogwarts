// The cast. Each character is a spec for the shared figure rig plus their own
// painted dressing (hair, beard, hat, glasses…). Builders are cached, so the
// same strokes play the same character in every shot.

import { makeFigure, tufts } from './figure.js';
import { paint, strokes } from '../engine/patch.js';
import { ellipse, soft, rect } from '../engine/geom.js';
import { RNG } from '../engine/rng.js';
import { clamp } from '../engine/util.js';
import { PAL, INK } from './palette.js';

const cache = new Map();
const memo = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };

const hairWarp = (amp) => (x, y, t, sway) => [x + (Math.sin(t * 2.1 + y * 0.05) * 1.2 + sway * 3) * amp * clamp(y / 40 + 0.3, 0, 2), y];
const ring = (cx, cy, r, P, pal = INK, w = 0.55) => ({ line: ellipse(cx, cy, r, r, 14), closed: true, len: P.L * 0.5, wid: P.ow * w, pal, wob: 0.2, jit: 0.03 });

/** hair mass: filled cap + loose tufts */
function hair(P, shape, pal, o = {}) {
  return paint([
    { shape, pal, flow: o.flow ?? { radial: [0, -P.ry * 0.2] }, len: P.L * (o.len ?? 1.1), wid: P.Wd * (o.wid ?? 0.9), density: 3, thick: 0.85, hug: o.hug ?? true, jit: o.jit ?? 0.3, curve: o.curve ?? 0.08, spread: 0.3, tone: o.tone },
    o.tufts ? strokes(o.tufts, P.seed + 5) : null,
  ], P.seed * 3 + (o.s ?? 0));
}

const SCARF = (P, a, b) => {
  const band = soft([[-P.sw * 0.62, -P.T - 9], [P.sw * 0.62, -P.T - 9], [P.sw * 0.7, -P.T + 6], [-P.sw * 0.7, -P.T + 6]], 1);
  const tail = soft([[P.sw * 0.1, -P.T + 2], [P.sw * 0.5, -P.T + 2], [P.sw * 0.56, -P.T + 44], [P.sw * 0.14, -P.T + 46]], 1);
  const stripes = (x, y) => (Math.floor((y + x * 0.4) / (7 * P.u)) % 2 ? a : b);
  return paint([
    { shape: tail, pal: (x, y) => stripes(x, y), flow: 0.1, len: P.L * 0.8, wid: P.Wd * 0.9, density: 3, under: false },
    { shape: band, pal: (x, y) => stripes(y * 2, x), flow: 1.5, len: P.L * 0.7, wid: P.Wd * 0.9, density: 3, under: false },
    { outline: band, wid: P.ow * 0.7, len: P.L * 0.7 },
  ], P.seed + 40);
};
const TIE = (P, a, b) => paint([
  { shape: [[-5 * P.u, -P.T - 2], [5 * P.u, -P.T - 2], [4 * P.u, -P.T + 30], [0, -P.T + 36], [-4 * P.u, -P.T + 30]], pal: (x, y) => (Math.floor(y / (6 * P.u)) % 2 ? a : b), flow: 1.57, len: P.L * 0.6, wid: P.Wd * 0.8, density: 3, under: false },
  { line: [[-P.sw * 0.45, -P.T - 4], [0, -P.T + 8], [P.sw * 0.45, -P.T - 4]], pal: ['#dcdfd6', '#f0ecd8'], len: P.L * 0.7, wid: P.Wd * 0.9 },
], P.seed + 41);

// ---------------------------------------------------------------------------

export function harry(costume = 'robe', detail = 1) {
  return memo(`harry-${costume}-${detail}`, () => makeFigure({
    name: 'Harry', seed: 11, detail, H: 300,
    ...(costume === 'rags'
      ? { cloth: ['#3a4250', '#4e5866', '#66727e', '#84909a'], sleeve: ['#3a4250', '#4e5866', '#66727e', '#84909a'], trouser: PAL.earth.slice(0, 4), robe: { len: 0.2, hem: 40 }, torso: { len: 92, sw: 36, ww: 34 } }
      : { cloth: PAL.black, trouser: PAL.black }),
    skin: PAL.skin,
    face: { eye: '#2c8468', brow: '#10121e', eyeSize: 1.12, mouth0: 0.05 },
    extras: (P) => {
      const r = RNG(111), { rx, ry } = P, hp = PAL.hairBlack;
      const capS = soft([[-rx * 1.12, ry * 0.1], [-rx * 1.15, -ry * 0.6], [-rx * 0.6, -ry * 1.22], [rx * 0.5, -ry * 1.25], [rx * 1.14, -ry * 0.62], [rx * 1.12, ry * 0.1], [rx * 0.8, -ry * 0.2], [-rx * 0.8, -ry * 0.2]], 2);
      const fringe = soft([[-rx * 0.95, -ry * 0.5], [-rx * 0.6, -ry * 1.05], [rx * 0.6, -ry * 1.05], [rx * 0.95, -ry * 0.5], [rx * 0.55, -ry * 0.42], [rx * 0.2, -ry * 0.58], [-rx * 0.1, -ry * 0.4], [-rx * 0.5, -ry * 0.55]], 1);
      const over = ellipse(0, -ry * 0.1, rx * 1.12, ry * 1.12, 20);
      const ex = [
        { slot: 'hairBack', patch: hair(P, capS, hp, { tufts: tufts(0, -ry * 0.35, rx * 1.1, ry * 0.95, Math.PI * 0.95, Math.PI * 2.05, 26, P.L * 1.2, P.Wd * 0.9, hp, r, 0, 0.3) }) },
        { slot: 'head', follow: 0.3, patch: hair(P, fringe, hp, { flow: 1.2, tufts: tufts(0, -ry * 0.62, rx * 0.8, ry * 0.2, 0.2, Math.PI - 0.2, 9, P.L * 0.8, P.Wd * 0.7, hp, r, 0.6), s: 2 }) },
        { slot: 'head', follow: 0.75, patch: strokes([[rx * 0.3, -ry * 0.5, 1.1, P.L * 0.5, P.Wd * 0.45, '#e05a34'], [rx * 0.27, -ry * 0.4, 2.2, P.L * 0.45, P.Wd * 0.45, '#f0b21e'], [rx * 0.3, -ry * 0.3, 1.1, P.L * 0.45, P.Wd * 0.4, '#e05a34']], 5) },
        { slot: 'head', follow: 1, patch: paint([ring(-rx * 0.4, -ry * 0.04, rx * 0.31, P), ring(rx * 0.4, -ry * 0.04, rx * 0.31, P), { line: [[-rx * 0.1, -ry * 0.06], [rx * 0.1, -ry * 0.06]], len: P.L * 0.4, wid: P.ow * 0.5 }], 12) },
        { slot: 'hairOver', patch: hair(P, over, hp, { flow: 1.57, tufts: tufts(0, -ry * 0.2, rx * 1.1, ry * 1.1, Math.PI * 0.9, Math.PI * 2.1, 22, P.L * 1.1, P.Wd * 0.9, hp, r, 0, 0.3), s: 3 }) },
      ];
      if (costume !== 'rags') ex.push({ slot: 'body', patch: SCARF(P, '#a3281c', '#f0b21e') });
      return ex;
    },
  }));
}

export function ron(costume = 'robe', detail = 1) {
  return memo(`ron-${costume}-${detail}`, () => makeFigure({
    name: 'Ron', seed: 23, detail, H: 322, leg: { len: 120, r: 12, gap: 13 }, torso: { len: 96, sw: 33, ww: 26 }, head: { rx: 29, ry: 38 }, arm: { upper: 50, lower: 46, r: 10 },
    ...(costume === 'jumper' ? { cloth: PAL.crimson, sleeve: PAL.crimson, trouser: PAL.drab.slice(0, 4), robe: { len: 0.12, hem: 34 } } : { cloth: PAL.black, trouser: PAL.black }),
    skin: PAL.skinRuddy.slice(1).concat(['#f8dcb8']),
    face: { eye: '#2a5fc0', brow: '#a84410', nose: 1.25, freckles: true, mouthW: 1.1, mouth0: 0.2 },
    extras: (P) => {
      const r = RNG(222), { rx, ry } = P, hp = PAL.hairRed;
      const capS = soft([[-rx * 1.1, ry * 0.25], [-rx * 1.14, -ry * 0.6], [-rx * 0.55, -ry * 1.2], [rx * 0.55, -ry * 1.2], [rx * 1.14, -ry * 0.6], [rx * 1.1, ry * 0.25], [rx * 0.82, -ry * 0.1], [-rx * 0.82, -ry * 0.1]], 2);
      const fringe = soft([[-rx * 0.98, -ry * 0.35], [-rx * 0.7, -ry * 1.04], [rx * 0.7, -ry * 1.04], [rx * 0.98, -ry * 0.4], [rx * 0.3, -ry * 0.5], [-rx * 0.4, -ry * 0.38]], 1);
      const ex = [
        { slot: 'hairBack', patch: hair(P, capS, hp, { tufts: tufts(0, -ry * 0.3, rx * 1.08, ry * 0.92, Math.PI, Math.PI * 2, 16, P.L, P.Wd * 0.9, hp, r, 0.5, 0.2) }) },
        { slot: 'head', follow: 0.3, patch: hair(P, fringe, hp, { flow: 0.5, curve: 0.2, s: 2 }) },
        { slot: 'hairOver', patch: hair(P, ellipse(0, -ry * 0.12, rx * 1.1, ry * 1.08, 20), hp, { flow: 1.4, s: 3 }) },
      ];
      if (costume !== 'jumper') ex.push({ slot: 'body', patch: SCARF(P, '#a3281c', '#f0b21e') });
      else ex.push({ slot: 'body', patch: strokes([[0, -P.T + 30, 0.9, P.L * 1.6, P.Wd, '#f0b21e'], [6, -P.T + 30, -0.9 + Math.PI, P.L * 1.6, P.Wd, '#f0b21e'], [3, -P.T + 42, 0, P.L, P.Wd * 0.8, '#f0b21e']], 6) });
      return ex;
    },
  }));
}

export function hermione(detail = 1) {
  return memo(`hermione-${detail}`, () => makeFigure({
    name: 'Hermione', seed: 37, detail, H: 296, head: { rx: 29, ry: 35 }, torso: { len: 88, sw: 30, ww: 24 }, leg: { len: 106, r: 10.5, gap: 11 },
    cloth: PAL.black, trouser: ['#2a3050', '#3e4668', '#5a6282'], robe: { len: 0.62, hem: 50 },
    skin: PAL.skin.slice(1).concat(['#f8e0b8']),
    face: { eye: '#634026', brow: '#4a2c16', eyeSize: 1.15, mouth0: 0.25, browLen: 1.05 },
    extras: (P) => {
      const r = RNG(333), { rx, ry } = P, hp = PAL.hairBrown;
      const mane = soft([[-rx * 1.75, ry * 0.9], [-rx * 1.85, -ry * 0.2], [-rx * 1.3, -ry * 1.2], [0, -ry * 1.45], [rx * 1.3, -ry * 1.2], [rx * 1.85, -ry * 0.2], [rx * 1.75, ry * 0.9], [rx * 1.2, ry * 1.75], [rx * 0.7, ry * 1.0], [-rx * 0.7, ry * 1.0], [-rx * 1.2, ry * 1.75]], 2);
      const fringe = soft([[-rx, -ry * 0.3], [-rx * 0.75, -ry * 1.05], [rx * 0.75, -ry * 1.05], [rx, -ry * 0.3], [rx * 0.6, -ry * 0.62], [0, -ry * 0.72], [-rx * 0.6, -ry * 0.62]], 1);
      const curl = { ring: [0, ry * 0.1] };
      return [
        { slot: 'hairBack', warp: hairWarp(1), patch: hair(P, mane, hp, { flow: (x, y) => Math.atan2(y, x) + 1.57 + Math.sin(x * 0.2 + y * 0.17) * 0.9, curve: 0.35, len: 1.0, hug: false, tufts: tufts(0, ry * 0.1, rx * 1.8, ry * 1.5, Math.PI * 0.75, Math.PI * 2.25, 34, P.L * 1.1, P.Wd, hp, r, 1.2, 0.5) }) },
        { slot: 'head', follow: 0.3, patch: hair(P, fringe, hp, { flow: 0.3, curve: 0.3, s: 2 }) },
        { slot: 'hairOver', warp: hairWarp(1), patch: hair(P, soft([[-rx * 1.7, ry * 1.4], [-rx * 1.8, -ry * 0.3], [0, -ry * 1.45], [rx * 1.8, -ry * 0.3], [rx * 1.7, ry * 1.4], [0, ry * 1.9]], 2), hp, { flow: curl, curve: 0.35, hug: false, s: 3 }) },
        { slot: 'body', patch: TIE(P, '#a3281c', '#f0b21e') },
      ];
    },
  }));
}

export function draco(detail = 1) {
  return memo(`draco-${detail}`, () => makeFigure({
    name: 'Draco', seed: 41, detail, H: 304, head: { rx: 28, ry: 37 }, torso: { len: 92, sw: 32, ww: 25 },
    cloth: PAL.black, trouser: PAL.black, skin: PAL.skinPale.slice(1).concat(['#fbf6e8']),
    headShape: (rx, ry) => soft([[-rx * 0.86, -ry * 0.6], [-rx * 0.5, -ry], [rx * 0.5, -ry], [rx * 0.86, -ry * 0.6], [rx * 0.9, 0], [rx * 0.55, ry * 0.62], [rx * 0.12, ry * 1.04], [-rx * 0.12, ry * 1.04], [-rx * 0.55, ry * 0.62], [-rx * 0.9, 0]], 2),
    face: { eye: '#7a9498', brow: '#a89048', brow0: -0.45, mouth0: -0.05, blush: false, eyeSize: 0.95, nose: 1.1 },
    faceExtra: (S, p, f) => S.stroke(f.fx + f.rx * 0.3, f.ry * 0.47, -0.5, f.rx * 0.3, f.es * 0.4, '#9a4a3a', 1, 0.4, 0, 0.4), // the smirk
    extras: (P) => {
      const { rx, ry } = P, hp = PAL.hairBlond;
      const slick = soft([[-rx * 1.0, -ry * 0.2], [-rx * 1.02, -ry * 0.7], [-rx * 0.5, -ry * 1.14], [rx * 0.5, -ry * 1.14], [rx * 1.02, -ry * 0.7], [rx * 1.0, -ry * 0.2], [rx * 0.8, -ry * 0.55], [0, -ry * 0.72], [-rx * 0.8, -ry * 0.55]], 2);
      return [
        { slot: 'head', follow: 0.2, patch: hair(P, slick, hp, { flow: (x) => -1.57 + x * 0.02, jit: 0.08, tone: (x, y) => clamp(0.6 - x / (rx * 3)) }) },
        { slot: 'hairOver', patch: hair(P, ellipse(0, -ry * 0.2, rx * 1.03, ry * 0.98, 18), hp, { flow: 1.57, jit: 0.08, s: 3 }) },
        { slot: 'body', patch: TIE(P, '#12453a', '#b6c0cc') },
      ];
    },
  }));
}

export function hagrid(detail = 1) {
  return memo(`hagrid-${detail}`, () => makeFigure({
    name: 'Hagrid', seed: 53, detail, H: 640, head: { rx: 52, ry: 54 }, neck: 0,
    torso: { len: 205, sw: 108, ww: 104 }, arm: { upper: 104, lower: 92, r: 31 }, leg: { len: 235, r: 36, gap: 44 }, robe: { len: 0.56, hem: 132 }, hand: 27,
    cloth: ['#2a1c12', '#44291a', '#5c3a22', '#7a5230', '#96703e'], trouser: ['#1a140e', '#2a1c12', '#44291a'], shoe: ['#120c08', '#2a1a10'],
    skin: PAL.skinRuddy, sway: 0.5,
    face: { eye: '#10121e', brow: '#10121e', eyeSize: 0.9, browW: 1.5, browLen: 1.2, mouth0: 0.3, eyeY: -0.02, nose: 1.1, noseW: 1.5 },
    bodyDetail: ({ T, sw, robeL, L, Wd }) => [
      { line: [[4, -T + 30], [-2, 0], [6, robeL - 10]], pal: ['#1a140e', '#2a1c12'], len: L * 1.4, wid: Wd * 1.1 },
      strokes([[-18, -T + 70, 0, L * 0.7, Wd * 1.6, '#c8a060'], [-16, -T + 120, 0, L * 0.7, Wd * 1.6, '#c8a060'], [-14, -T + 170, 0, L * 0.7, Wd * 1.6, '#c8a060']], 3),
      { shape: rect(-sw * 0.8, -20, sw * 1.6, 16), pal: ['#1a140e', '#2a1c12', '#44291a'], flow: 0, len: L, wid: Wd, under: false },
    ],
    extras: (P) => {
      const r = RNG(555), { rx, ry } = P, hp = ['#0a0a10', '#14121a', '#221c20', '#3a2c26', '#4a3a30'];
      const mane = soft([[-rx * 2.2, ry * 1.5], [-rx * 2.35, -ry * 0.3], [-rx * 1.5, -ry * 1.55], [0, -ry * 1.8], [rx * 1.5, -ry * 1.55], [rx * 2.35, -ry * 0.3], [rx * 2.2, ry * 1.5], [rx * 1.2, ry * 2.5], [-rx * 1.2, ry * 2.5]], 2);
      const beard = soft([[-rx * 1.25, ry * 0.1], [-rx * 0.7, ry * 0.5], [0, ry * 0.46], [rx * 0.7, ry * 0.5], [rx * 1.25, ry * 0.1], [rx * 1.6, ry * 1.3], [rx * 0.8, ry * 2.9], [0, ry * 3.3], [-rx * 0.8, ry * 2.9], [-rx * 1.6, ry * 1.3]], 2);
      const brow = soft([[-rx * 1.2, -ry * 0.25], [-rx * 0.9, -ry * 1.1], [rx * 0.9, -ry * 1.1], [rx * 1.2, -ry * 0.25], [rx * 0.7, -ry * 0.66], [0, -ry * 0.74], [-rx * 0.7, -ry * 0.66]], 1);
      const wavy = (x, y) => 1.57 + Math.sin(x * 0.07 + y * 0.05) * 0.8;
      return [
        { slot: 'hairBack', warp: hairWarp(1.5), patch: hair(P, mane, hp, { flow: wavy, curve: 0.4, hug: false, len: 1.2, tufts: tufts(0, ry * 0.3, rx * 2.3, ry * 2.0, Math.PI * 0.8, Math.PI * 2.2, 46, P.L * 1.4, P.Wd * 1.1, hp, r, 1.3, 0.6) }) },
        { slot: 'head', follow: 0.5, warp: hairWarp(1.2), patch: hair(P, beard, hp, { flow: wavy, curve: 0.4, hug: false, len: 1.2, s: 2, tufts: tufts(0, ry * 1.6, rx * 1.5, ry * 1.7, 0.1, Math.PI - 0.1, 30, P.L * 1.4, P.Wd * 1.1, hp, r, 0, 0.6) }) },
        { slot: 'head', follow: 0.2, patch: hair(P, brow, hp, { flow: wavy, curve: 0.3, hug: false, s: 4 }) },
        { slot: 'hairOver', warp: hairWarp(1.5), patch: hair(P, ellipse(0, ry * 0.4, rx * 2.2, ry * 2.1, 22), hp, { flow: wavy, curve: 0.4, hug: false, s: 3 }) },
      ];
    },
  }));
}

export function dumbledore(detail = 1) {
  return memo(`dumbledore-${detail}`, () => makeFigure({
    name: 'Dumbledore', seed: 67, detail, H: 440, head: { rx: 29, ry: 39 }, torso: { len: 138, sw: 40, ww: 31 }, arm: { upper: 70, lower: 64, r: 13.5 }, leg: { len: 200 }, legs: false, robe: { len: 1, hem: 66 },
    cloth: ['#1c1440', '#2c2058', '#44307c', '#6248a0', '#8468be'], skin: PAL.skinPale.slice(1).concat(['#f8f0d8']),
    face: { eye: '#4a87d2', brow: '#d8dee0', eyeSize: 0.9, mouth0: 0.3, nose: 1.3, hook: 0.12, browW: 1.2, lip: '#b08a80' },
    bodyDetail: ({ T, robeL, L, Wd }) => {
      const r = RNG(671), out = [];
      for (let i = 0; i < 26; i++) out.push([(r() - 0.5) * 90, -T + 20 + r() * (T + robeL - 30), r() * 3, L * 0.45, Wd * 0.7, r() > 0.5 ? '#f7cf3a' : '#fbe36e', 0.95, 0.9]);
      return [strokes(out, 9), { line: [[0, -T + 10], [0, robeL - 6]], pal: ['#f0b21e', '#b8741a'], len: L, wid: Wd * 0.7, wob: 1.5 }];
    },
    extras: (P) => {
      const r = RNG(672), { rx, ry } = P, hp = PAL.silver;
      const back = soft([[-rx * 1.2, -ry * 0.7], [-rx * 0.6, -ry * 1.1], [rx * 0.6, -ry * 1.1], [rx * 1.2, -ry * 0.7], [rx * 1.5, ry * 1.6], [rx * 1.1, ry * 3.2], [-rx * 1.1, ry * 3.2], [-rx * 1.5, ry * 1.6]], 2);
      const beard = soft([[-rx * 0.9, ry * 0.2], [-rx * 0.4, ry * 0.42], [0, ry * 0.36], [rx * 0.4, ry * 0.42], [rx * 0.9, ry * 0.2], [rx * 0.95, ry * 1.5], [rx * 0.45, ry * 3.6], [0, ry * 4.3], [-rx * 0.45, ry * 3.6], [-rx * 0.95, ry * 1.5]], 2);
      const hat = soft([[-rx * 1.1, -ry * 0.62], [-rx * 0.75, -ry * 1.3], [-rx * 0.2, -ry * 2.5], [rx * 0.5, -ry * 3.1], [rx * 1.0, -ry * 2.9], [rx * 0.6, -ry * 2.3], [rx * 0.8, -ry * 1.3], [rx * 1.1, -ry * 0.62], [0, -ry * 0.8]], 2);
      const wavy = (x, y) => 1.57 + Math.sin(y * 0.06 + x * 0.1) * 0.35;
      return [
        { slot: 'hairBack', warp: hairWarp(1), patch: hair(P, back, hp, { flow: wavy, curve: 0.2 }) },
        { slot: 'head', follow: 0.5, warp: hairWarp(1.3), patch: hair(P, beard, hp, { flow: wavy, curve: 0.25, s: 2, tone: (x, y) => clamp(0.75 - x / (rx * 3)), tufts: tufts(0, ry * 3.4, rx * 0.5, ry * 0.9, 0.5, Math.PI - 0.5, 8, P.L * 1.2, P.Wd, hp, r, 0, 0.4) }) },
        { slot: 'head', follow: 1, patch: paint([{ line: ellipse(-rx * 0.4, ry * 0.06, rx * 0.27, rx * 0.2, 12).slice(0, 7), len: P.L * 0.45, wid: P.ow * 0.5, pal: ['#f0b21e', '#fbe36e'] }, { line: ellipse(rx * 0.4, ry * 0.06, rx * 0.27, rx * 0.2, 12).slice(0, 7), len: P.L * 0.45, wid: P.ow * 0.5, pal: ['#f0b21e', '#fbe36e'] }], 14) },
        { slot: 'head', follow: 0.1, backToo: true, patch: paint([{ shape: hat, pal: ['#2c1640', '#44246a', '#62388e', '#8458b0'], tone: (x, y) => clamp(0.6 - x / (rx * 3)), flow: (x, y) => -1.2 + x * 0.01, len: P.L * 1.1, wid: P.Wd, density: 2.8 }, { outline: hat, wid: P.ow, len: P.L }, strokes([[-rx * 0.1, -ry * 1.6, 1, P.L * 0.5, P.Wd * 0.7, '#f7cf3a'], [rx * 0.35, -ry * 2.4, 2, P.L * 0.5, P.Wd * 0.7, '#fbe36e'], [rx * 0.3, -ry * 1.2, 0.3, P.L * 0.5, P.Wd * 0.7, '#f7cf3a']], 4)], 15) },
        { slot: 'hairOver', patch: hair(P, soft([[-rx * 1.2, -ry * 0.9], [rx * 1.2, -ry * 0.9], [rx * 1.5, ry * 1.6], [rx * 1.1, ry * 3.2], [-rx * 1.1, ry * 3.2], [-rx * 1.5, ry * 1.6]], 2), hp, { flow: wavy, s: 3 }) },
      ];
    },
  }));
}

export function mcgonagall(detail = 1) {
  return memo(`mcgonagall-${detail}`, () => makeFigure({
    name: 'McGonagall', seed: 71, detail, H: 415, head: { rx: 27, ry: 37 }, neck: 12, torso: { len: 128, sw: 36, ww: 27 }, arm: { upper: 66, lower: 60, r: 12 }, leg: { len: 190 }, legs: false, robe: { len: 1, hem: 58 },
    cloth: PAL.emerald, skin: PAL.skinPale.slice(1).concat(['#f8f0d8']),
    face: { eye: '#2e5e40', brow: '#22263a', brow0: -0.25, mouth0: -0.12, mouthW: 0.8, eyeSize: 0.9, nose: 1.15, blush: false, lip: '#8a4a48' },
    bodyDetail: ({ T, sw, robeL, L, Wd }) => [
      { shape: soft([[-sw * 0.6, -T - 16], [sw * 0.6, -T - 16], [sw * 0.75, -T + 6], [-sw * 0.75, -T + 6]], 1), pal: ['#0a2a22', '#12453a'], flow: 1.57, len: L * 0.7, wid: Wd, under: false },
      strokes([[0, -T + 4, 0, L * 0.5, Wd * 1.2, '#f0b21e', 1, 0.9]], 2),
      { line: [[-sw * 0.5, -T + 14], [-sw * 0.15, -T * 0.3], [-sw * 0.1, robeL - 8]], pal: ['#0a2a22'], len: L * 1.3, wid: Wd * 0.8 },
    ],
    extras: (P) => {
      const { rx, ry } = P, hp = ['#161a2a', '#22263a', '#30364c', '#5a6282'];
      const bun = ellipse(0, -ry * 0.35, rx * 1.02, ry * 0.85, 18);
      const brim = soft([[-rx * 2.1, -ry * 0.72], [0, -ry * 1.0], [rx * 2.1, -ry * 0.72], [rx * 1.2, -ry * 0.55], [0, -ry * 0.68], [-rx * 1.2, -ry * 0.55]], 2);
      const cone = soft([[-rx * 0.95, -ry * 0.82], [-rx * 0.35, -ry * 2.2], [rx * 0.15, -ry * 3.3], [rx * 0.42, -ry * 3.25], [rx * 0.55, -ry * 2.1], [rx * 0.95, -ry * 0.82]], 1);
      const hatPal = PAL.black;
      const sq = (cx) => ({ line: rect(cx - rx * 0.26, -ry * 0.16, rx * 0.52, ry * 0.26), closed: true, len: P.L * 0.45, wid: P.ow * 0.5, pal: ['#22263a'], wob: 0.2, jit: 0.02 });
      return [
        { slot: 'hairBack', patch: hair(P, bun, hp, { flow: { ring: [0, -ry * 0.3] }, jit: 0.1 }) },
        { slot: 'head', follow: 1, patch: paint([sq(-rx * 0.4), sq(rx * 0.4)], 16) },
        { slot: 'head', follow: 0.1, backToo: true, patch: paint([{ shape: cone, pal: hatPal, tone: (x, y) => clamp(0.6 - x / (rx * 2.5)), flow: -1.45, len: P.L * 1.1, wid: P.Wd, density: 2.8 }, { outline: cone, wid: P.ow, len: P.L }, { shape: brim, pal: hatPal, flow: 0, len: P.L * 1.2, wid: P.Wd, density: 2.8, tone: (x, y) => clamp(0.6 - x / (rx * 5)) }, { outline: brim, wid: P.ow, len: P.L }, { line: [[-rx * 0.85, -ry * 0.92], [rx * 0.85, -ry * 0.92]], pal: ['#1c6450', '#2c8468'], len: P.L * 0.8, wid: P.Wd }], 17) },
        { slot: 'hairOver', patch: hair(P, ellipse(0, -ry * 0.1, rx * 1.02, ry * 1.0, 18), hp, { flow: { ring: [0, 0] }, s: 3 }) },
      ];
    },
  }));
}

export function snape(detail = 1) {
  return memo(`snape-${detail}`, () => makeFigure({
    name: 'Snape', seed: 83, detail, H: 422, head: { rx: 27, ry: 39 }, torso: { len: 132, sw: 38, ww: 28 }, arm: { upper: 68, lower: 62, r: 12.5 }, leg: { len: 194 }, legs: false, robe: { len: 1, hem: 54 },
    cloth: ['#05060c', '#0b0d18', '#141828', '#20263c'], skin: ['#7c7a5c', '#a8a27c', '#c8c29a', '#dcd6b0', '#ece8c8'], ink: ['#04050a', '#0a0c16'],
    face: { eye: '#07080f', brow: '#07080f', brow0: -0.7, mouth0: -0.45, mouthW: 0.85, nose: 1.5, hook: 0.3, noseW: 1.2, blush: false, eyeSize: 0.88, lip: '#6a4a48', browW: 1.2 },
    bodyDetail: ({ T, robeL, L, Wd }) => { const o = []; for (let i = 0; i < 9; i++) o.push([0, -T + 14 + i * 13, 0, L * 0.3, Wd * 0.7, '#3a4258', 1, 0.8]); return [strokes(o, 4)]; },
    extras: (P) => {
      const r = RNG(888), { rx, ry, T, robeL } = P, hp = ['#040508', '#0a0c14', '#141826', '#262c44'];
      const cloak = soft([[-P.sw * 1.05, -T + 2], [P.sw * 1.05, -T + 2], [P.sw * 2.3, robeL * 0.55], [P.sw * 2.7, robeL + 4], [P.sw * 0.6, robeL - 8], [-P.sw * 0.6, robeL - 8], [-P.sw * 2.7, robeL + 4], [-P.sw * 2.3, robeL * 0.55]], 2);
      const curtain = soft([[-rx * 1.15, ry * 1.05], [-rx * 1.22, -ry * 0.5], [-rx * 0.6, -ry * 1.15], [rx * 0.6, -ry * 1.15], [rx * 1.22, -ry * 0.5], [rx * 1.15, ry * 1.05], [rx * 0.82, ry * 1.0], [rx * 0.78, -ry * 0.3], [0, -ry * 0.75], [-rx * 0.78, -ry * 0.3], [-rx * 0.82, ry * 1.0]], 1);
      const cw = (x, y, t, sway, p) => { const k = clamp((y + T) / (robeL + T)); const b = (p.billow ?? 0.25); return [x * (1 + b * k * (0.8 + 0.25 * Math.sin(t * 2.4 + x * 0.02))) + (sway * 14 + Math.sin(t * 1.8 + y * 0.02) * 6) * k * k, y]; };
      return [
        { slot: 'back', warp: cw, patch: paint([{ shape: cloak, pal: ['#04050a', '#090b14', '#10141f', '#1a2032'], flow: (x, y) => 1.57 - x * 0.004, len: P.L * 1.6, wid: P.Wd * 1.3, density: 2.6, tone: (x) => clamp(0.5 - x / 400) }, { outline: cloak, wid: P.ow, len: P.L * 1.3, pal: ['#04050a'] }], 18) },
        { slot: 'hairBack', warp: hairWarp(0.8), patch: hair(P, curtain, hp, { flow: 1.57, jit: 0.1, tufts: tufts(0, ry * 0.9, rx * 1.1, ry * 0.25, 0.3, Math.PI - 0.3, 8, P.L, P.Wd * 0.8, hp, r, 0, 0.1) }) },
        { slot: 'head', follow: 0.15, patch: strokes([[-rx * 0.7, -ry * 0.45, 1.75, P.L * 1.5, P.Wd, hp[1]], [rx * 0.7, -ry * 0.45, 1.4, P.L * 1.5, P.Wd, hp[1]], [-rx * 0.25, -ry * 0.82, 2.4, P.L * 1.1, P.Wd, hp[2]], [rx * 0.25, -ry * 0.82, 0.75, P.L * 1.1, P.Wd, hp[2]], [-rx * 0.86, ry * 0.2, 1.6, P.L * 1.5, P.Wd, hp[0]], [rx * 0.86, ry * 0.2, 1.55, P.L * 1.5, P.Wd, hp[0]]], 7) },
        { slot: 'hairOver', patch: hair(P, soft([[-rx * 1.2, ry * 1.1], [-rx * 1.2, -ry * 0.6], [0, -ry * 1.15], [rx * 1.2, -ry * 0.6], [rx * 1.2, ry * 1.1]], 2), hp, { flow: 1.57, s: 3 }) },
      ];
    },
  }));
}

export function quirrell(detail = 1) {
  return memo(`quirrell-${detail}`, () => makeFigure({
    name: 'Quirrell', seed: 97, detail, H: 400, head: { rx: 27, ry: 36 }, torso: { len: 126, sw: 36, ww: 28 }, arm: { upper: 64, lower: 58, r: 12 }, leg: { len: 184 }, legs: false, robe: { len: 1, hem: 54 },
    cloth: ['#1c1420', '#2e2034', '#44304a', '#5e4662', '#7a5f7c'], skin: PAL.skinPale,
    face: { eye: '#5a6282', brow: '#463f38', brow0: 0.6, mouth0: -0.1, mouthW: 0.8, eyeSize: 1.0, blush: false, lip: '#8a5a58' },
    extras: (P) => {
      const { rx, ry } = P, tp = ['#2c1c50', '#44307c', '#6248a0', '#8468be', '#b094d8'];
      const turban = soft([[-rx * 1.25, -ry * 0.5], [-rx * 1.5, -ry * 1.15], [-rx * 0.9, -ry * 1.95], [rx * 0.2, -ry * 2.15], [rx * 1.2, -ry * 1.8], [rx * 1.5, -ry * 1.1], [rx * 1.25, -ry * 0.5], [0, -ry * 0.68]], 2);
      return [
        { slot: 'head', follow: 0.1, backToo: true, patch: paint([
          { shape: turban, pal: tp, tone: (x, y) => clamp(0.55 - x / (rx * 4) + Math.sin(y * 0.3 + x * 0.12) * 0.25), flow: (x, y) => -0.35 + Math.sin(y * 0.09) * 0.5, len: P.L * 1.3, wid: P.Wd * 1.1, density: 3, curve: 0.25 },
          { outline: turban, wid: P.ow, len: P.L },
          { line: [[-rx * 1.2, -ry * 0.9], [0, -ry * 1.25], [rx * 1.3, -ry * 0.95]], pal: [tp[0]], len: P.L, wid: P.Wd * 0.7 },
          { line: [[-rx * 1.3, -ry * 1.35], [0, -ry * 1.75], [rx * 1.25, -ry * 1.45]], pal: [tp[0]], len: P.L, wid: P.Wd * 0.7 },
        ], 19) },
        { slot: 'hairOver', patch: paint([{ shape: ellipse(0, 0, rx * 0.98, ry * 0.98, 16), pal: PAL.skinPale.slice(0, 4), flow: 1.57, len: P.L, wid: P.Wd, density: 3 }], 20) },
      ];
    },
  }));
}

// --- the Dursleys ------------------------------------------------------------

export function vernon() {
  return memo('vernon', () => makeFigure({
    name: 'Vernon', seed: 101, H: 385, head: { rx: 41, ry: 41 }, neck: 0, torso: { len: 132, sw: 66, ww: 78 }, arm: { upper: 66, lower: 58, r: 18 }, leg: { len: 158, r: 23, gap: 28 }, robe: { len: 0.1, hem: 84 },
    cloth: ['#33261c', '#4c3a2a', '#66503a', '#836a4e'], trouser: ['#2a2420', '#3c342e', '#524840'], skin: ['#9a5a40', '#bc7450', '#d89068', '#eaae86'],
    face: { eye: '#2a2420', brow: '#2a1a10', brow0: -0.6, mouth0: -0.5, eyeSize: 0.72, browW: 1.5, eyeY: -0.1, blush: '#c8503a' },
    faceExtra: (S, p, f) => { for (const s of [-1, 1]) S.stroke(f.fx * 0.9 + s * f.rx * 0.22, f.ry * 0.36, s * 0.35, f.rx * 0.6, f.es * 1.5, '#2a1a10', 1, 0.8, 0, 0.3 + s * 0.1); },
    bodyDetail: ({ T, L, Wd }) => [{ shape: [[-12, -T - 2], [12, -T - 2], [0, -T + 40]], pal: ['#dcdfd6', '#f0ecd8'], flow: 1.57, len: L * 0.8, wid: Wd, under: false }, { shape: [[-5, -T + 2], [5, -T + 2], [4, -T + 50], [-4, -T + 50]], pal: ['#7a1c16', '#a3281c'], flow: 1.57, len: L * 0.7, wid: Wd * 0.8, under: false }],
    extras: (P) => [{ slot: 'head', follow: 0.2, patch: hair(P, soft([[-P.rx * 0.98, -P.ry * 0.3], [-P.rx * 0.8, -P.ry * 1.0], [P.rx * 0.8, -P.ry * 1.0], [P.rx * 0.98, -P.ry * 0.3], [P.rx * 0.7, -P.ry * 0.72], [-P.rx * 0.7, -P.ry * 0.72]], 1), ['#1a140e', '#2a1c12', '#44291a'], { flow: 0.2, jit: 0.1 }) }],
  }));
}

export function petunia() {
  return memo('petunia', () => makeFigure({
    name: 'Petunia', seed: 103, H: 392, head: { rx: 25, ry: 36 }, neck: 24, torso: { len: 118, sw: 29, ww: 22 }, arm: { upper: 62, lower: 58, r: 9 }, leg: { len: 190, r: 9, gap: 9 }, robe: { len: 0.62, hem: 40 },
    cloth: ['#6a3a50', '#8c5068', '#ac6c82', '#c890a0'], trouser: PAL.skinPale.slice(1), shoe: ['#3c1c44'], skin: PAL.skinPale.slice(1).concat(['#f8f0d8']),
    face: { eye: '#5a6282', brow: '#8e682a', brow0: -0.35, mouth0: -0.4, mouthW: 0.7, eyeSize: 0.85, nose: 1.3, blush: false },
    extras: (P) => [
      { slot: 'hairBack', patch: hair(P, ellipse(0, -P.ry * 0.5, P.rx * 1.15, P.ry * 0.9, 18), PAL.hairBlond.slice(0, 3), { flow: { ring: [0, -P.ry * 0.5] }, curve: 0.2 }) },
      { slot: 'head', follow: 0.2, patch: hair(P, soft([[-P.rx, -P.ry * 0.3], [-P.rx * 0.7, -P.ry * 1.0], [P.rx * 0.7, -P.ry * 1.0], [P.rx, -P.ry * 0.3], [0, -P.ry * 0.7]], 1), PAL.hairBlond.slice(0, 3), { flow: 0.2, s: 2 }) },
    ],
  }));
}

export function dudley() {
  return memo('dudley', () => makeFigure({
    name: 'Dudley', seed: 107, H: 290, head: { rx: 35, ry: 35 }, neck: 0, torso: { len: 92, sw: 46, ww: 52 }, arm: { upper: 44, lower: 40, r: 14 }, leg: { len: 100, r: 17, gap: 19 }, robe: { len: 0.1, hem: 56 },
    cloth: (x, y) => (Math.floor((y + 400) / 12) % 2 ? '#b4501a' : '#e6ca82'), sleeve: ['#b4501a', '#d46e1e', '#e6ca82'], trouser: ['#2a3050', '#3e4668'], skin: ['#b06c44', '#d89068', '#eeb48c', '#f8cca8'],
    face: { eye: '#3e4668', brow: '#a89048', brow0: -0.3, mouth0: -0.3, eyeSize: 0.75, eyeY: -0.08, blush: '#d8603a' },
    extras: (P) => [{ slot: 'head', follow: 0.2, patch: hair(P, soft([[-P.rx * 0.98, -P.ry * 0.3], [-P.rx * 0.8, -P.ry * 1.05], [P.rx * 0.8, -P.ry * 1.05], [P.rx * 0.98, -P.ry * 0.3], [0, -P.ry * 0.6]], 1), PAL.hairBlond, { flow: 0.3, jit: 0.1 }) }],
  }));
}

/** Draco's two hulking friends: one build, kept in shadow. */
export function goon(i = 0) {
  return memo('goon' + i, () => makeFigure({
    name: 'Goon', seed: 113 + i, H: 330 + i * 14, head: { rx: 36, ry: 37 }, neck: 0, torso: { len: 104, sw: 50, ww: 50 }, arm: { upper: 52, lower: 46, r: 15 }, leg: { len: 114, r: 16, gap: 18 }, robe: { len: 0.7, hem: 62 },
    cloth: PAL.black, trouser: PAL.black, skin: PAL.skin.slice(0, 4),
    face: { eye: '#161a2a', brow: '#161a2a', brow0: -0.6, mouth0: -0.4, eyeSize: 0.7, browW: 1.5, blush: false },
    extras: (P) => [{ slot: 'head', follow: 0.2, patch: hair(P, soft([[-P.rx, -P.ry * 0.4], [-P.rx * 0.8, -P.ry * 1.05], [P.rx * 0.8, -P.ry * 1.05], [P.rx, -P.ry * 0.4], [0, -P.ry * 0.7]], 1), i ? PAL.hairBrown.slice(0, 3) : PAL.hairBlack, { flow: 0.1, jit: 0.1 }) }],
  }));
}

/** Lily — only ever seen as a figure of golden light. */
export function lily() {
  return memo('lily', () => makeFigure({
    name: 'Lily', seed: 127, H: 400, head: { rx: 27, ry: 36 }, torso: { len: 124, sw: 33, ww: 25 }, arm: { upper: 64, lower: 60, r: 10.5 }, leg: { len: 186 }, legs: false, robe: { len: 1, hem: 60 },
    cloth: PAL.gold, skin: PAL.gold.slice(2), ink: ['#d9911c', '#f0b21e'],
    face: { eye: '#b8741a', brow: '#b8741a', mouth0: 0.4, blush: false, white: '#fff4b8', lip: '#d9911c' },
    extras: (P) => {
      const { rx, ry } = P, hp = ['#d9911c', '#f0b21e', '#f7cf3a', '#fbe36e'];
      const long = soft([[-rx * 1.25, -ry * 0.5], [-rx * 0.6, -ry * 1.15], [rx * 0.6, -ry * 1.15], [rx * 1.25, -ry * 0.5], [rx * 1.5, ry * 2.2], [rx * 0.9, ry * 3.4], [-rx * 0.9, ry * 3.4], [-rx * 1.5, ry * 2.2]], 2);
      return [
        { slot: 'hairBack', warp: hairWarp(2), patch: hair(P, long, hp, { flow: (x, y) => 1.57 + Math.sin(y * 0.05 + x * 0.08) * 0.5, curve: 0.3 }) },
        { slot: 'head', follow: 0.2, patch: hair(P, soft([[-rx, -ry * 0.2], [-rx * 0.7, -ry * 1.02], [rx * 0.7, -ry * 1.02], [rx, -ry * 0.2], [rx * 0.5, -ry * 0.6], [-rx * 0.3, -ry * 0.75]], 1), hp, { flow: 0.6, curve: 0.3, s: 2 }) },
      ];
    },
  }));
}

export const CAST = { harry, ron, hermione, draco, hagrid, dumbledore, mcgonagall, snape, quirrell, vernon, petunia, dudley, goon, lily };
