#!/usr/bin/env node
/* Randeaza previzualizari pentru modelul 3D (prin viewer-ul three.js, in Chromium headless):
 *   alecsia/3d/preview/<Clip>.gif  si  alecsia/3d/preview/turnaround.png
 * Utilizare: node tools/preview-alecsia-3d.js [--fps 12] [--w 480] [--h 360] [Clip1 Clip2 ...]
 */
const path = require('path'), fs = require('fs'), os = require('os');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const SKIP = args.includes('--skip-existing'); if (SKIP) args.splice(args.indexOf('--skip-existing'), 1);
const FPS = +opt('--fps', 12), W = +opt('--w', 480), H = +opt('--h', 360);
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'alecsia', '3d', 'preview');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  p.on('pageerror', e => console.error('pageerror:', e.message));
  await p.goto('file://' + path.join(ROOT, 'alecsia', '3d', 'index.html') + '?embed=1&paused=1');
  await p.waitForFunction(() => document.body.dataset.ready, null, { timeout: 120000 });
  const clips = await p.evaluate(() => window.__v.info.clips);
  for (const c of clips) {
    if (args.length && !args.includes(c.name)) continue;
    if (fs.existsSync(path.join(OUT, c.name + '.gif')) && SKIP) continue;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'alx3d-'));
    const n = Math.round(c.duration * FPS) + (c.loop ? 0 : Math.round(FPS * 0.8));
    await p.evaluate((name) => window.__v.select(name), c.name);
    for (let i = 0; i < n; i++) {
      await p.evaluate(([t, cam]) => { window.__v.setCam(cam); window.__v.setTime(t); window.__v.render(); }, [i / FPS, c.cam]);
      await p.screenshot({ path: path.join(tmp, `f${String(i).padStart(4, '0')}.png`) });
    }
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
      '-vf', 'split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', '-loop', '0', path.join(OUT, c.name + '.gif')]);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('•', c.name, n, 'cadre');
  }
  // turnaround
  if (args.length && !args.includes('turnaround')) { await b.close(); return; }
  await p.setViewportSize({ width: 420, height: 640 });
  await p.evaluate(() => window.__v.select('Idle'));
  const shots = [];
  for (const cam of ['front', 'three', 'side', 'back']) {
    await p.evaluate((cam) => { window.__v.setCam(cam); window.__v.setTime(0.5); window.__v.render(); }, cam);
    const f = path.join(os.tmpdir(), `alx_turn_${cam}.png`); await p.screenshot({ path: f }); shots.push(f);
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...shots.flatMap(f => ['-i', f]), '-filter_complex', 'hstack=inputs=4', path.join(OUT, 'turnaround.png')]);
  await b.close();
})();
