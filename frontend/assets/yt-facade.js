/* Privacy-preserving YouTube embed.
 *
 * The site tells visitors that nothing is embedded from anywhere else and
 * that nobody is tracking what they watch. A normal YouTube iframe would
 * make that untrue the moment the page loads, before anyone presses play.
 * So this renders a poster and a play button, and only on a real click
 * does it insert a youtube-nocookie iframe. Until then the browser never
 * contacts YouTube at all.
 *
 *   <div class="yt-facade" data-yt-id="ss3A4f2htuI" data-yt-title="..."
 *        data-yt-poster="/films/....jpg"></div>
 *   <div class="yt-facade" data-yt-list="UU_dnFE..." data-yt-title="..."></div>
 */
(function () {
  var CH = 'UC_dnFE-8OsXcpiZrF3hL_xg';

  var T = {
    en: { play: 'Play', note: 'Loads from YouTube only when you press play.', open: 'Open on YouTube' },
    tr: { play: 'Oynat', note: 'YouTube yalnızca oynata bastığınızda yüklenir.', open: "YouTube'da aç" },
    es: { play: 'Reproducir', note: 'Solo se carga desde YouTube cuando presionas reproducir.', open: 'Abrir en YouTube' }
  };

  function css() {
    if (document.getElementById('yt-facade-css')) return;
    var s = document.createElement('style');
    s.id = 'yt-facade-css';
    s.textContent =
      '.yt-facade{position:relative;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#04091a;cursor:pointer;display:block;width:100%;border:none;padding:0}' +
      '.yt-facade img{width:100%;height:100%;object-fit:cover;display:block;opacity:.82}' +
      '.yt-grad{position:absolute;inset:0;background:radial-gradient(circle at 50% 38%,#24409a,#0d1b3e 72%)}' +
      '.yt-facade .yt-btn{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff}' +
      '.yt-facade .yt-play{width:74px;height:52px;border-radius:12px;background:rgba(220,30,30,.92);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(0,0,0,.45)}' +
      '.yt-facade .yt-play::after{content:"";border-style:solid;border-width:11px 0 11px 19px;border-color:transparent transparent transparent #fff;margin-left:4px}' +
      '.yt-facade:hover .yt-play{background:rgba(220,30,30,1);transform:scale(1.05)}' +
      '.yt-facade .yt-play{transition:transform .18s,background .18s}' +
      '.yt-facade .yt-label{font-weight:800;font-size:.92rem;text-shadow:0 2px 10px rgba(0,0,0,.7);padding:0 1rem;text-align:center}' +
      '.yt-facade iframe{width:100%;height:100%;border:0;display:block}' +
      '.yt-facade.yt-live{cursor:default}' +
      '.yt-note{font-size:.76rem;color:#6c757d;margin-top:8px;text-align:center}' +
      '.yt-note a{color:inherit}' +
      '@media (prefers-reduced-motion:reduce){.yt-facade .yt-play{transition:none}}';
    document.head.appendChild(s);
  }

  function iframe(id, list, title) {
    var f = document.createElement('iframe');
    f.src = list
      ? 'https://www.youtube-nocookie.com/embed/videoseries?list=' + list + '&autoplay=1&rel=0'
      : 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
    f.title = title || 'Digital Safety Knights';
    f.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture; web-share';
    f.allowFullscreen = true;
    return f;
  }

  function build(el, t) {
    var id = el.getAttribute('data-yt-id');
    var list = el.getAttribute('data-yt-list');
    var title = el.getAttribute('data-yt-title') || 'Digital Safety Knights';
    // Deliberately never falls back to i.ytimg.com for a thumbnail: that
    // would be a third-party request on page load, which is the exact thing
    // this component exists to avoid. No local poster means a plain gradient.
    var poster = el.getAttribute('data-yt-poster');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'yt-facade';
    btn.setAttribute('aria-label', t.play + ': ' + title);
    btn.innerHTML =
      (poster && poster.indexOf('http') !== 0
        ? '<img src="' + poster + '" alt="" loading="lazy">'
        : '<span class="yt-grad"></span>') +
      '<span class="yt-btn"><span class="yt-play"></span><span class="yt-label">' + title + '</span></span>';

    btn.addEventListener('click', function () { btn.replaceWith(iframe(id, list, title)); });

    var note = document.createElement('p');
    note.className = 'yt-note';
    var href = list ? 'https://www.youtube.com/@digitalsafetyknights' : 'https://www.youtube.com/watch?v=' + id;
    note.innerHTML = t.note + ' <a href="' + href + '" target="_blank" rel="noopener">' + t.open + ' →</a>';

    el.replaceWith(btn);
    btn.after(note);
  }

  function strings() {
    var lang = (window.DSKi18n && DSKi18n.lang) || 'en';
    return T[lang] || T.en;
  }

  // Builds one facade on demand, for pages that render their video list from
  // JSON after load — their .yt-facade nodes don't exist when init() runs.
  function mount(el) {
    if (!el || el.dataset.ytMounted) return;
    el.dataset.ytMounted = '1';
    css();
    build(el, strings());
  }

  function init() {
    var nodes = document.querySelectorAll('.yt-facade[data-yt-id],.yt-facade[data-yt-list]');
    Array.prototype.forEach.call(nodes, mount);
  }

  window.DSKYouTube = {
    channelId: CH,
    uploadsPlaylist: 'UU' + CH.slice(2),
    mount: mount,
    // For a control that is itself the consent — a button labelled "Play on
    // YouTube" — go straight to the playing iframe instead of showing a
    // facade the viewer would have to click a second time.
    player: function (opts) {
      css();
      var t = strings();
      var box = document.createElement('div');
      box.className = 'yt-facade yt-live';
      box.appendChild(iframe(opts.id, opts.list, opts.title));
      var note = document.createElement('p');
      note.className = 'yt-note';
      var href = opts.list
        ? 'https://www.youtube.com/@digitalsafetyknights'
        : 'https://www.youtube.com/watch?v=' + opts.id;
      note.innerHTML = '<a href="' + href + '" target="_blank" rel="noopener">' + t.open + ' →</a>';
      var frag = document.createDocumentFragment();
      frag.appendChild(box);
      frag.appendChild(note);
      return frag;
    },
    // Accepts a full watch/share URL or a bare id and returns the id.
    videoId: function (u) {
      if (!u) return '';
      var m = String(u).match(/(?:v=|\/shorts\/|youtu\.be\/|\/embed\/)([A-Za-z0-9_-]{6,})/);
      return m ? m[1] : (/^[A-Za-z0-9_-]{6,}$/.test(u) ? u : '');
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
