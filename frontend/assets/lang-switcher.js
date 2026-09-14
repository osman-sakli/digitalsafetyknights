(function() {
  if (document.getElementById('dsk-lang-switcher')) return;
  var KEY = 'dsk_lang';
  var LANGS = [
    { code: 'en', label: 'English', flag: '🇺🇸', ready: true },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷', ready: true },
    { code: 'es', label: 'Español', flag: '🇪🇸', ready: true }
  ];

  // If the page has its own nav actions row (index.html: .nav-actions,
  // dashboard.html: .nav-right), dock into it as a normal flex item so it
  // can never overlap real nav buttons (this was colliding with the
  // Discord button on index.html). Pages without such a container (most
  // guide/tool pages) keep the original floating badge since there's
  // nothing there for it to collide with.
  var dock = document.querySelector('.nav-actions, .nav-right');

  var style = document.createElement('style');
  style.textContent =
    (dock
      ? '#dsk-lang-switcher { position: relative; display: inline-flex; }'
      : '#dsk-lang-switcher { position: fixed; top: 14px; right: 14px; z-index: 2000; }'
    ) +
    '#dsk-lang-btn { height: 42px; padding: 0 12px; border-radius: 21px; background: rgba(13,27,62,0.85); color: #e8c56a; border: 2px solid rgba(201,168,76,0.4); font-size: 0.85rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 4px 16px rgba(0,0,0,0.3); backdrop-filter: blur(4px); }' +
    '#dsk-lang-menu { position: absolute; top: 50px; right: 0; background: white; border-radius: 12px; box-shadow: 0 10px 34px rgba(0,0,0,0.25); overflow: hidden; display: none; min-width: 168px; z-index: 2000; }' +
    '#dsk-lang-menu.open { display: block; }' +
    '.dsk-lang-item { display: flex; align-items: center; gap: 9px; padding: 11px 14px; font-size: 0.85rem; font-weight: 700; color: #2d3748; cursor: pointer; border: none; background: none; width: 100%; text-align: left; font-family: inherit; }' +
    '.dsk-lang-item:hover { background: #f4f6fb; }' +
    '.dsk-lang-item.active { color: #0d1b3e; background: rgba(201,168,76,0.12); }' +
    '.dsk-lang-item .soon { margin-left: auto; font-size: 0.62rem; font-weight: 900; color: #6c757d; background: #eef0f5; padding: 2px 6px; border-radius: 6px; text-transform: uppercase; }' +
    (dock
      ? '@media (max-width: 480px) { #dsk-lang-btn { height: 36px; padding: 0 9px; font-size: 0.78rem; } }'
      : '@media (max-width: 480px) { #dsk-lang-switcher { right: 10px; } #dsk-lang-btn { height: 38px; padding: 0 9px; font-size: 0.78rem; } }'
    ) +
    '#dsk-lang-fade { position: fixed; inset: 0; background: #0d1b3e; z-index: 100000; opacity: 0; pointer-events: none; transition: opacity 0.25s ease; }' +
    '#dsk-lang-fade.show { opacity: 1; pointer-events: all; }';
  document.head.appendChild(style);

  var current = localStorage.getItem(KEY) || 'en';
  var LS_ARIA = current === 'tr' ? 'Dil seç' : current === 'es' ? 'Elegir idioma' : 'Choose language';
  var LS_SOON = current === 'tr' ? 'Yakında' : current === 'es' ? 'Pronto' : 'Soon';
  var LS_COMING_SOON = current === 'tr' ? ' yakında geliyor!' : current === 'es' ? ' estará disponible pronto!' : ' is coming soon!';

  var wrap = document.createElement('div');
  wrap.id = 'dsk-lang-switcher';

  function currentLang() { return LANGS.filter(function(l) { return l.code === current; })[0] || LANGS[0]; }

  function renderMenu() {
    return LANGS.map(function(l) {
      var cls = 'dsk-lang-item' + (l.code === current ? ' active' : '');
      return '<button type="button" class="' + cls + '" data-code="' + l.code + '">' + l.flag + ' ' + l.label +
        (l.ready ? '' : '<span class="soon">' + LS_SOON + '</span>') + '</button>';
    }).join('');
  }

  wrap.innerHTML =
    '<button id="dsk-lang-btn" type="button" aria-label="' + LS_ARIA + '"><span id="dsk-lang-flag">' + currentLang().flag + '</span> <span id="dsk-lang-code">' + current.toUpperCase() + '</span> ▾</button>' +
    '<div id="dsk-lang-menu">' + renderMenu() + '</div>';
  if (dock) { dock.appendChild(wrap); } else { document.body.appendChild(wrap); }

  var fade = document.createElement('div');
  fade.id = 'dsk-lang-fade';
  document.body.appendChild(fade);

  var btn = document.getElementById('dsk-lang-btn');
  var menu = document.getElementById('dsk-lang-menu');

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    menu.classList.toggle('open');
  });
  document.addEventListener('click', function() { menu.classList.remove('open'); });

  menu.addEventListener('click', function(e) {
    var item = e.target.closest('.dsk-lang-item');
    if (!item) return;
    e.stopPropagation();
    var code = item.getAttribute('data-code');
    var lang = LANGS.filter(function(l) { return l.code === code; })[0];
    if (!lang.ready) {
      if (window.DSKPoints && window.DSKPoints.showToast) {
        window.DSKPoints.showToast(lang.label + LS_COMING_SOON);
      }
      menu.classList.remove('open');
      return;
    }
    if (code === current) { menu.classList.remove('open'); return; }
    current = code;
    localStorage.setItem(KEY, code);
    menu.classList.remove('open');
    sessionStorage.setItem('dsk_lang_transitioning', '1');
    fade.classList.add('show');
    setTimeout(function () { location.reload(); }, 220);
  });

  if (sessionStorage.getItem('dsk_lang_transitioning')) {
    sessionStorage.removeItem('dsk_lang_transitioning');
    fade.classList.add('show');
    fade.style.transition = 'none';
    requestAnimationFrame(function () {
      fade.style.transition = '';
      setTimeout(function () { fade.classList.remove('show'); }, 60);
    });
  }
})();
