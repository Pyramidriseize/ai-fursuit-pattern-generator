// Draws engineering sheets at A3 landscape: the head base from the geometry prototype, and real FreeSewing patterns.
(function (g) {
  const { model, surf, earPoint, buildView, H, FIT, STEPS } = g.FurgePattern;
  const { PI, hypot } = Math;
  const W = 1400, H_SHEET = 990, CM = 1400 / 42 / 4, M_ = 26;

  const THEMES = {
    ink: { bg: '#000000', line: '#f5f5f7', muted: '#a1a1a6', faint: 'rgb(255 255 255 / 0.2)', grid: 'rgb(255 255 255 / 0.055)', accent: 'url(#sweep)', accentText: '#ff6a88', fillA: 'url(#sweep)', fillOp: 0.17 },
    cyan: { bg: '#0b2f8a', line: '#ffffff', muted: '#b9cdf7', faint: 'rgb(255 255 255 / 0.27)', grid: 'rgb(255 255 255 / 0.08)', accent: '#ffffff', accentText: '#ffffff', fillA: '#ffffff', fillOp: 0.08 },
    paper: { bg: '#f5f5f7', line: '#1d1d1f', muted: '#6e6e73', faint: 'rgb(0 0 0 / 0.24)', grid: 'rgb(0 0 0 / 0.06)', accent: '#ff375f', accentText: '#d70f45', fillA: '#ff375f', fillOp: 0.08 },
  };
  const FONT = `font-family="'SF Pro Text', -apple-system, Inter, sans-serif" text-rendering="geometricPrecision" letter-spacing="0"`;
  const DEFS = `<defs><linearGradient id="sweep" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0"><stop offset="0" stop-color="#ff9f0a"/><stop offset=".5" stop-color="#ff375f"/><stop offset="1" stop-color="#bf5af2"/></linearGradient></defs>`;

  const path = (pts, close = false) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('') + (close ? 'Z' : '');

  // Shared drawing-office furniture: text, frame with zone marks, tables and the title block.
  function kit(T) {
    const text = (x, y, s, { size = 10, weight = 500, fill = T.line, anchor = 'start', extra = '' } = {}) =>
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" style="font-variant-numeric:tabular-nums" ${extra}>${s}</text>`;
    const frame = () => {
      const m = M_;
      let out = `<rect x="${m}" y="${m}" width="${W - m * 2}" height="${H_SHEET - m * 2}" fill="none" stroke="${T.line}" stroke-width="1.3"/>`;
      for (let i = 0; i < 8; i++) {
        const x = m + ((W - m * 2) * i) / 8, xc = x + (W - m * 2) / 16;
        if (i) out += `<path d="M${x} ${m - 9}V${m}M${x} ${H_SHEET - m}V${H_SHEET - m + 9}" stroke="${T.line}" stroke-width=".7"/>`;
        out += text(xc, m - 8, i + 1, { size: 8, fill: T.muted, anchor: 'middle' }) + text(xc, H_SHEET - 9, i + 1, { size: 8, fill: T.muted, anchor: 'middle' });
      }
      for (let i = 0; i < 6; i++) {
        const y = m + ((H_SHEET - m * 2) * i) / 6, yc = y + (H_SHEET - m * 2) / 12 + 3;
        if (i) out += `<path d="M${m - 9} ${y}H${m}M${W - m} ${y}H${W - m + 9}" stroke="${T.line}" stroke-width=".7"/>`;
        const L = 'ABCDEF'[i];
        out += text(m - 13, yc, L, { size: 8, fill: T.muted, anchor: 'middle' }) + text(W - m + 13, yc, L, { size: 8, fill: T.muted, anchor: 'middle' });
      }
      let grid = '';
      for (let x = m; x <= W - m; x += CM * 5) grid += `<path d="M${x.toFixed(1)} ${m}V${H_SHEET - m}"/>`;
      for (let y = m; y <= H_SHEET - m; y += CM * 5) grid += `<path d="M${m} ${y.toFixed(1)}H${W - m}"/>`;
      return `<g stroke="${T.grid}" stroke-width=".7" fill="none">${grid}</g>${out}`;
    };
    const table = (x, y, w, title, heads, rows) => {
      let out = text(x, y, title, { size: 12, weight: 600 });
      const y0 = y + 10;
      out += `<path d="M${x} ${y0}H${x + w}" stroke="${T.line}" stroke-width=".9"/>`;
      heads.forEach(([label, cx, anchor]) => { out += text(x + cx, y0 + 12, label, { size: 8, fill: T.muted, anchor }); });
      rows.forEach((r, i) => {
        const ry = y0 + 27 + i * 15;
        out += `<path d="M${x} ${ry - 11}H${x + w}" stroke="${T.faint}" stroke-width=".5"/>`;
        heads.forEach(([, cx, anchor], c) => { out += text(x + cx, ry, r[c], { size: 9, weight: c === 0 ? 600 : 500, anchor }); });
      });
      return out;
    };
    // cells: six [value, key] pairs. lines: [left, right] rows. note: one closing line.
    const block = (title, cells, lines, note) => {
      const tb = { x: 1060, y: 802 };
      tb.w = W - M_ - tb.x; tb.h = H_SHEET - M_ - tb.y;
      const rule = (y) => `<path d="M${tb.x} ${y}H${tb.x + tb.w}" stroke="${T.line}" stroke-width=".6"/>`;
      let out = `<rect x="${tb.x}" y="${tb.y}" width="${tb.w}" height="${tb.h}" fill="${T.bg}" stroke="${T.line}" stroke-width="1.3"/>`;
      out += text(tb.x + 10, tb.y + 24, title, { size: 17, weight: 600, extra: 'letter-spacing="-.3"' }) + text(tb.x + tb.w - 10, tb.y + 24, 'Furge', { size: 13, weight: 600, anchor: 'end' });
      out += rule(tb.y + 36);
      const col = tb.w / 3;
      cells.forEach(([v, k], i) => {
        const x = tb.x + 10 + col * (i % 3), y = tb.y + 49 + Math.floor(i / 3) * 33;
        out += text(x, y, k, { size: 7.5, fill: T.muted }) + text(x, y + 12, v, { size: 10, weight: 600 });
      });
      out += rule(tb.y + 104);
      lines.forEach(([a, b], i) => { out += text(tb.x + 10, tb.y + 119 + i * 13, a, { size: 9 }) + text(tb.x + tb.w - 10, tb.y + 119 + i * 13, b, { size: 9, anchor: 'end', fill: T.muted }); });
      const ny = tb.y + 112 + lines.length * 13 + 3;
      out += rule(ny) + text(tb.x + 10, ny + 14, note, { size: 8.5, fill: T.muted });
      return out;
    };
    return { text, frame, table, block };
  }

  const wrap = (T, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H_SHEET}" width="${W}" height="${H_SHEET}" ${FONT}>${DEFS}<rect width="${W}" height="${H_SHEET}" fill="${T.bg}"/>${body}</svg>`;

  // FreeSewing draws in millimetres, so line weights are set per sheet to stay even at any scale.
  const fsStyle = (T, k) => `<style>
    svg.freesewing { color: ${T.line}; }
    svg.freesewing path, svg.freesewing circle { stroke: ${T.line}; stroke-width: ${1.1 / k}; }
    svg.freesewing path:not([class]), svg.freesewing path.fabric:not(.sa) { stroke: ${T.line}; stroke-width: ${0.8 / k}; stroke-dasharray: ${4 / k} ${3 / k}; }
    svg.freesewing path.fabric.sa { stroke: ${T.line}; stroke-width: ${1.25 / k}; stroke-dasharray: none; }
    svg.freesewing .note, svg.freesewing .mark, svg.freesewing .stroke-mark { stroke: ${T.muted} !important; }
    svg.freesewing text, svg.freesewing tspan { fill: ${T.line} !important; stroke: none !important; font-family: inherit; }
    svg.freesewing .note, svg.freesewing .mark { stroke-width: ${0.6 / k}; }
    svg.freesewing .fill-note, svg.freesewing .fill-mark { fill: ${T.muted}; }
    svg.freesewing .fill-current { fill: ${T.line}; }
    svg.freesewing .fill-bg { fill: ${T.bg}; }
    svg.freesewing use { fill: ${T.line}; stroke: ${T.line}; }
  </style>`;

  const nest = (key, x, y, k) => {
    const d = g.FurgeFS[key];
    return d.svg.replace(/<svg[^>]*?class="freesewing"[^>]*>/, `<svg class="freesewing" x="${x}" y="${y}" width="${(d.w * k).toFixed(1)}" height="${(d.h * k).toFixed(1)}" viewBox="0 0 ${d.w} ${d.h}">`);
  };

  // At A3, 420 mm of paper spans the sheet, so a 1:N scale gives this many sheet units per real millimetre.
  const unitsPerMm = (N) => (W / 420) / N;

  const cutText = (p) => `${p.qty}${p.mirrored ? ', mirrored' : ''}${p.onFold ? ', on fold' : ''}`;

  // Scale bar and line key for the FreeSewing sheets.
  const legendFor = (T, text) => (x, y, k) => {
    let out = '';
    const seg = 50 * k;
    for (let i = 0; i < 5; i++) out += `<rect x="${x + i * seg}" y="${y}" width="${seg}" height="6" fill="${i % 2 ? 'none' : T.line}" stroke="${T.line}" stroke-width=".7"/>${text(x + i * seg, y + 16, i * 5, { size: 8, anchor: i ? 'middle' : 'start', fill: T.muted })}`;
    out += text(x + 5 * seg, y + 16, '25 cm', { size: 8, anchor: 'middle', fill: T.muted });
    [[`<path d="M0 0H26" stroke="${T.line}" stroke-width="1.25"/>`, 'Cut line'], [`<path d="M0 0H26" stroke="${T.line}" stroke-width=".8" stroke-dasharray="4 3"/>`, 'Stitch line'], [`<path d="M2 0H24M2 0l5 -3v6zM24 0l-5 -3v6z" stroke="${T.muted}" stroke-width=".6" fill="${T.muted}"/>`, 'Grainline']].forEach(([sym, label], i) => {
      const ly = y + 38 + i * 15;
      out += `<g transform="translate(${x} ${ly})">${sym}</g>${text(x + 34, ly + 3, label, { size: 8.5 })}`;
    });
    return out;
  };

  function sharkSVG({ theme = 'cyan' } = {}) {
    const T = THEMES[theme];
    const { text, frame, table, block } = kit(T);
    const legend = legendFor(T, text);
    const d = g.FurgeFS.hi;
    const N = [2, 2.5, 3, 4, 5, 6, 8].find((n) => d.w * unitsPerMm(n) <= 990 && d.h * unitsPerMm(n) <= 900);
    const k = unitsPerMm(N);
    const rows = d.parts.map((p) => [p.nr, p.name, cutText(p)]);
    const body = frame() + nest('hi', 44, 46, k) + fsStyle(T, k) + legend(1060, 300, k)
      + table(1060, 70, 300, 'Cut list', [['No.', 0, 'start'], ['Part', 34, 'start'], ['Cut', 300, 'end']], rows)
      + block('Hi the shark', [['100%', 'Size'], ['10 mm', 'Seam allowance'], [`1:${N} on A3`, 'Scale'], [`${d.parts.length}`, 'Pieces'], ['Plush toy', 'Type'], ['MIT', 'License']],
        [['Design', 'Wouter Van Wageningen'], ['Source', 'FreeSewing']], 'Real pattern by FreeSewing contributors. Not made by Furge.');
    return { svg: wrap(T, body), N };
  }

  function bodysuitSVG({ theme = 'cyan' } = {}) {
    const T = THEMES[theme];
    const { text, frame, table, block } = kit(T);
    const legend = legendFor(T, text);
    const FS = g.FurgeFS;
    const N = [2.5, 3, 4, 5, 6, 8, 10].find((n) => (FS.torso.w + FS.legs.w) * unitsPerMm(n) + 30 <= 1290 && Math.max(FS.torso.h, FS.legs.h) * unitsPerMm(n) <= 756);
    const k = unitsPerMm(N);
    const rows = [];
    for (const [key, label] of [['torso', 'Body'], ['legs', 'Legs']]) FS[key].parts.forEach((p) => rows.push([label, p.name, cutText(p)]));
    const tableY = 46 + FS.torso.h * k + 42;
    const body = frame() + nest('torso', 44, 46, k) + nest('legs', 44 + FS.torso.w * k + 30, 46, k) + fsStyle(T, k)
      + legend(60, tableY + 150, k)
      + table(60, tableY, 420, 'Cut list', [['Set', 0, 'start'], ['Part', 60, 'start'], ['Cut', 420, 'end']], rows)
      + block('Bodysuit base', [['100 cm', 'Chest'], ['86 cm', 'Waist'], ['96 cm', 'Hips'], ['79 cm', 'Inseam'], ['10 mm', 'Seam allowance'], [`1:${N} on A3`, 'Scale']],
        [['Body block', 'Joost De Cock'], ['Trouser block', 'Debra Bean, Joost De Cock']], 'Real blocks by FreeSewing contributors. Not made by Furge.');
    return { svg: wrap(T, body), N };
  }

  function headSVG({ theme = 'cyan' } = {}) {
    const T = THEMES[theme];
    const { text, frame, table, block } = kit(T);
    const M = model();
    let body = frame();

    // Orthographic views in third-angle projection: top below front, side to the right of front.
    const VP = { front: { ox: 188, oy: 262 }, side: { ox: 448, oy: 262 }, top: { ox: 188, oy: 690 } };
    const seamUs = [0, ...M.panels.slice(1).map((p) => p.u0)];
    const uvEye = (a) => [0.86 + 0.17 * Math.cos(a), 0.445 * PI + 0.052 * PI * Math.sin(a) - 0.018 * PI * Math.cos(a)];
    for (const name of ['front', 'side', 'top']) {
      const V = buildView(name, M.ms);
      const { ox, oy } = VP[name];
      const S = (p) => [ox + p[0] * CM, oy + p[1] * CM];
      const stroke = (runs) => runs.map((r) => path(r.map(S))).join('');
      let thin = '';
      for (let j = 1; j < 12; j++) {
        const v = 0.002 + (H.vMax * j) / 12;
        thin += stroke(V.runs(Array.from({ length: 241 }, (_, i) => surf((i / 240) * 2 * PI - PI, v))));
      }
      for (let i = 0; i < 24; i++) {
        const u = (i / 24) * 2 * PI - PI;
        thin += stroke(V.runs(Array.from({ length: 121 }, (_, j) => surf(u, 0.002 + ((H.vMax - 0.002) * j) / 120))));
      }
      for (const side of [1, -1]) {
        for (let i = 0; i < 12; i++) thin += stroke(V.runs(Array.from({ length: 41 }, (_, j) => earPoint(side, (j / 40) * 0.985, (i / 12) * 2 * PI))));
        for (let j = 1; j < 6; j++) thin += stroke(V.runs(Array.from({ length: 61 }, (_, i) => earPoint(side, j / 6, (i / 60) * 2 * PI))));
      }
      let seams = '';
      for (const u of seamUs) for (const su of u === 0 ? [0] : [u, -u]) seams += stroke(V.runs(Array.from({ length: 161 }, (_, j) => surf(su, H.vCap + ((H.vMax - H.vCap) * j) / 160))));
      seams += stroke(V.runs(Array.from({ length: 241 }, (_, i) => surf((i / 240) * 2 * PI - PI, H.vCap))));
      seams += stroke(V.runs(Array.from({ length: 241 }, (_, i) => surf((i / 240) * 2 * PI - PI, H.vMax))));
      seams += stroke(V.runs(Array.from({ length: 161 }, (_, j) => surf(PI, H.vCap + ((H.vMax - H.vCap) * j) / 160))));
      let features = '';
      for (const sgn of [1, -1]) features += stroke(V.runs(Array.from({ length: 61 }, (_, i) => { const [u, v] = uvEye((i / 60) * 2 * PI); return surf(sgn * u, v); })));
      features += stroke(V.runs(Array.from({ length: 61 }, (_, i) => { const a = (i / 60) * 2 * PI; return surf(0.075 * Math.cos(a), 0.585 * PI + 0.024 * PI * Math.sin(a)); })));
      const sil = V.silRuns.map((r) => path(r.map(S))).join('');
      body += `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${thin}" stroke="${T.faint}" stroke-width=".55"/><path d="${seams}" stroke="${T.accent}" stroke-width="1.15"/><path d="${features}" stroke="${T.line}" stroke-width="1.1"/><path d="${sil}" stroke="${T.line}" stroke-width="1.45"/></g>`;
    }

    // Dimension lines read straight from the model.
    const dimH = (x1, x2, y, y0, label) => `<g stroke="${T.muted}" stroke-width=".6" fill="none"><path d="M${x1} ${y0}V${y + 4}M${x2} ${y0}V${y + 4}M${x1} ${y}H${x2}"/><path d="M${x1} ${y}l7 -2.4v4.8zM${x2} ${y}l-7 -2.4v4.8z" fill="${T.muted}" stroke="none"/></g>${text((x1 + x2) / 2, y - 4, label, { size: 9.5, anchor: 'middle' })}`;
    const dimV = (y1, y2, x, x0, label) => `<g stroke="${T.muted}" stroke-width=".6" fill="none"><path d="M${x0} ${y1}H${x - 4}M${x0} ${y2}H${x - 4}M${x} ${y1}V${y2}"/><path d="M${x} ${y1}l-2.4 7h4.8zM${x} ${y2}l-2.4 -7h4.8z" fill="${T.muted}" stroke="none"/></g>${text(x - 5, (y1 + y2) / 2, label, { size: 9.5, anchor: 'middle', extra: `transform="rotate(-90 ${x - 5} ${(y1 + y2) / 2})"` })}`;
    const b = M.box;
    const cm = (v) => `${v.toFixed(1)} cm`;
    const fx = VP.front.ox, fy = VP.front.oy, sx = VP.side.ox;
    const topY = fy - b.y[1] * CM, botY = fy - b.y[0] * CM;
    body += `<g stroke="${T.muted}" stroke-width=".6" stroke-dasharray="14 3 2 3"><path d="M${fx} ${topY - 12}V${botY + 14}"/><path d="M${fx - 150} ${fy}H${fx + 150}"/><path d="M${fx} ${VP.top.oy - 120}V${VP.top.oy + 190}"/><path d="M${sx - 120} ${fy}H${sx + 200}"/></g>`;
    body += dimH(fx + b.x[0] * CM, fx + b.x[1] * CM, botY + 30, botY + 4, cm(b.x[1] - b.x[0]));
    body += dimV(topY, botY, fx + b.x[0] * CM - 24, fx + b.x[0] * CM - 4, cm(b.y[1] - b.y[0]));
    body += dimH(sx + b.z[0] * CM, sx + b.z[1] * CM, botY + 30, botY + 4, cm(b.z[1] - b.z[0]));
    const viewLabel = (x, y, s, sub) => text(x, y, s, { size: 12, weight: 600 }) + text(x, y + 13, sub, { size: 9, fill: T.muted });
    body += viewLabel(58, 62, 'Front', 'Third-angle projection') + viewLabel(352, 62, 'Side', 'Seen from the right') + viewLabel(58, 530, 'Top', 'Nose toward the bottom');

    // Leader callouts for the parts a maker asks about first.
    const fV = buildView('front', M.ms);
    const leader = (p, x2, y2, s) => {
      const q = fV.proj(p);
      const x1 = fx + q[0] * CM, y1 = fy + q[1] * CM;
      return `<circle cx="${x1}" cy="${y1}" r="2" fill="${T.line}"/><path d="M${x1} ${y1}L${x2} ${y2}H${x2 + 10}" fill="none" stroke="${T.muted}" stroke-width=".6"/>${text(x2 + 13, y2 + 3, s, { size: 9 })}`;
    };
    body += leader(surf(0.86, 0.445 * PI), 300, 112, 'Eye opening') + leader(surf(0, 0.585 * PI), 300, 368, 'Nose');

    // Flat pieces with the sewing marks that make them usable.
    const LAY = [
      ['H2', 738, 262], ['H3', 880, 262], ['H4', 1012, 262], ['H5', 1140, 262], ['H6', 1262, 262],
      ['H1', 738, 628], ['H7', 880, 640], ['H8', 1012, 640],
    ];
    const byCode = Object.fromEntries(M.pieces.map((p) => [p.code, p]));
    for (const [code, ox, oy] of LAY) {
      const p = byCode[code];
      const S = (q) => [ox + q[0] * CM, oy + q[1] * CM];
      let marks = '';
      if (p.L && p.vs) {
        for (const [edge, seam, nudge] of [[p.L, p.seamL, -1], [p.R, p.seamR, 1]]) {
          [0.28, 0.62].forEach((f, n) => {
            const i = Math.round(f * STEPS);
            const a = edge[i - 1], c = edge[i + 1], q = edge[i];
            const tl = hypot(c[0] - a[0], c[1] - a[1]) || 1;
            const nx = (-(c[1] - a[1]) / tl) * -nudge, ny = ((c[0] - a[0]) / tl) * -nudge;
            const s0 = S(q), s1 = S([q[0] + nx * FIT.seam, q[1] + ny * FIT.seam]);
            marks += `<path d="M${s0[0]} ${s0[1]}L${s1[0]} ${s1[1]}" stroke="${T.accent}" stroke-width="1.5"/>`;
            marks += text(s1[0] + nx * 7, s1[1] + ny * 7 + 3, `${seam}${n + 1}`, { size: 7, fill: T.accentText, anchor: 'middle', weight: 600 });
          });
        }
      }
      const ear = code === 'H7' || code === 'H8';
      const naps = code === 'H1' ? '' : `<path d="M${ox} ${oy + 26}v${ear ? 16 : 32}m-3.6 -6l3.6 6l3.6 -6" fill="none" stroke="${T.line}" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round"/>`;
      const labelY = code === 'H1' ? oy + 2 : oy + 8;
      const lowest = Math.max(...p.cut.map((q) => S(q)[1]));
      body += `<path d="${path(p.cut.map(S), true)}" fill="${T.fillA}" fill-opacity="${T.fillOp}" stroke="${T.line}" stroke-width="1.15" stroke-linejoin="round"/><path d="${path(p.outline.map(S), true)}" fill="none" stroke="${T.line}" stroke-opacity=".78" stroke-width=".65" stroke-dasharray="4 3"/>${marks}${naps}`
        + text(ox, labelY, code, { size: 12, weight: 700, anchor: 'middle' }) + text(ox, labelY + 11, p.name, { size: 8.5, anchor: 'middle' })
        + text(ox, lowest + 16, `Cut ${p.qty}${p.qty > 1 ? ', mirrored' : ''}`, { size: 8.5, fill: T.muted, anchor: 'middle' });
    }

    // Eye opening mapped onto the cheek panel through the same (u, v) surface coordinates.
    const cheek = byCode.H3;
    const flatAt = (u, v) => {
      const f = ((v - H.vCap) / (H.vMax - H.vCap)) * STEPS;
      const i = Math.max(0, Math.min(STEPS - 1, Math.floor(f))), t = f - i;
      const lerp = (A, B, k) => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k];
      const k = (u - cheek.u0) / (cheek.u1 - cheek.u0);
      return lerp(lerp(cheek.L[i], cheek.R[i], k), lerp(cheek.L[i + 1], cheek.R[i + 1], k), t);
    };
    const eyeFlat = Array.from({ length: 49 }, (_, i) => { const [u, v] = uvEye((i / 48) * 2 * PI); return flatAt(u, v); });
    body += `<path d="${path(eyeFlat.map((q) => [880 + q[0] * CM, 262 + q[1] * CM]), true)}" fill="none" stroke="${T.accent}" stroke-width="1"/>`;

    // Test square, scale bar, legend.
    const tx = 1102, ty = 540, sq = 5 * CM;
    body += `<rect x="${tx}" y="${ty}" width="${sq}" height="${sq}" fill="none" stroke="${T.line}" stroke-width="1"/>${text(tx + sq / 2, ty + sq / 2 + 3, '5 cm', { size: 8, anchor: 'middle', weight: 600 })}${text(tx + sq + 8, ty + 11, 'Test square', { size: 9.5, weight: 600 })}${text(tx + sq + 8, ty + 23, 'At 1:4 on A3 this is 1.25 cm.', { size: 8.5, fill: T.muted })}${text(tx + sq + 8, ty + 34, 'Full-size print: 5 cm exactly.', { size: 8.5, fill: T.muted })}`;
    const by = ty + 72;
    for (let i = 0; i < 4; i++) body += `<rect x="${tx + i * 5 * CM}" y="${by}" width="${5 * CM}" height="6" fill="${i % 2 ? 'none' : T.line}" stroke="${T.line}" stroke-width=".7"/>${text(tx + i * 5 * CM, by + 16, i * 5, { size: 8, anchor: 'middle', fill: T.muted })}`;
    body += text(tx + 20 * CM, by + 16, '20 cm', { size: 8, anchor: 'middle', fill: T.muted });
    [
      [`<path d="M0 0H26" stroke="${T.line}" stroke-width="1.15"/>`, 'Cut line'],
      [`<path d="M0 0H26" stroke="${T.line}" stroke-width=".65" stroke-dasharray="4 3"/>`, `Stitch line, ${FIT.seam * 10} mm in`],
      [`<path d="M0 0H26" stroke="${T.line}" stroke-width=".6" stroke-dasharray="10 2 2 2"/>`, 'CF, CB: center front and back seams'],
      [`<path d="M13 -5V5" stroke="${T.accent}" stroke-width="1.5"/>`, 'Notch: join A1 to A1'],
      [`<path d="M13 -7v14m-3 -5l3 5l3 -5" fill="none" stroke="${T.line}" stroke-width=".9"/>`, 'Fur nap direction'],
    ].forEach(([sym, label], i) => { const y = by + 34 + i * 15; body += `<g transform="translate(${tx} ${y})">${sym}</g>${text(tx + 34, y + 3, label, { size: 8.5 })}`; });

    // Tables a maker can check against: every piece, and every seam with its true length.
    const TX = 352, TW = 272;
    body += table(TX, 530, TW, 'Cut list', [['Part', 0, 'start'], ['Name', 34, 'start'], ['Qty', 118, 'end'], ['Fur', 134, 'start'], ['cm² each', TW, 'end']], M.pieces.map((p) => [p.code, p.name, p.qty, p.zone.split(' ')[0], `${Math.round(p.area)}`]));
    const P = M.panels;
    const seamRows = [['CF', 'H2 to H2', P[0].lenL.toFixed(1), '0.0']];
    ['A', 'B', 'C', 'D'].forEach((k, i) => { seamRows.push([k, `${P[i].code} to ${P[i + 1].code}`, P[i].lenR.toFixed(1), Math.abs(P[i].lenR - P[i + 1].lenL).toFixed(1)]); });
    seamRows.push(['CB', 'H6 to H6', P[4].lenR.toFixed(1), '0.0']);
    body += table(TX, 720, TW, 'Seam check', [['Seam', 0, 'start'], ['Joins', 44, 'start'], ['Length, cm', 196, 'end'], ['Mismatch, cm', TW, 'end']], seamRows);

    const fur = {};
    M.pieces.forEach((p) => { fur[p.zone] = (fur[p.zone] || 0) + p.area * p.qty; });
    body += block('Mira, head base', [[`${FIT.circumference} cm`, 'Head circumference'], ['Fox, toony', 'Style'], [`${M.neck.toFixed(1)} cm`, 'Neck opening'], [`${FIT.seam * 10} mm`, 'Seam allowance'], ['1:4 on A3', 'Scale'], ['Prototype', 'Status']],
      Object.entries(fur).map(([z, a]) => [z, `${(((a / 150) * 1.5) / 100).toFixed(2)} m at 150 cm wide`]), 'Concept drawing from the geometry prototype. Not test-sewn yet.');
    return { svg: wrap(T, body), N: 4 };
  }

  g.FurgeSheet = { sharkSVG, bodysuitSVG, headSVG, THEMES, W, H: H_SHEET };
})(globalThis);
