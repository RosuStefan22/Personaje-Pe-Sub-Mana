// Viewer 3D pentru Alecsia (Pe Sub Mana): toon shading + contur, animatii, decoruri.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';

const q = new URLSearchParams(location.search);
const BASE = (window.ALX_BASE || 'models/');

// ---------- incarcare date (fetch sau base64 incorporat, ca sa mearga si din file://) ----------
function b64ToBuf(b64) {
  const bin = atob(b64); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}
async function loadBuf(name) {
  if (window.ALX_DATA && window.ALX_DATA[name]) return b64ToBuf(window.ALX_DATA[name]);
  const r = await fetch(BASE + name); if (!r.ok) throw new Error(name); return r.arrayBuffer();
}
async function loadJSON(name) {
  if (window.ALX_DATA && window.ALX_DATA[name]) return JSON.parse(atob(window.ALX_DATA[name]));
  const r = await fetch(BASE + name); return r.json();
}
const loader = new GLTFLoader();
const parseGLB = (buf) => new Promise((res, rej) => loader.parse(buf, '', res, rej));

// ---------- scena ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const effect = new OutlineEffect(renderer, { defaultThickness: 0.0045, defaultColor: [0.06, 0.05, 0.08], defaultAlpha: 1 });
const scene = new THREE.Scene();
scene.background = new THREE.Color('#c8c8c8');
const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 200);
camera.position.set(2.6, 1.4, 4.2);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.9, 0);
controls.enableDamping = true;

const hemi = new THREE.HemisphereLight('#ffffff', '#9a94a6', 1.5); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffffff', 1.9);
sun.position.set(2.5, 5, 3.5); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

// gradient toon in 3 trepte (stil cel-shaded ca in referinta)
const gradTex = (() => {
  const data = new Uint8Array([150, 150, 150, 255, 205, 205, 205, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
function toonify(root, opts = {}) {
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = opts.shadow !== false; o.receiveShadow = !!opts.receive;
    const conv = (m) => {
      if (m.userData && m.userData.keep) return m;
      const t = new THREE.MeshToonMaterial({
        color: m.color ? m.color.clone() : new THREE.Color('#888'), gradientMap: gradTex, map: m.map || null,
        transparent: m.transparent, opacity: m.opacity, side: m.side, emissive: m.emissive ? m.emissive.clone() : undefined
      });
      t.name = m.name;
      const noLine = /Face|Glass|Water|Light/i.test(m.name) || opts.noOutline;
      t.userData.outlineParameters = { thickness: noLine ? 0 : (opts.thickness || 0.0045), visible: !noLine };
      return t;
    };
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
    if (/Alecsia_Face/.test(o.name)) { o.castShadow = false; o.material = (Array.isArray(o.material) ? o.material : [o.material]).map(m => { m.userData.outlineParameters = { visible: false }; return m; }); if (o.material.length === 1) o.material = o.material[0]; }
  });
}

// ---------- decoruri ----------
const env = new THREE.Group(); scene.add(env);
const scrollers = [];  // {obj|tex, speed, wrap}
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 4; return t;
}
const toonMat = (color, extra = {}) => Object.assign(new THREE.MeshToonMaterial({ color, gradientMap: gradTex }), extra);
function addBox(g, size, pos, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), toonMat(color));
  m.position.set(...pos); m.castShadow = opts.shadow !== false; m.receiveShadow = true; g.add(m); return m;
}
function buildEnv(name) {
  env.clear(); scrollers.length = 0;
  const g = new THREE.Group(); env.add(g);
  scene.background = new THREE.Color('#c8c8c8'); scene.fog = null;
  if (name === 'studio') {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), toonMat('#bdbdbd'));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    const lines = canvasTex(64, 512, (c, w, h) => { c.fillStyle = '#c8c8c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#a9a9a9';[0.2, 0.44, 0.9].forEach(y => c.fillRect(0, y * h, w, 3)); });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), new THREE.MeshBasicMaterial({ map: lines }));
    wall.position.set(0, 3, -4); g.add(wall);
  } else if (name === 'street' || name === 'road') {
    scene.background = new THREE.Color(name === 'road' ? '#efc9a2' : '#c3d0e0');
    scene.fog = new THREE.Fog(scene.background, 14, 45);
    const tiles = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#a9a6b0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#8e8b96'; c.lineWidth = 4; c.strokeRect(0, 0, w, h); }, [8, 60]);
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(4, 60), toonMat('#ffffff', { map: tiles }));
    walk.rotation.x = -Math.PI / 2; walk.position.set(name === 'road' ? 3.4 : 1.4, 0.0, 0); walk.receiveShadow = true; g.add(walk);
    const asphalt = canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#4a4952'; c.fillRect(0, 0, w, h); c.fillStyle = '#e6e2d6'; c.fillRect(w / 2 - 6, 0, 12, h * 0.55); }, [1, 12]);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(7, 60), toonMat('#ffffff', { map: asphalt }));
    road.rotation.x = -Math.PI / 2; road.position.set(name === 'road' ? -1.6 : -3.1, -0.005, 0); road.receiveShadow = true; g.add(road);
    const curb = addBox(g, [0.18, 0.12, 60], [name === 'road' ? 1.45 : -0.55, 0.0, 0], '#8e8b96');
    // cladiri + copaci + stalpi (se repeta)
    const city = new THREE.Group(); g.add(city);
    const cols = ['#9c9ab4', '#8f86a8', '#a7a3bb', '#8d97ad'];
    for (let i = 0; i < 16; i++) {
      const h = 4 + ((i * 37) % 7), w = 3 + (i % 3);
      const b = addBox(city, [3, h, w], [-8.5, h / 2, -30 + i * 4], cols[i % 4]);
      b.castShadow = false;
    }
    for (let i = 0; i < 8; i++) {
      const z = -28 + i * 8;
      const px = name === 'road' ? 1.8 : 1.9;
      addBox(city, [0.08, 4, 0.08], [px, 2, z], '#4b4a57');
      addBox(city, [0.5, 0.08, 0.18], [px - 0.2, 4, z], '#e8e1b8');
      const tr = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), toonMat('#5f8f5a')); tr.position.set(-6.0, 2.4, z + 4); tr.castShadow = false; city.add(tr);
      addBox(city, [0.16, 1.8, 0.16], [-6.0, 0.9, z + 4], '#6a4e3b');
    }
    if (name === 'road') { scrollers.push({ tex: asphalt, per: 60 / 12 }, { tex: tiles, per: 60 / 60 }); scrollers.push({ obj: city, wrap: 32 }); }
    else { scrollers.push({ tex: tiles, per: 60 / 60 }, { tex: asphalt, per: 60 / 12 }, { obj: city, wrap: 32 }); }
  } else if (name === 'room') {
    scene.background = new THREE.Color('#cfc6d8');
    const wood = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#7c6a5e'; c.fillRect(0, 0, w, h); c.fillStyle = '#6f5e53'; for (let i = 0; i < 8; i++) c.fillRect(0, i * 32, w, 2); }, [6, 6]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), toonMat('#ffffff', { map: wood })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    addBox(g, [8, 3, 0.1], [0, 1.5, -1.6], '#cfc6d8', { shadow: false });
    addBox(g, [0.1, 3, 8], [-2.2, 1.5, 0], '#c4bace', { shadow: false });
    addBox(g, [1.4, 1.1, 0.04], [0.8, 1.7, -1.54], '#2f3554');
    addBox(g, [0.6, 0.8, 0.04], [-1.0, 1.6, -1.54], '#262331');
  } else if (name === 'pool') {
    scene.background = new THREE.Color('#bfe3f0');
    const tilesT = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#3c97be'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2f86ad'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); }, [10, 30]);
    const bottom = new THREE.Mesh(new THREE.PlaneGeometry(10, 30), toonMat('#ffffff', { map: tilesT })); bottom.rotation.x = -Math.PI / 2; bottom.position.y = -1.4; g.add(bottom);
    const lane = canvasTex(64, 512, (c, w, h) => { c.fillStyle = '#1c4e70'; c.fillRect(0, 0, w, h); }, [1, 1]);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 30), new THREE.MeshBasicMaterial({ color: '#1c4e70' })); stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, -1.39, 0); g.add(stripe);
    const waterTex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#4aa8d0'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(230,248,255,0.55)'; c.lineWidth = 3; for (let i = 0; i < 9; i++) { c.beginPath(); const y = Math.random() * h, x = Math.random() * w; c.moveTo(x, y); c.quadraticCurveTo(x + 20, y - 8, x + 40, y); c.stroke(); } }, [6, 18]);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(10, 30), new THREE.MeshBasicMaterial({ map: waterTex, transparent: true, opacity: 0.55, depthWrite: false, color: '#9fdcf2' }));
    water.rotation.x = -Math.PI / 2; water.position.y = 0.0; water.renderOrder = 10; water.material.userData.outlineParameters = { visible: false }; g.add(water);
    const buoys = new THREE.Group(); g.add(buoys);
    for (let i = 0; i < 60; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), toonMat(i % 2 ? '#e8e2d6' : '#d8484c')); s.position.set(-1.2, 0.0, -15 + i * 0.5); buoys.add(s); }
    scrollers.push({ tex: tilesT, per: 30 / 30 }, { tex: waterTex, per: 30 / 18 * 0.7 }, { obj: buoys, wrap: 1.0 });
  }
}

// ---------- incarcare model + recuzita ----------
let clips = [], info = {}, mixers = [], actions = {}, current = null, char = null, props = {};
const state = { t: 0, playing: q.get('paused') !== '1', speed: 1, outline: true };
const charRoot = new THREE.Group(); scene.add(charRoot);

async function init() {
  info = await loadJSON('clips.json');
  const gltf = await parseGLB(await loadBuf('alecsia.glb'));
  char = gltf.scene; toonify(char); charRoot.add(char);
  const mixer = new THREE.AnimationMixer(char); mixers.push(mixer);
  clips = gltf.animations;
  for (const c of clips) actions[c.name] = [mixer.clipAction(c)];
  for (const p of ['car', 'desk']) {
    try {
      const pg = await parseGLB(await loadBuf(p + '.glb'));
      toonify(pg.scene, { thickness: 0.003, receive: true });
      pg.scene.visible = false; scene.add(pg.scene); props[p] = pg.scene;
      const pm = new THREE.AnimationMixer(pg.scene); mixers.push(pm);
      for (const c of pg.animations) (actions[c.name] = actions[c.name] || []).push(pm.clipAction(c));
    } catch (e) { console.warn('recuzita lipsa', p, e); }
  }
  buildUI();
  select(q.get('anim') || 'Idle');
  if (q.get('t')) setTime(+q.get('t'));
  if (q.get('cam')) setCam(q.get('cam'));
  window.__v = { setTime, select, setCam, render, get clip() { return current; }, info, scene, camera, renderer };
  document.body.dataset.ready = '1';
}

function clipInfo(name) { return (info.clips || []).find(c => c.name === name) || { env: 'studio', loop: true, speed: 0 }; }
function select(name) {
  if (!actions[name]) name = Object.keys(actions)[0];
  if (!name) { buildEnv('studio'); return; }
  Object.values(actions).flat().forEach(a => a.stop());
  current = name;
  const ci = clipInfo(name);
  actions[name].forEach(a => { a.reset(); a.setLoop(ci.loop ? THREE.LoopRepeat : THREE.LoopOnce); a.clampWhenFinished = true; a.play(); });
  for (const p in props) props[p].visible = (ci.props || []).includes(p);
  buildEnv(ci.env || 'studio');
  state.t = 0;
  document.querySelectorAll('[data-clip]').forEach(b => b.classList.toggle('on', b.dataset.clip === name));
  if (!q.get('cam')) setCam(ci.cam || 'three');
  history.replaceState(null, '', '?anim=' + name);
}
function duration() { const a = actions[current]; return a ? a[0].getClip().duration : 1; }
function setTime(t) {
  state.t = t; state.playing = false;
  applyTime();
}
function applyTime() {
  if (!current) return;
  const ci = clipInfo(current), d = duration();
  let t = state.t;
  if (ci.loop) t = ((t % d) + d) % d; else t = Math.min(t, d);
  actions[current].forEach(a => { a.time = Math.min(t, a.getClip().duration); a.paused = false; });
  mixers.forEach(m => m.update(0));
  // decor in miscare pentru animatiile "pe loc"
  const dist = (ci.speed || 0) * state.t;
  for (const s of scrollers) {
    if (s.tex) s.tex.offset.y = (dist / s.per) % 1;
    if (s.obj) s.obj.position.z = ((dist % s.wrap) + s.wrap) % s.wrap;
  }
  const el = document.getElementById('time'); if (el) el.textContent = t.toFixed(2) + ' / ' + d.toFixed(2) + 's';
  const sc = document.getElementById('scrub'); if (sc && document.activeElement !== sc) sc.value = Math.round(t / d * 1000);
}
const CAMS = {
  front: [[0, 1.05, 4.6], [0, 0.88, 0]], side: [[4.6, 1.05, 0], [0, 0.88, 0]], three: [[2.8, 1.35, 3.9], [0, 0.85, 0]],
  back: [[-2.4, 1.4, -3.9], [0, 0.9, 0]], face: [[0.35, 1.6, 1.15], [0, 1.53, 0]], eye: [[0.05, 1.575, 0.42], [0, 1.555, 0]], car: [[4.4, 2.0, 4.4], [-0.6, 0.8, 0.0]],
  desk: [[3.2, 1.5, 2.6], [0, 0.85, -0.3]], pool: [[3.6, 1.6, 2.6], [0, 0.0, 0]], top: [[0.01, 6, 0.01], [0, 0, 0]]
};
function setCam(name) {
  const c = CAMS[name] || CAMS.three;
  camera.position.set(...c[0]); controls.target.set(...c[1]); controls.update();
}
function render() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  if (state.outline) effect.render(scene, camera); else renderer.render(scene, camera);
}
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (state.playing && current) {
    state.t += dt * state.speed;
    const ci = clipInfo(current);
    if (!ci.loop && state.t > duration() + 1.0) state.t = 0;
    applyTime();
  }
  controls.update(); render();
  requestAnimationFrame(loop);
}

function buildUI() {
  const list = document.getElementById('list');
  if (!list) return;
  const groups = {};
  for (const c of clips) { const ci = clipInfo(c.name); (groups[ci.group || 'Altele'] = groups[ci.group || 'Altele'] || []).push([c.name, ci]); }
  for (const g in groups) {
    const h = document.createElement('div'); h.className = 'grp'; h.textContent = g; list.appendChild(h);
    for (const [name, ci] of groups[g]) {
      const b = document.createElement('button'); b.className = 'anim'; b.dataset.clip = name;
      b.textContent = (ci.label || name) + (ci.loop ? '' : '  ▸'); b.onclick = () => { select(name); state.playing = true; }; list.appendChild(b);
    }
  }
  const play = document.getElementById('play');
  const upd = () => play.textContent = state.playing ? '⏸ Pauză' : '▶ Play';
  play.onclick = () => { state.playing = !state.playing; upd(); }; upd();
  document.getElementById('scrub').oninput = (e) => { state.playing = false; upd(); state.t = e.target.value / 1000 * duration(); applyTime(); };
  document.getElementById('speed').onchange = (e) => state.speed = +e.target.value;
  document.getElementById('outline').onchange = (e) => state.outline = e.target.checked;
  document.querySelectorAll('[data-cam]').forEach(b => b.onclick = () => setCam(b.dataset.cam));
  document.getElementById('shot').onclick = () => { render(); const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = `alecsia_${current}.png`; a.click(); };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { state.playing = !state.playing; upd(); e.preventDefault(); }
    if (e.code === 'ArrowRight') { state.playing = false; upd(); state.t += 1 / 30; applyTime(); }
    if (e.code === 'ArrowLeft') { state.playing = false; upd(); state.t = Math.max(0, state.t - 1 / 30); applyTime(); }
  });
}

init().then(() => requestAnimationFrame(loop)).catch(e => { console.error(e); document.body.dataset.error = String(e); });
