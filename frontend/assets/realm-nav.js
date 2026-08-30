/*
  realm-nav — grouped, collapsible site navigation.

  Replaces a flat list of ~19 links (which, on a phone, rendered inline
  and filled the entire first screen before any hero content appeared)
  with 3-5 labeled groups. On desktop each group opens a small dropdown;
  on <=900px the groups become a slide-in drawer with accordion sections.

  No framework, no build step — matches how the rest of the site's
  interactivity (knight-points.js, i18n.js) is written.
*/
(function () {
  function closeAllPanels(except) {
    document.querySelectorAll('.realm-nav-panel.open').forEach(function (p) {
      if (p !== except) { p.classList.remove('open'); }
    });
    document.querySelectorAll('.rng-label[aria-expanded="true"]').forEach(function (b) {
      if (!except || b.nextElementSibling !== except) { b.setAttribute('aria-expanded', 'false'); }
    });
  }

  function isDesktop() { return window.matchMedia('(min-width: 901px)').matches; }

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('.realm-nav-toggle');
    var groups = document.querySelector('.realm-nav-groups');
    var backdrop = document.querySelector('.realm-nav-backdrop');

    function openDrawer() {
      groups.classList.add('open');
      if (backdrop) backdrop.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeDrawer() {
      groups.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      closeAllPanels(null);
    }

    if (toggle && groups) {
      toggle.addEventListener('click', function () {
        var open = groups.classList.contains('open');
        if (open) { closeDrawer(); } else { openDrawer(); }
      });
    }
    if (backdrop) backdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDrawer(); closeAllPanels(null); }
    });

    document.querySelectorAll('.rng-label').forEach(function (label) {
      label.addEventListener('click', function () {
        var panel = label.nextElementSibling;
        var isOpen = panel.classList.contains('open');
        // Desktop: only one dropdown open at a time. Mobile drawer: allow
        // several accordion sections open together, closing is manual.
        if (isDesktop()) { closeAllPanels(panel); }
        panel.classList.toggle('open', !isOpen);
        label.setAttribute('aria-expanded', String(!isOpen));
      });
    });

    // A click outside any group (desktop only) closes open dropdowns.
    document.addEventListener('click', function (e) {
      if (!isDesktop()) return;
      if (!e.target.closest('.realm-nav-group')) closeAllPanels(null);
    });

    // Resizing across the breakpoint should not leave a stale open state.
    window.addEventListener('resize', function () {
      if (isDesktop()) { closeDrawer(); }
    });
  });
})();
