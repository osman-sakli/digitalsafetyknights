(function() {
  var KEY = 'dsk_lang';
  window.DSKi18n = window.DSKi18n || {};
  var dict = {};
  var lang = localStorage.getItem(KEY) || 'en';
  window.DSKi18n.lang = lang;

  function apply() {
    if (lang === 'en') return;
    document.documentElement.setAttribute('lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (dict[key] != null) el.innerHTML = dict[key];
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(function(el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function(pair) {
        var parts = pair.split(':');
        if (parts.length !== 2) return;
        var attr = parts[0].trim(), key = parts[1].trim();
        if (dict[key] != null) el.setAttribute(attr, dict[key]);
      });
    });
  }

  window.DSKi18n.t = function(key, fallback) {
    if (lang === 'en') return fallback != null ? fallback : key;
    return dict[key] != null ? dict[key] : (fallback != null ? fallback : key);
  };

  if (lang === 'en') return;

  fetch('/content/i18n/' + lang + '.json')
    .then(function(r) { return r.ok ? r.json() : {}; })
    .then(function(json) {
      dict = json || {};
      window.DSKi18n.dict = dict;
      apply();
      document.dispatchEvent(new CustomEvent('dsk-i18n-ready'));
    })
    .catch(function() {});
})();
