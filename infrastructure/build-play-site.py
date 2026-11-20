#!/usr/bin/env python3
"""Assembles game-site/ (play.digitalsafetyknights.org) from the main site.

The play site is the games on their own address: a kid-facing picker and the
Shieldy games, nothing else. Everything is copied from frontend/, so a game
is fixed once and both addresses get it; run this, then
infrastructure/deploy-game.sh. The old Phaser "Knight's Run" stays reachable
under /classic/.

Each page also exists under /en/ /tr/ /es/ /fr/, because assets/i18n.js picks
the language from that prefix. Canonical tags keep pointing at the main site,
so search engines see one copy.
"""
import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "frontend", ROOT / "game-site"
GAMES = ["knight-city.html", "lost-sprout.html", "shield-toss.html", "shieldy-run.html", "shieldy-dash.html"]
ASSET_DIRS = ["assets/arcade", "assets/arcade3d", "assets/lib"]
ASSET_FILES = ["assets/arcade-messages.js", "assets/knight-points.js", "assets/i18n.js",
               "assets/favicon.ico", "assets/logo.png",
               "content/i18n/tr.json", "content/i18n/es.json", "content/i18n/fr.json",
               "content/story/lost-sprout.json", "content/story/lost-sprout-tr.json",
               "content/story/lost-sprout-es.json", "content/story/lost-sprout-fr.json",
               "assets/knight-city.js"] + [f"content/story/knight-city{k}{l}.json" for k in ("", "-talk") for l in ("", "-tr", "-es", "-fr")]
LANGS = ["en", "tr", "es", "fr"]


def main():
    classic = OUT / "classic"
    if not classic.exists() and (OUT / "assets" / "js" / "game.js").exists():
        # first run: tuck the old standalone game away before rebuilding
        tmp = ROOT / ".classic-tmp"
        shutil.rmtree(tmp, ignore_errors=True)
        shutil.copytree(OUT, tmp)
        shutil.rmtree(OUT)
        OUT.mkdir()
        shutil.move(str(tmp), str(classic))
    for child in OUT.iterdir() if OUT.exists() else []:
        if child.name != "classic":
            shutil.rmtree(child) if child.is_dir() else child.unlink()
    OUT.mkdir(exist_ok=True)

    for d in ASSET_DIRS:
        shutil.copytree(SRC / d, OUT / d)
    for f in ASSET_FILES:
        if (SRC / f).exists():
            (OUT / f).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(SRC / f, OUT / f)

    portal = (ROOT / "infrastructure" / "play-portal.html").read_text()
    pages = {"index.html": portal, "arcade.html": portal}   # the games' "back" link goes to /arcade.html
    for g in GAMES:
        pages[g] = (SRC / g).read_text()
    for name, html in pages.items():
        (OUT / name).write_text(html)
        for lang in LANGS:
            (OUT / lang).mkdir(exist_ok=True)
            (OUT / lang / name).write_text(html)
    n = sum(1 for p in OUT.rglob("*") if p.is_file())
    size = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())
    print(f"game-site/: {n} files, {size / 1e6:.1f} MB; games: {', '.join(GAMES)}")


if __name__ == "__main__":
    main()
