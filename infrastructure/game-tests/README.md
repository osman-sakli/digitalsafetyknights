# Scripted players for Mirror Bay

Serve `frontend/` locally (`python3 -m http.server 8826`), then:

    node cdp.mjs http://localhost:8826/mirror-bay.html 15000 "$(cat playbay.js)('best')"
    node cdp.mjs http://localhost:8826/mirror-bay.html 15000 "window.__budget=2400000; $(cat drivebay.js)('best')"

- `playbay.js` teleports between objectives: a two-minute check that the story runs to an ending in a given language (`'best'`, `'worst'`).
- `drivebay.js` never teleports. It walks, drives in lane and sails at the game's own speed, so it meets timers and collisions the way a player does. Slow (about ten minutes), and the one that finds real problems. Third argument is a list of jobs to treat as already done, to start part-way.
- `check_mb.py tr` compares a translation with the English: structure, order, placeholders.
