// SEQ 01 — The Boy Who Lived (0:00 – 0:10)

import { fill, paint, strokes } from '../../engine/patch.js';
import { rect, soft, ellipse } from '../../engine/geom.js';
import { clamp, ss, lerp, key } from '../../engine/util.js';
import { swirlWarp } from '../../engine/film.js';
import { makeSky, star } from '../../art/sky.js';
import { house, doorParts } from '../../art/architecture.js';
import { lampPost, bundle, shadow } from '../../art/props.js';
import { tree, drawTree, hill } from '../../art/nature.js';
import { glow, put, sparkle, swirl, rays } from '../../art/fx.js';
import { dumbledore, mcgonagall, hagrid } from '../../art/cast.js';
import { PAL } from '../../art/palette.js';
import { once, cam, blink } from '../common.js';

// The Privet Drive set is shared by shots 1, 2 and the time-lapse in sequence 2.
export const privet = once(() => ({
  sky: makeSky({
    seed: 1, x: -400, y: -900, w: 2800, h: 1750, base: 0.26,
    vortices: [{ x: 620, y: -260, r: 260, spin: 1, k: 3.2 }, { x: 1250, y: -420, r: 200, spin: -1, k: 2.6 }],
    stars: [{ x: 300, y: -520, r: 40 }, { x: 980, y: -640, r: 30 }, { x: 1560, y: -180, r: 34 }, { x: 420, y: 60, r: 26 }, { x: 1050, y: 110, r: 22 }, { x: 1700, y: -560, r: 28 }, { x: 80, y: -160, r: 24 }],
    moon: { x: 1640, y: 120, r: 70 },
  }),
  far: hill((x) => 640 + Math.sin(x * 0.004) * 30, -400, 2400, 900, { pal: PAL.prussian, seed: 21 }),
  houses: [
    house({ seed: 2, lit: [false, false, false, false], wall: ['#2a3460', '#3a4878', '#4c5e90', '#6478a8'] }),
    house({ seed: 3, lit: [true, false, false, false], wall: ['#34406c', '#445484', '#586c9c', '#7084b0'] }),
    house({ seed: 4, lit: [false, false, true, false], wall: ['#2e3a66', '#3e4c7c', '#526494', '#687cac'] }),
  ],
  tree: tree(5, PAL.cypress.slice(1), 300),
  hedge: fill(soft([[-400, 900], [-400, 800], [0, 770], [500, 790], [1000, 772], [1500, 792], [2000, 770], [2400, 800], [2400, 900]], 1), { pal: PAL.cypress, flow: { noise: 0.01, base: -1.2, amp: 1 }, curve: 0.3, len: 30, wid: 9, density: 2.6, hug: false, seed: 6 }),
  street: fill(rect(-400, 860, 2800, 420), { pal: ['#1a2248', '#26305e', '#364478', '#4a5c92', '#6478a8'], tone: (x, y) => clamp(0.25 + 0.5 * Math.exp(-((x - 1250) ** 2) / 200000) - (y - 860) / 900), flow: 0.03, jit: 0.12, len: 60, wid: 15, density: 2.2, hug: false, seed: 7 }),
  kerb: paint([{ line: [[-400, 868], [2400, 868]], len: 40, wid: 6, pal: PAL.stone.slice(2) }], 8),
  lamp: lampPost(440),
  fg: fill(soft([[-300, 1200], [-300, 1010], [100, 960], [420, 1020], [520, 1200]], 2), { pal: PAL.cypress.slice(0, 3), flow: { noise: 0.01, base: -1.3, amp: 1 }, curve: 0.3, len: 44, wid: 13, density: 2.4, hug: false, seed: 9 }),
  sh: shadow(110),
}));

function drawPrivet(S, t, st, o = {}) {
  S.layer(0.14); st.sky.draw(S, t, o.sky);
  S.layer(0.5); S.draw(st.far, { unlit: true });
  S.layer(0.8);
  [[250, 0], [760, 1], [1290, 2], [1830, 0]].forEach(([x, i]) => put(S, st.houses[i], x, 840, 1.05, 0, { unlit: true }));
  drawTree(S, st.tree, 1030, 840, 0.9, t, { unlit: true });
  S.draw(st.hedge, { unlit: true });
  S.layer(1);
  S.draw(st.street); S.draw(st.kerb);
}

const LAMP = [1250, 930];

export const shots = {
  // ------------------------------------------------------------------ 0.0 – 4.6
  s01_privet: {
    ground: PAL.canvas,
    tin: { dur: 2.0, kind: 'radial', x: 1100, y: 420, from: PAL.canvas, soft: 0.5 },
    setup: privet,
    draw(S, t, d, st) {
      cam(S, t, 4.6, [0, -470, 1.0], [70, 40, 1.12], 0.4);
      S.ambient('#8a9ad8', 0.8); S.light(LAMP[0], LAMP[1] - 440, 520, '#ffd070', 1.25);
      drawPrivet(S, t, st);
      put(S, st.lamp, LAMP[0], LAMP[1]);
      glow(S, LAMP[0], LAMP[1] - 444, 150, t, { rings: 5 });
      const look = ss(2.4, 3.6, t);
      put(S, st.sh, 1120, 934); put(S, st.sh, 1385, 934);
      dumbledore().draw(S, { x: 1120, y: 930, s: 0.92, t, yaw: lerp(0.1, 0.55, look), armF: [0.5 + 0.2 * Math.sin(t * 1.2), 0.9], blink: blink(t, 1), mouth: 0.25 });
      mcgonagall().draw(S, { x: 1385, y: 930, s: 0.92, face: -1, t, yaw: 0.5, armF: [0.25, 1.1], armB: [0.2, 1.0], blink: blink(t, 2), tilt: -0.04 * look });
      S.layer(1.5, 0.45); S.draw(st.fg, { unlit: true });
    },
  },

  // ------------------------------------------------------------------ 4.6 – 8.0
  s02_hagrid: {
    ground: '#0e1c54',
    tin: { dur: 0.7, kind: 'wipe', angle: Math.PI, soft: 0.5 },
    setup: privet,
    draw(S, t, d, st) {
      cam(S, t, 3.4, [190, 70, 1.22], [300, 60, 1.42], 0.5);
      S.ambient('#8a9ad8', 0.8); S.light(LAMP[0], LAMP[1] - 440, 560, '#ffd070', 1.3);
      drawPrivet(S, t, st);
      put(S, st.lamp, LAMP[0], LAMP[1]);
      glow(S, LAMP[0], LAMP[1] - 444, 150, t, { rings: 5 });
      const arrive = ss(0.0, 2.3, t), give = ss(2.2, 3.2, t);
      const hx = lerp(2150, 1640, arrive);
      put(S, st.sh, 1385, 934); put(S, st.sh, hx, 938, 2);
      mcgonagall().draw(S, { x: 1120, y: 930, s: 0.92, t, yaw: 0.6, armF: [0.3, 1.1], armB: [0.25, 1.0], blink: blink(t, 2), brow: 0.4 * give });
      dumbledore().draw(S, { x: 1385, y: 930, s: 0.92, t, yaw: 0.7, armF: [0.5 + 0.9 * give, 0.6], armB: [0.3 + 0.8 * give, 0.7], blink: blink(t, 1), mouth: 0.4, tilt: 0.06 * give });
      const H = hagrid();
      const hp = { x: hx, y: 936, s: 0.95, face: -1, t, walk: arrive < 1 ? t * 0.95 : null, stride: 0.34, yaw: 0.5, tilt: 0.1 * give, bend: 0.1 * give,
        armF: [0.75 + 0.45 * give, 1.0 - 0.3 * give], armB: [0.6 + 0.4 * give, 1.1 - 0.3 * give], blink: blink(t, 3), mouth: 0.5,
        hold: (S2) => { put(S2, bundle(), 30, -14, 0.9, 1.4, { unlit: false }); } };
      H.draw(S, hp);
      S.layer(1.5, 0.45); S.draw(st.fg, { unlit: true });
    },
  },

  // ------------------------------------------------------------------ 8.0 – 10.4
  s03_baby: {
    ground: '#101838',
    tin: { dur: 0.6, kind: 'radial', x: 960, y: 500, soft: 0.5 },
    setup: () => {
      const wrap = soft([[250, 520], [420, 330], [860, 250], [1420, 300], [1700, 520], [1640, 820], [1100, 960], [520, 900]], 2);
      const hood = soft([[560, 560], [600, 330], [900, 230], [1200, 330], [1260, 600], [1100, 420], [900, 380], [720, 430]], 2);
      const face = ellipse(900, 560, 235, 215, 26);
      const blank = ['#7a88a8', '#98a6c0', '#bcc8d6', '#dfe4e0', '#f6f2e2'];
      return {
        step: paint([
          { shape: rect(-200, -200, 2320, 1500), pal: ['#081c1a', '#0c2a24', '#103a30', '#16483a'], flow: 1.57, jit: 0.08, len: 80, wid: 20, density: 2, hug: false },
          { line: [[300, -200], [300, 880]], len: 60, wid: 9 }, { line: [[1640, -200], [1640, 880]], len: 60, wid: 9 }, { line: [[300, 180], [1640, 180]], len: 60, wid: 8 },
          { shape: rect(-200, 880, 2320, 400), pal: PAL.stone.slice(1), flow: 0.02, len: 80, wid: 20, density: 2.2, hug: false, tone: (x, y) => clamp(0.8 - (y - 880) / 500) },
          { line: [[-200, 880], [2120, 880]], len: 50, wid: 8 },
        ], 31),
        wrap: paint([
          { shape: wrap, pal: blank, tone: (x, y) => clamp(0.75 - (x - 250) / 2400 - (y - 250) / 1400), flow: (x, y) => 0.25 + Math.sin(x * 0.006 + y * 0.004) * 0.7, curve: 0.25, len: 60, wid: 17, density: 2.6 },
          { outline: wrap, wid: 9, len: 46 },
          { line: [[640, 880], [1000, 760], [1500, 740]], len: 50, wid: 8, pal: ['#6c7890'] }, { line: [[1150, 400], [1420, 480], [1560, 640]], len: 50, wid: 8, pal: ['#6c7890'] },
        ], 32),
        face: paint([
          { shape: face, pal: PAL.skin.slice(1).concat(['#fae4c0']), tone: (x, y) => clamp(0.7 - (x - 900) / 700 - (y - 560) / 900), flow: (x, y) => 1.57 + (x - 900) * 0.002, len: 34, wid: 11, density: 3 },
          { outline: face, wid: 7, len: 34 },
        ], 33),
        hood: paint([{ shape: hood, pal: blank, tone: (x, y) => clamp(0.8 - (x - 560) / 1200), flow: (x, y) => 0.1 + Math.sin(x * 0.008) * 0.6, curve: 0.25, len: 54, wid: 15, density: 2.6 }, { outline: hood, wid: 8, len: 44 },
          ], 34),
        hair: paint([{ shape: soft([[705, 480], [750, 385], [900, 352], [1040, 385], [1095, 470], [985, 425], [900, 446], [800, 432]], 2), pal: PAL.hairBlack, flow: (x, y) => 0.9 - (x - 700) * 0.004, curve: 0.3, len: 44, wid: 12, density: 3, hug: false }], 35),
      };
    },
    draw(S, t, d, st) {
      cam(S, t, 2.4, [0, 0, 1.0], [-30, -20, 1.14], 0.3);
      S.ambient('#9aa6d8', 0.85); S.light(1500, 150, 900, '#ffd070', 0.9);
      const pulse = ss(0.4, 1.3, t);
      S.light(1020, 496, 260, '#ffcf60', 1.6 * pulse);
      S.draw(st.step);
      const br = Math.sin(t * 2.2) * 5;
      S.push(0, br); S.draw(st.wrap); S.draw(st.face); S.draw(st.hair); S.draw(st.hood);
      // sleeping face
      const ink = '#1a1430';
      S.stroke(800, 575, 0.12, 110, 13, ink, 1, 0.5, 0.12); S.stroke(1010, 568, -0.12, 110, 13, ink, 1, 0.5, 0.12);
      S.stroke(905, 640, 1.5, 50, 13, '#b08458', 0.9, 0.5); S.stroke(905, 705, 0, 70, 13, '#b4503a', 1, 0.5, 0.14);
      S.stroke(760, 660, 0.4, 80, 44, '#e08868', 0.4, 0.3); S.stroke(1060, 650, -0.4, 80, 44, '#e08868', 0.4, 0.3);
      S.stroke(690, 590, 1.5, 70, 30, '#d0a070', 1, 0.5); S.stroke(1112, 580, 1.6, 70, 30, '#d0a070', 1, 0.5);
      // the scar
      const sc = [[1004, 452], [1034, 484], [1006, 502], [1038, 540]];
      for (let i = 0; i < 3; i++) {
        const a = sc[i], b = sc[i + 1];
        S.stroke((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.atan2(b[1] - a[1], b[0] - a[0]), 52, 12 + 6 * pulse, i === 1 ? '#fbe36e' : '#e8501e', 1, 1, 0, 0.2 + i * 0.2, true);
      }
      glow(S, 1020, 496, 70 + 60 * pulse, t, { a: 0.75 * pulse, rings: 4, noCore: true });
      sparkle(S, 1020, 496, 150, t, 14, undefined, pulse * 0.9, 3);
      S.pop();
      // the stars begin to spiral in
      const sp = ss(1.4, 2.4, t);
      if (sp > 0) {
        swirl(S, 960, 500, t, { r: 1250, n: 300, turns: 1.3, speed: 0.5, inward: true, a: sp, size: 3.6, pal: ['#fff4b8', '#fbe36e', '#7db2e0', '#f7cf3a', '#b4d8ec'] });
        for (let i = 0; i < 9; i++) { const an = i * 0.7 + t * 1.6, r = 900 * (1 - sp * 0.55) * (0.4 + (i % 4) * 0.2); star(S, 960 + Math.cos(an) * r, 500 + Math.sin(an) * r * 0.6, 26, t, i * 0.31, sp); }
      }
    },
  },
};
