// A player that never teleports: it walks, drives on the right-hand lane and sails, at the game's own speeds,
// so timers and collisions are tested the way a person would meet them. Runs the game's update() directly (dt = 1/30).
(async (pref, stopAfter, startDone) => {
  const K = MirrorBay, log = [], DT = 1 / 30; let lastJob = null, jobT = 0, clock = 0, fails = 0, lastSig = '', sigT = 0;
  const sleep = ms => new Promise(r => setTimeout(r, ms)), JOBS = Object.keys(K.start), d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const ang = (a, b) => { const d = a - b; return Math.atan2(Math.sin(d), Math.cos(d)); }, cl = (v, a, b) => Math.max(a, Math.min(b, v));
  for (let k = 0; k < 300 && K.state().mode === 'loading'; k++) await sleep(200);
  if (K.state().mode === 'title') document.getElementById('b-start').click();
  if (startDone) { K.setDone(startDone); const b = K.spots().hq; K.tp(b.x - 5, b.z - 3); }
  const t0 = performance.now(); window.__mbManual = true;
  const nav = { key: '', path: null, i: 1, stuck: 0, rev: 0, block: 0, side: 3, sideT: 0, recov: 0 };
  const tick = () => { K.step(DT); clock += DT; jobT += DT; };
  const moorNear = p => K.moors.slice().sort((a, b) => d2({ x: a.bx, z: a.bz }, p) - d2({ x: b.bx, z: b.bz }, p))[0];
  const stop = () => { K.auto({ gas: 0, steer: 0, hb: true }); };
  // one tick of going towards T by whatever we are in. Returns distance left.
  function go(T, o) {
    o = o || {}; const s = K.state(), P = { x: s.x, z: s.z }, left = d2(P, T);
    if (s.inBoat) { let a = Math.atan2(T.x - s.x, T.z - s.z);
      // look ahead for land; if there is some, swing to whichever side is open water
      const ok = da => K.seaOK(s.x + Math.sin(s.h + da) * 16, s.z + Math.cos(s.h + da) * 16) && K.seaOK(s.x + Math.sin(s.h + da) * 8, s.z + Math.cos(s.h + da) * 8);
      let err = ang(a, s.h); if (!ok(0) && left > 18) err = ok(0.7) ? 0.9 : ok(-0.7) ? -0.9 : 1.4;
      if (nav.rev > 0) { nav.rev -= DT; K.auto({ gas: -1, steer: 0.6 }); return left; }
      if (Math.abs(s.v) < 0.4) { nav.stuck += DT; if (nav.stuck > 2.5) { nav.stuck = 0; nav.rev = 1.6; nav.recov++; } } else nav.stuck = 0;
      const want = left < (o.slow || 26) ? 5 : 40; K.auto({ gas: Math.abs(err) > 1.2 && s.v > 6 ? 0 : s.v > want ? -0.4 : 1, steer: cl(-err * 1.6, -1, 1) }); return left; }
    const key = Math.round(T.x) + ',' + Math.round(T.z) + (s.inCar ? 'c' : 'f');
    if (nav.key !== key || !nav.path) { nav.key = key; nav.path = K.route(P, T); nav.i = 1; nav.stuck = 0; }
    const path = nav.path; while (nav.i < path.length - 1 && d2(P, path[nav.i]) < 11) nav.i++;
    const wp = path[nav.i], prev = path[nav.i - 1]; let tx = wp.x, tz = wp.z;
    if (s.inCar) { const dx = wp.x - prev.x, dz = wp.z - prev.z, L = Math.hypot(dx, dz) || 1; if (nav.sideT > 0) nav.sideT -= DT; else nav.side = 3;
      if (nav.i < path.length - 1 || left > 22) { tx += -dz / L * nav.side; tz += dx / L * nav.side; }
      // aim a little way down the lane rather than at its end, so the car settles into the lane
      const along = ((s.x - prev.x) * dx + (s.z - prev.z) * dz) / L, look = Math.min(L, Math.max(0, along) + 12 + Math.abs(s.v) * 0.5), lx = prev.x + dx / L * look + (-dz / L) * (nav.i < path.length - 1 || left > 22 ? nav.side : 0), lz = prev.z + dz / L * look + (dx / L) * (nav.i < path.length - 1 || left > 22 ? nav.side : 0);
      if (look < L - 1) { tx = lx; tz = lz; }
      const err = ang(Math.atan2(tx - s.x, tz - s.z), s.h), toCorner = d2(P, wp), corner = nav.i < path.length - 1 || left < 30;
      let want = corner && toCorner < 30 ? 9 : 24; if (o.max) want = Math.min(want, o.max); if (left < 16) want = 5;
      // something in the way?
      let blocked = false; for (const c of K.cars()) { if (c.x > 9000) continue; const rx = c.x - s.x, rz = c.z - s.z, fw = rx * Math.sin(s.h) + rz * Math.cos(s.h), lat = Math.abs(-rx * Math.cos(s.h) + rz * Math.sin(s.h)); if (fw > 1.5 && fw < 8 + Math.abs(s.v) * 0.6 && lat < 2.2 && c.name !== s.inCar + '_') { if (Math.hypot(rx, rz) > 1) { blocked = true; break; } } }
      if (blocked) { nav.block += DT; want = 0; if (nav.block > 2.2) { nav.block = 0; nav.side = -3; nav.sideT = 5; } } else nav.block = Math.max(0, nav.block - DT);
      if (nav.rev > 0) { nav.rev -= DT; K.auto({ gas: -1, steer: cl(err * 2, -1, 1) }); return left; }
      if (Math.abs(s.v) < 0.5 && want > 0) { nav.stuck += DT; if (nav.stuck > 1.6) { nav.stuck = 0; nav.rev = 1.3; nav.recov++; if (nav.wx !== undefined && d2(P, { x: nav.wx, z: nav.wz }) < 8) nav.wedge = (nav.wedge || 0) + 1; else { nav.wedge = 1; nav.wx = s.x; nav.wz = s.z; } } } else nav.stuck = 0;
      if (Math.abs(err) > 2.2 && want > 0) { K.auto({ gas: -0.8, steer: cl(err * 3, -1, 1) }); return left; }   // facing the wrong way: back round, like a three-point turn
      const gas = Math.abs(err) > 1.5 ? (s.v > 7 ? -1 : 0.55) : s.v > want + 2 ? -1 : s.v > want ? 0 : 1; K.auto({ gas, steer: cl(-err * 2.2, -1, 1), hb: want === 0 && s.v > 2 }); return left; }
    // on foot: camera-relative stick
    if (path.length > 2 && s.z < 214 && (nav.i < path.length - 1 || left > 20)) { const dx0 = wp.x - prev.x, dz0 = wp.z - prev.z, L0 = Math.hypot(dx0, dz0) || 1; tx += -dz0 / L0 * 8.5; tz += dx0 / L0 * 8.5; }   // keep to the pavement
    const a = Math.atan2(tx - s.x, tz - s.z), fx = Math.sin(s.camYaw), fz = Math.cos(s.camYaw), dx = Math.sin(a), dz = Math.cos(a);
    if (nav.px !== undefined && d2(P, { x: nav.px, z: nav.pz }) < 0.02) { nav.stuck += DT; } else nav.stuck = 0; nav.px = s.x; nav.pz = s.z;
    let sx = dx * -fz + dz * fx, sy = dx * fx + dz * fz; if (nav.stuck > 0.6) { const k = Math.floor(clock * 1.2) % 2 ? 1 : -1; sx = k; sy = 0.3; if (nav.stuck > 4) { nav.stuck = 0; nav.recov++; } }
    K.auto({ steer: sx, gas: sy }); return left;
  }
  const exit = () => { stop(); for (let k = 0; k < 90 && Math.abs(K.state().v) > 4; k++) tick(); K.auto(null); K.act(); tick(); };
  // get out of whatever we are in, close to p if we can
  function afoot(p) { const s = K.state(); if (s.inCar) { exit(); return false; }
    if (s.inBoat) { const mo = moorNear(p || s), left = go({ x: mo.bx, z: mo.bz }, { slow: 40 }); tick(); if (left < 16 || (K.state().near === 'ashore' && d2({ x: mo.bx, z: mo.bz }, K.state()) < 18)) { stop(); for (let k = 0; k < 120 && Math.abs(K.state().v) > 5; k++) tick(); K.auto(null); K.act(); tick(); } return false; }
    return true; }
  function reachOnFoot(p, r) { if (!afoot(p)) return false; const left = go(p); tick(); return left < r; }
  function incar() { const s = K.state(); if (s.inCar) return true; if (!s.inBoat && s.z > 340) { aboard(); return false; } if (s.inBoat) { afoot(K.hero()); return false; } if (!afoot()) return false; const h = K.hero(), left = go({ x: h.x, z: h.z }); tick(); if (left < 4.4 && K.state().near === 'in') { K.auto(null); K.act(); tick(); if (!K.state().inCar) log.push('could not get in car near=' + K.state().near); } else if (left < 3 && K.state().near !== 'in') { nav.stuck += 1; } return false; }
  function aboard() { const s = K.state(); if (s.inBoat) return true; const b = K.heroBoat(), mo = moorNear(b), L = { x: mo.lx, z: mo.lz };
    // far from the jetty: drive most of the way
    if (!s.inCar && d2(s, L) > 70 && d2(s, K.hero()) < d2(s, L) && !s.cold) { incar(); return false; }
    if (s.inCar) { const left = go(L); tick(); if (left < 58) exit(); return false; }
    const left = go(L); tick(); if (left < 2.5 || K.state().near === 'aboard') { K.auto(null); K.act(); tick(); if (!K.state().inBoat) log.push('could not board, near=' + K.state().near); } return false; }
  // drive (or walk if cars are refused) until close to p; true when within r
  function travel(p, r, o) { const s = K.state(), left = d2(s, p); if (left < r) return true;
    if (s.inCar && nav.wedge >= 3) { nav.wedge = 0; exit(); K.callCar(); nav.called = (nav.called || 0) + 1; return false; }   // wedged: do what a player would, get out and have the car brought round
    if (s.inBoat) { afoot(p); return false; }
    if (K.land(s.x, s.z) !== null && s.z > 340 && p.z < 300) { aboard(); return false; }   // on the island: the only way back is the boat
    if (!s.inCar && left > 45 && !s.cold && !(o && o.foot)) { incar(); return false; }
    go(p, o); tick(); return false; }
  let guard = 0;
  while (guard++ < 400000) {
    if (performance.now() - t0 > (window.__budget || 240000)) { log.push('WALL TIME UP at ' + lastSig); break; }
    if (window.__mbErr) { log.push('ERR ' + window.__mbErr); break; }
    if (guard % 400 === 0) await sleep(0);
    const s = K.state();
    if (document.getElementById('ov-end') && !document.getElementById('ov-end').hidden) { log.push('END ' + s.ending + ' clear=' + s.clear + ' game-minutes=' + (clock / 60).toFixed(1)); break; }
    const sig = [s.busy, s.job && s.job.id, s.job && s.job.i, s.done.length].join('|'); if (sig === lastSig) { sigT += DT; if (sigT > 420) { log.push('STUCK ' + sig + ' t=' + (s.job && s.job.t) + ' pos=' + Math.round(s.x) + ',' + Math.round(s.z) + ' in=' + (s.inCar || s.inBoat || 'foot') + ' near=' + s.near + ' goal=' + s.goal + ' marks=' + JSON.stringify(s.marks.slice(0, 2)) + ' path=' + JSON.stringify((nav.path || []).map(p => [Math.round(p.x), Math.round(p.z)])) + ' i=' + nav.i + ' stuck=' + nav.stuck.toFixed(1)); break; } } else { sigT = 0; lastSig = sig; }
    if (s.job && s.job.id !== lastJob) { if (lastJob) log.push(lastJob + ' took ' + Math.round(jobT) + 's'); lastJob = s.job.id; jobT = 0; }
    if (stopAfter && s.done.includes(stopAfter) && !s.busy) { log.push(lastJob + ' took ' + Math.round(jobT) + 's; stopped after ' + stopAfter); break; }
    if (s.busy === 'dlg') { K.auto(null); if (s.line && s.line.choices) { const want = pref === 'worst' ? 1 : 0; let pos = s.line.choices.indexOf(want); if (pos < 0) pos = s.line.choices.indexOf(0); if (pos < 0) pos = 0; K.choose(pos); } else K.act(); continue; }
    if (s.busy === 'banner') { if (!document.getElementById('bn-retry').hidden) { fails++; log.push('FAIL ' + (s.job && s.job.id) + ' step ' + (s.job && s.job.i) + ' ' + (s.job && s.job.t) + ' after ' + Math.round(jobT) + 's goal=' + s.goal + ' time=' + s.time + ' pos=' + Math.round(s.x) + ',' + Math.round(s.z) + ' in=' + (s.inCar || s.inBoat || 'foot') + ' hero=' + JSON.stringify(K.hero()) + ' path=' + JSON.stringify((nav.path || []).map(p => [Math.round(p.x), Math.round(p.z)])) + ' i=' + nav.i); if (fails > (window.__maxFail || 12)) break; } K.act(); continue; }
    if (s.busy) { tick(); continue; }
    if (!s.job) { const nx = JOBS.find(id => !s.done.includes(id)); if (!nx) { log.push('all done, no ending shown'); break; } const b = K.spots()[K.start[nx]];
      if (travel(b, 30)) { if (K.state().inCar) { exit(); continue; } if (reachOnFoot(b, 5)) { K.auto(null); K.act(); tick(); } } continue; }
    const t = s.job.t, m = s.marks[0];
    if (t === 'car') { incar(); continue; }
    if (t === 'boat') { aboard(); continue; }
    if (!m) { K.auto(null); tick(); continue; }
    if (t === 'goto') {
      if (s.job.by === 'boat') { if (!aboard()) continue; const mo = K.moors.find(q => d2({ x: q.bx, z: q.bz }, m) < 30); go(mo ? { x: mo.bx, z: mo.bz } : m, { slow: 30 }); tick(); continue; }
      if (s.job.by === 'foot') { reachOnFoot(m, 0); continue; }
      { const left = d2(s, m), k = s.job.id + s.job.i; if (nav.gk !== k) { nav.gk = k; nav.gbest = left; nav.gt = 0; } if (left < nav.gbest - 1.5) { nav.gbest = left; nav.gt = 0; } else nav.gt += DT;
        if (s.inCar && nav.gt > 6 && left < 80) { nav.gt = 0; exit(); continue; } }   // the car can go no nearer: walk the rest
      if (travel(m, 0)) tick(); continue; }
    if (t === 'visit') { if (travel(m, 30)) reachOnFoot(m, 0); if (K.state().near === 'visit') { K.auto(null); K.act(); } continue; }
    if (t === 'catch' || t === 'shake') { if (t === 'shake' && !incar()) continue; if (!s.inCar && d2(s, m) > 40) { incar(); continue; } go(m, t === 'catch' && d2(s, m) < 30 ? { max: 12 } : null); tick(); continue; }
    if (t === 'tail') { if (!incar()) continue; const gap = d2(s, m); if (Math.round(clock*30) % 45 === 0) (window.__tail = window.__tail || []).push([Math.round(jobT), Math.round(gap), Math.round(s.v), Math.round(m.x), Math.round(m.z), Math.round(s.x), Math.round(s.z)].join('/')); go(m, { max: gap < 26 ? 6 : gap < 40 ? 12 : 24 }); if (gap < 20) K.auto({ gas: s.v > 3 ? -1 : 0, steer: 0 }); tick(); continue; }
    if (t === 'chase') { if (!aboard()) continue; if (Math.round(clock*30) % 45 === 0) (window.__tail = window.__tail || []).push([Math.round(jobT), Math.round(s.x), Math.round(s.z), s.v.toFixed(1), s.h.toFixed(1), Math.round(m.x), Math.round(m.z), nav.rev > 0 ? 'R' : ''].join('/')); go(m); tick(); continue; }
    if (t === 'tag') { if (K.land(m.x, m.z) === null) { if (!aboard()) continue; const gap = d2(s, m); go(m, { slow: 0 }); if (gap < 19) K.auto({ gas: s.v > 5.5 ? -0.3 : 0.6, steer: 0 }); tick(); continue; }
      if (!incar()) continue; const gap = d2(s, m); go(m, { max: gap < 14 ? 10 : 24 }); tick(); continue; }
    tick();
  }
  K.auto(null); window.__mbManual = false; const s = K.state();
  return JSON.stringify({ log, done: s.done.length, clear: s.clear, ending: s.ending, fails, recov: nav.recov, gameMin: +(clock / 60).toFixed(1), err: window.__mbErr || null, called: nav.called || 0 });
})
