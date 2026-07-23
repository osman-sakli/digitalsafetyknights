"""Monthly automated news digest: 'This Month in Digital Safety'.

Runs on a daily cron for the last few days of each month (see Terraform) but
only does real work on the actual last day — comparing today to tomorrow's
date is a reliable way to detect month-end without depending on which month
it is. Scans English-language Google News RSS search results (no API key
needed) for a fixed set of child-digital-safety topics, dedupes, and
publishes a links-and-headlines digest page to the site. This is a
DIGEST — it aggregates and links third-party reporting, it never invents or
rewrites claims about specific incidents.
"""
import datetime
import html
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

import boto3

BUCKET = "digitalsafetyknights.org"
CLOUDFRONT_DISTRIBUTION_ID = "E1XP6H2UONLEBO"
SITE_URL = "https://digitalsafetyknights.org"

TOPICS = [
    ("Roblox child safety", "Roblox predator OR grooming OR child safety"),
    ("AI chatbot risks to children", "AI chatbot child safety OR AI grooming risk"),
    ("Sextortion & scams targeting minors", "sextortion minor OR child scam arrest"),
    ("Online grooming & arrests", "online grooming arrest child"),
    ("Deepfakes & child safety", "deepfake child safety OR AI generated child image"),
    ("Social media & child safety policy", "social media child safety lawsuit OR law"),
]
MAX_PER_TOPIC = 4
MAX_AGE_DAYS = 33

s3 = boto3.client("s3")
cloudfront = boto3.client("cloudfront")


def fetch_topic(query):
    url = "https://news.google.com/rss/search?q=" + urllib.parse.quote(
        f"{query} when:{MAX_AGE_DAYS}d"
    ) + "&hl=en-US&gl=US&ceid=US:en"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (DSK monthly digest bot)"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = resp.read()
    root = ET.fromstring(data)
    items = []
    for item in root.findall(".//item")[: MAX_PER_TOPIC * 3]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        source_el = item.find("source")
        source = source_el.text.strip() if source_el is not None and source_el.text else ""
        if title and link:
            items.append({"title": title, "link": link, "source": source, "pubDate": pub_date})
    return items[:MAX_PER_TOPIC]


def dedupe(all_sections):
    seen_titles = set()
    for section in all_sections:
        kept = []
        for item in section["items"]:
            key = re.sub(r"\W+", "", item["title"].lower())[:60]
            if key in seen_titles:
                continue
            seen_titles.add(key)
            kept.append(item)
        section["items"] = kept
    return all_sections


def render_html(month_label, sections):
    rows = []
    for section in sections:
        if not section["items"]:
            continue
        entries = "\n".join(
            f'<li><a href="{html.escape(i["link"])}" target="_blank">{html.escape(i["title"])}</a>'
            f'<span class="src"> — {html.escape(i["source"])}</span></li>'
            for i in section["items"]
        )
        rows.append(f'<h3>{html.escape(section["label"])}</h3><ul>{entries}</ul>')
    body = "\n".join(rows) or "<p>No new English-language coverage found this month for the tracked topics.</p>"

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>This Month in Digital Safety — {html.escape(month_label)}</title>
<style>
  body {{ margin:0; font-family: Arial, Helvetica, sans-serif; color:#232a3b; background:#F4F6FB; }}
  .header {{ background: linear-gradient(135deg,#16243F,#060e22); color:#fff; padding:44px 30px; text-align:center; }}
  .header h1 {{ margin:0 0 8px; font-size:26px; }}
  .header p {{ margin:0; color:#cdd6ea; font-size:13px; }}
  .content {{ max-width: 760px; margin: 0 auto; padding: 30px 24px 60px; background:#fff; }}
  h3 {{ color:#16243F; border-bottom: 2px solid #E2B248; padding-bottom:6px; margin-top:36px; }}
  ul {{ padding-left: 20px; }}
  li {{ margin-bottom: 10px; line-height:1.5; }}
  a {{ color:#16243F; font-weight:700; text-decoration:none; }}
  a:hover {{ text-decoration:underline; }}
  .src {{ color:#7a8fbb; font-weight:400; font-size:13px; }}
  .disclaimer {{ background:#FBF4E3; border-left:4px solid #E2B248; padding:14px 18px; font-size:13px; margin: 24px 0; border-radius:6px; }}
  .footer {{ text-align:center; padding:24px; color:#7a8fbb; font-size:12px; }}
  .back {{ display:inline-block; margin: 20px 0; color:#16243F; font-weight:700; }}
</style></head>
<body>
  <div class="header">
    <h1>🛡️ This Month in Digital Safety</h1>
    <p>{html.escape(month_label)} · Automated English-language news roundup</p>
  </div>
  <div class="content">
    <p><a class="back" href="/monthly-report/">← All monthly reports</a></p>
    <div class="disclaimer">
      This page is compiled automatically from public English-language news coverage
      of child digital-safety topics (Roblox, AI, grooming, sextortion, and related
      areas). It is a links digest, not DSK's own reporting or investigation — DSK
      does not independently verify third-party articles. Always read the original
      source before drawing conclusions, and if you or your family need help right
      now, see our <a href="/#emergency">Emergency Help</a> resources.
    </div>
    {body}
  </div>
  <div class="footer">⚔ Digital Safety Knights · {html.escape(month_label)} · digitalsafetyknights.org</div>
</body></html>"""


def update_index(month_key, month_label):
    key = "monthly-report/index.html"
    try:
        existing = s3.get_object(Bucket=BUCKET, Key=key)["Body"].read().decode()
        entries = re.findall(r'<li><a href="/monthly-report/([\d-]+)\.html">([^<]+)</a></li>', existing)
    except s3.exceptions.NoSuchKey:
        entries = []
    entries = [e for e in entries if e[0] != month_key]
    entries.insert(0, (month_key, month_label))
    items = "\n".join(f'<li><a href="/monthly-report/{k}.html">{l}</a></li>' for k, l in entries)
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Monthly Digital Safety Reports — DSK</title>
<style>
  body {{ font-family: Arial, Helvetica, sans-serif; background:#F4F6FB; color:#232a3b; margin:0; }}
  .header {{ background: linear-gradient(135deg,#16243F,#060e22); color:#fff; padding:44px 30px; text-align:center; }}
  .content {{ max-width:600px; margin:0 auto; padding:30px 24px 60px; }}
  li {{ margin-bottom: 10px; font-size:15px; }}
  a {{ color:#16243F; font-weight:700; text-decoration:none; }}
  a:hover {{ text-decoration:underline; }}
</style></head>
<body>
  <div class="header"><h1>🛡️ This Month in Digital Safety</h1><p>Monthly automated news roundups, archive</p></div>
  <div class="content"><ul>{items}</ul></div>
</body></html>"""
    s3.put_object(Bucket=BUCKET, Key=key, Body=page.encode(), ContentType="text/html", CacheControl="max-age=3600")


def handler(event, context):
    event = event or {}
    today = datetime.date.today()
    tomorrow = today + datetime.timedelta(days=1)
    if tomorrow.month == today.month and not event.get("force"):
        print(f"{today.isoformat()} is not the last day of the month — skipping.")
        return {"skipped": True, "date": today.isoformat()}

    month_label = today.strftime("%B %Y")
    month_key = today.strftime("%Y-%m")

    sections = []
    for label, query in TOPICS:
        try:
            items = fetch_topic(query)
        except Exception as e:  # noqa: BLE001 — one bad feed shouldn't kill the whole digest
            print(f"[warn] topic '{label}' failed: {e}")
            items = []
        sections.append({"label": label, "items": items})
    sections = dedupe(sections)

    page_html = render_html(month_label, sections)
    key = f"monthly-report/{month_key}.html"
    s3.put_object(Bucket=BUCKET, Key=key, Body=page_html.encode(), ContentType="text/html", CacheControl="max-age=3600")
    update_index(month_key, month_label)

    cloudfront.create_invalidation(
        DistributionId=CLOUDFRONT_DISTRIBUTION_ID,
        InvalidationBatch={
            "Paths": {"Quantity": 2, "Items": [f"/monthly-report/{month_key}.html", "/monthly-report/index.html"]},
            "CallerReference": f"monthly-report-{month_key}-{context.aws_request_id if context else 'local'}",
        },
    )

    total_links = sum(len(s["items"]) for s in sections)
    print(f"Published {key} with {total_links} links across {len(sections)} topics")
    return {"published": key, "totalLinks": total_links}


if __name__ == "__main__":
    print(json.dumps(handler({}, None), indent=2))
