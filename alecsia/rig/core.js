/* Pe Sub Mana — nucleu comun pentru rig-urile 2D (SVG).
 * Fara dependinte, fara module ES: functioneaza si deschis direct din file://
 */
(function (root) {
  'use strict';
  const PSM = root.PSM || (root.PSM = {});
  PSM.NS = 'http://www.w3.org/2000/svg';

  // ---- Paleta Alecsia (extrasa din turnaround-ul de referinta) ----
  PSM.palette = {
    line: '#141218',
    skin: '#F0BE9B', skinSh: '#D49878', skinHi: '#F8D6BD', blush: '#E39A86',
    lip: '#BF7F6E', lipSh: '#9E5F52', mouthIn: '#5A2A2A', teeth: '#F4EEEA',
    eye: '#3A2A20', eyeWhite: '#F6F1EC',
    hair: '#121017', hairHi: '#3A3850', hairHi2: '#55536E',
    hood: '#836EB1', hoodSh: '#64519A', hoodDk: '#4C3C7C', hoodHi: '#9F8BCB',
    pants: '#26252E', pantsSh: '#17161C', pantsHi: '#3D3C49',
    shoe: '#4A4462', shoeSh: '#38334D', shoeHi: '#615A7E', sole: '#C9C2DF', soleSh: '#9C94B8', lace: '#EEECF5',
    phones: '#3A3B43', phonesHi: '#5C5E68', phonesDk: '#232329',
    laptop: '#3B3C42', laptopHi: '#55565E', laptopDk: '#26272C'
  };

  // Varianta "din spate" (membrele indepartate) — usor mai inchisa, ca in desenele cel-shaded
  PSM.darken = function (hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  };
  PSM.backPalette = (function () {
    const out = {};
    for (const k in PSM.palette) out[k] = k === 'line' ? PSM.palette.line : PSM.darken(PSM.palette[k], 0.8);
    return out;
  })();

  // ---- Helperi SVG ----
  PSM.LW = 3.2; // grosimea conturului (stil comic, linie groasa)
  PSM.shape = function (d, fill, lw) {
    return `<path d="${d}" fill="${fill}" stroke="${PSM.palette.line}" stroke-width="${lw == null ? PSM.LW : lw}" stroke-linejoin="round" stroke-linecap="round"/>`;
  };
  PSM.fill = function (d, fill, op) {
    return `<path d="${d}" fill="${fill}"${op != null ? ` opacity="${op}"` : ''}/>`;
  };
  PSM.line = function (d, color, w, op) {
    return `<path d="${d}" fill="none" stroke="${color || PSM.palette.line}" stroke-width="${w || 1.6}" stroke-linecap="round" stroke-linejoin="round"${op != null ? ` opacity="${op}"` : ''}/>`;
  };
  PSM.el = function (tag, attrs) {
    const e = document.createElementNS(PSM.NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };

  // ---- Matrice 2D [a b c d e f] ----
  const M = PSM.mat = {
    id: () => [1, 0, 0, 1, 0, 0],
    mul: (m, n) => [
      m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]
    ],
    tr: (x, y) => [1, 0, 0, 1, x, y],
    rot: (deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [c, s, -s, c, 0, 0]; },
    sc: (x, y) => [x, 0, 0, y == null ? x : y, 0, 0],
    inv: (m) => { const det = m[0] * m[3] - m[1] * m[2]; return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det]; },
    apply: (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]],
    str: (m) => `matrix(${m.map(v => +v.toFixed(4)).join(' ')})`
  };

  // ---- Utilitare animatie ----
  PSM.lerp = (a, b, t) => a + (b - a) * t;
  PSM.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  PSM.ease = {
    linear: t => t,
    inOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    out: t => 1 - (1 - t) * (1 - t),
    in: t => t * t,
    outBack: t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };

  // Interpolare de poze pe keyframe-uri: keys = [{t, pose:{...}, ease}]
  // Valorile numerice se interpoleaza, cele text (gura, ochi) se iau de la keyframe-ul anterior.
  PSM.keyframes = function (keys, t) {
    if (t <= keys[0].t) return Object.assign({}, keys[0].pose);
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t >= a.t && t <= b.t) {
        const u = (b.ease || PSM.ease.inOut)((t - a.t) / (b.t - a.t || 1));
        const out = {};
        const ks = new Set(Object.keys(a.pose).concat(Object.keys(b.pose)));
        ks.forEach(k => {
          const va = a.pose[k], vb = b.pose[k];
          if (typeof va === 'number' && typeof vb === 'number') out[k] = PSM.lerp(va, vb, u);
          else out[k] = va !== undefined ? va : vb;
        });
        return out;
      }
    }
    return Object.assign({}, keys[keys.length - 1].pose);
  };

  // Clipit natural, determinist (aceeasi animatie => aceleasi cadre)
  PSM.blink = function (t, period, offset) {
    period = period || 3.2;
    const p = ((t + (offset || 0)) % period + period) % period;
    return p < 0.12 ? 'closed' : (p < 0.18 ? 'half' : 'open');
  };
  // Lip-sync simplu, pseudo-aleator dar determinist
  PSM.talkMouth = function (t, speed) {
    const shapes = ['closed', 'small', 'wide', 'o', 'small', 'e', 'wide', 'closed', 'small', 'e', 'o', 'small'];
    const i = Math.floor(t * (speed || 9));
    const pause = Math.floor(t / 1.7) % 3 === 2 && (t % 1.7) > 1.25;
    return pause ? 'closed' : shapes[((i * 7) % shapes.length + shapes.length) % shapes.length];
  };
})(typeof window !== 'undefined' ? window : globalThis);
