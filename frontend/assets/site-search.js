(function() {
  if (document.getElementById('dsk-search-trigger')) return;

  var INDEX = [
    { title: "Home", url: "/", icon: "🏠", kw: "homepage start hero" },
    { title: "Common Threats", url: "/#threats", icon: "⚠️", kw: "roblox ai chatbots grooming predators messaging apps dangers" },
    { title: "Family Safety Audit", url: "/audit.html", icon: "🛡️", kw: "audit device network app management scored report checklist" },
    { title: "Interactive Quests", url: "/quests.html", icon: "🎮", kw: "roblox pk xd ai threat grooming watch cyber defense digital citizenship badges" },
    { title: "Shieldy's Message Sort (Game)", url: "/game.html", icon: "🕹️", kw: "arcade game sort messages red flag leaderboard play" },
    { title: "Glitch Detector", url: "/glitch-detector.html", icon: "🔍", kw: "paste message screenshot check red flag private" },
    { title: "Chat Simulator", url: "/chat-simulator.html", icon: "💬", kw: "practice conversation branching choices safe risky" },
    { title: "Password Dojo", url: "/password-dojo.html", icon: "🔐", kw: "password strength belt rank test" },
    { title: "Privacy Settings Simulator", url: "/privacy-simulator.html", icon: "⚙️", kw: "mock app privacy settings practice lockdown" },
    { title: "Spot the Deepfake", url: "/spot-the-deepfake.html", icon: "🎭", kw: "quiz ai fake real scenario" },
    { title: "Digital Footprint Calculator", url: "/footprint-calculator.html", icon: "👣", kw: "exposure share profile blur sharpen" },
    { title: "Ask Shieldy", url: "/ask-shieldy.html", icon: "🛡️", kw: "faq questions answers chat mascot" },
    { title: "Build Your Safe Profile", url: "/safe-profile-builder.html", icon: "🗂️", kw: "sort share private items" },
    { title: "Screen-Time Check-In", url: "/screen-time-checkin.html", icon: "📱", kw: "hours mood private local reflection" },
    { title: "Meet the Knights", url: "/knights.html", icon: "⚔️", kw: "shieldy pixel bot dame noble sprout glitch characters cast" },
    { title: "Tactic Almanac", url: "/tactic-almanac.html", icon: "📖", kw: "predator tactics red flags encyclopedia reference" },
    { title: "Shieldy's Journal", url: "/shieldys-journal.html", icon: "🛡️", kw: "kid friendly stories journal" },
    { title: "Knight Chronicles Comic", url: "/knight-chronicles.html", icon: "💥", kw: "comic story chronicles" },
    { title: "Our Origin Story", url: "/origin-story.html", icon: "📖", kw: "founding history mission" },
    { title: "About the Founders", url: "/about.html", icon: "👋", kw: "osman ayse founders team about" },
    { title: "Resource Center", url: "/resources.html", icon: "📚", kw: "everything guides quests tools stories parents kids teens educators" },
    { title: "Roblox Parent Guide (PDF)", url: "/guides/roblox-parent-guide.pdf", icon: "🎮", kw: "roblox privacy chat lockdown guide download" },
    { title: "Safe AI Usage for Kids (PDF)", url: "/guides/safe-ai-usage-guide.pdf", icon: "🤖", kw: "ai tools child safe guide download" },
    { title: "iPhone & Android Safety (PDF)", url: "/guides/iphone-android-safety.pdf", icon: "📱", kw: "screen time app restriction device guide download" },
    { title: "Talk to Your Kids Guide (PDF)", url: "/guides/talk-to-your-kids-guide.pdf", icon: "💬", kw: "conversation scripts age appropriate guide download" },
    { title: "Family Cybersecurity Checklist (PDF)", url: "/guides/family-cybersecurity-checklist.pdf", icon: "🔐", kw: "passwords vpn dns filtering guide download" },
    { title: "Incident Response Guide (PDF)", url: "/guides/incident-response-guide.pdf", icon: "🆘", kw: "what to do something happened guide download" },
    { title: "The Knight's Toolkit (PDF)", url: "/guides/knights-toolkit.pdf", icon: "🖨️", kw: "printable poster sticker sheet bookmarks download" },
    { title: "DSK Monthly Journal", url: "/#journal", icon: "📰", kw: "journal stories threat analysis monthly articles" },
    { title: "Emergency Help & Hotlines", url: "/#emergency", icon: "🆘", kw: "emergency hotline crisis help country region urgent" },
    { title: "Login", url: "/login.html", icon: "🔐", kw: "sign in account" },
    { title: "Dashboard", url: "/dashboard.html", icon: "📊", kw: "my account progress points badges" }
  ];

  var style = document.createElement('style');
  style.textContent =
    '#dsk-search-trigger { position: fixed; left: 18px; bottom: 18px; z-index: 900; width: 50px; height: 50px; border-radius: 50%; background: var(--navy, #0d1b3e); color: var(--gold2, #e8c56a); border: 2px solid rgba(201,168,76,0.4); font-size: 1.3rem; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; }' +
    '#dsk-search-overlay { position: fixed; inset: 0; background: rgba(6,14,34,0.75); z-index: 9998; display: none; align-items: flex-start; justify-content: center; padding: 8vh 1rem 1rem; }' +
    '#dsk-search-overlay.open { display: flex; }' +
    '#dsk-search-panel { background: white; width: 100%; max-width: 560px; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.4); max-height: 76vh; display: flex; flex-direction: column; }' +
    '#dsk-search-input-row { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #eee; flex-shrink: 0; }' +
    '#dsk-search-input-row span.si { font-size: 1.2rem; color: #999; }' +
    '#dsk-search-input { flex: 1; border: none; outline: none; font-size: 1.05rem; font-family: inherit; }' +
    '#dsk-search-close { background: none; border: none; font-size: 1.3rem; color: #999; cursor: pointer; }' +
    '#dsk-search-results { overflow-y: auto; }' +
    '.dsk-sr-item { display: flex; align-items: center; gap: 12px; padding: 12px 18px; text-decoration: none; color: #2d3748; border-bottom: 1px solid #f4f6fb; }' +
    '.dsk-sr-item:hover, .dsk-sr-item.active { background: #f4f6fb; }' +
    '.dsk-sr-icon { font-size: 1.3rem; flex-shrink: 0; }' +
    '.dsk-sr-title { font-weight: 700; font-size: 0.92rem; }' +
    '.dsk-sr-empty { padding: 24px 18px; text-align: center; color: #999; font-size: 0.88rem; }' +
    '@media (max-width: 480px) { #dsk-search-trigger { left: 12px; bottom: 12px; width: 46px; height: 46px; } }';
  document.head.appendChild(style);

  var trigger = document.createElement('button');
  trigger.id = 'dsk-search-trigger';
  trigger.setAttribute('aria-label', 'Search the site');
  trigger.textContent = '🔍';
  document.body.appendChild(trigger);

  var overlay = document.createElement('div');
  overlay.id = 'dsk-search-overlay';
  overlay.innerHTML =
    '<div id="dsk-search-panel">' +
      '<div id="dsk-search-input-row"><span class="si">🔍</span>' +
      '<input id="dsk-search-input" type="text" placeholder="Search quests, tools, guides…" autocomplete="off">' +
      '<button id="dsk-search-close" aria-label="Close">&times;</button></div>' +
      '<div id="dsk-search-results"></div>' +
    '</div>';
  document.body.appendChild(overlay);

  var input = document.getElementById('dsk-search-input');
  var results = document.getElementById('dsk-search-results');

  function render(items) {
    if (!items.length) {
      results.innerHTML = '<div class="dsk-sr-empty">No matches — try a different word.</div>';
      return;
    }
    results.innerHTML = items.slice(0, 12).map(function(item) {
      return '<a class="dsk-sr-item" href="' + item.url + '"><span class="dsk-sr-icon">' + item.icon + '</span><span class="dsk-sr-title">' + item.title + '</span></a>';
    }).join('');
  }

  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) { render(INDEX.slice(0, 10)); return; }
    var matches = INDEX.filter(function(item) {
      return item.title.toLowerCase().indexOf(q) !== -1 || item.kw.indexOf(q) !== -1;
    });
    render(matches);
  }

  function openSearch() {
    overlay.classList.add('open');
    input.value = '';
    search('');
    setTimeout(function() { input.focus(); }, 50);
  }
  function closeSearch() {
    overlay.classList.remove('open');
  }

  trigger.addEventListener('click', openSearch);
  document.getElementById('dsk-search-close').addEventListener('click', closeSearch);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeSearch(); });
  input.addEventListener('input', function() { search(input.value); });

  document.addEventListener('keydown', function(e) {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeSearch();
    }
  });
})();
