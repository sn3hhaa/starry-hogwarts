// SEQ 02 — The Letters (0:10 – 0:21)

import { fill, paint, strokes } from '../../engine/patch.js';
import { rect, soft } from '../../engine/geom.js';
import { clamp, ss, lerp, fract, TAU, pulse } from '../../engine/util.js';
import { swirlWarp } from '../../engine/film.js';
import { makeSky, star } from '../../art/sky.js';
import { room, windowParts, doorParts, fireplace } from '../../art/architecture.js';
import { letter, drawOwl, table, shadow, lantern } from '../../art/props.js';
import { drawTree, makeWater } from '../../art/nature.js';
import { glow, put, flame, rain, bolt, hash, smoke } from '../../art/fx.js';
import { harry, vernon, petunia, dudley } from '../../art/cast.js';
import { PAL } from '../../art/palette.js';
import { once, cam, blink, handheld } from '../common.js';
import { privet } from './seq01_boy_who_lived.js';

// Storm-at-sea set, shared with the hut exterior in sequence 3.
export const stormSet = once(() => {
  const rock = soft([[1180, 760], [1230, 640], [1330, 590], [1420, 560], [1560, 570], [1660, 620], [1740, 700], [1790, 770]], 1);
  const hut = [[1370, 572], [1378, 470], [1560, 462], [1572, 574]];
  const roof = [[1350, 476], [1440, 400], [1500, 396], [1592, 466]];
  return {
    sky: makeSky({ seed: 8, x: -600, y: -500, w: 3600, h: 1350, pal: PAL.storm, glow: ['#b4c8c4', '#d8e0d0'], accent: ['#2f4260', '#1c2648'], base: 0.3, contrast: 0.7, speed: 2.4, wind: 0.25,
      vortices: [{ x: 700, y: 120, r: 330, spin: 1, k: 3.4 }, { x: 1700, y: 60, r: 280, spin: -1, k: 3 }, { x: 2500, y: 200, r: 300, spin: 1, k: 3 }] }),
    sea: makeWater({ x: -600, y: 720, w: 3600, h: 500, pal: ['#070c1c', '#0c1630', '#142444', '#22385c', '#3a5878', '#7a9aa8'], seed: 12, len: 70 }),
    rock: paint([
      { shape: rock, pal: ['#07080f', '#0e1220', '#181e34', '#262e48'], tone: (x, y) => clamp(0.7 - (x - 1180) / 900), flow: (x) => 1.2 + Math.sin(x * 0.03) * 0.4, len: 34, wid: 10, density: 2.7 }, { outline: rock, wid: 5 },
      { shape: hut, pal: PAL.drab.slice(0, 5), tone: (x) => clamp(0.6 - (x - 1370) / 400), flow: 1.57, jit: 0.1, len: 26, wid: 8, density: 2.8 }, { outline: hut, wid: 4.5 },
      { shape: roof, pal: ['#141018', '#221a22', '#342a30'], flow: (x) => (x < 1470 ? -0.7 : 0.6), len: 26, wid: 8, density: 2.8 }, { outline: roof, wid: 4.5 },
      ...doorParts(1448, 574, 46, 84, { pal: PAL.earth.slice(0, 3) }),
      ...windowParts(1394, 500, 34, 34, { pal: ['#b4501a', '#d46e1e', '#e88c2a'] }),
    ], 13),
  };
});

const flashAt = (t, times) => { let f = 0; for (const [tt, k] of times) if (t >= tt) f = Math.max(f, k * Math.exp(-(t - tt) * 5) * (0.6 + 0.4 * Math.sin((t - tt) * 60))); return f; };

export const shots = {
  // ---------------------------------------------------------------- 10.4 – 12.4
  s04_years: {
    ground: '#0e1c54',
    tin: { dur: 1.0, kind: 'spiral', x: 960, y: 500, soft: 0.45, turns: 1.5, outWarp: (p) => swirlWarp(960, 500, p * p * 5.5, p * 0.6) },
    setup: privet,
    draw(S, t, d, st) {
      cam(S, t, 2.0, [-230, 10, 1.3], [-215, 30, 1.48], 0.2);
      const ph = t * 1.35 + 0.5, day = clamp(0.5 - 0.6 * Math.cos(ph * TAU) + 0.1), yr = fract(t * 0.5 + 0.1);
      S.ambient([lerp(0.55, 1.05, day), lerp(0.6, 1.0, day), lerp(0.9, 0.95, day)], 1);
      S.layer(0.14);
      st.sky.draw(S, 4 + t * 7, { lift: day * 0.62, mul: [1 + day * 0.5, 1 + day * 0.42, 1 + day * 0.1], noMoon: true, noStars: day > 0.5 });
      const an = ph * TAU - Math.PI / 2, sx = 700 + Math.sin(an) * 760, sy = 330 + Math.cos(an) * 430;
      if (sy < 420) star(S, sx, sy, 62, t * 5, 0.5, 1, [['#fffbe0', '#fff4b8'], ['#fbe36e', '#f7cf3a'], ['#f7cf3a', '#f0b21e'], ['#f0b21e', '#fbe36e'], ['#fbe36e']]);
      const mx = 700 - Math.sin(an) * 760, my = 330 - Math.cos(an) * 430;
      if (my < 420) star(S, mx, my, 46, t * 5, 0.8, 1, [['#f0ecd8', '#dcdfd6'], ['#b4d8ec', '#f0ecd8'], ['#7db2e0', '#b4d8ec'], ['#4a87d2']], 3);
      S.layer(0.5); S.draw(st.far);
      S.layer(0.8);
      [[250, 0], [760, 1], [1290, 2]].forEach(([x, i]) => put(S, st.houses[i], x, 840, 1.05));
      // the seasons turn in the garden tree
      const leaf = yr < 0.7 ? 1 : yr < 0.85 ? 1 - (yr - 0.7) / 0.15 : (yr - 0.85) / 0.15;
      const aut = pulse(yr, 0.55, 0.22);
      drawTree(S, st.tree, 1030, 840, 0.9, t * 4, { leaf, leafMul: [1 + aut * 1.9, 1 + aut * 0.35, 1 - aut * 0.5] });
      S.draw(st.hedge, { mul: [1 + aut * 0.5, 1, 1 - aut * 0.3] });
      S.layer(1); S.draw(st.street); S.draw(st.kerb);
      // window light flicks on at night
      if (day < 0.4) glow(S, 1250, 490, 90, t, { a: 0.5 });
    },
  },

  // ---------------------------------------------------------------- 12.4 – 14.8
  s05_dursleys: {
    ground: '#2a1a10',
    tin: { dur: 0.7, kind: 'wipe', angle: 0, soft: 0.5 },
    setup: () => ({
      room: room({ back: [520, 190, 1180, 560], wall: ['#7a5a2c', '#9a7636', '#b89244', '#d4b060'], floor: ['#5a3418', '#7a4a22', '#9a6430', '#b88444'], seed: 51 }),
      // staircase and the cupboard beneath it
      stair: paint([
        { shape: [[-140, 160], [560, 620], [560, 960], [-140, 1020]], pal: ['#0a1238', '#0e1c54', '#142c78', '#1c429c'], tone: (x, y) => clamp(0.15 + (y - 400) / 1400), flow: 1.4, len: 54, wid: 14, density: 2.4 },
        { line: [[-140, 160], [560, 620], [560, 960]], len: 44, wid: 8 },
        ...[0, 1, 2, 3, 4, 5].map((i) => ({ line: [[-140 + i * 116, 160 + i * 76], [-24 + i * 116, 160 + i * 76], [-24 + i * 116, 236 + i * 76]], len: 30, wid: 6, pal: PAL.earth.slice(1, 4) })),
        { shape: rect(150, 600, 260, 370), pal: ['#060a22', '#0a1238', '#0e1c54'], flow: 1.57, len: 40, wid: 12, density: 2.6 }, { line: rect(150, 600, 260, 370), closed: true, len: 34, wid: 7, pal: PAL.earth.slice(0, 2) },
        { shape: [[410, 600], [520, 650], [520, 1000], [410, 970]], pal: PAL.earth.slice(1, 5), flow: 1.57, len: 40, wid: 11, density: 2.6 }, { outline: [[410, 600], [520, 650], [520, 1000], [410, 970]], wid: 5 },
      ], 52),
      table: table(560, 160, PAL.earth), sh: shadow(120), lamp: lantern(),
      gifts: paint([
        { shape: rect(-60, -70, 120, 70), pal: PAL.scarlet.slice(1), flow: 0, len: 26, wid: 9, density: 2.8 }, { outline: rect(-60, -70, 120, 70), wid: 4 }, { line: [[0, -70], [0, 0]], len: 14, wid: 6, pal: PAL.gold.slice(2) },
        { shape: rect(-40, -124, 84, 54), pal: PAL.emerald.slice(1), flow: 0, len: 22, wid: 8, density: 2.8 }, { outline: rect(-40, -124, 84, 54), wid: 4 }, { line: [[-40, -98], [44, -98]], len: 14, wid: 6, pal: PAL.gold.slice(2) },
        { shape: rect(-24, -160, 52, 36), pal: PAL.violet.slice(2), flow: 0, len: 18, wid: 7, density: 2.8 }, { outline: rect(-24, -160, 52, 36), wid: 3.5 },
      ], 53),
      win: paint(windowParts(1380, 280, 200, 230, { lit: false, frame: 6 }), 54),
    }),
    draw(S, t, d, st) {
      cam(S, t, 2.4, [120, 0, 1.0], [-250, 60, 1.34], 0.3);
      S.ambient('#5a66a8', 0.62); S.light(1150, 330, 620, '#ffc860', 1.5);
      S.draw(st.room); S.draw(st.win); S.draw(st.stair);
      put(S, st.lamp, 1150, 190, 1.8); glow(S, 1150, 262, 120, t, { rings: 4 });
      const lg = Math.sin(t * 7);
      vernon().draw(S, { x: 930, y: 900, s: 0.92, t, yaw: 0.5, mouth: 0.9, open: 0.4 + 0.3 * lg, brow: 0.2, armF: [1.3, 0.9], armB: [0.2, 0.5], bob: lg * 3, blink: blink(t, 4) });
      petunia().draw(S, { x: 1170, y: 880, s: 0.9, t, yaw: 0.4, mouth: 0.7, armF: [0.9, 1.0], blink: blink(t, 5) });
      dudley().draw(S, { x: 1420, y: 900, s: 0.95, face: -1, t, yaw: 0.3, mouth: 1, open: 0.5, armF: [1.5 + 0.3 * Math.sin(t * 5), 0.8], armB: [1.2, 0.9], bob: Math.abs(Math.sin(t * 5)) * -6 });
      put(S, st.table, 1180, 960, 1); put(S, st.gifts, 1330, 800, 1);
      // Harry, alone in the cold
      put(S, st.sh, 285, 962, 0.7);
      harry('rags').draw(S, { x: 285, y: 958, s: 0.78, t, yaw: 0.75, tilt: 0.12, armF: [0.35, 2.0], armB: [-0.3, -2.0], mouth: -0.5, brow: 0.6, blink: blink(t, 6), look: [0.9, 0.1] });
    },
  },

  // ---------------------------------------------------------------- 14.8 – 16.4
  s06_owl: {
    ground: '#2a1a10',
    tin: { dur: 0.5, kind: 'radial', x: 1000, y: 520, soft: 0.5 },
    setup: () => ({
      room: room({ back: [380, 120, 1160, 760], wall: ['#5a4a30', '#766240', '#927c52', '#ae9866'], floor: ['#4a2c16', '#6c4420', '#8e602e'], seed: 61 }),
      door: paint([...doorParts(820, 880, 300, 620, { pal: PAL.emerald.slice(0, 4) }), { shape: rect(900, 600, 140, 24), pal: ['#07080f', '#161a2a'], flow: 0, len: 24, wid: 8, under: false }, { line: rect(900, 600, 140, 24), closed: true, len: 20, wid: 4, pal: PAL.gold.slice(1, 4) }], 62),
      win: paint([{ shape: rect(1210, 300, 230, 280), pal: PAL.night.slice(0, 5), flow: -0.3, len: 34, wid: 10, density: 2.6 }, { line: rect(1210, 300, 230, 280), closed: true, len: 30, wid: 8, pal: PAL.earth.slice(0, 3) }, { line: [[1325, 300], [1325, 580]], len: 24, wid: 5, pal: PAL.earth.slice(0, 3) }], 63),
      mat: paint([{ shape: [[800, 900], [1140, 900], [1190, 960], [750, 960]], pal: PAL.ochre.slice(0, 4), flow: 0.03, len: 30, wid: 9, density: 2.8 }, { outline: [[800, 900], [1140, 900], [1190, 960], [750, 960]], wid: 4 }], 64),
      sh: shadow(120),
    }),
    draw(S, t, d, st) {
      cam(S, t, 1.6, [0, 0, 1.06], [30, 60, 1.3], 0.3);
      S.ambient('#7a82b0', 0.75); S.light(970, 610, 380, '#ffd870', 1.2 * ss(0, 0.5, t));
      S.draw(st.room); S.draw(st.win);
      star(S, 1270, 350, 15, t, 0.4); star(S, 1400, 420, 11, t, 0.9);
      const land = ss(0, 0.9, t);
      drawOwl(S, lerp(1150, 1330, land), lerp(330, 560, land), 0.85, t, { flap: land < 1 ? Math.sin(t * 14) * 0.7 : 0.9 + 0.05 * Math.sin(t * 3), face: -1, unlit: true });
      S.draw(st.door); S.draw(st.mat);
      const fall = ss(0.25, 1.0, t);
      const lx = 970 + Math.sin(fall * 5) * 40 * (1 - fall), ly = lerp(612, 915, fall * fall);
      const grab = ss(1.0, 1.5, t);
      put(S, st.sh, lerp(520, 740, ss(0.2, 1.1, t)), 962, 0.8);
      harry('rags').draw(S, { x: lerp(500, 740, ss(0.2, 1.1, t)), y: 958, s: 1.02, t, walk: t < 1.1 ? t * 2.2 : null, yaw: 0.8, bend: 0.5 * grab, tilt: 0.15 * grab, armF: [0.3 + 1.0 * grab, 0.2], brow: 0.8, mouth: 0.2 + 0.4 * grab, blink: blink(t, 6), look: [0.8, 0.5] });
      put(S, letter(), lx, ly - grab * 40, 1.5, Math.sin(fall * 7) * 0.6 * (1 - fall), { unlit: true });
      glow(S, lx, ly - grab * 40, 80, t, { a: 0.5, noCore: true, rings: 3 });
    },
  },

  // ---------------------------------------------------------------- 16.4 – 19.2
  s07_flood: {
    ground: '#2a1a10',
    tin: { dur: 0.5, kind: 'radial', x: 1300, y: 720, soft: 0.5 },
    setup: () => ({
      room: room({ back: [420, 160, 1120, 640], wall: ['#6a4a2c', '#886238', '#a67c46', '#c49a5a'], floor: ['#4a2c16', '#6c4420', '#8e602e', '#ac7c40'], seed: 71 }),
      fire: fireplace(380, 330),
      sh: shadow(130),
      win: paint(windowParts(520, 260, 190, 240, { lit: false, frame: 6 }), 72),
    }),
    draw(S, t, d, st) {
      const k = ss(0, 2.6, t);
      const hh = handheld(t, 1.5, 3);
      S.camera(hh[0] + 30 * k, hh[1], 1.0 + 0.1 * k, hh[2] + Math.sin(t * 2) * 0.012);
      S.ambient('#8a7a9a', 0.7); S.light(1250, 700, 700, '#ffc050', 1.3 + 0.3 * Math.sin(t * 9));
      S.draw(st.room); S.draw(st.win);
      put(S, st.fire, 1250, 802, 1);
      flame(S, 1250, 796, 150, 240, t, { n: 46, pal: ['#fff8d0', '#fdf0b8', '#f8e08a', '#f0cc5a', '#e0b23a'], rate: 2 });
      const L = letter();
      // letters behind the figures
      const drawLetters = (front) => {
        for (let i = 0; i < 300; i++) {
          const isFront = i % 3 === 0;
          if (isFront !== front) continue;
          const born = hash(i, 1) * 2.0, life = t - born;
          if (life < 0) continue;
          const dir = i % 2 ? 1 : -1;
          const an = hash(i, 2) * TAU + life * (1.5 + hash(i, 3)) * dir;
          const rad = (120 + life * 330) * (0.5 + hash(i, 4));
          const u = clamp(life * 1.8);
          const cx = lerp(1250, 960 + Math.cos(an) * rad, u), cy = lerp(700, 520 + Math.sin(an) * rad * 0.62 - life * 30, u);
          const sc = (front ? 1.5 + hash(i, 5) * 1.4 : 0.6 + hash(i, 5) * 0.6) * clamp(life * 4);
          put(S, L, cx, cy, sc, an * 1.7 + i, { every: front ? 1 : 1, unlit: false });
        }
      };
      drawLetters(false);
      put(S, st.sh, 1560, 964); put(S, st.sh, 760, 964, 0.8);
      const fl = Math.sin(t * 13);
      vernon().draw(S, { x: 1560, y: 958, s: 1.0, face: -1, t, yaw: 0.3, brow: -1, mouth: -0.8, open: 0.8, armF: [2.4 + 0.5 * fl, 0.5], armB: [-2.3 + 0.5 * fl, -0.6], lean: 0.08 * fl, bob: -Math.abs(fl) * 8 });
      const jump = Math.abs(Math.sin(t * 3.4));
      harry('rags').draw(S, { x: 760, y: 958 - jump * 90, s: 1.05, t, yaw: 0.3, tilt: -0.15, brow: 1, mouth: 1, open: 0.6, armF: [2.7, 0.2], armB: [-2.6, -0.2], legF: 0.3 * jump, legB: -0.3 * jump, blink: blink(t, 6), look: [0.3, -0.6] });
      S.layer(1.25); drawLetters(true);
    },
  },

  // ---------------------------------------------------------------- 19.2 – 21.0
  s08_letterflight: {
    ground: '#0b1020',
    tin: { dur: 0.6, kind: 'radial', x: 960, y: 520, soft: 0.6 },
    setup: stormSet,
    draw(S, t, d, st) {
      const k = ss(0, 1.8, t);
      const hh = handheld(t, 2, 5);
      const fl = flashAt(t, [[1.0, 0.7]]);
      S.camera(-900 + 900 * k * k + hh[0], -40 + hh[1], 1.0, -0.05 + hh[2]);
      S.ambient('#8090b8', 0.8 + fl);
      S.layer(0.2); st.sky.draw(S, t * 1.4, { lift: fl * 0.5 });
      if (fl > 0.2) bolt(S, 2300, -200, 2100, 520, 3, fl);
      S.layer(0.7); st.sea.draw(S, t * 2, { lift: fl * 0.3 });
      S.layer(0.85); S.draw(st.rock, { mul: [0.75 + fl, 0.75 + fl, 0.85 + fl] });
      glow(S, 1411, 517, 46, t, { a: 0.7, pal: ['#f2aa4a', '#e88c2a', '#d46e1e', '#b4501a'], rings: 3 });
      S.layer(1);
      // the letter: big and close, then small and far, always just ahead of the camera
      const lx = S.cam.x + lerp(860, 1300, k), ly = lerp(520, 470, k) + Math.sin(t * 9) * 26 + S.cam.y;
      const sc = lerp(4.6, 0.7, Math.pow(k, 0.7));
      put(S, letter(), lx, ly, sc, Math.sin(t * 7) * 0.35 - 0.2, { unlit: true });
      for (let i = 0; i < 9; i++) S.stroke(lx - 60 * sc - i * 46 * sc * 0.5, ly + Math.sin(t * 9 - i * 0.5) * 22, 0.05, 60 * sc * 0.5, 6, i % 2 ? '#fbe36e' : '#fff4b8', 0.6 * (1 - i / 9), 0.6, 0, i * 0.1, true);
      S.layer(1.3); rain(S, t, { n: 260, a: 0.45 });
    },
  },
};
