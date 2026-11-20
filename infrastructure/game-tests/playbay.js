(async (pref, stopAfter) => {
  const K = MirrorBay, log = []; let guard = 0, lastJob = null, stuck = 0, lastSig = '';
  const sleep = ms => new Promise(r => setTimeout(r, ms)), JOBS = Object.keys(K.start), d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  for (let k = 0; k < 300 && K.state().mode === 'loading'; k++) await sleep(200);
  if (K.state().mode === 'title') document.getElementById('b-start').click();
  const t0 = performance.now(); window.__mbManual = true;
  const moorNear = p => K.moors.slice().sort((a, b) => d2({ x: a.bx, z: a.bz }, p) - d2({ x: b.bx, z: b.bz }, p))[0];
  const afoot = near => { const s = K.state(); if (s.inCar) { K.act(); K.step(1 / 30); return false; } if (s.inBoat) { const mo = moorNear(near || s); K.tp(mo.bx, mo.bz); K.step(1 / 30); K.act(); K.step(1 / 30); if (K.state().inBoat) log.push('could not step ashore at ' + mo.id); return false; } return true; };
  const aboard = () => { const s = K.state(); if (s.inBoat) return true; if (!afoot()) return false; const b = K.heroBoat(), mo = moorNear(b); K.tp(mo.lx, mo.lz); K.step(1 / 30); K.act(); K.step(1 / 30); if (!K.state().inBoat) log.push('could not board at ' + mo.id + ' near=' + K.state().near + ' boat=' + JSON.stringify(b)); return false; };
  const incar = () => { const s = K.state(); if (s.inCar) return true; if (!afoot()) return false; const h = K.hero(); K.tp(h.x + 2.7, h.z + 0.3); K.step(1 / 30); K.act(); K.step(1 / 30); if (!K.state().inCar) { K.tp(h.x - 2.7, h.z - 0.3); K.step(1 / 30); K.act(); K.step(1 / 30); } if (!K.state().inCar) log.push('could not get in car, near=' + K.state().near + ' cold=' + K.state().cold); return false; };
  while (guard++ < 80000) {
    if (performance.now() - t0 > (window.__budget || 170000)) { log.push('TIME UP at ' + lastSig); break; }
    if (window.__mbErr) { log.push('ERR ' + window.__mbErr); break; }
    const s = K.state();
    if (document.getElementById('ov-end') && !document.getElementById('ov-end').hidden) { log.push('END ' + s.ending + ' clear=' + s.clear + ' | ' + document.getElementById('e-h').textContent); break; }
    const sig = [s.busy, s.job && s.job.id, s.job && s.job.i, s.goal, s.done.length].join('|'); if (sig === lastSig) { if (++stuck > 6000) { log.push('STUCK at ' + sig + ' near=' + s.near + ' t=' + (s.job && s.job.t) + ' pos=' + Math.round(s.x) + ',' + Math.round(s.z) + ' marks=' + JSON.stringify(s.marks)); break; } } else { stuck = 0; lastSig = sig; }
    if (s.job && s.job.id !== lastJob) { lastJob = s.job.id; log.push(s.job.id + ' (clear ' + s.clear + ')'); }
    if (stopAfter && s.done.includes(stopAfter) && !s.busy) { log.push('stopped after ' + stopAfter); break; }
    if (s.busy === 'dlg') { if (s.line && s.line.choices) { const want = pref === 'worst' ? 1 : pref === 'meh' ? 2 : 0; let pos = s.line.choices.indexOf(want); if (pos < 0) pos = s.line.choices.indexOf(0); if (pos < 0) pos = 0; K.choose(pos); } else K.act(); continue; }
    if (s.busy === 'banner') { if (!document.getElementById('bn-retry').hidden) log.push('FAIL banner in ' + (s.job && s.job.id) + ' step ' + (s.job && s.job.i) + ' ' + (s.job && s.job.t)); K.act(); continue; }
    if (s.busy) { K.step(1 / 30); continue; }
    if (!s.job) { const nx = JOBS.find(id => !s.done.includes(id)); if (!nx) { log.push('all done, no ending shown'); break; } const b = K.spots()[K.start[nx]]; if (!afoot(b)) continue; K.tp(b.x + 1, b.z + 1); K.step(1 / 30); K.act(); if (!K.state().job && K.state().busy !== 'banner') log.push('could not start ' + nx + ' near=' + K.state().near); continue; }
    K.step(1 / 30); { const s2 = K.state(); if (s2.busy || !s2.job) continue; s.marks = s2.marks; s.inCar = s2.inCar; s.inBoat = s2.inBoat; s.job = s2.job; s.goal = s2.goal; }
    const t = s.job.t, m = s.marks[0];
    if (t === 'car') { incar(); continue; }
    if (t === 'boat') { aboard(); continue; }
    if (t === 'goto') { if (!m) { K.step(1 / 30, 30); continue; }
      if (s.job.by === 'boat') { if (!aboard()) continue; K.tp(m.x + 3, m.z - 9); K.step(1 / 30); if (K.state().job && K.state().job.i === s.job.i && K.state().job.id === s.job.id) { K.tp(m.x - 6, m.z + 6); K.step(1 / 30); } continue; }
      if (s.job.by === 'foot' || (s.inBoat && K.land(m.x, m.z) !== null)) { if (!afoot(m)) continue; }
      K.tp(m.x + 0.5, m.z + 0.5); K.step(1 / 30); continue; }
    if (t === 'catch') { K.tp(m.x + 1, m.z + 1); K.step(1 / 30); continue; }
    if (t === 'shake') { if (!incar()) continue; K.tp(m.x + 0.5, m.z + 0.5); K.step(1 / 30); continue; }
    if (t === 'chase') { if (!aboard()) continue; K.tp(m.x + 0.5, m.z + 0.5); K.step(1 / 30); continue; }
    if (t === 'tail') { if (!incar()) continue; const v = K.cars().find(c => c.name === 'car-news'); K.tp(v.x - Math.sin(v.h) * 30, v.z - Math.cos(v.h) * 30); K.step(1 / 30); continue; }
    if (t === 'visit') { if (!m) { K.step(1 / 30); continue; } if (!afoot(m)) continue; K.tp(m.x + 1.2, m.z + 1.2); K.step(1 / 30); K.step(1 / 30); if (K.state().near !== 'visit') { K.tp(m.x - 1.5, m.z - 1.5); K.step(1 / 30); K.step(1 / 30); } if (K.state().near !== 'visit') log.push('visit not reachable at ' + JSON.stringify(m) + ' near=' + K.state().near + ' in ' + s.job.id); K.act(); continue; }
    if (t === 'tag') { if (!m) { K.step(1 / 30); continue; } if (/barge|masts/.test(s.goal) || K.land(m.x, m.z) === null) { if (!aboard()) continue; K.tp(m.x + 14, m.z + 14); } else K.tp(m.x + 2, m.z + 2); K.step(1 / 30); continue; }
    K.step(1 / 30);
    if (guard % 2000 === 0) await sleep(0);
  }
  window.__mbManual = false; const s = K.state();
  return JSON.stringify({ log, done: s.done.length, clear: s.clear, pts: s.pts, ending: s.ending, guard, err: window.__mbErr || null });
})
