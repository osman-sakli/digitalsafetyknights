/* Knight City — an open city to walk and drive around, with jobs that each
   stop one of Glitch's tricks. Osman asked for "GTA tadında" for the kids:
   the freedom of an open city (any street, cars to borrow, a map, a radio,
   jobs when you want them) with none of the crime. Nobody gets hurt, you
   can't take a stranger's car, and every job teaches one safety move.

   The world is a 6x6 grid of blocks. Everything is placed by rule from MAP,
   so the mini-map, the traffic lanes and the colliders all come from the
   same numbers. Words live in content/story/knight-city[-xx].json. */
import * as THREE from '/assets/lib/three-0.170.0/three.module.min.js';
import { GLTFLoader } from '/assets/lib/three-0.170.0/GLTFLoader.js';

const $ = id => document.getElementById(id);
let lang = (window.DSKi18n && DSKi18n.lang) || 'en';
if (!['en', 'tr', 'es', 'fr'].includes(lang)) lang = 'en';
document.documentElement.lang = lang;
const fine = matchMedia('(pointer:fine)').matches;
const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (_m, k) => o[k]);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const hash = n => { const x = Math.sin(n * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); };
const angDiff = (a, b) => { const d = a - b; return Math.atan2(Math.sin(d), Math.cos(d)); };

/* ───────────── words ───────────── */
let ST = null;
const BUST = '?t=' + Math.floor(Date.now() / 3600000);
const storyFile = l => '/content/story/knight-city' + (l === 'en' ? '' : '-' + l) + '.json' + BUST;
const storyReady = fetch(storyFile(lang)).then(r => { if (!r.ok) throw 0; return r.json(); })
  .catch(() => fetch(storyFile('en')).then(r => r.json()))
  .then(d => { ST = d; paintWords(); })
  // what each person says when you walk up to them, chapter by chapter: its own file, so the story can grow without touching the jobs
  .then(() => fetch(storyFile(lang).replace('knight-city', 'knight-city-talk')).then(r => { if (!r.ok) throw 0; return r.json(); }).catch(() => fetch(storyFile('en').replace('knight-city', 'knight-city-talk')).then(r => r.json())).then(t => { ST.talk = t; }).catch(() => { ST.talk = { who: {}, adults: {}, kids6: [] }; }));
// which answer is right is decided here, by position, so a translation can't move it
const RIGHT = 0;
function paintWords() {
  const U = ST.ui;
  document.title = U.title + ' — Digital Safety Knights';
  $('l-title').textContent = U.title; $('t-title').textContent = U.title; $('t-tag').textContent = U.tag; $('t-how').textContent = U.how;
  $('b-start').textContent = U.start; $('b-cont').textContent = U.cont;
  $('b-arc1').textContent = U.arcade; $('t-back-l').textContent = U.back; $('t-back').setAttribute('aria-label', U.back);
  $('t-load').textContent = U.loading; $('t-nogl').textContent = U.noGL; $('b-nogl').textContent = U.noGLbtn;
  $('d-nx').textContent = U.next; $('b-phone').setAttribute('aria-label', U.phone);
  $('ph-map').textContent = U.tabMap; $('ph-jobs').textContent = U.tabJobs; $('ph-msgs').textContent = U.tabMsgs; $('ph-notes').textContent = U.tabNotes; $('ph-help').textContent = U.tabHelp; $('ph-x').textContent = U.close;
  $('e-do').textContent = U.endDo; $('b-keep').textContent = U.endKeep;
  $('sp-u').textContent = U.kmh; $('bn-retry').textContent = U.retry; $('bn-ok').textContent = U.next;
}

/* ───────────── renderer, sky, light ───────────── */
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' }); }
catch (e) { $('ov-load').hidden = true; $('ov-nogl').hidden = false; throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, fine ? 1.5 : 1.35));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfe3f5, 90, 300);
const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 900);
const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8f7a, 2); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d6, 2.2); scene.add(sun); scene.add(sun.target);
const lamp = new THREE.PointLight(0xffd9a0, 0, 26, 1.4); scene.add(lamp);   // after dark, a pool of warm light travels with you so faces can be seen
const skyC = document.createElement('canvas'); skyC.width = 4; skyC.height = 256;
const skyT = new THREE.CanvasTexture(skyC); skyT.colorSpace = THREE.SRGBColorSpace; scene.background = skyT;
function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 2, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const SOFT = glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
const sprite = (color, size, add, fog) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: fog !== false })); s.scale.set(size, size, 1); return s; };
// the day: four skies to blend between (top, middle, horizon), light and fog for each
const C = h => new THREE.Color(h);
const DAY = [
  { at: 0.00, sky: [C(0x030817), C(0x0a1740), C(0x23305f)], fog: C(0x141d3d), sun: C(0xa9bcff), sunI: 0.7, hemi: 1.35, hs: C(0x9fb2ff), hg: C(0x2a2f4a), night: 1 },
  { at: 0.22, sky: [C(0x1b2a6b), C(0x8a5fa0), C(0xffb37a)], fog: C(0xd9a08d), sun: C(0xffb27a), sunI: 1.2, hemi: 1.2, hs: C(0xffd9c2), hg: C(0x5a4a44), night: 0.45 },
  { at: 0.32, sky: [C(0x1f7ae0), C(0x66b8f5), C(0xc9ecfb)], fog: C(0xbfe3f5), sun: C(0xfff2d6), sunI: 2.2, hemi: 2.0, hs: C(0xffffff), hg: C(0x8a8f7a), night: 0 },
  { at: 0.66, sky: [C(0x1f7ae0), C(0x66b8f5), C(0xc9ecfb)], fog: C(0xbfe3f5), sun: C(0xfff2d6), sunI: 2.2, hemi: 2.0, hs: C(0xffffff), hg: C(0x8a8f7a), night: 0 },
  { at: 0.78, sky: [C(0x2a2a7a), C(0xd0559a), C(0xffa24d)], fog: C(0xe08f86), sun: C(0xff9a5a), sunI: 1.5, hemi: 1.25, hs: C(0xffc9d6), hg: C(0x4a3a4a), night: 0.5 },
  { at: 0.88, sky: [C(0x030817), C(0x0a1740), C(0x23305f)], fog: C(0x141d3d), sun: C(0xa9bcff), sunI: 0.7, hemi: 1.35, hs: C(0x9fb2ff), hg: C(0x2a2f4a), night: 1 },
  { at: 1.00, sky: [C(0x030817), C(0x0a1740), C(0x23305f)], fog: C(0x141d3d), sun: C(0xa9bcff), sunI: 0.7, hemi: 1.35, hs: C(0x9fb2ff), hg: C(0x2a2f4a), night: 1 }
];
const skyMix = [C(0), C(0), C(0)], env = { night: 0, key: -1 };
const sunDisc = sprite(0xfff3c4, 120, true, false), stars = (() => {
  const n = 420, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, el = 0.12 + Math.random() * 1.3, r = 700; pos[i * 3] = Math.cos(a) * Math.cos(el) * r; pos[i * 3 + 1] = Math.sin(el) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(el) * r; }
  const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(ge, new THREE.PointsMaterial({ color: 0xfff6e0, size: 2.2, fog: false, transparent: true, opacity: 0, sizeAttenuation: false }));
})();
scene.add(sunDisc, stars);
const clouds = [];
for (let i = 0; i < 16; i++) { const s = sprite(0xffffff, 1, false, false); const w = rnd(120, 220); s.scale.set(w, w * 0.36, 1); s.material.opacity = 0.75; s.position.set(rnd(-700, 700), rnd(150, 240), rnd(-700, 700)); scene.add(s); clouds.push(s); }
const litMats = [];   // building materials that glow a little at night
function paintDay(tod) {
  let i = 0; while (i < DAY.length - 2 && tod >= DAY[i + 1].at) i++;
  const A = DAY[i], B = DAY[i + 1], k = clamp((tod - A.at) / (B.at - A.at), 0, 1), L = (a, b) => a + (b - a) * k;
  env.night = L(A.night, B.night);
  const ang = (tod - 0.25) * Math.PI * 2, sx = Math.cos(ang), sy = Math.sin(ang);
  const up = env.night > 0.9 ? 0.6 : Math.max(0.25, sy);
  sun.position.set(camera.position.x + sx * 60, up * 90, camera.position.z + 40); sun.target.position.set(camera.position.x, 0, camera.position.z);
  sunDisc.position.set(camera.position.x + sx * 600, sy * 420 + 30, camera.position.z + 380); sunDisc.material.opacity = clamp(sy * 3 + 0.4, 0, 1);
  stars.position.copy(camera.position); stars.material.opacity = clamp(env.night * 1.4 - 0.4, 0, 1);
  const key = Math.round(tod * 600); if (key === env.key) return; env.key = key;
  scene.fog.color.lerpColors(A.fog, B.fog, k); scene.fog.near = L(90, 90) - env.night * 30; scene.fog.far = 300 - env.night * 70;
  hemi.color.lerpColors(A.hs, B.hs, k); hemi.groundColor.lerpColors(A.hg, B.hg, k); hemi.intensity = L(A.hemi, B.hemi);
  sun.color.lerpColors(A.sun, B.sun, k); sun.intensity = L(A.sunI, B.sunI);
  skyMix.forEach((c, j) => c.lerpColors(A.sky[j], B.sky[j], k));
  const x = skyC.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#' + skyMix[0].getHexString()); gr.addColorStop(0.42, '#' + skyMix[1].getHexString()); gr.addColorStop(0.62, '#' + skyMix[2].getHexString()); gr.addColorStop(1, '#' + skyMix[2].getHexString());
  x.fillStyle = gr; x.fillRect(0, 0, 4, 256); skyT.needsUpdate = true;
  for (const m of litMats) m.emissiveIntensity = env.night * 0.42;
  for (const c of clouds) c.material.color.copy(skyMix[2]).lerp(C(0xffffff), 1 - env.night * 0.85);
}

/* ───────────── loading ───────────── */
const manager = new THREE.LoadingManager();
manager.onProgress = (_u, d, t) => { $('ld').style.width = Math.round(d / t * 100) + '%'; };
let loadFailed = false;
manager.onError = () => { loadFailed = true; };
const gl = new GLTFLoader(manager), tl = new THREE.TextureLoader(manager);
const A = '/assets/arcade3d/', M = {};
function tiled(name, rx, ry) { const t = tl.load(A + 'tex-' + name + '.webp'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; }
// every model: which way its front points as generated (turned here so front = +z), and whether it is a building
const Q = Math.PI / 2, YAW = { 'car-taxi': -Q, 'car-pickup': Math.PI, 'b-house': Math.PI, 'b-school': -Q, 'b-cafe': -Q, 'b-library': Math.PI, ramp: -Q / 2, streetlamp: Math.PI };
const NAMES = ['shieldy', 'glitch', 'bot', 'pixel', 'dame', 'sprout', 'citizen-a', 'citizen-b', 'citizen-c', 'citizen-d', 'shield',
  'car-hero', 'car-sedan', 'car-hatch', 'car-pickup', 'car-taxi', 'car-bus', 'car-van', 'car-glitch',
  'b-glass', 'b-deco', 'b-office', 'b-apart', 'b-apart2', 'b-house', 'b-house2', 'b-house3', 'b-shop', 'b-cafe', 'b-arcade', 'b-library', 'b-school', 'b-hq',
  'palm', 'citytree', 'streetlamp', 'trafficlight', 'bench', 'hydrant', 'ramp', 'kiosk', 'drone', 'parasol', 'boat', 'fountain', 'flowers',
  'citizen-e', 'citizen-f', 'citizen-g', 'citizen-h', 'antenna', 'stage', 'polaroid', 'lighthouse', 'coin', 'crystal'];
function prep(gltf, name) {
  const root = gltf.scene, building = name.startsWith('b-');
  root.traverse(o => { if (!o.isMesh) return; o.geometry.computeVertexNormals(); const map = o.material.map; if (map) map.colorSpace = THREE.SRGBColorSpace;
    o.material = new THREE.MeshStandardMaterial({ map, roughness: name.startsWith('car-') ? 0.38 : 0.7, metalness: name.startsWith('car-') ? 0.25 : 0.05, color: name === 'shieldy' ? 0xffdf85 : 0xffffff });
    if (building) { o.material.emissiveMap = map; o.material.emissive = new THREE.Color(0xffe2b0); o.material.emissiveIntensity = 0; litMats.push(o.material); } });
  root.rotation.y = YAW[name] || 0;
  let b = new THREE.Box3().setFromObject(root); const sz = b.getSize(new THREE.Vector3()), s = 1 / sz.y;
  root.scale.setScalar(s); b = new THREE.Box3().setFromObject(root); const c = b.getCenter(new THREE.Vector3());
  root.position.set(-c.x, -b.min.y, -c.z);
  const g = new THREE.Group(); g.add(root); g.userData.size = { x: sz.x * s, z: sz.z * s }; return g;
}
NAMES.forEach(n => gl.load(A + n + '.glb', g => { M[n] = prep(g, n); }));
const TEX = {};

/* ───────────── the city plan ───────────── */
const PITCH = 60, NB = 6, ROAD = 12, HB = (PITCH - ROAD) / 2, EDGE = PITCH * NB / 2, SLAB = 0.2;
const roadC = k => -EDGE + k * PITCH, blockC = i => -EDGE + PITCH / 2 + i * PITCH;
// rows north to south; h houses, a flats, o office, g glass tower, d deco tower, m shops, p park, s school, l library, q Knight HQ, r arcade, t beach hotel
const MAP = ['hhsphh', 'haalah', 'aogomh', 'mdgoaq', 'hadrma', 'tmttmt'];
const PLACE = { hq: [5, 3], library: [4, 1], school: [2, 0], park: [3, 0], arcade: [3, 4], home: [5, 0], cafe: [1, 5], tower: [2, 2], rose: [0, 1], nova: [0, 2] };
const SOUTH = EDGE + 6, SAND = SOUTH + 46, PIER = SAND + 30, LIM = EDGE + 12;
const blocks = [];   // { i, j, x, z, type, group, rects: [], circles: [] }
const blockAt = (x, z) => { const i = Math.floor((x + EDGE) / PITCH), j = Math.floor((z + EDGE) / PITCH); return i >= 0 && i < NB && j >= 0 && j < NB ? blocks[j * NB + i] : null; };
const onSlab = (x, z) => { if (Math.abs(x) > LIM - 6 + 6 || z < -LIM) return false; const i = Math.floor((x + EDGE) / PITCH), j = Math.floor((z + EDGE) / PITCH); if (i < 0 || i >= NB || j < 0 || j >= NB) return Math.abs(x) > EDGE + 6 || z < -EDGE - 6 || (z > EDGE + 6 && z < SOUTH + 6); return Math.abs(x - blockC(i)) < HB && Math.abs(z - blockC(j)) < HB; };
const groundY = (x, z) => onSlab(x, z) ? SLAB : 0;
const extra = { rects: [], circles: [] };   // things outside the blocks (beach, pier)
const world = new THREE.Group(); scene.add(world);
const far = [];   // { o, x, z, r } things hidden when far away or behind the camera

function place(name, x, z, opt, yaw, parent) {
  const o = M[name].clone(), sz = M[name].userData.size;
  let s = opt.h || 1; if (opt.fit) s = opt.fit / Math.max(sz.x, sz.z);
  o.scale.setScalar(s); if (opt.minH && s < opt.minH) o.scale.y = Math.min(opt.minH, s * 1.7);
  o.position.set(x, opt.y || 0, z); o.rotation.y = yaw || 0;
  const q = Math.abs(Math.round((yaw || 0) / (Math.PI / 2))) % 2;
  o.userData.half = { x: (q ? sz.z : sz.x) * s / 2, z: (q ? sz.x : sz.z) * s / 2 }; o.userData.top = o.scale.y;
  (parent || world).add(o); return o;
}
function flat(w, l, map, x, z, y, parent, color) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshStandardMaterial({ map: map || null, color: color || 0xffffff, roughness: 0.95 })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); (parent || world).add(m); return m; }

const parkSpots = [];   // where borrowable cars stand
const beaconSpots = {}; // job start points and named places, world coordinates
function buildCity() {
  TEX.asphalt = tiled('asphalt', 62, 62); TEX.water = tiled('water', 70, 70);
  // sea, road surface, beach, pier
  const sea = flat(2400, 2400, TEX.water, 0, 0, -0.7); sea.material.roughness = 0.25; sea.material.metalness = 0.1;
  flat(EDGE * 2 + 12, EDGE * 2 + 12, TEX.asphalt, 0, 0, 0);
  const paveM = new THREE.MeshStandardMaterial({ map: tiled('pavers', 20, 20), roughness: 0.9 }), sideM = new THREE.MeshStandardMaterial({ color: 0xb9b3a6, roughness: 0.95 });
  const slabG = new THREE.BoxGeometry(HB * 2, 1.2, HB * 2);
  const box = (w, h, d, mats, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats); m.position.set(x, y, z); world.add(m); return m; };
  const ringM = [sideM, sideM, new THREE.MeshStandardMaterial({ map: tiled('pavers', 60, 2), roughness: 0.9 }), sideM, sideM, sideM];
  box(EDGE * 2 + 24, 1.2, 6, ringM, 0, SLAB - 0.6, -EDGE - 9); box(EDGE * 2 + 24, 1.2, 6, ringM, 0, SLAB - 0.6, EDGE + 9);
  const ringV = [sideM, sideM, new THREE.MeshStandardMaterial({ map: tiled('pavers', 2, 60), roughness: 0.9 }), sideM, sideM, sideM];
  box(6, 1.2, EDGE * 2 + 12, ringV, -EDGE - 9, SLAB - 0.6, 0); box(6, 1.2, EDGE * 2 + 12, ringV, EDGE + 9, SLAB - 0.6, 0);
  const sandM = new THREE.MeshStandardMaterial({ map: tiled('sand', 40, 5), roughness: 1 });
  box(EDGE * 2 + 24, 1.2, SAND - SOUTH - 6, [sandM, sandM, sandM, sandM, sandM, sandM], 0, -0.55, (SAND + SOUTH + 6) / 2);
  const plankM = new THREE.MeshStandardMaterial({ map: tiled('planks', 2, 8), roughness: 0.85 });
  box(11, 1.2, PIER - SAND + 4, [plankM, plankM, plankM, plankM, plankM, plankM], 0, SLAB - 0.6, (PIER + SAND) / 2 - 2);
  // road paint: one instanced strip mesh for every dash and stop line
  const marks = [];
  for (let k = 0; k <= NB; k++) for (let s = 0; s < NB; s++) for (let d = 0; d < 7; d++) {
    const a = roadC(s) + 9 + d * 6.2; marks.push([roadC(k), a + 1.6, 0.28, 3.2, 0xf2c94c], [a + 1.6, roadC(k), 3.2, 0.28, 0xf2c94c]);
  }
  for (let k = 0; k <= NB; k++) for (let l = 0; l <= NB; l++) { const x = roadC(k), z = roadC(l);
    if (l > 0) marks.push([x + 3, z - 7.2, 5.4, 0.5, 0xffffff]); if (l < NB) marks.push([x - 3, z + 7.2, 5.4, 0.5, 0xffffff]);
    if (k > 0) marks.push([x - 7.2, z - 3, 0.5, 5.4, 0xffffff]); if (k < NB) marks.push([x + 7.2, z + 3, 0.5, 5.4, 0xffffff]); }
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), marks.length), d4 = new THREE.Object3D(), col = new THREE.Color();
  marks.forEach(([x, z, w, l, c], n) => { d4.position.set(x, 0.02, z); d4.rotation.x = -Math.PI / 2; d4.scale.set(w, l, 1); d4.updateMatrix(); im.setMatrixAt(n, d4.matrix); im.setColorAt(n, col.set(c)); });
  im.frustumCulled = false; world.add(im);

  const grassT = () => tiled('grass', 8, 8), plazaT = () => tiled('plaza', 6, 6);
  for (let j = 0; j < NB; j++) for (let i = 0; i < NB; i++) {
    const type = MAP[j][i], bx = blockC(i), bz = blockC(j), n = j * NB + i, g = new THREE.Group();
    g.position.set(bx, 0, bz); world.add(g);
    const B = { i, j, x: bx, z: bz, type, group: g, rects: [], circles: [] }; blocks.push(B);
    const slab = new THREE.Mesh(slabG, [sideM, sideM, paveM, sideM, sideM, sideM]); slab.position.set(bx, SLAB - 0.6, bz); world.add(slab);
    const Y = SLAB + 0.01;
    const bld = (name, x, z, fit, yaw, minH) => { const o = place(name, x, z, { fit, minH, y: SLAB }, yaw, g), h = o.userData.half; B.rects.push({ x0: bx + x - h.x * 0.92, x1: bx + x + h.x * 0.92, z0: bz + z - h.z * 0.92, z1: bz + z + h.z * 0.92 }); return o; };
    const thing = (name, x, z, h, r, yaw) => { const o = place(name, x, z, { h, y: SLAB }, yaw === undefined ? hash(n * 7 + x + z) * 6.28 : yaw, g); if (r) B.circles.push({ x: bx + x, z: bz + z, r }); return o; };
    const outYaw = (x, z) => Math.abs(z) >= Math.abs(x) ? (z > 0 ? 0 : Math.PI) : (x > 0 ? Math.PI / 2 : -Math.PI / 2);
    const tree = type === 't' ? 'palm' : 'citytree', th = type === 't' ? 10 : 6;
    if (type === 'h') { flat(40, 40, grassT(), 0, 0, Y, g); const hs = ['b-house', 'b-house2', 'b-house3'];
      [[-12, -12], [12, -12], [-12, 12], [12, 12]].forEach(([x, z], k) => bld(hs[Math.floor(hash(n * 5 + k) * 3)], x, z, 15, z > 0 ? 0 : Math.PI));
      thing(tree, 0, -4, th, 0.5); thing(tree, 0, 6, th * 0.85, 0.5); }
    else if (type === 'a') { flat(40, 40, plazaT(), 0, 0, Y, g); bld(hash(n) > 0.5 ? 'b-apart' : 'b-apart2', -11.5, 0, 19, -Math.PI / 2, 20); bld(hash(n + 3) > 0.5 ? 'b-apart2' : 'b-apart', 11.5, 0, 19, Math.PI / 2, 20); }
    else if (type === 'o' || type === 'g') { flat(44, 44, plazaT(), 0, 0, Y, g); const o = type === 'o' ? bld('b-office', 0, 0, 26, 0, 52) : bld('b-glass', 0, 0, 24, 0, i === PLACE.tower[0] && j === PLACE.tower[1] ? 84 : 62);
      [[-18, 18], [18, 18], [-18, -18], [18, -18]].forEach(([x, z]) => thing('citytree', x, z, 5.5, 0.5)); thing('bench', -8, 20, 1, 0, 0); thing('bench', 8, 20, 1, 0, 0);
      if (i === PLACE.tower[0] && j === PLACE.tower[1]) { const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 5, 160, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); beam.position.set(bx, 150, bz); scene.add(beam); tower = { obj: o, beam, x: bx, z: bz }; o.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.emissive = new THREE.Color(0xb46bff); litMats.push(m.material); } }); } }
    else if (type === 'd') { bld('b-deco', 0, -2, 26, 0, 40); thing('palm', -17, 17, 9, 0.5); thing('palm', 17, 17, 10, 0.5); }
    else if (type === 'm') { flat(40, 40, plazaT(), 0, 0, Y, g); [[-12, -12, 'b-shop'], [12, -12, 'b-cafe'], [-12, 12, 'b-cafe'], [12, 12, 'b-shop']].forEach(([x, z, nm]) => bld(nm, x, z, 16, z > 0 ? 0 : Math.PI)); thing('bench', 0, 0, 1, 0, 0); thing(tree, 0, -4, th, 0.5); }
    else if (type === 'p') { flat(44, 44, grassT(), 0, 0, Y, g); const f = place('fountain', 0, 0, { fit: 9, y: SLAB }, 0, g); B.circles.push({ x: bx, z: bz, r: 4.6 }); B.fountain = f;
      for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; thing('citytree', Math.cos(a) * 18, Math.sin(a) * 18, 5.5 + hash(n + k) * 2.5, 0.5); }
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.78; thing('bench', Math.cos(a) * 8.5, Math.sin(a) * 8.5, 1, 0, -a + Math.PI / 2 + Math.PI); thing('flowers', Math.cos(a + 0.78) * 11, Math.sin(a + 0.78) * 11, 0.9, 1.1); } }
    else if (type === 's') { bld('b-school', 0, -4, 30, 0, 14); thing(tree, -18, 16, th, 0.5); thing(tree, 18, 16, th, 0.5); }
    else if (type === 'l') { bld('b-library', 0, -4, 30, 0, 15); thing(tree, -18, 17, th, 0.5); thing(tree, 18, 17, th, 0.5); }
    else if (type === 'q') { bld('b-hq', 0, -9, 24, 0, 13); flat(40, 16, TEX.asphalt.clone(), 0, 14, Y, g).material.map.repeat.set(7, 3); }
    else if (type === 'r') { bld('b-arcade', -7, -7, 24, 0, 13); bld('b-cafe', 14, 13, 14, 0); thing(tree, -17, 16, th, 0.5); }
    else if (type === 't') { flat(40, 40, plazaT(), 0, 0, Y, g); bld('b-deco', 0, -3, 24, 0, 34); thing('palm', -17, 15, 10, 0.5); thing('palm', 17, 15, 9, 0.5); thing('palm', -17, -15, 9, 0.5); thing('palm', 17, -15, 10, 0.5); thing('parasol', 9, 17, 2.3, 0.9); }
    // street things on every block
    [[-21.6, -21.6], [21.6, 21.6]].forEach(([x, z], k) => { const o = thing('streetlamp', x, z, 5.6, 0.3, k ? Math.PI * 0.25 : -Math.PI * 0.75); const h = sprite(0xffe2a0, 5, true); h.position.set(0, 0.76, 0.2); h.scale.set(0.9, 0.9, 1); o.add(h); lampGlows.push(h); });
    thing('trafficlight', 22.2, 22.2, 5, 0.25, Math.PI / 4);
    if (hash(n * 13) > 0.5) thing('hydrant', -21.5, 12, 0.9, 0); if (hash(n * 17) > 0.6) thing('bench', 8, 21.4, 1, 0, 0);
    if ('ham'.includes(type) && type !== 'q') { thing(tree, -21, 0, th, 0.5); thing(tree, 21, -6, th * 0.9, 0.5); }
    far.push({ o: g, x: bx, z: bz, r: 44 });
    if ((i + j * 2) % 3 === 0 && type !== 'p' && type !== 'q') parkSpots.push({ x: bx + (type === 'h' ? 0 : 21), z: bz + (type === 'h' ? 21 : 13), h: type === 'h' ? Math.PI / 2 : 0 });
  }
  const P = (k, dx, dz) => { const [i, j] = PLACE[k]; return { x: blockC(i) + dx, z: blockC(j) + dz }; };
  Object.assign(beaconSpots, { hq: P('hq', 6, 21), library: P('library', 0, 21), school: P('school', 0, 21), park: P('park', 0, 21), arcade: P('arcade', -7, 21), home: P('home', 12, -21.4), pier: { x: 0, z: PIER - 8 }, cafe: P('cafe', 0, -21), tower: P('tower', 0, 21), rose: P('rose', 12, 21.4), nova: P('nova', 0, 21),
    beach: { x: 44, z: SOUTH + 18 }, light: { x: -150, z: SAND - 12 } });
  // the beach: palms, parasols, boats, ramps
  const beach = new THREE.Group(); world.add(beach);
  for (let k = 0; k < 26; k++) { const x = -EDGE + 8 + k * 14.2 + hash(k) * 5, z = SOUTH + 9 + hash(k + 40) * 8; if (Math.abs(x) < 9 || Math.abs(x - 44) < 13) continue; place('palm', x, z, { h: 9 + hash(k + 9) * 3 }, hash(k) * 6, beach); extra.circles.push({ x, z, r: 0.5 }); }
  for (let k = 0; k < 14; k++) { const x = -EDGE + 20 + k * 26 + hash(k + 70) * 8, z = SAND - 9 - hash(k + 5) * 6; if (Math.abs(x) < 12) continue; place('parasol', x, z, { h: 2.4 }, hash(k) * 6, beach); extra.circles.push({ x, z, r: 1 }); }
  [[-22, PIER - 12, 0.4], [20, PIER - 4, 2.2], [-60, SAND + 16, 1.2], [95, SAND + 20, 4]].forEach(([x, z, r]) => { const o = place('boat', x, z, { h: 2.2, y: -0.75 }, r, beach); boats.push(o); });
  for (let k = 0; k < 9; k++) { const z = SAND + 4 + k * 3.2; [-5.6, 5.6].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 })); p.position.set(x, SLAB + 0.5, z); beach.add(p); if (k % 2 === 0) { const h = sprite(0xffd890, 2.6, true); h.position.set(x, SLAB + 1.5, z); beach.add(h); lampGlows.push(h); } }); }
  [[-120, 0], [-55, Math.PI], [70, 0], [135, Math.PI]].forEach(([x, dir]) => { const z = SOUTH + 26; place('ramp', x, z, { fit: 7 }, dir ? -Math.PI / 2 : Math.PI / 2, beach); ramps.push({ x, z, dir: dir ? -1 : 1 }); });
  { const o = place('stage', 44, SOUTH + 30, { fit: 15 }, Math.PI, beach), h = o.userData.half; extra.rects.push({ x0: 44 - h.x * 0.9, x1: 44 + h.x * 0.9, z0: SOUTH + 30 - h.z * 0.5, z1: SOUTH + 30 + h.z * 0.9 }); }
  { place('lighthouse', -158, SAND - 9, { h: 22 }, 0, beach); extra.circles.push({ x: -158, z: SAND - 9, r: 4 }); const b = sprite(0xfff0b0, 14, true, false); b.position.set(-158, 19, SAND - 9); beach.add(b); lampGlows.push(b); }
  far.push({ o: beach, x: 0, z: SAND, r: 400 });
}
const lampGlows = [], boats = [], ramps = [];

/* ───────────── state ───────────── */
const SAVE = 'dsk_city_save';
const g = { mode: 'loading', t: 0, tod: 0.36, busy: null, car: null, pts: 0, done: [], badges: [], msgs: [], shards: [], trust: 5, ending: null, job: null, toastT: 0, camYaw: Math.PI, camOff: 0, camHold: 0, shake: 0, near: null, msgT: 70, msgReady: false, frame: 0, carefulT: 0, radio: 1 };
const pl = { x: 0, z: 0, y: SLAB, vy: 0, h: 0, phase: 0, obj: null, moving: false };
const cars = [], peds = [], kiosks = [], drones = [], badgeObjs = [], beams = [], sparks = [];
const keys = {}, joy = { on: false, id: -1, x0: 0, y0: 0, x: 0, y: 0 }, look = { id: -1, x: 0 };
function load() { try { const d = JSON.parse(localStorage.getItem(SAVE) || 'null'); if (d && d.v === 2 && Array.isArray(d.done)) return d; } catch (e) {} return null; }
function save() { try { localStorage.setItem(SAVE, JSON.stringify({ v: 2, done: g.done, badges: g.badges, msgs: g.msgs, shards: g.shards, trust: g.trust, ending: g.ending, pts: g.pts })); } catch (e) {} }

/* ───────────── sound: effects, engine, radio ───────────── */
let snd = true, music = true, ac = null, eng = null, radioTimer = null;
try { snd = localStorage.getItem('dsk_city_snd') !== '0'; music = localStorage.getItem('dsk_city_mus') !== '0'; } catch (e) {}
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') ac.resume(); return ac; }
function tone(freqs, dur, type, vol, when) {
  if (!snd || !ac) return;
  try { const t0 = (when || ac.currentTime), o = ac.createOscillator(), gn = ac.createGain(); o.type = type || 'triangle';
    freqs.forEach((f, i) => o.frequency.setValueAtTime(f, t0 + i * dur / freqs.length)); gn.gain.setValueAtTime(vol || 0.1, t0); gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(gn); gn.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02); } catch (e) {}
}
function noise(dur, freq, vol, when, type) {
  if (!ac) return;
  try { const n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain(); s.buffer = buf; f.type = type || 'lowpass'; f.frequency.value = freq; gn.gain.value = vol; s.connect(f); f.connect(gn); gn.connect(ac.destination); s.start(when || ac.currentTime); } catch (e) {}
}
const buzz = p => { if (snd && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } };
const SFX = { good: () => tone([523, 659, 784, 1047], 0.4, 'triangle', 0.11), bad: () => tone([300, 220], 0.35, 'sawtooth', 0.06), talk: () => tone([520, 620], 0.1, 'sine', 0.05), pick: () => tone([784, 1047, 1319], 0.26, 'triangle', 0.09),
  door: () => { if (snd) noise(0.12, 500, 0.25); }, bump: () => { if (snd) noise(0.25, 220, 0.5); }, horn: () => tone([392, 392], 0.35, 'square', 0.06), win: () => tone([523, 659, 784, 1047, 1319, 1568], 0.9, 'triangle', 0.12), tick: () => tone([880], 0.06, 'square', 0.04),
  zap: () => tone([1200, 600, 300, 150], 0.4, 'sawtooth', 0.07), phone: () => tone([988, 1319, 988, 1319], 0.5, 'sine', 0.08) };
function engine(v, on) {
  if (!ac) return;
  if (!eng) { try { const o = ac.createOscillator(), f = ac.createBiquadFilter(), gn = ac.createGain(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 420; gn.gain.value = 0; o.connect(f); f.connect(gn); gn.connect(ac.destination); o.start(); eng = { o, gn }; } catch (e) { return; } }
  eng.o.frequency.setTargetAtTime(48 + Math.abs(v) * 3.6, ac.currentTime, 0.08); eng.gn.gain.setTargetAtTime(on && snd ? 0.028 : 0, ac.currentTime, 0.1);
}
// three little radio stations, made of notes: no files, nothing to download
const RADIO = [null,
  { bpm: 118, bass: 'triangle', lead: 'square', prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [5, 9, 12]], root: 48, mel: [12, 16, 19, 16, 24, 19, 16, 19], vol: 1 },
  { bpm: 92, bass: 'sine', lead: 'triangle', prog: [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]], root: 45, mel: [19, 0, 16, 0, 14, 12, 0, 14], vol: 0.9 },
  { bpm: 104, bass: 'sawtooth', lead: 'triangle', prog: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]], root: 45, mel: [12, 0, 15, 12, 19, 0, 17, 15], vol: 0.8 }];
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
let rStep = 0, rNext = 0;
function radioTick() {
  const S = RADIO[g.radio]; if (!S || !ac || !music || !snd || !g.car || g.mode !== 'play') { rNext = 0; return; }
  const sp = 60 / S.bpm / 2; if (!rNext || rNext < ac.currentTime) rNext = ac.currentTime + 0.05;
  while (rNext < ac.currentTime + 0.25) {
    const st = rStep % 32, ch = S.prog[Math.floor(st / 8) % 4], v = S.vol * 0.5;
    if (st % 4 === 0) { tone([hz(S.root - 12 + ch[0])], sp * 3.4, S.bass, 0.075 * v, rNext); tone([150, 50], 0.14, 'sine', 0.16 * v, rNext); }
    if (st % 4 === 2) noise(0.09, 1800, 0.07 * v, rNext, 'highpass');
    if (st % 2 === 1) noise(0.03, 6000, 0.035 * v, rNext, 'highpass');
    if (st % 8 === 0) ch.forEach(n => tone([hz(S.root + 12 + n)], sp * 7, 'triangle', 0.022 * v, rNext));
    const m = S.mel[(st + Math.floor(st / 16) * 3) % 8]; if (m && st % 2 === 0) tone([hz(S.root + 12 + m + (ch[0] % 12 === 5 ? 5 : ch[0] % 12 === 7 ? 7 : 0))], sp * 1.6, S.lead, 0.02 * v, rNext);
    rNext += sp; rStep++;
  }
}

/* ───────────── little helpers ───────────── */
function toast(text, sec) { const t = $('toast'); t.firstChild.textContent = text; t.style.opacity = 1; g.toastT = sec || 2.6; }
function burst(x, y, z, n, color) {
  let k = 0; for (const p of sparks) { if (p.t > 0) continue; p.s.material.color.set(color); p.s.position.set(x, y, z); p.v.set(rnd(-4, 4), rnd(3, 8), rnd(-4, 4)); p.t = rnd(0.5, 1); p.s.visible = true; if (++k >= n) break; }
}
function addPts(n) { g.pts += n; $('h-pts').textContent = g.pts; save(); }
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const me = () => g.car || pl;

/* ───────────── bumping into the city ───────────── */
function pushOut(p, r) {   // p has x, z; returns true when something solid was touched
  let hit = false;
  const lists = [extra]; const B = blockAt(p.x, p.z); if (B) lists.push(B);
  for (const L of lists) {
    for (const q of L.rects) { const cx = clamp(p.x, q.x0, q.x1), cz = clamp(p.z, q.z0, q.z1); let dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d >= r) continue; hit = true;
      if (d > 0.0001) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
      else { const a = [p.x - q.x0, q.x1 - p.x, p.z - q.z0, q.z1 - p.z], m = Math.min(...a); if (m === a[0]) p.x = q.x0 - r; else if (m === a[1]) p.x = q.x1 + r; else if (m === a[2]) p.z = q.z0 - r; else p.z = q.z1 + r; } }
    for (const q of L.circles) { const dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz), rr = r + q.r; if (d < rr && d > 0.0001) { p.x = q.x + dx / d * rr; p.z = q.z + dz / d * rr; hit = true; } }
  }
  // the edge of the island: sea wall on three sides, the beach and the pier to the south
  const lim = LIM - r; if (p.x < -lim) { p.x = -lim; hit = true; } if (p.x > lim) { p.x = lim; hit = true; } if (p.z < -lim) { p.z = -lim; hit = true; }
  if (p.z > SAND - r) { if (Math.abs(p.x) < 4.8) { const e = 5.2 - Math.min(r, 1.3); if (p.z > PIER - 2 - r) { p.z = PIER - 2 - r; hit = true; } if (p.z > SAND) p.x = clamp(p.x, -e, e); } else { p.z = SAND - r; hit = true; } }
  return hit;
}

/* ───────────── vehicles ───────────── */
const SPEC = {
  'car-hero': { len: 4.8, top: 36, acc: 19, turn: 2.5 }, 'car-sedan': { len: 4.6, top: 27, acc: 13, turn: 2.2 }, 'car-hatch': { len: 4.1, top: 25, acc: 13, turn: 2.5 },
  'car-pickup': { len: 5, top: 25, acc: 12, turn: 2.1 }, 'car-taxi': { len: 4.6, top: 28, acc: 14, turn: 2.2 }, 'car-bus': { len: 9.5, top: 19, acc: 8, turn: 1.35 },
  'car-van': { len: 5.4, top: 24, acc: 11, turn: 2 }, 'car-glitch': { len: 4.8, top: 34, acc: 18, turn: 2.4 }
};
function makeCar(name, x, z, h, kind) {
  const spec = SPEC[name], obj = place(name, x, z, { fit: spec.len }, h);
  const c = { name, spec, obj, x, z, y: groundY(x, z), vy: 0, h, vf: 0, vl: 0, kind, r: Math.max(1, M[name].userData.size.x * obj.scale.x / 2), half: spec.len / 2, steer: 0, air: 0, ai: null, stop: 0, honk: 0 };
  // lights: two warm at the front, two red at the back, lit after dark
  c.lights = [[0.62, 0.42, 1, 0xfff0c0, 1.7], [-0.62, 0.42, 1, 0xfff0c0, 1.7], [0.62, 0.42, -1, 0xff2a2a, 1], [-0.62, 0.42, -1, 0xff2a2a, 1]].map(([lx, ly, lz, col, s]) => { const sp = sprite(col, s, true); sp.position.set(lx * c.r, ly * spec.len / 4.6 + 0.25, lz * (c.half - 0.1)); sp.scale.set(s / obj.scale.x, s / obj.scale.x, 1); sp.position.divideScalar(obj.scale.x); obj.add(sp); return sp; });
  { const beam = new THREE.Mesh(new THREE.PlaneGeometry(6, 13), new THREE.MeshBasicMaterial({ map: SOFT, color: 0xfff0c0, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.12, c.half + 5.5).divideScalar(obj.scale.x); beam.scale.setScalar(1 / obj.scale.x); obj.add(beam); c.beam = beam; }
  if (kind === 'share') { const m = M.shield.clone(); m.scale.setScalar(0.9 / obj.scale.x); m.position.y = (obj.scale.y + 1) / obj.scale.x; obj.add(m); c.badge = m; }
  cars.push(c); return c;
}
const DV = [[0, -1], [1, 0], [0, 1], [-1, 0]], HD = [Math.PI, Math.PI / 2, 0, -Math.PI / 2];
const nodeOwner = {};
const lanePt = (k, l, d, s, off) => { const [dx, dz] = DV[d]; return { x: roadC(k) + dx * s - dz * off, z: roadC(l) + dz * s + dx * off }; };
const okDir = (k, l, d) => { const nk = k + DV[d][0], nl = l + DV[d][1]; return nk >= 0 && nk <= NB && nl >= 0 && nl <= NB; };
function aiPlace(c, k, l, d, s) { c.ai.k = k; c.ai.l = l; c.ai.d = d; c.ai.s = s; c.ai.turn = null; const p = lanePt(k, l, d, s, c.ai.off); c.x = p.x; c.z = p.z; c.h = HD[d]; }
function aiSpawn(c, near, lo, hi) {   // put an AI car on a random stretch of road, lo..hi metres from a point
  for (const k in nodeOwner) if (nodeOwner[k] === c) delete nodeOwner[k];   // it may have been holding a junction
  for (let tries = 0; tries < 40; tries++) {
    const k = Math.floor(Math.random() * (NB + 1)), l = Math.floor(Math.random() * (NB + 1)), d = Math.floor(Math.random() * 4); if (!okDir(k, l, d)) continue;
    const s = rnd(12, 46), p = lanePt(k, l, d, s, c.ai.off), dd = dist(p.x, p.z, near.x, near.z); if (dd < lo || dd > hi) continue;
    if (cars.some(o => o !== c && dist(o.x, o.z, p.x, p.z) < 12)) continue;
    aiPlace(c, k, l, d, s); c.vf = c.ai.cruise; c.ai.stuck = 0; return true;
  }
  return false;
}
function aiDrive(c, dt) {
  const a = c.ai, f = { x: Math.sin(c.h), z: Math.cos(c.h) };
  let target = a.cruise;
  if (!a.bold) {   // ordinary traffic stops for whatever is in front of it
    // in the middle of a junction it only minds what is right on its nose, or it would stop for the queue waiting at the next stop line
    const look = a.turn ? 2 + c.half : 6 + c.vf * 0.7 + c.half, wide = a.turn ? 0.9 : 1.5, part = a.turn ? 0.45 : 1;
    const ahead = (ox, oz, rr) => { const rx = ox - c.x, rz = oz - c.z, fw = rx * f.x + rz * f.z, lat = Math.abs(-rx * f.z + rz * f.x); return fw > 0.3 && fw < look + rr * part && lat < wide + rr * part; };
    for (const o of cars) if (o !== c && ahead(o.x, o.z, o.half * 0.8)) { target = 0; break; }
    if (target && !g.car && ahead(pl.x, pl.z, 0.4)) target = 0;
    if (c.stop > 0) { c.stop -= dt; target = 0; }
  }
  // anything that has not moved for a while is in a jam: out of sight it starts again elsewhere, in sight it edges forward
  if (!a.bold && c.vf < 0.3) { a.stuck += dt; if (a.stuck > 7) { if (dist(c.x, c.z, me().x, me().z) > 60) { if (aiSpawn(c, me(), 70, 180)) return; } else if (a.stuck > 11 && !(c.stop > 0)) { target = a.cruise * 0.5; for (const k in nodeOwner) if (nodeOwner[k] !== c && a.stuck > 14) delete nodeOwner[k]; } } } else a.stuck = 0;
  c.vf += clamp(target - c.vf, -26 * dt, 7 * dt); if (c.vf < 0.05 && target === 0) c.vf = 0;
  let step = c.vf * dt;
  if (a.turn) { const T = a.turn; T.t += step / T.len;
    if (T.t >= 1) { if (nodeOwner[T.key] === c) delete nodeOwner[T.key]; aiPlace(c, T.nk, T.nl, T.nd, 8); return; }
    const u = T.t, v = 1 - u; c.x = v * v * T.p0.x + 2 * v * u * T.p1.x + u * u * T.p2.x; c.z = v * v * T.p0.z + 2 * v * u * T.p1.z + u * u * T.p2.z;
    const tx = 2 * v * (T.p1.x - T.p0.x) + 2 * u * (T.p2.x - T.p1.x), tz = 2 * v * (T.p1.z - T.p0.z) + 2 * u * (T.p2.z - T.p1.z); if (tx || tz) c.h = Math.atan2(tx, tz);
    return; }
  a.s += step;
  if (a.s >= PITCH - 8) {
    const nk = a.k + DV[a.d][0], nl = a.l + DV[a.d][1], key = nk + ',' + nl;
    if (!a.bold && nodeOwner[key] && nodeOwner[key] !== c) { a.s = PITCH - 8; c.vf = 0; }
    else {
      const opts = [0, 1, 2, 3].filter(d => d !== (a.d + 2) % 4 && okDir(nk, nl, d)); let nd = opts.includes(a.d) && Math.random() < 0.55 ? a.d : opts[Math.floor(Math.random() * opts.length)];
      if (a.pick) nd = a.pick(nk, nl, opts, a.d);
      if (!a.bold) nodeOwner[key] = c;
      const p0 = lanePt(a.k, a.l, a.d, PITCH - 8, a.off), p2 = lanePt(nk, nl, nd, 8, a.off), p1 = nd === a.d ? { x: (p0.x + p2.x) / 2, z: (p0.z + p2.z) / 2 } : (a.d % 2 === 0 ? { x: p0.x, z: p2.z } : { x: p2.x, z: p0.z });
      a.turn = { p0, p1, p2, t: 0, len: (dist(p0.x, p0.z, p1.x, p1.z) + dist(p1.x, p1.z, p2.x, p2.z)) * 0.92, nk, nl, nd, key };
    }
  }
  if (!a.turn) { const p = lanePt(a.k, a.l, a.d, a.s, a.off); c.x = p.x; c.z = p.z; c.h = HD[a.d]; }
}
function drive(c, dt) {   // the car the player is in
  let gas = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), st = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  if (joy.on) { gas += clamp(-joy.y * 1.4, -1, 1); st += clamp(joy.x * 1.3, -1, 1); }
  if (g.auto) { gas = g.auto.gas; st = g.auto.steer; }
  gas = clamp(gas, -1, 1); st = clamp(st, -1, 1);
  const hb = keys.Space || g.hbTouch, S = c.spec, onSand = c.z > SOUTH + 6;
  c.steer += (st - c.steer) * Math.min(1, dt * 7);
  if (c.air <= 0) {
    const top = S.top * (onSand ? 0.9 : 1);
    if (gas > 0) c.vf += (c.vf < 0 ? 30 : S.acc * (1 - Math.max(0, c.vf) / top)) * gas * dt;
    else if (gas < 0) c.vf += (c.vf > 0 ? -34 : -S.acc * 0.6 * (1 - Math.max(0, -c.vf) / 9)) * -gas * dt;
    c.vf -= c.vf * (0.35 + (onSand ? 0.12 : 0)) * dt; if (!gas) c.vf -= Math.sign(c.vf) * Math.min(Math.abs(c.vf), 3.5 * dt);
    if (hb) c.vf -= Math.sign(c.vf) * Math.min(Math.abs(c.vf), 16 * dt);
    const grip = clamp(Math.abs(c.vf) / 7, 0, 1), turn = S.turn * (1 - clamp((Math.abs(c.vf) - 14) / 60, 0, 0.45)) * (hb ? 1.5 : 1);
    const dh = -c.steer * turn * grip * Math.sign(c.vf || 1) * dt;
    c.h += dh; c.vl += dh * c.vf * (hb ? 0.9 : 0.42); c.vl *= Math.exp(-(hb ? 2.2 : 7) * dt);
    if (Math.abs(c.vl) > 5 && snd && Math.random() < dt * 14) noise(0.12, 2400, 0.05, 0, 'bandpass');
  }
  const f = { x: Math.sin(c.h), z: Math.cos(c.h) }, r = { x: -f.z, z: f.x };
  c.x += (f.x * c.vf + r.x * c.vl) * dt; c.z += (f.z * c.vf + r.z * c.vl) * dt;
  // two circles, nose and tail, against the city
  let hit = false; const off = c.half - c.r;
  for (const sgn of [1, -1]) { const p = { x: c.x + f.x * off * sgn, z: c.z + f.z * off * sgn }; if (pushOut(p, c.r)) { hit = true; c.x = p.x - f.x * off * sgn; c.z = p.z - f.z * off * sgn; } }
  for (const o of cars) { if (o === c) continue; const dx = c.x - o.x, dz = c.z - o.z, d = Math.hypot(dx, dz), rr = c.half * 0.75 + o.half * 0.75; if (d < rr && d > 0.001 && Math.abs(c.y - o.y) < 1.5) { c.x = o.x + dx / d * rr; c.z = o.z + dz / d * rr; hit = true; if (o.ai && !o.ai.bold) { o.stop = 1.6; if (o.honk <= 0) { o.honk = 2.5; SFX.horn(); } } } }
  if (hit) { const sp = Math.abs(c.vf); if (sp > 7) { SFX.bump(); buzz(40); g.shake = Math.min(0.5, sp / 50); if (g.carefulT <= 0 && sp > 14) { toast(ST.ui.bump); g.carefulT = 5; } } c.vf *= sp > 7 ? -0.25 : 0.4; c.vl *= 0.3; }
  // stunt ramps on the beach, and the kerb
  let gy = groundY(c.x, c.z);
  for (const R of ramps) { const al = (c.x - R.x) * R.dir; if (Math.abs(c.z - R.z) < 2.3 && al > -3.6 && al < 3.6 && f.x * R.dir * c.vf > 5) { gy = (al + 3.6) / 7.2 * 2.3; c.onRamp = R; } else if (c.onRamp === R) { c.onRamp = null; if (al >= 3.4 && c.vf > 9) { c.vy = c.vf * 0.4; c.air = 0.001; c.y += 0.05; } } }
  if (c.air > 0) { c.air += dt; c.vy -= 24 * dt; c.y += c.vy * dt; if (c.y <= gy) { c.y = gy; if (c.air > 0.55) { const n = Math.round(c.air * 10); toast(fmt(ST.ui.stunt, { n })); addPts(n); SFX.good(); buzz([30, 30, 60]); g.shake = 0.3; } c.air = 0; c.vy = 0; } }
  else c.y += (gy - c.y) * Math.min(1, dt * 14);
}

/* ───────────── people on the pavements ───────────── */
const PEDS = ['citizen-e', 'citizen-h', 'citizen-c', 'citizen-d', 'citizen-f', 'citizen-g', 'citizen-d', 'citizen-e', 'citizen-h', 'citizen-b', 'citizen-a'];
function pedPos(p) { const L = (HB - 2.4) * 2, u = ((p.u % (L * 4)) + L * 4) % (L * 4), side = Math.floor(u / L), a = u - side * L - L / 2, e = HB - 2.4; const B = p.b;
  if (side === 0) { p.x = B.x + a; p.z = B.z - e; p.h = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2; } else if (side === 1) { p.x = B.x + e; p.z = B.z + a; p.h = p.dir > 0 ? 0 : Math.PI; }
  else if (side === 2) { p.x = B.x - a; p.z = B.z + e; p.h = p.dir > 0 ? -Math.PI / 2 : Math.PI / 2; } else { p.x = B.x - e; p.z = B.z - a; p.h = p.dir > 0 ? Math.PI : 0; } }
function pedSpawn(p) { const m = me(), near = blocks.filter(B => { const d = dist(B.x, B.z, m.x, m.z); return d > 40 && d < 150; }); p.b = near.length ? near[Math.floor(Math.random() * near.length)] : blocks[Math.floor(Math.random() * blocks.length)]; p.u = Math.random() * 400; pedPos(p); }

/* ───────────── talking: lines, questions, the job banner ───────────── */
const dlg = { lines: [], i: 0, after: null, q: null };
function say(lines, after) { dlg.lines = lines.slice(); dlg.i = 0; dlg.after = after || null; dlg.q = null; g.busy = 'dlg'; $('dlg').hidden = false; showLine(); }
function ask(Q, who, okWho, after) {   // a question with one right answer (always first in the file, shuffled on screen)
  const order = Q.c.map((_c, k) => k).sort(() => Math.random() - 0.5);
  dlg.q = { Q, who, okWho, after, order, tries: 0 }; dlg.lines = [{ c: order }]; dlg.i = 0; dlg.after = null; g.busy = 'dlg'; $('dlg').hidden = false; showLine();
}
function showLine() {
  const L = dlg.lines[dlg.i]; if (!L) return endDialog();
  const ch = $('d-ch'); ch.innerHTML = '';
  if (L.c) { $('d-who').textContent = ST.names[dlg.q.who] || dlg.q.who; $('d-tx').textContent = dlg.q.Q.q; $('d-tx').style.minHeight = '0'; $('d-nx').hidden = true; $('dlg').classList.toggle('scr', dlg.q.who === 'kiosk' || dlg.q.who === 'mast' || dlg.q.who === 'unknown' || dlg.q.who === 'photo'); SFX.talk();
    L.c.forEach((k, n) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = dlg.q.Q.c[k].t; b.onclick = () => choose(n); ch.appendChild(b); }); if (fine && ch.firstChild) ch.firstChild.focus(); }
  else { $('dlg').classList.remove('scr'); $('d-who').textContent = ST.names[L.s] || L.s; $('d-tx').style.minHeight = ''; $('d-tx').textContent = L.t; $('d-nx').hidden = false; SFX.talk(); if (fine) $('d-nx').focus(); }
}
function choose(n) {
  const L = dlg.lines[dlg.i], q = dlg.q; if (!L || !L.c || !q || L.c[n] === undefined) return;
  const k = L.c[n];
  if (q.heart) { const w = q.heart[k]; trust(w); if (w > 0) { SFX.good(); buzz(30); } else if (w < 0) { SFX.bad(); buzz([60, 40, 60]); } else SFX.talk();
    dlg.lines = [{ s: 'shieldy', t: q.Q.c[k].t }, { s: q.who, t: q.Q.c[k].r }]; if (w < 0) dlg.lines.push({ s: 'dame', t: ST.ui.blame }); dlg.i = 0; dlg.q = null;
    dlg.after = () => { if (w) toast(w > 0 ? ST.ui.trustUp : ST.ui.trustDown, 3); if (q.after) q.after(); }; return showLine(); }
  const right = k === RIGHT; q.tries++;
  if (right) { SFX.good(); buzz(30); dlg.lines = [{ s: q.okWho, t: q.Q.c[k].r }]; dlg.i = 0; dlg.after = () => q.after(q.tries === 1); dlg.q = null; }
  else { SFX.bad(); buzz([60, 40, 60]); q.order = q.order.filter(o => o !== k); dlg.lines = [{ s: 'dame', t: q.Q.c[k].r }, { c: q.order }]; dlg.i = 0; }
  showLine();
}
function nextLine() { if (g.busy !== 'dlg') return; const L = dlg.lines[dlg.i]; if (L && L.c) return; dlg.i++; showLine(); }
function endDialog() { $('dlg').hidden = true; g.busy = null; const a = dlg.after; dlg.after = null; if (a) a(); }
function banner(kind, title, lesson, pts, after, kicker) {
  g.busy = 'banner'; $('bn').hidden = false; $('bn').className = 'bn ' + kind;
  $('bn-k').textContent = kicker || (kind === 'ok' ? ST.ui.jobDone : ST.ui.jobFail); $('bn-t').textContent = title;
  $('bn-l').hidden = !lesson; $('bn-lh').textContent = kind === 'ch' ? '' : ST.ui.learned; $('bn-lh').hidden = kind === 'ch'; $('bn-lt').textContent = lesson || '';
  $('bn-p').textContent = pts ? fmt(ST.ui.points, { n: pts }) : ''; $('bn-ok').hidden = kind === 'fail'; $('bn-retry').hidden = kind !== 'fail';
  g.bannerAfter = after; (kind === 'fail' ? $('bn-retry') : $('bn-ok')).focus();
}
function closeBanner() { $('bn').hidden = true; g.busy = null; const a = g.bannerAfter; g.bannerAfter = null; if (a) a(); }

/* ───────────── the story: sixteen jobs in five chapters ─────────────
   A job is a list of steps. The words for every step are in the story file
   under jobs.<id>; this table only says what kind of step it is and where. */
const JOBS = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'j7', 'j8', 'j9', 'j10', 'j11', 'j12', 'j13', 'j14', 'j15', 'j16'];
const CH = { j1: 1, j2: 1, j3: 1, j4: 2, j5: 2, j6: 2, j7: 2, j8: 3, j9: 3, j10: 3, j11: 4, j12: 4, j13: 4, j14: 5, j15: 5, j16: 5 };
const START = { j1: 'hq', j2: 'library', j3: 'park', j4: 'arcade', j5: 'home', j6: 'park', j7: 'library', j8: 'cafe', j9: 'park', j10: 'school', j11: 'beach', j12: 'hq', j13: 'nova', j14: 'hq', j15: 'tower', j16: 'tower' };
const AUTO = { j1: 'j2', j12: 'j13', j15: 'j16' };   // these follow straight on
const nextJob = () => JOBS.find(id => !g.done.includes(id)) || null;
const chapterNow = () => g.job ? CH[g.job.id] : nextJob() ? CH[nextJob()] : 6;
const mark = { list: [] };   // what the mini-map and the light beams point at this frame
let hero = null, van = null, gcar = null, DEF = {};
const ACT = { dame: 'dame', pixel: 'pixel', bot: 'bot', sprout: 'sprout', glitch: 'glitch', nova: 'citizen-a', milo: 'citizen-b', rose: 'citizen-c', sam: 'citizen-d', mum: 'citizen-e', tess: 'citizen-f', finn: 'citizen-g', jay: 'citizen-h' };
const actors = {};
function actor(id, x, z, h) { let a = actors[id]; if (!a) { const obj = place(ACT[id], 0, 0, { h: id === 'sprout' ? 1.15 : id === 'tess' || id === 'finn' || id === 'milo' ? 1.4 : 1.7 }, 0); a = actors[id] = { id, obj, x: 0, z: 0 }; }
  a.x = x; a.z = z; a.obj.position.set(x, groundY(x, z), z); a.obj.rotation.y = h === undefined ? Math.atan2(me().x - x, me().z - z) : h; a.obj.visible = true; a.gone = false; return a; }
const hide = id => { if (actors[id]) { actors[id].obj.visible = false; actors[id].gone = true; } };
const near = (name, dx, dz) => { const s = beaconSpots[name]; return { x: s.x + (dx || 0), z: s.z + (dz || 0) }; };
function homes() {   // where everyone stands when no job is using them; it changes as the story moves
  const D = id => g.done.includes(id), put = (id, name, dx, dz, h) => { const p = near(name, dx, dz); actor(id, p.x, p.z, h === undefined ? 0 : h); };
  put('dame', 'hq', 3, -2.5); put('pixel', 'library', 3, -2.5); put('bot', 'park', 3, -2.5); put('sam', 'library', -6, -2);
  put('tess', 'park', -8, -4); put('finn', 'cafe', 4, 1, Math.PI); put('jay', 'school', 6, -2); put('rose', 'rose', 2, -1.5);
  if (D('j10')) put('milo', 'rose', -1, -1); else put('milo', 'arcade', 4, -2);
  if (D('j4')) put('sprout', 'home', 2, 0.6, Math.PI); else put('sprout', 'school', -2, -2.5);
  if (D('j16') && g.ending === 'best') put('nova', 'beach', 0, 7.5, Math.PI); else if (D('j12')) put('nova', 'nova', -2, -2); else if (D('j11')) put('nova', 'hq', -1, -2.5); else put('nova', 'beach', 0, 7.5, Math.PI);
  if (D('j12')) put('mum', 'nova', 1, -2); else hide('mum'); hide('glitch');
  kiosks.forEach(k => { const on = !D('j2'); k.obj.visible = on; k.glow.visible = on; });
  masts.forEach(m => { m.glow.visible = !D('j15'); m.obj.rotation.z = D('j15') ? 0.5 : 0; });
  props.polaroid.forEach(p => { p.obj.visible = false; }); baits.forEach(b => { b.obj.visible = false; });
  towerLit(!D('j15'));
}
function towerLit(on) { if (!tower) return; tower.beam.visible = on; tower.obj.traverse(o => { if (o.isMesh) o.material.color.setScalar(on ? 1 : 0.32); }); }
let tower = null; const masts = [], baits = [], props = { polaroid: [] }, shardObjs = [];
function defineJobs() {
  const B = (i, j, dx, dz) => ({ x: blockC(i) + dx, z: blockC(j) + dz }), S = beaconSpots;
  const kid = (id, name, dx, dz, q, extra) => Object.assign({ x: S[name].x + dx, z: S[name].z + dz, actor: id, who: id, q }, extra || {});
  const K = { milo: ['arcade', 4, -2], tess: ['park', -8, -4], finn: ['cafe', 4, 1], jay: ['school', 6, -2], sprout: ['home', 2, 0.6] };
  const k = (id, q, extra) => kid(id, K[id][0], K[id][1], K[id][2], q, extra);
  DEF = {
    j1: [{ t: 'say', k: 'intro' }, { t: 'car' }, { t: 'goto', to: 'library', goal: 'drive' }, { t: 'say', k: 'outro' }],
    j2: [{ t: 'say', k: 'intro' }, { t: 'visit', goal: 'kiosks', label: 'check', ok: 'pixel', pts: kiosks.map((q, n) => ({ x: q.x, z: q.z, q: 'k' + (n + 1), who: 'kiosk', done: () => { q.glow.visible = false; SFX.zap(); } })) }, { t: 'say', k: 'outro' }],
    j3: [{ t: 'say', k: 'intro' }, { t: 'goto', to: 'beach', goal: 'beach', bait: true, r: 12 }, { t: 'actor', id: 'nova', at: near('beach', 0, 7.5), h: Math.PI }, { t: 'say', k: 'meet' }, { t: 'ask', k: 'signup', who: 'nova', ok: 'nova' }, { t: 'say', k: 'after' }],
    j4: [{ t: 'say', k: 'intro' }, { t: 'actor', id: 'sprout', at: near('school', 0, -2.5) }, { t: 'goto', to: 'school', goal: 'school', time: 75 }, { t: 'say', k: 'pickup' }, { t: 'ride', id: 'sprout' },
      { t: 'goto', to: 'home', goal: 'home', mid: { d: 75, ask: 'msg', who: 'unknown', ok: 'dame' } }, { t: 'actor', id: 'sprout', at: near('home', 2, 0.6), h: Math.PI }, { t: 'say', k: 'outro' }],
    j5: [{ t: 'say', k: 'intro' }, { t: 'visit', goal: 'photos', label: 'look', ok: 'pixel', pts: [near('school', -7, 0), near('home', -6, 0.4), B(3, 0, 9, -9), near('arcade', 7, 0), B(4, 5, 0, -21)].map((p, n) => ({ x: p.x, z: p.z, prop: props.polaroid[n], q: 'p' + (n + 1), who: 'photo' })) }, { t: 'say', k: 'outro' }],
    j6: [{ t: 'say', k: 'intro' }, { t: 'tag', what: 'drones', goal: 'drones' }, { t: 'say', k: 'outro' }],
    j7: [{ t: 'say', k: 'intro' }, { t: 'visit', goal: 'kids', label: 'talkTo', ok: 'pixel', pts: [k('milo', 'milo', { pre: 'milo', who: 'luna' }), k('tess', 'tess', { pre: 'tess', who: 'star' }), k('finn', 'finn', { pre: 'finn', who: 'ace' })] }, { t: 'say', k: 'trace' }],
    j8: [{ t: 'say', k: 'intro' }, { t: 'tag', what: 'van', goal: 'van' }, { t: 'say', k: 'outro' }],
    j9: [{ t: 'say', k: 'intro' }, { t: 'visit', goal: 'kids', label: 'talkTo', ok: 'dame', time: 170, pts: [k('milo', 'k1'), k('tess', 'k2'), k('finn', 'k3'), k('jay', 'k4')] }, { t: 'ride', id: 'bot' }, { t: 'goto', to: 'hq', goal: 'hq' },
      { t: 'actor', id: 'bot', at: near('hq', -1, -2.5) }, { t: 'say', k: 'fix' }, { t: 'ask', k: 'pass', who: 'bot', ok: 'dame' }, { t: 'say', k: 'outro' }],
    j10: [{ t: 'say', k: 'intro' }, { t: 'hide', id: 'milo' }, { t: 'goto', to: 'arcade', goal: 'r1', riddle: 40 }, { t: 'say', k: 'c1' }, { t: 'goto', to: 'park', goal: 'r2', riddle: 40 }, { t: 'say', k: 'c2' }, { t: 'actor', id: 'milo', at: near('light', 2, 2) },
      { t: 'goto', to: 'light', goal: 'r3', riddle: 40 }, { t: 'say', k: 'found' }, { t: 'heart', k: 'heart', who: 'milo', w: [2, -2, 0] }, { t: 'say', k: 'soft' }, { t: 'ride', id: 'milo' }, { t: 'goto', to: 'rose', goal: 'rose' },
      { t: 'actor', id: 'milo', at: near('rose', -1, -1) }, { t: 'say', k: 'rose' }],
    j11: [{ t: 'say', k: 'intro' }, { t: 'tod', v: 0.9 }, { t: 'actor', id: 'nova', at: { x: 1.5, z: PIER - 6 }, h: Math.PI }, { t: 'goto', to: 'pier', goal: 'pier', r: 9 }, { t: 'say', k: 'confess' }, { t: 'heart', k: 'heart', who: 'nova', w: [3, -3, -1] },
      { t: 'say', k: 'caught' }, { t: 'ride', id: 'nova' }, { t: 'shake', goal: 'shake', pts: [{ x: roadC(3), z: roadC(5) }, { x: roadC(2), z: roadC(4) }, { x: roadC(4), z: roadC(3) }], time: 30 }, { t: 'goto', to: 'hq', goal: 'hq' }, { t: 'actor', id: 'nova', at: near('hq', -1, -2.5) }, { t: 'say', k: 'safe' }],
    j12: [{ t: 'say', k: 'intro' }, { t: 'ride', id: 'nova' }, { t: 'visit', goal: 'kids', label: 'talkTo', ok: 'dame', time: 190, pts: [k('tess', 'k1'), k('jay', 'k2'), k('milo', 'k3', { x: near('rose', -1, -1).x, z: near('rose', -1, -1).z }), k('finn', 'k4')] },
      { t: 'actor', id: 'mum', at: near('nova', 1, -2) }, { t: 'goto', to: 'nova', goal: 'home', mid: { d: 55, pre: 'drive', heart: 'heart', who: 'nova', w: [2, -1, 0] } }, { t: 'actor', id: 'nova', at: near('nova', -2, -2) }, { t: 'say', k: 'mum' }],
    j13: [{ t: 'say', k: 'intro' }, { t: 'roam', what: 'drones' }, { t: 'visit', goal: 'kids', label: 'talkTo', ok: 'dame', time: 200, pts: [k('tess', 'k1'), k('finn', 'k2'), k('sprout', 'k3'), k('jay', null, { say: 'k4' }), k('milo', null, { say: 'k5', x: near('rose', -1, -1).x, z: near('rose', -1, -1).z })] }, { t: 'say', k: 'outro' }],
    j14: [{ t: 'say', k: 'intro' }, { t: 'visit', goal: 'allies', label: 'talkTo', pts: [kid('rose', 'rose', 2, -1.5, null, { say: 'rose' }), kid('sam', 'library', -6, -2, null, { say: 'sam' }), kid('mum', 'nova', 1, -2, null, { say: 'mum' }), k('jay', null, { say: 'jay' })] }, { t: 'say', k: 'outro' }],
    j15: [{ t: 'say', k: 'intro' }, { t: 'roam', what: 'all' }, { t: 'visit', goal: 'masts', label: 'unplug', ok: 'pixel', time: 230, pts: masts.map((m, n) => ({ x: m.x, z: m.z, q: 'a' + (n + 1), who: 'mast', done: () => { m.glow.visible = false; m.obj.rotation.z = 0.5; SFX.zap(); } })) }, { t: 'fx', k: 'dark' }, { t: 'say', k: 'outro' }],
    j16: [{ t: 'say', k: 'intro' }, { t: 'chase', goal: 'chase' }, { t: 'actor', id: 'glitch', at: { x: 2.6, z: PIER - 4 }, h: Math.PI }, { t: 'goto', to: 'pier', goal: 'pier', r: 12 }, { t: 'ask', k: 'final', who: 'glitch', ok: 'glitch' }, { t: 'say', k: 'outro' }]
  };
}
const ROUTE = [[5, 4], [5, 2], [3, 2], [3, 4], [1, 4], [1, 6], [3, 6]];
const KIOSK_AT = [[1, 1, -19, 19], [3, 2, 19, 19], [1, 4, 19, -19], [4, 3, -19, -19]];
const T = () => ST.jobs[g.job.id];
// each kind of step: begin (once), tick (every frame while it is the current step), goal text, map marks
const STEP = {
  say: { begin(s, d) { say(T()[d.k], advance); } },
  ask: { begin(s, d) { ask(T()[d.k], d.who, d.ok, first => { addPts(first ? 6 : 2); advance(); }); } },
  heart: { begin(s, d) { heart(T()[d.k], d.who, d.w, advance); } },
  actor: { begin(s, d) { actor(d.id, d.at.x, d.at.z, d.h); advance(); } },
  hide: { begin(s, d) { hide(d.id); advance(); } },
  ride: { begin(s, d) { hide(d.id); g.job.rider = d.id; SFX.door(); advance(); } },
  tod: { begin(s, d) { g.tod = d.v; env.key = -1; advance(); } },
  fx: { begin() { towerLit(false); const t = tower; for (let k = 0; k < 6; k++) burst(t.x + rnd(-8, 8), rnd(10, 40), t.z + rnd(-8, 8), 10, 0xc18bff); SFX.zap(); advance(); } },
  roam: { begin(s, d) { drones.forEach((q, k) => { q.alive = true; q.fall = 0; q.obj.visible = true; q.obj.rotation.set(0, 0, 0); q.c.ai.cruise = 10 + k; aiSpawn(q.c, me(), 40 + k * 20, 120 + k * 20); }); g.job.roam = d.what; if (d.what === 'all') { van.ai.cruise = 12; aiSpawn(van, me(), 60, 130); } advance(); } },
  car: { goal: () => T().goals.car, marks: () => [{ x: hero.x, z: hero.z }], tick() { if (g.car) advance(); } },
  goto: {
    begin(s, d) { s.to = typeof d.to === 'string' ? beaconSpots[d.to] : d.to; s.time = d.time || 0; s.n = 0; s.d = 0; s.lx = me().x; s.lz = me().z; s.wait = d.riddle || 0; s.asked = false;
      if (d.bait) baits.forEach(b => { b.obj.visible = true; b.got = false; }); },
    goal(s, d) { return fmt(T().goals[d.goal], { n: s.n }); }, marks(s) { return s.wait > 0 ? [] : [s.to]; }, timer(s, d) { return d.time ? s.time : null; },
    tick(s, d, dt) { const m = me();
      if (d.time) { s.time -= dt; if (s.time <= 0) return failJob(); }
      if (s.wait > 0) { s.wait -= dt; if (s.wait <= 0) toast(ST.ui.hintShown, 3); }
      if (d.bait) for (const b of baits) if (!b.got && dist(b.x, b.z, m.x, m.z) < 2.4) { b.got = true; b.obj.visible = false; s.n++; SFX.bad(); buzz([50, 30, 50]); toast(ST.ui.bait, 2.6); burst(b.x, 1.4, b.z, 10, 0xb46bff); if (s.n <= 2) trust(-1); }
      if (d.mid && !s.asked) { s.d += dist(m.x, m.z, s.lx, s.lz); s.lx = m.x; s.lz = m.z;
        if (s.d > d.mid.d) { s.asked = true; if (g.car) g.car.vf *= 0.25; SFX.phone(); buzz([40, 60, 40]); const M = d.mid;
          if (M.ask) ask(T()[M.ask], M.who, M.ok, first => addPts(first ? 6 : 2)); else say(T()[M.pre], () => heart(T()[M.heart], M.who, M.w, null)); return; } }
      if (dist(m.x, m.z, s.to.x, s.to.z) < (d.r || 10)) { if (g.car) g.car.vf *= 0.2; if (d.bait) { baits.forEach(b => { b.obj.visible = false; }); if (!s.n) { toast(ST.ui.baitNone); addPts(8); } } SFX.pick(); advance(); } } },
  visit: {
    begin(s, d) { s.done = d.pts.map(() => false); s.time = d.time || 0; d.pts.forEach(p => { if (p.actor) actor(p.actor, p.x, p.z); if (p.prop) { p.prop.obj.position.set(p.x, SLAB + 1.5, p.z); p.prop.obj.visible = true; } }); },
    goal(s, d) { return fmt(T().goals[d.goal], { a: s.done.filter(Boolean).length, b: d.pts.length }); }, marks(s, d) { return d.pts.filter((_p, n) => !s.done[n]); }, timer(s, d) { return d.time ? s.time : null; },
    tick(s, d, dt) { if (d.time) { s.time -= dt; if (s.time <= 0) return failJob(); } },
    near(s, d) { if (g.car) return null; for (let n = 0; n < d.pts.length; n++) { const p = d.pts[n]; if (!s.done[n] && dist(pl.x, pl.z, p.x, p.z) < 4.2) return { kind: 'visit', n, label: fmt(ST.ui[d.label], { n: p.actor ? ST.names[p.actor] : '' }) }; } return null; },
    use(s, d, n) { const p = d.pts[n], fin = () => { s.done[n] = true; burst(p.x, 2, p.z, 20, 0x7dff9a); if (p.prop) p.prop.obj.visible = false; if (p.done) p.done(); addPts(3); if (s.done.every(Boolean)) advance(); };
      const q = () => p.q ? ask(T().quiz[p.q], p.who, d.ok || 'dame', first => { if (first) addPts(3); fin(); }) : say(T()[p.say], fin);
      if (p.pre) say(T()[p.pre], q); else q(); } },
  tag: {
    begin(s, d) { s.n = 0; s.hold = 0; s.cool = 0; if (d.what === 'van') { van.ai.cruise = 13; aiSpawn(van, me(), 60, 120); s.b = 3; } else { s.b = drones.length; drones.forEach((q, k) => { q.alive = true; q.fall = 0; q.obj.visible = true; q.obj.rotation.set(0, 0, 0); q.c.ai.cruise = 8.5 + k * 0.6; aiSpawn(q.c, me(), 50 + k * 22, 110 + k * 30); }); } },
    goal(s, d) { return fmt(T().goals[d.goal], { a: s.n, b: s.b }); }, marks(s, d) { return d.what === 'van' ? [van] : drones.filter(q => q.alive).map(q => q.c); },
    tick(s, d, dt) { const m = me();
      if (d.what === 'van') { const dd = dist(van.x, van.z, m.x, m.z); van.ai.cruise = (dd > 110 ? 7 : 13 + s.n * 3) * (s.cool > 0 ? 1.35 : 1); if (s.cool > 0) s.cool -= dt; aiDrive(van, dt);
        tagging(s, dd < 12 && !(s.cool > 0) ? van : null, dt, 1.6, () => { s.n++; s.cool = 4; addPts(5); burst(van.x, 2.4, van.z, 22, 0x7dff9a); if (s.n >= 3) { van.vf = 0; g.job.vanStopped = true; advance(); } }); }
      else { let best = null, bd = 11; for (const q of drones) { if (!q.alive) continue; aiDrive(q.c, dt); const dd = dist(q.c.x, q.c.z, m.x, m.z); if (dd < bd) { bd = dd; best = q; } }
        tagging(s, best, dt, 1.8, q => { q.alive = false; q.fall = 0.01; s.n++; addPts(4); if (s.n >= s.b) advance(); }); } } },
  shake: {   // drones on your tail: get through the points before they box you in
    begin(s, d) { s.i = 0; s.time = d.time; drones.forEach((q, k) => { q.alive = k < 3; q.fall = 0; q.obj.visible = k < 3; q.obj.rotation.set(0, 0, 0); q.c.x = me().x + (k - 1) * 5; q.c.z = me().z + 14; }); toast(ST.ui.chased, 3); },
    goal(s, d) { return fmt(T().goals[d.goal], { a: s.i, b: d.pts.length }); }, marks(s, d) { return [d.pts[s.i]]; }, timer(s) { return s.time; },
    tick(s, d, dt) { const m = me(); s.time -= dt; if (s.time <= 0) return failJob();
      drones.forEach((q, k) => { if (!q.alive) return; const h = g.car ? g.car.h : pl.h, tx = m.x - Math.sin(h) * (9 + k * 3) + Math.cos(h) * (k - 1) * 4, tz = m.z - Math.cos(h) * (9 + k * 3) - Math.sin(h) * (k - 1) * 4; q.c.x += (tx - q.c.x) * Math.min(1, dt * 1.6); q.c.z += (tz - q.c.z) * Math.min(1, dt * 1.6); q.c.h = Math.atan2(m.x - q.c.x, m.z - q.c.z); });
      const p = d.pts[s.i]; if (dist(m.x, m.z, p.x, p.z) < 10) { s.i++; s.time = d.time; SFX.pick(); buzz(20); if (s.i >= d.pts.length) { drones.forEach(q => { if (q.alive) { q.alive = false; q.fall = 0.01; } }); advance(); } } } },
  chase: {
    begin(s) { s.i = 0; s.time = 28; s.pts = ROUTE.map(([k, l]) => ({ x: roadC(k), z: roadC(l) })).concat([{ x: 0, z: SAND - 6 }]); const m = me(); gcar.x = m.x; gcar.z = m.z - 14; g.job.gcar = true; },
    goal(s, d) { return fmt(T().goals[d.goal], { a: s.i, b: s.pts.length }); }, marks(s) { return [s.pts[s.i]]; }, timer(s) { return s.time; },
    tick(s, d, dt) { const m = me(); s.time -= dt; if (s.time <= 0) return failJob();
      const p = s.pts[s.i]; if (dist(m.x, m.z, p.x, p.z) < 10) { s.i++; s.time = 25; SFX.pick(); buzz(20); if (s.i >= s.pts.length) { gcar.x = -2.4; gcar.z = PIER - 9; gcar.h = 0; gcar.vf = 0; return advance(); } }
      const tg = s.pts[Math.min(s.pts.length - 1, s.i + 1)], dx = tg.x - gcar.x, dz = tg.z - gcar.z, dd = Math.hypot(dx, dz), gap = dist(gcar.x, gcar.z, m.x, m.z), sp = gap > 70 ? 6 : gap < 28 ? 34 : 22;   // Glitch stays one corner ahead
      if (dd > 2) { gcar.x += dx / dd * sp * dt; gcar.z += dz / dd * sp * dt; gcar.h += angDiff(Math.atan2(dx, dz), gcar.h) * Math.min(1, dt * 6); gcar.vf = sp; } } }
};
function tagging(s, target, dt, need, done) {   // stay close long enough and the shield tags it
  const bar = $('tag');
  if (!target) { s.hold = Math.max(0, s.hold - dt * 1.5); bar.hidden = s.hold <= 0; $('tag-i').style.width = (s.hold / need * 100) + '%'; return; }
  s.hold += dt; bar.hidden = false; $('tag-t').textContent = ST.ui.tagging; $('tag-i').style.width = Math.min(100, s.hold / need * 100) + '%';
  if (s.hold >= need) { s.hold = 0; bar.hidden = true; toast(ST.ui.tagged, 1.4); SFX.zap(); buzz([30, 30, 30]); const o = target.c || target; burst(o.x, (target.c ? 5 : 2), o.z, 20, 0xffe08a); done(target); }
}
function trust(n) { g.trust = clamp(g.trust + n, 0, 12); save(); }
function heart(Q, who, w, after) {   // no right answer here: what you say to someone who was tricked changes how much the city trusts you
  const order = Q.c.map((_c, k) => k).sort(() => Math.random() - 0.5);
  dlg.q = { Q, who, heart: w, after, order }; dlg.lines = [{ c: order }]; dlg.i = 0; dlg.after = null; g.busy = 'dlg'; $('dlg').hidden = false; showLine();
}
const cur = () => g.job && g.job.live ? DEF[g.job.id][g.job.i] : null;
function enter() {   // start the current step; steps that finish at once call advance() themselves
  const j = g.job, d = DEF[j.id][j.i]; if (!d) return finishJob();
  j.s = {}; const S = STEP[d.t]; if (S.begin) S.begin(j.s, d); paintGoal();
}
function advance() { const j = g.job; if (!j) return; $('tag').hidden = true; j.i++; enter(); }
function startJob(id) {
  const first = JOBS.find(k => CH[k] === CH[id]) === id, go = () => { g.job = { id, i: 0, s: {}, live: true }; SFX.phone(); enter(); };
  if (first) { const c = ST.chapters[CH[id]]; SFX.win(); banner('ch', c.name, c.sub, 0, go, fmt(ST.ui.chapter, { n: CH[id] })); } else go();
}
function cleanup() { drones.forEach(q => { q.obj.visible = false; q.alive = false; }); van.x = 9999; gcar.x = 9999; $('tag').hidden = true; }
function finishJob() {
  const id = g.job.id; g.job.live = false; cleanup(); SFX.win(); buzz([30, 40, 30, 40, 80]); g.done.push(id); g.job = null; addPts(20); g.unread = true; g.news = ST.news[id];
  if (window.DSKPoints) { DSKPoints.addPoints(id === 'j16' ? 20 : 5, ST.ui.reason); if (DSKPoints.markComboActivity) DSKPoints.markComboActivity('quest'); }
  const m = me(); for (let k = 0; k < 5; k++) setTimeout(() => burst(m.x + rnd(-6, 6), rnd(5, 10), m.z + rnd(-6, 6), 14, [0xffe08a, 0x7dd3ff, 0xff9ad5][k % 3]), k * 220);
  if (id === 'j16') g.ending = g.trust >= 9 ? 'best' : g.trust >= 5 ? 'ok' : 'low';
  save(); homes();
  banner('ok', ST.jobs[id].name, ST.jobs[id].lesson, 20, () => { paintGoal(); $('b-phone').classList.add('dot'); if (id === 'j16') showEnd(); else if (AUTO[id]) startJob(AUTO[id]); else showNews(); });
}
function failJob() {   // out of time: the same step again, from where you are
  const j = g.job; j.live = false; SFX.bad(); $('tag').hidden = true;
  banner('fail', ST.jobs[j.id].name, '', 0, () => { j.live = true; enter(); });
}
function showNews() { if (!g.news || !g.car || g.busy) return; const n = $('news'); $('news-h').textContent = ST.ui.news; $('news-t').textContent = g.news; n.hidden = false; g.newsT = 10; g.news = null; }
function showEnd() {
  const E = ST.endings[g.ending || 'ok']; $('e-h').textContent = E.h; $('e-p').textContent = E.p;
  $('e-img').src = g.ending === 'low' ? '/assets/arcade/shieldy-ready.webp' : '/assets/arcade/shieldy-cheer.webp';
  const ul = $('e-todo'); ul.innerHTML = ''; ST.todo.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
  g.busy = 'end'; $('ov-end').hidden = false; $('b-keep').focus(); g.tod = 0.92; env.key = -1; g.party = g.ending === 'best' ? 40 : 8;
}
function paintGoal() {
  const U = ST.ui, j = g.job, d = cur(), S = d && STEP[d.t];
  if (d && S.goal) { $('h-ch').textContent = ST.jobs[j.id].name; $('h-goal').textContent = S.goal(j.s, d); }
  else if (j) { $('h-ch').textContent = ST.jobs[j.id].name; $('h-goal').textContent = ''; }
  else { const n = nextJob(); $('h-ch').textContent = n ? fmt(U.chapter, { n: CH[n] }) + ' · ' + ST.chapters[CH[n]].name : U.title; $('h-goal').textContent = n ? U.freeRoam : U.allDone; }
  const tm = d && S.timer ? S.timer(j.s, d) : null; $('h-time').hidden = tm === null; if (tm !== null) { $('h-time').textContent = fmt(U.timeLeft, { t: Math.ceil(tm) }); $('h-time').classList.toggle('low', tm < 10); }
  $('h-bad').textContent = g.badges.length + '/' + badgeObjs.length;
}

/* ───────────── doing things: the one action button ───────────── */
function nearest() {   // what the action button would do right now
  const m = me(), j = g.job, d = cur();
  if (!j) { const n = nextJob(); if (n) { const b = beaconSpots[START[n]]; if (dist(m.x, m.z, b.x, b.z) < 8) return { kind: 'job', id: n, label: fmt(ST.ui.startJob, { n: ST.jobs[n].name }) }; } }
  if (d && STEP[d.t].near) { const v = STEP[d.t].near(j.s, d); if (v) return v; }
  if (g.car) return Math.abs(g.car.vf) < 6 && g.car.air <= 0 ? { kind: 'out', label: ST.ui.getOut } : null;
  let best = null, bd = 4.2; for (const c of cars) { if (!c.obj.visible || c.kind === 'npc') continue; const dd = dist(pl.x, pl.z, c.x, c.z) - c.half * 0.5; if (dd < bd) { bd = dd; best = c; } }
  if (best) return best.kind === 'traffic' ? { kind: 'no', label: ST.ui.getIn } : { kind: 'in', car: best, label: ST.ui.getIn };
  for (const id in actors) { const a = actors[id]; if (!a.gone && dist(pl.x, pl.z, a.x, a.z) < 2.6 && ST.talk.who[id] && ST.talk.who[id][chapterNow()]) return { kind: 'bark', who: id, label: fmt(ST.ui.talkTo, { n: ST.names[id] }) }; }
  for (const p of peds) if (dist(pl.x, pl.z, p.x, p.z) < 2.3) return { kind: 'bark', who: 'cit', ped: p, label: ST.ui.talk };
  return null;
}
function act() {
  if (g.mode !== 'play') return;
  if (g.busy === 'dlg') return nextLine(); if (g.busy === 'banner') return ($('bn-ok').hidden ? $('bn-retry') : $('bn-ok')).click(); if (g.busy) return;
  const n = nearest(); if (!n) return;
  if (n.kind === 'job') { if (g.car) g.car.vf = 0; return startJob(n.id); }
  if (n.kind === 'visit') return STEP.visit.use(g.job.s, cur(), n.n);
  if (n.kind === 'bark') { const ch = chapterNow(); if (!n.ped) { actors[n.who].obj.rotation.y = Math.atan2(pl.x - actors[n.who].x, pl.z - actors[n.who].z); return say([{ s: n.who, t: ST.talk.who[n.who][ch] }]); }
    const B = n.ped.adult ? (ST.talk.adults[ch] || ST.barks[Math.min(5, ch)]) : ch === 6 && ST.talk.kids6.length ? ST.talk.kids6 : ST.barks[Math.min(5, ch)], k = (g.barkN = (g.barkN || 0) + 1) % B.length; n.ped.h = Math.atan2(pl.x - n.ped.x, pl.z - n.ped.z); return say([{ s: 'cit', t: B[k] }]); }
  if (n.kind === 'no') return toast(ST.ui.notYours, 3.4);
  if (n.kind === 'in') { g.car = n.car; pl.obj.visible = false; n.car.vf = 0; n.car.vl = 0; if (n.car.badge) n.car.badge.visible = false; SFX.door(); g.camYaw = n.car.h; rNext = 0; hint(); showNews(); return; }
  if (n.kind === 'out') { const c = g.car, r = { x: -Math.cos(c.h), z: Math.sin(c.h) }; let ok = false;
    for (const sd of [-1, 1]) { const p = { x: c.x + r.x * (c.r + 1.1) * sd, z: c.z + r.z * (c.r + 1.1) * sd }, q = { x: p.x, z: p.z }; if (!pushOut(q, 0.45) && !cars.some(o => o !== c && dist(o.x, o.z, p.x, p.z) < o.half)) { pl.x = p.x; pl.z = p.z; ok = true; break; } }
    if (!ok) { pl.x = c.x - Math.sin(c.h) * (c.half + 1); pl.z = c.z - Math.cos(c.h) * (c.half + 1); }
    c.vf = 0; c.vl = 0; if (c.badge) c.badge.visible = true; g.car = null; pl.obj.visible = true; pl.h = c.h; pl.y = groundY(pl.x, pl.z); SFX.door(); hint(); }
}
function hint() { const U = ST.ui; $('t-hint').textContent = g.car ? (fine ? U.keysCar : U.touchCar) : (fine ? U.keysFoot : U.touchFoot); $('hint').hidden = false; g.hintT = 7; $('b-hb').textContent = g.car ? '⏹' : '⤒'; $('speed').hidden = !g.car; $('b-radio').hidden = !g.car; paintRadio(); }
function paintRadio() { const U = ST.ui; $('b-radio').textContent = '♪ ' + (music && g.radio ? U['radio' + g.radio] : U.radioOff); }
function phoneMsg() {   // a message from a stranger while you roam: answer it well for points
  const left = ST.msgs.map((_m, k) => k).filter(k => !g.msgs.includes(k)); if (!left.length) return;
  const k = left[Math.floor(Math.random() * left.length)]; g.msgReady = false; $('b-msg').hidden = true; if (g.car) g.car.vf *= 0.2;
  ask(ST.msgs[k], 'unknown', 'dame', first => { g.msgs.push(k); addPts(first ? 10 : 4); toast(fmt(ST.ui.msgGood, { n: first ? 10 : 4 })); g.msgT = 95; });
}

/* ───────────── the map: drawn once, then moved under a window ───────────── */
const MAPW = 440, MAPH = 500, MX = 220, MZ = 215;   // 1 px = 1 m; world (0,0) sits at (MX, MZ)
const mapC = document.createElement('canvas'); mapC.width = MAPW; mapC.height = MAPH;
function drawMap() {
  const x = mapC.getContext('2d'); x.fillStyle = '#3aa7c9'; x.fillRect(0, 0, MAPW, MAPH);
  x.fillStyle = '#e8d49a'; x.fillRect(MX - LIM, MZ + SOUTH, LIM * 2, SAND - SOUTH);
  x.fillStyle = '#9a7b55'; x.fillRect(MX - 5.5, MZ + SAND - 2, 11, PIER - SAND + 2);
  x.fillStyle = '#b9b3a6'; x.fillRect(MX - LIM, MZ - LIM, LIM * 2, LIM + SOUTH + 6);
  x.fillStyle = '#4a4f5c'; x.fillRect(MX - EDGE - 6, MZ - EDGE - 6, EDGE * 2 + 12, EDGE * 2 + 12);
  const col = { h: '#8fc46a', a: '#e6c27a', o: '#c9b08a', g: '#7fd0d6', d: '#f2a7b8', m: '#f0a070', p: '#4faa4a', s: '#c8644a', l: '#e9e4d6', q: '#e2b93b', r: '#c06be0', t: '#f6b9c6' };
  for (const B of blocks) { x.fillStyle = col[B.type]; x.fillRect(MX + B.x - HB, MZ + B.z - HB, HB * 2, HB * 2); }
}
function drawMini(cv, size, scale, full) {
  const x = cv.getContext('2d'), m = me(), W = cv.width, H = cv.height, k = W / size;
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
  let ox, oz, sc;
  if (full) { sc = Math.min(W / MAPW, H / MAPH); ox = (W - MAPW * sc) / 2; oz = (H - MAPH * sc) / 2; x.drawImage(mapC, ox, oz, MAPW * sc, MAPH * sc); }
  else { sc = scale * k; x.save(); x.beginPath(); x.arc(W / 2, H / 2, W / 2, 0, 7); x.clip(); ox = W / 2 - (MX + m.x) * sc; oz = H / 2 - (MZ + m.z) * sc; x.fillStyle = '#3aa7c9'; x.fillRect(0, 0, W, H); x.drawImage(mapC, ox, oz, MAPW * sc, MAPH * sc); }
  const px = wx => ox + (MX + wx) * sc, pz = wz => oz + (MZ + wz) * sc, R = W / 2 - 7 * k;
  const dot = (wx, wz, c, r, ring) => { let ax = px(wx), az = pz(wz); if (!full) { const dx = ax - W / 2, dz = az - H / 2, d = Math.hypot(dx, dz); if (d > R) { ax = W / 2 + dx / d * R; az = H / 2 + dz / d * R; } }
    x.beginPath(); x.arc(ax, az, r * k * (full ? 1.6 : 1), 0, 7); x.fillStyle = c; x.fill(); if (ring) { x.lineWidth = 2 * k; x.strokeStyle = '#0d1b3e'; x.stroke(); } };
  if (full) { for (const b of badgeObjs) if (!b.got) dot(b.x, b.z, 'rgba(255,255,255,.75)', 1.6);
    const U = ST.ui, S = beaconSpots; x.font = `800 ${Math.round(21 * k)}px 'Nunito Sans',system-ui,sans-serif`; x.textAlign = 'center'; x.lineJoin = 'round';
    [['hq', U.placeHQ, -30], ['library', U.placeLibrary, -30], ['school', U.placeSchool, -30], ['park', U.placePark, -30], ['arcade', U.placeArcade, -30], ['tower', U.placeTower, -30], ['beach', U.placeBeach, 12], ['light', U.placeLight, -14], ['pier', U.placePier, 2]].forEach(([id, name, dz]) => {
      const ax = clamp(px(S[id].x), 40 * k, W - 40 * k), az = pz(S[id].z + dz); x.lineWidth = 6 * k; x.strokeStyle = 'rgba(13,27,62,.92)'; x.strokeText(name, ax, az); x.fillStyle = '#fff'; x.fillText(name, ax, az); }); }
  for (const c of cars) if (c.kind === 'share' && c !== g.car && (full || dist(c.x, c.z, m.x, m.z) < 120)) dot(c.x, c.z, '#ffffff', 2.4, true);
  if (hero && hero !== g.car) dot(hero.x, hero.z, '#ffd23f', 3.4, true);
  for (const q of mark.list) dot(q.x, q.z, q.col || '#35e0ff', 4.6, true);
  const ax = px(m.x), az = pz(m.z), h = g.car ? g.car.h : pl.h;
  x.save(); x.translate(ax, az); x.rotate(-h + Math.PI); x.beginPath(); x.moveTo(0, -7 * k); x.lineTo(5 * k, 6 * k); x.lineTo(0, 3 * k); x.lineTo(-5 * k, 6 * k); x.closePath(); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 1.6 * k; x.strokeStyle = '#0d1b3e'; x.stroke(); x.restore();
  if (!full) x.restore();
}

/* ───────────── the phone: map, jobs, help ───────────── */
let phTab = 'map'; const TABS = ['map', 'jobs', 'msgs', 'notes', 'help'];
function openPhone() { if (g.mode !== 'play' || (g.busy && g.busy !== 'phone')) return; if (g.msgReady) return phoneMsg(); g.busy = 'phone'; $('phone').hidden = false; if (g.unread) phTab = 'msgs'; paintPhone(); $('ph-x').focus(); }
function closePhone() { $('phone').hidden = true; if (g.busy === 'phone') g.busy = null; }
function paintPhone() {
  const U = ST.ui, el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  TABS.forEach(t => { $('ph-' + t).classList.toggle('on', t === phTab); $('pp-' + t).hidden = t !== phTab; });
  if (phTab === 'map') { const c2 = $('ph-cv'); drawMini(c2, c2.width, 1, true); }
  if (phTab === 'jobs') { const ul = $('pp-jobs'); ul.innerHTML = ''; const nx = nextJob();
    const tr = el('li', 'trust'); tr.append(el('b', '', U.trust), el('span', '', g.trust + '/12')); const bar = el('div', 'tbar'), fill = el('i'); fill.style.width = (g.trust / 12 * 100) + '%'; bar.appendChild(fill); tr.append(bar, el('p', '', U.trustHint)); ul.appendChild(tr);
    let ch = 0; JOBS.forEach(id => { const done = g.done.includes(id), now = g.job && g.job.id === id, open = done || now || id === nx;
      if (CH[id] !== ch) { ch = CH[id]; ul.appendChild(el('li', 'chap', fmt(U.chapter, { n: ch }) + ' · ' + (open ? ST.chapters[ch].name : '???'))); }
      const li = el('li', done ? 'done' : open ? 'now' : 'lock'); li.append(el('b', '', open ? ST.jobs[id].name : '???'), el('span', '', done ? U.jobDoneTag : now ? U.jobNow : id === nx ? U.jobNext : U.jobLocked)); if (done) li.appendChild(el('p', '', ST.jobs[id].lesson)); ul.appendChild(li); });
    const li = el('li', 'now'); li.append(el('b', '', U.badges), el('span', '', g.badges.length + '/' + badgeObjs.length)); ul.appendChild(li); }
  if (phTab === 'msgs') { const ul = $('pp-msgs'); ul.innerHTML = ''; g.unread = false; $('b-phone').classList.remove('dot');
    const got = ST.inbox.filter(m => g.done.includes(m.after)).reverse(); if (!got.length) ul.appendChild(el('li', 'lock', U.noMsgs));
    got.forEach(m => { const li = el('li', 'msg' + (m.from === 'glitch' ? ' g' : '')); li.append(el('b', '', ST.names[m.from]), el('p', '', m.t)); ul.appendChild(li); }); }
  if (phTab === 'notes') { const ul = $('pp-notes'); ul.innerHTML = ''; ul.appendChild(el('li', 'chap', U.notesHead));
    if (!g.shards.length) ul.appendChild(el('li', 'lock', U.noNotes));
    ST.shards.forEach((S, n) => { const has = g.shards.includes(n), li = el('li', has ? 'msg g' : 'lock'); li.append(el('b', '', has ? S.h : '???')); if (has) li.appendChild(el('p', '', S.t)); ul.appendChild(li); }); }
  if (phTab === 'help') { $('hp-1').textContent = fine ? U.keysFoot : U.touchFoot; $('hp-2').textContent = fine ? U.keysCar : U.touchCar; $('hp-3').textContent = U.how;
    $('b-snd').textContent = (snd ? '🔊 ' : '🔇 ') + U.sound; $('b-mus').textContent = (music ? '♪ ' : '✕ ') + U.music; }
}

/* ───────────── every frame ───────────── */
const v3 = new THREE.Vector3();
function update(dt) {
  g.t += dt; g.frame++;
  const playing = g.mode === 'play', free = playing && !g.busy;
  if (playing && !g.busy) g.tod = (g.tod + dt / 480) % 1;
  if (free) {
    // you
    if (g.car) { drive(g.car, dt); pl.x = g.car.x; pl.z = g.car.z; }
    else {
      let mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), mz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      if (joy.on) { mx += joy.x; mz -= joy.y; } if (g.auto) { mx = g.auto.steer; mz = g.auto.gas; }
      const m = Math.hypot(mx, mz); pl.moving = m > 0.1;
      if (pl.moving) { if (m > 1) { mx /= m; mz /= m; }
        const fx = Math.sin(g.camYaw), fz = Math.cos(g.camYaw), wx = fx * mz - fz * mx, wz = fz * mz + fx * mx, sp = 7.2;
        pl.x += wx * sp * dt; pl.z += wz * sp * dt; pl.phase += dt * 12; pl.h += angDiff(Math.atan2(wx, wz), pl.h) * Math.min(1, dt * 12);
        if (g.camHold <= 0) g.camYaw += angDiff(pl.h, g.camYaw) * Math.min(1, dt * 0.9); }
      pushOut(pl, 0.45);
      for (const c of cars) { if (!c.obj.visible) continue; const dx = pl.x - c.x, dz = pl.z - c.z, d = Math.hypot(dx, dz), rr = c.half * 0.72 + 0.4; if (d < rr && d > 0.001) { pl.x = c.x + dx / d * rr; pl.z = c.z + dz / d * rr; } }
      const gy = groundY(pl.x, pl.z); pl.vy -= 24 * dt; pl.y += pl.vy * dt; if (pl.y <= gy) { pl.y = gy; pl.vy = 0; }
    }
    // traffic, people, the job
    for (const c of cars) { if (c.honk > 0) c.honk -= dt; if (c.kind !== 'traffic') continue; aiDrive(c, dt); if (dist(c.x, c.z, pl.x, pl.z) > 215) aiSpawn(c, pl, 110, 190); }
    const fast = g.car && Math.abs(g.car.vf) > 4;
    for (const p of peds) { const d = dist(p.x, p.z, pl.x, pl.z);
      if (d > 170) pedSpawn(p);
      if (p.dodge > 0) { p.dodge -= dt; p.x += p.dx * dt * 5; p.z += p.dz * dt * 5; } else { if (!(d < 2.2 && !g.car)) p.u += p.dir * p.sp * dt; pedPos(p); }
      if (fast && d < 4.2 && p.dodge <= 0) { p.dodge = 0.7; const dx = p.b.x - p.x, dz = p.b.z - p.z, m = Math.hypot(dx, dz) || 1; p.dx = dx / m; p.dz = dz / m; g.car.vf *= 0.5; if (g.carefulT <= 0) { toast(ST.ui.careful); g.carefulT = 4; buzz(30); } }
      if (!g.car && d < 0.8 && d > 0.001) { pl.x = p.x + (pl.x - p.x) / d * 0.8; pl.z = p.z + (pl.z - p.z) / d * 0.8; } }
    if (g.carefulT > 0) g.carefulT -= dt;
    { const d = cur(); if (d && STEP[d.t].tick) STEP[d.t].tick(g.job.s, d, dt); const j = g.job; if (j && j.live && j.roam) { for (const q of drones) if (q.alive) aiDrive(q.c, dt); if (j.roam === 'all') aiDrive(van, dt); } }
    // badges
    const m = me(); for (const b of badgeObjs) if (!b.got && Math.abs(b.x - m.x) < 2.6 && Math.abs(b.z - m.z) < 2.6 && Math.abs((b.y || 1.3) - (m.y + 1)) < 3) { b.got = true; b.obj.visible = false; g.badges.push(b.n); SFX.pick(); buzz(20); burst(b.x, b.y || 1.4, b.z, 12, 0xffe08a); addPts(2); toast(g.badges.length >= badgeObjs.length ? ST.ui.badgesAll : fmt(ST.ui.badge, { a: g.badges.length, b: badgeObjs.length }), 1.8); }
    // a stranger's message, now and then, when nothing else is going on
    for (const b of shardObjs) if (!b.got && Math.abs(b.x - m.x) < 2.4 && Math.abs(b.z - m.z) < 2.4) { b.got = true; b.obj.visible = false; g.shards.push(b.n); save(); SFX.zap(); buzz([20, 30, 20]); burst(b.x, 1.4, b.z, 16, 0xc18bff); const S = ST.shards[b.n]; if (g.car) g.car.vf *= 0.2; toast(g.shards.length >= shardObjs.length ? ST.ui.shardsAll : fmt(ST.ui.shard, { a: g.shards.length, b: shardObjs.length }), 2.4); addPts(5); say([{ s: S.h, t: S.t }]); break; }
    if (!g.job && !g.msgReady && g.msgs.length < ST.msgs.length) { g.msgT -= dt; if (g.msgT <= 0) { g.msgReady = true; $('b-msg').hidden = false; $('b-msg').textContent = '✉ ' + ST.ui.newMsg; SFX.phone(); buzz([40, 60, 40]); } }
    g.near = nearest(); const b = $('b-act'); if (g.near) { b.hidden = false; if (b.textContent !== g.near.label) b.textContent = g.near.label; } else b.hidden = true;
    if (g.frame % 6 === 0) paintGoal();
    if (g.car) { $('sp-n').textContent = Math.round(Math.abs(g.car.vf) * 3.3); }
    if (g.hintT > 0) { g.hintT -= dt; if (g.hintT <= 0) $('hint').hidden = true; }
  } else $('b-act').hidden = true;
  engine(g.car ? g.car.vf : 0, !!g.car && free);

  // put everything where it is
  if (pl.obj) { pl.obj.position.set(pl.x, pl.y + (pl.moving && free ? Math.abs(Math.sin(pl.phase)) * 0.16 : 0), pl.z); pl.obj.rotation.y = pl.h; }
  const night = env.night > 0.35;
  for (const c of cars) { const o = c.obj; o.position.set(c.x, c.y, c.z); o.rotation.set(c.air > 0 ? clamp(-c.vy * 0.025, -0.45, 0.45) : (c.onRamp ? -0.3 : 0), c.h, c === g.car ? clamp(c.steer * c.vf * 0.004 + c.vl * 0.012, -0.12, 0.12) : 0, 'YXZ');
    if (c.kind !== 'own' || c !== g.car) o.visible = c.x < 9000 && dist(c.x, c.z, camera.position.x, camera.position.z) < 250 && (c.kind !== 'npc' || c.show !== false);
    const lit = night || (c === g.car && false); c.beam.visible = night && (c === g.car || c.kind === 'traffic'); for (let k = 0; k < 4; k++) c.lights[k].visible = lit || (k > 1 && c === g.car && (keys.KeyS || keys.ArrowDown || keys.Space));
    if (c.badge) { c.badge.rotation.y = g.t * 2; } }
  if (van) van.obj.visible = van.x < 9000; if (gcar) gcar.obj.visible = gcar.x < 9000;
  for (const p of peds) { p.obj.position.set(p.x, SLAB + Math.abs(Math.sin(g.t * 7 + p.u)) * (p.dodge > 0 ? 0.5 : 0.07), p.z); p.obj.rotation.y = p.h; p.obj.visible = dist(p.x, p.z, camera.position.x, camera.position.z) < 150; }
  for (const d of drones) { if (!d.obj.visible) continue; const c = d.c; if (d.fall > 0) { d.fall += dt; d.y = Math.max(0.4, d.y - d.fall * 14 * dt); d.obj.rotation.z += dt * 9; if (d.fall > 2.2) d.obj.visible = false; } else d.y = 6 + Math.sin(g.t * 2 + c.x) * 0.5;
    d.obj.position.set(c.x, d.y, c.z); d.obj.rotation.y = c.h; }
  for (const b of badgeObjs) if (!b.got) { b.obj.rotation.y = g.t * 2.4 + b.n; b.obj.position.y = (b.y || 1.3) + Math.sin(g.t * 3 + b.n) * 0.15; b.obj.visible = dist(b.x, b.z, camera.position.x, camera.position.z) < 120; }
  for (const k of kiosks) if (k.glow.visible) k.glow.material.opacity = 0.5 + Math.sin(g.t * 9 + k.x) * 0.25;
  for (const k of masts) if (k.glow.visible) k.glow.material.opacity = 0.45 + Math.sin(g.t * 5 + k.x) * 0.3;
  for (const b of baits) if (b.obj.visible) { b.obj.rotation.y = g.t * 3 + b.x; b.obj.position.y = 1.1 + Math.sin(g.t * 4 + b.z) * 0.15; }
  for (const b of props.polaroid) if (b.obj.visible) { b.obj.rotation.y = g.t * 1.5; b.obj.position.y = SLAB + 1.5 + Math.sin(g.t * 2.5 + b.x) * 0.15; }
  for (const b of shardObjs) if (!b.got) { b.obj.rotation.y = g.t + b.n; b.obj.visible = dist(b.x, b.z, camera.position.x, camera.position.z) < 110; }
  if (tower && tower.beam.visible) tower.beam.material.opacity = 0.16 + Math.sin(g.t * 2) * 0.05;
  for (const id in actors) { const a = actors[id]; if (!a.gone) a.obj.visible = dist(a.x, a.z, camera.position.x, camera.position.z) < 150; }
  if (g.newsT > 0) { g.newsT -= dt; if (g.newsT <= 0) $('news').hidden = true; }
  if (g.party > 0) { g.party -= dt; if (Math.random() < dt * 5) { const m2 = me(); burst(m2.x + rnd(-30, 30), rnd(12, 26), m2.z + rnd(-30, 30), 16, [0xffe08a, 0x7dd3ff, 0xff9ad5, 0x9dffb8][Math.floor(Math.random() * 4)]); if (snd && Math.random() < 0.3) noise(0.3, 900, 0.12); } }
  for (const q of lampGlows) q.visible = night;
  for (const bt of boats) { bt.position.y = -0.75 + Math.sin(g.t * 1.3 + bt.position.x) * 0.12; bt.rotation.z = Math.sin(g.t * 1.1 + bt.position.z) * 0.05; }
  if (TEX.water) { TEX.water.offset.x = g.t * 0.004; TEX.water.offset.y = Math.sin(g.t * 0.2) * 0.01; }
  for (const p of sparks) { if (p.t <= 0) continue; p.t -= dt; p.v.y -= 12 * dt; p.s.position.addScaledVector(p.v, dt); p.s.material.opacity = Math.min(1, p.t * 2); if (p.t <= 0) p.s.visible = false; }

  // markers: the next job's beacon, or whatever the job points at
  mark.list.length = 0; const j = g.job, cd = cur();
  if (cd && STEP[cd.t].marks) for (const q of STEP[cd.t].marks(j.s, cd)) mark.list.push({ x: q.x, z: q.z });
  else if (!j && playing) { const n = nextJob(); if (n) { const b = beaconSpots[START[n]]; mark.list.push({ x: b.x, z: b.z, col: '#ffd23f', gold: true }); } }
  beams.forEach((b, k) => { const q = mark.list[k]; b.visible = !!q; if (q) { b.position.set(q.x, 0, q.z); b.material.color.set(q.gold ? 0xffd23f : 0x35e0ff); b.material.opacity = 0.16 + Math.sin(g.t * 4) * 0.05; b.userData.ring.material.color.copy(b.material.color); b.userData.ring.scale.setScalar(1 + Math.sin(g.t * 3) * 0.12); } });

  // camera
  const portrait = camera.aspect < 1;
  if (g.camHold > 0) g.camHold -= dt;
  let tx, ty, tz, d0, hgt;
  if (g.car) { const c = g.car, sp = Math.abs(c.vf); if (g.camHold <= 0) { g.camOff *= Math.exp(-dt * 3); }
    g.camYaw += angDiff(c.h + (c.vf < -1 ? Math.PI : 0) * 0, g.camYaw) * Math.min(1, dt * (3 + sp * 0.08));
    tx = c.x; ty = c.y + 1.5; tz = c.z; d0 = (portrait ? 10.5 : 8.5) + sp * 0.1 + c.half; hgt = (portrait ? 4.6 : 3.4) + c.half * 0.5; camera.fov += ((portrait ? 72 : 58) + sp * 0.45 - camera.fov) * Math.min(1, dt * 4); }
  else { tx = pl.x; ty = pl.y + 1.5; tz = pl.z; d0 = portrait ? 8 : 6.4; hgt = portrait ? 3.8 : 2.9; camera.fov += ((portrait ? 70 : 58) - camera.fov) * Math.min(1, dt * 4); g.camOff = 0; }
  camera.updateProjectionMatrix();
  const yaw = g.camYaw + g.camOff, sh = g.shake > 0 ? g.shake : 0; if (g.shake > 0) g.shake -= dt;
  v3.set(tx - Math.sin(yaw) * d0 + rnd(-sh, sh), ty + hgt + rnd(-sh, sh), tz - Math.cos(yaw) * d0);
  camera.position.lerp(v3, g.snap ? 1 : Math.min(1, dt * 9)); g.snap = false; camera.lookAt(tx + Math.sin(yaw) * 3, ty + 0.4, tz + Math.cos(yaw) * 3);
  paintDay(g.tod); lamp.intensity = env.night * 60; lamp.position.set(tx + Math.sin(yaw) * 2, ty + 3.2, tz + Math.cos(yaw) * 2);
  // hide what is far away or behind you
  if (g.frame % 5 === 0) { const fx = Math.sin(yaw), fz = Math.cos(yaw), cx = camera.position.x, cz = camera.position.z, lim = scene.fog.far + 20;
    for (const q of far) { const dx = q.x - cx, dz = q.z - cz, d = Math.hypot(dx, dz); q.o.visible = d < lim + q.r && dx * fx + dz * fz > -(q.r + 12); } }
  if (g.toastT > 0) { g.toastT -= dt; if (g.toastT <= 0) $('toast').style.opacity = 0; }
  if (playing && g.frame % 3 === 0) { const cv = $('mini'); drawMini(cv, 150, 0.62, false); }
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

/* ───────────── input ───────────── */
addEventListener('keydown', e => {
  if (g.mode !== 'play') return; const k = e.code;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(k)) { if (!(k === 'Space' && document.activeElement && document.activeElement.tagName === 'BUTTON' && g.busy)) { keys[k] = true; if (!g.busy) e.preventDefault(); } }
  if (e.repeat) return;
  if (g.busy === 'dlg' && /^Digit[1-3]$/.test(k)) return choose(+k.slice(5) - 1);
  if (k === 'KeyE' || k === 'KeyF' || (k === 'Enter' && !(document.activeElement && document.activeElement.tagName === 'BUTTON'))) { e.preventDefault(); act(); }
  if (k === 'Space' && !g.busy && !g.car && pl.y <= groundY(pl.x, pl.z) + 0.01) pl.vy = 8;
  if (k === 'KeyP' || k === 'KeyM') { e.preventDefault(); g.busy === 'phone' ? closePhone() : openPhone(); }
  if (k === 'Escape' && g.busy === 'phone') closePhone();
  if (k === 'KeyH' && g.car && !g.busy) SFX.horn();
  if (k === 'KeyR' && g.car && !g.busy) cycleRadio();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (g.mode === 'play') ac.resume(); });   // no engine hum from a tab nobody is looking at
function cycleRadio() { g.radio = (g.radio + 1) % RADIO.length; rNext = 0; rStep = 0; paintRadio(); toast($('b-radio').textContent, 1.4); }
const cv = $('c');
cv.addEventListener('pointerdown', e => {
  if (g.mode !== 'play' || g.busy) return;
  if (e.pointerType !== 'mouse' && e.clientX < innerWidth * 0.5 && !joy.on) { joy.on = true; joy.id = e.pointerId; joy.x0 = e.clientX; joy.y0 = e.clientY; joy.x = joy.y = 0; const s = $('stick'); s.hidden = false; s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; $('knob').style.transform = 'translate(-50%,-50%)'; $('hint').hidden = true; }
  else if (look.id < 0) { look.id = e.pointerId; look.x = e.clientX; }
});
addEventListener('pointermove', e => {
  if (joy.on && e.pointerId === joy.id) { let dx = (e.clientX - joy.x0) / 52, dy = (e.clientY - joy.y0) / 52; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } joy.x = dx; joy.y = dy; $('knob').style.transform = `translate(calc(-50% + ${dx * 40}px), calc(-50% + ${dy * 40}px))`; }
  else if (e.pointerId === look.id) { const dx = e.clientX - look.x; look.x = e.clientX; if (g.car) g.camOff = clamp(g.camOff - dx * 0.006, -2.4, 2.4); else g.camYaw -= dx * 0.006; g.camHold = 2.2; }
});
const up = e => { if (joy.on && e.pointerId === joy.id) { joy.on = false; joy.x = joy.y = 0; $('stick').hidden = true; } if (e.pointerId === look.id) look.id = -1; };
addEventListener('pointerup', up); addEventListener('pointercancel', up);
$('b-act').onclick = act; $('d-nx').onclick = nextLine; $('bn-ok').onclick = closeBanner; $('bn-retry').onclick = closeBanner;
$('b-phone').onclick = () => (g.busy === 'phone' ? closePhone() : openPhone()); $('ph-x').onclick = closePhone; $('b-msg').onclick = () => { if (!g.busy) phoneMsg(); };
TABS.forEach(t => { $('ph-' + t).onclick = () => { phTab = t; paintPhone(); }; });
$('b-snd').onclick = () => { snd = !snd; try { localStorage.setItem('dsk_city_snd', snd ? '1' : '0'); } catch (e) {} paintPhone(); };
$('b-mus').onclick = () => { music = !music; try { localStorage.setItem('dsk_city_mus', music ? '1' : '0'); } catch (e) {} paintPhone(); paintRadio(); };
$('b-radio').onclick = cycleRadio;
const hb = $('b-hb'); hb.addEventListener('pointerdown', e => { e.preventDefault(); if (g.car) g.hbTouch = true; else if (!g.busy && pl.y <= groundY(pl.x, pl.z) + 0.01) pl.vy = 8; });
['pointerup', 'pointercancel', 'pointerleave'].forEach(n => hb.addEventListener(n, () => { g.hbTouch = false; }));
$('b-keep').onclick = () => { $('ov-end').hidden = true; g.busy = null; paintGoal(); };

/* ───────────── putting the city together ───────────── */
function build() {
  buildCity(); drawMap();
  for (let i = 0; i < 70; i++) { const s = sprite(0xffffff, 0.5, true); s.visible = false; scene.add(s); sparks.push({ s, t: 0, v: new THREE.Vector3() }); }
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 70, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x35e0ff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); b.geometry.translate(0, 35, 0); const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 4, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.28; b.add(ring); b.userData.ring = ring; b.visible = false; scene.add(b); beams.push(b); }
  // you and your car, outside HQ
  const hq = beaconSpots.hq; pl.obj = place('shieldy', 0, 0, { h: 1.75 }, 0); pl.x = hq.x - 5; pl.z = hq.z - 3; pl.y = SLAB; pl.h = Math.PI; g.camYaw = Math.PI * 0.8;
  hero = makeCar('car-hero', hq.x - 13, hq.z - 7.5, -Math.PI / 2, 'own');
  // cars to borrow, traffic, Glitch's van and car
  const types = ['car-sedan', 'car-pickup', 'car-taxi', 'car-hatch', 'car-bus', 'car-sedan', 'car-taxi', 'car-pickup'];
  parkSpots.forEach((p, k) => makeCar(types[k % types.length], p.x, p.z, p.h, 'share'));
  const tr = ['car-sedan', 'car-hatch', 'car-taxi', 'car-pickup', 'car-bus', 'car-hatch', 'car-sedan', 'car-taxi', 'car-pickup', 'car-sedan', 'car-hatch', 'car-taxi', 'car-bus', 'car-sedan'];
  tr.forEach((n, k) => { const c = makeCar(n, 0, 0, 0, 'traffic'); c.ai = { off: 3, cruise: n === 'car-bus' ? 7.5 : 9 + (k % 4), stuck: 0 }; aiSpawn(c, pl, 30, 220); });
  van = makeCar('car-van', 9999, 0, 0, 'npc'); van.ai = { off: 3, cruise: 13, stuck: 0, bold: true }; van.obj.visible = false;
  gcar = makeCar('car-glitch', 9999, 0, 0, 'npc'); gcar.obj.visible = false;
  for (let k = 0; k < 5; k++) { const obj = place('drone', 0, 0, { h: 1.3 }, 0); obj.visible = false; const beam = sprite(0x7dff9a, 5, true); beam.position.y = -0.4; beam.scale.set(4, 4, 1); obj.add(beam); drones.push({ obj, y: 6, alive: false, fall: 0, c: { x: 0, z: 0, h: 0, vf: 0, half: 1, ai: { off: 0, cruise: 9, stuck: 0, bold: true } } }); }
  KIOSK_AT.forEach(([i, j, dx, dz]) => { const B = blocks[j * NB + i], x = B.x + dx, z = B.z + dz, obj = place('kiosk', x, z, { h: 2.6, y: SLAB }, Math.atan2(dx, dz)); B.circles.push({ x, z, r: 0.9 }); const glow = sprite(0x6dff8f, 4.5, true); glow.position.set(x, 2, z); scene.add(glow); kiosks.push({ x, z, obj, glow }); });
  // Glitch's relay masts stand over the city from the first minute; you only learn what they are in chapter five
  [[0, 1, 19, -19], [5, 1, -19, -19], [0, 4, 19, 19], [5, 4, -19, 19]].forEach(([i, j, dx, dz]) => { const B = blocks[j * NB + i], x = B.x + dx, z = B.z + dz, obj = place('antenna', x, z, { h: 13, y: SLAB }, hash(i + j) * 6); B.circles.push({ x, z, r: 1.2 }); const glow = sprite(0x7dff9a, 7, true); glow.position.set(x, 11, z); scene.add(glow); masts.push({ x, z, obj, glow }); });
  for (let k = 0; k < 5; k++) { const obj = place('polaroid', 0, 0, { h: 1.1 }, 0); obj.visible = false; const h = sprite(0xffffff, 3, true); h.scale.set(2.6, 2.6, 1); obj.add(h); props.polaroid.push({ obj, x: k }); }
  // bait on the road to the beach: gold coins dyed purple
  { const dye = o => { o.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.set(0xb060ff); m.material.emissive = new THREE.Color(0x6a20c0); m.material.emissiveIntensity = 0.6; } }); return o; };
    const at = []; for (let z = -108; z < 176; z += 21) at.push([roadC(3) + (Math.round(z / 21) % 2 ? 3 : -3), z]); for (let x = 12; x < 110; x += 24) at.push([x, roadC(6) + (Math.round(x / 24) % 2 ? 3 : -3)]); for (let z = -100; z < 170; z += 34) at.push([roadC(4) + (Math.round(z / 34) % 2 ? -3 : 3), z]);
    at.forEach(([x, z]) => { const obj = dye(place('coin', x, z, { h: 1.3, y: 1.1 }, 0)); obj.visible = false; baits.push({ x, z, obj, got: false }); }); }
  // twelve pages of Glitch's rulebook, tucked away where a curious player ends up
  { const T2 = blocks[PLACE.tower[1] * NB + PLACE.tower[0]], pk2 = blocks[PLACE.park[1] * NB + PLACE.park[0]], S = beaconSpots, B = (i, j, dx, dz) => [blockC(i) + dx, blockC(j) + dz];
    [[T2.x, T2.z - 21], [-158, SAND - 2], [0, SAND + 12], [44, SOUTH + 41.5], [pk2.x - 6.5, pk2.z], [S.school.x + 20, S.school.z - 40], B(0, 2, 0, 0), B(3, 4, 14, -18), [S.library.x - 20, S.library.z - 40], [-LIM + 2.5, -LIM + 2.5], [LIM - 2.5, SAND - 4], B(5, 3, -19, -21)]
      .forEach(([x, z], n) => { const obj = place('crystal', x, z, { h: 1.25, y: groundY(x, z) }, n); const h = sprite(0xc060ff, 4, true); h.position.y = 0.6; h.scale.set(3.4, 3.4, 1); obj.add(h); shardObjs.push({ n, x, z, obj, got: false }); }); }
  defineJobs();
  for (let k = 0; k < 22; k++) { const name = PEDS[k % PEDS.length], obj = place(name, 0, 0, { h: 1.55 + hash(k) * 0.25 }, 0); const p = { obj, adult: /citizen-[cde]$/.test(name), u: 0, dir: k % 2 ? 1 : -1, sp: 1.3 + hash(k + 3) * 0.9, dodge: 0, x: 0, z: 0, h: 0 }; peds.push(p); pedSpawn(p); if (k < 8) { p.b = blocks[Math.floor(hash(k + 20) * 36)]; pedPos(p); } }
  // shield badges: on pavements, in the park, on the beach, in the air past each ramp, at the end of the pier
  const spots = [];
  blocks.forEach((B, n) => { if (n % 2 === 0) spots.push([B.x + (hash(n) > 0.5 ? 21.5 : -21.5), B.z + (hash(n + 1) - 0.5) * 30, 0]); });
  const pk = blocks[PLACE.park[1] * NB + PLACE.park[0]]; spots.push([pk.x + 7, pk.z + 7, 0], [pk.x - 12, pk.z - 9, 0]);
  for (let k = 0; k < 5; k++) spots.push([-150 + k * 75 + 10, SAND - 5, 0]);
  ramps.forEach(R => spots.push([R.x + R.dir * 12, R.z, 3.2]));
  spots.push([0, PIER - 14, 0], [-LIM + 3, 60, 0], [LIM - 3, -LIM + 3, 0]);
  spots.forEach(([x, z, air], n) => { const obj = place('shield', x, z, { h: 0.95 }, 0); const h = sprite(0xffe08a, 2.2, true); h.position.y = 0.5; h.scale.set(2.4, 2.4, 1); obj.add(h); badgeObjs.push({ n, x, z, y: (air || groundY(x, z)) + 1.3, obj, got: false }); });
}
function start(d) {
  audio(); if (!radioTimer) radioTimer = setInterval(radioTick, 90);
  g.done = d ? d.done.filter(id => JOBS.includes(id)) : []; g.badges = d ? d.badges.filter(n => n < badgeObjs.length) : []; g.msgs = d ? (d.msgs || []) : []; g.shards = d ? (d.shards || []) : []; g.trust = d ? clamp(+d.trust || 0, 0, 12) : 5; g.ending = d ? d.ending || null : null; g.pts = d ? +d.pts || 0 : 0; if (!d) save();
  badgeObjs.forEach(b => { b.got = g.badges.includes(b.n); b.obj.visible = !b.got; }); shardObjs.forEach(b => { b.got = g.shards.includes(b.n); b.obj.visible = !b.got; });
  g.mode = 'play'; g.busy = null; g.job = null; g.snap = true; homes(); $('ov-title').hidden = true; $('hud').hidden = false; $('h-pts').textContent = g.pts; hint(); paintGoal();
  if (!g.done.length) startJob('j1');
}
$('b-start').onclick = () => start(null); $('b-cont').onclick = () => start(load());
let assetsDone = false; manager.onLoad = () => { assetsDone = true; };
const assetsReady = new Promise(res => { const t = setInterval(() => { if (assetsDone) { clearInterval(t); res(); } }, 60); });
Promise.all([storyReady, assetsReady]).then(() => {
  if (loadFailed || NAMES.some(n => !M[n])) { $('t-load').textContent = ST.ui.loadErr; return; }
  build(); $('ov-load').hidden = true; $('ov-title').hidden = false; g.mode = 'title';
  const d = load(), has = d && (d.done.length || d.badges.length); $('b-cont').hidden = !has; $('b-start').textContent = has ? ST.ui.fresh : ST.ui.start; $('b-start').classList.toggle('ghost', !!has); (has ? $('b-cont') : $('b-start')).focus();
  g.snap = true;
}).catch(e => { console.error(e); window.__kcErr = String(e && e.stack || e); $('t-load').textContent = 'Could not load. Please reload the page.'; });

let last = performance.now();
renderer.setAnimationLoop(() => { const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; if (!document.hidden && g.mode !== 'loading' && !window.__kcManual) { update(dt); renderer.render(scene, camera); } });

// A view of the game and the player's own inputs, so a test can play it through.
window.KnightCity = {
  state: () => ({ mode: g.mode, busy: g.busy, x: me().x, z: me().z, y: me().y, h: g.car ? g.car.h : pl.h, inCar: g.car ? g.car.name : null, v: g.car ? g.car.vf : 0, job: g.job ? { id: g.job.id, live: g.job.live, i: g.job.i, t: cur() ? cur().t : null, n: DEF[g.job.id].length } : null, trust: g.trust, ending: g.ending, shards: g.shards.length, done: g.done.slice(), pts: g.pts, badges: g.badges.length, badgeTotal: badgeObjs.length,
    near: g.near ? g.near.kind : null, tod: g.tod, line: g.busy === 'dlg' && dlg.lines[dlg.i] ? (dlg.lines[dlg.i].c ? { choices: dlg.lines[dlg.i].c.slice() } : { who: dlg.lines[dlg.i].s }) : null, marks: mark.list.map(q => ({ x: q.x, z: q.z })), goal: $('h-goal').textContent }),
  step: (dt, n) => { for (let k = 0; k < (n || 1); k++) update(dt); }, render: () => renderer.render(scene, camera), key: (code, down) => { keys[code] = !!down; }, auto: a => { g.auto = a; }, act, choose,
  tp: (x, z, h) => { const m = me(); m.x = x; m.z = z; if (h !== undefined) { m.h = h; g.camYaw = h; } if (g.car) { g.car.vf = 0; g.car.vl = 0; } g.snap = true; }, time: t => { g.tod = t; env.key = -1; },
  spots: () => beaconSpots, start: START, startJob, setDone: a => { g.done = a.slice(); homes(); paintGoal(); }, shardsAt: () => shardObjs.map(b => ({ x: b.x, z: b.z, got: b.got })), actors: () => Object.values(actors).filter(a => !a.gone).map(a => ({ id: a.id, x: a.x, z: a.z })), cars: () => cars.map(c => ({ name: c.name, kind: c.kind, x: c.x, z: c.z, h: c.h, v: c.vf })), kiosks: () => kiosks.map(k => ({ x: k.x, z: k.z })), drones: () => drones.map(d => ({ x: d.c.x, z: d.c.z, alive: d.alive })), peds: () => peds.map(p => ({ x: p.x, z: p.z })),
  models: M, THREE, cam: (x, y, z, lx, ly, lz, fov) => { window.__kcManual = true; camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); camera.fov = fov || 60; camera.updateProjectionMatrix(); for (const q of far) q.o.visible = true; scene.fog.near = 400; scene.fog.far = 1500; renderer.render(scene, camera); }, info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }), msg: () => { g.msgT = 0; }, groundY, view: (name, yaw) => { scene.traverse(o => { if (o.userData.dbg) o.visible = false; }); world.visible = false; const o = M[name].clone(); o.userData.dbg = true; o.scale.setScalar(4); o.position.set(0, 500, 0); scene.add(o); window.__kcManual = true; camera.position.set(Math.sin(yaw || 0.5) * 8, 504, Math.cos(yaw || 0.5) * 8); camera.lookAt(0, 502, 0); camera.fov = 50; camera.updateProjectionMatrix(); scene.fog.near = 900; scene.fog.far = 1000; renderer.render(scene, camera); return M[name].userData.size; }
};
