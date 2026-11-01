/* Biblioteca de animatii Alecsia.
 * Fiecare animatie: { id, label, group, T (secunde), loop, frame(t, ctx) -> stare scena }
 * stare = { view:'side'|'front', pose, bg, scroll, car, desk, water, carryLaptop, charInside, splashes }
 */
(function (root) {
  'use strict';
  const PSM = root.PSM;
  const { lerp, clamp, ease, keyframes, blink, talkMouth } = PSM;
  const PI2 = Math.PI * 2;
  const sin = Math.sin, cos = Math.cos, max = Math.max, pow = Math.pow;
  const G = PSM.CAR_GEOM;

  const anims = PSM.anims = [];
  const def = (o) => { anims.push(o); return o; };
  PSM.animById = (id) => anims.find(a => a.id === id);

  // ---------- poze de baza ----------
  const STAND = { torso: 1, head: -1, hair: 2, uArmF: 3, fArmF: 10, uArmB: -3, fArmB: 12, handF: 0, handB: 0, thighF: 1, shinF: -1, thighB: -1, shinB: -1, footF: 0, footB: 0 };
  PSM.STAND = STAND;

  function walkPose(t, T) {
    const f = PI2 * t / T;
    const leg = (ph) => {
      const sw = pow(max(0, cos(ph + 0.75)), 1.6);
      const load = max(0, cos(ph - 2.1));
      return [3 + 24 * sin(ph), -(5 + 52 * sw + 8 * load), 9 * sin(ph) - 2 + 10 * sw];
    };
    const [tf, sf, ff] = leg(f), [tb, sb, fb] = leg(f + Math.PI);
    return {
      thighF: tf, shinF: sf, footF: ff, thighB: tb, shinB: sb, footB: fb,
      uArmF: -20 * sin(f) - 2, fArmF: 12 + 20 * max(0, -sin(f)),
      uArmB: 20 * sin(f) - 2, fArmB: 12 + 20 * max(0, sin(f)),
      handF: 4, handB: 4,
      torso: 4 + 1.2 * cos(2 * f), head: -4 + 1.2 * cos(2 * f + 0.4), hair: 5 + 3 * sin(2 * f + 1),
      ground: 0
    };
  }
  function runPose(t, T) {
    const f = PI2 * t / T;
    const leg = (ph) => {
      const sw = pow(max(0, cos(ph + 0.55)), 1.1);
      return [16 + 44 * sin(ph), -(16 + 100 * sw), 14 * sin(ph) - 8 + 12 * sw];
    };
    const [tf, sf, ff] = leg(f), [tb, sb, fb] = leg(f + Math.PI);
    return {
      thighF: tf, shinF: sf, footF: ff, thighB: tb, shinB: sb, footB: fb,
      uArmF: -40 * sin(f) + 6, fArmF: 88 + 12 * sin(f), uArmB: 40 * sin(f) + 6, fArmB: 88 - 12 * sin(f),
      handShapeF: 'fist', handShapeB: 'fist', handF: 10, handB: 10,
      torso: 13 + 2 * cos(2 * f), head: -10 - 2 * cos(2 * f), hair: 22 + 7 * sin(2 * f + 0.5),
      ground: 0, lift: 14 * pow(max(0, sin(2 * f + 0.9)), 1.4), mouth: 'small'
    };
  }

  // tabel de deplasare: cat avanseaza corpul ca talpa de sprijin sa nu alunece
  const strideCache = {};
  function strideTable(ctx, key, poseFn, T, steps) {
    if (strideCache[key]) return strideCache[key];
    steps = steps || 240;
    const rig = ctx.rig, SOLE = PSM.AlecsiaSide.SOLE, M = PSM.mat;
    const pts = (w) => { const out = []; for (const f of ['footF', 'footB']) for (const s of SOLE) out.push(M.apply(w[f], s[0], s[1])); return out; };
    const cum = [0];
    let prev = pts(rig.solve(poseFn(0)).w);
    for (let i = 1; i <= steps; i++) {
      const cur = pts(rig.solve(poseFn(T * i / steps)).w);
      let k = 0; for (let j = 1; j < cur.length; j++) if (cur[j][1] > cur[k][1]) k = j;
      cum.push(cum[i - 1] + (prev[k][0] - cur[k][0]));
      prev = cur;
    }
    const table = { cum, total: cum[steps], steps, T };
    strideCache[key] = table;
    return table;
  }
  function strideAt(tab, t) {
    const cyc = Math.floor(t / tab.T), u = (t - cyc * tab.T) / tab.T * tab.steps;
    const i = Math.floor(u), fr = u - i;
    const v = i >= tab.steps ? tab.cum[tab.steps] : lerp(tab.cum[i], tab.cum[i + 1], fr);
    return cyc * tab.total + v;
  }
  PSM.strideAt = strideAt;

  const face = (t, o) => ({ eyes: blink(t, (o && o.period) || 3.4, (o && o.off) || 0) });

  // ================= STAT / IDLE =================
  def({
    id: 'idle', label: 'Stă (idle)', group: 'De bază', T: 4, loop: true,
    frame(t) {
      const b = sin(PI2 * t / 2);
      return {
        bg: 'studio', pose: Object.assign({}, STAND, face(t), {
          x: -40 + 1.2 * sin(PI2 * t / 4), torso: 1 + 0.8 * b, head: -1 + 1.4 * sin(PI2 * t / 4 + 1),
          uArmF: 3 + 1 * b, uArmB: -3 + 1 * b, fArmF: 10 + 1.5 * b, hair: 2 + 1.5 * sin(PI2 * t / 4 + 2),
          thighF: 2 + 1.5 * sin(PI2 * t / 4), thighB: -2 + 1.5 * sin(PI2 * t / 4), ground: 0
        })
      };
    }
  });
  def({
    id: 'idleFront', label: 'Stă — din față', group: 'De bază', T: 4, loop: true,
    frame(t) {
      return { view: 'front', bg: 'studio', pose: { x: 0, y: -191, breath: (sin(PI2 * t / 2) + 1) / 2, head: 1.2 * sin(PI2 * t / 4), eyes: blink(t, 3.1, 0.6), lookX: t % 4 > 2.6 && t % 4 < 3.5 ? 0.6 : 0, mouth: 'closed' } };
    }
  });
  def({
    id: 'talkFront', label: 'Vorbește — din față', group: 'Vorbit', T: 6, loop: true,
    frame(t) {
      const accent = (t % 3 > 0.4 && t % 3 < 0.9) ? 1 : 0;
      return {
        view: 'front', bg: 'studio', pose: {
          y: -191, breath: (sin(PI2 * t / 2.2) + 1) / 2, head: 2.5 * sin(t * 2.3) + 1.5 * sin(t * 5.1), headY: 1.2 * sin(t * 4.4),
          eyes: blink(t, 2.7, 0.3), mouth: talkMouth(t), brow: accent * 1.2 + 0.3 * sin(t * 3), lookX: 0.25 * sin(t * 0.9)
        }
      };
    }
  });
  def({
    id: 'talk', label: 'Vorbește — profil (cu gesturi)', group: 'Vorbit', T: 6, loop: true,
    frame(t) {
      const arm = keyframes([
        { t: 0, pose: { uArmF: 3, fArmF: 12, handF: 0 } },
        { t: 0.7, pose: { uArmF: 28, fArmF: 78, handF: -15 } },
        { t: 1.2, pose: { uArmF: 24, fArmF: 70, handF: -5 } },
        { t: 1.6, pose: { uArmF: 30, fArmF: 82, handF: -20 } },
        { t: 2.3, pose: { uArmF: 26, fArmF: 74, handF: -10 } },
        { t: 3.1, pose: { uArmF: 6, fArmF: 16, handF: 0 } },
        { t: 3.9, pose: { uArmF: 4, fArmF: 12, handF: 0 } },
        { t: 4.5, pose: { uArmF: 34, fArmF: 60, handF: -25 } },
        { t: 5.2, pose: { uArmF: 30, fArmF: 66, handF: -15 } },
        { t: 6, pose: { uArmF: 3, fArmF: 12, handF: 0 } }
      ], t);
      const open = (t > 0.5 && t < 2.6) || (t > 4.3 && t < 5.6);
      return {
        bg: 'studio', pose: Object.assign({}, STAND, face(t, { period: 2.9 }), arm, {
          x: -40, torso: 2 + 1.2 * sin(t * 2), head: -2 + 3 * sin(t * 2.6) * (t % 3 < 2 ? 1 : 0.4),
          mouth: talkMouth(t), brow: (t > 1.4 && t < 2) || (t > 4.6 && t < 5) ? 1.2 : 0,
          handShapeF: open ? 'open' : 'relaxed', hair: 2 + 1.5 * sin(t * 1.7), ground: 0
        })
      };
    }
  });

  // ================= LOCOMOTIE =================
  def({
    id: 'walk', label: 'Merge', group: 'Deplasare', T: 1.1, loop: true, locomotion: true,
    frame(t, ctx) {
      const tab = strideTable(ctx, 'walk', (tt) => walkPose(tt, 1.1), 1.1);
      return { bg: 'street', scroll: ctx.inPlace === false ? 0 : strideAt(tab, t), pose: Object.assign(walkPose(t, 1.1), face(t), { x: ctx.inPlace === false ? -300 + strideAt(tab, t) % 700 : -20 }) };
    }
  });
  def({
    id: 'walkLaptop', label: 'Merge cu laptopul', group: 'Deplasare', T: 1.15, loop: true, locomotion: true,
    frame(t, ctx) {
      const T = 1.15;
      const pf = (tt) => { const p = walkPose(tt, T); p.uArmF = 8 + 2 * sin(PI2 * tt / T); p.fArmF = 34; p.handF = -6; return p; };
      const tab = strideTable(ctx, 'walkLaptop', pf, T);
      const p = Object.assign(pf(t), face(t, { off: 1 }), { x: -20, handShapeF: 'grip' });
      const R = (p.torso || 0) - (p.uArmF + p.fArmF + p.handF);
      return { bg: 'street', scroll: strideAt(tab, t), pose: p, carryLaptop: carryOffset(R) };
    }
  });
  // laptopul tinut lipit de sold, aproape vertical, cu stickerele spre privitor
  function carryOffset(R) {
    const wx = -4, wy = -18, a = -R * Math.PI / 180;
    return [wx * cos(a) - wy * sin(a), wx * sin(a) + wy * cos(a), -R - 8];
  }
  def({
    id: 'run', label: 'Aleargă', group: 'Deplasare', T: 0.66, loop: true, locomotion: true,
    frame(t, ctx) {
      const tab = strideTable(ctx, 'run', (tt) => runPose(tt, 0.66), 0.66);
      return { bg: 'street', scroll: strideAt(tab, t), pose: Object.assign(runPose(t, 0.66), { eyes: 'open', x: -20 }) };
    }
  });
  def({
    id: 'jump', label: 'Sare', group: 'Deplasare', T: 1.8, loop: true,
    frame(t) {
      const base = Object.assign({}, STAND, { ground: 0, lift: 0 });
      const crouch = { thighF: 48, shinF: -92, footF: 0, thighB: 44, shinB: -88, footB: 0, torso: 26, head: -14, uArmF: -40, fArmF: 14, uArmB: -46, fArmB: 14, lift: 0, hair: 6 };
      const k = keyframes([
        { t: 0, pose: Object.assign({}, base, { hair: 2 }) },
        { t: 0.38, pose: crouch, ease: ease.inOut },
        { t: 0.52, pose: { thighF: -4, shinF: -4, footF: -34, thighB: -8, shinB: -6, footB: -36, torso: 4, head: -6, uArmF: 150, fArmF: 16, uArmB: 140, fArmB: 20, lift: 30, hair: -10 }, ease: ease.out },
        { t: 0.82, pose: { thighF: 40, shinF: -70, footF: -10, thighB: 30, shinB: -60, footB: -12, torso: 8, head: -4, uArmF: 110, fArmF: 30, uArmB: 100, fArmB: 30, lift: 100, hair: -16 }, ease: ease.out },
        { t: 1.1, pose: { thighF: 20, shinF: -18, footF: 14, thighB: 14, shinB: -16, footB: 12, torso: 10, head: -6, uArmF: 60, fArmF: 20, uArmB: 54, fArmB: 20, lift: 24, hair: 12 }, ease: ease.in },
        { t: 1.24, pose: Object.assign({}, crouch, { uArmF: 24, uArmB: 18, torso: 22, lift: 0, hair: 14 }), ease: ease.out },
        { t: 1.8, pose: Object.assign({}, base, { hair: 2 }), ease: ease.inOut }
      ], t);
      return { bg: 'studio', pose: Object.assign({}, STAND, k, face(t), { x: -40, ground: 0, eyes: t > 0.3 && t < 1.3 ? 'open' : blink(t, 3), mouth: t > 0.45 && t < 1.0 ? 'o' : 'closed', handShapeF: t > 0.45 && t < 1.1 ? 'open' : 'relaxed', handShapeB: t > 0.45 && t < 1.1 ? 'open' : 'relaxed' }) };
    }
  });

  // ================= BIROU / LAPTOP =================
  const DESK = { x: -24, chairX: -84, laptopX: 0 };
  const HIP_SIT = { x: -78, y: -128 };
  function sitBase(ctx, hipX, hipY, torso) {
    const p = Object.assign({}, STAND, { x: hipX, y: hipY, torso: torso, head: 8 });
    // picioarele pe podea, sub birou
    ctx.rig.ik(p, 'legF', hipX + 104, -22);
    ctx.rig.ik(p, 'legB', hipX + 94, -22);
    p.footF = -(p.thighF + p.shinF) + 2; p.footB = -(p.thighB + p.shinB) + 2;
    return p;
  }
  def({
    id: 'type', label: 'Tastează la laptop', group: 'Laptop', T: 4, loop: true,
    frame(t, ctx) {
      const p = sitBase(ctx, HIP_SIT.x, HIP_SIT.y, 8 + 0.6 * sin(PI2 * t / 2));
      p.head = 10 + 1.5 * sin(PI2 * t / 4) + (t > 2.8 && t < 3.4 ? -6 * sin((t - 2.8) / 0.6 * Math.PI) : 0);
      const kx = DESK.x + DESK.laptopX;
      const tapF = max(0, sin(t * 26)) * 3, tapB = max(0, sin(t * 23 + 1.7)) * 3;
      const pause = t > 2.8 && t < 3.4;
      ctx.rig.ik(p, 'armF', kx + 40 + 4 * sin(t * 3.1), -206 - (pause ? 2 : tapF), { extra: 16 });
      ctx.rig.ik(p, 'armB', kx + 30 + 3 * sin(t * 2.3 + 1), -206 - (pause ? 2 : tapB), { extra: 16 });
      p.handF = -18 + (pause ? 0 : tapF * 3); p.handB = -14 + (pause ? 0 : tapB * 3);
      p.handShapeF = 'type'; p.handShapeB = 'type';
      Object.assign(p, face(t, { period: 3.6, off: 1.1 }));
      p.mouth = t > 1.2 && t < 1.6 ? 'small' : 'closed';
      p.brow = pause ? 0.8 : 0;
      return { bg: 'room', pose: p, desk: Object.assign({}, DESK) };
    }
  });
  def({
    id: 'sitDown', label: 'Se așază la birou', group: 'Laptop', T: 2.6, loop: false,
    frame(t, ctx) {
      const k = keyframes([
        { t: 0, pose: { hx: HIP_SIT.x - 6, hy: -191, torso: 1, head: -1 } },
        { t: 0.4, pose: { hx: HIP_SIT.x - 6, hy: -189, torso: 6, head: 0 } },
        { t: 1.3, pose: { hx: HIP_SIT.x - 2, hy: -150, torso: 34, head: -14 }, ease: ease.inOut },
        { t: 1.8, pose: { hx: HIP_SIT.x, hy: HIP_SIT.y, torso: 20, head: -4 }, ease: ease.out },
        { t: 2.6, pose: { hx: HIP_SIT.x, hy: HIP_SIT.y, torso: 8, head: 10 }, ease: ease.inOut }
      ], t);
      // picioarele raman pe loc pana se aseaza, apoi aluneca sub birou
      const p = Object.assign({}, STAND, { x: k.hx, y: k.hy, torso: k.torso, head: k.head });
      const u = clamp((t - 1.5) / 1.0, 0, 1), e = ease.inOut(u);
      ctx.rig.ik(p, 'legF', lerp(k.hx + 26, k.hx + 104, e), -22 - 26 * sin(u * Math.PI) * (u < 1 ? 1 : 0));
      ctx.rig.ik(p, 'legB', lerp(k.hx + 8, k.hx + 94, clamp((t - 1.8) / 0.8, 0, 1)), -22);
      p.footF = -(p.thighF + p.shinF) + 2; p.footB = -(p.thighB + p.shinB) + 2;
      const reach = clamp((t - 1.9) / 0.7, 0, 1);
      if (reach > 0) {
        const kx = DESK.x + DESK.laptopX;
        const a = Object.assign({}, p); ctx.rig.ik(a, 'armF', kx + 40, -206, { extra: 16 }); ctx.rig.ik(a, 'armB', kx + 30, -206, { extra: 16 });
        const e2 = ease.inOut(reach);
        for (const b of ['uArmF', 'fArmF', 'uArmB', 'fArmB']) p[b] = lerp(p[b], a[b], e2);
        p.handF = lerp(0, -18, e2); p.handB = lerp(0, -14, e2);
        if (reach > 0.6) { p.handShapeF = 'type'; p.handShapeB = 'type'; }
      } else { p.uArmF = 3 + 14 * clamp((t - 0.6) / 0.7, 0, 1); p.fArmF = 14; p.uArmB = -3 + 10 * clamp((t - 0.6) / 0.7, 0, 1); }
      p.hair = 2 + (k.torso - 8) * 0.3;
      Object.assign(p, face(t, { period: 3.8, off: 2 }));
      return { bg: 'room', pose: p, desk: Object.assign({}, DESK) };
    }
  });

  // ================= MASINA =================
  const CAR_X = 120;
  const seatPose = (ctx, cx, cy, extra) => {
    const hx = cx + G.SEAT.x, hy = (cy || 0) + G.SEAT.y;
    const p = Object.assign({}, STAND, { x: hx, y: hy, torso: -7, head: 5, hair: 0 }, extra || {});
    ctx.rig.ik(p, 'legF', cx + 150, (cy || 0) - 74);
    ctx.rig.ik(p, 'legB', cx + 140, (cy || 0) - 74);
    p.footF = -(p.thighF + p.shinF) + 10; p.footB = -(p.thighB + p.shinB) + 10;
    return p;
  };
  const wheelGrips = (cx, cy, steer) => {
    const a = (steer || 0) * Math.PI / 180, S = G.STEER;
    const rot = (dx, dy) => [cx + S.x + dx * cos(a) - dy * sin(a), (cy || 0) + S.y + dx * sin(a) + dy * cos(a)];
    return { F: rot(10, -28), B: rot(-8, 26) };
  };
  const onWheel = (ctx, p, cx, cy, steer) => {
    const g = wheelGrips(cx, cy, steer);
    ctx.rig.ik(p, 'armF', g.F[0], g.F[1], { extra: 10 });
    ctx.rig.ik(p, 'armB', g.B[0], g.B[1], { extra: 10 });
    p.handShapeF = 'grip'; p.handShapeB = 'grip'; p.handF = -10; p.handB = -10;
    return p;
  };
  // pozitia manerului usii, in functie de cat e deschisa (0..1)
  const handleAt = (cx, open, inner) => {
    const k = cos(open * 72 * Math.PI / 180), hx = G.DOOR_HINGE_X;
    const lx = inner ? 40 : G.HANDLE.x;
    return [cx + hx + (lx - hx) * k, inner ? -190 : G.HANDLE.y];
  };
  const blendPose = (a, b, u) => {
    const out = Object.assign({}, a);
    for (const k in b) out[k] = (typeof a[k] === 'number' && typeof b[k] === 'number') ? lerp(a[k], b[k], u) : (u < 0.5 ? (a[k] !== undefined ? a[k] : b[k]) : b[k]);
    return out;
  };
  PSM.blendPose = blendPose;

  def({
    id: 'carEnter', label: 'Urcă în mașină', group: 'Mașină', T: 6.6, loop: false,
    frame(t, ctx) {
      const cx = CAR_X, T = 1.1;
      const tab = strideTable(ctx, 'walk', (tt) => walkPose(tt, T), T);
      const STOP_X = cx - 100;
      const walkT = 1.65; // durata mersului pana la masina
      const d0 = strideAt(tab, walkT);
      const startX = STOP_X - d0;
      let p, inside = false, door = 0;
      const standAt = Object.assign({}, STAND, { x: STOP_X, ground: 0 });
      if (t < walkT) {
        p = Object.assign(walkPose(t, T), { x: startX + strideAt(tab, t) });
        if (t > walkT - 0.35) p = blendPose(p, standAt, ease.inOut((t - (walkT - 0.35)) / 0.35));
      } else if (t < 2.9) {
        // apuca manerul si deschide usa
        door = t < 2.15 ? 0 : clamp(ease.inOut((t - 2.15) / 0.75), 0, 1);
        const pull = clamp((t - 2.15) / 0.5, 0, 1);
        const h = handleAt(cx, Math.min(door, 0.55));
        p = Object.assign({}, standAt, { torso: 3 + 4 * pull, x: STOP_X - 6 * pull });
        const reach = ease.inOut(clamp((t - walkT) / 0.45, 0, 1));
        const a = Object.assign({}, p); ctx.rig.ik(a, 'armF', h[0], h[1], { extra: 8 });
        const rel = door > 0.55 ? ease.inOut(clamp((t - 2.6) / 0.3, 0, 1)) : 0;
        p = blendPose(p, a, reach * (1 - rel));
        p.handShapeF = reach > 0.7 && rel < 0.5 ? 'grip' : 'relaxed';
      } else {
        door = 1;
        // intra: soldul trece de la stat in picioare la scaun, cu capul aplecat
        const k = keyframes([
          { t: 2.9, pose: { hx: STOP_X - 6, hy: -191, torso: 7, head: -1, tF: 1, sF: -1, tB: -1, sB: -1 } },
          { t: 3.35, pose: { hx: cx - 40, hy: -186, torso: 24, head: -12, tF: 60, sF: -70, tB: -2, sB: -6 } },
          { t: 3.85, pose: { hx: cx + 2, hy: -150, torso: 30, head: -16, tF: 74, sF: -60, tB: 20, sB: -50 } },
          { t: 4.3, pose: { hx: cx + G.SEAT.x, hy: G.SEAT.y, torso: 6, head: 0, tF: 80, sF: -62, tB: 70, sB: -70 }, ease: ease.out },
          { t: 4.7, pose: { hx: cx + G.SEAT.x, hy: G.SEAT.y, torso: -7, head: 5, tF: 80, sF: -62, tB: 70, sB: -70 } }
        ], t);
        p = Object.assign({}, STAND, { x: k.hx, y: k.hy, torso: k.torso, head: k.head, thighF: k.tF, shinF: k.sF, thighB: k.tB, shinB: k.sB, footF: 6, footB: 6 });
        if (t < 3.35) { p.ground = 0; }
        inside = k.hx > cx - 30;
        if (t >= 4.3) {
          const sp = seatPose(ctx, cx, 0);
          p = blendPose(p, sp, ease.inOut(clamp((t - 4.3) / 0.4, 0, 1)));
        }
        p.uArmF = 10; p.fArmF = 30; p.uArmB = 6; p.fArmB = 30;
        if (t >= 4.7) {
          // inchide usa
          const close = ease.inOut(clamp((t - 5.0) / 0.55, 0, 1));
          door = 1 - close;
          const h = handleAt(cx, Math.max(door, 0.02), true);
          const reach = ease.inOut(clamp((t - 4.7) / 0.3, 0, 1));
          const toWheel = ease.inOut(clamp((t - 5.75) / 0.6, 0, 1));
          const a = Object.assign({}, p); ctx.rig.ik(a, 'armF', h[0], h[1], { extra: 8 });
          const w = onWheel(ctx, Object.assign({}, p), cx, 0, 0);
          p = blendPose(p, a, reach);
          if (toWheel > 0) p = blendPose(p, w, toWheel);
          p.handShapeF = reach > 0.6 ? 'grip' : 'relaxed';
          p.torso = -7 + 4 * reach * (1 - close) - 0;
        }
        p.hair = 2 + (p.torso || 0) * 0.3;
      }
      Object.assign(p, face(t, { off: 0.4 }));
      if (t > 3.2 && t < 3.9) p.eyes = 'half';
      return { bg: 'street', pose: p, car: { x: cx, door: door }, charInside: inside };
    }
  });
  def({
    id: 'drive', label: 'Conduce', group: 'Mașină', T: 6, loop: true,
    frame(t, ctx) {
      const cx = -60;
      const bob = 1.4 * sin(t * 15) + (t % 3 > 1.9 && t % 3 < 2.1 ? 4 * sin((t % 3 - 1.9) / 0.2 * Math.PI) : 0);
      const steer = 9 * sin(PI2 * t / 6) + 3 * sin(t * 2.9);
      const scroll = t * 720;
      const p = seatPose(ctx, cx, -bob, { head: 5 + (t > 3.6 && t < 4.4 ? -4 : 0), torso: -7 + steer * 0.15 });
      onWheel(ctx, p, cx, -bob, steer);
      p.hair = 1 + 1.2 * sin(t * 7);
      Object.assign(p, face(t, { period: 3.1 }));
      p.mouth = (t > 1.4 && t < 2.6) ? (['small', 'closed', 'o', 'closed'][Math.floor(t * 5) % 4]) : 'closed';
      return { bg: 'road', scroll, pose: p, car: { x: cx, y: -bob, door: 0, wheel: scroll / (PI2 * 70) * 360, steer: steer * 2.2 }, charInside: true };
    }
  });
  def({
    id: 'carExit', label: 'Coboară din mașină', group: 'Mașină', T: 7.2, loop: false,
    frame(t, ctx) {
      const cx = CAR_X;
      let p, inside = true, door = 0;
      const seated = onWheel(ctx, seatPose(ctx, cx, 0), cx, 0, 0);
      const OUT_X = cx + 10; // unde sta in picioare dupa ce coboara
      if (t < 1.4) {
        // ia mainile de pe volan, deschide usa din interior
        const off = ease.inOut(clamp((t - 0.2) / 0.4, 0, 1));
        door = ease.inOut(clamp((t - 0.75) / 0.6, 0, 1));
        const h = handleAt(cx, Math.min(door, 0.6), true);
        const a = Object.assign({}, seated); ctx.rig.ik(a, 'armF', h[0], h[1], { extra: 8 });
        a.uArmB = 6; a.fArmB = 30;
        p = blendPose(seated, a, off);
        p.handShapeF = off > 0.6 ? 'grip' : 'grip';
        p.torso = -7 + 6 * door;
      } else {
        door = 1;
        const k = keyframes([
          { t: 1.4, pose: { hx: cx + G.SEAT.x, hy: G.SEAT.y, torso: -1, head: 4, tF: 80, sF: -62, tB: 70, sB: -70 } },
          { t: 1.9, pose: { hx: cx + G.SEAT.x - 4, hy: G.SEAT.y - 4, torso: 26, head: -12, tF: 60, sF: -96, tB: 70, sB: -70 } },
          { t: 2.5, pose: { hx: cx + 4, hy: -160, torso: 32, head: -16, tF: 40, sF: -70, tB: 50, sB: -84 } },
          { t: 3.0, pose: { hx: OUT_X, hy: -191, torso: 8, head: -2, tF: 2, sF: -2, tB: -2, sB: -2 }, ease: ease.out },
          { t: 3.3, pose: { hx: OUT_X, hy: -191, torso: 2, head: -1, tF: 1, sF: -1, tB: -1, sB: -1 } }
        ], t);
        p = Object.assign({}, STAND, { x: k.hx, y: k.hy, torso: k.torso, head: k.head, thighF: k.tF, shinF: k.sF, thighB: k.tB, shinB: k.sB, footF: 4, footB: 4, uArmF: 14, fArmF: 30, uArmB: 4, fArmB: 24 });
        if (t > 2.75) { p.ground = 0; inside = false; p.y = 0; p.y = -191; }
        if (t >= 3.3 && t < 4.6) {
          // inchide usa (impinge de margine)
          const reach = ease.inOut(clamp((t - 3.3) / 0.35, 0, 1));
          const close = ease.in(clamp((t - 3.65) / 0.55, 0, 1));
          door = 1 - close;
          const h = handleAt(cx, Math.max(door, 0.3));
          const a = Object.assign({}, p); ctx.rig.ik(a, 'armF', h[0] - 4, h[1] - 8, { extra: 8 });
          const back = ease.inOut(clamp((t - 4.25) / 0.35, 0, 1));
          p = blendPose(p, a, reach * (1 - back));
          p.handShapeF = reach > 0.5 && back < 0.5 ? 'open' : 'relaxed';
          p.torso = 2 + 6 * reach * (1 - back);
          p.ground = 0;
        } else if (t >= 4.6) {
          door = 0;
          // se intoarce si pleaca spre stanga
          const T = 1.1;
          const tab = strideTable(ctx, 'walk', (tt) => walkPose(tt, T), T);
          const tw = t - 4.85;
          if (tw < 0) { p = Object.assign({}, STAND, { x: OUT_X, ground: 0, facing: -1, head: -2 }); }
          else {
            p = Object.assign(walkPose(tw, T), { x: OUT_X - strideAt(tab, tw), facing: -1 });
            if (tw < 0.3) p = blendPose(Object.assign({}, STAND, { x: OUT_X, ground: 0, facing: -1 }), p, ease.inOut(tw / 0.3));
          }
          inside = false;
        }
        if (t < 3.3) { p.hair = 2 + (p.torso || 0) * 0.3; }
      }
      Object.assign(p, face(t, { off: 2.1 }));
      return { bg: 'street', pose: p, car: { x: cx, door: door }, charInside: inside };
    }
  });

  // ================= INOT =================
  def({
    id: 'swim', label: 'Înoată (craul)', group: 'Apă', T: 1.6, loop: true,
    frame(t) {
      const T = 1.6, u = t / T, f = PI2 * u;
      const level = -200;
      const armA = (ph) => -((ph % 1 + 1) % 1) * 360;
      const elbow = (A) => { const r = -A * Math.PI / 180; return 18 + 70 * max(0, sin(r)); };
      const aF = armA(u), aB = armA(u + 0.5);
      const kick = PI2 * u * 3;
      const p = Object.assign({}, STAND, {
        x: -60, y: level + 26 + 2 * sin(f * 2), root: 86 + 2 * sin(f * 2), torso: 0,
        head: -18 + 4 * sin(f * 2), hair: 4 + 6 * sin(f * 2 + 1),
        uArmF: aF, fArmF: elbow(aF), handF: -10, uArmB: aB, fArmB: elbow(aB), handB: -10,
        thighF: 10 * sin(kick), shinF: -14 - 12 * sin(kick + 1.2), footF: -55,
        thighB: 10 * sin(kick + Math.PI), shinB: -14 - 12 * sin(kick + Math.PI + 1.2), footB: -55,
        handShapeF: 'open', handShapeB: 'open', eyes: 'half', mouth: (u % 1) > 0.55 && (u % 1) < 0.75 ? 'o' : 'closed'
      });
      // stropi cand mana intra in apa
      const splashes = [];
      for (const ph of [u, u + 0.5]) {
        const q = (ph % 1 + 1) % 1;
        if (q > 0.46 && q < 0.66) {
          const k = (q - 0.46) / 0.2;
          for (let i = 0; i < 6; i++) {
            const ang = -Math.PI / 2 + (i - 2.5) * 0.35;
            splashes.push([140 + cos(ang) * 40 * k + i * 3, level - 6 + sin(ang) * 46 * k + 60 * k * k, 4.5 - 3 * k, 1 - k]);
          }
        }
      }
      for (let i = 0; i < 5; i++) { const q = ((u * 2 + i / 5) % 1); splashes.push([-280 - q * 30 + i * 12, level - 4 - 10 * sin(q * Math.PI), 3 * (1 - q), 0.8 * (1 - q)]); }
      return { bg: 'pool', scroll: t * 260, pose: p, water: { level }, splashes };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
