#!/usr/bin/env python3
"""Generates robots.txt + sitemap.xml and injects canonical tags.

Run from the repo root (deploy.sh calls it automatically). Everything it
writes lives in frontend/ and is committed, so the output is reviewable
rather than magic that only exists in S3.

Why this exists: the site had 38 pages, no sitemap, no robots.txt and no
canonical tags — search engines and AI answer engines had no map of it.
Distribution is the org's actual bottleneck, so this is on the critical path.
"""
import datetime
import os
import re
import subprocess

SITE = "https://digitalsafetyknights.org"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
FRONTEND = os.path.join(ROOT, "frontend")

# Pages that shouldn't be advertised to crawlers: transactional endpoints,
# personal/stateful views, and the error page.
EXCLUDE = {
    "404.html",
    "donation-success.html",
    "dashboard.html",
    "login.html",
    "certificate.html",
    "member-id.html",
    "unsubscribe.html",
    "stats.html",
}

# Rough priority tiers — the homepage and the pages we actually want found.
HIGH = {"index.html", "resources.html", "school-programs.html", "quests.html",
        "news-archive.html", "legislative-tracker.html", "sources.html"}
MEDIUM = {"knights.html", "academy.html", "game.html", "audit.html",
          "knight-council.html", "journal-archive.html", "glossary.html"}


def page_url(name):
    return SITE + "/" if name == "index.html" else f"{SITE}/{name}"


def last_modified(path):
    """Prefer the git commit date so lastmod reflects real content changes,
    not an incidental local file touch. Falls back to mtime."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cI", "--", path],
            cwd=ROOT, capture_output=True, text=True, timeout=10,
        ).stdout.strip()
        if out:
            return out[:10]
    except Exception:
        pass
    return datetime.date.fromtimestamp(os.path.getmtime(path)).isoformat()


def pages():
    out = []
    for name in sorted(os.listdir(FRONTEND)):
        if not name.endswith(".html") or name in EXCLUDE:
            continue
        out.append(name)
    return out


def write_sitemap(names):
    rows = []
    for name in names:
        path = os.path.join(FRONTEND, name)
        prio = "1.0" if name == "index.html" else "0.8" if name in HIGH else "0.6" if name in MEDIUM else "0.4"
        freq = "daily" if name in ("index.html", "news-archive.html") else "weekly" if name in HIGH else "monthly"
        rows.append(
            "  <url>\n"
            f"    <loc>{page_url(name)}</loc>\n"
            f"    <lastmod>{last_modified(path)}</lastmod>\n"
            f"    <changefreq>{freq}</changefreq>\n"
            f"    <priority>{prio}</priority>\n"
            "  </url>"
        )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(rows)
        + "\n</urlset>\n"
    )
    with open(os.path.join(FRONTEND, "sitemap.xml"), "w") as f:
        f.write(xml)
    return len(rows)


def write_robots():
    # AI answer engines are now a real discovery channel, so they're
    # explicitly welcomed rather than left to guess.
    body = f"""# Digital Safety Knights — free child online-safety education.
# Everything here is public and free to read. Crawling is welcome.

User-agent: *
Allow: /
Disallow: /dashboard.html
Disallow: /login.html
Disallow: /donation-success.html
Disallow: /certificate.html
Disallow: /member-id.html
Disallow: /stats.html

# AI answer engines — explicitly allowed; being cited in an AI answer is a
# legitimate way for a parent to find this information.
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: {SITE}/sitemap.xml
"""
    with open(os.path.join(FRONTEND, "robots.txt"), "w") as f:
        f.write(body)


CANON_RE = re.compile(r'<link rel="canonical"[^>]*>\n?')


def inject_canonicals(names):
    """Adds a canonical tag to every indexable page. Idempotent — an existing
    canonical is replaced rather than duplicated."""
    changed = 0
    for name in names:
        path = os.path.join(FRONTEND, name)
        with open(path) as f:
            html = f.read()
        tag = f'<link rel="canonical" href="{page_url(name)}">'
        if tag in html:
            continue
        html = CANON_RE.sub("", html)
        # Anchor to </title> — every page has exactly one and it's in <head>.
        if "</title>" not in html:
            print(f"  [skip] {name}: no <title>")
            continue
        html = html.replace("</title>", "</title>\n" + tag, 1)
        with open(path, "w") as f:
            f.write(html)
        changed += 1
    return changed


if __name__ == "__main__":
    names = pages()
    n = write_sitemap(names)
    write_robots()
    c = inject_canonicals(names)
    print(f"sitemap.xml: {n} urls")
    print(f"robots.txt: written")
    print(f"canonical tags added to {c} page(s)")
