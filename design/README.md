# Furge design source

Everything in `assets/brand`, `assets/blueprints`, `assets/mockups` and `assets/readme` renders from this folder.

```bash
npm install
npx playwright install chromium
node render.mjs all
```

`node render.mjs icon`, `stills` or `gifs` renders one group, and `node render.mjs gifs hero` renders one file. GIFs also need `ffmpeg` and `gifsicle` on your `PATH`, and the icon step needs Python with Pillow.

## Direction

- **Look:** black surfaces, glass panels, large tight headlines. One gradient runs orange to pink to violet.
- **The gradient is reserved** for the mark, drawn pattern lines and AI activity. Primary buttons are white with a black label.
- **Type:** SF Pro on Apple devices, Inter everywhere else. SF Pro's license doesn't allow shipping it in this repo or in a Windows or Linux app, so it only ever comes from the system. Rendering on a Mac with SF Pro installed uses it automatically.
- **Imagery and patterns:** real, license-checked work only, credited in `CREDITS.md`. Mockups label it as a sample, because it isn't Furge output.

Tokens live in `tokens.css`, shared drawing code in `src/furge.js`, window chrome in `src/ui.js` and `src/ui.css`. Each scene is one HTML file in `src/`, and animated scenes expose `window.seek(t)`.

## Blueprints

- `freesewing.mjs` drafts the real patterns with FreeSewing and writes printable SVGs plus `src/generated/fs-data.js`.
- `src/pattern.js` is the head base prototype: a parametric surface cut along seams and unfolded as triangle strips. Seam edges keep their true 3D length, so neighboring panels match. It hasn't been test-sewn.
- `src/sheet.js` lays both out as A3 sheets in the `cyan`, `ink` or `paper` theme.
