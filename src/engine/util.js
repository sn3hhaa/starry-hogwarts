// Small math, easing and colour helpers shared by the whole film.

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, x) => clamp((x - a) / (b - a));
export const remap = (x, a, b, c, d) => lerp(c, d, inv(a, b, x));
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const smoother = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
/** smoothstep between two times */
export const ss = (a, b, x) => smooth(inv(a, b, x));
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const backOut = (t) => { t = clamp(t); const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
/** 0→1→0 pulse centred at c with half-width w */
export const pulse = (x, c, w) => smooth(1 - Math.abs(x - c) / w);
export const fract = (x) => x - Math.floor(x);

/** Piecewise keyframes: keys = [[t, v], ...]; smooth interpolation. v may be number or array. */
export function key(keys, t, ease = smooth) {
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t >= t0 && t <= t1) {
      const u = ease((t - t0) / (t1 - t0));
      if (Array.isArray(v0)) return v0.map((a, j) => lerp(a, v1[j], u));
      return lerp(v0, v1, u);
    }
  }
  return last[1];
}

// --- colour -------------------------------------------------------------------

const hexCache = new Map();
/** '#rrggbb' → [r,g,b] in 0..1 (cached, do not mutate the result) */
export function hex(h) {
  let c = hexCache.get(h);
  if (!c) {
    const n = parseInt(h.slice(1), 16);
    c = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    hexCache.set(h, c);
  }
  return c;
}
export const C = (c) => (typeof c === 'string' ? hex(c) : c);
export const mix = (a, b, t) => { a = C(a); b = C(b); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };
export const mul = (a, k) => { a = C(a); return [a[0] * k, a[1] * k, a[2] * k]; };
export const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
export function sat(c, s) { c = C(c); const l = lum(c); return [l + (c[0] - l) * s, l + (c[1] - l) * s, l + (c[2] - l) * s]; }

// --- 2D affine [a,b,c,d,e,f]: x' = a x + c y + e ; y' = b x + d y + f -----------

export const IDENT = [1, 0, 0, 1, 0, 0];
export function mmul(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}
export function xform(x = 0, y = 0, r = 0, sx = 1, sy = sx) {
  const c = Math.cos(r), s = Math.sin(r);
  return [c * sx, s * sx, -s * sy, c * sy, x, y];
}
export const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
