// Props and creatures. Each builder returns cached stroke patches in local
// space; draw them with fx.put(S, patch, x, y, scale, rotation).

import { paint, strokes } from '../engine/patch.js';
import { rect, soft, ellipse, limb } from '../engine/geom.js';
import { RNG } from '../engine/rng.js';
import { clamp, TAU } from '../engine/util.js';
import { PAL, INK } from './palette.js';
import { arch } from './architecture.js';

const cache = new Map();
const memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
const lr = (w, bias = 0.6, k = 0.5) => (x) => clamp(bias - (x / w) * k);

/** Golden envelope with a red wax seal, centred, ~60 wide. */
export const letter = () => memo('letter', () => {
  const b = rect(-30, -19, 60, 38);
  return paint([
    { shape: b, pal: ['#e0b23a', '#f0cc5a', '#f8e08a', '#fdf0b8'], tone: lr(60, 0.6, 0.6), flow: 0.1, len: 22, wid: 9, density: 3, under: false, thick: 0.9 },
    { outline: b, wid: 3, len: 14, pal: ['#8a5a1a', '#6a4a1e'] },
    { line: [[-29, -18], [0, 3], [29, -18]], len: 14, wid: 2.6, pal: ['#a8741e'] },
    strokes([[0, 3, 0, 9, 8, '#a3281c', 1, 1], [0, 3, 1.5, 5, 4, '#e05a34', 1, 1]], 2),
  ], 3);
});

/** Snowy owl. Returns { body, wing } — wing is drawn twice, flapping. */
export const owl = () => memo('owl', () => {
  const body = soft([[-20, -58], [20, -58], [30, -30], [26, 10], [8, 34], [-8, 34], [-26, 10], [-30, -30]], 2);
  const wing = soft([[0, 0], [30, -16], [78, -10], [110, 8], [84, 16], [60, 30], [28, 26]], 2);
  const wp = PAL.white;
  return {
    body: paint([
      { shape: body, pal: wp, tone: lr(60, 0.6, 0.6), flow: (x, y) => 1.57 + x * 0.012, curve: 0.2, len: 15, wid: 6, density: 3.2 },
      { outline: body, wid: 3, len: 12 },
      strokes([[-10, -38, 0, 9, 9, '#f7cf3a', 1, 0.9], [10, -38, 0, 9, 9, '#f7cf3a', 1, 0.9], [-10, -38, 0, 4, 4, '#0b1028'], [10, -38, 0, 4, 4, '#0b1028'], [0, -29, 1.57, 9, 5, '#d9911c'],
        [-8, -8, 0.3, 7, 3, '#6c7890'], [7, -2, -0.3, 7, 3, '#6c7890'], [-3, 10, 0.2, 7, 3, '#6c7890'], [10, 14, -0.2, 7, 3, '#6c7890']], 4),
    ], 5),
    wing: paint([{ shape: wing, pal: wp, tone: (x, y) => clamp(0.8 - x / 160 - y / 80), flow: 0.2, curve: 0.15, len: 20, wid: 6.5, density: 3 }, { outline: wing, wid: 3, len: 14 },
      { line: [[40, 22], [70, 18], [100, 10]], len: 12, wid: 3, pal: ['#6c7890', '#909cb0'] }], 6),
  };
});
export function drawOwl(S, x, y, s, t, o = {}) {
  const O = owl(), flap = o.flap ?? Math.sin(t * 9) * 0.6, f = o.face ?? 1;
  S.push(x, y, o.rot ?? 0, s * f, s);
  for (const side of [-1, 1]) { S.push(side * 18, -28, side * (-0.15 - flap), side, 1); S.draw(O.wing, o); S.pop(); }
  S.draw(O.body, o);
  S.pop();
}

/** Old street lamp, origin at the foot; lantern centre at (0, -h). */
export const lampPost = (h = 420) => memo('lamp' + h, () => paint([
  { shape: rect(-6, -h + 30, 12, h - 30), pal: PAL.prussian, flow: 1.57, len: 30, wid: 6, density: 3 },
  { outline: rect(-6, -h + 30, 12, h - 30), wid: 3 },
  { shape: rect(-18, -8, 36, 10), pal: PAL.prussian, flow: 0, len: 16, wid: 6, density: 3 },
  { shape: [[-20, -h + 30], [20, -h + 30], [26, -h - 20], [-26, -h - 20]], pal: PAL.lamp, flow: 1.57, len: 18, wid: 8, density: 3.4, under: false, thick: 1 },
  { outline: [[-20, -h + 30], [20, -h + 30], [26, -h - 20], [-26, -h - 20]], wid: 3.4 },
  { shape: [[-32, -h - 20], [32, -h - 20], [0, -h - 52]], pal: PAL.prussian, flow: 0, len: 16, wid: 6, density: 3 },
  { outline: [[-32, -h - 20], [32, -h - 20], [0, -h - 52]], wid: 3.4 },
], 7));

/** Hanging lantern (origin at the hook). */
export const lantern = () => memo('lantern', () => paint([
  { line: [[0, 0], [0, 16]], len: 8, wid: 2.5 },
  { shape: [[-12, 16], [12, 16], [15, 48], [-15, 48]], pal: PAL.lamp, flow: 1.57, len: 14, wid: 6, density: 3.4, under: false, thick: 1 },
  { outline: [[-12, 16], [12, 16], [15, 48], [-15, 48]], wid: 3 },
  { shape: [[-16, 16], [16, 16], [0, 4]], pal: PAL.prussian, flow: 0, len: 10, wid: 5, density: 3, under: false },
], 8));

/** The scarlet engine, facing +x. Origin on the rail under the middle. Wheels drawn separately. */
export const engine = () => memo('engine', () => {
  const red = PAL.scarlet;
  const boiler = soft([[-150, -150], [150, -150], [170, -120], [170, -62], [-150, -62]], 1);
  const cab = rect(-250, -190, 110, 130);
  const tender = rect(-470, -150, 200, 92);
  const stack = [[96, -150], [128, -150], [136, -218], [88, -218]];
  const dome = ellipse(10, -152, 30, 26, 14);
  const front = ellipse(172, -100, 16, 44, 14);
  const cow = [[150, -62], [226, -22], [150, -22]];
  return paint([
    { shape: tender, pal: red, tone: (x, y) => clamp(0.75 + y / 300), flow: 0.02, len: 36, wid: 10, density: 2.6 }, { outline: tender, wid: 5 },
    { shape: rect(-460, -168, 180, 22), pal: PAL.black, flow: 0, len: 22, wid: 8, density: 2.8 },
    { shape: boiler, pal: red, tone: (x, y) => clamp(0.95 + (y + 62) / 110), flow: 0.02, len: 40, wid: 10, density: 2.7 }, { outline: boiler, wid: 5 },
    { shape: dome, pal: PAL.gold, flow: { ring: [10, -152] }, len: 14, wid: 6, density: 3 }, { outline: dome, wid: 3.5 },
    { shape: stack, pal: PAL.black, flow: 1.57, len: 22, wid: 8, density: 2.8 }, { outline: stack, wid: 4 },
    { line: [[84, -220], [140, -220]], len: 16, wid: 8, pal: PAL.gold.slice(1, 4) },
    { shape: cab, pal: red, tone: (x, y) => clamp(0.7 + y / 400), flow: 1.57, len: 34, wid: 10, density: 2.6 }, { outline: cab, wid: 5 },
    { shape: rect(-262, -204, 134, 18), pal: PAL.black, flow: 0, len: 22, wid: 8, density: 2.8 },
    { shape: rect(-232, -172, 60, 46), pal: PAL.lamp, flow: 1.57, len: 16, wid: 8, density: 3.2, under: false }, { outline: rect(-232, -172, 60, 46), wid: 3.5 },
    { shape: front, pal: PAL.black, flow: 1.57, len: 16, wid: 6, density: 3 },
    { shape: cow, pal: red.slice(0, 3), flow: 0.5, len: 20, wid: 7, density: 2.8 }, { outline: cow, wid: 4 },
    { line: [[-140, -106], [150, -106]], len: 30, wid: 5, pal: PAL.gold.slice(1, 4) },
    { shape: rect(-480, -62, 660, 16), pal: PAL.black, flow: 0, len: 36, wid: 9, density: 2.6 },
    strokes([[178, -128, 0, 20, 18, '#fff8d0', 1, 1], [178, -128, 1, 10, 9, '#fad648', 1, 1]], 3),
  ], 9);
});
export const wheel = (r = 44) => memo('wheel' + r, () => {
  const p = [{ shape: ellipse(0, 0, r, r, 22), pal: PAL.black, flow: { ring: [0, 0] }, len: 20, wid: 7, density: 3 }, { line: ellipse(0, 0, r - 4, r - 4, 20), closed: true, len: 16, wid: 5, pal: PAL.scarlet.slice(1, 4) }];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; p.push({ line: [[0, 0], [Math.cos(a) * (r - 6), Math.sin(a) * (r - 6)]], len: 14, wid: 4, pal: PAL.scarlet.slice(1, 4) }); }
  p.push(strokes([[0, 0, 0, 12, 12, '#f0b21e', 1, 1]], 2));
  return paint(p, 10);
});
/** Carriage, origin on the rail under the middle, 420 long. */
export const carriage = () => memo('carriage', () => {
  const b = rect(-205, -170, 410, 118), roof = soft([[-212, -168], [-200, -190], [200, -190], [212, -168]], 1);
  const p = [{ shape: b, pal: PAL.scarlet, tone: (x, y) => clamp(0.8 + y / 300), flow: 0.02, len: 38, wid: 10, density: 2.6 }, { outline: b, wid: 5 },
    { shape: roof, pal: PAL.black, flow: 0, len: 30, wid: 8, density: 2.8 }, { line: [[-205, -72], [205, -72]], len: 30, wid: 5, pal: PAL.gold.slice(1, 4) },
    { shape: rect(-215, -52, 430, 14), pal: PAL.black, flow: 0, len: 30, wid: 8, density: 2.6 }];
  for (let i = 0; i < 6; i++) p.push({ shape: rect(-190 + i * 66, -150, 46, 50), pal: PAL.lamp, flow: 1.57, len: 16, wid: 8, density: 3.2, under: false, thick: 0.9 }, { outline: rect(-190 + i * 66, -150, 46, 50), wid: 3.4 });
  return paint(p, 11);
});
export function drawTrain(S, x, y, s, t, o = {}) {
  const spin = (o.spin ?? t * 9);
  S.push(x, y, o.rot ?? 0, s);
  const cars = o.cars ?? 3;
  for (let i = cars; i >= 1; i--) {
    const cx = -480 - 225 - (i - 1) * 440 - 10 * i;
    S.push(cx, Math.sin(t * 14 + i) * 1.2); S.draw(carriage(), o); S.pop();
    for (const wx of [-140, -70, 70, 140]) { S.push(cx + wx, -24, spin, 0.55); S.draw(wheel(), o); S.pop(); }
  }
  S.push(0, Math.sin(t * 14) * 1.2); S.draw(engine(), o); S.pop();
  for (const wx of [-400, -330, -90, 10, 110]) { S.push(wx, wx > -200 ? -40 : -26, spin, wx > -200 ? 1 : 0.6); S.draw(wheel(), o); S.pop(); }
  // coupling rod
  S.stroke(10 + Math.cos(spin) * 22, -40 + Math.sin(spin) * 22, 0, 230, 8, '#b6c0cc', o.a ?? 1, 0.9);
  S.pop();
}

/** Rowing boat with a lantern pole. Origin at the waterline centre. */
export const boat = () => memo('boat', () => {
  const hull = soft([[-110, -26], [110, -26], [84, 16], [-84, 16]], 1);
  return paint([
    { shape: hull, pal: PAL.earth, tone: (x, y) => clamp(0.6 - y / 60), flow: 0.03, len: 34, wid: 9, density: 2.8 }, { outline: hull, wid: 4.5 },
    { line: [[-104, -24], [104, -24]], len: 26, wid: 4, pal: PAL.ochre.slice(2) },
    { line: [[92, -26], [100, -110]], len: 20, wid: 4 },
  ], 12);
});

/** Open book, centred. */
export const book = () => memo('book', () => {
  const L = soft([[-70, -34], [-4, -40], [-4, 34], [-70, 40]], 1), R = soft([[4, -40], [70, -34], [70, 40], [4, 34]], 1);
  return paint([
    { shape: rect(-76, -38, 152, 84), pal: PAL.earth.slice(0, 4), flow: 0, len: 30, wid: 9, density: 2.6 },
    { shape: L, pal: ['#c8b890', '#e0d4ae', '#f0e8c8'], flow: 0.08, len: 24, wid: 8, density: 3, under: false }, { shape: R, pal: ['#d4c69c', '#eadfb8', '#f6f0d4'], flow: -0.08, len: 24, wid: 8, density: 3, under: false },
    { outline: L, wid: 3 }, { outline: R, wid: 3 },
    ...[-22, -8, 6, 20].map((y) => ({ line: [[-60, y], [-14, y - 2]], len: 12, wid: 2.4, pal: ['#6a5a48'], alpha: 0.8 })),
  ], 13);
});

/** Broomstick lying along +x, origin at the grip (rider sits at ~0). */
export const broom = () => memo('broom', () => paint([
  { line: [[-150, 0], [70, -6]], len: 30, wid: 7, pal: PAL.earth.slice(2, 5) },
  { shape: soft([[-150, -6], [-250, -30], [-270, 0], [-250, 30], [-150, 6]], 1), pal: PAL.ochre, flow: 0.05, len: 34, wid: 6, density: 3.2, hug: false, jit: 0.15 },
  { line: [[-158, -8], [-158, 8]], len: 10, wid: 5, pal: PAL.gold.slice(1, 3) },
], 14));

/** Winged key (origin centre). wing drawn separately for flapping. */
export const key = () => memo('key', () => ({
  body: paint([{ line: ellipse(-18, 0, 9, 9, 10), closed: true, len: 8, wid: 4, pal: PAL.gold.slice(2) }, { line: [[-9, 0], [26, 0]], len: 12, wid: 4.4, pal: PAL.gold.slice(1, 4) }, { line: [[18, 0], [18, 9]], len: 6, wid: 3.6, pal: PAL.gold.slice(1, 4) }, { line: [[25, 0], [25, 8]], len: 6, wid: 3.6, pal: PAL.gold.slice(1, 4) }], 15),
  wing: strokes([[10, -8, -0.5, 26, 7, '#dcdfd6', 0.95], [20, -12, -0.3, 24, 6, '#bcc6cc', 0.95], [28, -10, -0.1, 20, 5, '#f0ecd8', 0.9]], 16),
}));
export function drawKey(S, x, y, s, rot, t, o = {}) {
  const K = key(), flap = Math.sin(t * 22 + (o.ph ?? 0)) * 0.7;
  S.push(x, y, rot, s);
  for (const side of [-1, 1]) { S.push(0, 0, side * flap, 1, side); S.draw(K.wing, o); S.pop(); }
  S.draw(K.body, o);
  S.pop();
}

/** Chess pieces (origin bottom centre, ~300 tall at scale 1). kind: knight | queen | pawn | rook | king | bishop */
export function chess(kind, white = true) {
  return memo(`chess-${kind}-${white}`, () => {
    const pal = white ? ['#6c7890', '#909cb0', '#b6c0cc', '#d8dee0', '#f2f2ea'] : ['#10121e', '#1c2038', '#2a3050', '#3e4668', '#5a6282'];
    const base = soft([[-70, 0], [70, 0], [62, -30], [40, -44], [-40, -44], [-62, -30]], 1);
    let top;
    if (kind === 'knight') top = soft([[-44, -44], [-50, -150], [-30, -230], [10, -290], [44, -300], [36, -262], [78, -220], [88, -180], [58, -170], [30, -190], [44, -120], [48, -44]], 1);
    else if (kind === 'queen') top = soft([[-38, -44], [-24, -200], [-50, -270], [-30, -262], [-16, -300], [0, -270], [16, -300], [30, -262], [50, -270], [24, -200], [38, -44]], 1);
    else if (kind === 'king') top = soft([[-40, -44], [-26, -210], [-44, -260], [-12, -262], [-12, -300], [12, -300], [12, -262], [44, -260], [26, -210], [40, -44]], 1);
    else if (kind === 'rook') top = [[-44, -44], [-38, -200], [-52, -210], [-52, -262], [-28, -262], [-28, -240], [-10, -240], [-10, -262], [10, -262], [10, -240], [28, -240], [28, -262], [52, -262], [52, -210], [38, -200], [44, -44]];
    else if (kind === 'bishop') top = soft([[-36, -44], [-22, -180], [-34, -220], [0, -290], [34, -220], [22, -180], [36, -44]], 2);
    else top = soft([[-34, -44], [-18, -130], [-32, -160], [-20, -200], [0, -212], [20, -200], [32, -160], [18, -130], [34, -44]], 2);
    const tone = (x, y) => clamp(0.62 - x / 150 - y / 1400);
    const p = [
      { shape: top, pal, tone, flow: 1.57, jit: 0.15, len: 34, wid: 10, density: 2.7, thick: 0.85 }, { outline: top, wid: 5.5, len: 26 },
      { shape: base, pal, tone, flow: 0.02, len: 30, wid: 10, density: 2.7 }, { outline: base, wid: 5.5, len: 26 },
    ];
    if (kind === 'knight') p.push(strokes([[46, -252, 0.4, 14, 9, white ? '#1c2038' : '#f7cf3a', 1, 0.9], [-10, -200, 1.9, 60, 9, pal[0]], [-22, -140, 1.7, 60, 9, pal[0]]], 2));
    return paint(p, 17);
  });
}

/** The tall mirror (origin bottom centre). */
export const mirror = () => memo('mirror', () => {
  const frame = arch(-110, 0, 220, 470), glass = arch(-84, -22, 168, 420);
  return paint([
    { shape: frame, pal: PAL.gold, tone: lr(220, 0.6, 0.7), flow: 1.57, len: 30, wid: 9, density: 2.8 }, { outline: frame, wid: 5.5 },
    { shape: glass, pal: ['#16304a', '#24506a', '#3a7890', '#62a4b4', '#a4d0d8'], tone: (x, y) => clamp(0.3 - x / 300 - y / 900), flow: 1.0, len: 40, wid: 11, density: 2.6, hug: false }, { outline: glass, wid: 4 },
    { shape: rect(-130, -24, 260, 24), pal: PAL.gold.slice(0, 4), flow: 0, len: 30, wid: 9, density: 2.8 }, { outline: rect(-130, -24, 260, 24), wid: 4.5 },
  ], 18);
});

/** The Stone: a rough crimson gem, centred, ~40 wide. */
export const stone = () => memo('stone', () => {
  const s = [[-18, -6], [-6, -22], [12, -20], [22, -2], [10, 20], [-10, 18]];
  return paint([{ shape: s, pal: ['#6a0c14', '#a3181c', '#d83428', '#f46a48', '#ffb48c'], tone: lr(44, 0.6, 0.9), flow: 1.0, len: 14, wid: 6, density: 3.6, thick: 1, under: false }, { outline: s, wid: 3, len: 10, pal: ['#3a0c14'] }], 19);
});

/** Wand, held at the origin and pointing along -y. */
export const wand = () => memo('wand', () => paint([{ line: [[0, 6], [0, -58]], len: 12, wid: 3.6, pal: PAL.ochre.slice(2), taperEnd: true }], 20));

/** Feather, centred. */
export const feather = () => memo('feather', () => paint([
  { shape: soft([[-34, 4], [-10, -10], [26, -8], [38, 0], [22, 10], [-12, 10]], 2), pal: PAL.white.slice(1), flow: 0.5, len: 14, wid: 4, density: 3.4, under: false },
  { line: [[-40, 5], [36, 0]], len: 12, wid: 2.4, pal: ['#909cb0'] },
], 21));

/** Table (origin bottom centre). */
export const table = (w = 420, h = 150, pal = PAL.earth) => memo(`table${w}-${h}`, () => paint([
  { shape: rect(-w / 2 + 16, -h + 14, 20, h - 14), pal: pal.slice(0, 3), flow: 1.57, len: 26, wid: 8, density: 2.6 }, { shape: rect(w / 2 - 36, -h + 14, 20, h - 14), pal: pal.slice(0, 3), flow: 1.57, len: 26, wid: 8, density: 2.6 },
  { shape: [[-w / 2, -h], [w / 2, -h], [w / 2 + 16, -h + 26], [-w / 2 - 16, -h + 26]], pal: pal.slice(1), tone: lr(w, 0.6, 0.6), flow: 0.02, len: 40, wid: 10, density: 2.7 },
  { outline: [[-w / 2, -h], [w / 2, -h], [w / 2 + 16, -h + 26], [-w / 2 - 16, -h + 26]], wid: 4.5 },
], 22));

/** Candle (origin at base); flame via fx.flame at (0, -h). */
export const candle = (h = 60) => memo('candle' + h, () => paint([{ shape: rect(-6, -h, 12, h), pal: PAL.white.slice(1), flow: 1.57, len: 16, wid: 5, density: 3.2, under: false }, { outline: rect(-6, -h, 12, h), wid: 2.4, len: 12 }], 23));

/** Vase of sunflowers (origin bottom centre) — the film's quiet nod to the Sunflowers. */
export const sunflowers = () => memo('sunflowers', () => {
  const r = RNG(77);
  const vase = soft([[-34, 0], [34, 0], [44, -50], [30, -96], [-30, -96], [-44, -50]], 2);
  const p = [];
  const heads = [[-50, -190, 30], [10, -230, 34], [60, -180, 28], [-10, -160, 26], [38, -130, 22], [-70, -130, 22]];
  for (const [x, y] of heads) p.push({ line: [[x * 0.3, -90], [x, y]], len: 18, wid: 4.5, pal: PAL.olive.slice(1, 4) });
  p.push({ shape: vase, pal: PAL.ochre, tone: lr(90, 0.6, 0.8), flow: 1.57, len: 20, wid: 7, density: 3 }, { outline: vase, wid: 4 });
  const pet = [];
  for (const [x, y, rr] of heads) {
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + r(); pet.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr, a, rr * 0.9, rr * 0.36, r() > 0.5 ? '#f7cf3a' : '#f0b21e', 1, 1]); }
    for (let i = 0; i < 6; i++) { const a = r() * TAU; pet.push([x + Math.cos(a) * rr * 0.3, y + Math.sin(a) * rr * 0.3, a, rr * 0.5, rr * 0.4, r() > 0.5 ? '#865a32' : '#b4501a', 1, 1]); }
  }
  p.push(strokes(pet, 5));
  return paint(p, 24);
});

/** Gilded picture frame around rect (x, y, w, h); thickness b. */
export function frameParts(x, y, w, h, b = 46, pal = PAL.gold) {
  const o = [[x - b, y - b], [x + w + b, y - b], [x + w + b, y + h + b], [x - b, y + h + b]];
  const sides = [
    [[x - b, y - b], [x + w + b, y - b], [x + w, y], [x, y]], [[x + w + b, y - b], [x + w + b, y + h + b], [x + w, y + h], [x + w, y]],
    [[x + w + b, y + h + b], [x - b, y + h + b], [x, y + h], [x + w, y + h]], [[x - b, y + h + b], [x - b, y - b], [x, y], [x, y + h]],
  ];
  const p = sides.map((s, i) => ({ shape: s, pal, tone: () => [0.75, 0.4, 0.3, 0.6][i], flow: i % 2 ? 1.57 : 0, jit: 0.1, len: b * 0.9, wid: b * 0.24, density: 3, thick: 1, curve: 0.1 }));
  p.push({ line: o, closed: true, len: 40, wid: 5, pal: ['#5a3a10', '#3a2408'] }, { line: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true, len: 36, wid: 4.5, pal: ['#5a3a10', '#3a2408'] });
  return p;
}

/** Baby Harry's bundle (origin centre, ~120 wide). */
export const bundle = () => memo('bundle', () => {
  const wrap = soft([[-62, -20], [-30, -40], [40, -36], [66, -10], [50, 30], [-20, 38], [-60, 18]], 2);
  const face = ellipse(-30, -8, 22, 20, 14);
  return paint([
    { shape: wrap, pal: ['#8a98b4', '#a8b6cc', '#c8d2dc', '#e6e8e0', '#f6f2e2'], tone: lr(130, 0.6, 0.7), flow: (x, y) => 0.3 + Math.sin(x * 0.05) * 0.5, curve: 0.2, len: 24, wid: 8, density: 3 }, { outline: wrap, wid: 4 },
    { shape: face, pal: PAL.skin.slice(2), flow: 1.57, len: 12, wid: 5, density: 3.4, under: false }, { outline: face, wid: 2.8, len: 10 },
    strokes([[-38, -10, 0.2, 8, 2.6, '#0b1028'], [-24, -10, -0.2, 8, 2.6, '#0b1028'], [-31, 1, 0, 7, 2.6, '#b4501a'], [-30, -26, 0.4, 14, 5, '#10121e'], [-22, -27, -0.3, 10, 4, '#10121e'],
      [-27, -19, 1.1, 6, 2.2, '#e05a34'], [-28, -15, 2.2, 5, 2.2, '#f0b21e']], 3),
  ], 25);
});

/** Three-headed dog: returns { body, head, jaw } — heads are posed per frame. */
export const fluffy = () => memo('fluffy', () => {
  const fur = ['#0c0a0a', '#1c1614', '#30241c', '#4a3626', '#665038'];
  const body = soft([[-420, 0], [-460, -260], [-300, -420], [0, -470], [300, -420], [460, -260], [420, 0]], 2);
  const head = soft([[-110, -40], [-120, -150], [-150, -230], [-90, -200], [-40, -230], [40, -230], [90, -200], [150, -230], [120, -150], [110, -40], [80, 60], [0, 96], [-80, 60]], 2);
  const jaw = soft([[-74, 0], [74, 0], [56, 62], [0, 84], [-56, 62]], 2);
  const paw = soft([[-90, 0], [-80, -70], [0, -96], [80, -70], [90, 0]], 2);
  const tone = (x, y) => clamp(0.5 - x / 600 - y / 900);
  return {
    body: paint([{ shape: body, pal: fur, tone, flow: (x, y) => 1.57 + x * 0.0016, curve: 0.2, len: 54, wid: 14, density: 2.5, hug: false }], 26),
    head: paint([
      { shape: head, pal: fur, tone: (x, y) => clamp(0.55 - x / 300 - y / 500), flow: (x, y) => 1.57 + x * 0.006, curve: 0.2, len: 36, wid: 11, density: 2.8 }, { outline: head, wid: 6, len: 28, pal: ['#07080f'] },
      strokes([[-52, -70, 0.3, 40, 22, '#f7cf3a', 1, 1], [52, -70, -0.3, 40, 22, '#f7cf3a', 1, 1], [-50, -68, 1.57, 20, 9, '#a3181c', 1, 1], [50, -68, 1.57, 20, 9, '#a3181c', 1, 1],
        [-60, -100, 0.5, 60, 12, '#07080f'], [60, -100, -0.5 + Math.PI, 60, 12, '#07080f'], [0, 10, 0, 50, 30, '#07080f', 1, 1], [-14, 6, 0, 12, 8, '#30364c'], [0, -20, 1.57, 60, 16, '#30241c']], 4),
    ], 27),
    jaw: paint([
      { shape: jaw, pal: ['#3a0c14', '#6a1420', '#96202a'], flow: 1.57, len: 26, wid: 9, density: 2.8 }, { outline: jaw, wid: 5, pal: ['#07080f'] },
      strokes([[-50, 8, 1.3, 26, 9, '#f0ecd8', 1, 1], [-26, 10, 1.5, 22, 8, '#f0ecd8', 1, 1], [26, 10, 1.64, 22, 8, '#f0ecd8', 1, 1], [50, 8, 1.84, 26, 9, '#f0ecd8', 1, 1], [0, 12, 1.57, 16, 7, '#dcdfd6', 1, 1]], 5),
    ], 28),
    paw: paint([{ shape: paw, pal: fur, tone: (x, y) => clamp(0.6 - x / 200), flow: 1.57, len: 34, wid: 11, density: 2.8 }, { outline: paw, wid: 6, pal: ['#07080f'] },
      strokes([[-50, -6, 1.57, 22, 8, '#dcdfd6'], [0, -4, 1.57, 22, 8, '#dcdfd6'], [50, -6, 1.57, 22, 8, '#dcdfd6']], 6)], 29),
  };
});

/** Troll — only ever a looming shadow shape (origin bottom centre, ~900 tall). */
export const troll = () => memo('troll', () => {
  const s = soft([[-200, 0], [-230, -300], [-330, -420], [-300, -640], [-160, -700], [-110, -820], [0, -880], [110, -820], [150, -700], [300, -650], [420, -560], [470, -860], [540, -900], [560, -520], [330, -380], [240, -300], [210, 0]], 2);
  return paint([{ shape: s, pal: ['#07080f', '#0c1020', '#141a34', '#1c2648'], flow: (x, y) => 1.57 + x * 0.001, len: 70, wid: 18, density: 2.3, hug: false, curve: 0.15 }], 30);
});

/** Soft contact shadow (origin centre). */
export const shadow = (w = 120) => memo('shadow' + w, () => paint([{ shape: ellipse(0, 0, w, w * 0.16, 16), pal: ['#07080f', '#0b1028', '#11183a'], flow: 0, len: w * 0.5, wid: w * 0.09, density: 2.4, under: false, hug: false, alpha: 0.55 }], 31));

/** Torch bracket (origin at the flame base). */
export const torch = () => memo('torch', () => paint([{ line: [[0, 0], [0, 54]], len: 16, wid: 7, pal: PAL.earth.slice(0, 3) }, { shape: [[-14, -4], [14, -4], [8, 14], [-8, 14]], pal: PAL.black, flow: 0, len: 12, wid: 6, density: 3, under: false }], 32));

/** Shop sign hanging from a bracket (origin at the wall end of the bracket). */
export const sign = (i = 0) => memo('sign' + i, () => {
  const pal = [PAL.emerald, PAL.scarlet, PAL.violet, PAL.orange][i % 4];
  const b = soft([[-44, 20], [44, 20], [48, 78], [-48, 78]], 1);
  const glyph = [[[0, 50, 0, 40, 6, '#fbe36e'], [0, 50, 1.57, 34, 6, '#fbe36e']], [[-12, 50, 1.2, 36, 6, '#fbe36e'], [12, 50, -1.2 + Math.PI, 36, 6, '#fbe36e']], [[0, 48, 0.8, 34, 8, '#fbe36e'], [0, 56, 0, 30, 5, '#fff4b8']], [[0, 50, 0, 44, 8, '#fbe36e']]][i % 4];
  return paint([{ line: [[-60, 0], [50, 0]], len: 20, wid: 4.5 }, { line: [[-30, 0], [-30, 20]], len: 8, wid: 2.5 }, { line: [[30, 0], [30, 20]], len: 8, wid: 2.5 },
    { shape: b, pal, tone: lr(100, 0.6, 0.6), flow: 0.05, len: 24, wid: 8, density: 3 }, { outline: b, wid: 4 }, strokes(glyph, 3)], 33 + i);
});

/** Golden winged ball. */
export function drawSnitch(S, x, y, s, t, a = 1) {
  const fl = Math.sin(t * 40) * 0.5;
  S.push(x, y, 0, s);
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) S.stroke(side * (16 + k * 9), -4 - k * 3 + fl * side * (8 + k * 6) * side, side * (-0.25 - fl * 0.6) + (side < 0 ? Math.PI : 0), 26 - k * 4, 6, k ? '#fbe36e' : '#fff4b8', a * 0.9, 0.8, 0, 0.1 * k + 0.3, true);
  for (let i = 0; i < 5; i++) S.stroke(Math.cos(i * 1.3) * 3, Math.sin(i * 1.3) * 3, i, 13, 9, i % 2 ? '#f7cf3a' : '#fbe36e', a, 1, 0, i * 0.17, true);
  S.pop();
}

export { limb };
