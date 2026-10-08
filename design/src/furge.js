// Furge drawing kit. Shared by the icon export, every mockup and every GIF.
// Runs as a classic script in pages and through import() in Node, so it only touches globalThis.
(function (g) {
  const C = {
    black: '#000000', canvas: '#0e0e10', s1: '#1c1c1e', s2: '#2c2c2e', s3: '#3a3a3c', text: '#f5f5f7', text2: '#a1a1a6',
    indigo: '#5e5ce6', violet: '#bf5af2', pink: '#ff375f', orange: '#ff9f0a', teal: '#40c8e0', mint: '#30d158', yellow: '#ffd60a',
  };

  const paint = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1, extra = '') =>
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;

  // The mark: four toes and a stitched main pad.
  const PAW = {
    toes: [[-85, -105, 62, 88, -8], [85, -105, 62, 88, 8], [-225, 5, 56, 80, -24], [225, 5, 56, 80, 24]],
    pad: 'M 0 40 C 90 40 190 130 190 220 C 190 290 130 310 80 295 C 40 283 -40 283 -80 295 C -130 310 -190 290 -190 220 C -190 130 -90 40 0 40 Z',
    stitch: 'M 0 82 C 72 82 150 156 150 222 C 150 262 118 268 84 256 C 40 243 -40 243 -84 256 C -118 268 -150 262 -150 222 C -150 156 -72 82 0 82 Z',
  };
  // One sweep across the whole paw: toes run orange to pink, the pad carries on from pink to violet.
  const pawDefs = (uid) => paint(`${uid}toe`, [[0, C.orange], [1, C.pink]]) + paint(`${uid}pad`, [[0, C.pink], [1, C.violet]]);
  function pawGlyph(uid, { stitch = true, stitchColor = '#fff' } = {}) {
    const toes = PAW.toes.map(([x, y, rx, ry, r]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${x} ${y})" fill="url(#${uid}toe)"/>`).join('');
    const s = stitch ? `<path d="${PAW.stitch}" fill="none" stroke="${stitchColor}" stroke-opacity=".92" stroke-width="6" stroke-dasharray="20 15" stroke-linecap="round"/>` : '';
    return `${toes}<path d="${PAW.pad}" fill="url(#${uid}pad)"/>${s}`;
  }

  // Continuous-corner tile, sampled from a superellipse so the corners never show a radius seam.
  function tilePath(cx = 512, cy = 512, half = 448, n = 5) {
    const pts = [];
    for (let i = 0; i < 240; i++) {
      const t = (i / 240) * Math.PI * 2;
      const c = Math.cos(t), s = Math.sin(t);
      pts.push(`${(cx + half * Math.sign(c) * Math.abs(c) ** (2 / n)).toFixed(1)} ${(cy + half * Math.sign(s) * Math.abs(s) ** (2 / n)).toFixed(1)}`);
    }
    return `M ${pts.join(' L ')} Z`;
  }

  // The app icon. `small` removes the stitch and the rim so 16px stays clean, and fills more of the tile.
  function iconSVG({ small = false, uid = 'i', size = 1024 } = {}) {
    const T = tilePath();
    const defs = `<defs>
      ${pawDefs(uid)}
      ${paint(`${uid}tile`, [[0, '#2c2c2c'], [1, '#0b0b0b']])}
      ${paint(`${uid}rim`, [[0, '#fff', 0.34], [0.4, '#fff', 0.06], [1, '#fff', 0.12]])}
      <filter id="${uid}sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity=".3"/></filter>
    </defs>`;
    const tile = `<g ${small ? '' : `filter="url(#${uid}sh)"`}><path d="${T}" fill="url(#${uid}tile)"/></g>`;
    const art = `<g transform="translate(512 ${small ? 438 : 446}) scale(${small ? 1.34 : 1.22})">${pawGlyph(uid, { stitch: !small })}</g>`;
    const edge = small ? '' : `<path d="${T}" fill="none" stroke="url(#${uid}rim)" stroke-width="3"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}">${defs}${tile}${art}${edge}</svg>`;
  }

  // Third-party sample images, all license-checked. Details and links live in CREDITS.md.
  const ART = [
    { slug: 'evan-husky', species: 'Husky', artist: 'Evan the husky', license: 'CC BY-SA 4.0' },
    { slug: 'breeze-forest', species: 'Forest spirit', artist: 'TysonTan', license: 'CC BY-SA 3.0' },
    { slug: 'kitty-teggie', species: 'Cat', artist: 'Breadwomman', license: 'CC BY 4.0' },
    { slug: 'puzzoz-group', species: 'Fox and friends', artist: 'Puzzoz', license: 'CC BY-SA 4.0' },
    { slug: 'juwan-pigeon', species: 'Pigeon', artist: 'Sheyenne Smith', license: 'CC0' },
    { slug: 'dexter-mantis', species: 'Mantis', artist: 'Abuggus', license: 'CC BY-SA 4.0' },
  ];
  const IMG = '../../assets/third-party/';

  const icons = {
    scissors: '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    sheet: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    cpu: '<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    usb: '<circle cx="10" cy="7" r="1"/><circle cx="4" cy="20" r="1"/><path d="M4.7 19.3 19 5"/><path d="m21 3-3 1 2 2Z"/><path d="M9.26 7.68 5 12l2 5"/><path d="m10 14 5 2 3.5-3.5"/><path d="m18 12 1-1 1 1-1 1Z"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
  };

  g.Furge = { C, PAW, ART, IMG, pawDefs, pawGlyph, paint, tilePath, iconSVG, icons };
})(globalThis);
