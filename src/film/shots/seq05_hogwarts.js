// SEQ 05 — Friends and Hogwarts (0:42 – 0:55)

import { fill, paint, strokes } from '../../engine/patch.js';
import { rect, soft } from '../../engine/geom.js';
import { clamp, ss, lerp, fract } from '../../engine/util.js';
import { makeSky } from '../../art/sky.js';
import { castle, room } from '../../art/architecture.js';
import { boat, lantern, shadow, table, sunflowers } from '../../art/props.js';
import { hill, cypress, drawCypress, makeWater } from '../../art/nature.js';
import { glow, put, putf, sparkle, motes, hash } from '../../art/fx.js';
import { harry, ron, hermione, hagrid } from '../../art/cast.js';
import { PAL } from '../../art/palette.js';
import { once, cam, blink, handheld, talk } from '../common.js';

// The castle set is reused by the ending.
export const hogwartsSet = once(() => {
  const C = castle(7);
  const lights = [[-124, -262], [-86, -262], [-48, -262], [-10, -262], [28, -262], [66, -262], [-190, -420], [120, -470], [-50, -500], [350, -330], [-330, -280], [250, -250], [-250, -230], [-20, -250]];
  const CX = 1000, CY = 806, CS = 1.36;
  return {
    C, CX, CY, CS,
    sky: makeSky({ seed: 18, x: -500, y: -900, w: 2920, h: 1800, base: 0.27,
      vortices: [{ x: 560, y: 190, r: 290, spin: 1, k: 3.6 }, { x: 960, y: 150, r: 210, spin: -1, k: 3.0 }, { x: 1420, y: 60, r: 200, spin: 1, k: 2.4 }],
      stars: [{ x: 190, y: 120, r: 46 }, { x: 330, y: 400, r: 28 }, { x: 1230, y: 330, r: 34 }, { x: 1560, y: 430, r: 26 }, { x: 60, y: 560, r: 24 }, { x: 760, y: 420, r: 20 }, { x: 1180, y: 60, r: 26 }, { x: 1860, y: 470, r: 22 }, { x: 800, y: 30, r: 20 }, { x: 1500, y: 250, r: 18 }],
      moon: { x: 1700, y: 180, r: 96 } }),
    mts: hill((x) => 610 + Math.sin(x * 0.003) * 60 + Math.sin(x * 0.011) * 22, -500, 2500, 900, { pal: PAL.nightDeep, seed: 61 }),
    shore: hill((x) => 792 + Math.sin(x * 0.006) * 10, -500, 2500, 860, { pal: PAL.prussian.slice(0, 4), seed: 62 }),
    pines: [cypress(200, 54, 11, PAL.prussian), cypress(160, 46, 12, PAL.prussian), cypress(240, 60, 13, PAL.cypress)],
    water: makeWater({ x: -500, y: 800, w: 2920, h: 520, seed: 63, pal: PAL.night.slice(0, 7),
      lights: lights.map(([lx, ly], i) => ({ x: CX + lx * CS, w: 20 + (i < 6 ? 10 : 0), a: i < 6 ? 0.95 : 0.7, n: 22, len: 330 + (i % 3) * 60, pal: i % 3 ? ['#fff8d0', '#fad648', '#f4b62a', '#e8961a'] : ['#fdeb8c', '#f4b62a', '#d9701c'] })) }),
    boat: boat(), lan: lantern(),
    lightPts: lights,
  };
});

function drawHogwarts(S, t, st, o = {}) {
  const { C, CX, CY, CS } = st;
  S.layer(0.1); st.sky.draw(S, t, o.sky);
  S.layer(0.3); S.draw(st.mts, { unlit: true });
  S.layer(0.6);
  put(S, C.body, CX, CY, CS, 0, { unlit: true });
  put(S, C.lights, CX, CY, CS, 0, { unlit: true, a: 0.85 + 0.15 * Math.sin(t * 5) });
  st.lightPts.forEach(([lx, ly], i) => glow(S, CX + lx * CS, CY + ly * CS, (i < 6 ? 34 : 46) * CS, t, { a: 0.62, noCore: true, rings: 3, seed: i * 0.13 }));
  S.draw(st.shore, { unlit: true });
  for (let i = 0; i < 16; i++) { const x = -300 + i * 150 + (i % 3) * 30; if (x > 420 && x < 1660) continue; drawCypress(S, st.pines[i % 3], x, 806, 1, t + i, { unlit: true }); }
  // reflection of the castle, then the living water over it
  S.push(CX, CY + 6, 0, CS, -CS * 0.55);
  S.draw(C.body, { unlit: true, a: 0.5, every: 2, warp: (x, y) => [x + Math.sin(t * 1.6 + y * 0.05) * 7, y] });
  S.pop();
  st.water.draw(S, t);
}

/** a boat with seated passengers; riders: [[figure, pose]] */
function drawBoat(S, st, x, y, s, t, riders, lit = true) {
  const bobY = Math.sin(t * 1.4 + x * 0.01) * 5 * s, rock = Math.sin(t * 1.1 + x * 0.02) * 0.025;
  S.clip(x - 300 * s, y - 700 * s, 600 * s, 700 * s + bobY + 4 * s);
  S.push(x, y + bobY, rock, s);
  for (const [f, p] of riders) f.draw(S, { t, ...p });
  S.unclip();
  S.draw(st.boat);
  S.push(100, -110, -rock * 2); S.draw(st.lan, { unlit: true }); S.pop();
  S.pop();
  if (lit) glow(S, x + 100 * s, y + bobY - 76 * s, 70 * s, t, { a: 0.8, rings: 4, seed: x * 0.001 });
}

export const shots = {
  // ---------------------------------------------------------------- 42.6 – 47.2
  s16_compartment: {
    ground: '#3a2218',
    tin: { dur: 0.7, kind: 'radial', x: 960, y: 420, soft: 0.5 },
    setup: () => ({
      room: room({ back: [330, 130, 1260, 720], wall: ['#6a2c22', '#8a3c2a', '#a85034', '#c46a44'], floor: ['#3a2a1e', '#56402c', '#74583c'], ceil: ['#4a3020', '#644430', '#806044'], seed: 91, planks: 5 }),
      frame: paint([{ line: rect(560, 210, 800, 400), closed: true, len: 44, wid: 16, pal: PAL.earth.slice(1, 4) }, { line: [[960, 210], [960, 610]], len: 36, wid: 9, pal: PAL.earth.slice(1, 4) }], 92),
      sky: fill(rect(400, 150, 1100, 330), { pal: ['#e8961a', '#f4b62a', '#fad648', '#f6d890', '#cfe6ea', '#a4d0e4'], tone: (x, y) => clamp(1 - (y - 150) / 330 + Math.sin(x * 0.01) * 0.15), flow: { noise: 0.006, base: 0, amp: 0.8 }, curve: 0.2, len: 46, wid: 12, density: 2.3, hug: false, seed: 93 }),
      hills: hill((x) => 500 + Math.sin(x * 0.006) * 40, 0, 4200, 700, { pal: PAL.wheat, seed: 94, len: 40, wid: 11 }),
      hills2: hill((x) => 440 + Math.sin(x * 0.004 + 2) * 50, 0, 4200, 700, { pal: PAL.olive.slice(1), seed: 95, len: 40, wid: 11 }),
      cyp: cypress(300, 70, 4),
      seatL: paint([
        { shape: rect(150, 380, 150, 500), pal: PAL.emerald.slice(0, 4), flow: 1.57, len: 44, wid: 12, density: 2.5 }, { outline: rect(150, 380, 150, 500), wid: 6 },
      ], 96),
      frontL: paint([{ shape: rect(150, 800, 500, 400), pal: PAL.emerald.slice(1), tone: (x, y) => clamp(0.8 - (y - 800) / 500), flow: 0.03, len: 50, wid: 13, density: 2.4 }, { line: [[150, 802], [650, 802], [650, 1200]], len: 40, wid: 7 }], 97),
      seatR: paint([{ shape: rect(1620, 380, 150, 500), pal: PAL.emerald.slice(0, 4), flow: 1.57, len: 44, wid: 12, density: 2.5 }, { outline: rect(1620, 380, 150, 500), wid: 6 }], 98),
      frontR: paint([{ shape: rect(1270, 800, 500, 400), pal: PAL.emerald.slice(1), tone: (x, y) => clamp(0.8 - (y - 800) / 500), flow: 0.03, len: 50, wid: 13, density: 2.4 }, { line: [[1770, 802], [1270, 802], [1270, 1200]], len: 40, wid: 7 }], 99),
      table: table(380, 150, PAL.earth), sun: sunflowers(),
      frog: paint([{ shape: rect(-22, -16, 44, 32), pal: PAL.violet.slice(2), flow: 0, len: 14, wid: 6, density: 3, under: false }, { outline: rect(-22, -16, 44, 32), wid: 3, len: 10 }, strokes([[0, 0, 0.5, 16, 9, '#f7cf3a', 1, 1]], 2)], 100),
    }),
    draw(S, t, d, st) {
      cam(S, t, 4.6, [-40, 0, 1.04], [60, 10, 1.12], 0.5);
      const rumble = Math.sin(t * 23) * 1.6;
      S.push(0, rumble);
      S.ambient('#b0a090', 0.82); S.light(960, 400, 700, '#ffd890', 0.9);
      S.draw(st.room);
      // the world sliding past the window
      S.clip(560, 210, 800, 400);
      S.draw(st.sky, { unlit: true });
      const sx = -((t * 620) % 1900);
      S.push(sx, 0); S.draw(st.hills2, { unlit: true }); S.pop();
      for (let i = 0; i < 4; i++) { const cx = 1500 - fract(t * 0.42 + i * 0.25) * 1300; drawCypress(S, st.cyp, cx, 520, 0.6, t, { unlit: true }); }
      S.push(sx * 1.6 % 1900, 40); S.draw(st.hills, { unlit: true }); S.pop();
      S.unclip();
      S.draw(st.frame);
      S.draw(st.seatL); S.draw(st.seatR);
      // Harry by the window
      const ronIn = ss(0.0, 0.9, t), offer = ss(0.9, 1.6, t) * (1 - ss(2.6, 3.2, t)), herm = ss(2.5, 3.1, t);
      harry('rags').draw(S, { x: 470, y: 1010, s: 1.5, t, yaw: lerp(0.3, 0.85, ronIn) - 0.25 * herm, tilt: -0.05, brow: 0.5, mouth: 0.3 + 0.6 * offer, blink: blink(t, 6), armF: [0.5 + 0.8 * offer, 0.9], armB: [0.2, 0.6], look: [0.8, 0] });
      S.draw(st.frontL);
      const R = ron('jumper');
      const rp = { x: lerp(1900, 1450, ronIn), y: 1010 - (1 - ronIn) * 30, s: 1.5, face: -1, t, walk: ronIn < 1 ? t * 2 : null, yaw: 0.8 - 0.5 * herm * 0, tilt: 0.03, mouth: 0.8, open: talk(t, 0.5, 2.6), brow: 0.4,
        blink: blink(t, 7), armF: [0.5 + 0.9 * offer, 0.7], armB: [0.2, 0.7], hold: (S2) => put(S2, st.frog, 0, 0, 1.1) };
      R.draw(S, rp);
      S.draw(st.frontR);
      put(S, st.table, 960, 960, 1); put(S, st.sun, 960, 812, 0.7, 0);
      // Hermione, brisk, in the doorway
      if (herm > 0) hermione().draw(S, { x: lerp(2300, 1820, herm), y: 1130, s: 1.7, face: -1, t, walk: herm < 1 ? t * 2.4 : null, yaw: 0.6, tilt: -0.06, brow: 0.5, mouth: 0.7, open: talk(t, 2.9, 4.6), blink: blink(t, 8),
        armF: [1.5 + 0.3 * Math.sin(t * 6), 0.9], armB: [-0.5, -1.7] });
      S.pop();
    },
  },

  // ---------------------------------------------------------------- 47.2 – 49.8
  s17_boats: {
    ground: '#0a1238',
    tin: { dur: 0.8, kind: 'wipe', angle: -1.57, soft: 0.6 },
    setup: hogwartsSet,
    draw(S, t, d, st) {
      const k = ss(0, 2.6, t);
      const hh = handheld(t, 0.6, 2);
      S.camera(-250 + 110 * k + hh[0], 330 - 40 * k + hh[1], 1.55 - 0.05 * k, hh[2]);
      S.ambient('#7080c8', 0.75);
      S.layer(0.1); st.sky.draw(S, t);
      S.layer(0.3); S.draw(st.mts, { unlit: true });
      S.layer(0.6); S.draw(st.shore, { unlit: true });
      for (let i = 0; i < 16; i++) drawCypress(S, st.pines[i % 3], -300 + i * 150 + (i % 3) * 30, 806, 1, t + i, { unlit: true });
      st.water.draw(S, t);
      S.layer(1);
      const drift = t * 26;
      S.light(770 + drift, 800, 260, '#ffc860', 1.5);
      drawBoat(S, st, 1250 + drift * 0.7, 900, 0.5, t, [[hagrid(), { x: 0, y: 34, s: 0.5, back: true }]]);
      drawBoat(S, st, 180 + drift * 0.8, 960, 0.62, t, [[harry(), { x: -40, y: 60, s: 0.6, back: true, mul: [0.5, 0.5, 0.8] }], [harry(), { x: 30, y: 60, s: 0.6, back: true, mul: [0.5, 0.5, 0.8] }]], true);
      const up = ss(0.6, 2.0, t);
      drawBoat(S, st, 660 + drift, 1010, 1.0, t, [
        [ron(), { x: -66, y: 96, s: 0.66, yaw: 0.6, tilt: -0.12 - 0.2 * up, brow: 0.8 * up, open: 0.35 * up, mouth: 0.3, look: [0.8, -0.8], blink: blink(t, 7) }],
        [hermione(), { x: 4, y: 100, s: 0.66, yaw: 0.65, tilt: -0.1 - 0.2 * up, brow: 0.8 * up, mouth: 0.6, open: 0.25 * up, look: [0.8, -0.8], blink: blink(t, 8) }],
        [harry(), { x: 72, y: 96, s: 0.66, yaw: 0.7, tilt: -0.12 - 0.22 * up, brow: 0.9 * up, mouth: 0.5, open: 0.3 * up, look: [0.8, -0.9], blink: blink(t, 6) }],
      ]);
      // ripples of lantern light
      sparkle(S, 780 + drift, 1040, 120, t, 10, ['#fad648', '#fff8d0'], 0.5, 3);
    },
  },

  // ---------------------------------------------------------------- 49.8 – 55.6
  s18_hogwarts: {
    ground: '#0a1238',
    tin: { dur: 1.1, kind: 'wipe', angle: -1.57, soft: 0.7 },
    setup: hogwartsSet,
    draw(S, t, d, st) {
      // tilt up from the water, widen, then a slow breath in
      const rise = ss(0.0, 2.9, t), settle = ss(2.9, 5.8, t);
      const hh = handheld(t, 0.35, 1);
      S.camera(-90 + 90 * rise + hh[0], 330 - 395 * rise - 20 * settle + hh[1], 1.5 - 0.5 * rise + 0.07 * settle, hh[2] * 0.6);
      S.ambient('#7080c8', 0.78);
      drawHogwarts(S, t, st);
      // boats gliding toward the castle
      S.layer(1);
      const drift = (t + 2.6) * 26;
      S.light(770 + drift, 820, 240, '#ffc860', 1.4);
      drawBoat(S, st, 1250 + drift * 0.7, 900, 0.5, t, [[hagrid(), { x: 0, y: 34, s: 0.5, back: true }]]);
      drawBoat(S, st, 180 + drift * 0.8, 960, 0.62, t, [[harry(), { x: -40, y: 60, s: 0.6, back: true, mul: [0.5, 0.5, 0.8] }], [harry(), { x: 30, y: 60, s: 0.6, back: true, mul: [0.5, 0.5, 0.8] }]]);
      drawBoat(S, st, 660 + drift, 1010, 1.0, t, [
        [ron(), { x: -66, y: 96, s: 0.66, back: true, tilt: -0.1 }], [hermione(), { x: 4, y: 100, s: 0.66, back: true, tilt: -0.1 }], [harry(), { x: 72, y: 96, s: 0.66, back: true, tilt: -0.1 }],
      ]);
      // wonder in the air
      S.layer(0.7);
      motes(S, 300, 0, 1500, 800, t, { n: 46, a: 0.85 * rise, size: 1.5, rate: 0.08, pal: ['#fff4b8', '#fbe36e', '#b4d8ec'] });
      sparkle(S, st.CX, 420, 620, t, 26, ['#fff8d0', '#fad648'], 0.75 * ss(1.6, 3.2, t), 9);
    },
  },
};

export { drawHogwarts, drawBoat };
