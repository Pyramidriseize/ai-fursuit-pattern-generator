// Furge geometry prototype. A parametric head base in centimetres, cut along seams and unfolded into flat pieces.
// Each panel is unfolded as a triangle strip that keeps its seam edges at their true 3D length, so neighbouring
// panels share seams of exactly equal length. Runs in pages and through import() in Node.
(function (g) {
  const { PI, sin, cos, exp, hypot, atan2, abs, min, max, sign, acos, sqrt } = Math;

  const FIT = { circumference: 58, seam: 0.6 };
  const H = { a: 11.4, b: 12.4, top: 13, low: 14, vMax: 0.83 * PI, vCap: 0.17 * PI };

  const bump = (u, v, u0, v0, su, sv) => exp(-(((u - u0) / su) ** 2) - (((v - v0) / sv) ** 2));
  const wrap = (u) => atan2(sin(u), cos(u));

  // Head surface. u is the angle around the head with 0 at the nose, v is the angle down from the crown.
  function surf(uRaw, v) {
    const u = wrap(uRaw);
    const s = sin(v), c = cos(v);
    let x = H.a * s * sin(u);
    let y = (c >= 0 ? H.top : H.low) * c;
    let z = H.b * s * cos(u);
    const au = abs(u);
    const muzzle = bump(u, v, 0, 0.59 * PI, 0.42, 0.27);
    const bridge = bump(u, v, 0, 0.47 * PI, 0.3, 0.2);
    z += 7.6 * muzzle + 2.2 * bridge;
    y += -1.1 * muzzle;
    const brow = bump(au, v, 0.56, 0.39 * PI, 0.3, 0.09);
    z += 1.1 * brow * cos(u);
    const cheek = bump(au, v, 1.02, 0.61 * PI, 0.42, 0.2);
    x += sign(u) * 3.1 * cheek;
    z += 0.5 * cheek;
    return [x, y, z];
  }

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dist3 = (a, b) => hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

  // Ears: a tapered cone standing on the head. t runs base to tip, phi runs around the ear.
  const EAR = { u: 0.9, v: 0.24 * PI, h: 12, rx: 5.2, rz: 3.2 };
  function earFrame(side) {
    const base = surf(side * EAR.u, EAR.v);
    const axis = norm([side * 0.36, 1, -0.05]);
    const across = norm(cross([0, 0, 1], axis));
    const front = norm(cross(axis, across));
    return { base: add(base, axis, -0.8), axis, across, front };
  }
  function earPoint(side, t, phi) {
    const f = earFrame(side);
    const taper = (1 - t) ** 0.72 * (1 + 0.16 * sin(PI * t));
    const lean = 1.5 * t * t;
    let p = add(f.base, f.axis, EAR.h * t);
    p = add(p, f.across, EAR.rx * taper * cos(phi) + lean * side * f.across[0]);
    p = add(p, f.front, EAR.rz * taper * sin(phi));
    return p;
  }

  // Unfolds the strip between two 3D edges. Edge lengths stay exact; width comes from the arc when one is given.
  function unfold(L, R, arcAt) {
    const n = L.length;
    const FL = [[0, 0]];
    const FR = [[arcAt ? arcAt(0) : dist3(L[0], R[0]), 0]];
    const place = (a, b, la, lb, pick) => {
      const d = hypot(b[0] - a[0], b[1] - a[1]) || 1e-6;
      const k = (la * la - lb * lb + d * d) / (2 * d);
      const h2 = la * la - k * k;
      const h = sqrt(max(h2, 0));
      const ex = [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
      const c1 = [a[0] + ex[0] * k - ex[1] * h, a[1] + ex[1] * k + ex[0] * h];
      const c2 = [a[0] + ex[0] * k + ex[1] * h, a[1] + ex[1] * k - ex[0] * h];
      return pick(c1, c2);
    };
    for (let i = 0; i < n - 1; i++) {
      const pa = FL[i], pb = FR[i];
      const dir = i > 0 ? [(FL[i][0] + FR[i][0] - FL[i - 1][0] - FR[i - 1][0]), (FL[i][1] + FR[i][1] - FL[i - 1][1] - FR[i - 1][1])] : [0, 1];
      const forward = (c1, c2) => {
        const mid = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
        const s1 = (c1[0] - mid[0]) * dir[0] + (c1[1] - mid[1]) * dir[1];
        const s2 = (c2[0] - mid[0]) * dir[0] + (c2[1] - mid[1]) * dir[1];
        return s1 >= s2 ? c1 : c2;
      };
      const widthI = arcAt ? arcAt(i) : dist3(L[i], R[i]);
      const widthN = arcAt ? arcAt(i + 1) : dist3(L[i + 1], R[i + 1]);
      const stretch = widthI / (dist3(L[i], R[i]) || 1);
      const diag = dist3(R[i], L[i + 1]) * stretch;
      const nextL = place(pa, pb, dist3(L[i], L[i + 1]), diag, forward);
      FL.push(nextL);
      FR.push(place(nextL, pb, widthN, dist3(R[i], R[i + 1]), forward));
    }
    return { L: FL, R: FR };
  }

  // Rotates and centres a flat piece so its top-to-bottom axis is vertical.
  function upright(flat) {
    const { L, R } = flat;
    const n = L.length - 1;
    const top = [(L[0][0] + R[0][0]) / 2, (L[0][1] + R[0][1]) / 2];
    const bot = [(L[n][0] + R[n][0]) / 2, (L[n][1] + R[n][1]) / 2];
    const ang = atan2(bot[0] - top[0], bot[1] - top[1]);
    const rot = (p) => [(p[0] * cos(ang) - p[1] * sin(ang)), (p[0] * sin(ang) + p[1] * cos(ang))];
    const LL = L.map(rot), RR = R.map(rot);
    const all = [...LL, ...RR];
    const minX = min(...all.map((p) => p[0])), maxX = max(...all.map((p) => p[0]));
    const minY = min(...all.map((p) => p[1])), maxY = max(...all.map((p) => p[1]));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const shift = (p) => [p[0] - cx, p[1] - cy];
    return { L: LL.map(shift), R: RR.map(shift), w: maxX - minX, h: maxY - minY };
  }

  const polyLen = (pts) => pts.slice(1).reduce((s, p, i) => s + hypot(...sub(p.length === 3 ? p : [...p, 0], pts[i].length === 3 ? pts[i] : [...pts[i], 0])), 0);
  function polyArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return a / 2;
  }

  // Pushes a closed outline outward by d, which gives the seam allowance.
  function offset(pts, d) {
    const orient = sign(polyArea(pts)) || 1;
    const n = pts.length;
    return pts.map((p, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      const e1 = norm([p[0] - a[0], p[1] - a[1], 0]), e2 = norm([b[0] - p[0], b[1] - p[1], 0]);
      const nx = orient * (e1[1] + e2[1]), ny = orient * (-e1[0] - e2[0]);
      const l = hypot(nx, ny) || 1;
      const cosHalf = max(0.5, l / 2);
      return [p[0] + (nx / l) * (d / cosHalf), p[1] + (ny / l) * (d / cosHalf)];
    });
  }

  const PANELS = [
    { code: 'H2', name: 'Face', u0: 0, u1: 0.62, qty: 2, zone: 'Coral long pile', seamL: 'CF', seamR: 'A' },
    { code: 'H3', name: 'Cheek', u0: 0.62, u1: 1.2, qty: 2, zone: 'Cream minky', seamL: 'A', seamR: 'B' },
    { code: 'H4', name: 'Side', u0: 1.2, u1: 1.86, qty: 2, zone: 'Coral long pile', seamL: 'B', seamR: 'C' },
    { code: 'H5', name: 'Back side', u0: 1.86, u1: 2.5, qty: 2, zone: 'Coral long pile', seamL: 'C', seamR: 'D' },
    { code: 'H6', name: 'Back', u0: 2.5, u1: PI, qty: 2, zone: 'Coral long pile', seamL: 'D', seamR: 'CB' },
  ];
  const STEPS = 64;

  function buildPanel(p) {
    const vs = Array.from({ length: STEPS + 1 }, (_, i) => H.vCap + ((H.vMax - H.vCap) * i) / STEPS);
    const L3 = vs.map((v) => surf(p.u0, v));
    const R3 = vs.map((v) => surf(p.u1, v));
    const arc = (i) => {
      let s = 0, prev = surf(p.u0, vs[i]);
      for (let k = 1; k <= 14; k++) {
        const q = surf(p.u0 + ((p.u1 - p.u0) * k) / 14, vs[i]);
        s += dist3(prev, q);
        prev = q;
      }
      return s;
    };
    const flat = upright(unfold(L3, R3, arc));
    const outline = [...flat.L, ...flat.R.slice().reverse()];
    return { ...p, ...flat, outline, cut: offset(outline, FIT.seam), lenL: polyLen(L3), lenR: polyLen(R3), area: abs(polyArea(offset(outline, FIT.seam))), vs };
  }

  function buildCap() {
    const pts = [];
    for (let i = 0; i < 72; i++) {
      const u = (i / 72) * 2 * PI;
      let rho = 0, prev = surf(u, 0.001);
      for (let k = 1; k <= 10; k++) {
        const q = surf(u, (H.vCap * k) / 10);
        rho += dist3(prev, q);
        prev = q;
      }
      pts.push([rho * sin(u), -rho * cos(u)]);
    }
    return { code: 'H1', name: 'Crown', qty: 1, zone: 'Coral long pile', outline: pts, cut: offset(pts, FIT.seam), area: abs(polyArea(offset(pts, FIT.seam))), w: max(...pts.map((p) => p[0])) * 2, h: max(...pts.map((p) => p[1])) * 2 };
  }

  function buildEar(code, name, phi0, phi1, zone) {
    const ts = Array.from({ length: 41 }, (_, i) => (i / 40) * 0.985);
    const L3 = ts.map((t) => earPoint(1, t, phi0));
    const R3 = ts.map((t) => earPoint(1, t, phi1));
    const arc = (i) => {
      let s = 0, prev = earPoint(1, ts[i], phi0);
      for (let k = 1; k <= 12; k++) {
        const q = earPoint(1, ts[i], phi0 + ((phi1 - phi0) * k) / 12);
        s += dist3(prev, q);
        prev = q;
      }
      return s;
    };
    const flat = upright(unfold(L3, R3, arc));
    const outline = [...flat.L, ...flat.R.slice().reverse()];
    return { code, name, qty: 2, zone, ...flat, outline, cut: offset(outline, FIT.seam), area: abs(polyArea(offset(outline, FIT.seam))) };
  }

  // Visibility: a depth buffer per view gives correct hidden-line removal for lines and silhouettes.
  const VIEWS = {
    front: (p) => [p[0], -p[1], p[2]],
    side: (p) => [p[2], -p[1], p[0]],
    top: (p) => [p[0], p[2], p[1]],
  };

  function meshes() {
    const head = { nu: 144, nv: 72, at: (i, j) => surf((i / 144) * 2 * PI - PI, 0.002 + ((H.vMax - 0.002) * j) / 72) };
    const ear = (side) => ({ nu: 40, nv: 36, at: (i, j) => earPoint(side, (j / 36) * 0.985, (i / 40) * 2 * PI) });
    return [head, ear(1), ear(-1)];
  }

  function buildView(name, ms) {
    const proj = VIEWS[name];
    const RES = 8;
    const size = 90 * RES;
    const depth = new Float32Array(size * size).fill(-1e9);
    const px = (p) => { const q = proj(p); return [q[0] * RES + size / 2, q[1] * RES + size / 2, q[2]]; };
    const raster = (a, b, c) => {
      const x0 = max(0, Math.floor(min(a[0], b[0], c[0]))), x1 = min(size - 1, Math.ceil(max(a[0], b[0], c[0])));
      const y0 = max(0, Math.floor(min(a[1], b[1], c[1]))), y1 = min(size - 1, Math.ceil(max(a[1], b[1], c[1])));
      const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (abs(den) < 1e-6) return;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const w1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / den;
          const w2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / den;
          const w3 = 1 - w1 - w2;
          if (w1 < -0.01 || w2 < -0.01 || w3 < -0.01) continue;
          const z = w1 * a[2] + w2 * b[2] + w3 * c[2];
          if (z > depth[y * size + x]) depth[y * size + x] = z;
        }
      }
    };
    for (const m of ms) {
      for (let i = 0; i < m.nu; i++) {
        for (let j = 0; j < m.nv; j++) {
          const a = px(m.at(i, j)), b = px(m.at(i + 1, j)), c = px(m.at(i + 1, j + 1)), d = px(m.at(i, j + 1));
          raster(a, b, c);
          raster(a, c, d);
        }
      }
    }
    const visible = (p3, eps = 0.55) => {
      const p = px(p3);
      const xi = Math.round(p[0]), yi = Math.round(p[1]);
      if (xi < 1 || yi < 1 || xi >= size - 1 || yi >= size - 1) return false;
      return p[2] >= depth[yi * size + xi] - eps;
    };
    // Splits a 3D polyline into 2D runs in centimetres, keeping only what the viewer can see.
    const runs = (pts) => {
      const out = [];
      let cur = [];
      for (const p of pts) {
        if (visible(p)) { const q = proj(p); cur.push([q[0], q[1]]); } else if (cur.length) { if (cur.length > 1) out.push(cur); cur = []; }
      }
      if (cur.length > 1) out.push(cur);
      return out;
    };
    // A silhouette edge sits between one quad facing the viewer and one facing away.
    const silhouette = [];
    for (const m of ms) {
      const facing = (i, j) => {
        const a = proj(m.at(i, j)), b = proj(m.at(i + 1, j)), c = proj(m.at(i + 1, j + 1)), d = proj(m.at(i, j + 1));
        return (c[0] - a[0]) * (d[1] - b[1]) - (c[1] - a[1]) * (d[0] - b[0]);
      };
      for (let i = 0; i < m.nu; i++) {
        for (let j = 0; j < m.nv; j++) {
          const f = facing(i, j);
          if (j + 1 < m.nv && f * facing(i, j + 1) < 0) silhouette.push([m.at(i, j + 1), m.at(i + 1, j + 1)]);
          if (f * facing(i + 1, j) < 0) silhouette.push([m.at(i + 1, j), m.at(i + 1, j + 1)]);
        }
      }
    }
    const silRuns = [];
    for (const [a, b] of silhouette) {
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      if (visible(mid, 1.6)) { const p = proj(a), q = proj(b); silRuns.push([[p[0], p[1]], [q[0], q[1]]]); }
    }
    return { proj, runs, silRuns, visible };
  }

  let cache;
  function model() {
    if (cache) return cache;
    const panels = PANELS.map(buildPanel);
    const cap = buildCap();
    const earFront = buildEar('H7', 'Ear front', 0, PI, 'Cream minky');
    const earBack = buildEar('H8', 'Ear back', PI, 2 * PI, 'Coral long pile');
    const pieces = [cap, ...panels, earFront, earBack];
    const ms = meshes();
    const bounds = (pts) => {
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), zs = pts.map((p) => p[2]);
      return { x: [min(...xs), max(...xs)], y: [min(...ys), max(...ys)], z: [min(...zs), max(...zs)] };
    };
    const sample = [];
    for (const m of ms) for (let i = 0; i <= m.nu; i += 2) for (let j = 0; j <= m.nv; j += 2) sample.push(m.at(i, j));
    let neck = 0, prev = surf(0, H.vMax);
    for (let i = 1; i <= 120; i++) { const q = surf((i / 120) * 2 * PI, H.vMax); neck += dist3(prev, q); prev = q; }
    const totalArea = pieces.reduce((s, p) => s + p.area * p.qty, 0);
    cache = { panels, cap, earFront, earBack, pieces, ms, box: bounds(sample), neck, totalArea };
    return cache;
  }

  g.FurgePattern = { model, surf, earPoint, buildView, H, EAR, FIT, PANELS, STEPS };
})(globalThis);
