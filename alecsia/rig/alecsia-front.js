/* Alecsia — vedere din fata (pentru dialog / idle frontal).
 * Origine = sold (centru), solul la y=+191 (identic cu rig-ul din profil).
 * Pose: { x, y, scale, breath(0..1), head(deg inclinare), headY, eyes, mouth, brow, lookX, lookY, hair }
 */
(function (root) {
  'use strict';
  const PSM = root.PSM;
  const { shape, fill, line } = PSM;
  let UID = 0;

  function legs(c) {
    let s = '';
    for (const sx of [-1, 1]) {
      const o = (x) => (x * sx).toFixed(1);
      s += shape(`M ${o(1)},4 L ${o(36)},2 C ${o(37)},60 ${o(35)},120 ${o(33)},176 L ${o(5)},176 C ${o(3)},120 ${o(1)},60 ${o(1)},4 Z`, c.pants);
      s += fill(`M ${o(36)},2 C ${o(37)},60 ${o(35)},120 ${o(33)},176 L ${o(25)},176 C ${o(28)},120 ${o(29)},60 ${o(27)},2 Z`, c.pantsSh, 0.9);
      s += line(`M ${o(13)},20 C ${o(12)},60 ${o(12)},110 ${o(13)},160`, c.pantsHi, 2, 0.7);
      s += line(`M ${o(8)},96 C ${o(16)},100 ${o(24)},100 ${o(32)},96 M ${o(8)},160 C ${o(16)},164 ${o(25)},162 ${o(33)},166`, c.line, 1.3, 0.6);
      s += shape(`M ${o(1)},4 L ${o(36)},2 C ${o(37)},60 ${o(35)},120 ${o(33)},176 L ${o(5)},176 C ${o(3)},120 ${o(1)},60 ${o(1)},4 Z`, 'none');
    }
    return s;
  }
  function shoes(c) {
    let s = '<g transform="translate(0 0) scale(1.15 1)">';
    for (const sx of [-1, 1]) {
      const o = (x) => (x * sx).toFixed(1);
      // talpa
      s += shape(`M ${o(2)},182 C ${o(2)},178 ${o(36)},178 ${o(38)},182 L ${o(38)},189 C ${o(38)},192 ${o(2)},192 ${o(2)},189 Z`, c.sole);
      // fata pantofului
      s += shape(`M ${o(6)},168 C ${o(10)},162 ${o(28)},162 ${o(32)},168 C ${o(37)},172 ${o(38)},178 ${o(37)},183 L ${o(3)},183 C ${o(2)},178 ${o(3)},172 ${o(6)},168 Z`, c.shoe);
      s += fill(`M ${o(28)},166 C ${o(34)},170 ${o(37)},176 ${o(37)},183 L ${o(30)},183 C ${o(30)},176 ${o(30)},170 ${o(28)},166 Z`, c.shoeSh);
      s += line(`M ${o(4)},177 C ${o(14)},175 ${o(26)},175 ${o(37)},177`, c.line, 1.4);
      s += line(`M ${o(13)},166 L ${o(25)},166 M ${o(12)},170 L ${o(26)},170`, c.lace, 2.2);
      s += line(`M ${o(32)},171 C ${o(34)},174 ${o(35)},176 ${o(36)},178`, c.lace, 1.6, 0.9);
    }
    return s + '</g>';
  }
  function body(c) {
    const out = 'M -14,-138 C -30,-134 -46,-132 -54,-118 C -60,-104 -60,-80 -58,-56 C -56,-30 -52,0 -50,10 L -50,25 L 50,25 L 50,10 C 52,0 56,-30 58,-56 C 60,-80 60,-104 54,-118 C 46,-132 30,-134 14,-138 Z';
    let s = '';
    s += fill(out, c.hood);
    s += fill('M -54,-118 C -60,-104 -60,-80 -58,-56 C -56,-30 -52,0 -50,10 L -50,25 L -38,25 C -42,0 -44,-40 -44,-80 C -44,-100 -48,-112 -54,-118 Z', c.hoodSh);
    s += fill('M 30,-120 C 40,-110 44,-96 44,-80 C 40,-92 34,-104 24,-114 Z', c.hoodHi, 0.6);
    // buzunar cangur
    s += shape('M -34,-36 C -14,-40 14,-40 34,-36 L 42,8 C 16,11 -16,11 -42,8 Z', c.hood, 2.4);
    s += fill('M -34,-36 C -14,-40 14,-40 34,-36 L 35,-30 C 14,-34 -14,-34 -35,-30 Z', c.hoodSh, 0.6);
    s += fill('M -42,8 C -16,11 16,11 42,8 L 41,2 C 16,5 -16,5 -41,2 Z', c.hoodSh, 0.5);
    // riaj jos
    s += shape('M -50,10 C -20,13 20,13 50,10 L 50,25 L -50,25 Z', c.hood, 2.4);
    s += line('M -40,13 L -40,24 M -26,13 L -26,24 M -12,14 L -12,24 M 2,14 L 2,24 M 16,14 L 16,24 M 30,13 L 30,24 M 44,12 L 44,24', c.hoodDk, 1, 0.55);
    // cute
    s += line('M -30,-80 C -20,-70 -14,-68 -6,-70 M 18,-90 C 24,-84 30,-82 36,-84 M -4,-56 C 4,-52 10,-52 16,-56', c.line, 1.3, 0.55);
    s += shape(out, 'none');
    return s;
  }
  function arms(c) {
    // ambele maini in buzunar
    let s = '';
    for (const sx of [-1, 1]) {
      const o = (x) => (x * sx).toFixed(1);
      const d = `M ${o(44)},-126 C ${o(58)},-124 ${o(66)},-110 ${o(68)},-90 C ${o(70)},-66 ${o(70)},-46 ${o(64)},-30 C ${o(58)},-16 ${o(48)},-10 ${o(40)},-12 L ${o(34)},-30 C ${o(42)},-36 ${o(48)},-50 ${o(48)},-70 C ${o(48)},-90 ${o(46)},-110 ${o(44)},-126 Z`;
      s += fill(d, c.hood);
      s += fill(`M ${o(60)},-118 C ${o(66)},-106 ${o(70)},-80 ${o(68)},-56 C ${o(66)},-40 ${o(62)},-30 ${o(56)},-22 C ${o(60)},-40 ${o(62)},-70 ${o(60)},-118 Z`, c.hoodSh, 0.9);
      s += line(`M ${o(52)},-108 C ${o(56)},-96 ${o(58)},-84 ${o(58)},-70`, c.hoodHi, 2, 0.6);
      s += line(`M ${o(50)},-56 C ${o(56)},-52 ${o(62)},-52 ${o(68)},-56 M ${o(52)},-40 C ${o(56)},-38 ${o(60)},-40 ${o(64)},-44`, c.line, 1.3, 0.6);
      // mansete intrand in buzunar
      s += shape(`M ${o(34)},-30 L ${o(40)},-12 C ${o(44)},-11 ${o(48)},-12 ${o(52)},-14 L ${o(46)},-32 Z`, c.hood, 2);
      s += line(`M ${o(38)},-28 L ${o(43)},-14 M ${o(42)},-30 L ${o(47)},-14`, c.hoodDk, 1, 0.6);
      s += shape(d, 'none');
    }
    return s;
  }
  function collar(c) {
    let s = '';
    // gluga cazuta in jurul gatului
    s += shape('M -40,-128 C -36,-150 -16,-156 0,-156 C 16,-156 36,-150 40,-128 C 30,-122 20,-118 12,-112 L 0,-104 L -12,-112 C -20,-118 -30,-122 -40,-128 Z', c.hood);
    s += fill('M -30,-136 C -24,-148 -12,-150 0,-150 C 12,-150 24,-148 30,-136 C 20,-132 12,-130 0,-124 C -12,-130 -20,-132 -30,-136 Z', c.hoodDk);
    // snururi
    s += line('M -8,-112 C -9,-98 -9,-84 -8,-72 M 8,-112 C 9,-98 9,-84 8,-72', c.hood, 3.6);
    s += line('M -8,-112 C -9,-98 -9,-84 -8,-72 M 8,-112 C 9,-98 9,-84 8,-72', c.line, 1.1, 0.8);
    s += `<rect x="-10" y="-74" width="4" height="8" rx="1.5" fill="${c.hoodDk}" stroke="${c.line}" stroke-width="1.2"/><rect x="6" y="-74" width="4" height="8" rx="1.5" fill="${c.hoodDk}" stroke="${c.line}" stroke-width="1.2"/>`;
    return s;
  }
  function neck(c) {
    return shape('M -11,-152 L -12,-128 C -6,-122 6,-122 12,-128 L 11,-152 Z', c.skin) +
      fill('M -11,-152 L -11,-140 C -4,-134 4,-134 11,-140 L 11,-152 Z', c.skinSh, 0.85) +
      line('M -5,-128 C -2,-124 2,-124 5,-128', c.skinSh, 1.4);
  }
  function headphones(c) {
    let s = line('M -30,-140 C -22,-160 22,-160 30,-140', c.line, 8);
    s += line('M -30,-140 C -22,-160 22,-160 30,-140', c.phones, 5);
    for (const sx of [-1, 1]) {
      const cx = 25 * sx;
      s += `<ellipse cx="${cx}" cy="-133" rx="15" ry="17" fill="${c.phones}" stroke="${c.line}" stroke-width="${PSM.LW}" transform="rotate(${-14 * sx} ${cx} -133)"/>`;
      s += `<ellipse cx="${cx + 2 * sx}" cy="-133" rx="10" ry="12" fill="${c.phonesHi}" stroke="${c.line}" stroke-width="1.8" transform="rotate(${-14 * sx} ${cx} -133)"/>`;
      s += `<ellipse cx="${cx + 2 * sx}" cy="-133" rx="5" ry="6.5" fill="${c.phonesDk}" transform="rotate(${-14 * sx} ${cx} -133)"/>`;
      s += line(`M ${cx + 9 * sx},-142 C ${cx + 12 * sx},-136 ${cx + 12 * sx},-128 ${cx + 9 * sx},-122`, '#8a8c96', 1.4, 0.8);
    }
    return s;
  }
  function hairBack(c) {
    // masa de par din spate (se vede intre suvite si pe langa gat)
    return shape('M -30,-72 C -40,-52 -43,-20 -45,20 C -46,50 -45,70 -41,84 L 41,84 C 45,70 46,50 45,20 C 43,-20 40,-52 30,-72 Z', c.hair);
  }
  function head(c, id) {
    let s = `<defs><clipPath id="${id}L"><path d="M -21,-37 C -18,-41 -10,-42 -5,-37 C -9,-33 -17,-33 -21,-37 Z"/></clipPath><clipPath id="${id}R"><path d="M 21,-37 C 18,-41 10,-42 5,-37 C 9,-33 17,-33 21,-37 Z"/></clipPath></defs>`;
    const face = 'M 0,4 C -8,4 -16,-2 -21,-12 C -25,-20 -27,-30 -27,-40 C -27,-56 -18,-70 0,-70 C 18,-70 27,-56 27,-40 C 27,-30 25,-20 21,-12 C 16,-2 8,4 0,4 Z';
    s += fill(face, c.skin);
    s += fill('M -27,-40 C -27,-30 -25,-20 -21,-12 C -16,-2 -8,4 0,4 C -8,0 -14,-6 -18,-14 C -22,-22 -23,-32 -23,-42 Z', c.skinSh, 0.6);
    s += `<ellipse cx="-15" cy="-26" rx="3.5" ry="1.8" fill="${c.blush}" opacity="0.55"/><ellipse cx="15" cy="-26" rx="3.5" ry="1.8" fill="${c.blush}" opacity="0.55"/>`;
    // urechi (abia vizibile)
    s += shape('M -26,-38 C -31,-38 -32,-30 -29,-26 C -28,-24 -26,-24 -25,-26 Z', c.skin, 2) + shape('M 26,-38 C 31,-38 32,-30 29,-26 C 28,-24 26,-24 25,-26 Z', c.skin, 2);
    s += shape(face, 'none', 2.8);
    // nas
    s += fill('M -2,-38 C -3,-32 -4,-27 -5,-23 L -1,-23 C -1,-28 -1,-33 -2,-38 Z', c.skinSh, 0.6);
    s += line('M -5.5,-22 C -4,-19.5 -1.5,-19.5 0,-20.5 C 1.5,-19.5 4,-19.5 5.5,-22', c.line, 1.4);
    s += line('M 4,-25 C 5.5,-24 6,-23 5.5,-22', c.line, 1.1, 0.7);
    // gura (variante)
    const upper = 'M -8,-11.6 C -5,-12.6 -2.5,-14 0,-12.8 C 2.5,-14 5,-12.6 8,-11.6 C 5,-10.8 2,-10.6 0,-10.8 C -2,-10.6 -5,-10.8 -8,-11.6 Z';
    const lower = 'M -7.5,-11 C -4,-10.6 4,-10.6 7.5,-11 C 6,-7.4 3,-6 0,-6 C -3,-6 -6,-7.4 -7.5,-11 Z';
    s += `<g data-k="mouth-closed">${shape(upper, c.lip, 1.2)}${shape(lower, c.lip, 1.2)}${fill('M -4,-9 C -2,-8 2,-8 4,-9 C 2,-7.6 -2,-7.6 -4,-9 Z', c.skinHi, 0.5)}${line('M -8.4,-11.2 C -4,-10.4 4,-10.4 8.4,-11.2', c.line, 1.5)}</g>`;
    const open = (h, w, teeth, round) => {
      const top = -11.4, bot = top + h;
      let g = '';
      g += `<path d="M ${-w},${top} C ${-w * 0.5},${top - 1.4} ${w * 0.5},${top - 1.4} ${w},${top} C ${w * (round ? 0.9 : 0.7)},${bot} ${-w * (round ? 0.9 : 0.7)},${bot} ${-w},${top} Z" fill="${c.mouthIn}" stroke="${c.line}" stroke-width="1.4" stroke-linejoin="round"/>`;
      if (teeth) g += `<path d="M ${-w * 0.8},${top - 0.4} C ${-w * 0.4},${top - 1.2} ${w * 0.4},${top - 1.2} ${w * 0.8},${top - 0.4} L ${w * 0.7},${top + 1.4} C ${w * 0.3},${top + 1} ${-w * 0.3},${top + 1} ${-w * 0.7},${top + 1.4} Z" fill="${c.teeth}"/>`;
      g += shape(`M ${-w - 0.6},${top} C ${-w * 0.6},${top - 2} ${-w * 0.2},${top - 3} 0,${top - 2} C ${w * 0.2},${top - 3} ${w * 0.6},${top - 2} ${w + 0.6},${top} C ${w * 0.5},${top - 0.8} ${-w * 0.5},${top - 0.8} ${-w - 0.6},${top} Z`, c.lip, 1.1);
      g += shape(`M ${-w * 0.8},${bot - 1} C ${-w * 0.4},${bot - 0.2} ${w * 0.4},${bot - 0.2} ${w * 0.8},${bot - 1} C ${w * 0.6},${bot + 2.6} ${-w * 0.6},${bot + 2.6} ${-w * 0.8},${bot - 1} Z`, c.lip, 1.1);
      return g;
    };
    s += `<g data-k="mouth-small" style="display:none">${open(3.6, 6.4, false)}</g>`;
    s += `<g data-k="mouth-wide" style="display:none">${open(7, 7.4, true)}</g>`;
    s += `<g data-k="mouth-o" style="display:none">${open(6, 4.6, false, true)}</g>`;
    s += `<g data-k="mouth-e" style="display:none">${open(4.4, 8, true)}</g>`;
    s += `<g data-k="mouth-smile" style="display:none">${shape(upper, c.lip, 1.2)}${shape(lower, c.lip, 1.2)}${line('M -9.4,-12.6 C -5,-10 5,-10 9.4,-12.6', c.line, 1.6)}</g>`;
    // ochi
    const eyeShape = (sx) => `M ${-21 * sx},-37 C ${-18 * sx},-41 ${-10 * sx},-42 ${-5 * sx},-37 C ${-9 * sx},-33 ${-17 * sx},-33 ${-21 * sx},-37 Z`;
    const liner = (sx) => line(`M ${-4.5 * sx},-37.4 C ${-10 * sx},-42.4 ${-18 * sx},-42 ${-21.5 * sx},-37.6 L ${-25 * sx},-40.2`, c.line, 2.6);
    let open1 = '', half = '', closed = '';
    for (const sx of [1, -1]) {
      const cid = sx > 0 ? 'L' : 'R';
      open1 += `<path d="${eyeShape(sx)}" fill="${c.eyeWhite}"/><g clip-path="url(#${id}${cid})"><g data-k="pupil"><circle cx="${-13 * sx}" cy="-37.4" r="3.6" fill="${c.eye}"/><circle cx="${-13 * sx}" cy="-37.4" r="1.6" fill="#120c09"/><circle cx="${-12 * sx + 0.6}" cy="-38.8" r="0.9" fill="#fff"/></g></g>${liner(sx)}${line(`M ${-20 * sx},-36 C ${-16 * sx},-33.4 ${-10 * sx},-33.4 ${-6 * sx},-36`, c.line, 1, 0.7)}`;
      half += `<path d="M ${-21 * sx},-36.6 C ${-17 * sx},-38.4 ${-10 * sx},-38.6 ${-5 * sx},-36.6 C ${-9 * sx},-33.6 ${-17 * sx},-33.6 ${-21 * sx},-36.6 Z" fill="${c.eyeWhite}"/><ellipse cx="${-13 * sx}" cy="-35.8" rx="3.4" ry="1.8" fill="${c.eye}"/>${line(`M ${-4.5 * sx},-36.6 C ${-10 * sx},-39 ${-18 * sx},-38.8 ${-21.5 * sx},-36.6 L ${-25 * sx},-38.6`, c.line, 2.8)}`;
      closed += line(`M ${-4.5 * sx},-36 C ${-10 * sx},-33.4 ${-18 * sx},-33.6 ${-21.5 * sx},-36.4 L ${-25 * sx},-38`, c.line, 2.6);
    }
    s += `<g data-k="eye-open">${open1}</g><g data-k="eye-half" style="display:none">${half}</g><g data-k="eye-closed" style="display:none">${closed}</g>`;
    // sprancene
    s += `<g data-k="brow-L">${shape('M -23,-44 C -18,-48.5 -10,-49 -4,-46 C -10,-45.6 -17,-45 -22.6,-42.4 Z', c.hair, 1.1)}</g>`;
    s += `<g data-k="brow-R">${shape('M 23,-44 C 18,-48.5 10,-49 4,-46 C 10,-45.6 17,-45 22.6,-42.4 Z', c.hair, 1.1)}</g>`;
    return s;
  }
  function hairFront(c) {
    let s = '';
    // calota + suvite laterale lungi, cu carare pe mijloc
    s += shape('M 0,-82 C -26,-82 -38,-66 -39,-46 C -40,-24 -40,4 -42,30 C -44,52 -48,70 -46,86 L -40,80 L -35,92 L -29,78 C -26,58 -25,30 -25,2 C -25,-16 -27,-32 -27.5,-47 L 27.5,-47 C 27,-32 25,-16 25,2 C 25,30 26,58 29,78 L 35,92 L 40,80 L 46,86 C 48,70 44,52 42,30 C 40,4 40,-24 39,-46 C 38,-66 26,-82 0,-82 Z', c.hair);
    // breton franjurat
    s += shape('M -28,-51.5 C -28,-67.5 -16,-77.5 0,-77.5 C 16,-77.5 28,-67.5 28,-51.5 L 25,-47.5 L 22,-52 L 19,-47 L 16,-51.5 L 12,-47.5 L 9,-52 L 5,-48 L 2,-52.5 L -2,-47.5 L -5,-52 L -9,-48 L -12,-52 L -16,-47.1 L -19,-51.5 L -22,-47.5 L -25,-52 Z', c.hair, 2);
    s += line('M 0,-78 L 0,-70 M -6,-76 C -14,-74 -22,-68 -26,-58 M 6,-76 C 14,-74 22,-68 26,-58', c.hairHi, 1.8, 0.9);
    s += line('M -18,-64 L -19,-55 M -9,-68 L -9,-55 M 9,-68 L 9,-55 M 18,-64 L 19,-55', c.hairHi2, 1.3, 0.7);
    s += line('M -33,-30 C -33,10 -35,40 -38,74 M 33,-30 C 33,10 35,40 38,74 M -29,10 C -30,30 -31,50 -32,70 M 30,0 C 30,24 31,46 33,66', c.hairHi, 1.6, 0.85);
    return s;
  }

  class AlecsiaFront {
    constructor(parent) {
      const c = PSM.palette;
      this.id = 'alxf' + (++UID);
      this.g = PSM.el('g', { class: 'alecsia-front' });
      parent.appendChild(this.g);
      this.root = PSM.el('g'); this.g.appendChild(this.root);
      const mk = (html, parentEl) => { const e = PSM.el('g'); e.innerHTML = html; (parentEl || this.root).appendChild(e); return e; };
      this.headBack = PSM.el('g'); this.root.appendChild(this.headBack);
      this.hairBackG = mk(`<g transform="scale(1.12)">${''}</g>`, this.headBack);
      this.hairBackG.innerHTML = hairBack(c);
      this.legsG = mk(legs(c) + shoes(c));
      this.upper = PSM.el('g'); this.root.appendChild(this.upper);
      this.neckG = mk(neck(c), this.upper);
      this.bodyG = mk(body(c) + arms(c), this.upper);
      this.collarG = mk(collar(c), this.upper);
      this.phonesG = mk(headphones(c), this.upper);
      this.headG = PSM.el('g'); this.upper.appendChild(this.headG);
      this.headInner = mk(`<g transform="scale(1.12)">${head(c, this.id)}${hairFront(c)}</g>`, this.headG);
      this.setPose({});
    }
    setPose(pose) {
      const p = Object.assign({ x: 0, y: 0, scale: 1, breath: 0, head: 0, headY: 0, eyes: 'open', mouth: 'closed', brow: 0, lookX: 0, lookY: 0, opacity: 1 }, pose);
      this.pose = p;
      this.g.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${p.scale})`);
      const b = p.breath || 0;
      // respiratie: trunchiul se ridica putin, umerii urca
      this.upper.setAttribute('transform', `translate(0 ${-b * 1.6}) translate(0 25) scale(1 ${1 + b * 0.01}) translate(0 -25)`);
      this.headG.setAttribute('transform', `translate(0 ${-145 + p.headY}) rotate(${p.head})`);
      this.headBack.setAttribute('transform', `translate(0 ${-b * 1.6}) translate(0 ${-145 + p.headY}) rotate(${p.head * 0.6})`);
      const hi = this.headInner;
      hi.querySelectorAll('[data-k^="eye-"]').forEach(e => { e.style.display = e.dataset.k === 'eye-' + p.eyes ? '' : 'none'; });
      hi.querySelectorAll('[data-k^="mouth-"]').forEach(e => { e.style.display = e.dataset.k === 'mouth-' + p.mouth ? '' : 'none'; });
      hi.querySelectorAll('[data-k="pupil"]').forEach(e => e.setAttribute('transform', `translate(${p.lookX * 3} ${p.lookY * 1.5})`));
      hi.querySelector('[data-k="brow-L"]').setAttribute('transform', `translate(0 ${-p.brow * 1.6}) rotate(${p.brow * 2} -13 -46)`);
      hi.querySelector('[data-k="brow-R"]').setAttribute('transform', `translate(0 ${-p.brow * 1.6}) rotate(${-p.brow * 2} 13 -46)`);
      this.g.setAttribute('opacity', p.opacity);
    }
  }
  PSM.AlecsiaFront = AlecsiaFront;
})(typeof window !== 'undefined' ? window : globalThis);
