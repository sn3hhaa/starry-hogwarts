// Film assembly: evaluates the shot list at a time T, painting the outgoing
// shot and then the incoming one on top of it stroke by stroke (the transition
// "paints over" the previous composition instead of cross-fading pixels).

import { clamp, smooth, C, hex } from './util.js';

/**
 * Transition masks. Each returns reveal(sx, sy, seed) → 0..1 for progress p.
 *  radial : paint outward from a point
 *  inward : paint from the edges toward a point
 *  wipe   : sweep along an angle
 *  spiral : radial + angular sweep (used for the star spiral)
 *  scatter: everywhere at once, stroke by stroke
 */
export function makeReveal(tin, p) {
  const softness = tin.soft ?? 0.35;
  const kind = tin.kind ?? 'radial';
  const cx = tin.x ?? 960, cy = tin.y ?? 540;
  const jit = tin.jitter ?? 0.22;
  const pp = p * (1 + softness + jit);
  const maxD = Math.hypot(Math.max(cx, 1920 - cx), Math.max(cy, 1080 - cy));
  const ca = Math.cos(tin.angle ?? 0), sa = Math.sin(tin.angle ?? 0);
  return (sx, sy, seed) => {
    let m;
    if (kind === 'radial') m = Math.hypot(sx - cx, sy - cy) / maxD;
    else if (kind === 'inward') m = 1 - Math.hypot(sx - cx, sy - cy) / maxD;
    else if (kind === 'wipe') m = clamp(((sx - 960) * ca + (sy - 540) * sa) / 1100 * 0.5 + 0.5);
    else if (kind === 'spiral') {
      const a = (Math.atan2(sy - cy, sx - cx) / (Math.PI * 2) + 0.5);
      m = clamp(Math.hypot(sx - cx, sy - cy) / maxD * 0.75 + ((a + (tin.turns ?? 1) * Math.hypot(sx - cx, sy - cy) / maxD) % 1) * 0.25);
    } else m = 0.5;
    m += (seed - 0.5) * 2 * jit * (kind === 'scatter' ? 2.2 : 1) + jit;
    return clamp((pp - m) / softness);
  };
}

/** Twist the outgoing picture into a vortex (used with spiral transitions). */
export function swirlWarp(cx, cy, amount, fadeOut = 0) {
  return (sx, sy) => {
    const dx = sx - cx, dy = sy - cy;
    const r = Math.hypot(dx, dy);
    const a = amount * Math.exp(-r / 620) ;
    const c = Math.cos(a), s = Math.sin(a);
    return [cx + dx * c - dy * s, cy + dx * s + dy * c, a, 1 - fadeOut];
  };
}

export class Film {
  /**
   * @param timeline  parsed story/timeline.json
   * @param shots     { [id]: { setup(), draw(S, t, dur, state), tin, ground, overlay, post } }
   */
  constructor(timeline, shots) {
    this.tl = timeline;
    this.list = timeline.shots.map((s) => ({ ...s, def: shots[s.id], state: undefined }));
    this.duration = timeline.duration;
  }

  indexAt(T) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) if (T >= L[i].t0) return i;
    return 0;
  }

  _state(sh) {
    if (sh.state === undefined) sh.state = sh.def && sh.def.setup ? sh.def.setup() : null;
    return sh.state;
  }

  _drawShot(S, sh, T, extra) {
    if (!sh.def) return;
    S.beginShot();
    if (extra) extra(S);
    sh.def.draw(S, T - sh.t0, sh.t1 - sh.t0, this._state(sh));
    S.beginShot();
  }

  /** Paint frame at time T into the stage; returns post settings for the renderer. */
  frame(S, T) {
    S.reset(T);
    const i = this.indexAt(Math.min(T, this.duration - 1e-4));
    const cur = this.list[i];
    const def = cur.def || {};
    const tin = def.tin;
    let ground = def.ground ?? '#1a2244';
    const post = { ...(def.post ? def.post(T - cur.t0, cur.t1 - cur.t0) : {}) };

    if (tin && tin.dur > 0 && T < cur.t0 + tin.dur) {
      const p = clamp((T - cur.t0) / tin.dur);
      const prev = i > 0 ? this.list[i - 1] : null;
      if (prev && prev.def) {
        ground = prev.def.ground ?? ground;
        const ow = tin.outWarp ? tin.outWarp(p) : null;
        this._drawShot(S, prev, T, ow ? (st) => { st.warp = ow; } : null);
        if (prev.def.post && !def.post) Object.assign(post, prev.def.post(T - prev.t0, prev.t1 - prev.t0));
      } else if (tin.from) {
        ground = tin.from; // bare canvas
      }
      const rv = makeReveal(tin, tin.ease ? tin.ease(p) : smooth(p));
      this._drawShot(S, cur, T, (st) => { st.reveal = rv; });
    } else {
      this._drawShot(S, cur, T, null);
    }
    post.ground = C(ground);
    if (def.overlay) post.overlay = (ctx) => def.overlay(ctx, T - cur.t0, cur.t1 - cur.t0);
    return post;
  }
}
