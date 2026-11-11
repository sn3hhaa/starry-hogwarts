// SEQ 04 — Entering the Magical World (0:30 – 0:42)

import { fill, paint, strokes } from '../../engine/patch.js';
import { rect, soft, ellipse } from '../../engine/geom.js';
import { RNG } from '../../engine/rng.js';
import { clamp, ss, lerp, TAU } from '../../engine/util.js';
import { makeSky } from '../../art/sky.js';
import { shop, room, arch, stoneWall } from '../../art/architecture.js';
import { book, drawOwl, lantern, sign, wand, drawTrain, shadow, sunflowers } from '../../art/props.js';
import { hill, cypress, drawCypress } from '../../art/nature.js';
import { glow, put, putf, smoke, swirl, sparkle, motes, hash } from '../../art/fx.js';
import { harry, hagrid, mcgonagall, petunia, goon, quirrell } from '../../art/cast.js';
import { PAL } from '../../art/palette.js';
import { cam, blink, handheld } from '../common.js';

export const shots = {
  // ---------------------------------------------------------------- 30.2 – 35.2
  s12_diagon: {
    ground: '#0e1c54',
    tin: { dur: 0.9, kind: 'radial', x: 960, y: 640, soft: 0.5 },
    setup: () => {
      const W = [PAL.stoneWarm, ['#4a3a5a', '#62507a', '#7c6a98', '#9a88b4'], ['#3a4a44', '#506458', '#6a8070', '#88a08c'], ['#5a3a2a', '#7a5238', '#9a6c48', '#b88a5e'], ['#3c4468', '#525c84', '#6c78a0', '#8a96ba']];
      const aw = [PAL.gold.slice(1), PAL.scarlet.slice(1), PAL.gold.slice(1), PAL.emerald.slice(1), PAL.orange.slice(1)];
      const shops = [];
      for (let i = 0; i < 6; i++) shops.push(shop({ seed: 20 + i, w: 300 + (i % 3) * 40, h: 500 + (i % 2) * 90, lean: (i % 2 ? -1 : 1) * (0.04 + (i % 3) * 0.025), wall: W[i % 5], awning: aw[i % 5], rh: 90 + (i % 3) * 40 }));
      const bank = paint([
        { shape: rect(-150, -420, 300, 420), pal: PAL.white.slice(0, 5), tone: (x) => clamp(0.7 - x / 500), flow: 1.57, jit: 0.1, len: 34, wid: 9, density: 2.6 }, { outline: rect(-150, -420, 300, 420), wid: 4.5 },
        { shape: ellipse(0, -420, 120, 90, 18).filter((p) => p[1] <= -419), pal: PAL.gold.slice(1), flow: { ring: [0, -420] }, len: 28, wid: 8, density: 2.8 },
        ...[-110, -55, 0, 55, 110].map((x) => ({ shape: rect(x - 11, -330, 22, 330), pal: PAL.white.slice(2), flow: 1.57, len: 30, wid: 7, density: 2.8, under: false })),
        { shape: arch(-34, 0, 68, 120), pal: PAL.lamp, flow: 1.57, len: 18, wid: 8, density: 3, under: false },
      ], 27);
      return {
        sky: makeSky({ seed: 30, x: -400, y: -500, w: 2720, h: 1300, base: 0.3, stars: [{ x: 420, y: -80, r: 34 }, { x: 760, y: 120, r: 24 }, { x: 1150, y: -40, r: 30 }, { x: 1500, y: 150, r: 26 }, { x: 960, y: 260, r: 18 }, { x: 1320, y: 330, r: 16 }, { x: 610, y: 340, r: 16 }], vortices: [{ x: 960, y: -160, r: 300, spin: 1, k: 2.4 }] }),
        shops, bank,
        cobble: fill([[-500, 1300], [860, 770], [1060, 770], [2420, 1300]], { pal: ['#1c2658', '#2e3a78', '#4a5a9a', '#c8802a', '#e8a83a', '#f4cc5a'], tone: (x, y) => clamp(0.2 + Math.abs(x - 960) / 1500 * 0.9 * clamp((y - 760) / 300) + 0.15 * Math.sin(x * 0.05 + y * 0.09)), spread: 0.3, flow: (x, y) => Math.atan2(y - 720, x - 960) + 1.57, curve: 0.25, len: 30, wid: 13, density: 2.5, hug: false, seed: 31 }),
        sh: shadow(120), book: book(), lan: lantern(),
        crowd: [mcgonagall(), petunia(), goon(1), quirrell()],
      };
    },
    draw(S, t, d, st) {
      const k = ss(0, 5, t);
      const hh = handheld(t, 0.7, 4);
      S.camera(hh[0] + Math.sin(t * 0.6) * 30, -40 + 70 * k + hh[1], 1.0 + 0.5 * k, hh[2]);
      S.ambient('#8890c8', 0.85);
      S.light(330, 720, 520, '#ffc050', 1.1); S.light(1590, 720, 520, '#ffc050', 1.1); S.light(960, 700, 380, '#ffd880', 0.7);
      S.layer(0.1); st.sky.draw(S, t);
      S.layer(0.35); put(S, st.bank, 960, 800, 0.62, 0, { unlit: true });
      glow(S, 960, 745, 60, t, { a: 0.6, rings: 3 });
      S.layer(0.5); put(S, st.shops[4], 730, 815, 0.52, 0, { unlit: true }); putf(S, st.shops[5], 1190, 815, -0.52, 0.52, 0, { unlit: true });
      S.layer(0.7); put(S, st.shops[2], 520, 850, 0.78, 0, { unlit: true }); putf(S, st.shops[3], 1400, 850, -0.78, 0.78, 0, { unlit: true });
      S.layer(1); S.draw(st.cobble);
      // passers-by
      st.crowd.forEach((c, i) => { const x = [700, 1240, 1100, 800][i], dir = i % 2 ? 1 : -1; c.draw(S, { x: x + dir * t * 26, y: 850 + i * 12, s: 0.36 + i * 0.03, face: dir, t: t + i, walk: t * 1.6 + i * 0.3, mul: [0.5, 0.5, 0.75], yaw: 0.6 }); });
      put(S, st.shops[0], 170, 960, 1.15); putf(S, st.shops[1], 1750, 960, -1.15, 1.15, 0);
      for (const [x, y, r] of [[330, 760, 110], [1590, 760, 110], [560, 760, 60], [1360, 760, 60]]) glow(S, x, y, r, t, { a: 0.55, noCore: true, rings: 4, seed: x * 0.001 });
      // Harry and Hagrid walk into the alley
      const w = t * 1.5, wy = lerp(985, 905, k), ws = lerp(0.74, 0.5, k);
      put(S, st.sh, 1040, wy + 4, 1.9 * ws); put(S, st.sh, 860, wy + 4, 0.8 * ws);
      hagrid().draw(S, { x: 1040, y: wy, s: ws, t, walk: w * 0.8, stride: 0.3, back: true, armF: [0.9, 0.8] });
      harry('rags').draw(S, { x: 860, y: wy, s: ws * 1.05, t, walk: w * 1.25, back: true, tilt: Math.sin(t * 2) * 0.12 });
      // floating books, lanterns, signs, owls
      S.layer(1.25);
      for (let i = 0; i < 6; i++) { const bx = 300 + i * 260 + Math.sin(t * 0.7 + i) * 60, by = 380 + Math.sin(t * 1.3 + i * 1.7) * 50 + (i % 2) * 120; putf(S, st.book, bx, by, 0.42, 0.42 * (0.75 + 0.25 * Math.sin(t * 6 + i)), Math.sin(t + i) * 0.3); sparkle(S, bx, by + 40, 50, t, 5, undefined, 0.8, i); }
      drawOwl(S, lerp(-100, 1400, clamp(t / 4.2)), 250 + Math.sin(t * 2) * 40, 1.0, t, { unlit: true });
      drawOwl(S, lerp(2100, 900, clamp((t - 1) / 4)), 330 + Math.sin(t * 2.4) * 30, 0.7, t + 1, { face: -1, unlit: true });
      S.layer(1.6, 0.35);
      for (let i = 0; i < 4; i++) { const x = [120, 520, 1400, 1800][i]; S.push(x, -40 + (i % 2) * 60, Math.sin(t * 1.6 + i) * 0.14, 1.5); S.draw(sign(i), { unlit: true }); S.pop(); }
      for (let i = 0; i < 3; i++) { const x = [330, 960, 1590][i]; S.push(x, -30, Math.sin(t * 1.3 + i * 2) * 0.1, 2.2); S.draw(st.lan, { unlit: true }); S.pop(); glow(S, x, 40, 120, t, { a: 0.6, rings: 4, seed: i * 0.3 }); }
    },
  },

  // ---------------------------------------------------------------- 35.2 – 38.0
  s13_wand: {
    ground: '#2a1a10',
    tin: { dur: 0.6, kind: 'radial', x: 960, y: 500, soft: 0.5 },
    setup: () => {
      const r = RNG(41), boxes = [];
      const cols = [PAL.earth, PAL.drab, PAL.earth, PAL.prussian, PAL.drab, PAL.stoneWarm, PAL.plum];
      for (let row = 0; row < 9; row++) {
        let x = -200;
        while (x < 2100) {
          const w = 70 + r() * 90, h = 20 + r() * 8, y = 60 + row * 86 + (r() - 0.5) * 6, c = cols[Math.floor(r() * cols.length)];
          for (let k = 0; k < 3; k++) boxes.push({ shape: rect(x, y + k * (h + 3), w, h), pal: c.slice(0, 4), flow: 0, jit: 0.05, len: 34, wid: 9, density: 2.6, under: false, tone: () => 0.2 + r() * 0.6 });
          x += w + 6 + r() * 14;
        }
        boxes.push({ line: [[-200, 60 + row * 86 + 78], [2120, 60 + row * 86 + 78]], len: 50, wid: 6, pal: PAL.earth.slice(0, 2) });
      }
      return {
        shelves: paint([{ shape: rect(-200, -100, 2320, 1300), pal: ['#1a100a', '#2a1a10', '#3a2618'], flow: 1.57, len: 70, wid: 18, density: 2, hug: false }, ...boxes], 42),
        counter: paint([{ shape: rect(-200, 900, 2320, 300), pal: PAL.earth.slice(1), tone: (x, y) => clamp(0.8 - (y - 900) / 300), flow: 0.02, len: 70, wid: 16, density: 2.2, hug: false }, { line: [[-200, 902], [2120, 902]], len: 50, wid: 7 }], 43),
        big: harry('rags', 2),
      };
    },
    draw(S, t, d, st) {
      const cast = ss(1.0, 1.5, t), k = ss(0, 2.8, t);
      cam(S, t, 2.8, [0, 30, 1.02], [0, -10, 1.14], 0.4);
      S.ambient('#9a8a8a', 0.7 + 0.1 * cast); S.light(1075, 330, 560, '#ffd060', 0.25 + 0.75 * cast);
      S.layer(0.8, 0.25); S.draw(st.shelves);
      S.layer(1);
      const raise = ss(0.2, 1.0, t);
      const p = { x: 880, y: 1160, s: 2.5, t, yaw: 0.35, tilt: -0.1 * raise, brow: 0.6 + 0.4 * cast, mouth: 0.3 + 0.7 * cast, open: 0.3 * cast, blink: blink(t, 6), look: [0.6, -0.8],
        armF: [lerp(0.6, 2.55, raise), 0.25], armB: [-0.2, -0.3], wind: -cast * 1.4, hold: (S2) => put(S2, wand(), 0, 0, 1.3, Math.PI) };
      st.big.draw(S, p);
      const [hx, hy] = st.big.handPos(p);
      const tx = hx + 30, ty = hy - 150;
      if (cast > 0) {
        glow(S, tx, ty, 120 + 200 * cast, t, { a: cast, rings: 6 });
        swirl(S, tx, ty, t, { r: 200 + 900 * ss(1.0, 2.6, t), n: 240, turns: 2.2, a: cast, size: 3, speed: 0.45, arms: 4 });
        sparkle(S, tx, ty, 500 * cast, t, 34, undefined, cast, 7);
      } else sparkle(S, tx, ty, 40, t, 6, undefined, raise, 2);
      S.layer(1.3, 0.3); S.draw(st.counter);
    },
  },

  // ---------------------------------------------------------------- 38.0 – 40.0
  s14_platform: {
    ground: '#142c78',
    tin: { dur: 0.6, kind: 'scatter', soft: 0.6 },
    setup: () => ({
      wall: paint([...stoneWall(rect(-300, -200, 2520, 1000), { pal: ['#3a2218', '#562e1e', '#743e26', '#925232', '#b06c44'], block: 60, tone: (x, y) => clamp(0.3 + y / 1600) }),
        ...[200, 800, 1400].map((x) => ({ shape: arch(x, 800, 380, 620), pal: PAL.night.slice(0, 4), flow: 1.57, len: 44, wid: 12, density: 2.4 })), ...[200, 800, 1400].map((x) => ({ line: arch(x, 800, 380, 620), len: 36, wid: 9, pal: PAL.earth.slice(0, 2) }))], 45),
      plat: fill(rect(-300, 800, 2520, 500), { pal: PAL.stone, tone: (x, y) => clamp(0.75 - (y - 800) / 600), flow: 0.02, jit: 0.1, len: 66, wid: 16, density: 2.2, hug: false, seed: 46 }),
      rail: paint([{ line: [[-300, 880], [2220, 880]], len: 50, wid: 7, pal: PAL.silver.slice(1) }, { line: [[-300, 912], [2220, 912]], len: 50, wid: 9, pal: PAL.black }], 47),
      lan: lantern(),
    }),
    draw(S, t, d, st) {
      const k = ss(0, 2.0, t);
      const hh = handheld(t, 1, 8);
      S.camera(hh[0], hh[1], 1.0 + 0.08 * k, hh[2]);
      S.ambient('#9aa2c8', 0.85); S.light(1500, 300, 500, '#ffd070', 1.0); S.light(500, 300, 500, '#ffd070', 1.0);
      S.layer(0.8); S.draw(st.wall);
      for (const x of [500, 1500]) { put(S, st.lan, x, 190, 2, 0, { unlit: true }); glow(S, x, 260, 110, t, { a: 0.7, rings: 4 }); }
      S.layer(1); S.draw(st.plat); S.draw(st.rail);
      const tx = lerp(-500, 1120, Math.pow(k, 0.8));
      drawTrain(S, tx, 884, 1.45, t, { spin: tx * 0.016, cars: 2 });
      const SM = ['#eef4f0', '#b4d8ec', '#7db2e0', '#4a87d2', '#2a5fc0', '#1c429c'];
      smoke(S, tx + 160, 560, t, { n: 16, r: 110, rise: 520, drift: -700, spread: 200, rate: 0.7, pal: SM, seed: 1 });
      S.layer(1.2);
      // the great billow that the engine pushes through
      smoke(S, 1050, 980, t, { n: 26, r: 240 * (1.25 - 0.55 * k), rise: 760, spread: 2100, rate: 0.5, pal: SM, seed: 3, a: 1 - 0.55 * k, per: 11 });
      smoke(S, tx + 300, 900, t, { n: 12, r: 120, rise: 300, drift: -500, spread: 300, rate: 1.1, pal: SM, seed: 5 });
    },
  },

  // ---------------------------------------------------------------- 40.0 – 42.6
  s15_train: {
    ground: '#5a98cc',
    tin: { dur: 0.7, kind: 'wipe', angle: 0, soft: 0.6 },
    setup: () => ({
      sky: makeSky({ seed: 50, x: -500, y: -400, w: 4200, h: 1150, pal: PAL.day, glow: ['#fffbe0', '#f1f0dc', '#fbe36e'], accent: ['#7db6da', '#a2b550'], base: 0.42, contrast: 0.75, speed: 2, wind: -0.05,
        vortices: [{ x: 500, y: 150, r: 320, spin: 1, k: 3, lite: 1.4 }, { x: 1500, y: 90, r: 260, spin: -1, k: 2.6, lite: 1.4 }, { x: 2500, y: 180, r: 320, spin: 1, k: 3, lite: 1.4 }] }),
      mts: hill((x) => 560 + Math.sin(x * 0.0028) * 70 + Math.sin(x * 0.009) * 26, -500, 3900, 900, { pal: ['#2a5fc0', '#4a87d2', '#6aa0d8', '#8cbce0'], seed: 51 }),
      h1: hill((x) => 700 + Math.sin(x * 0.0022 + 1) * 46, -500, 3900, 1000, { pal: PAL.olive.slice(1), seed: 52 }),
      h2: hill((x) => 780 + Math.sin(x * 0.003) * 30, -500, 3900, 1200, { pal: PAL.wheat, seed: 53, wave: 0.3 }),
      fg: hill((x) => 930 + Math.sin(x * 0.004 + 2) * 26, -700, 4600, 1400, { pal: PAL.wheat.concat(['#f8eaa0']), seed: 54, wave: 0.5, len: 60, wid: 14, curve: 0.2 }),
      cyp: [cypress(460, 100, 1), cypress(380, 86, 2), cypress(520, 110, 3)],
      track: paint([{ line: [[-500, 792], [3900, 792]], len: 60, wid: 9, pal: PAL.earth.slice(0, 3) }], 55),
      sun: sunflowers(),
    }),
    draw(S, t, d, st) {
      const k = t / 2.6;
      const hh = handheld(t, 0.8, 6);
      S.camera(200 + 900 * k + hh[0], hh[1] - 10, 1.05, hh[2]);
      S.layer(0.12); st.sky.draw(S, t);
      S.layer(0.3); S.draw(st.mts);
      S.layer(0.5); S.draw(st.h1);
      [[300, 0], [900, 1], [1700, 2], [2500, 0], [3100, 1]].forEach(([x, i]) => drawCypress(S, st.cyp[i], x, 720, 0.6, t));
      S.layer(0.8); S.draw(st.h2, { warp: (x, y) => [x + Math.sin(t * 2 + x * 0.01 + y * 0.02) * 5, y] }); S.draw(st.track);
      const tx = 700 + 1900 * k;
      drawTrain(S, tx, 794, 0.62, t, { spin: t * 16, cars: 4 });
      smoke(S, tx + 70, 660, t, { n: 16, r: 60, rise: 150, drift: -900, spread: 60, rate: 1.0, pal: ['#fffbe0', '#eef4f0', '#cfe6ea', '#a4d0e4', '#7db6da'], seed: 2 });
      [[500, 2], [1500, 0], [2400, 1], [3300, 2]].forEach(([x, i]) => drawCypress(S, st.cyp[i], x, 880, 0.95, t + i));
      S.layer(1.4);
      S.draw(st.fg, { warp: (x, y) => [x + Math.sin(t * 2.4 + x * 0.008 + y * 0.03) * 12, y] });
    },
  },
};
