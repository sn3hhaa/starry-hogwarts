// Polygon geometry used to lay brushstrokes inside shapes.
// A shape is simply an array of [x, y] points (closed polygon).

export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

export function ellipse(cx, cy, rx, ry, n = 26, rot = 0) {
  const pts = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return pts;
}

/** Chaikin corner cutting: turns a rough polygon into a soft hand-drawn silhouette. */
export function soft(pts, it = 2, closed = true) {
  let p = pts;
  for (let k = 0; k < it; k++) {
    const q = [];
    const n = p.length;
    const lim = closed ? n : n - 1;
    if (!closed) q.push(p[0]);
    for (let i = 0; i < lim; i++) {
      const a = p[i], b = p[(i + 1) % n];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      q.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) q.push(p[n - 1]);
    p = q;
  }
  return p;
}

export function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

export function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function area(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return Math.abs(a / 2);
}

/** Distance to nearest polygon edge and that edge's tangent angle. */
export function nearestEdge(pts, x, y) {
  let best = Infinity, ang = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const ax = pts[j][0], ay = pts[j][1], bx = pts[i][0], by = pts[i][1];
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1e-9;
    let t = ((x - ax) * dx + (y - ay) * dy) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + dx * t - x, py = ay + dy * t - y;
    const d = px * px + py * py;
    if (d < best) { best = d; ang = Math.atan2(dy, dx); }
  }
  return { d: Math.sqrt(best), ang };
}

export const translate = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
export const scalePts = (pts, sx, sy = sx, cx = 0, cy = 0) => pts.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy]);
export function rotatePts(pts, r, cx = 0, cy = 0) {
  const c = Math.cos(r), s = Math.sin(r);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
}
export const mirrorX = (pts, cx = 0) => pts.map(([x, y]) => [2 * cx - x, y]).reverse();

/** Tapered capsule from (x0,y0) to (x1,y1) with radii r0 → r1. */
export function limb(x0, y0, x1, y1, r0, r1, n = 6) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = a + Math.PI / 2 + (i / n) * Math.PI;
    pts.push([x0 + Math.cos(t) * r0, y0 + Math.sin(t) * r0]);
  }
  for (let i = 0; i <= n; i++) {
    const t = a - Math.PI / 2 + (i / n) * Math.PI;
    pts.push([x1 + Math.cos(t) * r1, y1 + Math.sin(t) * r1]);
  }
  return pts;
}

/** Sample points along an open polyline at roughly `step` spacing → [{x,y,ang,u}] */
export function walk(pts, step, closed = false) {
  const out = [];
  const n = pts.length;
  const segs = closed ? n : n - 1;
  let total = 0;
  const lens = [];
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    lens.push(l); total += l;
  }
  if (total <= 0) return out;
  const count = Math.max(1, Math.round(total / step));
  let seg = 0, acc = 0;
  for (let k = 0; k <= count - (closed ? 1 : 0); k++) {
    const d = (k / count) * total;
    while (seg < segs - 1 && acc + lens[seg] < d) { acc += lens[seg]; seg++; }
    const a = pts[seg], b = pts[(seg + 1) % n];
    const t = lens[seg] > 0 ? (d - acc) / lens[seg] : 0;
    out.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), u: d / total });
  }
  return out;
}

/** Catmull-Rom spline through points → dense polyline. */
export function spline(pts, sub = 8, closed = false) {
  const out = [];
  const n = pts.length;
  const get = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < sub; k++) {
      const t = k / sub, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
