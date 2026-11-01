/* Scena: fundaluri (cu derulare/parallax), straturi de adancime, recuzita si randarea unei stari de animatie.
 * Coordonate lume: solul la y=0, centrul scenei la x=0. viewBox implicit: -600 -560 1200 675 (16:9).
 */
(function (root) {
  'use strict';
  const PSM = root.PSM;
  const { shape, fill, line, el } = PSM;
  const L = () => PSM.palette.line;

  // ---------- fundaluri ----------
  // fiecare: build(g) -> update(scroll, t)
  function tiled(g, width, html, factor) {
    const holder = el('g'); g.appendChild(holder);
    let s = '';
    for (let i = -2; i <= 2; i++) s += `<g transform="translate(${i * width} 0)">${html}</g>`;
    holder.innerHTML = s;
    return (scroll) => {
      const off = -(((scroll * factor) % width) + width) % width;
      holder.setAttribute('transform', `translate(${off.toFixed(2)} 0)`);
    };
  }
  const BACKGROUNDS = {
    studio(g) {
      g.innerHTML = `<rect x="-700" y="-700" width="1400" height="900" fill="#C8C8C8"/>` +
        [-470, -300, -60].map(y => `<line x1="-700" x2="700" y1="${y}" y2="${y}" stroke="#A9A9A9" stroke-width="2"/>`).join('') +
        `<line x1="-700" x2="700" y1="0" y2="0" stroke="#9A9A9A" stroke-width="2.5"/>`;
      return () => {};
    },
    street(g) {
      g.innerHTML = `<defs><linearGradient id="skyS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9C8DA"/><stop offset="1" stop-color="#E4E0E8"/></linearGradient></defs>` +
        `<rect x="-700" y="-700" width="1400" height="900" fill="url(#skyS)"/>`;
      let far = '';
      const hs = [[0, 230, 120], [130, 300, 90], [230, 190, 140], [380, 340, 100], [490, 250, 110], [610, 210, 130], [750, 290, 95], [850, 230, 150]];
      for (const [x, h, w] of hs) {
        far += `<rect x="${x}" y="${-120 - h}" width="${w}" height="${h + 120}" fill="#9C9AB4" stroke="#7F7C99" stroke-width="2"/>`;
        for (let yy = -100 - h + 30; yy < -150; yy += 34) for (let xx = x + 14; xx < x + w - 16; xx += 26) far += `<rect x="${xx}" y="${yy}" width="12" height="16" fill="#B6B4CC"/>`;
      }
      const upFar = tiled(g, 1000, far, 0.25);
      let mid = '';
      // stalpi de iluminat + copaci
      mid += `<g transform="translate(120 0)"><rect x="-5" y="-420" width="10" height="400" fill="#4B4A57" stroke="${L()}" stroke-width="2.5"/><path d="M 0,-420 C 0,-440 40,-444 56,-430" fill="none" stroke="${L()}" stroke-width="9"/><path d="M 0,-420 C 0,-440 40,-444 56,-430" fill="none" stroke="#4B4A57" stroke-width="5"/><path d="M 44,-432 L 72,-432 L 66,-420 L 50,-420 Z" fill="#E8E1B8" stroke="${L()}" stroke-width="2.5"/></g>`;
      mid += `<g transform="translate(470 0)"><rect x="-9" y="-170" width="18" height="150" fill="#6A4E3B" stroke="${L()}" stroke-width="2.5"/><circle cx="0" cy="-230" r="80" fill="#5F8F5A" stroke="${L()}" stroke-width="3"/><circle cx="-34" cy="-200" r="46" fill="#527E4E" stroke="${L()}" stroke-width="3"/><path d="M -40,-260 C -20,-280 10,-286 30,-270" stroke="#7DAF74" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
      const upMid = tiled(g, 800, mid, 0.7);
      let ground = `<rect x="0" y="-20" width="400" height="220" fill="#A9A6B0"/><rect x="0" y="-26" width="400" height="10" fill="#8E8B96"/>`;
      for (let x = 0; x < 400; x += 100) ground += `<line x1="${x}" y1="-16" x2="${x - 30}" y2="120" stroke="#8E8B96" stroke-width="2.5"/>`;
      ground += `<rect x="0" y="40" width="400" height="200" fill="#5E5B66"/><rect x="0" y="36" width="400" height="8" fill="#47454E"/>`;
      const upG = tiled(g, 400, ground, 1);
      return (scroll) => { upFar(scroll); upMid(scroll); upG(scroll); };
    },
    road(g) {
      g.innerHTML = `<defs><linearGradient id="skyR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9B98F"/><stop offset="0.6" stop-color="#F1D2AE"/><stop offset="1" stop-color="#E8DCCB"/></linearGradient></defs>` +
        `<rect x="-700" y="-700" width="1400" height="900" fill="url(#skyR)"/><circle cx="300" cy="-420" r="60" fill="#F7E7C4" opacity="0.9"/>`;
      let hills = '';
      hills += `<path d="M 0,-120 C 200,-260 380,-200 520,-150 C 640,-110 760,-240 900,-200 C 960,-180 1000,-150 1000,-140 L 1000,0 L 0,0 Z" fill="#B49AA8"/>`;
      const upH = tiled(g, 1000, hills, 0.08);
      let city = '';
      const bs = [[0, 160, 70], [80, 220, 60], [150, 130, 90], [260, 260, 70], [340, 180, 80], [440, 140, 60], [520, 240, 80], [620, 170, 70], [700, 200, 90], [810, 150, 70], [890, 230, 80]];
      for (const [x, h, w] of bs) city += `<rect x="${x}" y="${-90 - h}" width="${w}" height="${h + 90}" fill="#8F7F98"/>`;
      const upC = tiled(g, 1000, city, 0.2);
      let trees = '';
      for (const x of [40, 330, 560]) trees += `<g transform="translate(${x} -60)"><rect x="-6" y="-80" width="12" height="80" fill="#5A4636" stroke="${L()}" stroke-width="2"/><ellipse cx="0" cy="-120" rx="46" ry="60" fill="#58805A" stroke="${L()}" stroke-width="2.5"/></g>`;
      trees += `<g transform="translate(780 -60)"><rect x="-4" y="-330" width="8" height="330" fill="#4B4A57" stroke="${L()}" stroke-width="2"/><path d="M 0,-330 C 0,-346 30,-348 44,-338" fill="none" stroke="#4B4A57" stroke-width="5"/></g>`;
      const upT = tiled(g, 900, `<rect x="0" y="-60" width="900" height="30" fill="#7F9A6E"/>` + trees, 0.5);
      let road = `<rect x="0" y="-36" width="600" height="300" fill="#4A4952"/><rect x="0" y="-40" width="600" height="8" fill="#9A98A2"/>`;
      road += `<rect x="40" y="58" width="180" height="10" fill="#E6E2D6"/><rect x="340" y="58" width="180" height="10" fill="#E6E2D6"/>`;
      const upR = tiled(g, 600, road, 1);
      return (scroll) => { upH(scroll); upC(scroll); upT(scroll); upR(scroll); };
    },
    room(g) {
      g.innerHTML = `<rect x="-700" y="-700" width="1400" height="900" fill="#CFC6D8"/>` +
        `<rect x="-700" y="-60" width="1400" height="60" fill="#BBB0C6"/>` +
        `<rect x="-700" y="0" width="1400" height="200" fill="#7C6A5E"/><line x1="-700" x2="700" y1="0" y2="0" stroke="${L()}" stroke-width="2.5"/>` +
        // fereastra cu noapte + poster
        `<g transform="translate(-380 -470)"><rect width="240" height="200" fill="#2F3554" stroke="${L()}" stroke-width="5"/><circle cx="180" cy="50" r="18" fill="#E9E4CF"/><line x1="120" y1="0" x2="120" y2="200" stroke="${L()}" stroke-width="4"/><line x1="0" y1="100" x2="240" y2="100" stroke="${L()}" stroke-width="4"/>` +
        `<path d="M 0,200 L 0,150 L 30,150 L 30,120 L 60,120 L 60,160 L 90,160 L 90,130 L 120,130 L 120,170 L 160,170 L 160,140 L 200,140 L 200,165 L 240,165 L 240,200 Z" fill="#1F2238"/><rect x="40" y="135" width="6" height="8" fill="#E8D27A"/><rect x="140" y="150" width="6" height="8" fill="#E8D27A"/></g>` +
        `<g transform="translate(300 -470) rotate(3)"><rect width="130" height="170" fill="#262331" stroke="${L()}" stroke-width="4"/><path d="M 65,30 L 105,110 L 25,110 Z" fill="#8B6DC6" stroke="${L()}" stroke-width="3"/><rect x="20" y="128" width="90" height="10" fill="#C9C2DF"/><rect x="34" y="146" width="62" height="7" fill="#C9C2DF"/></g>`;
      return () => {};
    },
    pool(g) {
      g.innerHTML = `<defs><linearGradient id="skyP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE3F0"/><stop offset="1" stop-color="#E6F4F7"/></linearGradient><linearGradient id="deepP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3C97BE"/><stop offset="1" stop-color="#1D5C83"/></linearGradient></defs>` +
        `<rect x="-700" y="-700" width="1400" height="900" fill="url(#skyP)"/><rect x="-700" y="-200" width="1400" height="400" fill="url(#deepP)"/>`;
      let tiles = '';
      for (let x = 0; x < 400; x += 40) tiles += `<line x1="${x}" y1="-200" x2="${x}" y2="200" stroke="#2F86AD" stroke-width="2" opacity="0.6"/>`;
      tiles += `<rect x="0" y="40" width="400" height="14" fill="#1C4E70" opacity="0.8"/>`;
      tiles += `<path d="M 60,-120 C 80,-128 100,-112 120,-120 M 250,-60 C 270,-68 290,-52 310,-60" stroke="#BFE8F7" stroke-width="3" fill="none" opacity="0.35"/>`;
      const upT = tiled(g, 400, tiles, 0.6);
      // culoar plutitor (geamanduri) in departare
      let lane = '';
      for (let x = 0; x < 300; x += 30) lane += `<circle cx="${x}" cy="-212" r="10" fill="${(x / 30) % 2 ? '#E8E2D6' : '#D8484C'}" stroke="${L()}" stroke-width="2"/>`;
      const upL = tiled(g, 300, lane, 0.6);
      return (scroll) => { upT(scroll); upL(scroll); };
    }
  };

  class Stage {
    constructor(svg) {
      this.svg = svg;
      svg.setAttribute('viewBox', '-600 -560 1200 675');
      svg.innerHTML = '';
      this.world = el('g', { class: 'world' }); svg.appendChild(this.world);
      const mk = (name) => { const g = el('g', { 'data-layer': name }); this.world.appendChild(g); return g; };
      this.L = {
        bg: mk('bg'), back: mk('back'), carBack: mk('carBack'), charIn: mk('charIn'),
        carBody: mk('carBody'), door: mk('door'), charOut: mk('charOut'), front: mk('front'), water: mk('water'), fx: mk('fx')
      };
      this.rig = new PSM.AlecsiaSide(this.L.charOut);
      this.front = new PSM.AlecsiaFront(this.L.charOut);
      this._buildProps();
      this.bgName = null;
      this.showBg = true;
    }

    _buildProps() {
      const L = this.L;
      // masina
      this.car = el('g'); L.carBack.appendChild(this.car);
      this.carInterior = el('g'); this.carInterior.innerHTML = PSM.carInteriorSVG(); this.car.appendChild(this.carInterior);
      this.carBodyG = el('g'); L.carBody.appendChild(this.carBodyG);
      this.carBodyG.innerHTML = PSM.carBodySVG();
      this.wheels = PSM.CAR_GEOM.WHEELS.map(([x, y]) => {
        const w = el('g', { transform: `translate(${x} ${y})` }); const r = el('g'); r.innerHTML = PSM.carWheelSVG(); w.appendChild(r); this.carBodyG.appendChild(w); return r;
      });
      this.carDoorG = el('g'); L.door.appendChild(this.carDoorG);
      this.doorInner = el('g'); this.doorInner.innerHTML = PSM.carDoorSVG(); this.carDoorG.appendChild(this.doorInner);
      this.steer = this.carInterior.querySelector('[data-k="steerRot"]');
      // birou, scaun, laptop deschis
      this.chair = el('g'); this.chair.innerHTML = PSM.chairSVG(); L.back.appendChild(this.chair);
      this.desk = el('g'); this.desk.innerHTML = PSM.deskSVG(); L.front.appendChild(this.desk);
      this.laptopOpen = el('g'); this.laptopOpen.innerHTML = PSM.laptopOpenSVG(); L.front.appendChild(this.laptopOpen);
      // laptop cărat (atasat de mana din fata)
      this.carryLaptop = this.rig.addProp(`<g transform="rotate(0)">${PSM.laptopClosedSVG(88, 62)}</g>`, 'handF', 'beforeArmF', [0, 0, 0]);
      // apa
      this.waterFront = el('path', { fill: '#3B9BC6', opacity: '0.5' }); L.water.appendChild(this.waterFront);
      this.waterLine = el('path', { fill: 'none', stroke: '#D9F1FA', 'stroke-width': '3', opacity: '0.9' }); L.water.appendChild(this.waterLine);
      this.splash = el('g'); L.fx.appendChild(this.splash);
      this.speech = el('g'); L.fx.appendChild(this.speech);
    }

    setBackground(name) {
      if (this.bgName === name) return;
      this.bgName = name;
      this.L.bg.innerHTML = '';
      const g = el('g'); this.L.bg.appendChild(g);
      this.bgUpdate = (BACKGROUNDS[name] || BACKGROUNDS.studio)(g);
    }

    render(state, t) {
      const s = state;
      this.setBackground(s.bg || 'studio');
      this.L.bg.style.display = this.showBg ? '' : 'none';
      this.bgUpdate(s.scroll || 0, t);
      // personaj
      const side = s.view !== 'front';
      this.rig.g.style.display = side ? '' : 'none';
      this.front.g.style.display = side ? 'none' : '';
      const charLayer = s.charInside ? this.L.charIn : this.L.charOut;
      if (side) {
        if (this.rig.g.parentNode !== charLayer) charLayer.appendChild(this.rig.g);
        this.carryLaptop.visible = !!s.carryLaptop;
        if (s.carryLaptop) this.carryLaptop.offset = s.carryLaptop;
        this.rig.setPose(s.pose);
      } else {
        if (this.front.g.parentNode !== this.L.charOut) this.L.charOut.appendChild(this.front.g);
        this.front.setPose(s.pose);
      }
      // masina
      const car = s.car;
      [this.car, this.carBodyG, this.carDoorG].forEach(g => g.style.display = car ? '' : 'none');
      if (car) {
        const tr = `translate(${car.x} ${car.y || 0})`;
        this.car.setAttribute('transform', tr);
        this.carBodyG.setAttribute('transform', tr);
        const k = Math.cos((car.door || 0) * 72 * Math.PI / 180);
        const hx = PSM.CAR_GEOM.DOOR_HINGE_X;
        this.carDoorG.setAttribute('transform', `${tr} translate(${hx} 0) scale(${k.toFixed(4)} 1) translate(${-hx} 0)`);
        this.doorInner.querySelector('[data-k="shade"] path').setAttribute('opacity', ((1 - k) * 0.35).toFixed(3));
        this.wheels.forEach(w => w.setAttribute('transform', `rotate(${(car.wheel || 0).toFixed(2)})`));
        this.steer.setAttribute('transform', `rotate(${(car.steer || 0).toFixed(2)})`);
      }
      // birou
      const desk = s.desk;
      [this.chair, this.desk, this.laptopOpen].forEach(g => g.style.display = desk ? '' : 'none');
      if (desk) {
        this.chair.setAttribute('transform', `translate(${desk.chairX} 0)`);
        this.desk.setAttribute('transform', `translate(${desk.x} 0)`);
        this.laptopOpen.setAttribute('transform', `translate(${desk.x + desk.laptopX} -190)`);
        this.laptopOpen.style.display = desk.laptop === false ? 'none' : '';
      }
      // apa
      if (s.water) {
        this.waterFront.style.display = this.waterLine.style.display = '';
        const d = PSM.waveD(t + (s.scroll || 0) / 180, -700, 700, 4, 220, s.water.level);
        this.waterFront.setAttribute('d', d);
        this.waterLine.setAttribute('d', d.replace(/^M [^L]+L /, 'M ').replace(/ L [^ ]+ Z$/, '').replace(/ L 700,[\d.]+ Z$/, ''));
      } else {
        this.waterFront.style.display = this.waterLine.style.display = 'none';
      }
      // efecte (stropi)
      this.splash.innerHTML = (s.splashes || []).map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${p[2].toFixed(1)}" fill="#E8F7FC" stroke="${L()}" stroke-width="1.4" opacity="${(p[3] == null ? 1 : p[3]).toFixed(2)}"/>`).join('');
    }
  }
  PSM.Stage = Stage;
})(typeof window !== 'undefined' ? window : globalThis);
