(function() {
  if (document.getElementById('dsk-theme-toggle')) return;
  var KEY = 'dsk_theme';
  var root = document.documentElement;

  var style = document.createElement('style');
  style.textContent =
    'html.dsk-dark { background: #11141c; }' +
    'html.dsk-dark body { filter: invert(0.93) hue-rotate(180deg); background: #11141c; }' +
    'html.dsk-dark img, html.dsk-dark video, html.dsk-dark iframe, html.dsk-dark picture, html.dsk-dark svg image { filter: invert(1) hue-rotate(180deg); }' +
    'html.dsk-dark nav, html.dsk-dark .nav-wrap, html.dsk-dark .nav-sub, html.dsk-dark .topbar, html.dsk-dark footer, html.dsk-dark .hero, html.dsk-dark .vision-band, html.dsk-dark #threats, html.dsk-dark .knights-row, html.dsk-dark .whats-new-banner { filter: invert(1) hue-rotate(180deg); }' +
    '#dsk-theme-toggle { position: fixed; top: 14px; right: 14px; z-index: 901; width: 42px; height: 42px; border-radius: 50%; background: rgba(13,27,62,0.85); color: #e8c56a; border: 2px solid rgba(201,168,76,0.4); font-size: 1.15rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.3); backdrop-filter: blur(4px); }' +
    'html.dsk-dark #dsk-theme-toggle, html.dsk-dark #dsk-search-trigger, html.dsk-dark #dsk-play-fab, html.dsk-dark .fab-label { filter: invert(1) hue-rotate(180deg); }' +
    '@media (max-width: 480px) { #dsk-theme-toggle { top: 10px; right: 10px; width: 38px; height: 38px; font-size: 1rem; } }';
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'dsk-theme-toggle';
  btn.setAttribute('aria-label', 'Toggle dark mode');

  function applyTheme(mode) {
    root.classList.toggle('dsk-dark', mode === 'dark');
    btn.textContent = mode === 'dark' ? '☀️' : '🌙';
  }

  var saved = localStorage.getItem(KEY);
  applyTheme(saved === 'dark' ? 'dark' : 'light');

  btn.addEventListener('click', function() {
    var next = root.classList.contains('dsk-dark') ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    applyTheme(next);
  });

  document.body.appendChild(btn);
})();
