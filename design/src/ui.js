// Window chrome shared by the mockup pages.
(function (g) {
  const icon = (name, size = 16, sw = 1.75) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${g.Furge.icons[name]}</svg>`;

  const NAV = {
    Studio: [['Blueprints', 'scissors'], ['Art', 'image'], ['Ref sheets', 'sheet']],
    Library: [['Fursonas', 'users'], ['Projects', 'folder'], ['Models', 'cpu']],
  };
  const sidebar = (active) => `<aside class="side">
    <div class="lights"><i></i><i></i><i></i></div>
    ${Object.entries(NAV).map(([group, items]) => `<h4>${group}</h4>${items.map(([label, ic]) => `<div class="nav ${label === active ? 'on' : ''}">${icon(ic)}${label}</div>`).join('')}`).join('')}
    <div class="device"><b>RTX 3060, 12 GB</b><span><i></i>Running on this PC</span></div>
  </aside>`;

  const cursorSVG = `<svg class="cursor" id="cursor" width="22" height="28" viewBox="0 0 22 28"><path d="M2 1.8 V22.6 L7.4 17.6 L11 26 L14.6 24.4 L11 16.2 H18.4 Z" fill="#000" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

  // Timeline helpers for the GIF pages.
  const ease = (v) => { const t = Math.max(0, Math.min(1, v)); return 1 - (1 - t) ** 3; };
  const easeIO = (v) => { const t = Math.max(0, Math.min(1, v)); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
  const span = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const glowCSS = (deg) => `conic-gradient(from ${deg}deg, #5e5ce6, #bf5af2, #ff375f, #ff9f0a, #ff375f, #bf5af2, #5e5ce6)`;

  g.FurgeUI = { icon, sidebar, cursorSVG, ease, easeIO, span, glowCSS };
})(globalThis);
