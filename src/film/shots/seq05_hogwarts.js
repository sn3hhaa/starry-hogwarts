// SEQ 05 — Friends and Hogwarts (look-dev stub: sky only)

import { makeSky } from '../../art/sky.js';
import { PAL } from '../../art/palette.js';

export const shots = {
  s18_hogwarts: {
    ground: '#0e1c54',
    setup() {
      return {
        sky: makeSky({
          seed: 18, x: -300, y: -500, w: 2520, h: 1500,
          vortices: [{ x: 820, y: 250, r: 250, spin: 1, k: 3.4 }, { x: 1180, y: 330, r: 190, spin: -1, k: 2.8 }],
          stars: [{ x: 240, y: 150, r: 34 }, { x: 520, y: 90, r: 24 }, { x: 1480, y: 120, r: 30 }, { x: 1320, y: 520, r: 20 }, { x: 150, y: 470, r: 22 }, { x: 640, y: 520, r: 18 }],
          moon: { x: 1700, y: 190, r: 78 },
        }),
      };
    },
    draw(S, t, d, st) {
      S.camera(0, 0, 1, 0);
      S.layer(0.2);
      st.sky.draw(S, t);
    },
  },
};
