// The Stage collects every brushstroke of a frame. Scenes draw patches through
// a transform stack and a multiplane camera; the Stage applies lighting, colour
// grading, transition reveals and the hand-painted "boil", then hands a flat
// instance buffer to the WebGL renderer.

import { PS } from './patch.js';
import { RTABLE } from './rng.js';
import { IDENT, mmul, xform, C } from './util.js';

export const STRIDE = 14; // x,y,ang,len | wid,seed,thick,curve | r,g,b,a | soft,_

export class Stage {
  constructor(max = 600000) {
    this.max = max;
    this.buf = new Float32Array(max * STRIDE);
    this.W = 1920; this.H = 1080;
    this.n = 0;
    this.batches = [];
    this.t = 0;
    this.beginShot();
  }

  /** start of a frame */
  reset(T) {
    this.n = 0;
    this.T = T;
    this.batches = [{ start: 0, clip: null }];
    this.boil = Math.floor(T * 8);
  }

  /** reset per-shot state (camera, lights, grading, transition) */
  beginShot() {
    this.m = IDENT; this.stack = [];
    this.cam = { x: 0, y: 0, zoom: 1, rot: 0 };
    this._cr = 1; this._sr = 0;
    this.par = 1; this.sc = 1; this.soft = 0;
    this.lights = []; this.amb = [1, 1, 1]; this.lit = false;
    this.grade = null;       // { sat, val, tint:[r,g,b], amt }
    this.reveal = null;      // (sx, sy, seed) => 0..1
    this.warp = null;        // (sx, sy) => [sx, sy, dAng] screen-space stroke displacement
    this.alpha = 1;
    this.boilAmt = 1;
    this.lenMul = 1;
    if (this.batches.length && this.batches[this.batches.length - 1].clip) this.unclip();
  }

  camera(x = 0, y = 0, zoom = 1, rot = 0) {
    this.cam = { x, y, zoom, rot };
    this._cr = Math.cos(rot); this._sr = Math.sin(rot);
    this.layer(this.par, this.soft);
  }

  /** choose the parallax plane: 0 = infinitely far, 1 = subject plane, >1 = foreground. soft = painterly defocus */
  layer(par = 1, soft = 0) {
    this.par = par;
    this.sc = Math.pow(this.cam.zoom, par);
    this.soft = soft;
  }

  light(x, y, r, color, k = 1) { this.lights.push({ x, y, r2: r * r, c: C(color), k }); this.lit = true; }
  ambient(color, k = 1) { const c = C(color); this.amb = [c[0] * k, c[1] * k, c[2] * k]; this.lit = true; }

  push(x = 0, y = 0, r = 0, sx = 1, sy = sx) { this.stack.push(this.m); this.m = mmul(this.m, xform(x, y, r, sx, sy)); }
  pop() { this.m = this.stack.pop(); }

  /** world (design space, current layer) → screen */
  project(X, Y) {
    const p = this.par, sc = this.sc;
    const dx = (X - 960 - this.cam.x * p) * sc, dy = (Y - 540 - this.cam.y * p) * sc;
    return [960 + dx * this._cr - dy * this._sr, 540 + dx * this._sr + dy * this._cr];
  }

  /** restrict following strokes to a rectangle given in current-layer world space (windows, frames) */
  clip(x, y, w, h) {
    const a = this.project(x, y), b = this.project(x + w, y + h);
    this.batches.push({ start: this.n, clip: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])] });
  }
  unclip() { this.batches.push({ start: this.n, clip: null }); }

  /**
   * Draw a patch under the current transform.
   * o: { a, tint:[r,g,b], amt, mul:[r,g,b], warp:(x,y,i)=>[x,y], every, len, wid, thick, unlit, from, to }
   */
  draw(patch, o) {
    if (!patch) return;
    const d = patch.d, m = this.m;
    const m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3], m4 = m[4], m5 = m[5];
    const det = m0 * m3 - m1 * m2;
    const sim = Math.abs(m0 - m3) < 1e-6 && Math.abs(m1 + m2) < 1e-6; // rotation + uniform scale
    const rot = Math.atan2(m1, m0), s = Math.sqrt(Math.abs(det));
    const flip = det < 0 ? -1 : 1;
    const a = o?.a ?? 1, every = o?.every ?? 1;
    const tint = o?.tint, amt = o?.amt ?? 0, mulc = o?.mul;
    const warp = o?.warp, lm = (o?.len ?? 1), wm = (o?.wid ?? 1), tm = o?.thick ?? 1;
    const lit = this.lit && !o?.unlit;
    const i0 = o?.from ?? 0, i1 = Math.min(patch.n, o?.to ?? patch.n);
    for (let i = i0; i < i1; i += every) {
      const k = i * PS;
      let x = d[k], y = d[k + 1];
      if (warp) { const w = warp(x, y, i); x = w[0]; y = w[1]; }
      let ang = d[k + 2], len = d[k + 3], wid = d[k + 4];
      if (sim) { ang += rot; len *= s; wid *= s; }
      else {
        const cx = Math.cos(ang), cy = Math.sin(ang);
        const tx = m0 * cx + m2 * cy, ty = m1 * cx + m3 * cy;
        const ls = Math.hypot(tx, ty) || 1e-6;
        ang = Math.atan2(ty, tx); len *= ls; wid *= Math.abs(det) / ls;
      }
      let r = d[k + 5], g = d[k + 6], b = d[k + 7];
      if (mulc) { r *= mulc[0]; g *= mulc[1]; b *= mulc[2]; }
      if (amt) { r += (tint[0] - r) * amt; g += (tint[1] - g) * amt; b += (tint[2] - b) * amt; }
      this._emit(m0 * x + m2 * y + m4, m1 * x + m3 * y + m5, ang, len * lm, wid * wm, r, g, b, d[k + 8] * a, d[k + 9], d[k + 10] * tm, d[k + 11] * flip, lit);
    }
  }

  /** emit one stroke in the current local space (faces, particles, flowing skies) */
  stroke(x, y, ang, len, wid, color, alpha = 1, thick = 0.7, curve = 0, seed = 0.5, unlit = false) {
    const m = this.m, c = C(color);
    const det = m[0] * m[3] - m[1] * m[2];
    const cx = Math.cos(ang), cy = Math.sin(ang);
    const tx = m[0] * cx + m[2] * cy, ty = m[1] * cx + m[3] * cy;
    const ls = Math.hypot(tx, ty) || 1e-6;
    this._emit(m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5], Math.atan2(ty, tx), len * ls, wid * Math.abs(det) / ls,
      c[0], c[1], c[2], alpha, seed, thick, det < 0 ? -curve : curve, this.lit && !unlit);
  }

  _emit(X, Y, ang, len, wid, r, g, b, a, seed, thick, curve, lit) {
    a *= this.alpha;
    if (a <= 0.004 || this.n >= this.max) return;
    if (lit) {
      let lr = this.amb[0], lg = this.amb[1], lb = this.amb[2];
      const L = this.lights;
      for (let i = 0; i < L.length; i++) {
        const l = L[i], dx = X - l.x, dy = Y - l.y;
        const f = l.k / (1 + (dx * dx + dy * dy) / l.r2);
        lr += l.c[0] * f; lg += l.c[1] * f; lb += l.c[2] * f;
      }
      r *= lr; g *= lg; b *= lb;
    }
    const G = this.grade;
    if (G) {
      if (G.sat != null && G.sat !== 1) { const l = 0.299 * r + 0.587 * g + 0.114 * b; r = l + (r - l) * G.sat; g = l + (g - l) * G.sat; b = l + (b - l) * G.sat; }
      if (G.val != null) { r *= G.val; g *= G.val; b *= G.val; }
      if (G.amt) { r += (G.tint[0] - r) * G.amt; g += (G.tint[1] - g) * G.amt; b += (G.tint[2] - b) * G.amt; }
    }
    // camera
    const p = this.par, sc = this.sc;
    const dx = (X - 960 - this.cam.x * p) * sc, dy = (Y - 540 - this.cam.y * p) * sc;
    let sx = 960 + dx * this._cr - dy * this._sr, sy = 540 + dx * this._sr + dy * this._cr;
    ang += this.cam.rot; len *= sc * this.lenMul; wid *= sc;
    const mrg = len * 0.6 + 4;
    if (sx < -mrg || sx > 1920 + mrg || sy < -mrg || sy > 1080 + mrg) return;
    if (this.warp) { const w = this.warp(sx, sy, seed); sx = w[0]; sy = w[1]; ang += w[2]; if (w[3] != null) { a *= w[3]; if (a <= 0.004) return; } }
    if (this.reveal) {
      const k = this.reveal(sx, sy, seed);
      if (k <= 0) return;
      if (k < 1) { len *= 0.25 + 0.75 * k; wid *= 0.5 + 0.5 * k; a *= Math.min(1, k * 2.5); }
    }
    if (this.boilAmt) {
      const idx = (((seed * 4096) | 0) + this.boil * 61) & 4095;
      const q = this.boilAmt;
      ang += RTABLE[idx] * 0.085 * q;
      sx += RTABLE[(idx + 7) & 4095] * 1.3 * q; sy += RTABLE[(idx + 13) & 4095] * 1.3 * q;
    }
    const o = this.n * STRIDE, B = this.buf;
    B[o] = sx; B[o + 1] = sy; B[o + 2] = ang; B[o + 3] = len;
    B[o + 4] = wid; B[o + 5] = seed; B[o + 6] = thick; B[o + 7] = curve;
    B[o + 8] = r; B[o + 9] = g; B[o + 10] = b; B[o + 11] = a;
    B[o + 12] = this.soft; B[o + 13] = 0;
    this.n++;
  }
}
