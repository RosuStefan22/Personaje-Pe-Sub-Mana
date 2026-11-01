/* Alecsia — rig din profil (orientata spre dreapta), schelet cu cinematica directa.
 * Unitati: ~395u inaltime totala. Originea = articulatia soldului.
 * Conventie unghiuri (grade): membre >0 = spre fata; torso/cap >0 = aplecat in fata;
 * genunchi (shin) <0 = indoit; cot (fArm) >0 = indoit; laba (foot) >0 = varful in sus; par >0 = flutura in spate.
 */
(function (root) {
  'use strict';
  const PSM = root.PSM;
  const { shape, fill, line, mat: M } = PSM;

  // ---------------- ARTA (in sistemul local al fiecarui os) ----------------
  function armUpper(c) {
    return [
      shape('M -13,-8 C -17,18 -15,44 -12,70 L 12,70 C 14,44 16,18 13,-8 C 8,-17 -8,-17 -13,-8 Z', c.hood),
      fill('M -13,-6 C -17,18 -15,44 -12,70 L -4,70 C -7,46 -8,20 -6,-10 Z', c.hoodSh),
      line('M 4,-4 C 8,14 9,30 8,44', c.hoodHi, 2.2, 0.8),
      line('M -9,56 C -4,60 3,60 8,55', c.line, 1.6),
      line('M -10,40 C -6,44 -2,44 2,42', c.line, 1.3, 0.7),
      // re-contur peste umbra
      shape('M -13,-8 C -17,18 -15,44 -12,70 L 12,70 C 14,44 16,18 13,-8 C 8,-17 -8,-17 -13,-8 Z', 'none')
    ].join('');
  }
  function armFore(c) {
    return [
      `<circle cx="0" cy="0" r="12" fill="${c.hood}"/>`,
      shape('M -12,-2 C -13,20 -11,40 -9,50 L 9,50 C 11,40 13,20 12,-2', c.hood),
      fill('M -12,-2 C -13,20 -11,40 -9,50 L -3,50 C -5,36 -6,18 -5,-2 Z', c.hoodSh),
      line('M 5,6 C 8,20 8,30 7,38', c.hoodHi, 2, 0.7),
      line('M -8,24 C -3,27 3,27 8,24', c.line, 1.3, 0.6),
      shape('M -10,46 L -9,60 L 9,60 L 10,46 Z', c.hood),
      fill('M -10,46 L -9,60 L -4,60 L -4,46 Z', c.hoodSh),
      line('M -5,48 L -5,58 M 0,48 L 0,58 M 5,48 L 5,58', c.hoodDk, 1, 0.7)
    ].join('');
  }
  // maini: relaxed | fist | open | grip | point
  function hand(c, kind) {
    const k = kind || 'relaxed';
    let s = '';
    if (k === 'open') {
      s += shape('M -7,-2 C -10,8 -10,16 -8,22 L -6,32 C -5,35 -2,35 -2,32 L -2,24 L 0,34 C 1,37 4,37 4,34 L 3,23 L 6,31 C 7,34 10,33 9,30 L 7,20 C 9,14 9,6 7,-2 Z', c.skin);
      s += shape('M 6,4 C 12,6 15,11 13,15 C 11,17 8,14 6,12', c.skin, 2.4);
    } else if (k === 'fist' || k === 'grip') {
      s += shape('M -8,-2 C -10,6 -10,14 -7,19 C -3,23 6,23 9,17 C 11,12 10,4 8,-2 Z', c.skin);
      s += line('M -7,10 C -2,12 3,12 8,10 M -6,15 C -2,17 3,17 7,15', c.line, 1.3, 0.8);
      s += shape('M 7,3 C 13,5 14,11 10,14 C 7,15 5,12 5,10', c.skin, 2.4);
    } else if (k === 'type') {
      // degete usor curbate in fata, pentru tastat
      s += shape('M -7,-2 C -9,8 -8,14 -4,18 C 0,22 4,26 6,30 C 8,32 11,30 10,27 C 9,23 7,20 8,14 L 8,-2 Z', c.skin);
      s += shape('M 6,4 C 12,8 14,14 12,18 C 10,20 8,16 7,13', c.skin, 2.4);
    } else if (k === 'point') {
      s += shape('M -8,-2 C -10,6 -10,14 -7,19 C -3,23 6,23 9,17 C 11,12 10,4 8,-2 Z', c.skin);
      s += shape('M 3,16 L 4,34 C 4,37 8,37 8,34 L 8,15 Z', c.skin, 2.4);
      s += shape('M 7,3 C 13,5 14,11 10,14 C 7,15 5,12 5,10', c.skin, 2.4);
    } else {
      s += shape('M -7,-2 C -9,8 -9,16 -6,22 C -3,27 3,28 7,24 C 9,20 9,10 8,-2 Z', c.skin);
      s += line('M -5,16 C -2,19 2,20 6,18', c.skinSh, 1.4, 0.9);
      s += shape('M 6,3 C 12,7 13,13 11,17 C 9,19 7,16 6,13', c.skin, 2.4);
    }
    return s;
  }
  function thigh(c) {
    return [
      shape('M -16,-6 C -17,28 -15,60 -12,90 L 12,90 C 14,60 16,28 16,-6 Z', c.pants),
      fill('M -16,-6 C -17,28 -15,60 -12,90 L -5,90 C -7,60 -8,28 -7,-6 Z', c.pantsSh),
      line('M 8,4 C 11,30 11,56 9,80', c.pantsHi, 2.2, 0.8),
      line('M -6,64 C -1,70 4,72 9,70', c.line, 1.3, 0.6),
      shape('M -16,-6 C -17,28 -15,60 -12,90 L 12,90 C 14,60 16,28 16,-6 Z', 'none')
    ].join('');
  }
  function shin(c) {
    return [
      `<circle cx="0" cy="0" r="12.5" fill="${c.pants}"/>`,
      shape('M -12.5,-2 C -12,30 -11,56 -12,80 L -13,86 L 13,86 L 12,78 C 11,56 12,30 12.5,-2', c.pants),
      fill('M -12.5,-2 C -12,30 -11,56 -12,80 L -13,86 L -5,86 C -6,60 -6,30 -6,-2 Z', c.pantsSh),
      line('M 6,8 C 8,30 8,50 7,70', c.pantsHi, 2, 0.75),
      line('M -10,70 C -4,74 2,72 8,76 M -8,78 L 2,80', c.line, 1.3, 0.7)
    ].join('');
  }
  function foot(c) {
    return [
      // talpa
      shape('M -15,10 L 33,10 C 35,13 35,17 31,18 L -13,18 C -16,18 -17,13 -15,10 Z', c.sole),
      fill('M -14,15 L 33,15 C 33,17 32,18 31,18 L -13,18 C -15,18 -15,16 -14,15 Z', c.soleSh),
      // fata pantofului
      shape('M -13,-8 L 9,-8 C 17,-6 26,0 31,5 C 34,8 34,10 33,11 L -15,11 C -16,4 -16,-2 -13,-8 Z', c.shoe),
      fill('M -13,-8 L -6,-8 C -8,0 -8,6 -6,11 L -15,11 C -16,4 -16,-2 -13,-8 Z', c.shoeSh),
      // varf (toe cap)
      line('M 24,1 C 26,5 26,8 25,11', c.line, 1.6),
      // dunga laterala alba (stil skate)
      shape('M -9,6 C -4,0 4,8 10,3 C 14,0 18,1 21,4 C 16,4 13,7 9,8 C 3,10 -3,6 -9,8 Z', c.lace, 1.4),
      // sireturi
      line('M 9,-6 L 13,-2 M 13,-5 L 17,-1 M 17,-3 L 21,1', c.lace, 2),
      line('M -14,-4 L -10,-4', c.line, 1.2)
    ].join('');
  }
  function neck(c) {
    return [
      shape('M -6,-118 L -7,-146 L 11,-148 L 13,-118 Z', c.skin),
      fill('M -6,-118 L -7,-146 L 1,-146 L 2,-118 Z', c.skinSh)
    ].join('');
  }
  function torso(c) {
    const body = 'M 12,-126 C 28,-120 37,-102 37,-80 C 39,-54 37,-28 34,-6 L 34,10 L 33,25 L -29,25 L -29,10 C -33,-20 -35,-62 -33,-92 C -31,-114 -18,-128 -2,-130 Z';
    return [
      shape(body, c.hood),
      fill('M -2,-130 C -18,-128 -31,-114 -33,-92 C -35,-62 -33,-20 -29,10 L -29,25 L -14,25 C -18,-10 -20,-60 -16,-100 C -14,-116 -8,-124 -2,-130 Z', c.hoodSh),
      fill('M 22,-116 C 30,-104 32,-90 32,-76 C 30,-86 26,-100 18,-110 Z', c.hoodHi, 0.9),
      // banda de jos (riaj)
      shape('M 34,10 L 33,25 L -29,25 L -29,10 C -10,13 15,13 34,10 Z', c.hood),
      fill('M -29,10 L -29,25 L -14,25 L -15,11 Z', c.hoodSh),
      line('M -20,13 L -20,24 M -8,13 L -8,24 M 4,13 L 4,24 M 16,12 L 16,24 M 26,11 L 26,24', c.hoodDk, 1, 0.6),
      // buzunarul cangur (deschiderea laterala)
      line('M 36,-40 C 24,-34 19,-18 21,8', c.line, 1.8),
      fill('M 36,-40 C 24,-34 19,-18 21,8 L 34,8 C 36,-10 37,-26 36,-40 Z', c.hoodSh, 0.45),
      // cute
      line('M -22,-30 C -16,-24 -10,-22 -2,-24 M -24,-60 C -18,-56 -12,-56 -6,-58', c.line, 1.3, 0.6),
      line('M 30,-66 C 24,-58 22,-50 24,-44', c.line, 1.3, 0.55)
    ].join('');
  }
  function hood(c) {
    // gluga stransa la ceafa + snurul
    return [
      shape('M -6,-130 C -26,-140 -42,-126 -38,-104 C -34,-92 -20,-96 -10,-108 C -4,-116 0,-124 -6,-130 Z', c.hood),
      fill('M -38,-104 C -34,-92 -20,-96 -10,-108 C -18,-104 -30,-104 -38,-104 Z', c.hoodDk),
      line('M -30,-124 C -24,-116 -18,-112 -12,-112', c.line, 1.4, 0.7),
      shape('M 6,-128 C 16,-130 20,-124 18,-118 C 14,-122 10,-124 6,-128 Z', c.hood, 2.4),
      line('M 18,-116 C 22,-104 22,-92 20,-80', c.hood, 3.2),
      line('M 18,-116 C 22,-104 22,-92 20,-80', c.line, 1.1, 0.8),
      `<rect x="17.5" y="-82" width="4" height="8" rx="1.5" fill="${c.hoodDk}" stroke="${c.line}" stroke-width="1.2"/>`
    ].join('');
  }
  function headphones(c) {
    // casti in jurul gatului (casca apropiata vizibila sub barbie)
    return [
      line('M -12,-132 C -12,-152 4,-156 12,-146', c.line, 7.5),
      line('M -12,-132 C -12,-152 4,-156 12,-146', c.phones, 4.5),
      shape('M 4,-142 C 18,-150 34,-140 33,-124 C 32,-110 18,-104 8,-110 C 0,-116 -2,-136 4,-142 Z', c.phones),
      shape('M 10,-138 C 20,-142 30,-134 28,-124 C 27,-115 18,-112 12,-116 C 6,-120 5,-134 10,-138 Z', c.phonesHi, 2),
      `<ellipse cx="19" cy="-126" rx="5" ry="6" fill="${c.phonesDk}"/>`,
      line('M 26,-134 C 29,-130 29,-124 27,-120', '#8a8c96', 1.4, 0.8)
    ].join('');
  }
  function hairBack(c) {
    // suvita lunga din spate (os separat, pivot la crestet-spate)
    const d = 'M 10,-6 C -14,0 -24,34 -22,70 C -21,98 -14,122 -6,142 L 0,130 L 5,144 L 10,128 L 16,138 C 19,108 18,66 17,36 C 16,18 16,4 10,-6 Z';
    return [
      shape(d, c.hair),
      line('M -6,20 C -12,50 -11,90 -5,124 M 2,14 C -1,50 0,90 4,124 M 9,10 C 10,40 10,80 11,112', c.hairHi, 1.6, 0.85),
      line('M -2,30 C -6,60 -6,84 -2,104', c.hairHi2, 1.2, 0.6)
    ].join('');
  }
  let UID = 0;
  const HEAD_SCALE = 1.12;
  function head(c) {
    const id = 'alx' + (++UID);
    const skull = 'M -10,-2 L 6,4 C 12,5 17,4 20,1 C 23,-2 23,-6 21.5,-8.5 C 23.5,-9.5 25,-11.5 24.5,-13.5 C 24,-14.2 23.5,-14.4 23.4,-14.6 C 25,-15.2 26,-17 25,-18.6 C 25,-19.4 25.2,-20.4 26,-21.2 C 28,-21.6 30.5,-22.6 31,-24.6 C 31,-26 29.5,-27.5 28.5,-29.5 C 27.5,-32 27,-35 26.6,-38 C 26.4,-41 27,-44 27.6,-46 C 27.6,-54 22,-64 10,-67 C -6,-70 -24,-60 -26,-44 C -27,-30 -20,-16 -14,-8 Z';
    let s = '';
    s += `<defs><clipPath id="${id}e"><path d="M 14,-38.6 C 16.5,-41.6 20.5,-42 23.6,-39.6 C 23.2,-38.8 23.2,-38.3 23.2,-38 C 20.5,-35.8 17,-36 14.5,-38 Z"/></clipPath></defs>`;
    s += fill(skull, c.skin);
    // umbre: sub maxilar, pometi, nas
    s += fill('M -10,-2 L 6,4 C 12,5 17,4 20,1 C 12,0 4,-4 -2,-10 C -6,-8 -9,-5 -10,-2 Z', c.skinSh, 0.45);
    s += line('M 6,-27 C 9,-23 11,-20 13,-17', c.skinSh, 1.4, 0.45);
    s += fill('M 26.6,-38 C 27,-35 27.5,-32 28.5,-29.5 C 27,-28.5 25.6,-29 25,-30 C 25.4,-33 25.8,-35.6 26.6,-38 Z', c.skinSh, 0.6);
    s += `<ellipse cx="15" cy="-30" rx="3.2" ry="1.6" fill="${c.blush}" opacity="0.65"/>`;
    s += fill('M 23,-60 C 26,-56 27,-52 27.2,-48 L 24,-48 C 24.5,-52 24,-56 23,-60 Z', c.skinHi, 0.7);
    // buze
    s += fill('M 25,-18.8 C 26,-17 25,-15.2 23.4,-14.6 L 19.4,-14.8 C 21,-16.2 23,-17.8 25,-18.8 Z', c.lip);
    s += fill('M 23.4,-14.6 C 24.8,-13.4 24.8,-11 22.6,-9.4 C 21.4,-10.6 20.2,-12.6 19.4,-14.4 Z', c.lip);
    s += fill('M 23.4,-14.6 C 24.4,-13.4 24.2,-12 23,-11 C 22.4,-12 21.6,-13.2 21,-14.4 Z', c.lipSh, 0.5);
    s += shape(skull, 'none', 2.8);
    // nara
    s += line('M 28.6,-23.4 C 27.4,-22.6 26.2,-22.8 25.8,-23.8', c.line, 1.3);
    // urechea
    s += shape('M -1,-39 C -8,-41 -11,-34 -10,-28 C -9,-23 -5,-21 -1.5,-23.5 C 0.5,-28 0.5,-34 -1,-39 Z', c.skin, 2.2);
    s += line('M -3.5,-35 C -7,-33 -7,-28 -4.5,-26', c.skinSh, 1.8);
    // parul (calota + breton franjurat); urechea ramane vizibila (par dat dupa ureche)
    const cap = 'M 28.5,-47 L 27,-44.5 L 25.5,-48 L 23,-44 L 21.5,-48 L 18.5,-44.4 L 17,-47.8 L 13.5,-44.4 L 12,-48 L 8.5,-45.6 L 6,-47.5 C 3,-47 0,-45 -2,-43 C -6,-42 -9,-38 -10.5,-33 C -12,-26 -13,-17 -17,-9 C -19,-7 -20,-5 -21,-4 C -30,-16 -34,-36 -31,-52 C -26,-68 -10,-77 6,-76 C 20,-75 30,-66 31,-56 C 31.5,-51 30.5,-48.5 28.5,-47 Z';
    s += shape(cap, c.hair);
    s += line('M 22,-68 C 12,-72 2,-72 -8,-68 M 26,-62 C 20,-66 12,-67 4,-65 M -16,-64 C -25,-56 -29,-42 -27,-26', c.hairHi, 1.8, 0.9);
    s += line('M 24,-57 L 22.4,-49 M 16.5,-59 L 15.6,-49 M 9,-59 L 9.4,-49 M -2,-58 C -6,-52 -8,-46 -9,-40', c.hairHi2, 1.3, 0.75);
    // spranceana (grup separat pentru expresii)
    s += `<g data-k="brow">${shape('M 13,-45.2 C 17,-48.2 22,-48.6 26.4,-46.4 C 22,-46.4 17.5,-45.6 13.4,-43.8 Z', c.hair, 1.1)}</g>`;
    // ochi (variante)
    const liner = line('M 10.2,-41.8 L 14,-38.6 C 16.5,-41.6 20.5,-42 23.8,-39.6', c.line, 2.6);
    s += `<g data-k="eye-open"><path d="M 14,-38.6 C 16.5,-41.6 20.5,-42 23.6,-39.6 C 23.2,-38.8 23.2,-38.3 23.2,-38 C 20.5,-35.8 17,-36 14.5,-38 Z" fill="${c.eyeWhite}"/><g clip-path="url(#${id}e)"><ellipse cx="20.4" cy="-38.8" rx="2.3" ry="2.9" fill="${c.eye}"/><circle cx="21" cy="-39.8" r="0.75" fill="#fff"/></g>${liner}${line('M 14.6,-37.8 C 17,-35.9 20.5,-35.7 23.2,-38', c.line, 1.1, 0.8)}</g>`;
    s += `<g data-k="eye-half" style="display:none"><path d="M 14,-38.2 C 16.5,-39.6 20.5,-39.8 23.4,-38.6 C 20.5,-36.2 17,-36.2 14.5,-38 Z" fill="${c.eyeWhite}"/><ellipse cx="20.4" cy="-38" rx="2" ry="1.3" fill="${c.eye}"/>${line('M 10.4,-40.6 L 14,-38.2 C 16.5,-39.6 20.5,-39.8 23.6,-38.6', c.line, 2.8)}</g>`;
    s += `<g data-k="eye-closed" style="display:none">${line('M 10.4,-40.2 L 14,-37.8 C 17,-35.8 20.5,-35.8 23.6,-38.2', c.line, 2.6)}</g>`;
    // gura (variante): deschiderea se vede ca o "crestatura" in profil
    const notch = (h, teeth, depth) => {
      const x0 = 24.6, xi = depth || 19.6, y = -14.8;
      let g = `<path d="M ${x0 + 0.6},${y - h * 0.5} L ${xi},${y - 0.3} L ${xi},${y + 0.3} L ${x0 + 0.4},${y + h * 0.5} C ${x0 + 1.2},${y + h * 0.2} ${x0 + 1.2},${y - h * 0.2} ${x0 + 0.6},${y - h * 0.5} Z" fill="${c.mouthIn}" stroke="${c.line}" stroke-width="1.1" stroke-linejoin="round"/>`;
      if (teeth) g += `<path d="M ${x0 + 0.4},${y - h * 0.5 + 0.2} L ${x0 - 2.4},${y - h * 0.3} L ${x0 - 2.4},${y - h * 0.3 + 0.9} L ${x0 + 0.5},${y - h * 0.5 + 1.1} Z" fill="${c.teeth}"/>`;
      return g;
    };
    s += `<g data-k="mouth-closed">${line('M 19.2,-14.8 L 23.8,-14.6', c.line, 1.4)}</g>`;
    s += `<g data-k="mouth-small" style="display:none">${notch(2, false)}</g>`;
    s += `<g data-k="mouth-wide" style="display:none">${notch(4.4, true)}</g>`;
    s += `<g data-k="mouth-o" style="display:none">${notch(3.4, false, 21.6)}</g>`;
    s += `<g data-k="mouth-e" style="display:none">${notch(2.8, true)}</g>`;
    s += `<g data-k="mouth-smile" style="display:none">${line('M 18.6,-16.2 C 20,-15 22,-14.6 23.8,-14.6', c.line, 1.5)}</g>`;
    return `<g transform="scale(${HEAD_SCALE})">${s}</g>`;
  }

  // ---------------- SCHELET ----------------
  // name: [parent, offsetX, offsetY, sign]  (sign transforma unghiul "uman" in rotatie SVG)
  const BONES = {
    root: [null, 0, 0, 1],
    thighB: ['root', -2, 6, -1], shinB: ['thighB', 0, 88, -1], footB: ['shinB', 0, 84, -1],
    thighF: ['root', 2, 6, -1], shinF: ['thighF', 0, 88, -1], footF: ['shinF', 0, 84, -1],
    torso: ['root', 0, 0, 1],
    head: ['torso', 3, -142, 1],
    hair: ['head', -16 * 1.12, -54 * 1.12, 1],
    uArmB: ['torso', -2, -110, -1], fArmB: ['uArmB', 0, 68, -1], handB: ['fArmB', 0, 60, -1],
    uArmF: ['torso', 4, -110, -1], fArmF: ['uArmF', 0, 68, -1], handF: ['fArmF', 0, 60, -1]
  };
  // ordinea de desenare (spate -> fata); 'slot:*' = locuri pentru recuzita
  const LAYERS = [
    'slot:back',
    'uArmB', 'fArmB', 'handB',
    'slot:behindLegs',
    'thighB', 'shinB', 'footB',
    'thighF', 'shinF', 'footF',
    'slot:behindTorso',
    'neck', 'torso', 'hood', 'hair', 'phones', 'head',
    'slot:beforeArmF',
    'uArmF', 'fArmF', 'handF',
    'slot:front'
  ];
  const LAYER_BONE = { neck: 'torso', hood: 'torso', phones: 'torso' };

  // puncte de contact ale talpii (in sistemul labei)
  const SOLE = [[-14, 18], [32, 18]];

  class AlecsiaSide {
    constructor(parent) {
      const P = PSM.palette, B = PSM.backPalette;
      this.g = PSM.el('g', { class: 'alecsia-side' });
      parent.appendChild(this.g);
      this.layers = {};
      this.props = [];
      const art = {
        uArmB: armUpper(B), fArmB: armFore(B), handB: '',
        thighB: thigh(B), shinB: shin(B), footB: foot(B),
        thighF: thigh(P), shinF: shin(P), footF: foot(P),
        neck: neck(P), torso: torso(P), hood: hood(P), hair: hairBack(P), phones: headphones(P), head: head(P),
        uArmF: armUpper(P), fArmF: armFore(P), handF: ''
      };
      for (const name of LAYERS) {
        const lg = PSM.el('g', { 'data-layer': name });
        if (!name.startsWith('slot:')) lg.innerHTML = art[name];
        this.g.appendChild(lg);
        this.layers[name] = lg;
      }
      // mainile au mai multe forme
      this.handShapes = {};
      for (const side of ['F', 'B']) {
        const pal = side === 'F' ? P : B;
        const lg = this.layers['hand' + side];
        this.handShapes[side] = {};
        for (const k of ['relaxed', 'fist', 'open', 'grip', 'type', 'point']) {
          const hg = PSM.el('g', { 'data-hand': k });
          hg.innerHTML = hand(pal, k);
          lg.appendChild(hg);
          this.handShapes[side][k] = hg;
        }
      }
      this.headLayer = this.layers.head;
      this.world = {};
      this.setPose({});
    }

    // Ataseaza recuzita la un os, intr-un slot din ordinea de desenare
    addProp(svg, bone, slot, offset) {
      const g = PSM.el('g', { class: 'prop' });
      g.innerHTML = svg;
      this.layers['slot:' + (slot || 'front')].appendChild(g);
      const p = { g, bone, offset: offset || [0, 0, 0], visible: true };
      this.props.push(p);
      this._placeProp(p);
      return p;
    }
    clearProps() { this.props.forEach(p => p.g.remove()); this.props = []; }

    _placeProp(p) {
      const w = this.world[p.bone] || M.id();
      const o = p.offset;
      p.g.setAttribute('transform', M.str(M.mul(w, M.mul(M.tr(o[0], o[1]), M.rot(o[2] || 0)))));
      p.g.style.display = p.visible ? '' : 'none';
    }

    static defaults() {
      return {
        x: 0, y: 0, root: 0, facing: 1, scale: 1, ground: null, lift: 0,
        torso: 0, head: 0, hair: 0,
        thighF: 0, shinF: 0, footF: 0, thighB: 0, shinB: 0, footB: 0,
        uArmF: 0, fArmF: 0, handF: 0, uArmB: 0, fArmB: 0, handB: 0,
        handShapeF: 'relaxed', handShapeB: 'relaxed',
        eyes: 'open', mouth: 'closed', brow: 0, opacity: 1
      };
    }

    computeWorld(pose, rootM) {
      const w = {};
      for (const name in BONES) {
        const [parent, ox, oy, sign] = BONES[name];
        const ang = (name === 'root' ? pose.root : pose[name]) || 0;
        const local = M.mul(M.tr(ox, oy), M.rot(sign * ang));
        w[name] = parent ? M.mul(w[parent], local) : M.mul(rootM, local);
      }
      return w;
    }

    // cel mai de jos punct al talpilor (pentru contactul automat cu solul)
    soleInfo(w) {
      let best = null;
      for (const f of ['footF', 'footB']) for (const s of SOLE) {
        const p = M.apply(w[f], s[0], s[1]);
        if (!best || p[1] > best.y) best = { x: p[0], y: p[1], foot: f };
      }
      return best;
    }

    // matricile lumii pentru o poza (fara DOM) — folosit si pentru masurarea pasului
    solve(pose) {
      const p = Object.assign(AlecsiaSide.defaults(), pose);
      let rootM = M.mul(M.tr(p.x, p.y), M.sc(p.facing * p.scale, p.scale));
      let w = this.computeWorld(p, rootM);
      if (p.ground != null) {
        // coboara/ridica personajul ca talpa cea mai joasa sa atinga solul
        const s = this.soleInfo(w);
        const dy = p.ground - s.y - (p.lift || 0);
        rootM = M.mul(M.tr(0, dy), rootM);
        w = this.computeWorld(p, rootM);
      }
      return { p, w };
    }

    setPose(pose) {
      const { p, w } = this.solve(pose);
      this.pose = p;
      this.world = w;
      for (const name of LAYERS) {
        if (name.startsWith('slot:')) continue;
        const bone = LAYER_BONE[name] || name;
        this.layers[name].setAttribute('transform', M.str(w[bone]));
      }
      for (const side of ['F', 'B']) {
        const want = p['handShape' + side];
        for (const k in this.handShapes[side]) this.handShapes[side][k].style.display = k === want ? '' : 'none';
      }
      // fata
      const hl = this.headLayer;
      hl.querySelectorAll('[data-k^="eye-"]').forEach(e => { e.style.display = e.dataset.k === 'eye-' + p.eyes ? '' : 'none'; });
      hl.querySelectorAll('[data-k^="mouth-"]').forEach(e => { e.style.display = e.dataset.k === 'mouth-' + p.mouth ? '' : 'none'; });
      hl.querySelector('[data-k="brow"]').setAttribute('transform', `translate(0 ${-p.brow * 1.5}) rotate(${p.brow * -2} 18 -47)`);
      this.g.setAttribute('opacity', p.opacity);
      this.props.forEach(pr => this._placeProp(pr));
      return w;
    }
  }
  // ---- IK cu doua oase (brat sau picior) ----
  // Calculeaza unghiurile ca mana/glezna sa ajunga in punctul (tx, ty) din coordonatele scenei.
  // limb: 'armF' | 'armB' | 'legF' | 'legB'. Returneaza poza modificata.
  AlecsiaSide.prototype.ik = function (pose, limb, tx, ty, opts) {
    opts = opts || {};
    const p = Object.assign(AlecsiaSide.defaults(), pose);
    const isArm = limb.startsWith('arm'), side = limb.slice(-1);
    const b1 = isArm ? 'uArm' + side : 'thigh' + side, b2 = isArm ? 'fArm' + side : 'shin' + side;
    const l1 = isArm ? 68 : 88, l2 = (isArm ? 60 : 84) + (opts.extra || 0);
    const w = this.solve(p).w; // include si ajustarea pe sol
    const parent = BONES[b1][0];
    const loc = M.apply(M.inv(w[parent]), tx, ty);
    const dx = loc[0] - BONES[b1][1], dy = loc[1] - BONES[b1][2];
    let Ld = Math.hypot(dx, dy);
    Ld = Math.min(Ld, l1 + l2 - 0.5);
    Ld = Math.max(Ld, Math.abs(l1 - l2) + 0.5);
    const base = Math.atan2(dx, dy) * 180 / Math.PI;
    const a1 = Math.acos(PSM.clamp((l1 * l1 + Ld * Ld - l2 * l2) / (2 * l1 * Ld), -1, 1)) * 180 / Math.PI;
    const inner = Math.acos(PSM.clamp((l1 * l1 + l2 * l2 - Ld * Ld) / (2 * l1 * l2), -1, 1)) * 180 / Math.PI;
    if (isArm) { pose[b1] = base - a1; pose[b2] = 180 - inner; }
    else { pose[b1] = base + a1; pose[b2] = -(180 - inner); }
    return pose;
  };

  AlecsiaSide.BONES = BONES;
  AlecsiaSide.SOLE = SOLE;
  PSM.AlecsiaSide = AlecsiaSide;
})(typeof window !== 'undefined' ? window : globalThis);
