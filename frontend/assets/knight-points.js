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

  var LEVELS = [
    { name: 'Squire', emoji: '🪖', min: 0 },
    { name: 'Knight', emoji: '⚔️', min: 100 },
    { name: 'Sentinel', emoji: '🛡️', min: 250 },
    { name: 'Champion', emoji: '👑', min: 500 }
  ];

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

  function addPoints(amount, reason) {
    if (!amount || amount <= 0) return getPoints();
    var oldTotal = getPoints();
    var oldLevel = levelForPoints(oldTotal);
    var total = oldTotal + amount;
    localStorage.setItem(POINTS_KEY, String(total));
    recordFamilyProfile(total);
    var newLevel = levelForPoints(total);
    showToast('+' + amount + ' Knight Points' + (reason ? ' — ' + reason : ''));
    if (newLevel.name !== oldLevel.name) {
      setTimeout(function () { showToast(newLevel.emoji + ' Level up! You\'re now a ' + newLevel.name + '.'); }, 900);
    }
    return total;
  }

  function levelForPoints(points) {
    var current = LEVELS[0];
    for (var i = 0; i < LEVELS.length; i++) { if (points >= LEVELS[i].min) current = LEVELS[i]; }
    var next = LEVELS[LEVELS.indexOf(current) + 1] || null;
    return {
      name: current.name, emoji: current.emoji, min: current.min,
      next: next ? next.name : null, nextMin: next ? next.min : null
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

    var bonus = 5;
    var reason = count + '-day streak';
    if (count > 0 && count % 7 === 0) { bonus += 20; reason = count + '-day streak milestone!'; }
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
      addPoints(30, 'Combo Quest Day! Quest + Game + Guide in one visit');
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
    showToast: showToast
  };
})(window);
