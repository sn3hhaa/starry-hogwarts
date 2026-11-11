// A reusable painted character rig.
// Every character is the same articulated figure (root → hips → torso → head,
// two jointed arms, two legs) dressed in character-specific stroke patches, so
// a face, a costume and a silhouette stay identical in every shot.
//
// Local space: origin at the feet, +x is the direction the character faces
// (when face = 1), y grows downward. A child is ~300 units tall.

import { paint } from '../engine/patch.js';
import { ellipse, soft, limb } from '../engine/geom.js';
import { C, clamp, TAU } from '../engine/util.js';
import { PAL, INK } from './palette.js';

const DEF = {
  H: 300,
  head: { rx: 31, ry: 36 },
  neck: 7,
  torso: { len: 92, sw: 33, ww: 27 },
  arm: { upper: 46, lower: 42, r: 10.5 },
  leg: { len: 108, r: 12.5, gap: 13 },
  robe: { len: 0.74, hem: 46 },       // len: fraction of leg covered (1 = floor)
  legs: true,
};

/** light-from-upper-left tone: 1 on the lit side → 0 in shadow */
const sideTone = (w, bias = 0.55, k = 0.5) => (x, y) => clamp(bias - (x / w) * k);

export function makeFigure(spec) {
  const sp = { ...DEF, ...spec, head: { ...DEF.head, ...spec.head }, torso: { ...DEF.torso, ...spec.torso }, arm: { ...DEF.arm, ...spec.arm }, leg: { ...DEF.leg, ...spec.leg }, robe: { ...DEF.robe, ...spec.robe } };
  const det = sp.detail ?? 1;
  const u = Math.pow(sp.H / 300, 0.55) / Math.sqrt(det);       // stroke size unit
  const L = 15 * u, Wd = 5.2 * u;
  const { rx, ry } = sp.head;
  const T = sp.torso.len, sw = sp.torso.sw, ww = sp.torso.ww;
  const legLen = sp.leg.len, hipY = legLen;
  const robeL = legLen * sp.robe.len, hem = sp.robe.hem;
  const cloth = sp.cloth ?? PAL.black;
  const sleeve = sp.sleeve ?? cloth;
  const skin = sp.skin ?? PAL.skin;
  const seed = sp.seed ?? 1;
  const ink = sp.ink ?? INK;
  const ow = 3.6 * u; // outline width

  // ---- body (torso + robe / coat), torso frame: origin = hips, shoulders at y = -T
  const bodyShape = sp.bodyShape ? sp.bodyShape({ T, sw, ww, robeL, hem }) : soft([
    [-sw, -T + 5], [-sw * 0.5, -T - 5], [sw * 0.5, -T - 5], [sw, -T + 5],
    [ww + 3, -T * 0.42], [ww + 5, 0], [hem, robeL], [-hem, robeL], [-ww - 5, 0], [-ww - 3, -T * 0.42],
  ], 2);
  const body = paint([
    { shape: bodyShape, pal: cloth, tone: sideTone(hem * 2.2, 0.5, 0.6), flow: (x, y) => Math.PI / 2 + (x / (hem * 2.4)) * (y > 0 ? -0.5 : -0.15), len: L * 1.25, wid: Wd * 1.15, density: 2.6, thick: 0.7, spread: 0.2 },
    ...(sp.bodyDetail ? sp.bodyDetail({ T, sw, ww, robeL, hem, L, Wd, u }) : []),
    { outline: bodyShape, wid: ow, len: L * 1.2, pal: ink },
  ], seed * 7 + 1);

  // ---- limbs
  const ar = sp.arm.r;
  const upperShape = limb(0, 0, 0, sp.arm.upper, ar, ar * 0.86);
  const lowerShape = limb(0, 0, 0, sp.arm.lower, ar * 0.9, ar * 0.72);
  const mkLimb = (shape, pal, s) => paint([
    { shape, pal, tone: sideTone(ar * 2.4, 0.5, 0.7), flow: Math.PI / 2, len: L, wid: Wd, density: 2.6, thick: 0.65 },
    { outline: shape, wid: ow * 0.9, len: L, pal: ink },
  ], seed * 7 + s);
  const upper = mkLimb(upperShape, sleeve, 2), lower = mkLimb(lowerShape, sleeve, 3);
  const hr = sp.hand ?? ar * 0.82;
  const handShape = ellipse(0, sp.arm.lower + hr * 0.5, hr * 0.95, hr * 1.1, 12);
  const hand = paint([
    { shape: handShape, pal: skin, tone: sideTone(hr * 2, 0.6, 0.5), flow: Math.PI / 2, len: L * 0.7, wid: Wd * 0.8, density: 2.8, thick: 0.6 },
    { outline: handShape, wid: ow * 0.7, len: L * 0.6, pal: ink },
  ], seed * 7 + 4);

  let leg = null, shoe = null;
  if (sp.legs) {
    const lr = sp.leg.r;
    const legShape = limb(0, 0, 0, legLen - lr * 0.6, lr, lr * 0.78);
    leg = mkLimb(legShape, sp.trouser ?? PAL.black, 5);
    const shoeShape = soft([[-lr * 0.9, legLen - lr * 1.3], [lr * 1.9, legLen - lr * 0.9], [lr * 2.2, legLen], [-lr * 0.9, legLen]], 1);
    shoe = paint([{ shape: shoeShape, pal: sp.shoe ?? PAL.black, flow: 0, len: L * 0.8, wid: Wd, density: 2.6, under: false }, { outline: shoeShape, wid: ow * 0.8, len: L * 0.7, pal: ink }], seed * 7 + 6);
  }

  // ---- head
  const headShape = sp.headShape ? sp.headShape(rx, ry) : soft([
    [-rx * 0.86, -ry * 0.62], [-rx * 0.5, -ry], [rx * 0.5, -ry], [rx * 0.86, -ry * 0.62],
    [rx * 0.96, 0], [rx * 0.74, ry * 0.6], [rx * 0.3, ry], [-rx * 0.3, ry], [-rx * 0.74, ry * 0.6], [-rx * 0.96, 0],
  ], 2);
  const head = paint([
    { shape: headShape, pal: skin, tone: (x, y) => clamp(0.62 - (x / rx) * 0.32 - (y / ry) * 0.12), flow: (x, y) => Math.PI / 2 + (x / rx) * 0.5, len: L * 0.95, wid: Wd * 0.95, density: 3.0, thick: 0.6, spread: 0.18 },
    { outline: headShape, wid: ow * 0.85, len: L * 0.8, pal: ink },
  ], seed * 7 + 8);
  const neckShape = [[-rx * 0.34, -T - 6 - sp.neck - ry * 0.3], [rx * 0.34, -T - 6 - sp.neck - ry * 0.3], [rx * 0.4, -T + 2], [-rx * 0.4, -T + 2]];
  const neck = paint([{ shape: neckShape, pal: skin.slice(0, 3), flow: Math.PI / 2, len: L * 0.8, wid: Wd, density: 2.6, under: false }], seed * 7 + 9);
  const headY = -T - sp.neck - ry * 0.92;

  // character dressing: [{ slot, patch, follow, warp }]
  // slots: 'back' (behind everything), 'body' (over body), 'hairBack' (behind head), 'head' (over face), 'hairOver' (back view only)
  const P = { T, sw, ww, rx, ry, L, Wd, u, robeL, hem, ow, headY, legLen, seed };
  const extras = sp.extras ? sp.extras(P) : [];
  const ex = (slot) => extras.filter((e) => e.slot === slot);

  const F = sp.face ?? {};
  const eyeC = C(F.eye ?? '#2a3454'), browC = C(F.brow ?? '#1a1420'), lipC = C(F.lip ?? '#9a4a3a');
  const whiteC = C(F.white ?? '#f2eedc'), inkC = C(ink[0]), shadeC = C(skin[0]), blushC = C(F.blush ?? '#d8785a');
  const es = rx * 0.2 * (F.eyeSize ?? 1);

  function drawFace(S, p) {
    const yaw = p.yaw ?? 0, fx = yaw * rx * 0.4;
    const exx = rx * 0.4 * (1 - 0.22 * Math.abs(yaw)), ey = -ry * 0.04 + (F.eyeY ?? 0) * ry;
    const open = clamp(p.blink ?? 1), b = p.brow ?? (F.brow0 ?? 0);
    const look = p.look ?? [yaw * 0.5, 0];
    for (const side of [-1, 1]) {
      const far = side * yaw < 0 ? 1 - 0.38 * Math.abs(yaw) : 1;
      const x = fx + side * exx * (side * yaw < 0 ? 1 - 0.15 * Math.abs(yaw) : 1), y = ey;
      if (open > 0.2) {
        S.stroke(x, y, 0, es * 1.9 * far, es * 1.15 * open, whiteC, 1, 0.25, 0, 0.21 + side * 0.07);
        S.stroke(x + look[0] * es * 0.42, y + look[1] * es * 0.3, 1.57, es * 1.0 * open, es * 0.95 * far, eyeC, 1, 0.35, 0, 0.33);
        S.stroke(x + look[0] * es * 0.42, y + look[1] * es * 0.3, 1.57, es * 0.5 * open, es * 0.45 * far, inkC, 1, 0.3, 0, 0.47);
      }
      S.stroke(x, y - es * 0.55 * open, side * 0.07, es * 2.2 * far, es * 0.42, inkC, 1, 0.45, 0, 0.53 + side * 0.03);
      // brow: b < 0 angry (inner ends low), b > 0 raised
      S.stroke(x + side * es * 0.1, y - es * (1.5 + 0.55 * Math.max(b, 0)) + (F.browY ?? 0), side * b * 0.42 + side * (F.browTilt ?? 0), es * 2.4 * far * (F.browLen ?? 1), es * 0.6 * (F.browW ?? 1), browC, 1, 0.55, 0, 0.61 + side * 0.05);
    }
    // nose
    const nl = ry * 0.34 * (F.nose ?? 1), nx = fx + yaw * rx * 0.16 + rx * 0.03;
    S.stroke(nx, ey + es * 0.5 + nl * 0.5, 1.57 - 0.12 - yaw * 0.2 + (F.hook ?? 0), nl, es * 0.55 * (F.noseW ?? 1), shadeC, 0.9, 0.5, (F.hook ?? 0) * 0.5, 0.71);
    S.stroke(nx + es * 0.25, ey + es * 0.5 + nl, 0.2, es * 1.1 * (F.noseW ?? 1), es * 0.45, shadeC, 0.9, 0.45, 0, 0.73);
    // cheeks
    if (F.blush !== false) for (const side of [-1, 1]) S.stroke(fx * 0.8 + side * rx * 0.5, ey + ry * 0.36, side * 0.5, es * 1.7, es * 1.0, blushC, 0.42, 0.3, 0, 0.8 + side * 0.03);
    if (F.freckles) for (let i = 0; i < 8; i++) S.stroke(fx * 0.9 + (i % 4 - 1.5) * rx * 0.22 + (i > 3 ? rx * 0.05 : 0), ey + ry * (0.2 + (i > 3 ? 0.1 : 0)), i, es * 0.4, es * 0.35, '#c8703a', 0.8, 0.3, 0, i * 0.11);
    // mouth: m -1 frown … +1 smile, o = open
    const m = p.mouth ?? (F.mouth0 ?? 0.1), o = clamp(p.open ?? 0);
    const mx = fx * 0.9, my = ry * (0.52 + (F.mouthY ?? 0)), mw = rx * 0.62 * (F.mouthW ?? 1) * (1 - 0.2 * Math.abs(yaw));
    if (o > 0.08) {
      S.stroke(mx, my + ry * 0.05 * o, 0, mw * (0.8 + 0.2 * o), ry * 0.3 * o + es * 0.3, '#3a1418', 1, 0.3, 0, 0.87);
      S.stroke(mx, my - ry * 0.1 * o - es * 0.05, 0, mw, es * 0.42, lipC, 1, 0.45, -m * 0.16, 0.9);
      S.stroke(mx, my + ry * 0.2 * o + es * 0.12, 0, mw * 0.8, es * 0.42, lipC, 1, 0.45, 0.12 + m * 0.12, 0.93);
    } else {
      // corners lift for a smile: two half strokes
      for (const side of [-1, 1]) S.stroke(mx + side * mw * 0.24, my - Math.abs(m) * 0 - m * es * 0.18, -side * m * 0.34, mw * 0.56, es * 0.46, lipC, 1, 0.5, 0, 0.9 + side * 0.03);
    }
    if (sp.faceExtra) sp.faceExtra(S, p, { fx, ey, es, rx, ry });
  }

  /**
   * pose: { x, y, s, face, lean, bend, bob, yaw, tilt, back, armF:[a,b], armB:[a,b],
   *         walk (cycle phase), stride, brow, mouth, open, blink, look, t, wind, a, mul, tint, amt, hold(S), holdB(S) }
   */
  function draw(S, p = {}) {
    const s = p.s ?? 1, f = p.face ?? 1, t = p.t ?? 0, wind = p.wind ?? 0;
    const o = { a: p.a ?? 1, mul: p.mul, tint: p.tint, amt: p.amt, unlit: p.unlit };
    const ph = p.walk != null ? p.walk * TAU : null;
    const stride = p.stride ?? 0.45;
    const bob = (p.bob ?? 0) + (ph != null ? Math.cos(ph * 2) * 2.5 * (sp.H / 300) : 0) + Math.sin(t * 1.6 + seed) * 0.8; // breathing
    const sway = (Math.sin(t * 1.9 + seed * 3) * 0.6 + wind) * (sp.sway ?? 1);
    const hemWarp = (x, y) => (y > 0 ? [x + Math.sin(t * 2.3 + y * 0.03 + seed) * 3.5 * u * (y / (robeL + 1)) + sway * 9 * u * Math.pow(y / (robeL + 1), 1.5) + (ph != null ? Math.sin(ph + y * 0.02) * 5 * u * (y / (robeL + 1)) : 0), y] : [x, y]);

    S.push(p.x ?? 0, p.y ?? 0, p.lean ?? 0, s * f, s);
    const xw = (e) => (e.warp ? (x, y, i) => e.warp(x, y, t, sway, p) : undefined);

    S.push(0, -hipY + bob, p.bend ?? 0);
    for (const e of ex('back')) S.draw(e.patch, { ...o, warp: xw(e) });
    S.pop();

    if (leg) {
      const la = ph != null ? Math.sin(ph) * stride : (p.legF ?? 0), lb = ph != null ? -Math.sin(ph) * stride : (p.legB ?? 0);
      for (const [dx, a] of [[-sp.leg.gap, lb], [sp.leg.gap, la]]) {
        S.push(dx, -hipY + bob, -a);
        S.draw(leg, o); S.draw(shoe, o);
        S.pop();
      }
    }

    S.push(0, -hipY + bob, p.bend ?? 0);
    S.draw(body, { ...o, warp: hemWarp });
    for (const e of ex('body')) S.draw(e.patch, { ...o, warp: xw(e) });

    // head (behind the arms so raised hands read clearly)
    const drawHead = () => {
      S.draw(neck, o);
      S.push(0, headY, p.tilt ?? 0);
      const yaw = p.yaw ?? 0, fx = yaw * rx * 0.4;
      for (const e of ex('hairBack')) { S.push(-fx * 0.25, 0); S.draw(e.patch, { ...o, warp: xw(e) }); S.pop(); }
      S.draw(head, o);
      if (!p.back) {
        const lit = S.lit; // faces keep scene lighting through stroke()
        if (o.a >= 0.99 && !o.amt) drawFace(S, p);
        else { const pa = S.alpha; S.alpha *= o.a * (1 - (o.amt ?? 0) * 0.6); drawFace(S, p); S.alpha = pa; }
        for (const e of ex('head')) { S.push(fx * (e.follow ?? 0.3), 0); S.draw(e.patch, { ...o, warp: xw(e) }); S.pop(); }
      } else {
        for (const e of ex('hairOver')) S.draw(e.patch, { ...o, warp: xw(e) });
        for (const e of ex('head')) if (e.backToo) S.draw(e.patch, { ...o, warp: xw(e) });
      }
      S.pop();
    };

    const arm = (side, ang, holdFn) => {
      const a1 = ang ? ang[0] : (ph != null ? -side * Math.sin(ph) * 0.42   : side * 0.1), a2 = ang ? ang[1] : (ph != null ? 0.25 : 0.1);
      S.push(side * sw * 0.8, -T + 11 * (sp.H / 300), -a1);
      S.draw(upper, o);
      S.push(0, sp.arm.upper - 2, -a2);
      S.draw(lower, o);
      if (holdFn) { S.push(0, sp.arm.lower + hr * 0.6); holdFn(S, o); S.pop(); }
      S.draw(hand, o);
      S.pop(); S.pop();
    };
    arm(-1, p.armB, p.holdB);
    drawHead();
    arm(1, p.armF, p.hold);
    S.pop();
    S.pop();
  }

  /** world position of the front hand for a pose (for attaching magic, wands…) */
  function handPos(p, side = 1) {
    const s = p.s ?? 1, f = p.face ?? 1;
    const ang = side > 0 ? p.armF : p.armB;
    const a1 = ang ? ang[0] : 0.06, a2 = ang ? ang[1] : 0.1;
    let x = side * sw * 0.9, y = -hipY - T + 9;
    x += Math.sin(a1) * sp.arm.upper; y += Math.cos(a1) * sp.arm.upper;
    x += Math.sin(a1 + a2) * (sp.arm.lower + hr); y += Math.cos(a1 + a2) * (sp.arm.lower + hr);
    return [(p.x ?? 0) + x * s * f, (p.y ?? 0) + y * s];
  }
  const headPos = (p) => [(p.x ?? 0), (p.y ?? 0) + (-hipY + headY) * (p.s ?? 1)];

  return { draw, handPos, headPos, spec: sp, H: sp.H };
}

// ---------------------------------------------------------------------------
// Dressing helpers shared by the cast
// ---------------------------------------------------------------------------

/** Explicit radiating tufts (messy hair, beards, manes): returns stroke list for strokes() */
export function tufts(cx, cy, rx, ry, a0, a1, n, len, wid, pal, rng, lean = 0, curve = 0.1) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * ((i + rng()) / n);
    const rr = 0.82 + rng() * 0.3;
    out.push([cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr, a + lean + (rng() - 0.5) * 0.7, len * (0.7 + rng() * 0.6), wid * (0.7 + rng() * 0.6), pal[Math.floor(rng() * pal.length)], 1, 0.8, curve * (rng() - 0.3)]);
  }
  return out;
}
