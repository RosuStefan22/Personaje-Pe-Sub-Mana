#!/usr/bin/env node
/* Exporta toate animatiile Alecsiei:
 *   alecsia/export/sprites/<anim>.png  + .json   (sprite sheet, fundal transparent)
 *   alecsia/export/preview/<anim>.gif             (previzualizare cu fundal)
 * Necesita: Playwright (Chromium) si ffmpeg in PATH.
 * Utilizare: node tools/export-alecsia.js [--fps 12] [--cell 480] [anim1 anim2 ...]
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const FPS = +opt('--fps', 12), CELL = +opt('--cell', 480), GIFW = +opt('--gif', 480);
const only = args;

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'alecsia', 'export');
const SPR = path.join(OUT, 'sprites'), PRE = path.join(OUT, 'preview');
fs.mkdirSync(SPR, { recursive: true }); fs.mkdirSync(PRE, { recursive: true });
const b64 = (u) => Buffer.from(u.split(',')[1], 'base64');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.error('pageerror:', e.message));
  await page.goto('file://' + path.join(ROOT, 'alecsia', 'index.html') + '?paused=1');
  await page.waitForFunction(() => window.__psm);
  const ids = await page.evaluate(() => PSM.anims.map(a => a.id));
  for (const id of ids) {
    if (only.length && !only.includes(id)) continue;
    process.stdout.write(`• ${id} … `);
    // sprite sheet transparent
    const res = await page.evaluate(async ([id, fps, cell]) => {
      const P = window.__psm, a = PSM.animById(id);
      const r = await PSM.exportSheet(P.stage, a, P.ctx, { fps, cellW: cell, transparent: true });
      return r;
    }, [id, FPS, CELL]);
    fs.writeFileSync(path.join(SPR, `${id}.png`), b64(res.png));
    fs.writeFileSync(path.join(SPR, `${id}.json`), JSON.stringify(res.meta, null, 2));
    // cadre cu fundal pentru GIF
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'alx-'));
    const n = res.meta.frameCount + (res.meta.loop ? 0 : Math.round(FPS * 0.8));
    for (let i = 0; i < n; i++) {
      const url = await page.evaluate(async ([id, t, w]) => {
        const P = window.__psm, a = PSM.animById(id);
        P.stage.showBg = true;
        return PSM.exportFramePNG(P.stage, a, a.loop ? t : Math.min(a.T, t), P.ctx, { scale: w / 1200 });
      }, [id, i / FPS, GIFW]);
      fs.writeFileSync(path.join(tmp, `f${String(i).padStart(4, '0')}.png`), b64(url));
    }
    const gif = path.join(PRE, `${id}.gif`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
      '-vf', 'split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', '-loop', '0', gif]);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`${res.meta.frameCount} cadre`);
  }
  await browser.close();
})();
