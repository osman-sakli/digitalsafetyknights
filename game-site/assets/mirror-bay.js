/* Mirror Bay — an open harbour town to walk, drive and sail around, and a
   story about fakes: an app that can make a video of anyone saying anything.
   Osman asked for Knight City again "at twice the quality, with a different
   story". What is new under the hood: people with skeletons who really walk
   and run, cars whose wheels turn, real shadows, a sea you can take a boat
   out on, screens in the streets that play the fake clips, and a route line
   to wherever the job is.

   The town is a 7x7 grid of blocks (three of them are a canal). Everything is
   placed by rule from MAP, so the mini-map, the traffic lanes and the
   colliders all come from the same numbers. Words live in
   content/story/mirror-bay[-xx].json and mirror-bay-talk[-xx].json. */
import * as THREE from '/assets/lib/three-0.170.0/three.module.min.js';
import { GLTFLoader } from '/assets/lib/three-0.170.0/GLTFLoader.js';
import { clone as skClone } from '/assets/lib/three-0.170.0/SkeletonUtils.js';

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
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
window.addEventListener('error', e => { window.__mbErr = (window.__mbErr || '') + ' | ' + e.message; });

/* ───────────── words ───────────── */
let ST = null;
const BUST = '?t=' + Math.floor(Date.now() / 3600000);
const storyFile = (l, part) => '/content/story/mirror-bay' + part + (l === 'en' ? '' : '-' + l) + '.json' + BUST;
const getJSON = part => fetch(storyFile(lang, part)).then(r => { if (!r.ok) throw 0; return r.json(); }).catch(() => fetch(storyFile('en', part)).then(r => r.json()));
const storyReady = getJSON('').then(d => { ST = d; paintWords(); })
  .then(() => getJSON('-talk').then(t => { ST.talk = t; }).catch(() => { ST.talk = { who: {}, warm: {}, cold: [], after: [] }; }));
// which answer is right is decided here, by position, so a translation can't move it
const RIGHT = 0;
function paintWords() {
  const U = ST.ui, T = (id, k) => { $(id).textContent = U[k]; };
  document.title = U.title + ' — Digital Safety Knights';
  T('l-title', 'title'); T('t-title', 'title'); T('t-tag', 'tag'); T('t-how', 'how'); T('b-start', 'start'); T('b-cont', 'cont');
  T('b-arc1', 'arcade'); T('t-back-l', 'back'); $('t-back').setAttribute('aria-label', U.back);
  T('t-load', 'loading'); T('t-nogl', 'noGL'); T('b-nogl', 'noGLbtn'); T('d-nx', 'next'); $('b-phone').setAttribute('aria-label', U.phone);
  T('ph-map', 'tabMap'); T('ph-jobs', 'tabJobs'); T('ph-msgs', 'tabMsgs'); T('ph-notes', 'tabNotes'); T('ph-help', 'tabHelp'); T('ph-x', 'close');
  T('e-do', 'endDo'); T('b-keep', 'endKeep'); T('sp-u', 'kmh'); T('bn-retry', 'retry'); T('bn-ok', 'next');
}

/* ───────────── how hard to push the machine ─────────────
   Three levels. "auto" starts in the middle and moves once, after watching
   the first seconds of play; a child on an old phone should still get a game. */
const QUAL = { low: { pr: 1, shadow: 0, far: 250 }, mid: { pr: 1.3, shadow: 1024, far: 330 }, high: { pr: 1.75, shadow: 2048, far: 400 } };
let qPref = 'auto'; try { qPref = localStorage.getItem('dsk_bay_q') || 'auto'; } catch (e) {}
let qNow = qPref === 'auto' ? (fine ? 'mid' : 'low') : qPref;
const probe = { t: 0, n: 0, done: qPref !== 'auto' };

/* ───────────── renderer, sky, light ───────────── */
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' }); }
catch (e) { $('ov-load').hidden = true; $('ov-nogl').hidden = false; throw e; }
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfe3f5, 110, 400);
const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 1400);
const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8f7a, 2); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d6, 2.2); scene.add(sun); scene.add(sun.target);
sun.shadow.camera.left = sun.shadow.camera.bottom = -75; sun.shadow.camera.right = sun.shadow.camera.top = 75; sun.shadow.camera.near = 10; sun.shadow.camera.far = 420; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
const lamp = new THREE.PointLight(0xffd9a0, 0, 28, 1.4); scene.add(lamp);   // after dark, a pool of warm light travels with you so faces can be seen
function applyQuality() {
  const Q = QUAL[qNow]; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr));
  renderer.shadowMap.enabled = Q.shadow > 0; sun.castShadow = Q.shadow > 0;
  if (Q.shadow && sun.shadow.mapSize.x !== Q.shadow) { sun.shadow.mapSize.set(Q.shadow, Q.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  scene.traverse(o => { if (o.material && o.material.isMaterial) o.material.needsUpdate = true; });
  if (typeof resize === 'function' && renderer.domElement.width) resize();
}
const skyC = document.createElement('canvas'); skyC.width = 4; skyC.height = 256;
const skyT = new THREE.CanvasTexture(skyC); skyT.colorSpace = THREE.SRGBColorSpace; scene.background = skyT;
function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 2, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const SOFT = glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
const DOT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 26, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.arc(32, 32, 31, 0, 7); x.fill(); return new THREE.CanvasTexture(c); })();
const sprite = (color, size, add, fog) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: fog !== false })); s.scale.set(size, size, 1); return s; };
// the day: skies to blend between (top, middle, horizon), light and fog for each
const C = h => new THREE.Color(h);
const NIGHT = { sky: [C(0x030817), C(0x0a1740), C(0x23305f)], fog: C(0x141d3d), sun: C(0xa9bcff), sunI: 0.75, hemi: 1.4, hs: C(0x9fb2ff), hg: C(0x2a2f4a), night: 1 };
const NOON = { sky: [C(0x1c74e0), C(0x66b8f5), C(0xc9ecfb)], fog: C(0xbfe3f5), sun: C(0xfff2d6), sunI: 2.4, hemi: 1.9, hs: C(0xffffff), hg: C(0x8a8f7a), night: 0 };
const DAY = [
  Object.assign({ at: 0.00 }, NIGHT),
  { at: 0.22, sky: [C(0x1b2a6b), C(0x8a5fa0), C(0xffb37a)], fog: C(0xd9a08d), sun: C(0xffb27a), sunI: 1.3, hemi: 1.2, hs: C(0xffd9c2), hg: C(0x5a4a44), night: 0.45 },
  Object.assign({ at: 0.32 }, NOON), Object.assign({ at: 0.66 }, NOON),
  { at: 0.78, sky: [C(0x2a2a7a), C(0xd0559a), C(0xffa24d)], fog: C(0xe08f86), sun: C(0xff9a5a), sunI: 1.6, hemi: 1.25, hs: C(0xffc9d6), hg: C(0x4a3a4a), night: 0.5 },
  Object.assign({ at: 0.88 }, NIGHT), Object.assign({ at: 1.00 }, NIGHT)
];
const GREY = C(0x8793a3);
const skyMix = [C(0), C(0), C(0)], env = { night: 0, key: -1, rain: 0, sunDir: new THREE.Vector3(0.4, 0.8, 0.4) };
const sunDisc = sprite(0xfff3c4, 130, true, false), stars = (() => {
  const n = 520, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, el = 0.1 + Math.random() * 1.35, r = 900; pos[i * 3] = Math.cos(a) * Math.cos(el) * r; pos[i * 3 + 1] = Math.sin(el) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(el) * r; }
  const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(ge, new THREE.PointsMaterial({ color: 0xfff6e0, size: 2.2, fog: false, transparent: true, opacity: 0, sizeAttenuation: false }));
})();
scene.add(sunDisc, stars);
const clouds = [];
for (let i = 0; i < 18; i++) { const s = sprite(0xffffff, 1, false, false); const w = rnd(140, 260); s.scale.set(w, w * 0.36, 1); s.material.opacity = 0.75; s.position.set(rnd(-900, 900), rnd(170, 260), rnd(-900, 900)); scene.add(s); clouds.push(s); }
const litMats = [];   // building materials that glow a little at night
let water = null;     // the sea's material; its colour follows the sky and how clearly the town sees
function paintDay(tod) {
  let i = 0; while (i < DAY.length - 2 && tod >= DAY[i + 1].at) i++;
  const A = DAY[i], B = DAY[i + 1], k = clamp((tod - A.at) / (B.at - A.at), 0, 1), L = (a, b) => a + (b - a) * k;
  env.night = L(A.night, B.night);
  const ang = (tod - 0.25) * Math.PI * 2, sx = Math.cos(ang), sy = Math.sin(ang);
  const up = env.night > 0.9 ? 0.6 : Math.max(0.3, sy), tx = g.camT.x, tz = g.camT.z;
  env.sunDir.set(sx * 0.75, up, 0.45).normalize();
  sun.position.set(tx + env.sunDir.x * 160, env.sunDir.y * 160, tz + env.sunDir.z * 160); sun.target.position.set(tx, 0, tz);
  sunDisc.position.set(camera.position.x + sx * 760, sy * 520 + 30, camera.position.z + 480); sunDisc.material.opacity = clamp(sy * 3 + 0.4, 0, 1) * (1 - env.rain * 0.9);
  stars.position.copy(camera.position); stars.material.opacity = clamp(env.night * 1.4 - 0.4, 0, 1) * (1 - env.rain);
  const key = Math.round(tod * 600) + Math.round(env.rain * 40) * 1000 + Math.round(g.murk * 40) * 100000; if (key === env.key) return; env.key = key;
  const far = QUAL[qNow].far, r = env.rain;
  scene.fog.color.lerpColors(A.fog, B.fog, k).lerp(GREY, r * 0.75 * (1 - env.night * 0.7)); scene.fog.near = 110 - env.night * 40 - r * 60; scene.fog.far = far - env.night * 90 - r * 130;
  hemi.color.lerpColors(A.hs, B.hs, k); hemi.groundColor.lerpColors(A.hg, B.hg, k); hemi.intensity = L(A.hemi, B.hemi) * (1 - r * 0.2);
  sun.color.lerpColors(A.sun, B.sun, k); sun.intensity = L(A.sunI, B.sunI) * (1 - r * 0.65);
  skyMix.forEach((c, j) => c.lerpColors(A.sky[j], B.sky[j], k).lerp(GREY, r * 0.8 * (1 - env.night * 0.75)));
  const x = skyC.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#' + skyMix[0].getHexString()); gr.addColorStop(0.42, '#' + skyMix[1].getHexString()); gr.addColorStop(0.62, '#' + skyMix[2].getHexString()); gr.addColorStop(1, '#' + skyMix[2].getHexString());
  x.fillStyle = gr; x.fillRect(0, 0, 4, 256); skyT.needsUpdate = true;
  for (const m of litMats) m.emissiveIntensity = env.night * 0.45;
  for (const c of clouds) c.material.color.copy(skyMix[2]).lerp(C(0xffffff), (1 - env.night * 0.85) * (1 - r * 0.5));
  if (water) { const u = water.uniforms, m = g.murk;
    u.uShal.value.set(0x35c7d6).lerp(C(0x7d8f7a), m).multiplyScalar(1 - env.night * 0.8); u.uDeep.value.set(0x0b5fa8).lerp(C(0x4a5a52), m).multiplyScalar(1 - env.night * 0.82);
    u.uSky.value.copy(skyMix[2]); u.uSun.value.copy(sun.color).multiplyScalar(sun.intensity * 0.45); u.uSunDir.value.copy(env.sunDir); }
}

/* ───────────── loading: still models, people with skeletons ───────────── */
const manager = new THREE.LoadingManager();
manager.onProgress = (_u, d, t) => { $('ld').style.width = Math.round(d / t * 100) + '%'; };
const missing = [];
const gl = new GLTFLoader(manager), tl = new THREE.TextureLoader(manager);
const A = '/assets/arcade3d/', M = {}, R = {};
function tiled(name, rx, ry) { const t = tl.load(A + 'tex-' + name + '.webp'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; }
// every model: which way its front points as generated (turned here so front = +z)
const Q = Math.PI / 2;
const YAW = { 'car-taxi': -Q, 'car-pickup': Math.PI, 'b-house': Math.PI, 'b-school': -Q, 'b-cafe': -Q, 'b-library': Math.PI, ramp: -Q / 2, streetlamp: Math.PI, 'car-sport': -Q, 'car-mini': -Q, 'car-ice': -Q, 'boat-hero': -Q, barge: -Q, ferris: Q };
const CARS = ['car-hero', 'car-sedan', 'car-hatch', 'car-pickup', 'car-taxi', 'car-bus', 'car-van', 'car-sport', 'car-mini', 'car-ice', 'car-news'];
const NAMES = CARS.concat(['wheel', 'shield', 'boat', 'boat-hero', 'ferry', 'sailboat', 'barge',
  'b-glass', 'b-deco', 'b-office', 'b-apart', 'b-apart2', 'b-house', 'b-house2', 'b-house3', 'b-shop', 'b-cafe', 'b-arcade', 'b-library', 'b-school', 'b-hq',
  'b-townhall', 'b-studio', 'b-warehouse', 'b-cinema', 'b-bakery', 'b-gazette', 'b-ferry', 'b-row', 'b-row2', 'b-market',
  'palm', 'citytree', 'streetlamp', 'trafficlight', 'bench', 'hydrant', 'ramp', 'drone', 'parasol', 'fountain', 'flowers', 'lighthouse', 'crate',
  'ferris', 'carousel', 'tent', 'foodcart', 'stall', 'paperlantern', 'bigscreen', 'statue', 'crane', 'containers', 'buoy', 'cctv', 'rockisle', 'hedge', 'bin', 'mailbox', 'antenna', 'stage']);
const PEOPLE = ['shieldy', 'pixel', 'bot', 'dame', 'sprout', 'glitch', 'citizen-a', 'citizen-b', 'citizen-c', 'citizen-d', 'citizen-e', 'citizen-f', 'citizen-g', 'citizen-h', 'iris', 'kai', 'mina', 'vale', 'lila', 'tomas', 'captain', 'baker'];
const v3 = new THREE.Vector3(), v3b = new THREE.Vector3();
function skin(o, name) {
  o.geometry.computeVertexNormals(); const map = o.material.map; if (map) map.colorSpace = THREE.SRGBColorSpace;
  const car = name.startsWith('car-') || name.startsWith('boat');
  o.material = new THREE.MeshStandardMaterial({ map, roughness: car ? 0.36 : 0.72, metalness: car ? 0.25 : 0.04, color: 0xffffff });
  o.castShadow = !['flowers', 'hedge'].includes(name); o.receiveShadow = name.startsWith('b-') || name === 'rockisle' || name === 'barge' || name === 'stage';
}
function prep(gltf, name) {
  const root = gltf.scene, building = name.startsWith('b-');
  root.traverse(o => { if (!o.isMesh) return; skin(o, name);
    if (building) { o.material.emissiveMap = o.material.map; o.material.emissive = new THREE.Color(0xffe2b0); o.material.emissiveIntensity = 0; litMats.push(o.material); } });
  root.rotation.y = YAW[name] || 0;
  let b = new THREE.Box3().setFromObject(root); const sz = b.getSize(new THREE.Vector3()), s = 1 / sz.y;
  root.scale.setScalar(s); b = new THREE.Box3().setFromObject(root); const c = b.getCenter(new THREE.Vector3());
  root.position.set(-c.x, -b.min.y, -c.z);
  const grp = new THREE.Group(); grp.add(root); grp.userData.size = { x: sz.x * s, z: sz.z * s };
  if (name.startsWith('car-')) grp.userData.axles = findWheels(grp);
  return grp;
}
// where a car model's own (painted-on) wheels are, so turning ones can be put over them: look at the lowest part of the mesh
function findWheels(grp) {
  grp.updateMatrixWorld(true); const pts = [[], []], H = 0.07; let maxX = 0;
  grp.traverse(o => { if (!o.isMesh) return; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v3.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); if (v3.y < H) { pts[v3.z > 0 ? 0 : 1].push(v3.z); if (Math.abs(v3.x) > maxX) maxX = Math.abs(v3.x); } } });
  // a circle of radius r cut at height H has a chord of half-length c, so r = (c*c + H*H) / (2*H)
  return pts.map(a => { if (a.length < 6) return null; a.sort((p, q) => p - q); const lo = a[Math.floor(a.length * 0.05)], hi = a[Math.floor(a.length * 0.95)], c = (hi - lo) / 2; return { z: (lo + hi) / 2, r: clamp((c * c + H * H) / (2 * H), 0.16, 0.3), x: maxX }; });
}
// a person: skinned mesh, a walk and a run from the rig, and a standing pose made by averaging the walk (arms down, feet together)
function prepRig(gltf, name) {
  const root = gltf.scene; root.traverse(o => { if (o.isMesh) { skin(o, name); o.frustumCulled = false; } });
  root.rotation.y = YAW[name] || 0; root.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(root), clips = {};
  for (const c of gltf.animations) { const hips = c.tracks.find(t => /hips\.position$/i.test(t.name));
    if (hips) for (let i = 0; i < hips.values.length; i += 3) { hips.values[i] = hips.values[0]; hips.values[i + 2] = hips.values[2]; }   // walk on the spot; the game moves them
    clips[c.name] = c; }
  if (clips.walk) { const q0 = new THREE.Quaternion(), q = new THREE.Quaternion();
    clips.idle = new THREE.AnimationClip('idle', 2, clips.walk.tracks.map(t => { const n = t.getValueSize(), v = new Array(n).fill(0), cnt = t.values.length / n;
      if (n === 4) { q0.fromArray(t.values, 0); for (let i = 0; i < cnt; i++) { q.fromArray(t.values, i * 4); const s = q.dot(q0) < 0 ? -1 : 1; v[0] += q.x * s; v[1] += q.y * s; v[2] += q.z * s; v[3] += q.w * s; } q.fromArray(v).normalize().toArray(v); return new THREE.QuaternionKeyframeTrack(t.name, [0, 2], v.concat(v)); }
      for (let i = 0; i < cnt; i++) for (let k = 0; k < n; k++) v[k] += t.values[i * n + k] / cnt; return new THREE.VectorKeyframeTrack(t.name, [0, 2], v.concat(v)); })); }
  return { root, clips, height: b.max.y - b.min.y, minY: b.min.y };
}
NAMES.forEach(n => gl.load(A + n + '.glb', g2 => { M[n] = prep(g2, n); }, undefined, () => { missing.push(n); }));
PEOPLE.forEach(n => gl.load(A + 'r-' + n + '.glb', g2 => { R[n] = prepRig(g2, n); }, undefined, () => { missing.push('r-' + n); }));
function person(name, h) {   // one walking, running, standing figure
  const P = R[name], grp = new THREE.Group();
  if (!P || !P.clips.walk) { const o = (M[name] || M.shield).clone(); o.scale.setScalar(h); grp.add(o); return { g: grp, mixer: null, name, h }; }
  const o = skClone(P.root), s = h / P.height; o.scale.multiplyScalar(s); o.position.y = -P.minY * s; grp.add(o);
  const mixer = new THREE.AnimationMixer(o), act = {}, w = { idle: 1, walk: 0, run: 0 };
  for (const k of ['idle', 'walk', 'run']) { const c = P.clips[k] || P.clips.walk; act[k] = mixer.clipAction(c); act[k].play(); act[k].setEffectiveWeight(w[k]); }
  const bones = {}; o.traverse(q => { if (q.isBone) bones[q.name] = q; });
  mixer.update(0); return { g: grp, mixer, act, w, name, h, bones, o };
}
function animate(p, want, rate, dt) {   // blend toward standing, walking or running
  if (!p.mixer) { p.g.children[0].position.y = want === 'idle' ? 0 : Math.abs(Math.sin(g.t * 9 + p.h * 7)) * 0.1; return; }
  for (const k in p.w) { p.w[k] += ((k === want ? 1 : 0) - p.w[k]) * Math.min(1, dt * 9); p.act[k].setEffectiveWeight(p.w[k]); }
  p.act[want].timeScale = rate; p.mixer.update(dt);
}

/* ───────────── the town plan ───────────── */
const PITCH = 60, NB = 7, ROAD = 12, HB = (PITCH - ROAD) / 2, EDGE = PITCH * NB / 2, SLAB = 0.2;
const roadC = k => -EDGE + k * PITCH, blockC = i => -EDGE + PITCH / 2 + i * PITCH;
/* rows north to south. h houses, a flats, o office, g glass tower, d deco tower, m shops, p park, s school, l library, q Knight HQ, r arcade, t beach hotel,
   C Clock Square, S the BayBuzz studio, w canal, c cinema, K market, Z the Gazette, F and G the fairground, R and B canal-side houses (B has the bakery), H and I the harbour */
const MAP = ['hhshphh', 'hamlahh', 'amCogah', 'mogSdma', 'raZwcaq', 'hKawmFG', 'taRwBHI'];
const PLACE = { hq: [6, 4], library: [3, 1], school: [2, 0], park: [4, 0], arcade: [0, 4], square: [2, 2], studio: [3, 3], cinema: [4, 4], market: [1, 5], gazette: [2, 4],
  fair: [5, 5], fair2: [6, 5], bakery: [4, 6], depot: [5, 6], ferry: [6, 6], sprout: [0, 0], kai: [6, 0], tomas: [5, 1], hotel: [0, 6] };
const LIM = EDGE + 12, SHORE = EDGE + 12, SAND = SHORE + 40, QUAY = SHORE + 28, MOUTH = 24;
const ISLE = { x: -170, z: 430, r: 27 }, BARGE = { x: 190, z: 440 }, SEA = 620;
// ground that is not part of the grid: { rect or circle, height, whether a car may go there }
const ZONES = [
  { x0: -LIM, x1: -MOUTH - 4, z0: SHORE, z1: SAND, y: 0.05, car: true, kind: 'sand' }, { x0: MOUTH + 4, x1: LIM, z0: SHORE, z1: QUAY, y: SLAB, car: true, kind: 'quay' },
  { x0: 86, x1: 94, z0: QUAY, z1: QUAY + 38, y: SLAB, kind: 'jetty' }, { x0: 146, x1: 156, z0: QUAY, z1: QUAY + 42, y: SLAB, kind: 'jetty' }, { x0: -126, x1: -114, z0: SAND, z1: SAND + 46, y: SLAB, kind: 'jetty' },
  { c: 1, x: ISLE.x, z: ISLE.z, r: ISLE.r, y: 0.5, kind: 'isle' }, { x0: ISLE.x - 3, x1: ISLE.x + 3, z0: ISLE.z - ISLE.r - 17, z1: ISLE.z - ISLE.r + 2, y: 0.4, kind: 'jetty' }
];
// where a boat can be tied up, and where you step ashore from it
const MOORS = [{ id: 'quay', bx: 99, bz: QUAY + 30, h: 0, lx: 92, lz: QUAY + 30 }, { id: 'isle', bx: ISLE.x + 8, bz: ISLE.z - ISLE.r - 10, h: Math.PI, lx: ISLE.x + 1, lz: ISLE.z - ISLE.r - 10 },
  { id: 'pier', bx: -109, bz: SAND + 38, h: 0, lx: -116, lz: SAND + 38 }];
const blocks = [];   // { i, j, x, z, type, group, rects: [], circles: [] }
const blockAt = (x, z) => { const i = Math.floor((x + EDGE) / PITCH), j = Math.floor((z + EDGE) / PITCH); return i >= 0 && i < NB && j >= 0 && j < NB ? blocks[j * NB + i] : null; };
const onSlab = (x, z) => { const i = Math.floor((x + EDGE) / PITCH), j = Math.floor((z + EDGE) / PITCH); if (i < 0 || i >= NB || j < 0 || j >= NB) return Math.abs(x) > EDGE + 6 || Math.abs(z) > EDGE + 6; return Math.abs(x - blockC(i)) < HB && Math.abs(z - blockC(j)) < HB; };
const groundY = (x, z) => onSlab(x, z) ? SLAB : 0;
const zoneAt = (x, z) => { for (const q of ZONES) if (q.c ? dist(x, z, q.x, q.z) < q.r : (x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1)) return q; return null; };
function land(x, z) {   // how high the ground is here, or null where it is water
  if (Math.abs(x) <= LIM && z >= -LIM && z <= SHORE) return z > EDGE + 6 && Math.abs(x) < MOUTH ? null : groundY(x, z);
  const q = zoneAt(x, z); return q ? q.y : null;
}
const carOK = (x, z) => (Math.abs(x) <= LIM && z >= -LIM && z <= SHORE) ? !(z > EDGE + 6 && Math.abs(x) < MOUTH) : !!(zoneAt(x, z) || {}).car;
const seaOK = (x, z) => land(x, z) === null && Math.abs(x) < SEA && z > -SEA && z < SEA + 140 && !(Math.abs(x) < MOUTH + 6 && z < EDGE + 12);
const extra = { rects: [], circles: [] };   // solid things outside the blocks (beach, quay, island)
const world = new THREE.Group(); scene.add(world);
const far = [];   // { o, x, z, r } things hidden when far away or behind the camera

function place(name, x, z, opt, yaw, parent) {
  if (!M[name]) name = 'crate';
  const o = M[name].clone(), sz = M[name].userData.size;
  let s = opt.h || 1; if (opt.fit) s = opt.fit / Math.max(sz.x, sz.z);
  o.scale.setScalar(s); if (opt.minH && s < opt.minH) o.scale.y = Math.min(opt.minH, s * 1.7); if (opt.maxH && s > opt.maxH) o.scale.y = opt.maxH;
  o.position.set(x, opt.y || 0, z); o.rotation.y = yaw || 0;
  const q = Math.abs(Math.round((yaw || 0) / (Math.PI / 2))) % 2;
  o.userData.half = { x: (q ? sz.z : sz.x) * s / 2, z: (q ? sz.x : sz.z) * s / 2 }; o.userData.top = o.scale.y;
  (parent || world).add(o); return o;
}
// a set of flat rectangles as one mesh, textured by where they are in the world so neighbours line up
function quads(list, y, map, per, parent, color) {
  const pos = [], uv = [], idx = [];
  list.forEach(([x0, z0, x1, z1], n) => { pos.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1); uv.push(x0 / per, -z0 / per, x1 / per, -z0 / per, x1 / per, -z1 / per, x0 / per, -z1 / per); idx.push(n * 4, n * 4 + 2, n * 4 + 1, n * 4, n * 4 + 3, n * 4 + 2); });
  const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); ge.setIndex(idx); ge.computeVertexNormals();
  const m = new THREE.Mesh(ge, new THREE.MeshStandardMaterial({ map: map || null, color: color || 0xffffff, roughness: 0.94 })); m.receiveShadow = true; (parent || world).add(m); return m;
}
const flat = (w, l, map, x, z, y, parent, color) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshStandardMaterial({ map: map || null, color: color || 0xffffff, roughness: 0.95 })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; (parent || world).add(m); return m; };
const TEX = {};
const parkSpots = [], beaconSpots = {}, lampGlows = [], bobbers = [], ramps = [], screens = [], spinners = [], lampPools = [];
const posts = [];   // every little post (railings, pier) goes into one instanced mesh
let lanterns = null, wheelObj = null;

function buildTown() {
  TEX.asphalt = tiled('asphalt', 1, 1); TEX.pavers = tiled('pavers', 1, 1); TEX.concrete = tiled('concrete', 1, 1); TEX.sand = tiled('sand', 1, 1); TEX.planks = tiled('planks', 1, 1); TEX.cobble = tiled('cobble', 5, 5);
  // the sea: one big sheet with moving waves; its colour is set in paintDay
  water = new THREE.ShaderMaterial({ fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 }, uDeep: { value: C(0x0b5fa8) }, uShal: { value: C(0x35c7d6) }, uSky: { value: C(0xc9ecfb) }, uSun: { value: C(0xffffff) }, uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.4) } }]),
    vertexShader: 'varying vec3 vW;\n#include <fog_pars_vertex>\nvoid main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader: 'uniform float uT; uniform vec3 uDeep, uShal, uSun, uSky, uSunDir; varying vec3 vW;\n#include <fog_pars_fragment>\n' +
      'float hgt(vec2 p){ return sin(dot(p, vec2(0.21, 0.17))+uT*0.9)+0.8*sin(dot(p, vec2(-0.13, 0.31))-uT*1.1)+0.55*sin(dot(p, vec2(0.47, -0.29))+uT*1.6)+0.35*sin(dot(p, vec2(-0.71, -0.53))-uT*2.2)+0.2*sin(dot(p, vec2(1.3, 0.9))+uT*3.1); }\n' +
      'void main(){ vec2 p = vW.xz; float e = 0.4, c = hgt(p); vec3 n = normalize(vec3(hgt(p-vec2(e,0.))-hgt(p+vec2(e,0.)), 3.4, hgt(p-vec2(0.,e))-hgt(p+vec2(0.,e))));\n' +
      ' float far = clamp(55.0/distance(cameraPosition, vW), 0.0, 1.0); n = normalize(mix(vec3(0.0, 1.0, 0.0), n, far)); c *= far;\n' +
      ' vec3 v = normalize(cameraPosition - vW); float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0); vec3 col = mix(uShal, uDeep, clamp(0.5 + c*0.1, 0.0, 1.0)); col = mix(col, uSky, fr*0.42);\n' +
      ' float sp = pow(max(dot(reflect(-uSunDir, n), v), 0.0), 80.0); col += uSun*sp; col += uSky*smoothstep(1.9, 2.7, c)*0.12;\n' +
      ' gl_FragColor = vec4(col, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n#include <fog_fragment>\n}' });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3600, 3600), water); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.9; world.add(sea);
  // roads: full-length east-west strips, and north-south pieces between them
  const road = [];
  for (let l = 0; l <= NB; l++) { if (l === NB) road.push([-EDGE - 6, roadC(l) - 6, EDGE + 6, roadC(l) + 6]); else road.push([-EDGE - 6, roadC(l) - 6, EDGE + 6, roadC(l) + 6]); }
  for (let k = 0; k <= NB; k++) for (let l = 0; l < NB; l++) road.push([roadC(k) - 6, roadC(l) + 6, roadC(k) + 6, roadC(l + 1) - 6]);
  TEX.road = quads(road, 0, TEX.asphalt, 6.8);
  const paveM = new THREE.MeshStandardMaterial({ map: tiled('pavers', 8, 8), roughness: 0.9 }), sideM = new THREE.MeshStandardMaterial({ color: 0xb9b3a6, roughness: 0.95 });
  const slabG = new THREE.BoxGeometry(HB * 2, 1.4, HB * 2);
  const box = (w, h, d, mats, x, y, z, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats); m.position.set(x, y, z); m.receiveShadow = true; (parent || world).add(m); return m; };
  const six = m => [sideM, sideM, m, sideM, sideM, sideM], mat = (t, rx, ry) => { const q = TEX[t].clone(); q.repeat.set(rx, ry); q.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: q, roughness: 0.92 }); };
  // the sea wall walk round the town; to the south it is the promenade, cut where the canal meets the bay
  box(EDGE * 2 + 24, 1.4, 6, six(mat('pavers', 70, 2)), 0, SLAB - 0.7, -EDGE - 9);
  box(6, 1.4, EDGE * 2 + 12, six(mat('pavers', 2, 70)), -EDGE - 9, SLAB - 0.7, 0); box(6, 1.4, EDGE * 2 + 12, six(mat('pavers', 2, 70)), EDGE + 9, SLAB - 0.7, 0);
  const pw = LIM - MOUTH; [-1, 1].forEach(sd => box(pw, 1.4, 6, six(mat('pavers', 32, 2)), sd * (MOUTH + pw / 2), SLAB - 0.7, EDGE + 9));
  // beach, quay, jetties, pier, island
  box(LIM - MOUTH - 4, 1.4, SAND - SHORE, six(mat('sand', 22, 5)), -(LIM + MOUTH + 4) / 2, -0.65, (SAND + SHORE) / 2);
  box(LIM - MOUTH - 4, 1.6, QUAY - SHORE, six(mat('concrete', 22, 3.5)), (LIM + MOUTH + 4) / 2, SLAB - 0.8, (QUAY + SHORE) / 2);
  ZONES.filter(q => q.kind === 'jetty').forEach(q => { const w = q.x1 - q.x0, l = q.z1 - q.z0, cx = (q.x0 + q.x1) / 2; box(w, 0.5, l, six(mat('planks', w / 5, l / 5)), cx, q.y - 0.25, (q.z0 + q.z1) / 2);
    for (let z = q.z0 + 2; z < q.z1; z += 4.5) [q.x0 + 0.3, q.x1 - 0.3].forEach((x, s) => { posts.push([x, -1, z, 0.2, 2.1 + q.y]); if (Math.round(z - q.z0) % 9 < 4.5 && s === 0) { const h = sprite(0xffd890, 2.4, true); h.position.set(x, q.y + 1.4, z); world.add(h); lampGlows.push(h); } }); });
  { const isle = new THREE.Group(); world.add(isle); const top = new THREE.Mesh(new THREE.CylinderGeometry(ISLE.r, ISLE.r + 3, 1.6, 40), [new THREE.MeshStandardMaterial({ color: 0x8c8676, roughness: 1 }), new THREE.MeshStandardMaterial({ map: tiled('grass', 9, 9), roughness: 1 }), sideM]); top.position.set(ISLE.x, -0.3, ISLE.z); top.receiveShadow = true; isle.add(top);
    for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283 + 0.9; if (Math.abs(angDiff(a, -Math.PI / 2)) < 0.45) continue; const x = ISLE.x + Math.cos(a) * (ISLE.r - 2), z = ISLE.z + Math.sin(a) * (ISLE.r - 2); place('rockisle', x, z, { h: 6 + hash(k) * 4, y: -1 }, hash(k + 3) * 6, isle); extra.circles.push({ x, z, r: 4.2 }); }
    place('lighthouse', ISLE.x - 4, ISLE.z + 4, { h: 27, y: 0.4 }, 0, isle); extra.circles.push({ x: ISLE.x - 4, z: ISLE.z + 4, r: 5 });
    const b = sprite(0xfff0b0, 16, true, false); b.position.set(ISLE.x - 4, 24, ISLE.z + 4); isle.add(b); lampGlows.push(b);
    place('cctv', ISLE.x + 9, ISLE.z - 6, { h: 6, y: 0.5 }, 2.4, isle); place('bench', ISLE.x + 6, ISLE.z + 10, { h: 1, y: 0.5 }, 2.2, isle); place('palm', ISLE.x + 14, ISLE.z + 8, { h: 9, y: 0.5 }, 1, isle); place('palm', ISLE.x - 16, ISLE.z - 6, { h: 10, y: 0.5 }, 2, isle);
    far.push({ o: isle, x: ISLE.x, z: ISLE.z, r: 60 }); }
  // road paint: one instanced strip mesh for every dash and stop line
  const marks = [];
  for (let k = 0; k <= NB; k++) for (let s = 0; s < NB; s++) for (let d = 0; d < 7; d++) { const a = roadC(s) + 9 + d * 6.2; marks.push([roadC(k), a + 1.6, 0.28, 3.2, 0xf2c94c], [a + 1.6, roadC(k), 3.2, 0.28, 0xf2c94c]); }
  for (let k = 0; k <= NB; k++) for (let l = 0; l <= NB; l++) { const x = roadC(k), z = roadC(l);
    if (l > 0) marks.push([x + 3, z - 7.2, 5.4, 0.5, 0xffffff]); if (l < NB) marks.push([x - 3, z + 7.2, 5.4, 0.5, 0xffffff]);
    if (k > 0) marks.push([x - 7.2, z - 3, 0.5, 5.4, 0xffffff]); if (k < NB) marks.push([x + 7.2, z + 3, 0.5, 5.4, 0xffffff]); }
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), marks.length), d4 = new THREE.Object3D(), col = new THREE.Color();
  marks.forEach(([x, z, w, l, c], n) => { d4.position.set(x, 0.02, z); d4.rotation.x = -Math.PI / 2; d4.scale.set(w, l, 1); d4.updateMatrix(); im.setMatrixAt(n, d4.matrix); im.setColorAt(n, col.set(c)); });
  im.frustumCulled = false; world.add(im);

  const grassT = () => tiled('grass', 8, 8), plazaT = () => tiled('plaza', 6, 6), lanternPts = [];
  const screenAt = (o, B, x, z, yaw, h) => { const sc = { x: (B ? B.x : 0) + x, z: (B ? B.z : 0) + z, yaw, h }; screens.push(sc);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.7), screenMat); p.position.set(0, 0.61, 0.076); o.add(p); if (B) B.rects.push({ x0: sc.x - 3.4, x1: sc.x + 3.4, z0: sc.z - 3.4, z1: sc.z + 3.4, low: 1 }); };
  for (let j = 0; j < NB; j++) for (let i = 0; i < NB; i++) {
    const type = MAP[j][i], bx = blockC(i), bz = blockC(j), n = j * NB + i, grp = new THREE.Group();
    grp.position.set(bx, 0, bz); world.add(grp);
    const B = { i, j, x: bx, z: bz, type, group: grp, rects: [], circles: [] }; blocks.push(B);
    const Y = SLAB + 0.012;
    if (type === 'w') {   // a stretch of canal: quay walls, a rail, boats tied up
      B.rects.push({ x0: bx - HB + 0.3, x1: bx + HB - 0.3, z0: bz - HB + 0.3, z1: bz + HB - 0.3 });
      const wm = new THREE.MeshStandardMaterial({ color: 0x9b958a, roughness: 0.95 }), rm = new THREE.MeshStandardMaterial({ color: 0x24324f, roughness: 0.6, metalness: 0.3 });
      [[0, -HB + 0.3, HB * 2, 0.6], [0, HB - 0.3, HB * 2, 0.6], [-HB + 0.3, 0, 0.6, HB * 2], [HB - 0.3, 0, 0.6, HB * 2]].forEach(([x, z, w, l], k) => { if (j === NB - 1 && k === 1) return; const m = box(w, 1.7, l, wm, x, -0.55, z, grp); m.castShadow = true; const r = box(Math.max(w, 0.09) - (w > 1 ? 0.6 : 0.51), 0.09, Math.max(l, 0.09) - (l > 1 ? 0.6 : 0.51), rm, x, 1.25, z, grp); r.castShadow = false;
        for (let a = -HB + 0.6; a <= HB - 0.5; a += 3.9) posts.push(w > 1 ? [bx + a, 0.3, bz + z, 0.09, 0.95] : [bx + x, 0.3, bz + a, 0.09, 0.95]); });
      [[-15, -10, 0.2, 'boat'], [15, 6, 3.3, 'sailboat'], [-14, 14, 0.1, 'boat']].forEach(([x, z, r, nm], k) => { if ((k + j) % 3 === 2) return; const o = place(nm, x, z, nm === 'boat' ? { h: 2.1, y: -0.95 } : { h: 7, y: -1 }, r, grp); bobbers.push({ o, y: o.position.y, k: n + k }); });
      far.push({ o: grp, x: bx, z: bz, r: 44 }); continue; }
    const slab = new THREE.Mesh(slabG, [sideM, sideM, paveM, sideM, sideM, sideM]); slab.position.set(bx, SLAB - 0.7, bz); slab.receiveShadow = true; world.add(slab);
    const bld = (name, x, z, opt, yaw) => { const o = place(name, x, z, Object.assign({ y: SLAB }, typeof opt === 'number' ? { fit: opt } : opt), yaw, grp), h = o.userData.half; B.rects.push({ x0: bx + x - h.x * 0.92, x1: bx + x + h.x * 0.92, z0: bz + z - h.z * 0.92, z1: bz + z + h.z * 0.92 }); return o; };
    const thing = (name, x, z, h, r, yaw) => { const o = place(name, x, z, { h, y: SLAB }, yaw === undefined ? hash(n * 7 + x + z) * 6.28 : yaw, grp); if (r) B.circles.push({ x: bx + x, z: bz + z, r }); return o; };
    const lawn = (w, t) => flat(w, w, t, 0, 0, Y, grp);
    const tree = type === 't' ? 'palm' : 'citytree', th = type === 't' ? 10 : 6;
    if (type === 'h') { lawn(40, grassT()); const hs = ['b-house', 'b-house2', 'b-house3'];
      [[-12, -12], [12, -12], [-12, 12], [12, 12]].forEach(([x, z], k) => bld(hs[Math.floor(hash(n * 5 + k) * 3)], x, z, 15, z > 0 ? 0 : Math.PI));
      thing(tree, 0, -4, th, 0.5); thing(tree, 0, 6, th * 0.85, 0.5); thing('hedge', -2, 21, 1.3, 0.9, 0); thing('hedge', 3, -21, 1.3, 0.9, 0); if (hash(n * 3) > 0.4) thing('mailbox', 21.5, 4, 1.2, 0.3, Math.PI / 2); }
    else if (type === 'a') { lawn(40, plazaT()); bld(hash(n) > 0.5 ? 'b-apart' : 'b-apart2', -11.5, 0, { fit: 19, minH: 20 }, -Math.PI / 2); bld(hash(n + 3) > 0.5 ? 'b-apart2' : 'b-apart', 11.5, 0, { fit: 19, minH: 20 }, Math.PI / 2); thing('bin', 0, 20.5, 1.1, 0.4, 0); }
    else if (type === 'o' || type === 'g') { lawn(44, plazaT()); if (type === 'o') bld('b-office', 0, 0, { fit: 26, minH: 52 }, 0); else bld('b-glass', 0, 0, { fit: 24, minH: 58 + hash(n) * 22 }, 0);
      [[-18, 18], [18, 18], [-18, -18], [18, -18]].forEach(([x, z]) => thing('citytree', x, z, 5.5, 0.5)); thing('bench', -8, 20, 1, 0, 0); thing('bench', 8, 20, 1, 0, 0); }
    else if (type === 'd') { bld('b-deco', 0, -2, { fit: 26, minH: 40 }, 0); thing('palm', -17, 17, 9, 0.5); thing('palm', 17, 17, 10, 0.5); }
    else if (type === 'm') { lawn(40, plazaT()); [[-12, -12, 'b-shop'], [12, -12, 'b-cafe'], [-12, 12, 'b-cafe'], [12, 12, 'b-shop']].forEach(([x, z, nm]) => bld(nm, x, z, 16, z > 0 ? 0 : Math.PI)); thing('bench', 0, 0, 1, 0, 0); thing(tree, 0, -4, th, 0.5); thing('bin', 3, 2, 1.1, 0.4, 0); }
    else if (type === 'p') { lawn(44, grassT()); place('fountain', 0, 0, { fit: 9, y: SLAB }, 0, grp); B.circles.push({ x: bx, z: bz, r: 4.6 });
      for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; thing('citytree', Math.cos(a) * 18, Math.sin(a) * 18, 5.5 + hash(n + k) * 2.5, 0.5); }
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.78; thing('bench', Math.cos(a) * 8.5, Math.sin(a) * 8.5, 1, 0, -a + Math.PI / 2 + Math.PI); thing('flowers', Math.cos(a + 0.78) * 11, Math.sin(a + 0.78) * 11, 0.9, 1.1); } }
    else if (type === 's') { bld('b-school', 0, -4, { fit: 30, minH: 14 }, 0); thing(tree, -18, 16, th, 0.5); thing(tree, 18, 16, th, 0.5); screenAt(thing('bigscreen', -9, 17, 5.2, 0, 0.35), B, -9, 17, 0.35, 5.2); }
    else if (type === 'l') { bld('b-library', 0, -4, { fit: 30, minH: 15 }, 0); thing(tree, -18, 17, th, 0.5); thing(tree, 18, 17, th, 0.5); }
    else if (type === 'q') { bld('b-hq', 0, -9, { fit: 24, minH: 13 }, 0); flat(40, 16, TEX.asphalt.clone(), 0, 14, Y, grp).material.map.repeat.set(6, 2.4); thing('hedge', -19, 2, 1.4, 1, 0); thing('hedge', 19, 2, 1.4, 1, 0); }
    else if (type === 'r') { bld('b-arcade', -7, -7, { fit: 24, minH: 13 }, 0); bld('b-cafe', 14, 13, 14, 0); thing(tree, -17, 16, th, 0.5); }
    else if (type === 't') { lawn(40, plazaT()); bld('b-deco', 0, -3, { fit: 24, minH: 34 }, 0); thing('palm', -17, 15, 10, 0.5); thing('palm', 17, 15, 9, 0.5); thing('palm', -17, -15, 9, 0.5); thing('palm', 17, -15, 10, 0.5); thing('parasol', 9, 17, 2.3, 0.9); }
    else if (type === 'C') { flat(46, 46, TEX.cobble, 0, 0, Y, grp); bld('b-townhall', 0, -10, { h: 30 }, 0); thing('statue', -13, 10, 5, 1.6, 0.5);
      screenAt(thing('bigscreen', 13, 9, 7.5, 0, -0.5), B, 13, 9, -0.5, 7.5); thing('bench', -4, 20, 1, 0, 0); thing('bench', 4, 20, 1, 0, 0); thing('citytree', -20, -18, 6, 0.5); thing('citytree', 20, -18, 6, 0.5); thing('flowers', -19, 19, 1, 1); thing('flowers', 19, 19, 1, 1); }
    else if (type === 'S') { lawn(44, plazaT()); B.tower = bld('b-studio', 0, -3, { fit: 22, minH: 66 }, 0); screenAt(thing('bigscreen', -14, 17, 6.5, 0, 0.3), B, -14, 17, 0.3, 6.5); screenAt(thing('bigscreen', 14, 17, 6.5, 0, -0.3), B, 14, 17, -0.3, 6.5); thing('antenna', 19, -17, 9, 0.8); }
    else if (type === 'c') { lawn(44, plazaT()); bld('b-cinema', 0, -5, { fit: 27 }, 0); thing('citytree', -19, 17, 6, 0.5); thing('citytree', 19, 17, 6, 0.5); thing('cctv', 17, 9, 6, 0.3, -2.4); thing('bench', 0, 20, 1, 0, 0); }
    else if (type === 'K') { flat(46, 46, TEX.cobble, 0, 0, Y, grp); bld('b-market', 0, -8, { fit: 26 }, Q); [[-15, 9, 0.2], [-5, 13, -0.1], [6, 12, 0.15], [16, 8, -0.3]].forEach(([x, z, r]) => thing('stall', x, z, 3.6, 1.6, r)); thing('foodcart', 17, -17, 3, 1.2); thing('crate', -19, -3, 1.2, 0.9); screenAt(thing('bigscreen', -17, 19, 5, 0, 0.5), B, -17, 19, 0.5, 5); }
    else if (type === 'Z') { lawn(40, plazaT()); bld('b-gazette', -9, -8, { h: 17 }, 0); bld('b-row', 11, 9, { h: 14 }, Q); thing('citytree', -18, 16, 6, 0.5); thing('mailbox', -1, 2, 1.2, 0.3, 0); thing('bench', -10, 6, 1, 0, 0); }
    else if (type === 'F') { lawn(46, grassT()); const f = thing('ferris', 0, -9, 34, 0, 0); B.rects.push({ x0: bx - 12, x1: bx + 12, z0: bz - 13, z1: bz - 5 }); thing('tent', -14, 9, 8, 4.4, 0.4); thing('tent', 13, 12, 6.5, 3.6, 2.2); thing('foodcart', 0, 16, 3, 1.2, 0.3); thing('stall', -19, -18, 3.4, 1.5, 1.2); B.ferris = f; }
    else if (type === 'G') { lawn(46, grassT()); const c = thing('carousel', -8, 8, 9, 7.2, 0); spinners.push(c); const st = place('stage', 9, -13, { fit: 17, y: SLAB }, 0, grp), h = st.userData.half; B.rects.push({ x0: bx + 9 - h.x * 0.9, x1: bx + 9 + h.x * 0.9, z0: bz - 13 - h.z * 0.9, z1: bz - 13 + h.z * 0.4 });
      thing('tent', 16, 13, 6, 3.3, 4); thing('foodcart', -19, -14, 3, 1.2, 2); screenAt(thing('bigscreen', -10, -17, 6, 0, 0.2), B, -10, -17, 0.2, 6); }
    else if (type === 'R') { lawn(40, plazaT()); bld('b-row', 12, -12, { h: 14 }, Q); bld('b-row2', 12, 11, { h: 14 }, Q); bld('b-house2', -12, -12, 15, Math.PI); bld('b-house3', -12, 12, 15, 0); thing('citytree', -1, 0, 6, 0.5); }
    else if (type === 'B') { lawn(40, plazaT()); bld('b-row2', -12, -12, { h: 14 }, -Q); bld('b-bakery', 9, 11, { h: 9.5 }, 0); bld('b-shop', 13, -12, 15, Math.PI); thing('parasol', -11, 12, 2.3, 0.9); thing('parasol', -15, 17, 2.3, 0.9); thing('bench', -6, 19, 1, 0, 0); thing('citytree', -20, 2, 5.5, 0.5); }
    else if (type === 'H') { flat(46, 46, mat('concrete', 6, 6).map, 0, 0, Y, grp); B.shed = bld('b-warehouse', 0, -7, { fit: 34 }, 0); bld('containers', -16, 15, { h: 6.5 }, 0.0); bld('containers', 15, 16, { h: 6.5 }, Q); thing('crate', 2, 13, 1.3, 0.9); thing('crate', 4.4, 14, 1.3, 0.9); thing('cctv', -21, -20, 6, 0.3, 0.8); }
    else if (type === 'I') { lawn(46, plazaT()); bld('b-ferry', 0, -8, { h: 11 }, 0); thing('bench', -8, 6, 1, 0, 0); thing('bench', 8, 6, 1, 0, 0); thing('palm', -19, 17, 9, 0.5); thing('palm', 19, 17, 9, 0.5); thing('mailbox', 14, 3, 1.2, 0.3, 0); }
    // street things on every block: two lamps, a traffic light, a pool of light under each lamp after dark
    [[-21.6, -21.6], [21.6, 21.6]].forEach(([x, z], k) => { const o = thing('streetlamp', x, z, 5.6, 0.3, k ? Math.PI * 0.25 : -Math.PI * 0.75); const h = sprite(0xffe2a0, 5, true); h.position.set(0, 0.76, 0.2); h.scale.set(0.9, 0.9, 1); o.add(h); lampGlows.push(h); lampPools.push([bx + x * 1.06, bz + z * 1.06]); });
    thing('trafficlight', 22.2, 22.2, 5, 0.25, Math.PI / 4);
    if (hash(n * 13) > 0.5) thing('hydrant', -21.5, 12, 0.9, 0); if (hash(n * 17) > 0.6) thing('bench', 8, 21.4, 1, 0, 0);
    if ('ham'.includes(type)) { thing(tree, -21, 0, th, 0.5); thing(tree, 21, -6, th * 0.9, 0.5); }
    // strings of paper lanterns round the block; they come out as the festival gets nearer
    for (let sd = 0; sd < 4; sd++) for (let k = 0; k < 11; k++) { const a = -22 + k * 4.4, sag = 4.5 - Math.sin(k / 10 * Math.PI) * 0.9, e = 22.6; lanternPts.push([sd === 0 ? bx + a : sd === 1 ? bx + e : sd === 2 ? bx - a : bx - e, sag, sd === 0 ? bz - e : sd === 1 ? bz + a : sd === 2 ? bz + e : bz - a, dist(bx, bz, blockC(2), blockC(2)) + hash(n + sd) * 30, n * 4 + sd]); }
    far.push({ o: grp, x: bx, z: bz, r: 44 });
    if ((i + j * 2) % 3 === 0 && !'pqCKFGSw'.includes(type)) parkSpots.push({ x: bx + (type === 'h' ? 0 : 21), z: bz + (type === 'h' ? 21 : 13), h: type === 'h' ? Math.PI / 2 : 0 });
  }
  // lanterns: nearest the square first, so more of the town lights up as the story goes on
  { lanternPts.sort((a, b) => a[3] - b[3] || a[4] - b[4]); const n = lanternPts.length, pos = new Float32Array(n * 3), colr = new Float32Array(n * 3), pal = [C(0xff8a3c), C(0xffc84a), C(0xff5a6e), C(0xffa0c8), C(0x5fd6c8)];
    lanternPts.forEach((p, k) => { pos.set([p[0], p[1], p[2]], k * 3); const c = pal[Math.floor(hash(k * 3.3) * pal.length)]; colr.set([c.r, c.g, c.b], k * 3); });
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3)); ge.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    const body = new THREE.Points(ge, new THREE.PointsMaterial({ map: DOT, size: 1.25, vertexColors: true, transparent: true, alphaTest: 0.4, sizeAttenuation: true }));
    const glow = new THREE.Points(ge, new THREE.PointsMaterial({ map: SOFT, size: 3.4, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, sizeAttenuation: true }));
    // the string they hang on: each run of eleven along one side of a block is one line
    const lp = [], runs = {}; lanternPts.forEach((p, k) => { (runs[p[4]] = runs[p[4]] || []).push(p); });
    const order = Object.values(runs).sort((a, b) => a[0][3] - b[0][3]); order.forEach(r => { for (let k = 1; k < r.length; k++) lp.push(r[k - 1][0], r[k - 1][1] + 0.45, r[k - 1][2], r[k][0], r[k][1] + 0.45, r[k][2]); });
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); const line = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x2b2a33 })); line.frustumCulled = false; world.add(line); lg.setDrawRange(0, 0);
    body.frustumCulled = glow.frustumCulled = false; world.add(body, glow); lanterns = { ge, lg, body, glow, n, runs: order.length }; ge.setDrawRange(0, 0); }
  const P = (k, dx, dz) => { const [i, j] = PLACE[k]; return { x: blockC(i) + dx, z: blockC(j) + dz }; };
  Object.assign(beaconSpots, { hq: P('hq', 6, 21), library: P('library', 0, 21), school: P('school', 4, 21), park: P('park', 0, 21), arcade: P('arcade', -7, 21), square: P('square', 0, 17), studio: P('studio', 0, 21), cinema: P('cinema', 0, 21),
    market: P('market', 0, 20), gazette: P('gazette', -9, 4), fair: P('fair', 0, 21), fair2: P('fair2', 3, 4), carousel: P('fair2', -8, 19), bakery: P('bakery', 9, 21), depot: P('depot', 0, 21), ferry: P('ferry', 0, 8),
    sprout: P('sprout', 12, 21.4), kai: P('kai', -12, 21.4), tomas: P('tomas', 12, -21.4), hotel: P('hotel', 0, 21), quay: { x: 90, z: QUAY - 8 }, jetty: { x: 90, z: QUAY + 28 }, dock4: { x: 196, z: QUAY - 10 },
    beach: { x: -90, z: SHORE + 18 }, pier: { x: -120, z: SAND + 36 }, isle: { x: ISLE.x + 4, z: ISLE.z - 8 }, isleJetty: { x: ISLE.x, z: ISLE.z - ISLE.r - 8 }, barge: { x: BARGE.x, z: BARGE.z } });
  // the beach: palms, parasols, the fishing pier, stunt ramps
  const beach = new THREE.Group(); world.add(beach);
  for (let k = 0; k < 13; k++) { const x = -LIM + 8 + k * 14.2 + hash(k) * 5, z = SHORE + 5 + hash(k + 40) * 6; if (x > -MOUTH - 10) continue; place('palm', x, z, { h: 9 + hash(k + 9) * 3 }, hash(k) * 6, beach); extra.circles.push({ x, z, r: 0.5 }); }
  for (let k = 0; k < 7; k++) { const x = -LIM + 20 + k * 26 + hash(k + 70) * 8, z = SAND - 8 - hash(k + 5) * 6; if (x > -MOUTH - 8 || Math.abs(x + 120) < 10) continue; place('parasol', x, z, { h: 2.4 }, hash(k) * 6, beach); extra.circles.push({ x, z, r: 1 }); }
  [[-196, 0], [-150, Math.PI], [-84, 0], [-52, Math.PI]].forEach(([x, dir]) => { const z = SHORE + 24; place('ramp', x, z, { fit: 7 }, dir ? -Math.PI / 2 : Math.PI / 2, beach); ramps.push({ x, z, dir: dir ? -1 : 1 }); });
  far.push({ o: beach, x: -120, z: SAND, r: 160 });
  // the quay: cranes, containers, the harbour camera, things to tie boats to
  const quay = new THREE.Group(); world.add(quay);
  [[122, 0.2], [204, 2.9]].forEach(([x, r]) => { place('crane', x, QUAY - 12, { h: 24, y: SLAB }, r, quay); extra.circles.push({ x, z: QUAY - 12, r: 3.5 }); });
  [[40, QUAY - 9, 0], [172, QUAY - 20, Q], [216, QUAY - 8, 0.2]].forEach(([x, z, r]) => { const o = place('containers', x, z, { h: 6, y: SLAB }, r, quay), h = o.userData.half; extra.rects.push({ x0: x - h.x, x1: x + h.x, z0: z - h.z, z1: z + h.z }); });
  place('cctv', 70, QUAY - 3, { h: 6.5, y: SLAB }, Math.PI, quay); extra.circles.push({ x: 70, z: QUAY - 3, r: 0.3 });
  for (let x = 36; x < LIM; x += 12) if (Math.abs(x - 90) > 7 && Math.abs(x - 151) > 8) posts.push([x, SLAB, QUAY - 0.6, 0.5, 0.7]);
  far.push({ o: quay, x: 130, z: QUAY, r: 150 });
  // out on the water: buoys marking the way, boats that drift, the barge that is not there yet
  const seaG = new THREE.Group(); world.add(seaG);
  [[40, 330], [-40, 330], [-95, 372], [120, 380], [0, 420], [-230, 360], [250, 330], [-60, 500], [90, 520]].forEach(([x, z], k) => { const o = place('buoy', x, z, { h: 3, y: -1.1 }, 0, seaG); bobbers.push({ o, y: -1.1, k: k * 3.1, tilt: 1 }); });   // buoys mark the way; a boat nudges past them rather than stopping dead
  [[-250, 300, 1], [300, 420, 4], [-40, 560, 2.5]].forEach(([x, z, r], k) => { const o = place('sailboat', x, z, { h: 9, y: -1 }, r, seaG); bobbers.push({ o, y: -1, k: k + 20 }); extra.circles.push({ x, z, r: 3, sea: 1 }); });
  // posts, as one mesh
  { const pim = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 6), new THREE.MeshStandardMaterial({ color: 0x4d3b2c, roughness: 0.9 }), posts.length);
    posts.forEach(([x, y, z, r, h], n) => { d4.rotation.set(0, 0, 0); d4.position.set(x, y + h / 2, z); d4.scale.set(r * 2, h, r * 2); d4.updateMatrix(); pim.setMatrixAt(n, d4.matrix); }); pim.frustumCulled = false; world.add(pim); }
  // pools of lamplight on the pavement: one draw call, switched on at dusk
  { const lim = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: SOFT, color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), lampPools.length);
    lampPools.forEach(([x, z], n) => { d4.position.set(x, SLAB + 0.05, z); d4.rotation.set(-Math.PI / 2, 0, 0); d4.scale.set(15, 15, 1); d4.updateMatrix(); lim.setMatrixAt(n, d4.matrix); }); lim.frustumCulled = false; world.add(lim); TEX.pools = lim.material; }
}

/* ───────────── state ───────────── */
const SAVE = 'dsk_bay_save';
const g = { mode: 'loading', t: 0, tod: 0.36, busy: null, car: null, boat: null, pts: 0, done: [], badges: [], msgs: [], notes: [], best: {}, clear: 6, murk: 0.5, ending: null, job: null, toastT: 0, camYaw: Math.PI, camOff: 0, camHold: 0, shake: 0,
  near: null, msgT: 80, msgReady: false, frame: 0, carefulT: 0, radio: 1, camT: { x: 0, z: 0 }, cold: false, rainOn: false, lant: 0, clip: null, party: 0 };
const pl = { x: 0, z: 0, y: SLAB, vy: 0, h: 0, sp: 0, fig: null, moving: false };
const cars = [], boats = [], peds = [], drones = [], badgeObjs = [], noteObjs = [], beams = [], sparks = [];
const keys = {}, joy = { on: false, id: -1, x0: 0, y0: 0, x: 0, y: 0 }, look = { id: -1, x: 0 };
function load() { try { const d = JSON.parse(localStorage.getItem(SAVE) || 'null'); if (d && d.v === 1 && Array.isArray(d.done)) return d; } catch (e) {} return null; }
function save() { try { localStorage.setItem(SAVE, JSON.stringify({ v: 1, done: g.done, badges: g.badges, msgs: g.msgs, notes: g.notes, clear: g.clear, ending: g.ending, pts: g.pts, best: g.best })); } catch (e) {} }

/* ───────────── sound: effects, engine, radio ───────────── */
let snd = true, music = true, ac = null, eng = null, radioTimer = null;
try { snd = localStorage.getItem('dsk_bay_snd') !== '0'; music = localStorage.getItem('dsk_bay_mus') !== '0'; } catch (e) {}
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
  zap: () => tone([1200, 600, 300, 150], 0.4, 'sawtooth', 0.07), phone: () => tone([988, 1319, 988, 1319], 0.5, 'sine', 0.08),
  splash: () => { if (snd) noise(0.5, 900, 0.3); }, lens: () => tone([660, 990], 0.18, 'sine', 0.06), boo: () => tone([196, 174], 0.5, 'triangle', 0.05), bell: () => { tone([1568], 1.2, 'sine', 0.07); tone([2093], 0.9, 'sine', 0.03); },
  firework: () => { if (snd) { noise(0.5, 1400, 0.22); tone([1800, 900], 0.3, 'sine', 0.03); } } };
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
  const S = RADIO[g.radio]; if (!S || !ac || !music || !snd || !(g.car || g.boat) || g.mode !== 'play') { rNext = 0; return; }
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

let wash = null;
function ambience(sea, rain) {   // surf near the water, rain when it rains: one looped noise, filtered
  if (!ac) return;
  if (!wash) { try { const n = ac.sampleRate * 2, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain(); s.buffer = buf; s.loop = true; f.type = 'lowpass'; gn.gain.value = 0; s.connect(f); f.connect(gn); gn.connect(ac.destination); s.start(); wash = { f, gn }; } catch (e) { return; } }
  const v = snd ? Math.max(sea * (0.03 + Math.sin(g.t * 0.7) * 0.014), rain * 0.05) : 0;
  wash.f.frequency.setTargetAtTime(rain > sea ? 5200 : 620, ac.currentTime, 0.4); wash.gn.gain.setTargetAtTime(v, ac.currentTime, 0.3);
}

/* ───────────── little helpers ───────────── */
function toast(text, sec) { const t = $('toast'); t.firstChild.textContent = text; t.style.opacity = 1; g.toastT = sec || 2.6; }
function burst(x, y, z, n, color, spread, up) {
  let k = 0; const s = spread || 4; for (const p of sparks) { if (p.t > 0) continue; p.s.material.color.set(color); p.s.position.set(x, y, z); p.v.set(rnd(-s, s), up === undefined ? rnd(3, 8) : rnd(up * 0.5, up), rnd(-s, s)); p.t = rnd(0.5, 1); p.grav = up === undefined ? 12 : 3; p.s.scale.setScalar(up === undefined ? 0.5 : 0.7); p.s.visible = true; if (++k >= n) break; }
}
function addPts(n) { g.pts += n; $('h-pts').textContent = g.pts; save(); }
const me = () => g.car || g.boat || pl;
const inVeh = () => g.car || g.boat;

/* ───────────── bumping into the town ───────────── */
function pushOut(p, r, tall) {   // p has x, z; returns true when something solid was touched. Screens and the like stop feet but not much else.
  let hit = false;
  const lists = [extra]; const B = blockAt(p.x, p.z); if (B) lists.push(B);
  for (const L of lists) {
    for (const q of L.rects) { const cx = clamp(p.x, q.x0, q.x1), cz = clamp(p.z, q.z0, q.z1); let dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d >= r) continue; hit = true;
      if (d > 0.0001) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
      else { const a = [p.x - q.x0, q.x1 - p.x, p.z - q.z0, q.z1 - p.z], m = Math.min(...a); if (m === a[0]) p.x = q.x0 - r; else if (m === a[1]) p.x = q.x1 + r; else if (m === a[2]) p.z = q.z0 - r; else p.z = q.z1 + r; } }
    for (const q of L.circles) { if (q.sea && !tall) continue; const dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz), rr = r + q.r; if (d < rr && d > 0.0001) { p.x = q.x + dx / d * rr; p.z = q.z + dz / d * rr; hit = true; } }
  }
  return hit;
}
// keep something on the kind of ground it belongs on: feet on land, wheels where cars may go, hulls on the sea
function keepOn(p, ox, oz, ok) {
  if (ok(p.x, p.z)) return false;
  if (ok(p.x, oz)) p.z = oz; else if (ok(ox, p.z)) p.x = ox; else { p.x = ox; p.z = oz; }
  return true;
}

/* ───────────── vehicles ───────────── */
const SPEC = {
  'car-hero': { len: 4.8, top: 36, acc: 19, turn: 2.5 }, 'car-sedan': { len: 4.6, top: 27, acc: 13, turn: 2.2 }, 'car-hatch': { len: 4.1, top: 25, acc: 13, turn: 2.5 },
  'car-pickup': { len: 5, top: 25, acc: 12, turn: 2.1 }, 'car-taxi': { len: 4.6, top: 28, acc: 14, turn: 2.2 }, 'car-bus': { len: 9.5, top: 19, acc: 8, turn: 1.35 },
  'car-van': { len: 5.4, top: 24, acc: 11, turn: 2 }, 'car-sport': { len: 4.4, top: 39, acc: 21, turn: 2.6 }, 'car-mini': { len: 3.4, top: 24, acc: 15, turn: 2.9 },
  'car-ice': { len: 5.4, top: 21, acc: 10, turn: 1.9 }, 'car-news': { len: 5.2, top: 27, acc: 13, turn: 2 },
  'boat-hero': { len: 6.2, top: 25, acc: 11, turn: 1.5 }, boat: { len: 4.4, top: 15, acc: 7, turn: 1.6 }, ferry: { len: 16, top: 8, acc: 3, turn: 0.5 }, sailboat: { len: 6, top: 5, acc: 2, turn: 0.6 }, barge: { len: 34, top: 9, acc: 3, turn: 0.5 }
};
function addWheels(c) {   // four wheels that turn, set just outside the ones painted on the model
  const ax = M[c.name].userData.axles; if (!ax || !ax[0] || !ax[1] || !M.wheel) return;
  const ws = M.wheel.userData.size, across = ws.x > ws.z, thick = Math.min(ws.x, ws.z); c.wheels = [];
  ax.forEach((a, fi) => [-1, 1].forEach(sd => { const r = a.r * 1.04, piv = new THREE.Group(), spin = new THREE.Group(), w = M.wheel.clone();
    w.scale.setScalar(r * 2); w.position.y = -r; if (across) w.rotation.y = Q; spin.add(w); piv.add(spin); piv.position.set(sd * (a.x - thick * r + 0.012), r, a.z); c.obj.add(piv); c.wheels.push({ piv, spin, front: fi === 0, r: r * c.obj.scale.x }); }));
}
function makeCar(name, x, z, h, kind) {
  const spec = SPEC[name], obj = place(name, x, z, { fit: spec.len }, h);
  const c = { name, spec, obj, x, z, y: groundY(x, z), vy: 0, h, vf: 0, vl: 0, kind, r: Math.max(1, M[name].userData.size.x * obj.scale.x / 2), half: spec.len / 2, steer: 0, air: 0, ai: null, stop: 0, honk: 0, pitch: 0, roll: 0 };
  addWheels(c);
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
    for (const o of cars) if (o !== c && o.x < 9000 && ahead(o.x, o.z, o.half * 0.8)) { target = 0; break; }
    if (target && !inVeh() && ahead(pl.x, pl.z, 0.4)) target = 0;
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
  const hb = keys.Space || g.hbTouch || (g.auto && g.auto.hb), S = c.spec, onSand = c.z > SHORE && c.x < 0, wet = env.rain > 0.5, v0 = c.vf;
  c.steer += (st - c.steer) * Math.min(1, dt * 7);
  if (c.air <= 0) {
    const top = S.top * (onSand ? 0.9 : 1);
    if (gas > 0) c.vf += (c.vf < 0 ? 30 : S.acc * (1 - Math.max(0, c.vf) / top)) * gas * dt;
    else if (gas < 0) c.vf += (c.vf > 0 ? -34 : -S.acc * 0.6 * (1 - Math.max(0, -c.vf) / 9)) * -gas * dt;
    c.vf -= c.vf * (0.35 + (onSand ? 0.12 : 0)) * dt; if (!gas) c.vf -= Math.sign(c.vf) * Math.min(Math.abs(c.vf), 3.5 * dt);
    if (hb) c.vf -= Math.sign(c.vf) * Math.min(Math.abs(c.vf), 16 * dt);
    const grip = clamp(Math.abs(c.vf) / 7, 0, 1), turn = S.turn * (1 - clamp((Math.abs(c.vf) - 14) / 60, 0, 0.45)) * (hb ? 1.5 : 1);
    const dh = -c.steer * turn * grip * Math.sign(c.vf || 1) * dt;
    c.h += dh; c.vl += dh * c.vf * (hb ? 0.9 : wet ? 0.6 : 0.42); c.vl *= Math.exp(-(hb ? 2.2 : wet ? 4.5 : 7) * dt);
    if (Math.abs(c.vl) > 4.5) { if (snd && Math.random() < dt * 14) noise(0.12, 2400, 0.05, 0, 'bandpass'); if (Math.random() < dt * 30) burst(c.x - Math.sin(c.h) * c.half * 0.7, c.y + 0.3, c.z - Math.cos(c.h) * c.half * 0.7, 1, onSand ? 0xe8d49a : 0xd8d8d8, 0.8, 1.6); }
  }
  const f = { x: Math.sin(c.h), z: Math.cos(c.h) }, r = { x: -f.z, z: f.x }, ox = c.x, oz = c.z;
  c.x += (f.x * c.vf + r.x * c.vl) * dt; c.z += (f.z * c.vf + r.z * c.vl) * dt;
  // two circles, nose and tail, against the town; and no wheels in the water
  let hit = false; const off = c.half - c.r;
  for (const sgn of [1, -1]) { const p = { x: c.x + f.x * off * sgn, z: c.z + f.z * off * sgn }; if (pushOut(p, c.r, true)) { hit = true; c.x = p.x - f.x * off * sgn; c.z = p.z - f.z * off * sgn; } }
  for (const sgn of [1, -1]) if (!carOK(c.x + f.x * c.half * sgn, c.z + f.z * c.half * sgn)) { c.x = ox; c.z = oz; hit = true; if (Math.abs(c.vf) < 7) c.vf = -sgn * 2; break; }
  for (const o of cars) { if (o === c || o.x > 9000) continue; const dx = c.x - o.x, dz = c.z - o.z, d = Math.hypot(dx, dz), rr = c.half * 0.75 + o.half * 0.75; if (d < rr && d > 0.001 && Math.abs(c.y - o.y) < 1.5) { c.x = o.x + dx / d * rr; c.z = o.z + dz / d * rr; hit = true; if (o.ai && !o.ai.bold) { o.stop = 1.6; if (o.honk <= 0) { o.honk = 2.5; SFX.horn(); } } } }
  if (hit) { const sp = Math.abs(c.vf); if (sp > 7) { SFX.bump(); buzz(40); g.shake = Math.min(0.5, sp / 50); if (g.carefulT <= 0 && sp > 14) { toast(ST.ui.bump); g.carefulT = 5; } } c.vf *= sp > 7 ? -0.25 : 0.4; c.vl *= 0.3; }
  // stunt ramps on the beach, and the kerb
  let gy = land(c.x, c.z); if (gy === null) gy = 0;
  for (const R2 of ramps) { const al = (c.x - R2.x) * R2.dir; if (Math.abs(c.z - R2.z) < 2.3 && al > -3.6 && al < 3.6 && f.x * R2.dir * c.vf > 5) { gy = (al + 3.6) / 7.2 * 2.3; c.onRamp = R2; } else if (c.onRamp === R2) { c.onRamp = null; if (al >= 3.4 && c.vf > 9) { c.vy = c.vf * 0.4; c.air = 0.001; c.y += 0.05; } } }
  if (c.air > 0) { c.air += dt; c.vy -= 24 * dt; c.y += c.vy * dt; if (c.y <= gy) { c.y = gy; if (c.air > 0.55) { const n = Math.round(c.air * 10); toast(fmt(ST.ui.stunt, { n })); addPts(n); SFX.good(); buzz([30, 30, 60]); g.shake = 0.3; } c.air = 0; c.vy = 0; } }
  else c.y += (gy - c.y) * Math.min(1, dt * 14);
  c.acc = (c.vf - v0) / Math.max(dt, 0.001);
}

/* ───────────── boats ───────────── */
function makeBoat(name, x, z, h, kind) {
  const spec = SPEC[name], obj = place(name, x, z, { fit: spec.len, y: -0.9 }, h);
  const b = { name, spec, obj, x, z, y: -0.9, h, vf: 0, vl: 0, kind, r: Math.max(1.2, M[name] ? M[name].userData.size.x * obj.scale.x / 2 : 1.5), half: spec.len / 2, steer: 0, boat: true, path: null, pi: 0, lean: 0, draft: name === 'ferry' ? 0.35 : 0.22 };
  if (kind === 'share') { const m = M.shield.clone(); m.scale.setScalar(0.9 / obj.scale.x); m.position.y = (obj.scale.y + 1.2) / obj.scale.x; obj.add(m); b.badge = m; }
  boats.push(b); return b;
}
function hullHit(b, ox, oz) {   // the shore, the jetties, rocks, buoys, other boats
  let hit = false; const f = { x: Math.sin(b.h), z: Math.cos(b.h) }, off = b.half - b.r;
  for (const sgn of [1, -1]) { const p = { x: b.x + f.x * off * sgn, z: b.z + f.z * off * sgn }; if (pushOut(p, b.r, true)) { hit = true; b.x = p.x - f.x * off * sgn; b.z = p.z - f.z * off * sgn; } }
  for (const sgn of [1, 0, -1]) { const px = b.x + f.x * b.half * sgn, pz = b.z + f.z * b.half * sgn; if (!seaOK(px, pz) || !seaOK(px - f.z * b.r * 0.7, pz + f.x * b.r * 0.7) || !seaOK(px + f.z * b.r * 0.7, pz - f.x * b.r * 0.7)) { b.x = ox; b.z = oz; hit = true; break; } }
  for (const o of boats) { if (o === b || o.x > 9000) continue; const dx = b.x - o.x, dz = b.z - o.z, d = Math.hypot(dx, dz), rr = (b.half + o.half) * 0.7; if (d < rr && d > 0.001) { b.x = o.x + dx / d * rr; b.z = o.z + dz / d * rr; hit = true; } }
  return hit;
}
function sail(b, dt) {   // the boat the player is in: slower to answer than a car, and it slides
  let gas = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), st = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  if (joy.on) { gas += clamp(-joy.y * 1.4, -1, 1); st += clamp(joy.x * 1.3, -1, 1); }
  if (g.auto) { gas = g.auto.gas; st = g.auto.steer; }
  gas = clamp(gas, -1, 1); st = clamp(st, -1, 1); const S = b.spec, slow = keys.Space || g.hbTouch;
  b.steer += (st - b.steer) * Math.min(1, dt * 4);
  if (gas > 0) b.vf += S.acc * (1 - Math.max(0, b.vf) / S.top) * gas * dt; else if (gas < 0) b.vf += (b.vf > 0 ? -12 : -S.acc * 0.5 * (1 - Math.max(0, -b.vf) / 6)) * -gas * dt;
  b.vf -= b.vf * (slow ? 1.6 : 0.4) * dt; if (!gas) b.vf -= Math.sign(b.vf) * Math.min(Math.abs(b.vf), 1.2 * dt);
  const dh = -b.steer * S.turn * clamp(Math.abs(b.vf) / 6, 0.12, 1) * Math.sign(b.vf || 1) * dt;
  b.h += dh; b.vl += dh * b.vf * 0.75; b.vl *= Math.exp(-2.4 * dt);
  const f = { x: Math.sin(b.h), z: Math.cos(b.h) }, ox = b.x, oz = b.z;
  b.x += (f.x * b.vf - f.z * b.vl) * dt; b.z += (f.z * b.vf + f.x * b.vl) * dt;
  if (hullHit(b, ox, oz)) { const sp = Math.abs(b.vf); if (sp > 6) { SFX.bump(); buzz(40); g.shake = Math.min(0.4, sp / 50); } b.vf *= sp > 6 ? -0.2 : 0.3; b.vl *= 0.3; }
  if (Math.abs(b.vf) > 5 && Math.random() < dt * (10 + Math.abs(b.vf))) burst(b.x - f.x * b.half * 0.9 + rnd(-1, 1), -0.6, b.z - f.z * b.half * 0.9 + rnd(-1, 1), 1, 0xcfefff, 1.2, 1.6);
}
function cruise(b, dt) {   // a boat on a fixed round: the ferry, or one a job is steering
  const P = b.path; if (!P || !P.length) return; const t = P[b.pi % P.length], dx = t.x - b.x, dz = t.z - b.z, d = Math.hypot(dx, dz);
  if (d < 8) { b.pi++; if (b.wait && t.stop) b.hold = b.wait; return; }
  if (b.hold > 0) { b.hold -= dt; b.vf *= Math.exp(-dt * 2); return; }
  const sp = b.speed || b.spec.top; b.vf += (sp - b.vf) * Math.min(1, dt * 0.8); b.h += angDiff(Math.atan2(dx, dz), b.h) * Math.min(1, dt * (b.spec.turn + 0.4));
  b.x += Math.sin(b.h) * b.vf * dt; b.z += Math.cos(b.h) * b.vf * dt;
}

/* ───────────── people on the pavements ───────────── */
const PEDS = ['citizen-e', 'citizen-h', 'citizen-c', 'citizen-d', 'citizen-f', 'citizen-g', 'citizen-b', 'citizen-a', 'citizen-d', 'citizen-e', 'citizen-c', 'citizen-h', 'citizen-g', 'citizen-f'];
const PED_H = { 'citizen-a': 1.62, 'citizen-b': 1.35, 'citizen-c': 1.6, 'citizen-d': 1.8, 'citizen-e': 1.7, 'citizen-f': 1.25, 'citizen-g': 1.35, 'citizen-h': 1.7 };
function pedPos(p) { const L = (HB - 2.4) * 2, u = ((p.u % (L * 4)) + L * 4) % (L * 4), side = Math.floor(u / L), a = u - side * L - L / 2, e = HB - 2.4; const B = p.b;
  if (side === 0) { p.x = B.x + a; p.z = B.z - e; p.h = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2; } else if (side === 1) { p.x = B.x + e; p.z = B.z + a; p.h = p.dir > 0 ? 0 : Math.PI; }
  else if (side === 2) { p.x = B.x - a; p.z = B.z + e; p.h = p.dir > 0 ? -Math.PI / 2 : Math.PI / 2; } else { p.x = B.x - e; p.z = B.z - a; p.h = p.dir > 0 ? Math.PI : 0; } }
function pedSpawn(p) { const m = me(), ok = blocks.filter(B => B.type !== 'w'), near = ok.filter(B => { const d = dist(B.x, B.z, m.x, m.z); return d > 40 && d < 150; }); p.b = near.length ? near[Math.floor(Math.random() * near.length)] : ok[Math.floor(Math.random() * ok.length)]; p.u = Math.random() * 400; p.crowd = null; pedPos(p); }

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
  if (L.c) { $('d-who').textContent = ST.names[dlg.q.who] || dlg.q.who; $('d-tx').textContent = dlg.q.Q.q; $('d-tx').style.minHeight = '0'; $('d-nx').hidden = true; $('dlg').classList.toggle('scr', ['screen', 'unknown', 'twin', 'clip', 'voice'].includes(dlg.q.who)); SFX.talk();
    L.c.forEach((k, n) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = dlg.q.Q.c[k].t; b.onclick = () => choose(n); ch.appendChild(b); }); if (fine && ch.firstChild) ch.firstChild.focus(); }
  else { $('dlg').classList.remove('scr'); $('d-who').textContent = ST.names[L.s] || L.s; $('d-tx').style.minHeight = ''; $('d-tx').textContent = L.t; $('d-nx').hidden = false; SFX.talk(); if (fine) $('d-nx').focus(); }
}
function choose(n) {
  const L = dlg.lines[dlg.i], q = dlg.q; if (!L || !L.c || !q || L.c[n] === undefined) return;
  const k = L.c[n];
  if (q.heart) { const w = q.heart[k]; clearBy(w); if (w > 0) { SFX.good(); buzz(30); } else if (w < 0) { SFX.bad(); buzz([60, 40, 60]); } else SFX.talk();
    dlg.lines = [{ s: 'shieldy', t: q.Q.c[k].t }, { s: q.who, t: q.Q.c[k].r }]; if (w < 0) dlg.lines.push({ s: 'pixel', t: ST.ui.blame }); dlg.i = 0; dlg.q = null;
    dlg.after = () => { if (w) toast(w > 0 ? ST.ui.clearUp : ST.ui.clearDown, 3); if (q.after) q.after(); }; return showLine(); }
  const right = k === RIGHT; q.tries++;
  if (right) { SFX.good(); buzz(30); dlg.lines = [{ s: q.okWho, t: q.Q.c[k].r }]; dlg.i = 0; dlg.after = () => q.after(q.tries === 1); dlg.q = null; }
  else { SFX.bad(); buzz([60, 40, 60]); q.order = q.order.filter(o => o !== k); dlg.lines = [{ s: q.noWho || 'pixel', t: q.Q.c[k].r }, { c: q.order }]; dlg.i = 0; }
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

/* ───────────── the story: seventeen jobs in five chapters ─────────────
   A job is a list of steps. The words for every step are in the story file
   under jobs.<id>; this table only says what kind of step it is and where. */
const JOBS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12', 'm13', 'm14', 'm15', 'm16', 'm17'];
const CH = { m1: 1, m2: 1, m3: 1, m4: 2, m5: 2, m6: 2, m7: 2, m8: 3, m9: 3, m10: 3, m11: 3, m12: 4, m13: 4, m14: 4, m15: 5, m16: 5, m17: 5 };
const START = { m1: 'ferry', m2: 'square', m3: 'square', m4: 'arcade', m5: 'gazette', m6: 'school', m7: 'park', m8: 'studio', m9: 'depot', m10: 'studio', m11: 'ferry', m12: 'gazette', m13: 'hq', m14: 'square', m15: 'hq', m16: 'quay', m17: 'quay' };
const AUTO = { m2: 'm3', m11: 'm12', m16: 'm17' };   // these follow straight on
const LAST = 'm17';
const nextJob = () => JOBS.find(id => !g.done.includes(id)) || null;
const chapterNow = () => g.job ? CH[g.job.id] : nextJob() ? CH[nextJob()] : 6;
const D = id => g.done.includes(id);
const mark = { list: [] };   // what the mini-map and the light beams point at this frame
let hero = null, van = null, heroBoat = null, kaiBoat = null, ferry = null, barge = null, drift = null, DEF = {};
const ACT = { dame: ['dame', 1.75], pixel: ['pixel', 1.3], bot: ['bot', 1.3], sprout: ['sprout', 1.05], glitch: ['glitch', 1.4], iris: ['iris', 1.7], kai: ['kai', 1.68], mina: ['mina', 1.1], vale: ['vale', 1.72], lila: ['lila', 1.3],
  tomas: ['tomas', 1.3], captain: ['captain', 1.78], baker: ['baker', 1.72], elena: ['citizen-e', 1.7], alder: ['citizen-c', 1.6], shieldy: ['shieldy', 1.25] };
const actors = {};
function actor(id, x, z, h) { let a = actors[id]; if (!a) { const fig = person(ACT[id][0], ACT[id][1]); world.add(fig.g); a = actors[id] = { id, fig, x: 0, z: 0, h: 0, home: 0 }; }
  a.x = x; a.z = z; a.y = land(x, z) || 0; a.h = a.home = h === undefined ? Math.atan2(me().x - x, me().z - z) : h; a.fig.g.position.set(x, a.y, z); a.fig.g.rotation.y = a.h; a.fig.g.visible = true; a.gone = false; a.path = null; return a; }
const hide = id => { if (actors[id]) { actors[id].fig.g.visible = false; actors[id].gone = true; actors[id].path = null; } };
const near = (name, dx, dz) => { const s = beaconSpots[name]; return { x: s.x + (dx || 0), z: s.z + (dz || 0) }; };
function homes() {   // where everyone stands when no job is using them; it changes as the story moves
  const put = (id, name, dx, dz, h) => { const p = near(name, dx, dz); actor(id, p.x, p.z, h === undefined ? 0 : h); };
  if (D('m3')) put('dame', 'hq', 3, -2.5); else put('dame', D('m1') ? 'square' : 'ferry', 3, D('m1') ? -3 : 2);
  put('pixel', D('m11') ? 'hq' : 'library', D('m11') ? -3 : 3, -2.5); put('bot', 'square', -5, -4); put('iris', 'gazette', 2.5, 1.5); put('baker', 'bakery', -2.5, -3); put('alder', 'school', 9, -2);
  put('captain', D('m11') && !D('m13') ? 'isle' : 'ferry', D('m11') && !D('m13') ? 2 : -4, D('m11') && !D('m13') ? 2 : 1);
  if (D('m6')) { put('sprout', 'carousel', 2, 1.5, 0.4); put('lila', 'carousel', 4, 0.5, -0.4); } else { put('sprout', 'school', -3, -2.5); put('lila', D('m5') ? 'carousel' : 'school', D('m5') ? 3 : -5, D('m5') ? 1 : -1.5); }
  put('tomas', 'tomas', -2, -0.8, Math.PI); put('elena', 'tomas', 0.8, -0.4, Math.PI);
  if (D('m4')) put('glitch', 'arcade', 5, -2); else hide('glitch');
  if (D('m14')) { put('kai', 'kai', 2, -0.6); put('mina', 'kai', 4, -0.3); } else { hide('kai'); if (D('m9') && !D('m13')) put('mina', 'fair', -4, -2); else hide('mina'); }
  if (D('m10') && !D(LAST)) put('vale', 'studio', -3, -2.5); else hide('vale');
  if (D(LAST)) { put('kai', g.ending === 'low' ? 'kai' : 'gazette', g.ending === 'low' ? 2 : -2, g.ending === 'low' ? -0.6 : 2.5); }
  setClip(null); setCold(false); setRain(false); lanternLevel(); barge.x = 9999; drift.x = 9999; kaiBoat.x = 9999; if (van) van.x = 9999;
  if (B_STUDIO) B_STUDIO.traverse(o => { if (o.isMesh) o.material.color.setScalar(D('m16') ? 0.4 : 1); });
}
let B_STUDIO = null;
// how many lanterns are up: a few after the first job, the whole town by the last night
function lanternLevel(extra) { if (!lanterns) return; const n = g.done.length, k = D('m2') ? 0.3 + (n - 2) / 15 * 0.7 : n ? 0.08 : 0; setLanterns(clamp(k + (extra || 0), 0, 1)); }
function setLanterns(k) { g.lant = k; const runs = Math.floor(lanterns.runs * k); lanterns.ge.setDrawRange(0, runs * 11); lanterns.lg.setDrawRange(0, runs * 20); }
// how cloudy the bay looks: fakes spread as the story goes on, and what you do pulls the other way
function murkNow() { const n = g.done.length; if (D(LAST)) return g.ending === 'best' ? 0 : g.ending === 'ok' ? 0.3 : 0.75; return clamp(0.06 + Math.min(n, 13) * 0.055 - (g.clear - 5) * 0.06, 0, 1); }
function setCold(on) { g.cold = on; }
function setRain(on) { g.rainOn = on; }

/* ───────────── the screens in the streets, and the clips they play ─────────────
   Every big screen shows the same feed. A clip is a real little scene: the
   person's figure, lit, filmed by its own camera into a texture. Fakes are
   mirrored (Shieldy's shield is on the wrong arm) and they tear now and then,
   which are tells the questions ask about. */
const clipRT = new THREE.WebGLRenderTarget(376, 280), clipScene = new THREE.Scene(), clipCam = new THREE.PerspectiveCamera(30, 376 / 280, 0.1, 30);
clipScene.background = new THREE.Color(0x2a1640); clipScene.add(new THREE.HemisphereLight(0xffffff, 0x554466, 2.6)); { const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(1.5, 3, 4); clipScene.add(d); }
const clipFigs = {}; let clipFig = null;
const screenMat = new THREE.ShaderMaterial({ uniforms: { tMap: { value: clipRT.texture }, uOn: { value: 0 }, uT: { value: 0 }, uFake: { value: 1 }, uNight: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform sampler2D tMap; uniform float uOn, uT, uFake, uNight; varying vec2 vUv;\n' +
    'void main(){ vec2 u = vUv; float tear = step(0.985, fract(sin(floor(uT*7.0)*12.9898)*43758.5453))*uFake; u.x += tear*0.06*sin(u.y*40.0);\n' +
    ' vec3 clip = vec3(texture2D(tMap, u + vec2(0.004*uFake, 0.0)).r, texture2D(tMap, u).g, texture2D(tMap, u - vec2(0.004*uFake, 0.0)).b);\n' +
    ' float d = length((vUv - vec2(0.5, 0.52))*vec2(1.5, 1.0)); vec3 idle = mix(vec3(0.07, 0.09, 0.22), vec3(1.0, 0.62, 0.25), smoothstep(0.34, 0.0, d)*(0.75 + 0.25*sin(uT*1.6)));\n' +
    ' vec3 c = mix(idle, clip, uOn); c *= 0.9 + 0.1*sin(vUv.y*220.0); c *= 0.85 + uNight*0.5; gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}' });
function setClip(c) {   // c: { who, act: 'talk' | 'dance', real } or null
  if (clipFig) { clipScene.remove(clipFig.g); clipFig = null; }
  g.clip = c; screenMat.uniforms.uOn.value = c ? 1 : 0; if (!c) return;
  const id = c.who; if (!clipFigs[id]) clipFigs[id] = person(ACT[id][0], 1.6);
  clipFig = clipFigs[id]; clipFig.g.scale.x = c.real ? 1 : -1; clipScene.add(clipFig.g); screenMat.uniforms.uFake.value = c.real ? 0 : 1;
  clipScene.background.set(c.real ? 0x1d3a5c : 0x3a1650); clipCam.position.set(0, 1.2, c.act === 'dance' ? 4.4 : 3.1); clipCam.lookAt(0, c.act === 'dance' ? 0.85 : 1.02, 0);
}
function clipTick(dt) {
  screenMat.uniforms.uT.value = g.t; screenMat.uniforms.uNight.value = env.night;
  if (!g.clip || !clipFig || g.frame % 2) return;
  const m = me(); if (!screens.some(s => dist(s.x, s.z, m.x, m.z) < 130)) return;
  const dance = g.clip.act === 'dance'; animate(clipFig, dance ? 'run' : 'idle', dance ? 1.3 : 1, dt * 2);
  clipFig.g.rotation.y = dance ? Math.sin(g.t * 3) * 1.2 : Math.sin(g.t * 0.9) * 0.18;
  const b = clipFig.bones; if (b && !dance) { if (b.Head) b.Head.rotateX(Math.sin(g.t * 6) * 0.07); if (b.RightForeArm) b.RightForeArm.rotateZ(0.5 + Math.sin(g.t * 4) * 0.35); if (b.Spine02) b.Spine02.rotateY(Math.sin(g.t * 1.7) * 0.08); }
  const rt = renderer.getRenderTarget(), sh = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false; renderer.setRenderTarget(clipRT); renderer.render(clipScene, clipCam); renderer.setRenderTarget(rt); renderer.shadowMap.enabled = sh;
}

const TAIL = [[3, 4], [5, 4], [5, 2], [2, 2], [2, 5], [4, 5], [4, 7], [6, 7]];   // the news van's way home, corner by corner
const BOATRUN = [{ x: 60, z: 318 }, { x: -20, z: 362 }, { x: -96, z: 352 }, { x: -150, z: 384 }];
const BARGE_LOOP = [{ x: 150, z: 400 }, { x: 255, z: 420 }, { x: 262, z: 505 }, { x: 140, z: 520 }];
const DRIFT = { x: -36, z: 468 };
function defineJobs() {
  const S = beaconSpots, at = (name, dx, dz, o) => Object.assign({ x: S[name].x + (dx || 0), z: S[name].z + (dz || 0) }, o || {});
  const scr = (n, q) => ({ x: screens[n].x + Math.sin(screens[n].yaw) * 4.6, z: screens[n].z + Math.cos(screens[n].yaw) * 4.6, q, who: 'screen', scr: n });
  const sq = S.square, tomasRun = [{ x: roadC(5) - 9, z: -128 }, { x: roadC(5) - 9, z: roadC(7) - 9 }, { x: 150, z: SHORE + 3 }, S.dock4];
  DEF = {
    m1: [{ t: 'say', k: 'intro' }, { t: 'car' }, { t: 'goto', to: 'square', goal: 'drive' }, { t: 'actor', id: 'bot', at: at('square', -5, -4) }, { t: 'clip', who: 'bot', act: 'dance' }, { t: 'say', k: 'clip' }, { t: 'ask', k: 'laugh', who: 'bot', ok: 'bot' }, { t: 'say', k: 'outro' }],
    m2: [{ t: 'say', k: 'intro' }, { t: 'visit', goal: 'crates', label: 'deliver', ok: 'pixel', pts: [at('school', 9, -2, { actor: 'alder', who: 'alder', q: 'l1' }), at('market', 4, -2, { who: 'cit', q: 'l2' }), at('cinema', 4, -1, { who: 'cit', q: 'l3' }), at('fair', 3, -2, { who: 'cit', q: 'l4' })], each: n => lanternLevel(n * 0.06) },
      { t: 'clip', who: 'bot', act: 'talk' }, { t: 'say', k: 'second' }, { t: 'goto', to: 'bakery', goal: 'bakery' }, { t: 'say', k: 'baker' }, { t: 'ask', k: 'sure', who: 'baker', ok: 'baker' }, { t: 'clip' }, { t: 'say', k: 'outro' }],
    m3: [{ t: 'clip', who: 'dame', act: 'talk' }, { t: 'say', k: 'intro' }, { t: 'visit', goal: 'screens', label: 'retune', ok: 'pixel', time: 420, pts: [scr(1, 's1'), scr(0, 's2'), scr(4, 's3'), scr(5, 's4')] }, { t: 'clip' },
      { t: 'actor', id: 'glitch', at: at('square', 9, 2) }, { t: 'goto', to: 'square', goal: 'back', r: 12 }, { t: 'say', k: 'outro' }, { t: 'hide', id: 'glitch' }],
    m4: [{ t: 'say', k: 'intro' }, { t: 'goto', to: 'depot', goal: 'r1', riddle: 45 }, { t: 'say', k: 'c1' }, { t: 'actor', id: 'glitch', at: at('fair', -6, -6) }, { t: 'goto', to: at('fair', -6, -3), goal: 'r2', riddle: 45, r: 9 }, { t: 'say', k: 'found' },
      { t: 'heart', k: 'heart', who: 'glitch', w: [1, -2, 0] }, { t: 'say', k: 'lead' }],
    m5: [{ t: 'say', k: 'intro' }, { t: 'clip', who: 'baker', act: 'talk' }, { t: 'visit', goal: 'facts', label: 'look', ok: 'iris', pts: [at('bakery', -2.5, -3, { actor: 'baker', who: 'baker', q: 'e1' }), at('cinema', 17, -12, { who: 'screen', q: 'e2' }), at('bakery', -14, -1, { who: 'cit', q: 'e3' })] },
      { t: 'goto', to: 'gazette', goal: 'gazette' }, { t: 'ask', k: 'proof', who: 'iris', ok: 'iris' }, { t: 'clip' }, { t: 'say', k: 'lens' },
      { t: 'visit', goal: 'bread', label: 'deliver', time: 200, pts: [at('hotel', 2, -1, { who: 'cit', say: 'd1' }), at('library', -4, -1, { who: 'cit', say: 'd2' }), at('kai', -5, 0, { who: 'cit', say: 'd3' })] }, { t: 'say', k: 'outro' }],
    m6: [{ t: 'clip', who: 'sprout', act: 'talk' }, { t: 'actor', id: 'sprout', at: at('school', -3, -2.5) }, { t: 'hide', id: 'lila' }, { t: 'say', k: 'intro' }, { t: 'heart', k: 'crowd', who: 'kids', w: [1, -2, -1] }, { t: 'say', k: 'gone' },
      { t: 'actor', id: 'lila', at: at('carousel', 3, 1) }, { t: 'goto', to: 'carousel', goal: 'r1', riddle: 45, r: 9 }, { t: 'say', k: 'lila' }, { t: 'heart', k: 'lilaH', who: 'lila', w: [1, -1, -2] },
      { t: 'goto', to: 'school', goal: 'fetch' }, { t: 'say', k: 'fetch' }, { t: 'ride', id: 'sprout' }, { t: 'goto', to: 'carousel', goal: 'bring', r: 9 }, { t: 'actor', id: 'sprout', at: at('carousel', 1.5, 2.2) }, { t: 'say', k: 'meet' },
      { t: 'ask', k: 'scarf', who: 'clip', ok: 'lila' }, { t: 'clip' }, { t: 'say', k: 'code' }],
    m7: [{ t: 'actor', id: 'tomas', at: tomasRun[0], h: 0 }, { t: 'say', k: 'intro' }, { t: 'catch', id: 'tomas', path: tomasRun, sp: 4.5, goal: 'catch' }, { t: 'say', k: 'stop' }, { t: 'ask', k: 'code', who: 'voice', ok: 'tomas' }, { t: 'say', k: 'hang' },
      { t: 'ride', id: 'tomas' }, { t: 'goto', to: 'tomas', goal: 'home' }, { t: 'actor', id: 'tomas', at: at('tomas', -2, -0.8), h: Math.PI }, { t: 'say', k: 'home' }],
    m8: [{ t: 'say', k: 'intro' }, { t: 'car' }, { t: 'tail', goal: 'tail' }, { t: 'say', k: 'outro' }],
    m9: [{ t: 'say', k: 'intro' }, { t: 'visit', goal: 'windows', label: 'look', ok: 'pixel', pts: [at('depot', -8, -13, { who: 'screen', q: 'w1' }), at('depot', 8, -13, { who: 'screen', q: 'w2' }), at('depot', 0, -4, { who: 'screen', q: 'w3' })] },
      { t: 'actor', id: 'kai', at: at('depot', 4, 0) }, { t: 'say', k: 'kai' }, { t: 'hide', id: 'kai' }, { t: 'boat', k: 'quay' }, { t: 'chase', veh: 'boat', pts: BOATRUN, goal: 'chase' }, { t: 'goto', to: 'isleJetty', goal: 'land', by: 'boat', r: 16 },
      { t: 'actor', id: 'kai', at: at('isle', 2, 4) }, { t: 'goto', to: at('isle', 2, 2), goal: 'find', by: 'foot', r: 6 }, { t: 'say', k: 'corner' }, { t: 'heart', k: 'heart', who: 'kai', w: [1, -2, -1] }, { t: 'say', k: 'leave' }, { t: 'hide', id: 'kai' }],
    m10: [{ t: 'actor', id: 'vale', at: at('studio', -3, -2.5) }, { t: 'say', k: 'intro' }, { t: 'ask', k: 'deal', who: 'vale', ok: 'pixel' }, { t: 'say', k: 'after' }, { t: 'clip', who: 'dame', act: 'talk' }, { t: 'tag', what: 'drones', goal: 'drones', time: 330 }, { t: 'clip' }, { t: 'say', k: 'outro' }],
    m11: [{ t: 'say', k: 'intro' }, { t: 'boat', k: 'quay' }, { t: 'goto', to: 'isleJetty', goal: 'sail', by: 'boat', r: 16 }, { t: 'actor', id: 'captain', at: at('isle', 2, 2) }, { t: 'visit', goal: 'tape', label: 'talkTo', pts: [at('isle', 2, 2, { actor: 'captain', who: 'captain', say: 'tape' })] },
      { t: 'boat' }, { t: 'goto', to: 'jetty', goal: 'back', by: 'foot', r: 7 }, { t: 'goto', to: 'gazette', goal: 'rush', time: 210 }, { t: 'say', k: 'print' }, { t: 'tod', v: 0.74 }, { t: 'clip', who: 'shieldy', act: 'talk' }, { t: 'say', k: 'twist' }],
    m12: [{ t: 'cold', on: true }, { t: 'rain', on: true }, { t: 'clip', who: 'shieldy', act: 'talk' }, { t: 'say', k: 'intro' }, { t: 'goto', to: 'hq', goal: 'walk', by: 'foot', mid: { d: 120, pre: 'shout', heart: 'heart', who: 'cit', w: [1, -2, 0] } },
      { t: 'say', k: 'hq' }, { t: 'ask', k: 'whatdo', who: 'dame', ok: 'dame' }, { t: 'say', k: 'outro' }],
    m13: [{ t: 'cold', on: true }, { t: 'rain', on: true }, { t: 'clip', who: 'shieldy', act: 'talk' }, { t: 'say', k: 'intro' }, { t: 'visit', goal: 'alibi', label: 'talkTo', time: 330, pts: [at('ferry', -4, 1, { actor: 'captain', who: 'captain', say: 'a1' }), at('bakery', -2.5, -3, { actor: 'baker', who: 'baker', say: 'a2' }), at('cinema', 17, -12, { who: 'screen', q: 'a3' })] },
      { t: 'goto', to: 'gazette', goal: 'gazette', by: 'foot' }, { t: 'ask', k: 'clock', who: 'iris', ok: 'iris' }, { t: 'clip' }, { t: 'rain', on: false }, { t: 'cold', on: false }, { t: 'say', k: 'outro' }],
    m14: [{ t: 'actor', id: 'kai', at: at('square', 3, 1) }, { t: 'say', k: 'intro' }, { t: 'goto', to: 'carousel', goal: 'r1', riddle: 45, r: 9 }, { t: 'say', k: 'c1' }, { t: 'goto', to: 'library', goal: 'r2', riddle: 45 }, { t: 'say', k: 'c2' }, { t: 'tod', v: 0.7 },
      { t: 'goto', to: 'pier', goal: 'r3', riddle: 45, r: 8 }, { t: 'say', k: 'seen' }, { t: 'drift' }, { t: 'boat', k: 'pier' }, { t: 'goto', to: DRIFT, goal: 'reach', by: 'boat', r: 12, time: 150 }, { t: 'say', k: 'mina' }, { t: 'heart', k: 'heart', who: 'mina', w: [1, -1, -2] },
      { t: 'ride', id: 'mina', tow: true }, { t: 'goto', to: 'pier', goal: 'tow', by: 'boat', r: 20 }, { t: 'drift', off: true }, { t: 'actor', id: 'mina', at: at('pier', 1.5, -2) }, { t: 'actor', id: 'kai', at: at('pier', -1.5, -3) }, { t: 'say', k: 'kai' }],
    m15: [{ t: 'say', k: 'intro' }, { t: 'visit', goal: 'allies', label: 'talkTo', pts: [at('bakery', -2.5, -3, { actor: 'baker', who: 'baker', say: 'baker' }), at('ferry', -4, 1, { actor: 'captain', who: 'captain', say: 'captain' }), at('carousel', 3, 1, { actor: 'lila', who: 'lila', say: 'friends' }),
        at('tomas', 0.8, -0.4, { actor: 'elena', who: 'elena', say: 'elena' }), at('arcade', 5, -2, { actor: 'glitch', who: 'glitch', pre: 'glitch', heart: 'glitch2', w: [1, -1, 0] })] }, { t: 'say', k: 'outro' }],
    m16: [{ t: 'tod', v: 0.76 }, { t: 'say', k: 'intro' }, { t: 'barge' }, { t: 'boat', k: 'quay' }, { t: 'tag', what: 'barge', goal: 'masts', time: 320 }, { t: 'goto', to: () => barge, goal: 'board', by: 'boat', r: 15 }, { t: 'ask', k: 'final', who: 'twin', ok: 'pixel' }, { t: 'fx', k: 'dark' }, { t: 'say', k: 'outro' }],
    m17: [{ t: 'tod', v: 0.8 }, { t: 'actor', id: 'kai', at: at('quay', 2, 0) }, { t: 'say', k: 'intro' }, { t: 'ride', id: 'kai' }, { t: 'car', bring: 'quay' }, { t: 'shake', goal: 'shake', pts: [{ x: roadC(6), z: roadC(6) }, { x: roadC(6), z: roadC(4) }, { x: roadC(4), z: roadC(4) }, { x: roadC(4), z: roadC(3) }], time: 32 },
      { t: 'goto', to: 'square', goal: 'square', r: 14 }, { t: 'crowd' }, { t: 'actor', id: 'kai', at: { x: sq.x + 1.5, z: sq.z - 9 }, h: 0 }, { t: 'actor', id: 'vale', at: { x: sq.x + 6, z: sq.z - 6 }, h: -0.6 }, { t: 'actor', id: 'dame', at: { x: sq.x - 1.5, z: sq.z - 9 }, h: 0 }, { t: 'actor', id: 'iris', at: { x: sq.x - 5, z: sq.z - 7 }, h: 0.4 },
      { t: 'say', k: 'stage' }, { t: 'heart', k: 'town', who: 'crowd', w: [2, -3, -1] }, { t: 'say', k: 'end' }, { t: 'fx', k: 'lanterns' }]
  };
}
const T = () => ST.jobs[g.job.id];
const where = to => typeof to === 'function' ? to() : typeof to === 'string' ? beaconSpots[to] : to;
// each kind of step: begin (once), tick (every frame while it is the current step), goal text, map marks
const STEP = {
  say: { begin(s, d) { say(T()[d.k], advance); } },
  ask: { begin(s, d) { ask(T()[d.k], d.who, d.ok, first => { addPts(first ? 6 : 2); advance(); }); } },
  heart: { begin(s, d) { heart(T()[d.k], d.who, d.w, advance); } },
  actor: { begin(s, d) { actor(d.id, d.at.x, d.at.z, d.h); advance(); } },
  hide: { begin(s, d) { hide(d.id); advance(); } },
  ride: { begin(s, d) { hide(d.id); g.job.rider = d.id; if (d.tow) g.job.tow = true; SFX.door(); advance(); } },
  tod: { begin(s, d) { g.tod = d.v; env.key = -1; advance(); } },
  clip: { begin(s, d) { setClip(d.who ? { who: d.who, act: d.act, real: d.real } : null); if (d.who) SFX.phone(); advance(); } },
  cold: { begin(s, d) { setCold(d.on); advance(); } },
  rain: { begin(s, d) { setRain(d.on); advance(); } },
  drift: { begin(s, d) { if (d.off) { drift.x = 9999; g.job.tow = false; } else { drift.x = DRIFT.x; drift.z = DRIFT.z; drift.h = 1; } advance(); } },
  barge: { begin() { barge.x = BARGE_LOOP[0].x; barge.z = BARGE_LOOP[0].z; barge.pi = 1; barge.speed = 4.6; barge.path = BARGE_LOOP; barge.lit = true; advance(); } },
  crowd: { begin() { const sq = beaconSpots.square; peds.forEach((p, k) => { const a = -1.1 + (k % 7) / 6 * 2.2, r = 7 + Math.floor(k / 7) * 2.6; p.crowd = { x: sq.x + Math.sin(a) * r, z: sq.z - 6 + Math.cos(a) * r, h: Math.atan2(-Math.sin(a), -Math.cos(a)) }; }); advance(); } },
  fx: { begin(s, d) {
    if (d.k === 'dark') { barge.lit = false; barge.path = null; for (let k = 0; k < 6; k++) burst(barge.x + rnd(-8, 8), rnd(3, 12), barge.z + rnd(-8, 8), 10, 0xc18bff); SFX.zap(); if (B_STUDIO) B_STUDIO.traverse(o => { if (o.isMesh) o.material.color.setScalar(0.4); }); }
    if (d.k === 'lanterns') { g.tod = 0.9; env.key = -1; lanternLevel(1); releaseLanterns(); SFX.bell(); }
    advance(); } },
  car: { begin(s, d) { if (d.bring && !g.car) { const p = near(d.bring, -8, -6); hero.x = p.x; hero.z = p.z; hero.h = -Math.PI / 2; hero.vf = 0; hero.y = land(p.x, p.z) || 0; } },
    goal: () => ST.ui.goalCar, marks: () => [{ x: hero.x, z: hero.z }], tick() { if (g.car) advance(); } },
  boat: { begin(s, d) { if (d.k && !g.boat) moorBoat(heroBoat, MOORS.find(m => m.id === d.k)); },
    goal: () => ST.ui.goalBoat, marks: () => [{ x: heroBoat.x, z: heroBoat.z }], tick() { if (g.boat) advance(); } },
  goto: {
    begin(s, d) { s.time = d.time || 0; s.d = 0; s.lx = me().x; s.lz = me().z; s.wait = d.riddle || 0; s.asked = false; },
    goal(s, d) { return T().goals[d.goal]; }, marks(s, d) { return s.wait > 0 ? [] : [where(d.to)]; }, timer(s, d) { return d.time ? s.time : null; },
    tick(s, d, dt) { const m = me(), to = where(d.to);
      if (d.time) { s.time -= dt; if (s.time <= 0) return failJob(); }
      if (s.wait > 0) { s.wait -= dt; if (s.wait <= 0) toast(ST.ui.hintShown, 3); }
      if (d.mid && !s.asked) { s.d += dist(m.x, m.z, s.lx, s.lz); s.lx = m.x; s.lz = m.z;
        if (s.d > d.mid.d) { s.asked = true; if (inVeh()) inVeh().vf *= 0.25; SFX.boo(); buzz([40, 60, 40]); const MM = d.mid; say(T()[MM.pre], () => heart(T()[MM.heart], MM.who, MM.w, null)); return; } }
      if (d.by === 'boat' && !g.boat) return; if (d.by === 'foot' && inVeh()) return;
      if (dist(m.x, m.z, to.x, to.z) < (d.r || 10)) { if (inVeh()) inVeh().vf *= 0.2; SFX.pick(); advance(); } } },
  visit: {
    begin(s, d) { const kept = g.job.kept; s.done = kept && kept.i === g.job.i && kept.done ? kept.done : d.pts.map(() => false); s.time = d.time || 0; d.pts.forEach(p => { if (p.actor) actor(p.actor, p.x, p.z); }); },
    goal(s, d) { return fmt(T().goals[d.goal], { a: s.done.filter(Boolean).length, b: d.pts.length }); }, marks(s, d) { return d.pts.filter((_p, n) => !s.done[n]); }, timer(s, d) { return d.time ? s.time : null; },
    tick(s, d, dt) { if (d.time) { s.time -= dt; if (s.time <= 0) return failJob(); } },
    near(s, d) { if (inVeh()) return null; for (let n = 0; n < d.pts.length; n++) { const p = d.pts[n]; if (!s.done[n] && dist(pl.x, pl.z, p.x, p.z) < 4.6) return { kind: 'visit', n, label: fmt(ST.ui[d.label], { n: p.actor ? ST.names[p.actor] : '' }) }; } return null; },
    use(s, d, n) { const p = d.pts[n], fin = () => { s.done[n] = true; burst(p.x, 2, p.z, 20, 0x7dff9a); if (p.scr !== undefined) SFX.zap(); if (d.each) d.each(s.done.filter(Boolean).length); addPts(3); if (s.done.every(Boolean)) advance(); };
      const q = () => p.q ? ask(T().quiz[p.q], p.who, d.ok || 'pixel', first => { if (first) addPts(3); fin(); }) : p.heart ? heart(T()[p.heart], p.who, p.w, fin) : say(T()[p.say], fin);
      if (p.actor && actors[p.actor]) actors[p.actor].h = Math.atan2(pl.x - p.x, pl.z - p.z);
      if (p.pre) say(T()[p.pre], q); else q(); } },
  catch: {   // someone is hurrying somewhere they should not go: get to them first
    begin(s, d) { const a = actors[d.id]; a.path = d.path.slice(1); a.sp = d.sp; s.len = 0; for (let k = 1; k < d.path.length; k++) s.len += dist(d.path[k - 1].x, d.path[k - 1].z, d.path[k].x, d.path[k].z); },
    goal(s, d) { return T().goals[d.goal]; }, marks(s, d) { return [actors[d.id]]; }, timer(s, d) { const a = actors[d.id]; let left = 0, px = a.x, pz = a.z; for (const p of a.path || []) { left += dist(px, pz, p.x, p.z); px = p.x; pz = p.z; } return left / d.sp; },
    tick(s, d) { const a = actors[d.id], m = me(); if (!a.path || !a.path.length) return failJob();
      if (dist(m.x, m.z, a.x, a.z) < (inVeh() ? 8 : 3.5)) { a.path = null; if (inVeh()) inVeh().vf *= 0.1; SFX.pick(); advance(); } },
    retry(s, d) { const a = actors[d.id], p = d.path[0]; a.x = p.x; a.z = p.z; } },
  tail: {   // follow the van home without being noticed: not too close, not too far
    begin(s) { s.i = 1; s.seen = 0; s.lost = 0; const p = TAIL.map(([k, l]) => ({ x: roadC(k), z: roadC(l) })); s.pts = p; van.x = p[0].x; van.z = p[0].z + 3; van.h = Math.PI / 2; van.vf = 0; s.wait = 3; toast(ST.ui.tailStart, 4); },
    goal(s, d) { return T().goals[d.goal]; }, marks() { return [van]; },
    tick(s, d, dt) { const m = me(), gap = dist(van.x, van.z, m.x, m.z); if (s.wait > 0) { if (gap < 48) s.wait -= dt; return; }
      const a = s.pts[s.i - 1], b = s.pts[s.i], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, tx = b.x - uz * 3, tz = b.z + ux * 3, ex = tx - van.x, ez = tz - van.z, ed = Math.hypot(ex, ez);
      const sp = gap > 72 ? 3 : gap > 56 ? 7 : gap < 16 ? 17 : 12.5; /* it dawdles when you fall behind, so a red light does not lose it for you */ van.vf += (sp - van.vf) * Math.min(1, dt * 2);
      if (ed < 4) { s.i++; if (s.i >= s.pts.length) { van.x = 9999; return advance(); } } else { van.x += ex / ed * van.vf * dt; van.z += ez / ed * van.vf * dt; van.h += angDiff(Math.atan2(ex, ez), van.h) * Math.min(1, dt * 5); }
      if (gap < 13) s.seen += dt * 1.2; else s.seen = Math.max(0, s.seen - dt * 0.5); if (gap > 92) s.lost += dt; else s.lost = Math.max(0, s.lost - dt);
      const bar = $('tag'), v = Math.max(s.seen / 3.5, s.lost / 5); bar.hidden = v < 0.08; if (v >= 0.08) { $('tag-t').textContent = s.seen / 3.5 > s.lost / 5 ? ST.ui.tooClose : ST.ui.tooFar; $('tag-i').style.width = Math.min(100, v * 100) + '%'; }
      if (v >= 1) { bar.hidden = true; return failJob(); } } },
  tag: {
    begin(s, d) { s.n = 0; s.hold = 0; s.cool = 0; s.time = d.time || 0;
      if (d.what === 'barge') { s.b = 3; const kept = g.job.kept; if (kept && kept.i === g.job.i) s.n = kept.n || 0; if (!barge.path) barge.path = BARGE_LOOP; } else { s.b = drones.length; drones.forEach((q, k) => { q.alive = true; q.fall = 0; q.obj.visible = true; q.obj.rotation.set(0, 0, 0); const sc = screens[[1, 0, 2, 4, 5][k % 5]]; q.hx = sc.x + Math.sin(sc.yaw) * 7; q.hz = sc.z + Math.cos(sc.yaw) * 7; q.c.x = q.hx; q.c.z = q.hz; }); } },
    goal(s, d) { return fmt(T().goals[d.goal], { a: s.n, b: s.b }); }, marks(s, d) { return d.what === 'barge' ? [barge] : drones.filter(q => q.alive).map(q => q.c); }, timer(s, d) { return d.time ? s.time : null; },
    tick(s, d, dt) { const m = me(); if (d.time) { s.time -= dt; if (s.time <= 0) return failJob(); }
      if (d.what === 'barge') { if (s.cool > 0) s.cool -= dt; const dd = dist(barge.x, barge.z, m.x, m.z); barge.speed = s.cool > 0 ? 6.5 : 4.2 + s.n * 0.4;
        tagging(s, g.boat && dd < 26 && !(s.cool > 0) ? barge : null, dt, 2, () => { s.n++; s.cool = 3.5; addPts(6); burst(barge.x, 8, barge.z, 26, 0x7dff9a); if (s.n >= 3) { barge.path = null; barge.vf = 0; advance(); } }); }
      else { let best = null, bd = 13; drones.forEach((q, k) => { if (!q.alive) return; const a = g.t * 0.7 + k * 1.3; q.c.x = q.hx + Math.cos(a) * 5; q.c.z = q.hz + Math.sin(a) * 5; q.c.h = -a; }); for (const q of drones) { if (!q.alive) continue; const dd = dist(q.c.x, q.c.z, m.x, m.z); if (dd < bd) { bd = dd; best = q; } }
        tagging(s, best, dt, 1.8, q => { q.alive = false; q.fall = 0.01; s.n++; addPts(4); if (s.n >= s.b) advance(); }); } } },
  shake: {   // camera drones on your tail: get through the points before they box you in
    begin(s, d) { s.i = 0; s.time = d.time; drones.forEach((q, k) => { q.alive = k < 3; q.fall = 0; q.obj.visible = k < 3; q.obj.rotation.set(0, 0, 0); q.c.x = me().x + (k - 1) * 5; q.c.z = me().z + 14; }); toast(ST.ui.chased, 3); },
    goal(s, d) { return fmt(T().goals[d.goal], { a: s.i, b: d.pts.length }); }, marks(s, d) { return [d.pts[s.i]]; }, timer(s) { return s.time; },
    tick(s, d, dt) { const m = me(); s.time -= dt; if (s.time <= 0) return failJob();
      drones.forEach((q, k) => { if (!q.alive) return; const h = m.h, tx = m.x - Math.sin(h) * (9 + k * 3) + Math.cos(h) * (k - 1) * 4, tz = m.z - Math.cos(h) * (9 + k * 3) - Math.sin(h) * (k - 1) * 4; q.c.x += (tx - q.c.x) * Math.min(1, dt * 1.6); q.c.z += (tz - q.c.z) * Math.min(1, dt * 1.6); q.c.h = Math.atan2(m.x - q.c.x, m.z - q.c.z); });
      const p = d.pts[s.i]; if (dist(m.x, m.z, p.x, p.z) < 10) { s.i++; s.time = d.time; SFX.pick(); buzz(20); if (s.i >= d.pts.length) { drones.forEach(q => { if (q.alive) { q.alive = false; q.fall = 0.01; } }); advance(); } } } },
  chase: {   // someone is getting away across the water: keep them in sight to the end
    begin(s, d) { s.i = 0; s.time = 34; s.pts = d.pts; const m = me(); kaiBoat.x = m.x - 26; kaiBoat.z = m.z + 22; kaiBoat.h = Math.PI; kaiBoat.vf = 0; },
    goal(s, d) { return fmt(T().goals[d.goal], { a: s.i, b: s.pts.length }); }, marks(s) { return [s.pts[s.i]]; }, timer(s) { return s.time; },
    tick(s, d, dt) { const m = me(); s.time -= dt; if (s.time <= 0) return failJob();
      const p = s.pts[s.i]; if (dist(m.x, m.z, p.x, p.z) < 13) { s.i++; s.time = 30; SFX.pick(); buzz(20); if (s.i >= s.pts.length) { const mo = MOORS[1]; kaiBoat.x = mo.bx + 9; kaiBoat.z = mo.bz - 6; kaiBoat.h = 0.4; kaiBoat.vf = 0; return advance(); } }
      const tg = s.pts[Math.min(s.pts.length - 1, s.i + 1)], dx = tg.x - kaiBoat.x, dz = tg.z - kaiBoat.z, dd = Math.hypot(dx, dz), gap = dist(kaiBoat.x, kaiBoat.z, m.x, m.z), sp = gap > 80 ? 5 : gap < 30 ? 26 : 17;   // he stays one buoy ahead
      if (dd > 3) { kaiBoat.x += dx / dd * sp * dt; kaiBoat.z += dz / dd * sp * dt; kaiBoat.h += angDiff(Math.atan2(dx, dz), kaiBoat.h) * Math.min(1, dt * 4); kaiBoat.vf = sp; if (Math.random() < dt * 20) burst(kaiBoat.x - Math.sin(kaiBoat.h) * 2.4, -0.6, kaiBoat.z - Math.cos(kaiBoat.h) * 2.4, 1, 0xffffff, 1.2, 2.2); } else kaiBoat.vf = 0; },
    retry() { if (!g.boat) return; const mo = MOORS[0]; g.boat.x = mo.bx; g.boat.z = mo.bz + 14; g.boat.h = 0; g.boat.vf = 0; } }
};
function tagging(s, target, dt, need, done) {   // stay close long enough and the shield tags it
  const bar = $('tag');
  if (!target) { s.hold = Math.max(0, s.hold - dt * 1.5); bar.hidden = s.hold <= 0; $('tag-i').style.width = (s.hold / need * 100) + '%'; return; }
  s.hold += dt; bar.hidden = false; $('tag-t').textContent = ST.ui.tagging; $('tag-i').style.width = Math.min(100, s.hold / need * 100) + '%';
  if (s.hold >= need) { s.hold = 0; bar.hidden = true; toast(ST.ui.tagged, 1.4); SFX.zap(); buzz([30, 30, 30]); const o = target.c || target; burst(o.x, (target.c ? 5 : 2), o.z, 20, 0xffe08a); done(target); }
}
function clearBy(n) { g.clear = clamp(g.clear + n, 0, 12); save(); }
function heart(Q, who, w, after) {   // no right answer here: how you treat people who were fooled, faked or foolish decides how clearly the town ends up seeing
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
function cleanup() { drones.forEach(q => { q.obj.visible = false; q.alive = false; }); $('tag').hidden = true; peds.forEach(p => { if (p.crowd) pedSpawn(p); }); }
function finishJob() {
  const id = g.job.id; g.job.live = false; cleanup(); SFX.win(); buzz([30, 40, 30, 40, 80]); g.done.push(id); g.job = null; addPts(20); g.unread = true; g.news = ST.news[id];
  if (window.DSKPoints) { DSKPoints.addPoints(id === LAST ? 20 : 5, ST.ui.reason); if (DSKPoints.markComboActivity) DSKPoints.markComboActivity('quest'); }
  const m = me(); for (let k = 0; k < 5; k++) setTimeout(() => burst(m.x + rnd(-6, 6), rnd(5, 10), m.z + rnd(-6, 6), 14, [0xffe08a, 0x7dd3ff, 0xff9ad5][k % 3]), k * 220);
  if (id === LAST) g.ending = g.clear >= 10 ? 'best' : g.clear >= 5 ? 'ok' : 'low';
  save(); if (id !== LAST) homes();
  banner('ok', ST.jobs[id].name, ST.jobs[id].lesson, 20, () => { paintGoal(); $('b-phone').classList.add('dot'); if (id === LAST) showEnd(); else if (AUTO[id]) startJob(AUTO[id]); else showNews(); });
}
function failJob() {   // out of time, spotted, lost them: the same step again, from where you are
  const j = g.job, d = DEF[j.id][j.i]; j.live = false; SFX.bad(); $('tag').hidden = true; if (j.s.done || j.s.n) j.kept = { i: j.i, done: j.s.done, n: d.t === 'tag' && d.what === 'barge' ? j.s.n : 0 };
  banner('fail', ST.jobs[j.id].name, '', 0, () => { j.live = true; if (STEP[d.t].retry) STEP[d.t].retry(j.s, d); enter(); });
}
function showNews() { if (!g.news || !inVeh() || g.busy) return; const n = $('news'); $('news-h').textContent = ST.ui.news; $('news-t').textContent = g.news; n.hidden = false; g.newsT = 11; g.news = null; }
function showEnd() {
  const E = ST.endings[g.ending || 'ok']; $('e-h').textContent = E.h; $('e-p').textContent = E.p;
  $('e-img').src = g.ending === 'low' ? '/assets/arcade/shieldy-ready.webp' : '/assets/arcade/shieldy-cheer.webp';
  const ul = $('e-todo'); ul.innerHTML = ''; ST.todo.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
  g.busy = 'end'; $('ov-end').hidden = false; $('b-keep').focus(); g.party = g.ending === 'best' ? 60 : g.ending === 'ok' ? 25 : 6;
}
function paintGoal() {
  const U = ST.ui, j = g.job, d = cur(), S = d && STEP[d.t];
  if (d && S.goal) { $('h-ch').textContent = ST.jobs[j.id].name; $('h-goal').textContent = S.goal(j.s, d); }
  else if (j) { $('h-ch').textContent = ST.jobs[j.id].name; $('h-goal').textContent = ''; }
  else if (g.trial) { $('h-ch').textContent = U.trial; $('h-goal').textContent = fmt(U.trialGoal, { a: g.trial.i, b: g.trial.pts.length }); }
  else { const n = nextJob(); $('h-ch').textContent = n ? fmt(U.chapter, { n: CH[n] }) + ' · ' + ST.chapters[CH[n]].name : U.title; $('h-goal').textContent = n ? U.freeRoam : U.allDone; }
  const tm = g.trial ? g.trial.t : d && S.timer ? S.timer(j.s, d) : null; $('h-time').hidden = tm === null; if (tm !== null) { $('h-time').textContent = g.trial ? tm.toFixed(1) : fmt(U.timeLeft, { t: Math.ceil(tm) }); $('h-time').classList.toggle('low', !g.trial && tm < 10); }
  $('h-bad').textContent = g.badges.length + '/' + badgeObjs.length;
}

/* ───────────── doing things: the one action button ───────────── */
function moorBoat(b, mo) { b.x = mo.bx; b.z = mo.bz; b.h = mo.h; b.vf = 0; b.vl = 0; }
function nearest() {   // what the action button would do right now
  const m = me(), j = g.job, d = cur();
  if (!j && !g.trial) { const n = nextJob(); if (n) { const b = beaconSpots[START[n]]; if (dist(m.x, m.z, b.x, b.z) < 8) return { kind: 'job', id: n, label: fmt(ST.ui.startJob, { n: ST.jobs[n].name }) }; }
    for (const t of TRIALS) if ((t.boat ? !!g.boat : !!g.car) && dist(m.x, m.z, t.pts[0].x, t.pts[0].z) < 9) return { kind: 'trial', t, label: ST.ui.trialStart }; }
  if (d && STEP[d.t].near) { const v = STEP[d.t].near(j.s, d); if (v) return v; }
  if (g.car) return Math.abs(g.car.vf) < 6 && g.car.air <= 0 ? { kind: 'out', label: ST.ui.getOut } : null;
  if (g.boat) { if (Math.abs(g.boat.vf) > 7) return null; for (const mo of MOORS) if (dist(g.boat.x, g.boat.z, mo.bx, mo.bz) < 18) return { kind: 'ashore', mo, label: ST.ui.ashore }; return null; }
  let best = null, bd = 4.2; for (const c of cars) { if (!c.obj.visible || c.kind === 'npc') continue; const dd = dist(pl.x, pl.z, c.x, c.z) - c.half * 0.5 + (c.kind === 'traffic' ? 1.6 : 0); if (dd < bd) { bd = dd; best = c; } }
  if (best) return best.kind === 'traffic' ? { kind: 'no', label: ST.ui.getIn, why: 'notYours' } : g.cold ? { kind: 'no', label: ST.ui.getIn, why: 'coldCar' } : { kind: 'in', car: best, label: ST.ui.getIn };
  for (const b of boats) if (b.kind === 'own' && dist(pl.x, pl.z, b.x, b.z) < 9.5) return { kind: 'aboard', boat: b, label: ST.ui.aboard };
  for (const id in actors) { const a = actors[id]; if (!a.gone && !a.path && dist(pl.x, pl.z, a.x, a.z) < 2.8 && ST.talk.who[id] && ST.talk.who[id][chapterNow()]) return { kind: 'bark', who: id, label: fmt(ST.ui.talkTo, { n: ST.names[id] }) }; }
  for (const p of peds) if (dist(pl.x, pl.z, p.x, p.z) < 2.3) return { kind: 'bark', who: 'cit', ped: p, label: ST.ui.talk };
  return null;
}
function act() {
  if (g.mode !== 'play') return;
  if (g.busy === 'dlg') return nextLine(); if (g.busy === 'banner') return ($('bn-ok').hidden ? $('bn-retry') : $('bn-ok')).click(); if (g.busy) return;
  const n = nearest(); if (!n) return;
  if (n.kind === 'job') { if (inVeh()) inVeh().vf = 0; return startJob(n.id); }
  if (n.kind === 'trial') return startTrial(n.t);
  if (n.kind === 'visit') return STEP.visit.use(g.job.s, cur(), n.n);
  if (n.kind === 'bark') { const ch = chapterNow(); if (!n.ped) { actors[n.who].h = Math.atan2(pl.x - actors[n.who].x, pl.z - actors[n.who].z); return say([{ s: n.who, t: ST.talk.who[n.who][ch] }]); }
    const B = g.cold ? ST.talk.cold : ST.talk.warm[ch] || ST.talk.warm[5], k = (g.barkN = (g.barkN || 0) + 1) % B.length; n.ped.h = Math.atan2(pl.x - n.ped.x, pl.z - n.ped.z) + (g.cold ? Math.PI : 0); if (g.cold) SFX.boo(); return say([{ s: 'cit', t: B[k] }]); }
  if (n.kind === 'no') return toast(ST.ui[n.why], 3.4);
  if (n.kind === 'in') { g.car = n.car; pl.fig.g.visible = false; n.car.vf = 0; n.car.vl = 0; if (n.car.badge) n.car.badge.visible = false; SFX.door(); g.camYaw = n.car.h; rNext = 0; hint(); showNews(); return; }
  if (n.kind === 'aboard') { g.boat = n.boat; n.boat.vf = 0; if (n.boat.badge) n.boat.badge.visible = false; SFX.splash(); g.camYaw = n.boat.h; rNext = 0; hint(); showNews(); return; }
  if (n.kind === 'ashore') { const b = g.boat; moorBoat(b, n.mo); if (b.badge) b.badge.visible = true; g.boat = null; pl.x = n.mo.lx; pl.z = n.mo.lz; pl.y = land(pl.x, pl.z) || 0; pl.h = b.h; SFX.door(); hint(); return; }
  if (n.kind === 'out') { const c = g.car, r = { x: -Math.cos(c.h), z: Math.sin(c.h) }; let ok = false;
    for (const sd of [-1, 1]) { const p = { x: c.x + r.x * (c.r + 1.1) * sd, z: c.z + r.z * (c.r + 1.1) * sd }, q = { x: p.x, z: p.z }; if (land(p.x, p.z) !== null && !pushOut(q, 0.45) && !cars.some(o => o !== c && dist(o.x, o.z, p.x, p.z) < o.half)) { pl.x = p.x; pl.z = p.z; ok = true; break; } }
    if (!ok) { pl.x = c.x - Math.sin(c.h) * (c.half + 1); pl.z = c.z - Math.cos(c.h) * (c.half + 1); if (land(pl.x, pl.z) === null) { pl.x = c.x; pl.z = c.z; } }
    c.vf = 0; c.vl = 0; if (c.badge) c.badge.visible = true; g.car = null; pl.fig.g.visible = true; pl.h = c.h; pl.y = land(pl.x, pl.z) || 0; SFX.door(); hint(); }
}
function hint() { const U = ST.ui, v = inVeh(); $('t-hint').textContent = g.boat ? (fine ? U.keysBoat : U.touchBoat) : g.car ? (fine ? U.keysCar : U.touchCar) : (fine ? U.keysFoot : U.touchFoot); $('hint').hidden = false; g.hintT = 7; $('b-hb').textContent = v ? '⏹' : '⤒'; $('speed').hidden = !v; $('b-radio').hidden = !v; $('sp-u').textContent = g.boat ? U.knots : U.kmh; paintRadio(); }
function paintRadio() { const U = ST.ui; $('b-radio').textContent = '♪ ' + (music && g.radio ? U['radio' + g.radio] : U.radioOff); }
function phoneMsg() {   // a clip lands on your phone while you roam: pass it on, or check it first?
  const left = ST.msgs.map((_m, k) => k).filter(k => !g.msgs.includes(k)); if (!left.length) return;
  const k = left[Math.floor(Math.random() * left.length)]; g.msgReady = false; $('b-msg').hidden = true; if (inVeh()) inVeh().vf *= 0.2;
  ask(ST.msgs[k], 'clip', 'iris', first => { g.msgs.push(k); addPts(first ? 10 : 4); toast(fmt(ST.ui.msgGood, { n: first ? 10 : 4 })); g.msgT = 95; save(); });
}
function callCar() {   // your own car, and your boat, brought to where you can reach them
  if (g.car || g.boat || g.busy && g.busy !== 'phone') return; if (g.cold) { closePhone(); return toast(ST.ui.coldCar, 3.4); }
  const onTown = Math.abs(pl.x) <= LIM && pl.z <= QUAY && pl.z >= -LIM;
  if (onTown) { const k = clamp(Math.round((pl.x + EDGE) / PITCH), 0, NB), l = clamp(Math.round((pl.z + EDGE) / PITCH), 0, NB), x = roadC(k) + (pl.x > roadC(k) ? 3 : -3), z = roadC(l) + (pl.z > roadC(l) ? 14 : -14);
    hero.x = x; hero.z = clamp(z, -EDGE, EDGE - 8); hero.h = pl.x > roadC(k) ? 0 : Math.PI; hero.vf = 0; hero.y = 0; if (!g.job || !g.job.tow) moorBoat(heroBoat, MOORS[0]); }
  else { let mo = MOORS[0], bd = 1e9; for (const q of MOORS) { const dd = dist(q.lx, q.lz, pl.x, pl.z); if (dd < bd) { bd = dd; mo = q; } } moorBoat(heroBoat, mo); }
  closePhone(); SFX.horn(); toast(ST.ui.called, 3);
}

/* ───────────── time trials: something to do between jobs ───────────── */
const node = (k, l) => ({ x: roadC(k), z: roadC(l) });
const TRIALS = [{ id: 'road', pts: [node(7, 5), node(7, 2), node(5, 2), node(5, 0), node(2, 0), node(2, 3), node(0, 3), node(0, 6), node(3, 6), node(3, 7), node(7, 7), node(7, 5)] },
  { id: 'sea', boat: true, pts: [{ x: 99, z: 330 }, { x: 0, z: 420 }, { x: -110, z: 420 }, { x: -170, z: 490 }, { x: -235, z: 430 }, { x: -170, z: 372 }, { x: -60, z: 340 }, { x: 40, z: 330 }, { x: 99, z: 330 }] }];
function startTrial(t) { g.trial = { t: 0, i: 1, id: t.id, pts: t.pts, boat: t.boat }; SFX.tick(); toast(ST.ui.trialGo, 2); }
function trialTick(dt) { const R2 = g.trial, m = me(); R2.t += dt; if ((R2.boat && !g.boat) || (!R2.boat && !g.car) || R2.t > 600) { g.trial = null; return toast(ST.ui.trialOff, 2.4); }
  const p = R2.pts[R2.i]; if (dist(m.x, m.z, p.x, p.z) < 12) { R2.i++; SFX.pick(); buzz(20);
    if (R2.i >= R2.pts.length) { const old = g.best[R2.id], best = !old || R2.t < old; if (best) g.best[R2.id] = +R2.t.toFixed(1); g.trial = null; addPts(best ? 15 : 5); SFX.win(); toast(fmt(best ? ST.ui.trialBest : ST.ui.trialDone, { t: R2.t.toFixed(1) }), 4); save(); } } }

/* ───────────── the map: drawn once, then moved under a window ───────────── */
const MAPW = 620, MAPH = 800, MX = 310, MZ = 250;   // 1 px = 1 m; world (0,0) sits at (MX, MZ)
const mapC = document.createElement('canvas'); mapC.width = MAPW; mapC.height = MAPH;
function drawMap() {
  const x = mapC.getContext('2d'), R2 = (c, x0, z0, x1, z1) => { x.fillStyle = c; x.fillRect(MX + x0, MZ + z0, x1 - x0, z1 - z0); };
  R2('#3aa7c9', -MX, -MZ, MAPW, MAPH); R2('#b9b3a6', -LIM, -LIM, LIM, SHORE); R2('#4a4f5c', -EDGE - 6, -EDGE - 6, EDGE + 6, EDGE + 6);
  for (const q of ZONES) { x.fillStyle = q.kind === 'sand' ? '#e8d49a' : q.kind === 'quay' ? '#c4c6c8' : q.kind === 'isle' ? '#7fb86a' : '#9a7b55'; if (q.c) { x.beginPath(); x.arc(MX + q.x, MZ + q.z, q.r, 0, 7); x.fill(); } else x.fillRect(MX + q.x0, MZ + q.z0, q.x1 - q.x0, q.z1 - q.z0); }
  R2('#3aa7c9', -MOUTH, EDGE + 6, MOUTH, SHORE + 1);
  const col = { h: '#8fc46a', a: '#e6c27a', o: '#c9b08a', g: '#7fd0d6', d: '#f2a7b8', m: '#f0a070', p: '#4faa4a', s: '#c8644a', l: '#e9e4d6', q: '#e2b93b', r: '#c06be0', t: '#f6b9c6', C: '#e8dcc0', S: '#d24fd0', w: '#3aa7c9', c: '#c0392b', K: '#d9b56a', Z: '#b5533c', F: '#7ed36f', G: '#7ed36f', R: '#f3b0a0', B: '#f3c9a0', H: '#8d99a6', I: '#a9c8e8' };
  for (const B of blocks) { x.fillStyle = col[B.type] || '#aaa'; x.fillRect(MX + B.x - HB, MZ + B.z - HB, HB * 2, HB * 2); }
}
function route(m, to) {   // a line along the streets from you to the mark, for the map
  const nk = p => clamp(Math.round((p.x + EDGE) / PITCH), 0, NB), nl = p => clamp(Math.round((p.z + EDGE) / PITCH), 0, NB);
  if (g.boat || land(to.x, to.z) === null || land(m.x, m.z) === null || Math.abs(to.x) > LIM || Math.abs(m.x) > LIM || to.z > 340 || m.z > 340) return [m, to];
  // the beach and the quay are joined to each other only by the coast road, so a way to or from them goes up to it first
  const S0 = roadC(NB), up = p => p.z > S0 + 3 ? { x: clamp(p.x, -EDGE, EDGE), z: S0 } : null, m1 = up(m), t1 = up(to);
  if (m1 && t1 && Math.sign(m.x) === Math.sign(to.x)) return [m, to];
  if (m1 || t1) { const mid = route(m1 || m, t1 || to); return (m1 ? [m] : []).concat(mid, t1 ? [to] : []); }
  const a = { x: roadC(nk(m)), z: roadC(nl(m)) }, b = { x: roadC(nk(to)), z: roadC(nl(to)) };
  // already on a street: stay on it to the first corner rather than doubling back
  const onNS = Math.abs(m.x - a.x) < 7, onEW = Math.abs(m.z - a.z) < 7, first = onNS && !onEW ? { x: a.x, z: b.z } : { x: b.x, z: a.z };
  return [m, onNS || onEW ? (onNS ? { x: a.x, z: m.z } : { x: m.x, z: a.z }) : a, onNS && !onEW ? { x: a.x, z: b.z } : onEW && !onNS ? { x: b.x, z: a.z } : first, b, to];
}
function drawMini(cv, size, scale, full) {
  const x = cv.getContext('2d'), m = me(), W = cv.width, H = cv.height, k = W / size;
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
  let ox, oz, sc;
  if (full) { sc = Math.min(W / MAPW, H / MAPH); ox = (W - MAPW * sc) / 2; oz = (H - MAPH * sc) / 2; x.drawImage(mapC, ox, oz, MAPW * sc, MAPH * sc); }
  else { sc = scale * k; x.save(); x.beginPath(); x.arc(W / 2, H / 2, W / 2, 0, 7); x.clip(); ox = W / 2 - (MX + m.x) * sc; oz = H / 2 - (MZ + m.z) * sc; x.fillStyle = '#3aa7c9'; x.fillRect(0, 0, W, H); x.drawImage(mapC, ox, oz, MAPW * sc, MAPH * sc); }
  const px = wx => ox + (MX + wx) * sc, pz = wz => oz + (MZ + wz) * sc, R2 = W / 2 - 7 * k;
  const dot = (wx, wz, c, r, ring) => { let ax = px(wx), az = pz(wz); if (!full) { const dx = ax - W / 2, dz = az - H / 2, d = Math.hypot(dx, dz); if (d > R2) { ax = W / 2 + dx / d * R2; az = H / 2 + dz / d * R2; } }
    x.beginPath(); x.arc(ax, az, r * k, 0, 7); x.fillStyle = c; x.fill(); if (ring) { x.lineWidth = 2 * k; x.strokeStyle = '#fff'; x.stroke(); } };
  if (mark.list[0] && (inVeh() || full)) { const P = route(m, mark.list[0]); x.beginPath(); P.forEach((p, n) => n ? x.lineTo(px(p.x), pz(p.z)) : x.moveTo(px(p.x), pz(p.z))); x.lineWidth = (full ? 3 : 4) * k; x.lineJoin = 'round'; x.strokeStyle = 'rgba(53,224,255,.9)'; x.stroke(); }
  for (const c of cars) if (c.kind === 'share' && c.obj.visible) dot(c.x, c.z, '#ffffff', 2.2);
  if (full) { for (const b of noteObjs) if (b.got) dot(b.x, b.z, '#ff9a3c', 2.6); for (const t of TRIALS) dot(t.pts[0].x, t.pts[0].z, '#c18bff', 4, true); }
  if (hero && g.car !== hero) dot(hero.x, hero.z, '#ffd23f', 3.4, true); if (heroBoat && g.boat !== heroBoat) dot(heroBoat.x, heroBoat.z, '#ffd23f', 3.4, true);
  for (const q of mark.list) dot(q.x, q.z, q.col || '#35e0ff', 5.2, true);
  const ax = full ? px(m.x) : W / 2, az = full ? pz(m.z) : H / 2, h = inVeh() ? inVeh().h : pl.h;
  x.save(); x.translate(ax, az); x.rotate(Math.PI - h); x.beginPath(); x.moveTo(0, -8 * k); x.lineTo(6 * k, 7 * k); x.lineTo(0, 4 * k); x.lineTo(-6 * k, 7 * k); x.closePath(); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 1.5 * k; x.strokeStyle = '#0d1b3e'; x.stroke(); x.restore();
  if (!full) x.restore();
}

/* ───────────── the phone: map, jobs, messages, notes, help ───────────── */
let phTab = 'map'; const TABS = ['map', 'jobs', 'msgs', 'notes', 'help'];
function openPhone() { if (g.mode !== 'play' || (g.busy && g.busy !== 'phone')) return; if (g.msgReady) return phoneMsg(); g.busy = 'phone'; $('phone').hidden = false; $('b-phone').classList.remove('dot'); paintPhone(); $('ph-x').focus(); }
function closePhone() { $('phone').hidden = true; if (g.busy === 'phone') g.busy = null; }
function paintPhone() {
  const U = ST.ui, li = (ul, cls, html) => { const e = document.createElement('li'); e.className = cls; html(e); ul.appendChild(e); return e; }, el = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  TABS.forEach(t => { $('ph-' + t).classList.toggle('on', t === phTab); $('pp-' + t).hidden = t !== phTab; });
  if (phTab === 'map') drawMini($('ph-cv'), 300, 0, true);
  if (phTab === 'jobs') { const ul = $('pp-jobs'); ul.innerHTML = ''; const nx = nextJob(); let ch = 0;
    JOBS.forEach(id => { if (CH[id] !== ch) { ch = CH[id]; li(ul, 'chap', e => { e.textContent = fmt(U.chapter, { n: ch }) + ' · ' + ST.chapters[ch].name; }); }
      const done = D(id), now = g.job ? g.job.id === id : id === nx, lock = !done && !now;
      li(ul, done ? 'done' : now ? 'now' : 'lock', e => { e.appendChild(el('b', lock ? '· · ·' : ST.jobs[id].name)); e.appendChild(el('span', done ? U.jobDone1 : now ? U.jobNow : U.jobLock)); if (done) e.appendChild(el('p', ST.jobs[id].lesson)); else if (now && !g.job) e.appendChild(el('p', fmt(U.jobAt, { n: U['at_' + START[id]] || '' }))); }); });
    li(ul, 'chap', e => { e.textContent = U.trial; }); TRIALS.forEach(t => li(ul, g.best[t.id] ? 'done' : 'now', e => { e.appendChild(el('b', U['trial_' + t.id])); e.appendChild(el('span', g.best[t.id] ? g.best[t.id] + ' s' : '—')); })); }
  if (phTab === 'msgs') { const ul = $('pp-msgs'); ul.innerHTML = ''; const got = JOBS.filter(D).reverse(); if (!got.length) li(ul, 'msg', e => { e.appendChild(el('p', U.noMsgs)); });
    got.forEach(id => { const mm = ST.inbox[id]; if (mm) li(ul, 'msg' + (mm.from === 'vale' || mm.from === 'twin' ? ' g' : ''), e => { e.appendChild(el('b', ST.names[mm.from] || mm.from)); e.appendChild(el('p', mm.t)); }); }); }
  if (phTab === 'notes') { const ul = $('pp-notes'); ul.innerHTML = '';
    li(ul, 'trust', e => { e.appendChild(el('b', U.clearH)); e.appendChild(el('span', g.clear + '/12')); const b = document.createElement('div'); b.className = 'tbar'; const i = document.createElement('i'); i.style.width = (g.clear / 12 * 100) + '%'; b.appendChild(i); e.appendChild(b); e.appendChild(el('p', U.clearP)); });
    li(ul, 'chap', e => { e.textContent = fmt(U.notesH, { a: g.notes.length, b: ST.notes.length }); });
    if (!g.notes.length) li(ul, 'msg', e => { e.appendChild(el('p', U.noNotes)); });
    g.notes.slice().sort((a, b) => a - b).forEach(k => li(ul, 'msg', e => { e.appendChild(el('b', ST.notes[k].h)); e.appendChild(el('p', ST.notes[k].t)); })); }
  if (phTab === 'help') { $('hp-1').textContent = fine ? U.helpKeys : U.helpTouch; $('hp-2').textContent = U.helpGame; $('hp-3').textContent = U.helpSafe; $('b-snd').textContent = (snd ? '🔊 ' : '🔇 ') + U.sound; $('b-mus').textContent = (music ? '♪ ' : '— ') + U.music;
    $('b-q').textContent = U.quality + ': ' + U['q_' + qPref]; $('b-call').textContent = U.callCar; }
}

/* ───────────── Lantern Night: the lights that go up at the end ───────────── */
let floats = null;
function releaseLanterns() {
  const n = 320, pos = new Float32Array(n * 3), colr = new Float32Array(n * 3), pal = [C(0xffa24a), C(0xffd070), C(0xff7a5a), C(0xffc0d8)], m = me();
  floats = { n, pos, v: [], t: 0 };
  for (let k = 0; k < n; k++) { const town = k % 3 === 0; pos.set(town ? [m.x + rnd(-45, 45), rnd(0.5, 3), m.z + rnd(-45, 45)] : [rnd(-230, 230), -0.4, SHORE + rnd(20, 190)], k * 3); floats.v.push([rnd(-0.3, 0.3), rnd(0.5, 1.5), rnd(-0.3, 0.3), rnd(0, 14)]); const c = pal[k % 4]; colr.set([c.r, c.g, c.b], k * 3); }
  const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3)); ge.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  floats.o = new THREE.Points(ge, new THREE.PointsMaterial({ map: SOFT, size: 4.2, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); floats.o.frustumCulled = false; scene.add(floats.o);
}
function floatTick(dt) { const f = floats; f.t += dt; for (let k = 0; k < f.n; k++) { const v = f.v[k]; if (f.t < v[3]) continue; f.pos[k * 3] += (v[0] + Math.sin(f.t * 0.5 + k) * 0.2) * dt; f.pos[k * 3 + 1] += v[1] * dt; f.pos[k * 3 + 2] += v[2] * dt; if (f.pos[k * 3 + 1] > 150) f.pos[k * 3 + 1] = 0; }
  f.o.geometry.attributes.position.needsUpdate = true; f.o.material.opacity = Math.min(1, f.t / 3) * (0.85 + Math.sin(f.t * 3) * 0.1); }

/* ───────────── every frame ───────────── */
let rainPts = null;
const onLand = (x, z) => land(x, z) !== null;
function camClear(tx, tz, cx, cz) {   // how far along the line from you to the camera is clear of buildings (0..1)
  for (let k = 1; k <= 6; k++) { const u = k / 6, x = tx + (cx - tx) * u, z = tz + (cz - tz) * u, B = blockAt(x, z); if (!B) continue;
    for (const q of B.rects) if (!q.low && x > q.x0 - 0.6 && x < q.x1 + 0.6 && z > q.z0 - 0.6 && z < q.z1 + 0.6) return Math.max(0.18, (k - 1) / 6); }
  return 1;
}
function update(dt) {
  g.t += dt; g.frame++;
  const playing = g.mode === 'play', free = playing && !g.busy;
  if (free) g.tod = (g.tod + dt / 540) % 1;
  env.rain += ((g.rainOn ? 1 : 0) - env.rain) * Math.min(1, dt * 0.6); g.murk += (murkNow() - g.murk) * Math.min(1, dt * 0.25);
  if (free) {
    // you
    if (g.car) { drive(g.car, dt); pl.x = g.car.x; pl.z = g.car.z; }
    else if (g.boat) { sail(g.boat, dt); pl.x = g.boat.x; pl.z = g.boat.z; }
    else {
      let mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), mz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      if (joy.on) { mx += joy.x; mz -= joy.y; } if (g.auto) { mx = g.auto.steer; mz = g.auto.gas; }
      const m = Math.hypot(mx, mz); pl.moving = m > 0.1; pl.run = m > 0.62 && !keys.ShiftLeft && !keys.ShiftRight;
      if (pl.moving) { if (m > 1) { mx /= m; mz /= m; }
        const fx = Math.sin(g.camYaw), fz = Math.cos(g.camYaw), k = Math.min(1, m), wx = (fx * mz - fz * mx) / k, wz = (fz * mz + fx * mx) / k, ox = pl.x, oz = pl.z; pl.sp = pl.run ? 6.6 : 2.5;
        pl.x += wx * pl.sp * dt; pl.z += wz * pl.sp * dt; pl.h += angDiff(Math.atan2(wx, wz), pl.h) * Math.min(1, dt * 12);
        pushOut(pl, 0.45); keepOn(pl, ox, oz, onLand);
        if (g.camHold <= 0) g.camYaw += angDiff(pl.h, g.camYaw) * Math.min(1, dt * 0.9); } else pl.sp = 0;
      for (const c of cars) { if (!c.obj.visible) continue; const dx = pl.x - c.x, dz = pl.z - c.z, d = Math.hypot(dx, dz), rr = c.half * 0.72 + 0.4; if (d < rr && d > 0.001 && onLand(c.x + dx / d * rr, c.z + dz / d * rr)) { pl.x = c.x + dx / d * rr; pl.z = c.z + dz / d * rr; } }
      const gy = land(pl.x, pl.z) || 0; pl.vy -= 24 * dt; pl.y += pl.vy * dt; if (pl.y <= gy) { pl.y = gy; pl.vy = 0; }
    }
    // traffic, boats, people, the job
    for (const c of cars) { if (c.honk > 0) c.honk -= dt; if (c.kind !== 'traffic') continue; aiDrive(c, dt); if (dist(c.x, c.z, pl.x, pl.z) > 230) aiSpawn(c, pl, 110, 200); }
    for (const b of boats) if (b.path && b !== g.boat && b.x < 9000) cruise(b, dt);
    if (g.job && g.job.tow && g.boat && drift.x < 9000) { const b = g.boat, tx = b.x - Math.sin(b.h) * 10, tz = b.z - Math.cos(b.h) * 10; drift.h += angDiff(Math.atan2(b.x - drift.x, b.z - drift.z), drift.h) * Math.min(1, dt * 2); drift.x += (tx - drift.x) * Math.min(1, dt * 1.6); drift.z += (tz - drift.z) * Math.min(1, dt * 1.6); }
    const fast = g.car && Math.abs(g.car.vf) > 4;
    for (const p of peds) { if (p.crowd) { p.x = p.crowd.x; p.z = p.crowd.z; p.h = p.crowd.h; continue; } const d = dist(p.x, p.z, pl.x, pl.z);
      if (d > 175) pedSpawn(p);
      if (p.dodge > 0) { p.dodge -= dt; p.x += p.dx * dt * 5; p.z += p.dz * dt * 5; } else { p.still = d < 2.2 && !inVeh(); if (!p.still) p.u += p.dir * p.sp * dt; pedPos(p); }
      if (fast && d < 4.2 && p.dodge <= 0) { p.dodge = 0.7; const dx = p.b.x - p.x, dz = p.b.z - p.z, m = Math.hypot(dx, dz) || 1; p.dx = dx / m; p.dz = dz / m; g.car.vf *= 0.5; if (g.carefulT <= 0) { toast(ST.ui.careful); g.carefulT = 4; buzz(30); } }
      if (!inVeh() && d < 0.8 && d > 0.001) { pl.x = p.x + (pl.x - p.x) / d * 0.8; pl.z = p.z + (pl.z - p.z) / d * 0.8; } }
    for (const id in actors) { const a = actors[id]; if (a.gone || !a.path) continue; const t = a.path[0]; if (!t) continue; const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz); if (d < 1) { a.path.shift(); continue; } a.x += dx / d * a.sp * dt; a.z += dz / d * a.sp * dt; a.h = Math.atan2(dx, dz); a.y = land(a.x, a.z) || 0; }
    if (g.carefulT > 0) g.carefulT -= dt;
    { const d = cur(); if (d && STEP[d.t].tick) STEP[d.t].tick(g.job.s, d, dt); }
    if (g.trial) trialTick(dt);
    // shields and Iris's lost notes
    const m = me(); for (const b of badgeObjs) if (!b.got && Math.abs(b.x - m.x) < 2.6 && Math.abs(b.z - m.z) < 2.6 && Math.abs(b.y - (m.y + 1.3)) < 3.4) { b.got = true; b.obj.visible = false; g.badges.push(b.n); SFX.pick(); buzz(20); burst(b.x, b.y, b.z, 12, 0xffe08a); addPts(2); toast(g.badges.length >= badgeObjs.length ? ST.ui.badgesAll : fmt(ST.ui.badge, { a: g.badges.length, b: badgeObjs.length }), 1.8); }
    for (const b of noteObjs) if (!b.got && !g.boat && Math.abs(b.x - m.x) < 2.4 && Math.abs(b.z - m.z) < 2.4) { b.got = true; b.obj.visible = false; g.notes.push(b.n); save(); SFX.lens(); buzz([20, 30, 20]); burst(b.x, 1.6, b.z, 16, 0xffa24a); const N = ST.notes[b.n]; if (g.car) g.car.vf *= 0.2; toast(g.notes.length >= noteObjs.length ? ST.ui.notesAll : fmt(ST.ui.note, { a: g.notes.length, b: noteObjs.length }), 2.4); addPts(5); say([{ s: 'iris', t: N.h + ' — ' + N.t }]); break; }
    // a clip on your phone, now and then, when nothing else is going on
    if (!g.job && !g.trial && !g.msgReady && g.msgs.length < ST.msgs.length) { g.msgT -= dt; if (g.msgT <= 0) { g.msgReady = true; $('b-msg').hidden = false; $('b-msg').textContent = '▶ ' + ST.ui.newMsg; SFX.phone(); buzz([40, 60, 40]); } }
    g.near = nearest(); const b = $('b-act'); if (g.near) { b.hidden = false; if (b.textContent !== g.near.label) b.textContent = g.near.label; } else b.hidden = true;
    if (g.frame % 6 === 0) paintGoal();
    if (inVeh()) $('sp-n').textContent = Math.round(Math.abs(inVeh().vf) * (g.boat ? 1.6 : 3.3));
    if (g.hintT > 0) { g.hintT -= dt; if (g.hintT <= 0) $('hint').hidden = true; }
    if (!probe.done && dt < 0.2) { probe.t += dt; probe.n++; if (probe.t > 5) { probe.done = true; const fps = probe.n / probe.t, was = qNow; if (fps < 34) qNow = qNow === 'high' ? 'mid' : 'low'; else if (fps > 56 && fine) qNow = qNow === 'low' ? 'mid' : 'high'; if (qNow !== was) { applyQuality(); env.key = -1; } } }
  } else $('b-act').hidden = true;
  const v = inVeh(); engine(v ? v.vf * (g.boat ? 1.3 : 1) : 0, !!v && free);
  { const m = me(), shoreD = m.z > EDGE - 30 || Math.abs(m.x) > EDGE - 30 || m.z < -EDGE + 30 ? 1 : 0.15; ambience(playing ? (g.boat ? 1.3 : shoreD) : 0, playing ? env.rain : 0); }

  // put everything where it is
  const camX = camera.position.x, camZ = camera.position.z, night = env.night > 0.35;
  if (pl.fig) { const o = pl.fig.g; if (g.boat) { o.visible = true; o.position.set(g.boat.x, g.boat.y + 0.75, g.boat.z); o.rotation.y = g.boat.h; animate(pl.fig, 'idle', 1, dt); }
    else if (!g.car) { o.position.set(pl.x, pl.y, pl.z); o.rotation.y = pl.h; const mv = pl.moving && free; animate(pl.fig, !mv ? 'idle' : pl.run ? 'run' : 'walk', pl.run ? 1.05 : 1.5, dt); } }
  for (const c of cars) { const o = c.obj; if (c.x > 9000) { o.visible = false; continue; } const mine = c === g.car, dd = dist(c.x, c.z, camX, camZ);
    o.visible = mine || dd < 260; if (!o.visible) continue;
    if (mine) { c.pitch += (clamp(-(c.acc || 0) * 0.0035, -0.045, 0.06) - c.pitch) * Math.min(1, dt * 6); c.roll += (clamp(c.steer * c.vf * 0.0045 + c.vl * 0.012, -0.12, 0.12) - c.roll) * Math.min(1, dt * 8); }
    o.position.set(c.x, c.y, c.z); o.rotation.set(c.air > 0 ? clamp(-c.vy * 0.025, -0.45, 0.45) : (c.onRamp ? -0.3 : c.pitch), c.h, c.roll, 'YXZ');
    if (c.wheels && dd < 110) for (const w of c.wheels) { w.spin.rotation.x += c.vf * dt / w.r; if (w.front) w.piv.rotation.y = mine ? -c.steer * 0.5 : c.ai && c.ai.turn ? angDiff(Math.atan2(c.ai.turn.p2.x - c.x, c.ai.turn.p2.z - c.z), c.h) * 0.5 : 0; }
    c.beam.visible = night && (mine || c.kind === 'traffic'); for (let k = 0; k < 4; k++) c.lights[k].visible = night || (k > 1 && mine && (keys.KeyS || keys.ArrowDown || keys.Space || g.hbTouch));
    if (c.badge) c.badge.rotation.y = g.t * 2; }
  for (const b of boats) { const o = b.obj; if (b.x > 9000) { o.visible = false; continue; } o.visible = b === g.boat || dist(b.x, b.z, camX, camZ) < 420; if (!o.visible) continue;
    b.y = -0.9 + b.draft + Math.sin(g.t * 1.4 + b.x * 0.3) * 0.1 + Math.min(0.25, Math.abs(b.vf) * 0.012); b.lean += (clamp(b.steer * b.vf * 0.012, -0.22, 0.22) - b.lean) * Math.min(1, dt * 4);
    o.position.set(b.x, b.y, b.z); o.rotation.set(-Math.min(0.14, Math.abs(b.vf) * 0.006) + Math.sin(g.t * 1.1 + b.z * 0.2) * 0.02, b.h, b.lean + Math.sin(g.t * 0.9 + b.x) * 0.025, 'YXZ'); if (b.badge) b.badge.rotation.y = g.t * 2; if (b.glow) b.glow.visible = !!b.lit; }
  for (const q of bobbers) { q.o.position.y = q.y + Math.sin(g.t * 1.3 + q.k) * 0.1; q.o.rotation.z = Math.sin(g.t * 1.1 + q.k * 2) * (q.tilt ? 0.12 : 0.04); }
  for (const s of spinners) s.rotation.y += dt * 0.45;
  for (const p of peds) { const o = p.fig.g, dd = dist(p.x, p.z, camX, camZ); o.visible = dd < 150; if (!o.visible) continue;
    o.position.set(p.x, SLAB + (p.crowd && g.party > 0 ? Math.abs(Math.sin(g.t * 6 + p.u)) * 0.35 : 0), p.z); o.rotation.y = p.h; if (dd < 75) animate(p.fig, p.crowd || p.still ? 'idle' : p.dodge > 0 ? 'run' : 'walk', p.dodge > 0 ? 1.2 : p.sp / 1.35, dt); }
  for (const id in actors) { const a = actors[id]; if (a.gone) continue; const o = a.fig.g, dd = dist(a.x, a.z, camX, camZ); o.visible = dd < 160; if (!o.visible) continue;
    if (!a.path) { const dp = dist(a.x, a.z, pl.x, pl.z), want = dp < 8 && !inVeh() ? Math.atan2(pl.x - a.x, pl.z - a.z) : a.home; a.h += angDiff(want, a.h) * Math.min(1, dt * 4); }
    o.position.set(a.x, a.y, a.z); o.rotation.y = a.h; if (dd < 80) animate(a.fig, a.path ? 'run' : 'idle', 1, dt); }
  for (const d of drones) { if (!d.obj.visible) continue; const c = d.c; if (d.fall > 0) { d.fall += dt; d.y = Math.max(0.4, d.y - d.fall * 14 * dt); d.obj.rotation.z += dt * 9; if (d.fall > 2.2) d.obj.visible = false; } else d.y = 6 + Math.sin(g.t * 2 + c.x) * 0.5;
    d.obj.position.set(c.x, d.y, c.z); d.obj.rotation.y = c.h; }
  for (const b of badgeObjs) if (!b.got) { b.obj.rotation.y = g.t * 2.4 + b.n; b.obj.position.y = b.y + Math.sin(g.t * 3 + b.n) * 0.15; b.obj.visible = dist(b.x, b.z, camX, camZ) < 120; }
  for (const b of noteObjs) if (!b.got) { b.obj.rotation.y = g.t * 0.8 + b.n; b.obj.position.y = b.y + Math.sin(g.t * 1.6 + b.n) * 0.2; b.obj.visible = dist(b.x, b.z, camX, camZ) < 130; }
  if (g.newsT > 0) { g.newsT -= dt; if (g.newsT <= 0) $('news').hidden = true; }
  if (g.party > 0) { g.party -= dt; if (Math.random() < dt * 3.2) { const m2 = me(), col = [0xffe08a, 0x7dd3ff, 0xff9ad5, 0x9dffb8][Math.floor(Math.random() * 4)]; burst(m2.x + rnd(-40, 40), rnd(18, 34), m2.z + rnd(-40, 40), 26, col, 9); SFX.firework(); } }
  if (floats) floatTick(dt);
  for (const q of lampGlows) q.visible = night; if (TEX.pools) TEX.pools.opacity = clamp(env.night * 1.4 - 0.3, 0, 1) * 0.42;
  if (lanterns) lanterns.glow.material.opacity = clamp(env.night * 1.5 - 0.3, 0, 1) * 0.9;
  if (water) water.uniforms.uT.value = g.t;
  if (TEX.road) TEX.road.material.roughness = 0.94 - env.rain * 0.55;
  for (const p of sparks) { if (p.t <= 0) continue; p.t -= dt; p.v.y -= p.grav * dt; p.s.position.addScaledVector(p.v, dt); p.s.material.opacity = Math.min(1, p.t * 2); if (p.t <= 0) p.s.visible = false; }

  // markers: the next job's beacon, the job's own marks, a trial's next gate
  mark.list.length = 0; const j = g.job, cd = cur();
  if (g.trial) mark.list.push({ x: g.trial.pts[g.trial.i].x, z: g.trial.pts[g.trial.i].z, col: '#c18bff', hex: 0xc18bff });
  else if (cd && STEP[cd.t].marks) for (const q of STEP[cd.t].marks(j.s, cd)) mark.list.push({ x: q.x, z: q.z });
  else if (!j && playing) { const n = nextJob(); if (n) { const b = beaconSpots[START[n]]; mark.list.push({ x: b.x, z: b.z, col: '#ffd23f', hex: 0xffd23f }); } }
  beams.forEach((b, k) => { const q = mark.list[k]; b.visible = !!q; if (q) { b.position.set(q.x, land(q.x, q.z) === null ? -0.8 : 0, q.z); b.material.color.set(q.hex || 0x35e0ff); b.material.opacity = 0.16 + Math.sin(g.t * 4) * 0.05; b.userData.ring.material.color.copy(b.material.color); b.userData.ring.scale.setScalar(1 + Math.sin(g.t * 3) * 0.12); } });

  // camera: behind you, pulled in when a building would be in the way
  const portrait = camera.aspect < 1;
  if (g.camHold > 0) g.camHold -= dt;
  let tx, ty, tz, d0, hgt;
  if (v) { const sp = Math.abs(v.vf); if (g.camHold <= 0) g.camOff *= Math.exp(-dt * 3);
    g.camYaw += angDiff(v.h, g.camYaw) * Math.min(1, dt * (g.boat ? 2.2 : 3 + sp * 0.08));
    tx = v.x; ty = v.y + 1.5; tz = v.z; d0 = (portrait ? 10.5 : 8.5) + sp * 0.1 + v.half + (g.boat ? 3 : 0); hgt = (portrait ? 4.6 : 3.4) + v.half * 0.5 + (g.boat ? 1.2 : 0); camera.fov += ((portrait ? 72 : 58) + sp * 0.45 - camera.fov) * Math.min(1, dt * 4); }
  else { tx = pl.x; ty = pl.y + 1.25; tz = pl.z; d0 = portrait ? 7.4 : 5.8; hgt = portrait ? 3.4 : 2.5; camera.fov += ((portrait ? 70 : 58) - camera.fov) * Math.min(1, dt * 4); g.camOff = 0; }
  camera.updateProjectionMatrix();
  const yaw = g.camYaw + g.camOff, sh = g.shake > 0 ? g.shake : 0; if (g.shake > 0) g.shake -= dt;
  const k = camClear(tx, tz, tx - Math.sin(yaw) * d0, tz - Math.cos(yaw) * d0); g.camK = g.camK === undefined ? k : g.camK + (k - g.camK) * Math.min(1, dt * (k < g.camK ? 14 : 3));
  v3.set(tx - Math.sin(yaw) * d0 * g.camK + rnd(-sh, sh), ty + hgt * (0.55 + 0.45 * g.camK) + rnd(-sh, sh), tz - Math.cos(yaw) * d0 * g.camK);
  camera.position.lerp(v3, g.snap ? 1 : Math.min(1, dt * 9)); g.snap = false; camera.lookAt(tx + Math.sin(yaw) * 3, ty + 0.4, tz + Math.cos(yaw) * 3);
  if (g.eye) { camera.position.set(g.eye[0], g.eye[1], g.eye[2]); camera.lookAt(g.eye[3], g.eye[4], g.eye[5]); tx = g.eye[3]; tz = g.eye[5]; }
  g.camT.x = tx; g.camT.z = tz;
  paintDay(g.tod); lamp.intensity = env.night * 60; lamp.position.set(tx + Math.sin(yaw) * 2, ty + 3.2, tz + Math.cos(yaw) * 2);
  // rain falls round the camera
  if (rainPts) { rainPts.visible = env.rain > 0.03; if (rainPts.visible) { const p = rainPts.geometry.attributes.position, a = p.array; for (let i = 0; i < a.length; i += 3) { a[i + 1] -= 34 * dt; if (a[i + 1] < 0) { a[i + 1] += 26; a[i] = rnd(-30, 30); a[i + 2] = rnd(-30, 30); } } p.needsUpdate = true; rainPts.position.set(camera.position.x + Math.sin(yaw) * 14, 0, camera.position.z + Math.cos(yaw) * 14); rainPts.material.opacity = env.rain * 0.55; } }
  clipTick(dt);
  // hide what is far away or behind you
  if (g.frame % 5 === 0) { const fx = Math.sin(yaw), fz = Math.cos(yaw), cx = camera.position.x, cz = camera.position.z, lim = scene.fog.far + 20;
    for (const q of far) { const dx = q.x - cx, dz = q.z - cz, d = Math.hypot(dx, dz); q.o.visible = d < lim + q.r && dx * fx + dz * fz > -(q.r + 12); } }
  if (g.toastT > 0) { g.toastT -= dt; if (g.toastT <= 0) $('toast').style.opacity = 0; }
  if (playing && g.frame % 3 === 0) drawMini($('mini'), 150, 0.62, false);
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); applyQuality(); resize();

/* ───────────── input ───────────── */
const canJump = () => !g.busy && !inVeh() && pl.y <= (land(pl.x, pl.z) || 0) + 0.01;
addEventListener('keydown', e => {
  if (g.mode !== 'play') return; const k = e.code;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight'].includes(k)) { if (!(k === 'Space' && document.activeElement && document.activeElement.tagName === 'BUTTON' && g.busy)) { keys[k] = true; if (!g.busy) e.preventDefault(); } }
  if (e.repeat) return;
  if (g.busy === 'dlg' && /^Digit[1-3]$/.test(k)) return choose(+k.slice(5) - 1);
  if (k === 'KeyE' || k === 'KeyF' || (k === 'Enter' && !(document.activeElement && document.activeElement.tagName === 'BUTTON'))) { e.preventDefault(); act(); }
  if (k === 'Space' && canJump()) pl.vy = 7.5;
  if (k === 'KeyP' || k === 'KeyM') { e.preventDefault(); g.busy === 'phone' ? closePhone() : openPhone(); }
  if (k === 'Escape' && g.busy === 'phone') closePhone();
  if (k === 'KeyH' && inVeh() && !g.busy) SFX.horn();
  if (k === 'KeyR' && inVeh() && !g.busy) cycleRadio();
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
  else if (e.pointerId === look.id) { const dx = e.clientX - look.x; look.x = e.clientX; if (inVeh()) g.camOff = clamp(g.camOff - dx * 0.006, -2.4, 2.4); else g.camYaw -= dx * 0.006; g.camHold = 2.2; }
});
const up = e => { if (joy.on && e.pointerId === joy.id) { joy.on = false; joy.x = joy.y = 0; $('stick').hidden = true; } if (e.pointerId === look.id) look.id = -1; };
addEventListener('pointerup', up); addEventListener('pointercancel', up);
$('b-act').onclick = act; $('d-nx').onclick = nextLine; $('bn-ok').onclick = closeBanner; $('bn-retry').onclick = closeBanner;
$('b-phone').onclick = () => (g.busy === 'phone' ? closePhone() : openPhone()); $('ph-x').onclick = closePhone; $('b-msg').onclick = () => { if (!g.busy) phoneMsg(); };
TABS.forEach(t => { $('ph-' + t).onclick = () => { phTab = t; paintPhone(); }; });
$('b-snd').onclick = () => { snd = !snd; try { localStorage.setItem('dsk_bay_snd', snd ? '1' : '0'); } catch (e) {} paintPhone(); };
$('b-mus').onclick = () => { music = !music; try { localStorage.setItem('dsk_bay_mus', music ? '1' : '0'); } catch (e) {} paintPhone(); paintRadio(); };
$('b-q').onclick = () => { const o = ['auto', 'low', 'mid', 'high']; qPref = o[(o.indexOf(qPref) + 1) % 4]; try { localStorage.setItem('dsk_bay_q', qPref); } catch (e) {} if (qPref === 'auto') { probe.done = false; probe.t = probe.n = 0; } else { probe.done = true; qNow = qPref; applyQuality(); env.key = -1; } paintPhone(); };
$('b-call').onclick = callCar;
$('b-radio').onclick = cycleRadio;
const hb = $('b-hb'); hb.addEventListener('pointerdown', e => { e.preventDefault(); if (inVeh()) g.hbTouch = true; else if (canJump()) pl.vy = 7.5; });
['pointerup', 'pointercancel', 'pointerleave'].forEach(n => hb.addEventListener(n, () => { g.hbTouch = false; }));
$('b-keep').onclick = () => { $('ov-end').hidden = true; g.busy = null; homes(); paintGoal(); };

/* ───────────── putting the town together ───────────── */
function build() {
  buildTown(); drawMap();
  for (let i = 0; i < 110; i++) { const s = sprite(0xffffff, 0.5, true); s.visible = false; scene.add(s); sparks.push({ s, t: 0, v: new THREE.Vector3(), grav: 12 }); }
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 70, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x35e0ff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); b.geometry.translate(0, 35, 0); const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 4, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.28; b.add(ring); b.userData.ring = ring; b.visible = false; scene.add(b); beams.push(b); }
  { const n = 800, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([rnd(-30, 30), rnd(0, 26), rnd(-30, 30)], i * 3); const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3)); rainPts = new THREE.Points(ge, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.16, transparent: true, opacity: 0, depthWrite: false })); rainPts.frustumCulled = false; rainPts.visible = false; scene.add(rainPts); }
  // you, just off the ferry, and your car waiting outside the terminal
  const f = beaconSpots.ferry; pl.fig = person('shieldy', 1.25); world.add(pl.fig.g); pl.x = f.x; pl.z = f.z + 3; pl.y = SLAB; pl.h = Math.PI; g.camYaw = Math.PI * 0.85;
  hero = makeCar('car-hero', f.x - 10, f.z + 11, -Math.PI / 2, 'own');   // on the forecourt, not in the road
  // cars to borrow, traffic, the news van
  const types = ['car-sedan', 'car-mini', 'car-pickup', 'car-sport', 'car-hatch', 'car-bus', 'car-ice', 'car-sedan', 'car-mini', 'car-pickup'];
  parkSpots.forEach((p, k) => makeCar(types[k % types.length], p.x, p.z, p.h, 'share'));
  const tr = ['car-sedan', 'car-hatch', 'car-taxi', 'car-pickup', 'car-bus', 'car-mini', 'car-van', 'car-taxi', 'car-ice', 'car-sedan', 'car-hatch', 'car-taxi', 'car-bus', 'car-sport', 'car-mini', 'car-van'];
  tr.forEach((n, k) => { const c = makeCar(n, 0, 0, 0, 'traffic'); c.ai = { off: 3, cruise: n === 'car-bus' || n === 'car-ice' ? 7.5 : 9 + (k % 4), stuck: 0 }; aiSpawn(c, pl, 30, 220); });
  van = makeCar('car-news', 9999, 0, 0, 'npc');
  // boats: yours, the ferry on its round, and the ones the story brings out
  heroBoat = makeBoat('boat-hero', MOORS[0].bx, MOORS[0].bz, MOORS[0].h, 'own');
  ferry = makeBoat('ferry', 164, QUAY + 30, Math.PI, 'npc'); ferry.path = [{ x: 164, z: QUAY + 34, stop: 1 }, { x: 150, z: 356 }, { x: -50, z: 415 }, { x: -186, z: 398, stop: 1 }, { x: -60, z: 440 }, { x: 150, z: 372 }]; ferry.wait = 9; ferry.speed = 7;
  kaiBoat = makeBoat('boat', 9999, 0, 0, 'npc'); drift = makeBoat('sailboat', 9999, 0, 0, 'npc'); drift.draft = 0.1;
  barge = makeBoat('barge', 9999, 0, 0, 'npc'); barge.half = 15; barge.r = 6; barge.draft = 0.5;
  { const gl2 = sprite(0xff4fd8, 30, true, false); gl2.position.y = 0.5; gl2.scale.setScalar(30 / barge.obj.scale.x); barge.obj.add(gl2); barge.glow = gl2; }
  for (let k = 0; k < 5; k++) { const obj = place('drone', 0, 0, { h: 1.3 }, 0); obj.visible = false; const beam = sprite(0xff4fd8, 5, true); beam.position.y = -0.4; beam.scale.set(4, 4, 1); obj.add(beam); drones.push({ obj, y: 6, alive: false, fall: 0, c: { x: 0, z: 0, h: 0, vf: 0, half: 1, ai: { off: 0, cruise: 9, stuck: 0, bold: true } } }); }
  B_STUDIO = blocks[PLACE.studio[1] * NB + PLACE.studio[0]].tower;
  defineJobs();
  for (let k = 0; k < 16; k++) { const name = PEDS[k % PEDS.length], fig = person(name, PED_H[name] * (0.96 + hash(k) * 0.08)); world.add(fig.g); const p = { fig, u: 0, dir: k % 2 ? 1 : -1, sp: 1.25 + hash(k + 3) * 0.7, dodge: 0, x: 0, z: 0, h: 0 }; peds.push(p); pedSpawn(p); }
  // Iris's twelve lost notes, each tied to a paper lantern, tucked away where a curious player ends up
  { const S = beaconSpots, Bk = (i, j, dx, dz) => [blockC(i) + dx, blockC(j) + dz];
    [Bk(2, 2, -19, -19), [ISLE.x - 16, ISLE.z + 14], [-120, SAND + 43], [214, QUAY - 20], Bk(5, 5, 19, -19), Bk(2, 0, 20, -20), Bk(4, 0, 9, -11), Bk(6, 4, -20, -20), Bk(2, 6, -2, 20), Bk(1, 5, 20, -4), [-LIM + 2.5, -LIM + 2.5], [-210, SAND - 4]]
      .forEach(([x, z], n) => { const y = (land(x, z) || 0) + 1.4, obj = place('paperlantern', x, z, { h: 1.1, y }, n); const h = sprite(0xff9a3c, 4, true); h.position.y = 0.5; h.scale.set(3.6, 3.6, 1); obj.add(h); noteObjs.push({ n, x, z, y, obj, got: false }); }); }
  // shields: on pavements, in the park, on the beach, in the air past each ramp, on the jetties and the island
  const spots = [];
  blocks.forEach((B, n) => { if (n % 2 === 0 && B.type !== 'w') spots.push([B.x + (hash(n) > 0.5 ? 21.5 : -21.5), B.z + (hash(n + 1) - 0.5) * 30, 0]); });
  for (let k = 0; k < 4; k++) spots.push([-205 + k * 44, SAND - 5, 0]);
  ramps.forEach(R2 => spots.push([R2.x + R2.dir * 12, R2.z, 3.2]));
  spots.push([-120, SAND + 30, 0], [151, QUAY + 36, 0], [90, QUAY + 14, 0], [ISLE.x + 16, ISLE.z + 12, 0], [ISLE.x - 12, ISLE.z - 14, 0], [-LIM + 3, 60, 0], [LIM - 3, -LIM + 3, 0], [130, QUAY - 20, 0]);
  spots.forEach(([x, z, air], n) => { const obj = place('shield', x, z, { h: 0.95 }, 0); const h = sprite(0xffe08a, 2.2, true); h.position.y = 0.5; h.scale.set(2.4, 2.4, 1); obj.add(h); badgeObjs.push({ n, x, z, y: (air || land(x, z) || 0) + 1.3, obj, got: false }); });
}
function start(d) {
  audio(); if (!radioTimer) radioTimer = setInterval(radioTick, 90);
  g.done = d ? d.done.filter(id => JOBS.includes(id)) : []; g.badges = d ? d.badges.filter(n => n < badgeObjs.length) : []; g.msgs = d ? (d.msgs || []) : []; g.notes = d ? (d.notes || []) : []; g.best = d ? (d.best || {}) : {};
  g.clear = d ? clamp(+d.clear || 0, 0, 12) : 5; g.ending = d ? d.ending || null : null; g.pts = d ? +d.pts || 0 : 0; if (!d) save();
  badgeObjs.forEach(b => { b.got = g.badges.includes(b.n); b.obj.visible = !b.got; }); noteObjs.forEach(b => { b.got = g.notes.includes(b.n); b.obj.visible = !b.got; });
  if (g.done.length) { const q = beaconSpots.hq; pl.x = q.x - 5; pl.z = q.z - 3; hero.x = q.x - 13; hero.z = q.z - 7.5; hero.h = -Math.PI / 2; if (!D('m3')) { const s = beaconSpots.square; pl.x = s.x + 4; pl.z = s.z + 2; hero.x = s.x + 6; hero.z = s.z + 10; } }
  g.mode = 'play'; g.busy = null; g.job = null; g.snap = true; g.murk = murkNow(); homes(); if (g.ending === 'best' || g.ending === 'ok') lanternLevel(1);
  $('ov-title').hidden = true; $('hud').hidden = false; $('h-pts').textContent = g.pts; hint(); paintGoal();
  if (!g.done.length) startJob('m1');
}
$('b-start').onclick = () => start(null); $('b-cont').onclick = () => start(load());
let assetsDone = false; manager.onLoad = () => { assetsDone = true; };
const assetsReady = new Promise(res => { const t = setInterval(() => { if (assetsDone) { clearInterval(t); res(); } }, 60); });
Promise.all([storyReady, assetsReady]).then(() => {
  const need = ['shield', 'wheel', 'crate', 'boat-hero', 'car-hero'].concat(NAMES.filter(n => n.startsWith('b-')));
  if (need.some(n => !M[n]) || !R.shieldy) { $('t-load').textContent = ST.ui.loadErr; window.__mbErr = 'missing ' + missing.join(','); return; }
  build(); $('ov-load').hidden = true; $('ov-title').hidden = false; g.mode = 'title';
  const d = load(), has = d && (d.done.length || d.badges.length); $('b-cont').hidden = !has; $('b-start').textContent = has ? ST.ui.fresh : ST.ui.start; $('b-start').classList.toggle('ghost', !!has); (has ? $('b-cont') : $('b-start')).focus();
  g.snap = true;
}).catch(e => { console.error(e); window.__mbErr = String(e && e.stack || e); $('t-load').textContent = 'Could not load. Please reload the page.'; });

let last = performance.now();
renderer.setAnimationLoop(() => { const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; if (!document.hidden && g.mode !== 'loading' && !window.__mbManual) { update(dt); renderer.render(scene, camera); } });

// A view of the game and the player's own inputs, so a test can play it through.
window.MirrorBay = {
  route, state: () => ({ camYaw: g.camYaw, mode: g.mode, busy: g.busy, x: me().x, z: me().z, y: me().y, h: me().h, inCar: g.car ? g.car.name : null, inBoat: g.boat ? g.boat.name : null, v: inVeh() ? inVeh().vf : 0, job: g.job ? { id: g.job.id, live: g.job.live, i: g.job.i, t: cur() ? cur().t : null, n: DEF[g.job.id].length, by: cur() ? cur().by : null } : null,
    clear: g.clear, ending: g.ending, notes: g.notes.length, done: g.done.slice(), pts: g.pts, badges: g.badges.length, badgeTotal: badgeObjs.length, cold: g.cold, rain: env.rain, q: qNow, missing: missing.slice(), trial: g.trial ? { i: g.trial.i, t: g.trial.t } : null,
    near: g.near ? g.near.kind : null, tod: g.tod, line: g.busy === 'dlg' && dlg.lines[dlg.i] ? (dlg.lines[dlg.i].c ? { choices: dlg.lines[dlg.i].c.slice() } : { who: dlg.lines[dlg.i].s }) : null, marks: mark.list.map(q => ({ x: q.x, z: q.z })), goal: $('h-goal').textContent, time: $('h-time').hidden ? null : $('h-time').textContent }),
  step: (dt, n) => { for (let k = 0; k < (n || 1); k++) update(dt); }, render: () => renderer.render(scene, camera), key: (code, down) => { keys[code] = !!down; }, auto: a => { g.auto = a; }, act, choose,
  tp: (x, z, h) => { const m = me(); m.x = x; m.z = z; if (h !== undefined) { m.h = h; g.camYaw = h; } if (inVeh()) { inVeh().vf = 0; inVeh().vl = 0; } if (m === pl) pl.y = land(x, z) || 0; g.snap = true; }, time: t => { g.tod = t; env.key = -1; },
  spots: () => beaconSpots, start: START, startJob, setDone: a => { g.done = a.slice(); g.job = null; $('dlg').hidden = true; $('bn').hidden = true; g.busy = null; homes(); paintGoal(); }, notesAt: () => noteObjs.map(b => ({ x: b.x, z: b.z, got: b.got })), actors: () => Object.values(actors).filter(a => !a.gone).map(a => ({ id: a.id, x: a.x, z: a.z })),
  cars: () => cars.map(c => ({ name: c.name, kind: c.kind, x: c.x, z: c.z, h: c.h, v: c.vf })), boats: () => boats.map(b => ({ name: b.name, kind: b.kind, x: b.x, z: b.z, h: b.h })), hero: () => ({ x: hero.x, z: hero.z }), heroBoat: () => ({ x: heroBoat.x, z: heroBoat.z }), moors: MOORS, screens, land, carOK, seaOK, trials: TRIALS, startTrial,
  drones: () => drones.map(d => ({ x: d.c.x, z: d.c.z, alive: d.alive })), peds: () => peds.map(p => ({ x: p.x, z: p.z })), setClip, rain: on => { g.rainOn = on; }, cold: on => { g.cold = on; }, quality: q => { qNow = q; probe.done = true; applyQuality(); env.key = -1; }, lanterns: setLanterns, eye: a => { g.eye = a; }, release: releaseLanterns, callCar,
  models: M, rigs: R, THREE, cam: (x, y, z, lx, ly, lz, fov) => { window.__mbManual = true; camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); camera.fov = fov || 60; camera.updateProjectionMatrix(); for (const q of far) q.o.visible = true; g.camT.x = lx; g.camT.z = lz; paintDay(g.tod); clipTick(0.03); renderer.render(scene, camera); },
  free: () => { window.__mbManual = false; }, info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }), msg: () => { g.msgT = 0; }
};
