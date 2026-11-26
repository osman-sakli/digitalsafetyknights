"""Daily traffic report — real visitor numbers, without tracking anyone.

Reads yesterday's CloudFront access logs, aggregates them, emails Osman a
summary, and publishes a small JSON the private stats page reads.

Why server-side logs instead of an analytics script: the homepage promises
"no ads, no tracking, no data collected from kids". Dropping Google
Analytics (or any client-side tracker with cookies) onto the site would
make that promise false. CloudFront already records requests server-side,
so this needs no JavaScript, no cookies, and no third party.

IPs are only used in-memory to count distinct visitors and are never
stored — the published JSON contains counts only. The raw log bucket has a
7-day expiry lifecycle rule on top of that.
"""
import collections
import datetime
import gzip
import io
import ipaddress
import json
import os
import urllib.parse

import boto3
import boto3.dynamodb.conditions as ddb_cond

LOG_BUCKET = "dsk-cf-logs-339712706640"
LOG_PREFIX = "cf/"
SITE_BUCKET = "digitalsafetyknights.org"
STATS_KEY = "content/traffic-stats.json"
ADMIN_EMAIL = "osmansakli@yahoo.com"
KEEP_DAYS = 30
SHORTS_BUCKET = "dsk-shorts-out-339712706640"
QUEUE_TABLE = "dsk-shorts-publish-queue"
UPLOAD_KEY_SECRET = "dsk-shorts/upload-api-key"
EXPECTED_PLATFORMS = ("youtube", "facebook", "tiktok", "instagram")

s3 = boto3.client("s3")
ses = boto3.client("ses", region_name="us-east-1")

# Requests we don't want counted as a human reading a page.
ASSET_EXT = (".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
             ".woff", ".woff2", ".ttf", ".webp", ".mp4", ".pdf", ".xml", ".txt")
BOT_HINTS = ("bot", "crawler", "spider", "slurp", "curl", "wget", "headless",
             "python-requests", "monitor", "preview", "scan", "go-http", "libwww",
             "okhttp", "java/", "axios", "postman")

# Vulnerability scanners probe for software this site doesn't run. They often
# send a browser-like user agent, so the URL is the reliable tell — without
# this they get counted as real visitors and inflate the numbers.
PROBE_HINTS = ("/wp-admin", "/wp-login", "/wp-content", "/wp-includes", "/xmlrpc",
               "/.env", "/.git", "/phpmyadmin", "/administrator", "/cgi-bin",
               "/vendor/", "/.aws", "/config.php", "/shell", "/adminer",
               "/solr", "/actuator", "/api/jsonws")


def is_asset(uri):
    u = uri.lower()
    return u.endswith(ASSET_EXT) or u.endswith(".json")


def is_page(uri):
    u = uri.lower()
    if u.endswith(ASSET_EXT):
        return False
    if u.endswith(".json"):
        return False
    if any(h in u for h in PROBE_HINTS):
        return False
    return True


def is_probe(uri):
    return any(h in uri.lower() for h in PROBE_HINTS)


def looks_like_bot(agent):
    a = (agent or "").lower()
    return any(h in a for h in BOT_HINTS)


def log_keys_for(day):
    """CloudFront names files <prefix><dist-id>.YYYY-MM-DD-HH.<hash>.gz"""
    prefix = f"{LOG_PREFIX}E1XP6H2UONLEBO.{day.isoformat()}"
    keys, token = [], None
    while True:
        kw = {"Bucket": LOG_BUCKET, "Prefix": prefix}
        if token:
            kw["ContinuationToken"] = token
        resp = s3.list_objects_v2(**kw)
        keys += [o["Key"] for o in resp.get("Contents", [])]
        if not resp.get("IsTruncated"):
            break
        token = resp.get("NextContinuationToken")
    return keys


# CloudFront standard logs carry no c-country field — only real-time logs do,
# and those need a paid Kinesis stream. Deliberately NOT resolved by sending
# visitor IPs to a geolocation API — the site promises no tracking and no
# data collected, and handing real visitor IPs to a third party would break
# that promise for a nice-to-have stat.
#
# A visitor's country is looked up in a table that travels with this report
# (country_of, below). Where the table has no answer, the edge location is
# the next best signal and costs nothing: CloudFront serves each viewer from
# a nearby edge, so the airport code approximates where they are.
EDGE_COUNTRY = {
    # United States
    "ATL": "United States", "BOS": "United States", "ORD": "United States",
    "DFW": "United States", "DEN": "United States", "HIO": "United States",
    "IAH": "United States", "JAX": "United States", "LAX": "United States",
    "MIA": "United States", "MSP": "United States", "JFK": "United States",
    "EWR": "United States", "PHL": "United States", "PHX": "United States",
    "SEA": "United States", "SFO": "United States", "SLC": "United States",
    "IAD": "United States", "MCI": "United States", "CMH": "United States",
    "IND": "United States", "PDX": "United States", "SAN": "United States",
    "TPA": "United States", "CLT": "United States", "BNA": "United States",
    "PIT": "United States", "STL": "United States", "LAS": "United States",
    "AUS": "United States", "SJC": "United States", "HNL": "United States",
    "ANC": "United States", "QRO": "Mexico", "MEX": "Mexico",
    # Europe
    "AMS": "Netherlands", "ARN": "Sweden", "ATH": "Greece", "BCN": "Spain",
    "BRU": "Belgium", "BUD": "Hungary", "CPH": "Denmark", "DUB": "Ireland",
    "DUS": "Germany", "FRA": "Germany", "HAM": "Germany", "MUC": "Germany",
    "TXL": "Germany", "BER": "Germany", "HEL": "Finland", "LIS": "Portugal",
    "LHR": "United Kingdom", "LON": "United Kingdom", "MAN": "United Kingdom",
    "MAD": "Spain", "MRS": "France", "CDG": "France", "PMO": "Italy",
    "MXP": "Italy", "FCO": "Italy", "OSL": "Norway", "PRG": "Czechia",
    "VIE": "Austria", "WAW": "Poland", "ZRH": "Switzerland", "ZAG": "Croatia",
    "OTP": "Romania", "SOF": "Bulgaria", "IST": "Türkiye", "KBP": "Ukraine",
    # Middle East / Africa
    "TLV": "Israel", "DXB": "United Arab Emirates", "FJR": "United Arab Emirates",
    "BAH": "Bahrain", "MCT": "Oman", "CPT": "South Africa", "JNB": "South Africa",
    "LOS": "Nigeria", "NBO": "Kenya", "CAI": "Egypt",
    # Asia / Pacific
    "BOM": "India", "DEL": "India", "MAA": "India", "BLR": "India",
    "HYD": "India", "CCU": "India", "HKG": "Hong Kong", "TPE": "Taiwan",
    "NRT": "Japan", "KIX": "Japan", "ICN": "South Korea", "SIN": "Singapore",
    "BKK": "Thailand", "KUL": "Malaysia", "CGK": "Indonesia", "MNL": "Philippines",
    "HAN": "Vietnam", "SGN": "Vietnam", "SYD": "Australia", "MEL": "Australia",
    "PER": "Australia", "BNE": "Australia", "AKL": "New Zealand",
    # South America
    "GRU": "Brazil", "GIG": "Brazil", "FOR": "Brazil", "EZE": "Argentina",
    "SCL": "Chile", "BOG": "Colombia", "LIM": "Peru",
    # Canada
    "YUL": "Canada", "YTO": "Canada", "YYZ": "Canada", "YVR": "Canada",
}


def edge_country(edge_location):
    """'ZRH50-C1' -> 'Switzerland'. Unknown codes are reported honestly
    rather than guessed at, so a new edge never invents a wrong country."""
    code = "".join(c for c in edge_location[:3] if c.isalpha()).upper()
    return EDGE_COUNTRY.get(code, f"Unknown ({code})" if code else "Unknown")


# The country table: DB-IP's free "IP to Country Lite" (CC BY 4.0), turned
# into traffic_countries.bin by build_country_table.py and shipped in this
# function's zip. The lookup happens here, in memory; no address leaves.
# Whatever shows its results carries the credit below (DB-IP's condition).
COUNTRY_TABLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "traffic_countries.bin")
COUNTRY_CREDIT = ("IP Geolocation by DB-IP", "https://db-ip.com")
_countries = None


def load_countries():
    """The table, or None when its file is missing or not whole. The report
    then goes on without it: countries fall back to the CloudFront edge."""
    global _countries
    if _countries is None:
        try:
            with open(COUNTRY_TABLE, "rb") as f:
                raw = f.read()
            if raw[:8] != b"DSKGEO1\n":
                raise ValueError("not a country table")
            head_len = int.from_bytes(raw[8:12], "big")
            head = json.loads(raw[12:12 + head_len])
            at = 12 + head_len
            parts = {}
            for version, width in ((4, 4), (6, 16)):
                rows = int(head["rows"][str(version)])
                firsts = raw[at:at + rows * width]
                at += rows * width
                codes = raw[at:at + rows * 2]
                at += rows * 2
                parts[version] = (width, rows, firsts, codes)
            if at != len(raw) or not parts[4][1] or not parts[6][1]:
                raise ValueError("country table is cut short")
            _countries = {"release": str(head["release"]), "names": head["names"], "parts": parts}
        except (OSError, ValueError, KeyError, TypeError) as e:
            print(f"country table not usable, falling back to the CloudFront edge: {e}")
            _countries = False
    return _countries or None


def country_of(address):
    """'1.0.0.1' -> 'Australia'. None when the table has no answer for it."""
    table = load_countries()
    if not table:
        return None
    try:
        ip = ipaddress.ip_address((address or "").strip())
    except ValueError:
        return None
    if ip.version == 6 and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    width, rows, firsts, codes = table["parts"][ip.version]
    # Addresses are stored in order as fixed-width bytes, so comparing the
    # bytes compares the addresses. Find the last stretch that starts at or
    # before this one.
    key = ip.packed
    lo, hi = 0, rows
    while lo < hi:
        mid = (lo + hi) // 2
        if firsts[mid * width:(mid + 1) * width] <= key:
            lo = mid + 1
        else:
            hi = mid
    if lo == 0:
        return None
    code = codes[(lo - 1) * 2:lo * 2].decode("ascii", "replace")
    if code == "ZZ":
        return None
    return table["names"].get(code, code)


# Since 2026-11-23 the site is served through Preclearance's firewall: its
# edge in Frankfurt receives every visitor and fetches the page from
# CloudFront itself. CloudFront therefore logs the edge's two outgoing
# addresses as c-ip for everybody. Counted by c-ip, all visitors became two
# "addresses", one crawler among them marked both as bots, and this report
# read 0 visitors on 24 and 25 November while about 2,000 requests a day
# were being served.
#
# The edge puts the visitor's own address in X-Forwarded-For (it does not
# pass on what the visitor sent in that header), and CloudFront logs the
# header. It is believed only on requests that arrive from the edge's two
# addresses: anyone can call CloudFront directly and write what they like in
# it. Same addresses and same setting name as the API's door
# (lambda_edge_gate.py).
EDGE_EGRESS = {ip.strip() for ip in os.environ.get("EDGE_EGRESS_IPS", "63.185.255.22,63.186.219.69").split(",") if ip.strip()}
THROUGH_FIREWALL = "Not known (came through the firewall)"


def visitor_of(row):
    """(the address to count this request under, whether it came through the firewall).

    The address is None for a request the firewall made for itself, which is
    nobody's visit.
    """
    ip = row.get("c-ip", "")
    if ip not in EDGE_EGRESS:
        return ip, False
    forwarded = urllib.parse.unquote(row.get("x-forwarded-for", "") or "")
    last = forwarded.split(",")[-1].strip()
    if not last or last == "-" or last in EDGE_EGRESS:
        return None, True
    return last, True


def aggregate(day):
    """Counts humans, not scripts.

    The decisive signal is asset correlation: a real browser that renders a
    page also fetches its JS/CSS/images from the same IP. Scrapers request
    the HTML and nothing else. Checking that caught a Tencent-Cloud scraper
    farm that a user-agent filter alone had counted as 21 "visitors" — they
    all shared one spoofed iPhone-OS-13 agent and fetched zero assets.
    """
    per_ip = collections.defaultdict(
        lambda: {"pages": collections.Counter(), "assets": 0, "bot": False, "edges": collections.Counter(), "firewall": False}
    )
    total_requests = 0

    for key in log_keys_for(day):
        body = s3.get_object(Bucket=LOG_BUCKET, Key=key)["Body"].read()
        text = gzip.GzipFile(fileobj=io.BytesIO(body)).read().decode("utf-8", "ignore")
        fields = None
        for line in text.splitlines():
            if line.startswith("#Fields:"):
                fields = line.replace("#Fields:", "").split()
                continue
            if line.startswith("#") or not line.strip() or not fields:
                continue
            parts = line.split("\t")
            if len(parts) < len(fields):
                continue
            row = dict(zip(fields, parts))
            total_requests += 1
            ip, through_firewall = visitor_of(row)
            if ip is None:
                continue
            agent = row.get("cs(User-Agent)", "")
            uri = row.get("cs-uri-stem", "")
            status = row.get("sc-status", "")
            rec = per_ip[ip]

            if looks_like_bot(agent) or is_probe(uri):
                rec["bot"] = True
                continue
            if not (status.startswith("2") or status.startswith("3")):
                continue
            if through_firewall:
                # Served from Frankfurt whoever they are: that is where the
                # firewall stands, not where the visitor is.
                rec["firewall"] = True
            else:
                rec["edges"][row.get("x-edge-location", "")] += 1
            if is_asset(uri):
                rec["assets"] += 1
            elif is_page(uri):
                rec["pages"][uri] += 1

    visitors = 0
    bots = 0
    pages = collections.Counter()
    page_views = 0
    countries = collections.Counter()
    for ip, rec in per_ip.items():
        wanted_page = sum(rec["pages"].values()) > 0
        # A page with no accompanying asset request is a scraper, not a reader.
        if rec["bot"] or (wanted_page and rec["assets"] == 0):
            bots += 1
            continue
        if wanted_page:
            visitors += 1
            page_views += sum(rec["pages"].values())
            pages.update(rec["pages"])
            # Counted per visitor, not per request, so one busy reader does
            # not outweigh several people from somewhere else.
            country = country_of(ip)
            edge = rec["edges"].most_common(1)
            if country:
                countries[country] += 1
            elif edge:
                countries[edge_country(edge[0][0])] += 1
            elif rec["firewall"]:
                countries[THROUGH_FIREWALL] += 1

    return {
        "date": day.isoformat(),
        "visitors": visitors,
        "pageViews": page_views,
        "totalRequests": total_requests,
        "botsFiltered": bots,
        "topPages": [{"path": p, "views": n} for p, n in pages.most_common(8)],
        "countries": [{"country": c, "visitors": n} for c, n in countries.most_common(8)],
    }



def shorts_health(day):
    """Did yesterday's short actually get made and posted?

    The pipeline alerts from inside its container, so a task that dies
    before the container starts tells nobody — that is how 2026-08-27
    produced no short and no warning. This runs outside the pipeline, so it
    still reports when the pipeline never ran at all.
    """
    iso = day.isoformat()
    out = {"date": iso, "video": False, "status": None, "platforms": [], "problems": []}

    try:
        listing = s3.list_objects_v2(Bucket=SHORTS_BUCKET, Prefix=iso + "/", MaxKeys=20)
        out["video"] = any(o["Key"].endswith(".mp4") for o in listing.get("Contents", []))
    except Exception as e:
        out["problems"].append(f"could not check the video bucket ({e})")

    try:
        ddb = boto3.resource("dynamodb").Table(QUEUE_TABLE)
        rows = ddb.scan(
            FilterExpression=ddb_cond.Attr("date").eq(iso)
        ).get("Items", [])
        if rows:
            out["status"] = rows[0].get("status")
    except Exception as e:
        out["problems"].append(f"could not read the publish queue ({e})")

    if not out["video"]:
        out["problems"].append("no video was produced — the daily task did not run or failed early")
        return out
    if out["status"] and out["status"] != "published":
        out["problems"].append(f"video made but not published (status: {out['status']})")
        return out

    # The queue says "published" as soon as the upload is handed off, which
    # stays true even when a platform silently drops out — Instagram went
    # missing for days while the row still read published. Only the
    # per-platform result tells you where the video actually landed.
    for platform, ok, detail in platform_results(rows):
        if ok:
            out["platforms"].append(platform)
        else:
            out["problems"].append(f"{platform}: {detail}")
    return out


def platform_results(rows):
    """Yields (platform, ok, detail) for yesterday's upload, by asking the
    upload service what became of it. A platform absent from the results
    never finished at all, which is a different failure from one that
    errored, so the two are reported differently."""
    try:
        import urllib.request
        body = json.loads(rows[0].get("detail") or "{}").get("body") or "{}"
        request_id = json.loads(body).get("request_id")
        if not request_id:
            return
        key = boto3.client("secretsmanager").get_secret_value(
            SecretId=UPLOAD_KEY_SECRET)["SecretString"]
        req = urllib.request.Request(
            f"https://api.upload-post.com/api/uploadposts/status?request_id={request_id}",
            headers={"Authorization": f"Apikey {key}"})
        data = json.loads(urllib.request.urlopen(req, timeout=25).read())
    except Exception as e:
        yield ("upload service", False, f"could not be checked ({e})")
        return

    seen = {r["platform"]: r for r in data.get("results", []) if r.get("platform")}
    for platform in EXPECTED_PLATFORMS:
        r = seen.get(platform)
        if r is None:
            yield (platform, False, "never finished — check the account is still connected")
        elif r.get("success"):
            yield (platform, True, r.get("post_url") or "")
        else:
            yield (platform, False, (r.get("error_code") or r.get("error_message") or "failed"))

def load_history():
    try:
        body = s3.get_object(Bucket=SITE_BUCKET, Key=STATS_KEY)["Body"].read()
        return json.loads(body).get("days", [])
    except s3.exceptions.NoSuchKey:
        return []


def publish(day_stats):
    days = [d for d in load_history() if d["date"] != day_stats["date"]]
    days.append(day_stats)
    days.sort(key=lambda d: d["date"], reverse=True)
    days = days[:KEEP_DAYS]
    payload = {
        "updated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "days": days,
    }
    s3.put_object(
        Bucket=SITE_BUCKET, Key=STATS_KEY,
        Body=json.dumps(payload, indent=2).encode(),
        ContentType="application/json", CacheControl="no-cache",
    )
    return days


def send_email(stats, days, health=None):
    prev = days[1] if len(days) > 1 else None
    delta_html, delta_txt = "", ""
    if prev and prev["visitors"]:
        change = stats["visitors"] - prev["visitors"]
        pct = round(change / prev["visitors"] * 100)
        up = change >= 0
        colour = "#1e7d3a" if up else "#c0392b"
        arrow = "▲" if up else "▼"
        sign = "+" if up else ""
        delta_html = (f'<div style="color:{colour};font-weight:800;font-size:13px;margin-top:4px;">'
                      f'{arrow} {sign}{change} ({sign}{pct}%) vs yesterday</div>')
        delta_txt = f" ({sign}{change}, {sign}{pct}% vs yesterday)"

    # 0 visitors on a day with hundreds of requests is not a quiet day: it is
    # the count breaking, as it did for two days in November 2026 when the
    # firewall went in front of the site. Say so instead of reporting a 0.
    warn_html, warn_txt = "", ""
    if stats["visitors"] == 0 and stats["totalRequests"] >= 200:
        warning = (f"0 visitors out of {stats['totalRequests']} requests is not a quiet day: "
                   "the count is probably broken. Has something new been put in front of the site?")
        warn_html = (f'<p style="background:#fdecea;color:#8a1f11;font-size:13px;font-weight:700;'
                     f'padding:10px 12px;border-radius:8px;margin:12px 0 0;">{warning}</p>')
        warn_txt = f"\n!! {warning}\n"

    def stat_card(num, label, extra=""):
        return (f'<td style="padding:14px 10px;background:#f4f6fb;border-radius:12px;text-align:center;" width="25%">'
                f'<div style="font-size:26px;font-weight:900;color:#0d1b3e;">{num}</div>'
                f'<div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#6c757d;font-weight:800;margin-top:2px;">{label}</div>'
                f'{extra}</td>')

    week_total = sum(d["visitors"] for d in days[:7])

    top_rows = "".join(
        f'<tr><td style="padding:7px 0;border-top:1px solid #eef1f7;font-size:13px;color:#2d3748;">{p["path"]}</td>'
        f'<td style="padding:7px 0;border-top:1px solid #eef1f7;font-size:13px;text-align:right;font-weight:800;color:#0d1b3e;">{p["views"]}</td></tr>'
        for p in stats["topPages"]
    ) or '<tr><td style="padding:10px 0;color:#6c757d;font-size:13px;">No page data yet.</td></tr>'

    country_rows = "".join(
        f'<tr><td style="padding:7px 0;border-top:1px solid #eef1f7;font-size:13px;color:#2d3748;">{c["country"]}</td>'
        f'<td style="padding:7px 0;border-top:1px solid #eef1f7;font-size:13px;text-align:right;font-weight:800;color:#0d1b3e;">{c["visitors"]}</td></tr>'
        for c in stats.get("countries", [])
    ) or '<tr><td style="padding:10px 0;color:#6c757d;font-size:13px;">No country data yet.</td></tr>'

    table = load_countries()
    if table:
        country_note_html = (
            "Each visitor&rsquo;s country is looked up in a table kept inside this report "
            f"(DB-IP&rsquo;s free country table of {table['release']}); no address is sent to anyone for it. "
            "Where the table has no answer, the CloudFront edge that served the visitor stands in, which is only approximate. "
            f'<a href="{COUNTRY_CREDIT[1]}" style="color:#8a93a6;">{COUNTRY_CREDIT[0]}</a>.'
        )
        country_note_txt = f"looked up in a table inside this report; {COUNTRY_CREDIT[0]}, {COUNTRY_CREDIT[1]}"
    else:
        country_note_html = (
            "Based on the CloudFront edge that served each visitor — a close approximation of their region, not a precise lookup. No IP is ever sent to a geolocation service. Visitors who come through the firewall are all served from Frankfurt, so their country is not known."
        )
        country_note_txt = "approx, from the serving CloudFront edge"

    if health and health["problems"]:
        health_html = (
            '<div style="background:#fdecea;border-left:4px solid #e63946;border-radius:8px;padding:12px 14px;margin-top:22px;">'
            '<div style="font-size:13px;font-weight:900;color:#a4161a;">\u26a0\ufe0f Daily short needs attention</div>'
            + "".join(f'<div style="font-size:12.5px;color:#6a1a1f;margin-top:5px;">{p}</div>'
                      for p in health["problems"])
            + '</div>'
        )
    elif health:
        health_html = (
            '<div style="background:#e8f5f1;border-left:4px solid #2a9d8f;border-radius:8px;padding:11px 14px;margin-top:22px;">'
            '<div style="font-size:13px;font-weight:800;color:#1d6f63;">\u2705 Daily short published</div></div>'
        )
    else:
        health_html = ""

    peak = max((d["visitors"] for d in days[:7]), default=1) or 1
    week_rows = "".join(
        f'<tr><td style="padding:6px 0;font-size:13px;color:#2d3748;">{d["date"]}</td>'
        f'<td style="padding:6px 0;width:55%;">'
        f'<div style="background:#eef1f7;border-radius:4px;height:8px;">'
        f'<div style="background:#c9a84c;height:8px;border-radius:4px;width:{round(d["visitors"]/peak*100)}%;"></div></div></td>'
        f'<td style="padding:6px 0;font-size:13px;text-align:right;font-weight:800;color:#0d1b3e;">{d["visitors"]}</td></tr>'
        for d in days[:7]
    )

    html = f"""<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6fb;padding:20px;">
  <div style="background:#0d1b3e;padding:24px;border-radius:14px 14px 0 0;text-align:center;">
    <div style="color:#e8c56a;font-size:20px;font-weight:900;">📊 Daily Traffic</div>
    <div style="color:#8fa0c4;font-size:13px;margin-top:4px;">Digital Safety Knights · {stats['date']}</div>
  </div>
  <div style="background:white;padding:22px;border-radius:0 0 14px 14px;">
    <table width="100%" cellspacing="8" cellpadding="0"><tr>
      {stat_card(stats['visitors'], 'Visitors', delta_html)}
      {stat_card(stats['pageViews'], 'Page views')}
      {stat_card(week_total, 'Last 7 days')}
      {stat_card(stats['botsFiltered'], 'Bots filtered')}
    </tr></table>
    {warn_html}

    <h3 style="color:#0d1b3e;font-size:14px;margin:24px 0 6px;">Top pages</h3>
    <table width="100%" cellspacing="0" cellpadding="0">{top_rows}</table>

    {health_html}

    <h3 style="color:#0d1b3e;font-size:14px;margin:24px 0 6px;">Where visitors came from</h3>
    <table width="100%" cellspacing="0" cellpadding="0">{country_rows}</table>
    <p style="color:#8a93a6;font-size:11px;margin:6px 0 0;">{country_note_html}</p>

    <h3 style="color:#0d1b3e;font-size:14px;margin:24px 0 6px;">Last 7 days</h3>
    <table width="100%" cellspacing="0" cellpadding="0">{week_rows}</table>

    <div style="text-align:center;margin-top:24px;">
      <a href="https://digitalsafetyknights.org/stats.html"
         style="background:#c9a84c;color:#0d1b3e;padding:11px 26px;border-radius:22px;
                text-decoration:none;font-weight:900;font-size:13px;">Open full dashboard →</a>
    </div>

    <p style="color:#8a93a6;font-size:11px;line-height:1.6;margin-top:22px;border-top:1px solid #eef1f7;padding-top:14px;">
      &ldquo;Visitors&rdquo; counts distinct IPs that requested a real page, with obvious bots filtered out.
      No cookies, no tracking scripts, no third party &mdash; this comes from CloudFront&rsquo;s own server
      logs. IPs are counted in memory and never stored; raw logs auto-delete after 7 days.
    </p>
  </div>
</div>"""

    text = (
        f"DSK traffic for {stats['date']}\n\n"
        f"Visitors:      {stats['visitors']}{delta_txt}\n"
        f"Page views:    {stats['pageViews']}\n"
        f"Last 7 days:   {week_total}\n"
        f"Bots filtered: {stats['botsFiltered']}\n{warn_txt}\n"
        + "\n".join(f"  {p['views']:>5}  {p['path']}" for p in stats["topPages"])
        + ("\n\nDAILY SHORT: " + ("OK, published" if health and not health["problems"]
             else "; ".join(health["problems"]) if health else "not checked"))
        + f"\n\nWhere visitors came from ({country_note_txt}):\n"
        + ("\n".join(f"  {c['visitors']:>5}  {c['country']}" for c in stats.get("countries", []))
           or "  no country data yet")
        + "\n\nDashboard: https://digitalsafetyknights.org/stats.html\n"
    )

    ses.send_email(
        Source="noreply@digitalsafetyknights.org",
        Destination={"ToAddresses": [ADMIN_EMAIL]},
        Message={
            "Subject": {"Data": f"📊 {stats['visitors']} visitors on {stats['date']} — DSK"},
            "Body": {"Html": {"Data": html}, "Text": {"Data": text}},
        },
    )


def handler(event, context):
    event = event or {}
    if event.get("date"):
        day = datetime.date.fromisoformat(event["date"])
    else:
        day = datetime.date.today() - datetime.timedelta(days=1)

    stats = aggregate(day)
    days = publish(stats)
    if not event.get("skipEmail"):
        send_email(stats, days, shorts_health(day))
    print(json.dumps(stats, indent=2))
    return stats


if __name__ == "__main__":
    print(json.dumps(handler({}, None), indent=2))
