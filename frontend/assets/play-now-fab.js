(function() {
  if (document.getElementById('dsk-play-fab')) return;
  var style = document.createElement('style');
  style.textContent =
    '#dsk-play-fab { position: fixed; right: 18px; bottom: 18px; z-index: 900; display: flex; align-items: center; }' +
    '#dsk-play-fab .fab-ring { position: absolute; inset: 0; border-radius: 50%; background: var(--gold, #c9a84c); opacity: 0.5; animation: dsk-fab-pulse 2.4s ease-out infinite; }' +
    '#dsk-play-fab .fab-btn { position: relative; width: 58px; height: 58px; border-radius: 50%; background: linear-gradient(135deg, var(--gold, #c9a84c), var(--gold2, #e8c56a)); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; text-decoration: none; box-shadow: 0 6px 20px rgba(0,0,0,0.35); border: 2px solid rgba(255,255,255,0.4); }' +
    '#dsk-play-fab .fab-label { position: absolute; right: 68px; bottom: 16px; background: var(--navy, #0d1b3e); color: var(--gold2, #e8c56a); font-weight: 800; font-size: 0.78rem; padding: 8px 14px; border-radius: 12px; white-space: nowrap; opacity: 0; transform: translateX(8px); transition: opacity 0.2s ease, transform 0.2s ease; pointer-events: none; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }' +
    '#dsk-play-fab:hover .fab-label { opacity: 1; transform: translateX(0); }' +
    '@keyframes dsk-fab-pulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.6); opacity: 0; } }' +
    '@media (prefers-reduced-motion: reduce) { #dsk-play-fab .fab-ring { animation: none; } }' +
    '@media (max-width: 480px) { #dsk-play-fab { right: 12px; bottom: 12px; } #dsk-play-fab .fab-btn { width: 50px; height: 50px; font-size: 1.35rem; } #dsk-play-fab .fab-label { display: none; } }';
  document.head.appendChild(style);

  var wrap = document.createElement('div');
  wrap.id = 'dsk-play-fab';
  wrap.innerHTML =
    '<a class="fab-btn" href="/game.html" aria-label="Play Shieldy\'s Message Sort">' +
      '<span class="fab-ring" aria-hidden="true"></span>🕹️' +
    '</a>' +
    '<span class="fab-label">Play Shieldy\'s Game →</span>';
  document.body.appendChild(wrap);
})();
