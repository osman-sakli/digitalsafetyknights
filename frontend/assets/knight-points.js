/* Digital Safety Knights — shared Knight Points system.
   Fully client-side (localStorage only), COPPA-safe: no accounts, no PII,
   no server calls. Shared by quests.html, game.html, audit.html, and
   dashboard.html so points/level/streak stay consistent everywhere. */
(function (global) {
  var POINTS_KEY = 'dsk_knight_points';
  var STREAK_COUNT_KEY = 'dsk_streak_count';
  var STREAK_LAST_KEY = 'dsk_streak_last_date';
  var PROFILES_KEY = 'dsk_family_profiles';
  var COMBO_PREFIX = 'dsk_combo_';
  var MEMBER_SINCE_KEY = 'dsk_member_since';
  var MEMBER_ID_KEY = 'dsk_member_id';

  var LEVELS = [
    { name: 'Squire', nameTr: 'Yaver', nameEs: 'Escudero', emoji: '🪖', min: 0 },
    { name: 'Knight', nameTr: 'Şövalye', nameEs: 'Caballero', emoji: '⚔️', min: 100 },
    { name: 'Sentinel', nameTr: 'Nöbetçi', nameEs: 'Centinela', emoji: '🛡️', min: 250 },
    { name: 'Champion', nameTr: 'Şampiyon', nameEs: 'Campeón', emoji: '👑', min: 500 }
  ];

  function curLang() { return (global.DSKi18n && global.DSKi18n.lang) || 'en'; }
  function isTr() { return curLang() === 'tr'; }
  function isEs() { return curLang() === 'es'; }
  function levelName(level) { var l = curLang(); return l === 'tr' ? level.nameTr : l === 'es' ? level.nameEs : level.name; }

  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function currentNickname() { return localStorage.getItem('dsk_nickname') || 'Knight'; }

  function getPoints() { return parseInt(localStorage.getItem(POINTS_KEY) || '0', 10); }

  function recordFamilyProfile(total) {
    var profiles = getFamilyProfiles();
    profiles[currentNickname()] = total;
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }
  function getFamilyProfiles() {
    try { return JSON.parse(localStorage.getItem(PROFILES_KEY)) || {}; } catch (e) { return {}; }
  }
  function familyTotal() {
    var profiles = getFamilyProfiles();
    var sum = 0;
    for (var k in profiles) { if (profiles.hasOwnProperty(k)) sum += profiles[k]; }
    return sum;
  }

  function getMemberSince() {
    var since = localStorage.getItem(MEMBER_SINCE_KEY);
    if (!since) {
      since = todayStr();
      localStorage.setItem(MEMBER_SINCE_KEY, since);
    }
    return since;
  }

  function getMemberId() {
    var id = localStorage.getItem(MEMBER_ID_KEY);
    if (!id) {
      var n = Math.floor(100000 + Math.random() * 900000);
      id = 'DSK-' + n;
      localStorage.setItem(MEMBER_ID_KEY, id);
    }
    return id;
  }

  function addPoints(amount, reason) {
    if (!amount || amount <= 0) return getPoints();
    var oldTotal = getPoints();
    var oldLevel = levelForPoints(oldTotal);
    var total = oldTotal + amount;
    localStorage.setItem(POINTS_KEY, String(total));
    recordFamilyProfile(total);
    var newLevel = levelForPoints(total);
    var l = curLang();
    var pointsLabel = l === 'tr' ? 'Şövalye Puanı' : l === 'es' ? 'Puntos de Caballero' : 'Knight Points';
    showToast('+' + amount + ' ' + pointsLabel + (reason ? ' — ' + reason : ''));
    if (newLevel.name !== oldLevel.name) {
      setTimeout(function () { showRankUpCeremony(newLevel); }, 900);
    }
    return total;
  }

  // ---------- rank-up ceremony (full-screen moment) ----------
  function showRankUpCeremony(newLevel) {
    var l = curLang();
    var title = l === 'tr' ? 'SEVİYE ATLADIN!' : l === 'es' ? '¡SUBISTE DE NIVEL!' : 'RANK UP!';
    var sub = l === 'tr' ? ('Artık bir ' + newLevel.name + ' oldun.')
      : l === 'es' ? ('Ahora eres un ' + newLevel.name + '.')
      : ('You are now a ' + newLevel.name + '.');
    var cta = l === 'tr' ? 'Devam Et' : l === 'es' ? 'Continuar' : 'Continue';

    var overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', title);
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(4,9,26,0.82);backdrop-filter:blur(3px);opacity:0;transition:opacity 0.35s;font-family:"Segoe UI",system-ui,sans-serif;';

    var card = document.createElement('div');
    card.style.cssText = 'text-align:center;color:#f5eccb;padding:40px 36px;max-width:340px;transform:scale(0.85);transition:transform 0.45s cubic-bezier(.34,1.56,.64,1);';

    var emojiEl = document.createElement('div');
    emojiEl.textContent = newLevel.emoji;
    emojiEl.style.cssText = 'font-size:4.2rem;line-height:1;filter:drop-shadow(0 0 18px rgba(201,168,76,0.65));';

    var titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.cssText = 'margin-top:14px;font-size:1.5rem;font-weight:900;letter-spacing:0.06em;color:#c9a84c;';

    var subEl = document.createElement('div');
    subEl.textContent = sub;
    subEl.style.cssText = 'margin-top:8px;font-size:1.1rem;font-weight:700;';

    var shareText = l === 'tr' ? ('⚔️ Digital Safety Knights\'ta ' + newLevel.name + ' seviyesine ulaştım!')
      : l === 'es' ? ('⚔️ ¡Alcancé el rango de ' + newLevel.name + ' en Digital Safety Knights!')
      : ('⚔️ I just became a ' + newLevel.name + ' at Digital Safety Knights!');
    var shareLabel = l === 'tr' ? '📤 Paylaş' : l === 'es' ? '📤 Compartir' : '📤 Share';
    var shareCopiedLabel = l === 'tr' ? '✅ Kopyalandı!' : l === 'es' ? '✅ ¡Copiado!' : '✅ Copied!';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:26px;flex-wrap:wrap;';

    var shareBtn = document.createElement('button');
    shareBtn.textContent = shareLabel;
    shareBtn.type = 'button';
    shareBtn.style.cssText = 'background:transparent;color:#f5eccb;border:2px solid #c9a84c;border-radius:24px;padding:10px 22px;font-weight:900;font-size:0.88rem;cursor:pointer;';
    shareBtn.addEventListener('click', function () {
      var shareUrl = 'https://digitalsafetyknights.org';
      if (navigator.share) {
        navigator.share({ text: shareText, url: shareUrl }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText + ' ' + shareUrl).then(function () {
          shareBtn.textContent = shareCopiedLabel;
          setTimeout(function () { shareBtn.textContent = shareLabel; }, 1800);
        }).catch(function () {});
      }
    });

    var btn = document.createElement('button');
    btn.textContent = cta;
    btn.type = 'button';
    btn.style.cssText = 'background:#c9a84c;color:#0d1b3e;border:none;border-radius:24px;padding:11px 28px;font-weight:900;font-size:0.92rem;cursor:pointer;';

    function dismiss() {
      overlay.style.opacity = '0';
      card.style.transform = 'scale(0.9)';
      setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 300);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') dismiss(); }

    btn.addEventListener('click', dismiss);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) dismiss(); });
    document.addEventListener('keydown', onKey);

    btnRow.appendChild(shareBtn);
    btnRow.appendChild(btn);
    card.appendChild(emojiEl);
    card.appendChild(titleEl);
    card.appendChild(subEl);
    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    requestAnimationFrame(function () {
      overlay.style.opacity = '1';
      card.style.transform = 'scale(1)';
    });
  }

  function levelForPoints(points) {
    var current = LEVELS[0];
    for (var i = 0; i < LEVELS.length; i++) { if (points >= LEVELS[i].min) current = LEVELS[i]; }
    var next = LEVELS[LEVELS.indexOf(current) + 1] || null;
    return {
      name: levelName(current), emoji: current.emoji, min: current.min,
      next: next ? levelName(next) : null, nextMin: next ? next.min : null
    };
  }

  // ---------- toast ----------
  var toastQueue = [], toastShowing = false;
  function showToast(text) {
    toastQueue.push(text);
    if (!toastShowing) drainToast();
  }
  function drainToast() {
    if (!toastQueue.length) { toastShowing = false; return; }
    toastShowing = true;
    var text = toastQueue.shift();
    var el = document.getElementById('dsk-points-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dsk-points-toast';
      el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(0);background:#0d1b3e;color:#e8c56a;padding:12px 22px;border-radius:24px;font-family:"Segoe UI",system-ui,sans-serif;font-weight:800;font-size:0.88rem;box-shadow:0 8px 24px rgba(0,0,0,0.35);z-index:99999;border:2px solid #c9a84c;opacity:0;transition:opacity 0.25s, transform 0.25s;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.textContent = text;
    requestAnimationFrame(function () {
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(-6px)';
    });
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(0)';
      setTimeout(drainToast, 250);
    }, 2200);
  }

  // ---------- streak ----------
  function checkStreak() {
    var today = todayStr();
    var last = localStorage.getItem(STREAK_LAST_KEY);
    var count = parseInt(localStorage.getItem(STREAK_COUNT_KEY) || '0', 10);
    if (last === today) return { count: count, isNew: false };

    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (last === yesterday) {
      count += 1;
    } else {
      count = 1;
    }
    localStorage.setItem(STREAK_LAST_KEY, today);
    localStorage.setItem(STREAK_COUNT_KEY, String(count));

    var l = curLang();
    var bonus = 5;
    var reason = l === 'tr' ? (count + ' günlük seri') : l === 'es' ? ('Racha de ' + count + ' días') : (count + '-day streak');
    if (count > 0 && count % 7 === 0) {
      bonus += 20;
      reason = l === 'tr' ? (count + ' günlük seri kilometre taşı!') : l === 'es' ? ('¡Hito de racha de ' + count + ' días!') : (count + '-day streak milestone!');
    }
    addPoints(bonus, reason);
    return { count: count, isNew: true };
  }
  function getStreak() { return parseInt(localStorage.getItem(STREAK_COUNT_KEY) || '0', 10); }

  // ---------- combo quest day ----------
  function markComboActivity(kind) {
    var key = COMBO_PREFIX + todayStr();
    var combo = {};
    try { combo = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { combo = {}; }
    if (combo[kind]) return;
    combo[kind] = true;
    localStorage.setItem(key, JSON.stringify(combo));
    if (combo.quest && combo.game && combo.guide && !combo.awarded) {
      combo.awarded = true;
      localStorage.setItem(key, JSON.stringify(combo));
      var l = curLang();
      var comboMsg = l === 'tr' ? 'Kombo Görev Günü! Tek ziyarette Görev + Oyun + Rehber'
        : l === 'es' ? '¡Día de Combo! Misión + Juego + Guía en una sola visita'
        : 'Combo Quest Day! Quest + Game + Guide in one visit';
      addPoints(30, comboMsg);
    }
  }

  // ---------- level ring (SVG) ----------
  function renderLevelRing(container, points) {
    if (!container) return;
    var level = levelForPoints(points);
    var span = level.nextMin ? (level.nextMin - level.min) : 250;
    var into = level.nextMin ? Math.min(1, (points - level.min) / span) : 1;
    var circumference = 2 * Math.PI * 42;
    var offset = circumference * (1 - into);
    container.innerHTML =
      '<svg width="110" height="110" viewBox="0 0 110 110" style="transform:rotate(-90deg)">' +
        '<circle cx="55" cy="55" r="42" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="10"/>' +
        '<circle cx="55" cy="55" r="42" fill="none" stroke="#c9a84c" stroke-width="10" stroke-linecap="round" ' +
          'stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '"/>' +
      '</svg>' +
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
        '<div style="font-size:1.6rem;">' + level.emoji + '</div>' +
        '<div style="font-size:0.68rem;font-weight:900;color:#0d1b3e;">' + level.name + '</div>' +
      '</div>';
    container.style.position = 'relative';
    container.style.width = '110px';
    container.style.height = '110px';
  }

  global.DSKPoints = {
    getPoints: getPoints,
    addPoints: addPoints,
    levelForPoints: levelForPoints,
    checkStreak: checkStreak,
    getStreak: getStreak,
    markComboActivity: markComboActivity,
    renderLevelRing: renderLevelRing,
    getFamilyProfiles: getFamilyProfiles,
    familyTotal: familyTotal,
    showToast: showToast,
    getMemberSince: getMemberSince,
    getMemberId: getMemberId,
    showRankUpCeremony: showRankUpCeremony
  };
})(window);
