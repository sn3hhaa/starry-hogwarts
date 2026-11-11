// SEQ 03 — Hagrid's Revelation (0:21 – 0:30)

import { paint } from '../../engine/patch.js';
import { rect } from '../../engine/geom.js';
import { clamp, ss, lerp } from '../../engine/util.js';
import { makeReveal } from '../../engine/film.js';
import { room, fireplace, arch } from '../../art/architecture.js';
import { shadow, table } from '../../art/props.js';
import { glow, put, flame, rain, bolt, smoke, swirl, sparkle, motes } from '../../art/fx.js';
import { harry, hagrid } from '../../art/cast.js';
import { PAL } from '../../art/palette.js';
import { once, cam, blink, handheld, talk } from '../common.js';
import { stormSet } from './seq02_letters.js';

const flashAt = (t, times) => { let f = 0; for (const [tt, k] of times) if (t >= tt) f = Math.max(f, k * Math.exp(-(t - tt) * 4.5) * (0.65 + 0.35 * Math.sin((t - tt) * 55))); return f; };

const DRAB = { wall: ['#3a342c', '#4e463a', '#645a4a', '#7c705c'], floor: ['#2e2620', '#443a30', '#5c5042', '#766854'] };
const hutSet = once(() => ({
  drab: room({ back: [470, 170, 1100, 620], ...DRAB, seed: 81 }),
  lumi: room({ back: [470, 170, 1100, 620], wall: ['#142c78', '#1c429c', '#2a5fc0', '#4a87d2'], floor: ['#b8741a', '#d9911c', '#f0b21e', '#f7cf3a'], ceil: ['#142c78', '#1c429c', '#2a5fc0'], seed: 82 }),
  doorway: paint([
    { shape: arch(1010, 792, 330, 560), pal: PAL.storm.slice(0, 5), flow: 0.3, len: 40, wid: 12, density: 2.6, hug: false },
    { line: arch(1010, 792, 330, 560), len: 40, wid: 11, pal: PAL.earth.slice(0, 3) },
  ], 83),
  door: paint([{ shape: [[1340, 240], [1500, 200], [1500, 850], [1340, 792]], pal: PAL.earth.slice(0, 4), flow: 1.57, jit: 0.08, len: 44, wid: 12, density: 2.6 }, { outline: [[1340, 240], [1500, 200], [1500, 850], [1340, 792]], wid: 6 }], 84),
  fire: fireplace(330, 300, PAL.drab.slice(1)),
  sh: shadow(130), table: table(300, 120, PAL.drab.slice(0, 5)),
}));

export const shots = {
  // ---------------------------------------------------------------- 21.0 – 23.2
  s09_hut: {
    ground: '#0b1020',
    tin: { dur: 0.5, kind: 'radial', x: 1300, y: 500, soft: 0.6 },
    setup: stormSet,
    draw(S, t, d, st) {
      const fl = flashAt(t, [[0.6, 0.6], [1.7, 1.3]]);
      const hh = handheld(t, 1.4, 9);
      const k = ss(0, 2.2, t);
      S.camera(260 + 120 * k + hh[0], -30 + hh[1], 1.25 + 0.55 * k, hh[2]);
      S.ambient('#7888b0', 0.75 + fl * 1.2);
      S.layer(0.2); st.sky.draw(S, 3 + t * 1.6, { lift: fl * 0.6 });
      if (fl > 0.15 && t < 1.6) bolt(S, 700, -200, 560, 600, 5, Math.min(1, fl * 1.4), 7);
      if (fl > 0.15 && t >= 1.7) bolt(S, 1640, -260, 1500, 420, 9, Math.min(1, fl), 11);
      S.layer(0.75); st.sea.draw(S, 3 + t * 2.2, { lift: fl * 0.35 });
      S.layer(1);
      S.draw(st.rock, { mul: [0.55 + fl * 1.3, 0.55 + fl * 1.3, 0.7 + fl * 1.3] });
      glow(S, 1411, 517, 40, t, { a: 0.8, pal: ['#f2aa4a', '#e88c2a', '#d46e1e', '#b4501a'], rings: 3 });
      // spray
      smoke(S, 1230, 760, t, { n: 10, r: 46, rise: 150, spread: 120, rate: 0.9, pal: ['#d8e0d0', '#7a9498', '#4a6278', '#2f4260'], seed: 2, dense: 0.7 });
      smoke(S, 1760, 770, t, { n: 8, r: 40, rise: 120, spread: 100, rate: 0.8, pal: ['#d8e0d0', '#7a9498', '#4a6278', '#2f4260'], seed: 5, dense: 0.7 });
      // a giant at the door — only a silhouette until the flash
      const v = 0.04 + (t > 1.7 ? fl * 0.9 : 0);
      hagrid().draw(S, { x: 1410, y: 584, s: 0.3, t, back: true, mul: [v, v, v * 1.3], unlit: true, armF: [2.2 * ss(1.9, 2.2, t), 0.3] });
      S.layer(1.3); rain(S, t, { n: 300, a: 0.5 + fl * 0.4 });
    },
  },

  // ---------------------------------------------------------------- 23.2 – 27.4
  s10_hagrid_enters: {
    ground: '#1a1612',
    tin: { dur: 0.25, kind: 'radial', x: 1175, y: 520, soft: 0.8 },
    setup: hutSet,
    draw(S, t, d, st) {
      const bang = Math.exp(-t * 5) * Math.sin(t * 60);
      const fl = flashAt(t, [[0.1, 1.2], [2.4, 0.35]]);
      const k = ss(0.3, 4.2, t);
      const hh = handheld(t, 0.6, 2);
      S.camera(hh[0] + bang * 26 + 40 * k, hh[1] + bang * 16 - 20 * k, 1.0 + 0.16 * k, hh[2] + bang * 0.02);
      S.grade = { sat: 0.62 };
      S.ambient('#9098b4', 0.95 + fl * 0.5); S.light(1175, 480, 520, '#a8c0e8', 0.6 + fl * 1.6); S.light(250, 800, 420, '#e08a50', 0.5);
      S.draw(st.drab);
      put(S, st.fire, 250, 902, 1.1);
      S.draw(st.doorway);
      S.clip(1010, 232, 330, 560);
      rain(S, t, { n: 200, a: 0.5 });
      if (fl > 0.3) bolt(S, 1250, 180, 1180, 700, 4, fl, 8);
      S.unclip();
      S.draw(st.door);
      put(S, st.table, 640, 900, 1);
      // Hagrid steps through the doorway
      const step = ss(0.2, 1.7, t);
      const say = talk(t, 1.8, 4.6);
      put(S, st.sh, lerp(1180, 1120, step), 936, 2.2);
      hagrid().draw(S, { x: lerp(1190, 1120, step), y: lerp(880, 930, step), s: lerp(0.86, 0.98, step), face: -1, t, walk: step < 1 ? t * 1.1 : null, stride: 0.3,
        yaw: 0.55, tilt: 0.14, bend: 0.06, open: say, mouth: 0.7, brow: 0.3, blink: blink(t, 3), armF: [0.5 + 0.5 * ss(1.8, 2.6, t), 0.7], look: [0.7, 0.6], wind: (1 - step) * 1.5 });
      // Harry, small, looking up
      put(S, st.sh, 560, 986, 0.9);
      harry('rags').draw(S, { x: 560, y: 980, s: 1.12, t, yaw: 0.8, tilt: -0.22, lean: -0.06 * (1 - step), brow: 1, mouth: 0, open: 0.35 * (1 - ss(2, 3, t)), blink: blink(t, 6), look: [0.9, -0.8], armF: [0.2, 0.5], armB: [-0.2, -0.5] });
    },
  },

  // ---------------------------------------------------------------- 27.4 – 30.2
  s11_wonder: {
    ground: '#1a1612',
    tin: { dur: 0.5, kind: 'radial', x: 700, y: 500, soft: 0.6 },
    setup: () => ({ ...hutSet(), big: harry('rags', 2.4) }),
    draw(S, t, d, st) {
      const bloom = ss(0.2, 2.2, t);
      cam(S, t, 2.8, [-60, 20, 1.06], [0, 0, 1.18], 0.4);
      const FX = 1500, FY = 760;
      S.grade = { sat: lerp(0.5, 1.25, bloom) };
      S.ambient(lerp(0.62, 0.9, bloom) > 0 ? [lerp(0.5, 0.85, bloom), lerp(0.52, 0.85, bloom), lerp(0.66, 1.0, bloom)] : '#fff', 1);
      S.light(FX, FY - 120, 900, '#ffc050', 0.4 + 0.55 * bloom + 0.08 * Math.sin(t * 9));
      S.push(0, 0, 0, 1.25); S.draw(st.drab); S.pop();
      // colour floods outward from the fire
      const rv = makeReveal({ kind: 'radial', x: S.project(FX, FY)[0], y: S.project(FX, FY)[1], soft: 0.5, jitter: 0.3 }, bloom);
      const prev = S.reveal; S.reveal = (x, y, s) => rv(x, y, s) * (prev ? prev(x, y, s) : 1);
      S.push(0, 0, 0, 1.25); S.draw(st.lumi); S.pop();
      S.reveal = prev;
      put(S, st.fire, FX, 960, 1.5);
      flame(S, FX, 946, 200, 330 + 120 * bloom, t, { n: 60, rate: 1.6 });
      glow(S, FX, 800, 240 + 160 * bloom, t, { a: 0.5 * bloom, rings: 6, noCore: true });
      swirl(S, FX, 760, t, { r: 300 + 1300 * bloom, n: 260, turns: 1.4, a: bloom * (1 - ss(2.3, 2.8, t) * 0.4), size: 3.6, speed: 0.3, squash: 0.7 });
      motes(S, -100, 100, 2100, 900, t, { n: 70, a: 0.9 * bloom, size: 1.8 });
      // Harry, close: wonder dawning
      st.big.draw(S, { x: 640, y: 1340, s: 3.3, t, yaw: 0.55, tilt: -0.08, brow: lerp(0.9, 0.4, bloom), mouth: lerp(0.0, 1, bloom), open: lerp(0.3, 0.12, bloom), blink: blink(t, 6), look: [0.7, -0.2], armF: [0.2, 0.3], armB: [-0.15, -0.2] });
      sparkle(S, 1000, 420, 700, t, 26, undefined, bloom * 0.9, 4);
    },
  },
};
