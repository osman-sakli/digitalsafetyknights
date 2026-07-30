(function() {
  if (document.getElementById('dsk-lang-switcher')) return;
  var KEY = 'dsk_lang';
  var LANGS = [
    { code: 'en', label: 'English', flag: '🇺🇸', ready: true },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷', ready: true },
    { code: 'es', label: 'Español', flag: '🇪🇸', ready: false }
  ];

  var style = document.createElement('style');
  style.textContent =
    '#dsk-lang-switcher { position: fixed; top: 14px; right: 14px; z-index: 2000; }' +
    '#dsk-lang-btn { height: 42px; padding: 0 12px; border-radius: 21px; background: rgba(13,27,62,0.85); color: #e8c56a; border: 2px solid rgba(201,168,76,0.4); font-size: 0.85rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 4px 16px rgba(0,0,0,0.3); backdrop-filter: blur(4px); }' +
    '#dsk-lang-menu { position: absolute; top: 50px; right: 0; background: white; border-radius: 12px; box-shadow: 0 10px 34px rgba(0,0,0,0.25); overflow: hidden; display: none; min-width: 168px; }' +
    '#dsk-lang-menu.open { display: block; }' +
    '.dsk-lang-item { display: flex; align-items: center; gap: 9px; padding: 11px 14px; font-size: 0.85rem; font-weight: 700; color: #2d3748; cursor: pointer; border: none; background: none; width: 100%; text-align: left; font-family: inherit; }' +
    '.dsk-lang-item:hover { background: #f4f6fb; }' +
    '.dsk-lang-item.active { color: #0d1b3e; background: rgba(201,168,76,0.12); }' +
    '.dsk-lang-item .soon { margin-left: auto; font-size: 0.62rem; font-weight: 900; color: #6c757d; background: #eef0f5; padding: 2px 6px; border-radius: 6px; text-transform: uppercase; }' +
    '@media (max-width: 480px) { #dsk-lang-switcher { right: 10px; } #dsk-lang-btn { height: 38px; padding: 0 9px; font-size: 0.78rem; } }';
  document.head.appendChild(style);

  var current = localStorage.getItem(KEY) || 'en';

  var wrap = document.createElement('div');
  wrap.id = 'dsk-lang-switcher';

  function currentLang() { return LANGS.filter(function(l) { return l.code === current; })[0] || LANGS[0]; }

  function renderMenu() {
    return LANGS.map(function(l) {
      var cls = 'dsk-lang-item' + (l.code === current ? ' active' : '');
      return '<button type="button" class="' + cls + '" data-code="' + l.code + '">' + l.flag + ' ' + l.label +
        (l.ready ? '' : '<span class="soon">Soon</span>') + '</button>';
    }).join('');
  }

  wrap.innerHTML =
    '<button id="dsk-lang-btn" type="button" aria-label="Choose language"><span id="dsk-lang-flag">' + currentLang().flag + '</span> <span id="dsk-lang-code">' + current.toUpperCase() + '</span> ▾</button>' +
    '<div id="dsk-lang-menu">' + renderMenu() + '</div>';
  document.body.appendChild(wrap);

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
        window.DSKPoints.showToast(lang.label + ' is coming soon!');
      }
      menu.classList.remove('open');
      return;
    }
    if (code === current) { menu.classList.remove('open'); return; }
    current = code;
    localStorage.setItem(KEY, code);
    location.reload();
  });
})();
