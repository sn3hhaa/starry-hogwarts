// Small helpers shared by the shot files.

import { fill } from '../engine/patch.js';
import { rect } from '../engine/geom.js';
import { fract, clamp, smooth } from '../engine/util.js';
import { noise2 } from '../engine/rng.js';

export const once = (fn) => { let v; return () => (v === undefined ? (v = fn()) : v); };

/** eye openness with an occasional blink */
export const blink = (t, seed = 0) => { const u = fract(t * 0.31 + seed * 0.37); return u > 0.955 ? Math.abs((u - 0.9775) / 0.0225) : 1; };

/** subtle handheld drift → [dx, dy, drot] */
export const handheld = (t, amp = 1, seed = 0) => [(noise2(t * 0.7 + seed, 1.3) - 0.5) * 14 * amp, (noise2(t * 0.6 + 7, seed + 4.1) - 0.5) * 10 * amp, (noise2(t * 0.5 + 3, seed + 9.2) - 0.5) * 0.012 * amp];

/** camera with eased move between two framings [x, y, zoom, rot] plus handheld */
export function cam(S, t, d, a, b, hh = 0.5, ease = smooth) {
  const u = ease(clamp(t / d)), h = handheld(t, hh, a[0] * 0.01);
  S.camera(a[0] + (b[0] - a[0]) * u + h[0], a[1] + (b[1] - a[1]) * u + h[1], a[2] * Math.pow(b[2] / a[2], u), (a[3] ?? 0) + ((b[3] ?? 0) - (a[3] ?? 0)) * u + h[2]);
}

/** flat backdrop of strokes covering the frame (and beyond, for camera moves) */
export const backdrop = (pal, o = {}) => fill(rect(o.x ?? -300, o.y ?? -250, o.w ?? 2520, o.h ?? 1580), { pal, flow: o.flow ?? { noise: 0.003, base: 0.3, amp: 1.2 }, len: 64, wid: 17, density: 2, hug: false, seed: o.seed ?? 5, thick: 0.5, ...o });

/** talk animation: mouth open amount while a line is being spoken */
export const talk = (t, t0, t1) => (t > t0 && t < t1 ? 0.25 + 0.45 * Math.abs(Math.sin((t - t0) * 11)) * (0.6 + 0.4 * Math.sin((t - t0) * 3.7)) : 0);
