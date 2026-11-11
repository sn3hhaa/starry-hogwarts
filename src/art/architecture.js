// Built world: houses, the castle, crooked shops, painted interiors.
// Builders return stroke patches in local space (origin = bottom centre unless noted).

import { paint, strokes } from '../engine/patch.js';
import { rect, soft, ellipse } from '../engine/geom.js';
import { RNG } from '../engine/rng.js';
import { clamp, lerp } from '../engine/util.js';
import { PAL, INK } from './palette.js';

const lr = (w, bias = 0.6, k = 0.5) => (x) => clamp(bias - (x / w) * k);

/** Lit window parts: warm pane, glazing bars, optional sill. */
export function windowParts(x, y, w, h, o = {}) {
  const lit = o.lit ?? true;
  const pal = lit ? (o.pal ?? PAL.lamp) : (o.dark ?? ['#0e1c54', '#142c78', '#1c429c']);
  const p = [
    { shape: rect(x, y, w, h), pal, flow: 1.57, len: Math.max(8, h * 0.45), wid: Math.max(4, w * 0.3), density: 3.2, under: false, thick: 0.9, jit: 0.15 },
    { line: rect(x, y, w, h), closed: true, len: Math.max(7, w * 0.5), wid: o.frame ?? 3.2, pal: o.ink ?? INK, wob: 0.5 },
  ];
  if (o.bars ?? (w > 16)) p.push({ line: [[x + w / 2, y], [x + w / 2, y + h]], len: 10, wid: 2.4, pal: o.ink ?? INK, wob: 0.4 }, { line: [[x, y + h * 0.45], [x + w, y + h * 0.45]], len: 10, wid: 2.4, pal: o.ink ?? INK, wob: 0.4 });
  return p;
}

/** Arched opening polygon (origin bottom-left). */
export function arch(x, y, w, h, n = 10) {
  const pts = [[x, y]];
  const r = w / 2, cy = y - h + r;
  for (let i = 0; i <= n; i++) { const a = Math.PI + (i / n) * Math.PI; pts.push([x + r + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  pts.push([x + w, y]);
  return pts;
}

/** Suburban house (Privet Drive). o: { w, h, wall, roof, lit:[bool,bool,bool,bool], seed, door } */
export function house(o = {}) {
  const w = o.w ?? 360, h = o.h ?? 230, rh = o.rh ?? 120;
  const wall = o.wall ?? ['#3a4a78', '#4c5e90', '#6478a8', '#8094bc'];
  const roof = o.roof ?? ['#141c3c', '#1e2a54', '#2a3a6c', '#3c5088'];
  const lit = o.lit ?? [true, false, true, false];
  const body = rect(-w / 2, -h, w, h);
  const roofS = [[-w / 2 - 22, -h + 4], [-w * 0.3, -h - rh], [w * 0.3, -h - rh], [w / 2 + 22, -h + 4]];
  const ch = rect(w * 0.16, -h - rh - 40, 34, 70);
  const ww = w * 0.2, wh = h * 0.27;
  const parts = [
    { shape: ch, pal: PAL.orange.slice(0, 3), flow: 0, len: 16, wid: 6, density: 2.6 }, { outline: ch, wid: 3 },
    { shape: body, pal: wall, tone: lr(w, 0.55, 0.6), flow: 0.02, len: 34, wid: 9, density: 2.5 },
    { shape: roofS, pal: roof, tone: lr(w, 0.6, 0.7), flow: (x) => (x < 0 ? -0.5 : 0.5), len: 34, wid: 9, density: 2.6 },
    { outline: roofS, wid: 4.5 }, { outline: body, wid: 4.5 },
    ...windowParts(-w * 0.36, -h * 0.9, ww, wh, { lit: lit[0] }), ...windowParts(w * 0.16, -h * 0.9, ww, wh, { lit: lit[1] }),
    ...windowParts(-w * 0.36, -h * 0.42, ww, wh, { lit: lit[2] }),
  ];
  if (o.door ?? true) {
    const d = rect(w * 0.14, -h * 0.5, w * 0.16, h * 0.5);
    parts.push({ shape: d, pal: o.doorPal ?? PAL.emerald.slice(0, 3), flow: 1.57, len: 22, wid: 7, density: 2.6, under: false }, { outline: d, wid: 3.5 },
      strokes([[w * 0.27, -h * 0.24, 0, 7, 5, '#f7cf3a']], 2));
  } else parts.push(...windowParts(w * 0.16, -h * 0.42, ww, wh, { lit: lit[3] }));
  return paint(parts, o.seed ?? 1);
}

/**
 * Hogwarts. Returns { body, lights, w, h } with origin at the base centre.
 * A cliff-top cluster of towers, a great hall, battlements and a viaduct.
 */
export function castle(seed = 7) {
  const r = RNG(seed);
  const stone = ['#161e50', '#22306e', '#32468e', '#4864ac', '#6a88c8', '#96b2e0'];
  const roofP = ['#0a1230', '#12203f', '#1c3458', '#2c5074', '#44789a'];
  const parts = [], lights = [];
  const win = (x, y, w = 12, h = 21) => lights.push([x, y, 1.57, h, w, r() > 0.3 ? '#fad648' : '#f4b62a', 1, 0.95], [x, y, 1.57, h * 0.55, w * 0.55, '#fff8d0', 1, 1]);

  // cliff
  const cliff = soft([[-620, 0], [-560, -120], [-420, -150], [-300, -210], [-120, -230], [120, -240], [300, -215], [430, -160], [540, -120], [640, 0]], 1);
  parts.push({ shape: cliff, pal: ['#0c1434', '#141e4a', '#1e2c62', '#2a3c7a', '#3c5494'], tone: (x, y) => clamp(0.75 - x / 1400 + y / 500), flow: (x, y) => 1.2 + Math.sin(x * 0.02) * 0.5, len: 40, wid: 11, density: 2.5 }, { outline: cliff, wid: 5 });

  const tower = (x, base, w, h, rh, wins = 4) => {
    const b = rect(x - w / 2, base - h, w, h);
    const cone = [[x - w / 2 - 8, base - h + 2], [x - 3, base - h - rh], [x + 3, base - h - rh], [x + w / 2 + 8, base - h + 2]];
    parts.push({ shape: b, pal: stone, tone: (px) => clamp(0.72 - ((px - x) / w + 0.5) * 0.7), flow: 1.57, jit: 0.12, len: 30, wid: 8, density: 2.7 },
      { outline: b, wid: 4 },
      { shape: cone, pal: roofP, tone: (px) => clamp(0.75 - ((px - x) / w + 0.5) * 0.7), flow: (px) => (px < x ? -1.25 : -1.9), len: 28, wid: 8, density: 2.8 },
      { outline: cone, wid: 4 },
      strokes([[x, base - h - rh - 12, -1.57, 26, 3, '#0a1230']], 1));
    for (let i = 0; i < wins; i++) win(x + (r() - 0.5) * w * 0.4, base - h + 30 + (i / wins) * (h - 60) + r() * 14);
  };
  const block = (x, base, w, h, crenel = true, rows = 2) => {
    const b = rect(x - w / 2, base - h, w, h);
    parts.push({ shape: b, pal: stone, tone: (px) => clamp(0.66 - ((px - x) / w + 0.5) * 0.55), flow: 0.03, len: 30, wid: 8, density: 2.6 }, { outline: b, wid: 4 });
    if (crenel) for (let cx = x - w / 2 + 8; cx < x + w / 2 - 6; cx += 22) parts.push({ shape: rect(cx, base - h - 10, 12, 12), pal: stone.slice(1, 4), flow: 0, len: 10, wid: 6, density: 3, under: false });
    for (let j = 0; j < rows; j++) for (let cx = x - w / 2 + 22; cx < x + w / 2 - 14; cx += 30 + r() * 16) if (r() > 0.25) win(cx, base - h + 26 + j * 42 + r() * 8, 8, 15);
  };

  // far towers
  tower(-330, -150, 54, 210, 110, 3); tower(350, -165, 60, 250, 130, 4); tower(205, -225, 44, 250, 110, 3);
  // curtain walls + viaduct
  block(-250, -180, 220, 96); block(250, -200, 240, 104);
  const via = rect(-640, -128, 250, 26);
  parts.push({ shape: via, pal: stone, flow: 0, len: 30, wid: 8, density: 2.6 }, { outline: via, wid: 3.5 });
  for (let i = 0; i < 4; i++) { const ax = -630 + i * 58; parts.push({ shape: rect(ax, -104, 16, 110), pal: stone.slice(0, 4), flow: 1.57, len: 24, wid: 7, density: 2.6 }); }
  // great hall
  const hall = rect(-150, -330, 250, 130);
  const hallRoof = [[-162, -328], [-120, -420], [70, -420], [112, -328]];
  parts.push({ shape: hall, pal: stone, tone: (px) => clamp(0.68 - (px + 150) / 250 * 0.55), flow: 1.57, jit: 0.1, len: 30, wid: 8, density: 2.6 }, { outline: hall, wid: 4 },
    { shape: hallRoof, pal: roofP, tone: (px) => clamp(0.7 - (px + 160) / 270 * 0.6), flow: -0.1, len: 30, wid: 8, density: 2.7 }, { outline: hallRoof, wid: 4 });
  for (let i = 0; i < 6; i++) lights.push([-124 + i * 38, -262, 1.57, 62, 13, '#fad648', 1, 1], [-124 + i * 38, -268, 1.57, 36, 6, '#fff8d0', 1, 1]);
  // main towers
  tower(-190, -215, 70, 300, 150, 5); tower(-50, -330, 56, 250, 140, 4); tower(120, -230, 84, 330, 170, 6);
  tower(40, -225, 40, 190, 90, 2); tower(-110, -225, 36, 150, 80, 2); tower(-420, -140, 46, 150, 90, 2); tower(455, -150, 50, 170, 100, 3);
  // gatehouse
  block(-20, -222, 120, 70, true, 1);
  const gate = arch(-38, -222, 36, 52);
  parts.push({ shape: gate, pal: PAL.lamp.slice(0, 3), flow: 1.57, len: 14, wid: 6, density: 3, under: false }, { outline: gate, wid: 3 });

  return { body: paint(parts, seed), lights: strokes(lights, seed + 3), w: 1280, h: 800 };
}

/** Crooked Diagon Alley shopfront. o: { w, h, lean, wall, awning, sign, seed, floors } */
export function shop(o = {}) {
  const w = o.w ?? 300, h = o.h ?? 520, k = o.lean ?? 0.06, seed = o.seed ?? 1;
  const r = RNG(seed * 31);
  const wall = o.wall ?? PAL.stoneWarm;
  const sk = (x, y) => [x + (-y) * k, y];                 // lean the whole building
  const q = (x, y, ww, hh) => [sk(x, y), sk(x + ww, y), sk(x + ww, y + hh), sk(x, y + hh)];
  const body = q(-w / 2, -h, w, h);
  const roofS = [sk(-w / 2 - 16, -h + 4), sk(-w * 0.12, -h - (o.rh ?? 110)), sk(w * 0.2, -h - (o.rh ?? 110) * 0.9), sk(w / 2 + 16, -h + 4)];
  const parts = [
    { shape: body, pal: wall, tone: (x, y) => clamp(0.35 + (y + h) / h * 0.5 - x / w * 0.25), flow: 1.5 + k, len: 34, wid: 9, density: 2.5 },
    { shape: roofS, pal: o.roof ?? ['#1a1430', '#2a2048', '#3c3064', '#544680'], flow: (x) => (x < 0 ? -0.6 : 0.6), len: 30, wid: 9, density: 2.6 },
    { outline: roofS, wid: 4.5 }, { outline: body, wid: 4.5 },
  ];
  // timber frames
  for (let j = 1; j < (o.floors ?? 3); j++) { const y = -h * (j / (o.floors ?? 3)) - 150 * (1 - j / 3) * 0; parts.push({ line: [sk(-w / 2, y - 130), sk(w / 2, y - 130)], len: 26, wid: 5, pal: PAL.earth.slice(0, 2) }); }
  // upper windows
  const cols = w > 260 ? 3 : 2;
  for (let j = 0; j < (o.floors ?? 3) - 1; j++) for (let i = 0; i < cols; i++) {
    const wx = -w / 2 + (i + 0.5) * (w / cols) - 22, wy = -h + 40 + j * 120;
    const p0 = sk(wx, wy);
    parts.push(...windowParts(p0[0], p0[1], 44, 62, { lit: r() > 0.25, pal: r() > 0.5 ? PAL.lamp : ['#e8961a', '#f4b62a', '#fad648'] }));
  }
  // shop window + door (ground floor glows)
  const gw = q(-w / 2 + 18, -150, w * 0.58, 104);
  parts.push({ shape: gw, pal: PAL.lamp, tone: (x, y) => clamp(0.9 + y / 400), flow: 1.57, len: 26, wid: 9, density: 3, under: false, thick: 0.9 }, { outline: gw, wid: 4 },
    { line: [sk(-w / 2 + 18 + w * 0.29, -150), sk(-w / 2 + 18 + w * 0.29, -46)], len: 14, wid: 3 }, { line: [sk(-w / 2 + 18, -100), sk(-w / 2 + 18 + w * 0.58, -100)], len: 14, wid: 3 });
  const door = q(w * 0.2, -140, w * 0.2, 140);
  parts.push({ shape: door, pal: o.door ?? PAL.emerald.slice(0, 4), flow: 1.57, len: 24, wid: 8, density: 2.6, under: false }, { outline: door, wid: 4 });
  // awning
  if (o.awning) {
    const aw = [sk(-w / 2 - 6, -176), sk(w / 2 + 6, -176), [w / 2 + 34, -128], [-w / 2 - 34, -128]];
    parts.push({ shape: aw, pal: o.awning, flow: 1.3, len: 26, wid: 9, density: 2.8, tone: (x) => clamp(0.5 + Math.sin(x * 0.12) * 0.5) }, { outline: aw, wid: 4 });
  }
  return paint(parts, seed);
}

/**
 * Interior box in forced perspective, like The Bedroom: a back wall and
 * converging floor, side walls, ceiling. Coordinates are frame space.
 * o: { back:[x,y,w,h], wall, wallL, wallR, floor, ceil, planks, seed, outer }
 */
export function room(o = {}) {
  const [bx, by, bw, bh] = o.back ?? [560, 250, 800, 480];
  const O = o.outer ?? [-120, -120, 2160, 1320];
  const TL = [O[0], O[1]], TR = [O[0] + O[2], O[1]], BR = [O[0] + O[2], O[1] + O[3]], BL = [O[0], O[1] + O[3]];
  const a = [bx, by], b = [bx + bw, by], c = [bx + bw, by + bh], d = [bx, by + bh];
  const wall = o.wall ?? ['#3c6a84', '#4f829a', '#68a0b2', '#8abac4'];
  const floor = o.floor ?? PAL.ochre;
  const vp = [bx + bw / 2, by + bh / 2];
  const toVP = (x, y) => Math.atan2(vp[1] - y, vp[0] - x);
  const sz = o.stroke ?? 1;
  const parts = [
    { shape: [TL, TR, b, a], pal: o.ceil ?? wall.slice(0, 3), flow: toVP, len: 60 * sz, wid: 15 * sz, density: 2.2, hug: false },
    { shape: [TL, a, d, BL], pal: o.wallL ?? wall, tone: (x) => clamp(0.25 + (x - O[0]) / (bx - O[0]) * 0.5), flow: toVP, len: 56 * sz, wid: 14 * sz, density: 2.3, hug: false },
    { shape: [b, TR, BR, c], pal: o.wallR ?? wall, tone: (x) => clamp(0.8 - (x - bx - bw) / (O[0] + O[2] - bx - bw) * 0.5), flow: toVP, len: 56 * sz, wid: 14 * sz, density: 2.3, hug: false },
    { shape: [a, b, c, d], pal: wall, tone: (x, y) => clamp(0.4 + (x - bx) / bw * 0.3 - (y - by) / bh * 0.15 + 0.2), flow: o.backFlow ?? 1.5, jit: 0.2, len: 46 * sz, wid: 12 * sz, density: 2.4 },
    { shape: [d, c, BR, BL], pal: floor, tone: (x, y) => clamp(0.35 + (y - by - bh) / (O[1] + O[3] - by - bh) * 0.5), flow: toVP, len: 64 * sz, wid: 15 * sz, density: 2.3, hug: false },
  ];
  // plank / corner lines
  const ink = o.ink ?? INK;
  const n = o.planks ?? 7;
  for (let i = 0; i <= n; i++) { const u = i / n; parts.push({ line: [[lerp(d[0], c[0], u), d[1]], [lerp(BL[0], BR[0], u), BL[1]]], len: 40, wid: 3.4, pal: o.plankInk ?? PAL.earth.slice(0, 2), alpha: 0.85 }); }
  parts.push({ line: [a, b, c, d], closed: true, len: 34, wid: 4.2, pal: ink }, { line: [TL, a], len: 40, wid: 4, pal: ink }, { line: [TR, b], len: 40, wid: 4, pal: ink }, { line: [BL, d], len: 40, wid: 4.5, pal: ink }, { line: [BR, c], len: 40, wid: 4.5, pal: ink });
  return paint(parts, o.seed ?? 2);
}

/** Stone wall with coursed blocks. */
export function stoneWall(shape, o = {}) {
  const pal = o.pal ?? PAL.stone;
  const xs = shape.map((p) => p[0]), ys = shape.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const bh = o.block ?? 70, parts = [{ shape, pal, tone: o.tone, flow: o.flow ?? 0.04, len: o.len ?? 44, wid: o.wid ?? 12, density: 2.4, hug: o.hug ?? false, jit: 0.18 }];
  let row = 0;
  for (let y = y0 + bh; y < y1; y += bh, row++) {
    parts.push({ line: [[x0, y], [x1, y]], len: 34, wid: 3.2, pal: o.ink ?? [pal[0]], alpha: 0.8, wob: 1.5 });
    for (let x = x0 + (row % 2 ? bh * 0.9 : bh * 1.8); x < x1; x += bh * 1.8) parts.push({ line: [[x, y - bh], [x, y]], len: 28, wid: 2.8, pal: o.ink ?? [pal[0]], alpha: 0.7, wob: 1.5 });
  }
  return parts;
}

/** Perspective chequerboard: corners [TL, TR, BR, BL]. */
export function checker(corners, nx, ny, palA, palB, seed = 4) {
  const [TL, TR, BR, BL] = corners;
  const P = (u, v) => {
    const vv = Math.pow(v, 1.6); // foreshorten
    const ax = lerp(TL[0], TR[0], u), ay = lerp(TL[1], TR[1], u), bx = lerp(BL[0], BR[0], u), by = lerp(BL[1], BR[1], u);
    return [lerp(ax, bx, vv), lerp(ay, by, vv)];
  };
  const parts = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const q = [P(i / nx, j / ny), P((i + 1) / nx, j / ny), P((i + 1) / nx, (j + 1) / ny), P(i / nx, (j + 1) / ny)];
    const s = 0.5 + 0.9 * (j / ny);
    parts.push({ shape: q, pal: (i + j) % 2 ? palA : palB, flow: 0.03, len: 44 * s, wid: 11 * s, density: 2.5, under: false, jit: 0.12, tone: () => clamp(0.35 + j / ny * 0.5) });
  }
  for (let i = 0; i <= nx; i++) parts.push({ line: [P(i / nx, 0), P(i / nx, 1)], len: 40, wid: 3.4, pal: INK, alpha: 0.8 });
  for (let j = 0; j <= ny; j++) parts.push({ line: [P(0, j / ny), P(1, j / ny)], len: 40, wid: 3.4, pal: INK, alpha: 0.8 });
  return { patch: paint(parts, seed), P };
}

/** Heavy wooden door with iron bands (origin bottom-left). */
export function doorParts(x, y, w, h, o = {}) {
  const s = o.arch ? arch(x, y, w, h) : rect(x, y - h, w, h);
  const p = [{ shape: s, pal: o.pal ?? PAL.earth.slice(0, 5), tone: (px) => clamp(0.3 + (px - x) / w * 0.5), flow: 1.57, jit: 0.08, len: 40, wid: 10, density: 2.6 }, { outline: s, wid: 5.5 }];
  for (const f of [0.25, 0.7]) p.push({ line: [[x + 4, y - h * f], [x + w - 4, y - h * f]], len: 22, wid: 6, pal: ['#10121e', '#22263a'] });
  p.push(strokes([[x + w * 0.82, y - h * 0.45, 0, 12, 9, '#c8a060', 1, 1]], 3));
  return p;
}

/** Fireplace surround (origin bottom centre). The fire itself is fx.flame. */
export function fireplace(w = 300, h = 260, pal = PAL.stoneWarm) {
  const outer = rect(-w / 2, -h, w, h), inner = arch(-w * 0.3, 0, w * 0.6, h * 0.66);
  return paint([
    ...stoneWall(outer, { pal, block: 46, len: 30, wid: 9, hug: true }), { outline: outer, wid: 5 },
    { shape: rect(-w / 2 - 18, -h - 22, w + 36, 26), pal: pal.slice(1), flow: 0, len: 34, wid: 9, density: 2.6 }, { outline: rect(-w / 2 - 18, -h - 22, w + 36, 26), wid: 4 },
    { shape: inner, pal: ['#07080f', '#140c0a', '#2a1410'], flow: 1.57, len: 28, wid: 9, density: 2.8 }, { outline: inner, wid: 4.5 },
  ], 6);
}

export { ellipse };
