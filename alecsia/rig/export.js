/* Export: cadru PNG/SVG si sprite sheet-uri (PNG + JSON cu metadate), direct din browser. */
(function (root) {
  'use strict';
  const PSM = root.PSM;
  PSM.serializeSVG = function (svg) {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', PSM.NS);
    clone.removeAttribute('style');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
  };
  PSM.download = function (url, name) {
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  };
  function svgToImage(svg, w, h, viewBox) {
    return new Promise((res, rej) => {
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', PSM.NS);
      clone.setAttribute('width', w); clone.setAttribute('height', h);
      if (viewBox) clone.setAttribute('viewBox', viewBox);
      clone.removeAttribute('style');
      const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
      const img = new Image();
      img.onload = () => res(img); img.onerror = rej; img.src = src;
    });
  }
  PSM.exportFramePNG = async function (stage, anim, t, ctx, opts) {
    opts = opts || {};
    stage.render(anim.frame(t, ctx), t);
    const vb = stage.svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const sc = opts.scale || 1, w = Math.round(vb[2] * sc), h = Math.round(vb[3] * sc);
    const img = await svgToImage(stage.svg, w, h);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/png');
  };
  // Sprite sheet: cadre la fps-ul ales, aranjate in grila; fundal transparent optional.
  PSM.exportSheet = async function (stage, anim, ctx, opts) {
    opts = opts || {};
    const fps = opts.fps || 24, n = Math.max(1, Math.round(anim.T * fps));
    const cellW = opts.cellW || 600, cellH = Math.round(cellW * 675 / 1200);
    const cols = Math.min(n, opts.cols || 8), rows = Math.ceil(n / cols);
    const c = document.createElement('canvas'); c.width = cols * cellW; c.height = rows * cellH;
    const g = c.getContext('2d');
    const prevBg = stage.showBg;
    if (opts.transparent) stage.showBg = false;
    const frames = [];
    for (let i = 0; i < n; i++) {
      const t = anim.loop ? i / fps : Math.min(anim.T, i / fps);
      stage.render(anim.frame(t, ctx), t);
      const img = await svgToImage(stage.svg, cellW, cellH);
      const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
      g.drawImage(img, x, y);
      frames.push({ i, t: +t.toFixed(4), x, y, w: cellW, h: cellH });
    }
    stage.showBg = prevBg;
    return {
      png: c.toDataURL('image/png'),
      meta: { character: 'Alecsia', project: 'Pe Sub Mana', animation: anim.id, label: anim.label, loop: !!anim.loop, fps, duration: anim.T, frameCount: n, cell: { w: cellW, h: cellH }, cols, rows, worldViewBox: stage.svg.getAttribute('viewBox'), groundYpx: Math.round((560 / 675) * cellH), frames }
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
