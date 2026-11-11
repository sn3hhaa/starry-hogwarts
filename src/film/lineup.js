// Character line-up: the visual character bible, rendered by the same engine.
//   node scripts/render.mjs --film lineup --stills 1 --scale 1 --dir renders/lineup
// t = 0..1 front views, t = 2 expressions/back views.

import { fill } from '../engine/patch.js';
import { rect } from '../engine/geom.js';
import { CAST } from '../art/cast.js';
import { PAL } from '../art/palette.js';

export const lineupTimeline = { fps: 24, duration: 10, shots: [{ id: 'lineup', t0: 0, t1: 10 }] };

export const lineupShots = {
  lineup: {
    ground: '#2a3050',
    setup() {
      return {
        wall: fill(rect(-50, -50, 2020, 900), { pal: ['#2c5a70', '#3a7088', '#4c88a0', '#6aa2b4'], flow: { noise: 0.004, base: 0.4, amp: 1.4 }, len: 60, wid: 16, density: 2, hug: false, seed: 3 }),
        floor: fill(rect(-50, 820, 2020, 300), { pal: PAL.ochre, flow: 0.05, len: 70, wid: 16, density: 2, hug: false, seed: 4, tone: (x, y) => (y - 820) / 300 }),
      };
    },
    draw(S, t, d, st) {
      S.draw(st.wall); S.draw(st.floor);
      const y = 930;
      const row = t < 5
        ? [[CAST.hagrid(), 250, 0.8], [CAST.dumbledore(), 520, 0.92], [CAST.mcgonagall(), 690, 0.92], [CAST.snape(), 870, 0.92], [CAST.quirrell(), 1040, 0.92], [CAST.harry(), 1210, 0.95], [CAST.ron(), 1350, 0.95], [CAST.hermione(), 1490, 0.95], [CAST.draco(), 1640, 0.95], [CAST.goon(0), 1800, 0.9]]
        : [[CAST.vernon(), 200, 0.95], [CAST.petunia(), 420, 0.95], [CAST.dudley(), 600, 0.95], [CAST.harry('rags'), 780, 1], [CAST.ron('jumper'), 960, 1], [CAST.harry(), 1140, 1], [CAST.hermione(), 1320, 1], [CAST.lily(), 1520, 0.95], [CAST.snape(), 1740, 0.9]];
      row.forEach(([f, x, s], i) => {
        const alt = t >= 5;
        f.draw(S, { x, y, s, t: t + i, yaw: alt ? (i % 2 ? 0.6 : -0.5) : 0, back: alt && i === 5, walk: alt && i === 3 ? 0.2 : null,
          armF: alt && i === 6 ? [2.4, 0.3] : alt && i === 4 ? [1.2, 0.8] : undefined, mouth: alt ? (i % 2 ? 0.9 : -0.6) : undefined, open: alt && i === 4 ? 0.7 : 0, brow: alt ? (i % 2 ? 0.6 : -0.7) : undefined });
      });
    },
  },
};
