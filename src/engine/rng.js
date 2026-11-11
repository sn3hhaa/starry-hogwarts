// Deterministic randomness and noise. Every stroke in the film is seeded so
// that a given frame always paints identically.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function strSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** RNG helper with a few distributions. */
export function RNG(seed) {
  const r = mulberry32(typeof seed === 'string' ? strSeed(seed) : seed);
  const f = () => r();
  f.range = (a, b) => a + (b - a) * r();
  f.int = (a, b) => Math.floor(a + (b - a + 1) * r());
  f.pick = (arr) => arr[Math.floor(r() * arr.length)];
  f.gauss = () => (r() + r() + r() + r() - 2) * 0.866; // ~N(0,0.5)
  f.sign = () => (r() < 0.5 ? -1 : 1);
  return f;
}

// --- hash / value noise -------------------------------------------------------

export function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const sm = (t) => t * t * (3 - 2 * t);

/** Smooth 2D value noise in [0,1]. */
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const u = sm(xf), v = sm(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, y, oct = 3) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise2(x, y);
    n += a;
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 9.7;
    a *= 0.5;
  }
  return s / n;
}

// Table of pre-rolled randoms for cheap per-stroke "boil".
export const RTABLE = (() => {
  const r = mulberry32(90210);
  const t = new Float32Array(4096);
  for (let i = 0; i < t.length; i++) t[i] = r() - 0.5;
  return t;
})();
