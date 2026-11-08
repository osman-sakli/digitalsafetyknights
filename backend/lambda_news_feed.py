"""Live news feed — 'Digital Safety Watch', one per site language.

Runs every 12 hours (EventBridge). For each locale in LOCALES it scans
that locale's own Google News edition for child-digital-safety stories,
resolves each Google redirect token to the REAL publisher URL,
live-verifies that URL, writes a short plain-language summary for parents
in that language, and publishes the result as JSON to S3 for the page
widget to render.

Each language searches its own jurisdiction in its own language rather
than reading a translation of the English feed — a French parent needs
the CNIL and the "majorité numérique" law, not a story about the FTC.

Three hard rules, the first two from DSK's ethics guardrails:
  1. Every item carries its real source name and a working link to the
     original reporting. Nothing is presented as DSK's own reporting.
  2. Summaries only restate what the headline/snippet actually says. If
     the LLM call fails for any reason we fall back to the publisher's own
     headline rather than inventing a summary.
  3. This job reports news; it never writes safety advice. Unreviewed
     guidance on a child-safety site is worse than none, so the autonomous
     part of the system is deliberately limited to sourced links.

Pure stdlib (no `requests`) so this deploys as a plain zip, matching
lambda_monthly_report.py.
"""
import datetime
import html
import json
import os
import re
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

import boto3

BUCKET = "digitalsafetyknights.org"
CLOUDFRONT_DISTRIBUTION_ID = "E1XP6H2UONLEBO"
FAL_API_KEY_SECRET_ID = "dsk-shorts/fal-api-key"
ARCHIVE_KEEP_DAYS = 120

# AI and gaming get two slots each: Osman wants both foregrounded, and they
# are where the threat is actually moving. The rest of the set is the policy,
# enforcement and privacy ground the feed has always covered.
QUERIES = [
    "child online safety",
    "kids social media law",
    "AI chatbot child safety risk",
    "AI deepfake nudify images minors",
    "children online gaming predators Roblox",
    "video game scam children Robux",
    "teen social media mental health",
    "children data privacy app",
]

# A title has to carry at least one of these to be published. Google News
# answers a broad child-safety query with whatever is topical, and the first
# four-language run proved it: the French feed picked up a coach crash in the
# Ain that killed a seven-year-old, and the Turkish feed picked up three
# regional youth-programme stories. Neither has anything to do with digital
# safety, and a road fatality on a child-online-safety feed is worse than an
# empty slot.
#
# Matching is by word, not substring, because a plain substring test is wrong
# in every one of our four languages: "veri" (data) sits inside "verildi"
# (was given), "jeu" inside "jeunes", "app" inside "happened", "ai" inside
# "aid". Short keys (<= 5 letters) must match a whole word; longer keys match
# from a word start so suffixes still count — "oyun" catches "oyunlar",
# "game" catches "gaming", "veriler" catches "verilerinin".
RELEVANCE = {
    "en": ["online", "internet", "social media", "app", "apps", "ai", "artificial intelligence",
           "chatbot", "deepfake", "nudify", "gaming", "game", "games", "roblox", "discord",
           "minecraft", "fortnite", "smartphone", "phone", "screen", "cyber", "digital",
           "platform", "tiktok", "instagram", "snapchat", "youtube", "data", "privacy",
           "sextortion", "grooming", "web"],
    "es": ["en línea", "en linea", "internet", "redes sociales", "aplicación", "app", "apps",
           "ia", "inteligencia artificial", "chatbot", "deepfake", "videojuego", "videojuegos",
           "juego", "juegos", "roblox", "discord", "minecraft", "fortnite", "celular", "móvil",
           "pantalla", "ciber", "digital", "plataforma", "tiktok", "instagram", "snapchat",
           "youtube", "datos", "privacidad", "sextorsión", "grooming", "web"],
    "fr": ["en ligne", "internet", "réseaux sociaux", "application", "appli", "ia",
           "intelligence artificielle", "chatbot", "deepfake", "hypertrucage", "jeu vidéo",
           "jeux vidéo", "jeu", "jeux", "roblox", "discord", "minecraft", "fortnite",
           "smartphone", "téléphone", "écran", "cyber", "numérique", "plateforme", "tiktok",
           "instagram", "snapchat", "youtube", "données", "vie privée", "pédopiégeage",
           "sextorsion", "web"],
    "tr": ["çevrimiçi", "çevrim içi", "internet", "sosyal medya", "uygulama", "yapay zeka",
           "yapay zekâ", "sohbet botu", "deepfake", "oyun", "roblox", "discord", "minecraft",
           "fortnite", "telefon", "ekran", "siber", "dijital", "platform", "tiktok", "instagram",
           "snapchat", "youtube", "veri", "veriler", "gizlilik", "şantaj", "kandırma", "web"],
}

_WORD_EDGE = r"[^0-9A-Za-z\u00c0-\u024f]"


# Keys that are a prefix of an unrelated common word, so they have to match a
# whole word and nothing longer. Everything else matches from a word start so
# suffixes still count, which is what agglutinative Turkish needs: "çocuk"
# must reach "çocuklar" and "çocukların", "oyun" must reach "oyunlarda".
WHOLE_WORD_ONLY = {
    "ai",      # aid, air, aim
    "app",     # happened — and "apple"
    "ia",      # social, especial, media
    "jeu",     # jeune, jeunes, jeunesse
    "veri",    # verildi, verilen, vermek
    "game",    # gamete; also keeps "games"/"gaming" as their own keys
    "web",     # webinar is fine either way, but keep it tight
    "ado",     # adopter, adoption
    "anne",    # (tr) anne is a whole word; annelik is fine too, but keep tight
}


def _relevance_pattern(keys):
    parts = []
    for k in keys:
        esc = re.escape(k)
        parts.append(f"(?<!\\w){esc}(?!\\w)" if k in WHOLE_WORD_ONLY
                     else f"(?<!\\w){esc}")
    return re.compile("|".join(parts), re.IGNORECASE)


_RELEVANCE_RE = {lang: _relevance_pattern(keys) for lang, keys in RELEVANCE.items()}


def _fold(text):
    """Lowercase for matching, and drop the combining dot Python leaves behind
    when it lowercases Turkish "İ" — without that, "İnternet" lowercases to
    "i̇nternet" and never matches "internet".

    Deliberately NOT NFKD: decomposing split "ç" into c + combining cedilla,
    so every accented keyword in all four languages — çocuk, données, niños —
    silently matched nothing. Only the stray dot is removed."""
    return text.lower().replace("\u0307", "")


def is_relevant(title, lang):
    """True if the headline carries any digital, AI or gaming signal."""
    pattern = _RELEVANCE_RE.get(lang)
    return bool(pattern and pattern.search(_fold(html.unescape(title))))


# The digital signal alone is not enough: "Yapay zekâda yeni dönem: eğitim,
# altyapı ve 10 milyar dolarlık hedef" passes it and is an AI investment
# story with no child in it. Turkish and French child-AI coverage is thinner
# than English, so the AI and gaming queries pull in general tech news to
# fill the gap. A headline has to name a child, a teenager, a parent or a
# school as well.
AUDIENCE = {
    "en": ["child", "children", "childhood", "kid", "kids", "teen", "teens", "teenager",
           "teenagers", "minor", "minors", "student", "students", "pupil", "pupils", "school",
           "schools", "parent", "parents", "family", "families", "youth", "young", "boy", "boys",
           "girl", "girls", "toddler", "infant", "under-16", "under-13", "under 16", "under 13",
           "age verification", "age check", "classroom", "paediatric", "pediatric"],
    "es": ["niño", "niños", "niña", "niñas", "menor", "menores", "adolescente", "adolescentes",
           "hijo", "hijos", "hija", "hijas", "infantil", "infancia", "niñez", "estudiante",
           "estudiantes", "alumno", "alumnos", "escuela", "escuelas", "colegio", "padres",
           "madres", "familia", "familias", "juventud", "joven", "jóvenes", "aula",
           "verificación de edad"],
    "fr": ["enfant", "enfants", "enfance", "mineur", "mineurs", "mineure", "mineures", "ado",
           "ados", "adolescent", "adolescents", "adolescente", "adolescentes", "élève", "élèves",
           "école", "écoles", "scolaire", "collège", "lycée", "parent", "parents", "famille",
           "familles", "jeune", "jeunes", "jeunesse", "moins de 16", "moins de 15", "moins de 13",
           "vérification de l'âge"],
    "tr": ["çocuk", "çocuklar", "çocukluk", "genç", "gençler", "gençlik", "ergen", "ergenler",
           "öğrenci", "öğrenciler", "okul", "okullar", "ebeveyn", "ebeveynler", "veli", "veliler",
           "aile", "aileler", "bebek", "evlat", "yaş altı", "yaş sınırı", "reşit olmayan",
           "akran", "sınıf", "lise", "ortaokul", "ilkokul", "anne", "baba"],
}

_AUDIENCE_RE = {lang: _relevance_pattern(keys) for lang, keys in AUDIENCE.items()}


def names_a_child(title, lang):
    """True if the headline is about children, teenagers, parents or schools."""
    pattern = _AUDIENCE_RE.get(lang)
    return bool(pattern and pattern.search(_fold(html.unescape(title))))


# Google News returns the same story from several publishers, and the first
# gated run filled three of six French slots with the same California lawsuit
# and two of six Turkish slots with the same Tekirdag police warning. URL
# de-duplication does not catch it because the URLs differ, so compare the
# headlines themselves.
_STOP = {
    "the", "a", "an", "of", "to", "and", "or", "in", "on", "for", "with", "at", "by", "from",
    "is", "are", "be", "as", "that", "this", "it", "its", "new", "says", "after", "over",
    "la", "le", "les", "el", "los", "las", "un", "una", "une", "des", "du", "de", "y", "et",
    "en", "con", "para", "por", "que", "se", "sur", "pour", "dans", "aux", "au", "ve", "ile",
    "icin", "için", "bir", "da", "de", "ki", "mi", "ne",
}


def _title_tokens(title):
    words = re.findall(r"[0-9a-z\u00c0-\u024f]+", _fold(html.unescape(title)))
    return {w for w in words if w not in _STOP and len(w) > 2}


def _entities(title):
    """The named things in a headline: capitalised words, plus the platform
    and company names that carry the story. Case is taken from the original
    title, so this has to run before folding."""
    words = re.findall(r"[0-9A-Za-z\u00c0-\u024f']+", html.unescape(title))
    out = set()
    for w in words:
        low = w.lower()
        if low in _BRANDS:
            out.add(low)
        elif len(w) > 2 and w[0].isupper() and not w.isupper() and low not in _STOP:
            out.add(low)
    return out


_BRANDS = {
    "google", "meta", "tiktok", "snapchat", "instagram", "facebook", "youtube", "roblox",
    "discord", "minecraft", "fortnite", "apple", "amazon", "microsoft", "openai", "whatsapp",
    "telegram", "twitch", "x", "california", "texas", "florida", "utah", "australia", "ncmec",
    "ftc", "cnil", "ofcom", "eu", "ue", "unicef",
}


def is_near_duplicate(title, kept_titles, threshold=0.45, entity_floor=3):
    """Two tests, because one is not enough.

    Jaccard overlap on meaningful words catches the obvious rewrites. It
    cannot catch all of them: measured against real pairs from this feed,
    same-story overlap ran as low as 0.267 while genuinely different stories
    reached 0.333, so the two classes are not separable by a threshold and
    tuning one lower would start collapsing distinct stories. The second test
    is the named things — three or more shared proper nouns or platform names
    means Google News has handed us the same wire story from another
    publisher, which is exactly how the French feed ended up with the
    California lawsuit three times."""
    tokens = _title_tokens(title)
    ents = _entities(title)
    for other in kept_titles:
        o_tokens = _title_tokens(other)
        if tokens and o_tokens:
            if len(tokens & o_tokens) / len(tokens | o_tokens) >= threshold:
                return True
        if len(ents & _entities(other)) >= entity_floor:
            return True
    return False


MAX_AGE_DAYS = 3
TARGET_ITEMS = 6

# One locale per site language. The queries are written in the locale's
# own language and aimed at its own jurisdiction rather than translated
# from the English set — a French parent needs the CNIL and the "majorité
# numérique" law, not a translation of a story about the FTC.
#
# English keeps the original, unsuffixed S3 keys so the existing homepage
# widget and archive page keep working untouched.
LOCALES = {
    "en": {
        "gnews": "&hl=en-US&gl=US&ceid=US:en",
        "feed_key": "content/news-feed.json",
        "archive_key": "content/news-archive.json",
        "language": "English",
        "queries": QUERIES,
    },
    "es": {
        "gnews": "&hl=es-419&gl=MX&ceid=MX:es-419",
        "feed_key": "content/news-feed-es.json",
        "archive_key": "content/news-archive-es.json",
        "language": "Latin American Spanish",
        "queries": [
            "seguridad infantil en internet",
            "ley redes sociales menores",
            "chatbot inteligencia artificial niños riesgo",
            "deepfake imágenes IA menores",
            "videojuegos niños depredadores en línea",
            "estafa Robux Roblox niños",
            "salud mental adolescentes redes sociales",
            "privacidad datos niños aplicación",
        ],
    },
    "fr": {
        "gnews": "&hl=fr&gl=FR&ceid=FR:fr",
        "feed_key": "content/news-feed-fr.json",
        "archive_key": "content/news-archive-fr.json",
        "language": "French",
        "queries": [
            "sécurité des enfants en ligne",
            "loi réseaux sociaux mineurs",
            "intelligence artificielle enfants risque chatbot",
            "deepfake images IA mineurs",
            "jeux vidéo enfants prédateurs en ligne",
            "arnaque Robux Roblox enfants",
            "santé mentale adolescents réseaux sociaux",
            "données personnelles enfants application CNIL",
        ],
    },
    "tr": {
        "gnews": "&hl=tr&gl=TR&ceid=TR:tr",
        "feed_key": "content/news-feed-tr.json",
        "archive_key": "content/news-archive-tr.json",
        "language": "Turkish",
        "queries": [
            "çocuk güvenliği internet sosyal medya",
            "sosyal medya yaş sınırı yasa",
            "yapay zeka sohbet botu çocuk risk",
            "yapay zeka deepfake çocuk görüntü",
            "çocuk çevrimiçi oyun risk Roblox",
            "Robux dolandırıcılık çocuk oyun",
            "ergen ruh sağlığı sosyal medya",
            "çocuk veri gizliliği uygulama",
        ],
    },
}
# The three filters run before any URL resolution, so they cost nothing and
# only survivors get resolved. Raised from 22 to give the stricter gates
# enough headroom to still fill six slots.
MAX_CANDIDATES_TRIED = 32
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"

s3 = boto3.client("s3")
cloudfront = boto3.client("cloudfront")
secretsmanager = boto3.client("secretsmanager")


def _http(url, data=None, headers=None, timeout=20, method=None):
    req = urllib.request.Request(
        url,
        data=data.encode() if isinstance(data, str) else data,
        headers=headers or {"User-Agent": UA},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read()


def _fal_api_key():
    return secretsmanager.get_secret_value(SecretId=FAL_API_KEY_SECRET_ID)["SecretString"]


def fetch_candidates(locale):
    seen_titles = set()
    candidates = []
    for query in locale["queries"]:
        url = (
            "https://news.google.com/rss/search?q="
            + urllib.parse.quote(f"{query} when:{MAX_AGE_DAYS}d")
            + locale["gnews"]
        )
        try:
            _, body = _http(url)
            root = ET.fromstring(body)
        except Exception as e:  # noqa: BLE001 — one bad feed shouldn't kill the run
            print(f"[warn] query '{query}' failed: {e}")
            continue
        for item in root.findall(".//item")[:6]:
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            pub = (item.findtext("pubDate") or "").strip()
            src_el = item.find("source")
            source = src_el.text.strip() if src_el is not None and src_el.text else ""
            # Google News titles are "Headline - Publisher"; split the
            # publisher off so the card shows a clean headline.
            if source and title.endswith(f" - {source}"):
                title = title[: -len(f" - {source}")].strip()
            key = title.lower()[:70]
            if title and link and key not in seen_titles:
                seen_titles.add(key)
                candidates.append({"title": title, "link": link, "source": source, "pubDate": pub})
    return candidates


def resolve_google_news_url(rss_link):
    """Decodes a Google News RSS redirect token to the real publisher URL via
    Google's internal batchexecute endpoint. Returns None on any failure —
    callers must treat that as 'unusable candidate', never fall back to
    posting the raw redirect token."""
    try:
        base64_str = urllib.parse.urlparse(rss_link).path.split("/")[-1]
        _, page = _http(rss_link)
        page_text = page.decode("utf-8", "ignore")
        sg = re.search(r'data-n-a-sg="([^"]+)"', page_text)
        ts = re.search(r'data-n-a-ts="([^"]+)"', page_text)
        if not sg or not ts:
            return None
        inner = (
            '["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,'
            'null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],'
            f'"{base64_str}",{ts.group(1)},"{sg.group(1)}"]'
        )
        _, resp = _http(
            "https://news.google.com/_/DotsSplashUi/data/batchexecute",
            data="f.req=" + urllib.parse.quote(json.dumps([[["Fbv4je", inner]]])),
            headers={
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                "User-Agent": UA,
            },
        )
        parsed = json.loads(resp.decode("utf-8", "ignore").split("\n\n")[1])[:-2]
        return json.loads(parsed[0][2])[1]
    except Exception as e:  # noqa: BLE001
        print(f"[warn] link decode failed: {e}")
        return None


def verify_link_is_live(url):
    """Confirms the URL resolves before it ever reaches the site. Rejects
    anything still on google.com (a failed decode). A 401/403 means the
    publisher blocks bots, not that the link is broken — those are accepted
    since a real browser will still open them."""
    try:
        host = urllib.parse.urlparse(url).hostname or ""
        if "google.com" in host or not host:
            return False
        status, _ = _http(url, timeout=15)
        return status < 400
    except urllib.error.HTTPError as e:
        return e.code in (401, 403, 405, 429)
    except Exception as e:  # noqa: BLE001
        print(f"[warn] verify failed for {url}: {e}")
        return False


def publisher_from_url(url, fallback):
    host = (urllib.parse.urlparse(url).hostname or "").replace("www.", "")
    return fallback or host


# "Write every summary in Turkish" is not an instruction that produces
# Turkish a Turkish parent would write. These are the house rules for each
# language — the same ones the site's own translations follow — so the feed
# reads as though a person in that country wrote it, not as though English
# was run through a translator. Osman asked for this explicitly: real
# grammar rules and everyday usage, every day, in all four.
STYLE = {
    "English": (
        "Plain international English, lightly British (realise, organisation). "
        "Everyday register: write the way a parent would say it out loud, not "
        "the way a press release would. No officialese."
    ),
    "Latin American Spanish": (
        "Latin American Spanish (es-419), never peninsular: no vosotros, and use "
        "computadora/celular rather than ordenador/móvil. Address the reader "
        "impersonally or in third person, not with usted. Decimal comma and a "
        "point or thin space for thousands (1,4 millones). A space before the "
        "percent sign (80 %). Everyday register, as a Mexican or Colombian parent "
        "would actually say it."
    ),
    "French": (
        "Metropolitan French, vouvoiement. Typography matters and is usually what "
        "gives a translation away: a narrow no-break space before : ; ! ? and %, "
        "and inside « » which replace English quotation marks. Decimal comma "
        "(1,4 million). Watch the contraction trap — « de » before an infinitive "
        "never becomes « du »: « avant de partager », never « avant du partager ». "
        "Everyday register, as a parent in France would say it."
    ),
    "Turkish": (
        "Turkish with formal siz for the reader. Never calque English word order — "
        "rebuild the sentence with the verb at the end where Turkish wants it. "
        "No comma before « ve ». The percent sign comes first (%80, not 80%). "
        "Apostrophe before case suffixes on proper nouns and acronyms (ABD'de, "
        "NCMEC'e, TikTok'ta). Settled DSK terminology: çevrimiçi (not online), "
        "dolandırıcılık, kandırma for grooming, yapay zeka, sohbet botu, veri "
        "gizliliği. Everyday register, as a Turkish parent would actually say it."
    ),
}


def summarize(items, language="English"):
    """One LLM call for the whole batch. Returns {title: summary}. On any
    failure returns {} and callers fall back to the publisher's headline —
    we never fabricate a summary."""
    if not items:
        return {}
    listing = "\n".join(f"{i+1}. {it['title']} ({it['source']})" for i, it in enumerate(items))
    system = (
        f"You write one-sentence, plain-language summaries of child-online-safety news for "
        f"parents, for Digital Safety Knights. Write every summary in {language}, regardless "
        f"of the language of the headline. Calm, precise, factual — never fear-mongering, "
        "never hype. Each summary must be understandable by a non-technical parent and must "
        "only restate what the headline itself says. Never add a statistic, name, or claim "
        "that is not in the headline. Do not echo the headline back — a summary that repeats "
        "it word for word is useless, so say what it means for a family. Max 22 words each.\n\n"
        f"How to write {language}: {STYLE.get(language, '')}\n\n"
        'Reply with ONLY a JSON array of objects: [{"n": 1, "summary": "..."}] and nothing else.'
    )
    body = json.dumps(
        {
            "model": "anthropic/claude-sonnet-4.5",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": f"Headlines:\n{listing}\n\nReturn the JSON array now."},
            ],
        }
    )
    try:
        _, resp = _http(
            "https://fal.run/openrouter/router/openai/v1/chat/completions",
            data=body,
            headers={
                "Authorization": f"Key {_fal_api_key()}",
                "Content-Type": "application/json",
                "User-Agent": UA,
            },
            timeout=90,
        )
        content = json.loads(resp)["choices"][0]["message"]["content"].strip()
        match = re.search(r"\[.*\]", content, re.DOTALL)
        if not match:
            return {}
        out = {}
        for row in json.loads(match.group(0)):
            idx = int(row["n"]) - 1
            if not 0 <= idx < len(items):
                continue
            title = items[idx]["title"]
            summary = row["summary"].strip()
            # A summary that is just the headline again adds nothing, and the
            # widget already shows the headline above it. Dropping it falls
            # back to headline-only, which is honest; printing it twice is not.
            if summary.lower().rstrip(".") == html.unescape(title).lower().rstrip("."):
                print(f"[warn] echoed headline, dropping summary: {title[:60]}")
                continue
            out[title] = summary
        return out
    except Exception as e:  # noqa: BLE001 — degrade to headlines, never invent
        print(f"[warn] summarize failed, falling back to headlines: {e}")
        return {}


def build_feed(locale, lang):
    candidates = fetch_candidates(locale)
    print(f"{len(candidates)} raw candidates")
    kept, titles = [], []
    for c in candidates:
        title = c["title"]
        if not is_relevant(title, lang):
            print(f"[drop] no digital/AI/gaming signal: {title[:66]}")
            continue
        if not names_a_child(title, lang):
            print(f"[drop] not about children: {title[:66]}")
            continue
        if is_near_duplicate(title, titles):
            print(f"[drop] same story already kept: {title[:66]}")
            continue
        kept.append(c)
        titles.append(title)
    print(f"{len(kept)} of {len(candidates)} candidates survived the filters")
    candidates = kept
    resolved = []
    tried = 0
    for cand in candidates:
        if len(resolved) >= TARGET_ITEMS or tried >= MAX_CANDIDATES_TRIED:
            break
        tried += 1
        real_url = resolve_google_news_url(cand["link"])
        if not real_url or not verify_link_is_live(real_url):
            print(f"[skip] unresolvable/dead: {cand['title'][:60]}")
            continue
        cand["url"] = real_url
        cand["source"] = publisher_from_url(real_url, cand["source"])
        resolved.append(cand)

    summaries = summarize(resolved, locale["language"])
    items = []
    for cand in resolved:
        items.append(
            {
                "title": html.unescape(cand["title"]),
                "summary": summaries.get(cand["title"], ""),
                "source": cand["source"],
                "url": cand["url"],
                "published": cand["pubDate"],
            }
        )
    return items


def load_archive(archive_key):
    """Reads the existing archive. A missing key is normal on the very first
    run; any other failure is re-raised so we never silently start a fresh
    archive and wipe months of history."""
    try:
        body = s3.get_object(Bucket=BUCKET, Key=archive_key)["Body"].read()
        data = json.loads(body)
        return data.get("days", {})
    except s3.exceptions.NoSuchKey:
        print("No archive yet — starting one.")
        return {}


def update_archive(items, today, archive_key):
    """Files today's items under today's date, skipping any URL already
    anywhere in the archive so a story spotted across several 12h runs is
    kept once, on the day it first appeared. Trims to ARCHIVE_KEEP_DAYS."""
    days = load_archive(archive_key)
    seen_urls = {it["url"] for day_items in days.values() for it in day_items}

    fresh = [it for it in items if it["url"] not in seen_urls]
    if fresh:
        days.setdefault(today, [])
        # Newest first within the day.
        days[today] = fresh + days[today]

    cutoff = (datetime.date.fromisoformat(today) - datetime.timedelta(days=ARCHIVE_KEEP_DAYS)).isoformat()
    days = {d: v for d, v in days.items() if d >= cutoff}

    total = sum(len(v) for v in days.values())
    payload = {
        "updated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "totalItems": total,
        "days": days,
    }
    s3.put_object(
        Bucket=BUCKET,
        Key=archive_key,
        Body=json.dumps(payload, ensure_ascii=False, indent=2).encode(),
        ContentType="application/json",
        CacheControl="no-cache",
    )
    print(f"Archive: +{len(fresh)} new, {total} total across {len(days)} days")
    return len(fresh), total


def run_locale(lang, locale, today):
    """One language's feed. Returns a result dict; never raises, so one
    locale's bad run cannot stop the other three from publishing."""
    try:
        items = build_feed(locale, lang)
    except Exception as e:  # noqa: BLE001
        print(f"[{lang}] build failed: {e}")
        return {"status": "error", "error": str(e)}

    if not items:
        # Never overwrite a good feed with an empty one — a transient
        # Google outage should leave yesterday's links on the page.
        print(f"[{lang}] no verified items — leaving the existing feed in place.")
        return {"status": "no_verified_items"}

    payload = {
        "updated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "lang": lang,
        "items": items,
    }
    s3.put_object(
        Bucket=BUCKET,
        Key=locale["feed_key"],
        Body=json.dumps(payload, ensure_ascii=False, indent=2).encode(),
        ContentType="application/json",
        CacheControl="no-cache",
    )
    added, total = update_archive(items, today, locale["archive_key"])
    print(f"[{lang}] published {len(items)} items to {locale['feed_key']}")
    return {"status": "published", "count": len(items),
            "archiveAdded": added, "archiveTotal": total}


def handler(event, context):
    """Runs every locale in LOCALES. An `event` may name a subset, e.g.
    {"langs": ["fr"]}, which is what a manual re-run of one language uses."""
    wanted = (event or {}).get("langs") or list(LOCALES)
    today = datetime.date.today().isoformat()
    results = {}
    paths = []

    for lang in wanted:
        locale = LOCALES.get(lang)
        if not locale:
            print(f"[warn] unknown language {lang!r}, skipping")
            continue
        results[lang] = run_locale(lang, locale, today)
        if results[lang]["status"] == "published":
            paths += [f"/{locale['feed_key']}", f"/{locale['archive_key']}"]

    # One invalidation for everything that actually changed, rather than
    # one per language — CloudFront charges per path beyond the free tier.
    if paths:
        cloudfront.create_invalidation(
            DistributionId=CLOUDFRONT_DISTRIBUTION_ID,
            InvalidationBatch={
                "Paths": {"Quantity": len(paths), "Items": paths},
                "CallerReference": f"news-feed-{datetime.datetime.utcnow().timestamp()}",
            },
        )

    published = [l for l, r in results.items() if r["status"] == "published"]
    return {"status": "ok" if published else "nothing_published",
            "published": published, "results": results}


if __name__ == "__main__":
    print(json.dumps(handler({}, None), indent=2))
