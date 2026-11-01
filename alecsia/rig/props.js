/* Recuzita si decoruri pentru animatiile Alecsiei: masina, laptop, birou, scaun, apa, fundaluri. */
(function (root) {
  'use strict';
  const PSM = root.PSM;
  const { shape, fill, line } = PSM;
  const L = () => PSM.palette.line;

  // ---------------- LAPTOP ----------------
  const STICKERS = [
    // cap de mort
    (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M -6,-2 C -6,-9 6,-9 6,-2 C 6,1 4,2 4,4 L -4,4 C -4,2 -6,1 -6,-2 Z" fill="#E9E6E0" stroke="${L()}" stroke-width="1.2"/><circle cx="-2.4" cy="-2" r="1.6" fill="${L()}"/><circle cx="2.4" cy="-2" r="1.6" fill="${L()}"/><path d="M -2,4 L -2,6 M 0,4 L 0,6 M 2,4 L 2,6" stroke="${L()}" stroke-width="0.9"/></g>`,
    // triunghi
    (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M 0,-7 L 7,5 L -7,5 Z" fill="${c || '#E0484C'}" stroke="${L()}" stroke-width="1.2"/><path d="M 0,-2 L 3,3 L -3,3 Z" fill="${L()}" opacity="0.6"/></g>`,
    // diamant
    (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M 0,-7 L 6,0 L 0,7 L -6,0 Z" fill="${c || '#4FA3D9'}" stroke="${L()}" stroke-width="1.2"/><path d="M 0,-7 L 0,7 M -6,0 L 6,0" stroke="${L()}" stroke-width="0.7" opacity="0.6"/></g>`,
    // craniu verde / bulina
    (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><circle r="6" fill="${c || '#9CC94A'}" stroke="${L()}" stroke-width="1.2"/><circle cx="-2" cy="-1" r="1.4" fill="${L()}"/><circle cx="2" cy="-1" r="1.4" fill="${L()}"/></g>`,
    // eticheta portocalie
    (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-8" y="-5" width="16" height="10" rx="3" fill="${c || '#F08A2A'}" stroke="${L()}" stroke-width="1.2"/><path d="M -4,0 L 4,0" stroke="${L()}" stroke-width="1.6"/></g>`
  ];
  // laptop inchis, vazut din fata (capacul cu stickere) — centrat in (0,0)
  PSM.laptopClosedSVG = function (w, h) {
    w = w || 84; h = h || 60;
    const c = PSM.palette;
    let s = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="5" fill="${c.laptop}" stroke="${L()}" stroke-width="${PSM.LW}"/>`;
    s += `<rect x="${-w / 2 + 4}" y="${-h / 2 + 4}" width="${w - 8}" height="${h - 8}" rx="3" fill="none" stroke="${c.laptopHi}" stroke-width="1.4" opacity="0.7"/>`;
    s += STICKERS[0](-22, -14, 1.2) + STICKERS[1](-4, -16, 1, '#E0484C') + STICKERS[2](16, -12, 1, '#4FA3D9') +
      STICKERS[3](-24, 12, 1, '#9CC94A') + STICKERS[1](4, 6, 1.1, '#7A5CC4') + STICKERS[4](24, 14, 1, '#F08A2A') + STICKERS[2](-6, 18, 0.8, '#3DBE9A');
    s += `<path d="M ${w / 2 - 2},${-h / 2 + 4} L ${w / 2 - 2},${h / 2 - 4}" stroke="${c.laptopDk}" stroke-width="3"/>`;
    return s;
  };
  // laptop deschis, din profil: originea = coltul din spate-jos al bazei (langa utilizator), baza spre +x
  PSM.laptopOpenSVG = function () {
    const c = PSM.palette;
    let s = '';
    // ecran (capac) inclinat ~105 grade, balamaua in capatul indepartat
    s += `<g transform="translate(70 -5) rotate(-75)"><rect x="-2" y="-4" width="64" height="5" rx="2" fill="${c.laptop}" stroke="${L()}" stroke-width="2.4"/><rect x="2" y="-5.4" width="56" height="1.6" fill="#9FD3FF" opacity="0.9"/></g>`;
    s += `<rect x="0" y="-6" width="74" height="6" rx="2" fill="${c.laptopHi}" stroke="${L()}" stroke-width="2.4"/>`;
    s += `<rect x="10" y="-7.5" width="44" height="2" rx="1" fill="${c.laptopDk}"/>`;
    return s;
  };
  // lumina ecranului (glow), in coordonate laptop
  PSM.laptopGlowSVG = function () {
    return `<polygon points="70,-8 82,-66 -50,-120 -60,-20" fill="#A8D8FF" opacity="0.10"/>`;
  };

  // ---------------- BIROU + SCAUN ----------------
  PSM.deskSVG = function () {
    // origine: la sol, sub marginea dinspre utilizator a blatului
    const w = '#6B4F3A', wd = '#4E392A', wl = '#86664C';
    let s = '';
    s += shape('M 230,-178 L 238,-178 L 238,0 L 226,0 Z', wd);
    s += shape('M -6,-190 L 250,-190 L 250,-176 L -6,-176 Z', w);
    s += fill('M -6,-190 L 250,-190 L 250,-186 L -6,-186 Z', wl);
    s += shape('M 120,-176 L 236,-176 L 236,-140 L 120,-140 Z', w);
    s += line('M 160,-160 L 196,-160', wd, 3);
    return s;
  };
  PSM.deskLegNearSVG = function () {
    return shape('M 222,-176 L 236,-176 L 236,0 L 222,0 Z', '#5A4231');
  };
  PSM.chairSVG = function () {
    // scaun de birou, profil; originea la sol sub centrul sezutului
    const c1 = '#2F2E38', c2 = '#46454F';
    let s = '';
    s += line('M -46,-4 L 46,-4', L(), 7) + line('M -46,-4 L 46,-4', c2, 4);
    s += `<circle cx="-44" cy="-2" r="6" fill="${c1}" stroke="${L()}" stroke-width="2"/><circle cx="44" cy="-2" r="6" fill="${c1}" stroke="${L()}" stroke-width="2"/>`;
    s += shape('M -5,-8 L -5,-92 L 5,-92 L 5,-8 Z', '#77767F');
    s += shape('M -44,-112 C -44,-120 48,-120 52,-110 L 50,-96 C 20,-92 -20,-92 -44,-96 Z', c1);
    s += fill('M -44,-104 C -10,-100 30,-100 50,-104 L 50,-96 C 20,-92 -20,-92 -44,-96 Z', '#1E1D24');
    s += shape('M -50,-110 L -64,-262 C -62,-276 -46,-278 -42,-266 L -30,-112 Z', c1);
    s += line('M -54,-140 L -58,-240', c2, 2.4, 0.8);
    return s;
  };

  // ---------------- MASINA (hatchback generic, profil, botul spre dreapta) ----------------
  // origine: pe sol, la mijlocul masinii. Lungime ~920u, inaltime ~350u.
  const CAR = {
    body: '#3E7C86', bodySh: '#2D5F68', bodyHi: '#5FA0A9', bodyDk: '#22474E',
    glass: '#9CC7D6', trim: '#23252B', chrome: '#C9CED6', tire: '#1D1D22', rim: '#9EA4AE', rimDk: '#6C727C',
    seat: '#3A3640', seatSh: '#2A272F', dash: '#2B2A31'
  };
  PSM.carColors = CAR;
  const OUTER = 'M -455,-60 C -466,-90 -464,-170 -456,-205 C -448,-240 -430,-262 -396,-300 C -374,-326 -350,-346 -300,-350 L 30,-350 C 60,-350 80,-340 110,-310 L 212,-206 C 250,-196 340,-190 410,-176 C 446,-168 460,-150 463,-120 C 465,-96 462,-72 452,-60 L 390,-60 C 390,-108 352,-148 310,-148 C 268,-148 230,-108 230,-60 L -220,-60 C -220,-108 -258,-148 -300,-148 C -342,-148 -380,-108 -380,-60 Z';
  const DOOR = 'M -52,-60 L 200,-60 L 206,-192 L 196,-202 L 102,-306 C 80,-330 60,-340 30,-340 L -52,-340 Z';
  const DOOR_HINGE_X = 204;
  const DOOR_GLASS = 'M -40,-206 L 188,-206 L 98,-298 C 78,-320 60,-328 32,-328 L -40,-328 Z';
  const REAR_GLASS = 'M -68,-206 L -68,-328 L -290,-328 C -330,-326 -352,-310 -376,-284 L -404,-250 C -414,-236 -412,-210 -396,-206 Z';
  const WINDSHIELD_EDGE = 'M 112,-308 L 214,-205';

  function wheel() {
    let s = `<circle r="70" fill="${CAR.tire}" stroke="${L()}" stroke-width="${PSM.LW}"/>`;
    s += `<circle r="62" fill="none" stroke="#33333B" stroke-width="3"/>`;
    s += `<circle r="42" fill="${CAR.rim}" stroke="${L()}" stroke-width="2.6"/>`;
    for (let i = 0; i < 5; i++) {
      s += `<path d="M -6,-10 L -9,-38 L 9,-38 L 6,-10 Z" fill="${CAR.rimDk}" stroke="${L()}" stroke-width="1.4" transform="rotate(${i * 72})"/>`;
    }
    s += `<circle r="12" fill="${CAR.rimDk}" stroke="${L()}" stroke-width="2"/><circle r="4" fill="${L()}"/>`;
    return s;
  }

  PSM.carInteriorSVG = function () {
    let s = '';
    // geamurile din partea opusa (interior inchis)
    s += fill('M -440,-200 C -440,-250 -420,-280 -390,-310 C -360,-340 -330,-346 -290,-346 L 40,-346 C 70,-346 90,-336 112,-312 L 214,-200 Z', '#5E7884');
    s += fill('M -440,-200 L 214,-200 L 214,-60 L -440,-60 Z', '#2E3038');
    s += line('M -52,-150 L 200,-150 M -40,-186 L 196,-186', '#3B3E47', 3);
    s += fill('M -60,-60 L 210,-60 L 210,-84 L -60,-84 Z', '#24262C');
    // bord + volan
    s += shape('M 120,-200 C 150,-228 190,-236 214,-226 L 236,-196 L 130,-182 Z', CAR.dash);
    s += line('M 196,-224 L 142,-246', L(), 8) + line('M 196,-224 L 142,-246', '#3c3b44', 5);
    s += `<g data-k="steer" transform="translate(132 -250)"><g data-k="steerRot"><ellipse rx="10" ry="34" fill="none" stroke="${L()}" stroke-width="10" transform="rotate(-28)"/><ellipse rx="10" ry="34" fill="none" stroke="#2c2b33" stroke-width="6" transform="rotate(-28)"/><circle r="5" fill="#46454f" stroke="${L()}" stroke-width="1.5"/></g></g>`;
    // bancheta spate
    s += shape('M -330,-110 L -150,-110 L -150,-136 L -330,-136 Z', CAR.seatSh);
    s += shape('M -350,-136 L -330,-300 C -326,-312 -300,-312 -296,-300 L -280,-136 Z', CAR.seatSh);
    // scaunul soferului
    s += shape('M -66,-104 C -66,-124 60,-124 70,-108 L 66,-96 L -60,-96 Z', CAR.seat);
    s += shape('M -78,-108 L -96,-280 C -94,-296 -60,-300 -56,-282 L -36,-110 Z', CAR.seat);
    s += shape('M -98,-284 L -102,-326 C -100,-340 -66,-342 -64,-328 L -62,-286 Z', CAR.seat);
    s += line('M -84,-130 L -96,-262', CAR.seatSh, 3, 0.8);
    return s;
  };
  PSM.carBodySVG = function () {
    let s = '';
    // caroseria cu decupaj pentru usa si geamuri (evenodd)
    s += `<path d="${OUTER} ${DOOR} ${REAR_GLASS}" fill="${CAR.body}" fill-rule="evenodd" stroke="${L()}" stroke-width="${PSM.LW}" stroke-linejoin="round"/>`;
    // umbre si lumini
    s += fill('M -455,-60 C -462,-80 -464,-100 -463,-120 L -380,-120 C -385,-100 -382,-80 -380,-60 Z', CAR.bodySh);
    s += fill('M 390,-60 C 392,-90 380,-110 370,-120 L 462,-120 C 463,-96 461,-74 452,-60 Z', CAR.bodySh);
    s += fill('M -220,-60 L -52,-60 L -52,-84 L -220,-84 Z', CAR.bodySh);
    s += fill('M 200,-60 L 230,-60 L 230,-84 L 200,-84 Z', CAR.bodySh);
    s += line('M 214,-198 C 260,-190 340,-184 410,-172', CAR.bodyHi, 3, 0.8);
    s += line('M -300,-346 L 30,-346', CAR.bodyHi, 3, 0.7);
    // geamul din spate (transparent) + rama
    s += `<path d="${REAR_GLASS}" fill="${CAR.glass}" opacity="0.28" stroke="${L()}" stroke-width="2.4"/>`;
    s += shape('M -78,-206 L -60,-206 L -60,-338 L -78,-338 Z', CAR.trim, 2.4);
    s += line('M -300,-318 L -380,-226', '#ffffff', 5, 0.25);
    // parbriz (muchie) + stalp A
    s += line(WINDSHIELD_EDGE, CAR.trim, 6);
    // usa din spate
    s += line('M -60,-206 L -60,-62 M -300,-206 C -312,-150 -300,-100 -230,-62', L(), 2);
    s += `<rect x="-118" y="-180" width="30" height="8" rx="3" fill="${CAR.bodyDk}" stroke="${L()}" stroke-width="1.6"/>`;
    // faruri, stopuri, bare
    s += shape('M 420,-168 C 440,-164 454,-154 458,-138 L 430,-140 C 424,-150 420,-158 420,-168 Z', '#F3E6B5', 2.2);
    s += shape('M -462,-190 C -458,-214 -452,-226 -446,-232 L -440,-190 Z', '#C8343A', 2.2);
    s += shape('M 400,-96 L 466,-96 L 464,-62 L 396,-62 Z', CAR.trim, 2.4);
    s += shape('M -466,-110 L -400,-110 L -396,-62 L -458,-62 Z', CAR.trim, 2.4);
    s += line('M -220,-62 L 230,-62', L(), 4);
    // oglinda
    s += shape('M 196,-214 L 226,-224 C 236,-226 240,-212 232,-206 L 204,-200 Z', CAR.body, 2.4);
    return s;
  };
  PSM.carDoorSVG = function () {
    let s = '';
    s += `<path d="${DOOR} ${DOOR_GLASS}" fill="${CAR.body}" fill-rule="evenodd" stroke="${L()}" stroke-width="${PSM.LW}" stroke-linejoin="round"/>`;
    s += fill('M -52,-60 L 200,-60 L 201,-84 L -52,-84 Z', CAR.bodySh);
    s += line('M -46,-196 L 200,-196', CAR.bodyHi, 2.4, 0.7);
    s += line('M -52,-130 C 40,-136 120,-136 202,-130', CAR.bodyDk, 2, 0.8);
    s += `<path d="${DOOR_GLASS}" fill="${CAR.glass}" opacity="0.26" stroke="${L()}" stroke-width="2.4"/>`;
    s += line('M 20,-320 L -30,-220 M 60,-316 L 20,-236', '#ffffff', 5, 0.22);
    s += `<rect x="-36" y="-180" width="32" height="9" rx="3" fill="${CAR.bodyDk}" stroke="${L()}" stroke-width="1.6"/>`;
    s += `<g data-k="shade"><path d="${DOOR}" fill="#000" opacity="0"/></g>`;
    return s;
  };
  PSM.carWheelSVG = wheel;
  PSM.CAR_GEOM = { DOOR_HINGE_X, SEAT: { x: 10, y: -122 }, WHEELS: [[-300, -70], [310, -70]], HANDLE: { x: -20, y: -176 }, STEER: { x: 132, y: -250 } };

  // ---------------- APA (inot) ----------------
  PSM.waterBackSVG = function () {
    return `<rect x="-1400" y="0" width="2800" height="600" fill="#2F7FA8"/><rect x="-1400" y="-4" width="2800" height="10" fill="#7FC4E0"/>`;
  };
  PSM.waveD = function (t, x0, x1, amp, len, y) {
    let d = `M ${x0},${y + 500} L ${x0},${y}`;
    for (let x = x0; x <= x1; x += 20) {
      const yy = y + Math.sin((x / len) * Math.PI * 2 + t * 3) * amp + Math.sin((x / (len * 0.43)) * Math.PI * 2 - t * 4.2) * amp * 0.35;
      d += ` L ${x},${yy.toFixed(1)}`;
    }
    return d + ` L ${x1},${y + 500} Z`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
