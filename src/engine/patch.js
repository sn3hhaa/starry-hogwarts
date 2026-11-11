// Stroke patches: pre-painted groups of brushstrokes in an object's local space.
// A patch is generated once (seeded) and then re-projected every frame, which is
// what keeps the paint attached to the object instead of to the screen.
//
// Stroke record: x, y, angle, length, width, r, g, b, alpha, seed, thickness, curve

import { RNG, fbm } from './rng.js';
import { bbox, inPoly, nearestEdge, walk } from './geom.js';
import { C, clamp } from './util.js';

export const PS = 12;

export class Patch {
  constructor(data, n) { this.d = data; this.n = n; }
}

class Builder {
  constructor() { this.a = []; }
  add(x, y, ang, len, wid, c, alpha, seed, thick, curve) {
    this.a.push(x, y, ang, len, wid, c[0], c[1], c[2], alpha, seed, thick, curve);
  }
  done() { return new Patch(new Float32Array(this.a), this.a.length / PS); }
}

export function join(...patches) {
  const list = patches.flat().filter(Boolean);
  let n = 0;
  for (const p of list) n += p.n;
  const d = new Float32Array(n * PS);
  let o = 0;
  for (const p of list) { d.set(p.d.subarray(0, p.n * PS), o); o += p.n * PS; }
  return new Patch(d, n);
}

/** Normalise a palette into [{c:[r,g,b], w}] */
function palette(pal) {
  return pal.map((e) => (Array.isArray(e) && typeof e[0] !== 'number' ? { c: C(e[0]), w: e[1] ?? 1 } : { c: C(e), w: 1 }));
}

function pickColor(P, rng, tone, spread) {
  if (tone == null) {
    let tot = 0;
    for (const p of P) tot += p.w;
    let r = rng() * tot;
    for (const p of P) { r -= p.w; if (r <= 0) return p.c; }
    return P[P.length - 1].c;
  }
  const f = clamp(tone + rng.gauss() * spread) * (P.length - 1);
  const i = Math.min(P.length - 1, Math.max(0, Math.round(f)));
  return P[i].c;
}

function vary(c, rng, vj, hj) {
  const k = 1 + rng.gauss() * vj;
  const h = rng.gauss() * hj;
  return [clamp(c[0] * k + h, 0, 1.3), clamp(c[1] * k, 0, 1.3), clamp(c[2] * k - h, 0, 1.3)];
}

function flowFn(flow, bb) {
  if (typeof flow === 'function') return flow;
  if (typeof flow === 'number') return () => flow;
  if (flow && flow.ring) { const [cx, cy] = flow.ring; return (x, y) => Math.atan2(y - cy, x - cx) + Math.PI / 2; }
  if (flow && flow.radial) { const [cx, cy] = flow.radial; return (x, y) => Math.atan2(y - cy, x - cx); }
  if (flow && flow.noise) { const s = flow.noise, b = flow.base ?? 0, amp = flow.amp ?? 1.2; return (x, y) => b + (fbm(x * s, y * s, 2) - 0.5) * 2 * amp; }
  return () => 0;
}

/**
 * Fill a polygon with brushstrokes.
 *  pal      palette: ['#hex', ['#hex', weight], ...]  (ordered dark→light when `tone` is used)
 *  tone     (x,y)=>0..1 chooses along the palette (form shading by colour zones)
 *  flow     angle | (x,y)=>angle | {ring:[cx,cy]} | {radial:[cx,cy]} | {noise:scale, base, amp}
 *  len,wid  stroke size in design units
 *  density  coverage multiplier
 *  hug      strokes close to the silhouette align to it (clean, hand-drawn edges)
 *  under    lay a broad underpainting first so no bare canvas shows through
 */
export function fill(shape, o = {}) {
  const B = new Builder();
  fillInto(B, shape, o);
  return B.done();
}

function fillInto(B, shape, o) {
  const rng = RNG(o.seed ?? 7);
  const len = o.len ?? 38, wid = o.wid ?? 11;
  const P = palette(o.pal ?? ['#1d4aa5']);
  const bb = bbox(shape);
  const flow = flowFn(o.flow ?? 0, bb);
  const jit = o.jit ?? 0.22;
  const hug = o.hug ?? true;
  const thick = o.thick ?? 0.6;
  const alpha = o.alpha ?? 1;
  const vj = o.vj ?? 0.07, hj = o.hj ?? 0.015;
  const curve = o.curve ?? 0;
  const spread = o.spread ?? 0.22;

  const pass = (L, Wd, density, dark, a, hugIt, tk) => {
    const cell = Math.sqrt((L * Wd * 0.62) / density);
    const nx = Math.ceil(bb.w / cell) + 1, ny = Math.ceil(bb.h / cell) + 1;
    const cells = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) cells.push(j * nx + i);
    // shuffle for natural overlap
    for (let i = cells.length - 1; i > 0; i--) { const k = Math.floor(rng() * (i + 1)); const t = cells[i]; cells[i] = cells[k]; cells[k] = t; }
    for (const id of cells) {
      const i = id % nx, j = (id - i) / nx;
      const x = bb.x0 + (i + rng()) * cell, y = bb.y0 + (j + rng()) * cell;
      if (!inPoly(shape, x, y)) continue;
      let ang = flow(x, y) + rng.gauss() * jit;
      let l = L * (0.7 + rng() * 0.6), w = Wd * (0.75 + rng() * 0.5);
      if (hugIt) {
        const e = nearestEdge(shape, x, y);
        if (e.d < l * 0.52) {
          // align to the silhouette, keeping the general flow direction
          let ea = e.ang;
          if (Math.cos(ea - ang) < 0) ea += Math.PI;
          ang = ea + rng.gauss() * 0.06;
          if (e.d < w * 0.5) w = Math.max(w * 0.6, e.d * 2 + w * 0.35);
        }
      }
      const tone = o.tone ? o.tone(x, y, bb) : null;
      let c = typeof o.pal === 'function' ? C(o.pal(x, y, rng, bb)) : pickColor(P, rng, tone, spread);
      c = vary(c, rng, vj, hj);
      if (dark !== 1) c = [c[0] * dark, c[1] * dark, c[2] * dark];
      B.add(x, y, ang, l, w, c, a, rng(), tk, curve ? curve * (0.5 + rng()) : 0);
    }
  };

  if (o.under ?? true) pass(len * 1.7, wid * 2.3, 1.5, o.underDark ?? 0.82, 1, false, thick * 0.5);
  pass(len, wid, o.density ?? 2.3, 1, alpha, hug, thick);
}

/** Strokes laid end to end along a polyline: outlines, hair, rails, rigging. */
export function line(pts, o = {}) {
  const B = new Builder();
  lineInto(B, pts, o);
  return B.done();
}

function lineInto(B, pts, o) {
  const rng = RNG(o.seed ?? 11);
  const len = o.len ?? 26, wid = o.wid ?? 5;
  const P = palette(o.pal ?? ['#0d1330']);
  const samples = walk(pts, len * (o.step ?? 0.55), o.closed ?? false);
  const wob = o.wob ?? 0.8, jit = o.jit ?? 0.1;
  const thick = o.thick ?? 0.7, alpha = o.alpha ?? 1;
  for (const s of samples) {
    let w = wid * (0.7 + rng() * 0.6);
    if (o.taper) w *= 0.35 + 0.65 * Math.sin(Math.PI * clamp(s.u * 0.9 + 0.05));
    if (o.taperEnd) w *= 1 - 0.75 * s.u;
    const c = vary(pickColor(P, rng, o.tone ? o.tone(s.u) : null, 0.15), rng, o.vj ?? 0.06, 0.01);
    B.add(s.x + rng.gauss() * wob, s.y + rng.gauss() * wob, s.ang + rng.gauss() * jit, len * (0.8 + rng() * 0.4), w, c, alpha, rng(), thick, o.curve ?? 0);
  }
}

/** Expressive, uneven outline around a shape. */
export function outline(shape, o = {}) {
  return line(shape, { closed: true, len: 22, wid: 4.5, pal: ['#0d1330', '#141c3c', '#1a1430'], wob: 0.9, ...o });
}

/** Free-form: place explicit strokes. list = [[x,y,ang,len,wid,color,alpha?,thick?,curve?], ...] */
export function strokes(list, seed = 3) {
  const rng = RNG(seed);
  const B = new Builder();
  for (const s of list) B.add(s[0], s[1], s[2], s[3], s[4], C(s[5]), s[6] ?? 1, rng(), s[7] ?? 0.7, s[8] ?? 0);
  return B.done();
}

/**
 * Compose several fills / lines into one patch, painted in order.
 * parts = [{ shape, ...fillOptions } | { line: pts, ...lineOptions } | { outline: shape, ... } | Patch]
 */
export function paint(parts, seed = 1) {
  const B = new Builder();
  let k = 0;
  for (const p of parts) {
    if (!p) continue;
    k++;
    if (p instanceof Patch) { for (let i = 0; i < p.n * PS; i++) B.a.push(p.d[i]); continue; }
    const s = (p.seed ?? 0) + seed * 131 + k * 17;
    if (p.line) lineInto(B, p.line, { ...p, seed: s });
    else if (p.outline) lineInto(B, p.outline, { closed: true, len: 22, wid: 4.5, pal: ['#0d1330', '#141c3c', '#1a1430'], wob: 0.9, ...p, seed: s });
    else fillInto(B, p.shape, { ...p, seed: s });
  }
  return B.done();
}
