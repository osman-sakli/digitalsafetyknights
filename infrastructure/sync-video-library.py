"""Publish the daily shorts to the website as a self-hosted video library.

The shorts already go to YouTube, TikTok, Instagram and Facebook, but the
site itself never showed a single one — a video a day was being produced
and none of it was visible to anyone who actually visited.

They are copied into the site bucket and played with a plain <video> tag
rather than embedded from YouTube. An embed would load third-party player
code and set cookies, and the homepage promises "no ads, no tracking, no
data collected from kids"; keeping the files on our own origin is what
makes that promise remain true.

Usage:  python3 infrastructure/sync-video-library.py [--dry-run]
"""
import argparse
import json
import pathlib
import sys

import boto3

SHORTS_BUCKET = "dsk-shorts-out-339712706640"
SITE_BUCKET = "digitalsafetyknights.org"
VIDEO_PREFIX = "videos/"
MANIFEST_KEY = "content/video-library.json"
SCRIPTS = pathlib.Path(__file__).resolve().parents[1] / "dsk-shorts/content/ai-scripts.json"

s3 = boto3.client("s3")


def titles_by_id():
    """{scriptId: {en, es, fr, tr}} — the shorts are listed on every
    language mirror, and a title that only exists in English leaves those
    pages reading half-translated. script_writer.py requires all three
    translations on every new script; older ones were backfilled."""
    try:
        out = {}
        for x in json.loads(SCRIPTS.read_text()):
            out[x["id"]] = {
                "en": x["title"],
                "es": x.get("title_es") or "",
                "fr": x.get("title_fr") or "",
                "tr": x.get("title_tr") or "",
            }
        return out
    except Exception:
        return {}


def list_shorts():
    """Returns {scriptId: {date, mp4_key, poster_key}} keeping the newest
    copy of any script that was rendered more than once."""
    found = {}
    token = None
    while True:
        kw = {"Bucket": SHORTS_BUCKET}
        if token:
            kw["ContinuationToken"] = token
        resp = s3.list_objects_v2(**kw)
        for obj in resp.get("Contents", []):
            key = obj["Key"]
            if not key.endswith(".mp4"):
                continue
            date, _, name = key.partition("/")
            script_id = name[:-4]
            prev = found.get(script_id)
            if prev and prev["date"] >= date:
                continue
            found[script_id] = {
                "date": date,
                "mp4_key": key,
                "poster_key": key[:-4] + ".jpg",
                "size": obj["Size"],
            }
        if not resp.get("IsTruncated"):
            break
        token = resp.get("NextContinuationToken")
    return found


def poster_exists(key):
    try:
        s3.head_object(Bucket=SHORTS_BUCKET, Key=key)
        return True
    except Exception:
        return False


def main(dry_run):
    titles = titles_by_id()
    shorts = list_shorts()
    print(f"{len(shorts)} distinct shorts in {SHORTS_BUCKET}")

    items = []
    copied = 0
    for script_id, info in sorted(shorts.items(), key=lambda kv: kv[1]["date"], reverse=True):
        dest_mp4 = f"{VIDEO_PREFIX}{script_id}.mp4"
        dest_jpg = f"{VIDEO_PREFIX}{script_id}.jpg"
        has_poster = poster_exists(info["poster_key"])

        if not dry_run:
            # Only copy what is missing, so re-running is cheap.
            try:
                s3.head_object(Bucket=SITE_BUCKET, Key=dest_mp4)
            except Exception:
                s3.copy_object(
                    Bucket=SITE_BUCKET, Key=dest_mp4,
                    CopySource={"Bucket": SHORTS_BUCKET, "Key": info["mp4_key"]},
                    ContentType="video/mp4", CacheControl="public,max-age=31536000",
                    MetadataDirective="REPLACE",
                )
                copied += 1
            if has_poster:
                try:
                    s3.head_object(Bucket=SITE_BUCKET, Key=dest_jpg)
                except Exception:
                    s3.copy_object(
                        Bucket=SITE_BUCKET, Key=dest_jpg,
                        CopySource={"Bucket": SHORTS_BUCKET, "Key": info["poster_key"]},
                        ContentType="image/jpeg", CacheControl="public,max-age=31536000",
                        MetadataDirective="REPLACE",
                    )

        t = titles.get(script_id) or {"en": script_id.replace("-", " ")}
        item = {
            "id": script_id,
            "title": t.get("en") or script_id.replace("-", " "),
            "date": info["date"],
            "src": "/" + dest_mp4,
            "poster": "/" + dest_jpg if has_poster else None,
        }
        # Omitted rather than written empty, so the page's fallback to
        # English is a missing key instead of a blank caption.
        for lang in ("es", "fr", "tr"):
            if t.get(lang):
                item["title_" + lang] = t[lang]
        items.append(item)

    # topics.html also lists shorts that have no video yet ("coming soon"
    # cards), and those have no entry in items[] to carry a translation.
    # So the manifest publishes the full title map from ai-scripts.json,
    # not just the rendered subset — that keeps ai-scripts.json the one
    # place a short's title is written in any language.
    manifest = {
        "count": len(items),
        "items": items,
        "titles": {k: v for k, v in titles.items()
                   if v.get("es") or v.get("fr") or v.get("tr")},
    }
    untranslated = [i["id"] for i in items
                    if any("title_" + l not in i for l in ("es", "fr", "tr"))]
    if untranslated:
        print(f"WARNING: {len(untranslated)} short(s) are missing a translated title: "
              f"{', '.join(untranslated[:5])}{' …' if len(untranslated) > 5 else ''}")
    if dry_run:
        print(json.dumps(manifest, indent=2)[:900])
        print(f"\n[dry-run] would copy up to {len(items)} videos")
        return

    s3.put_object(
        Bucket=SITE_BUCKET, Key=MANIFEST_KEY,
        Body=json.dumps(manifest, ensure_ascii=False, indent=2).encode(),
        ContentType="application/json", CacheControl="no-cache",
    )
    print(f"copied {copied} new videos; manifest lists {len(items)}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    main(ap.parse_args().dry_run)
