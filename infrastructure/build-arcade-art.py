#!/usr/bin/env python3
"""Generate the arcade's character sprites and backgrounds.

The first Shieldy Dash drew its hero from rectangles, and Osman's verdict was
right: that does not pull a child in. The films already have real characters
(dsk-shorts/content/character-refs), so the games use the same ones, made by
the same model the film keyframes use, with those references attached so
Shieldy in a game is the Shieldy in the film.

Sprites are generated on a flat background and cut out afterwards; raw files
go to --raw so a cutout can be redone without paying for the image again.

    FAL_KEY=$(aws secretsmanager get-secret-value --secret-id dsk-shorts/fal-api-key \
        --query SecretString --output text) python3 infrastructure/build-arcade-art.py --raw /tmp/art
"""
import argparse, base64, concurrent.futures as cf, io, os, pathlib, sys
import requests
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
REFS = ROOT / "dsk-shorts" / "content" / "character-refs"
OUT = ROOT / "frontend" / "assets" / "arcade"
EDIT = "https://fal.run/fal-ai/nano-banana-pro/edit"
T2I = "https://fal.run/fal-ai/nano-banana-pro"
CUT = "https://fal.run/fal-ai/birefnet/v2"

STYLE = ("Same character as the reference image, identical design, colours and proportions. "
         "Stylised 3D animated film look, soft studio lighting. Full body visible head to toe, "
         "centred, nothing cropped. Plain flat pure white background, no floor, no shadow on "
         "the ground, no text, no other characters.")

SPRITES = {
    "shieldy-ready": ("shieldy", "The knight stands in a ready stance facing the viewer, knees slightly bent, "
                      "fists up, looking upwards with a determined confident smile."),
    "shieldy-shield": ("shieldy", "The knight braces and holds a large round glowing golden energy shield "
                       "raised high above his head with both arms, looking up, brave expression. The shield "
                       "is a bright translucent golden dome disc with a lightning bolt emblem."),
    "shieldy-oops": ("shieldy", "The knight stumbles backwards off balance, dizzy, eyes wide in surprise, "
                     "mouth open, arms flailing, three small yellow stars circling his helmet."),
    "shieldy-cheer": ("shieldy", "The knight jumps in the air celebrating with one fist punched high, huge "
                      "happy open smile, cape flying."),
    "glitch-laugh": ("glitch", "The purple creature leans forward laughing mischievously, pointing one "
                     "finger at the viewer, eyes squinted with glee, small purple pixel cubes flying off him."),
    "glitch-grr": ("glitch", "The purple creature stomps one foot, furious and frustrated, fists clenched, "
                   "teeth gritted, eyebrows down, small purple pixel cubes bursting off him."),
}
BACKGROUNDS = {
    "bg-castle-road": ("9:16", "Vertical game background, stylised 3D animated film look. A wide stone "
                       "road runs straight up the middle of the frame through a magical castle courtyard "
                       "at dusk toward a glowing blue archway portal in the far distance. Warm lanterns, "
                       "banners in navy and gold, deep blue sky with stars, soft glowing light, rich "
                       "colours, friendly and inviting for children. The centre of the road is empty. "
                       "No characters, no people, no text, no letters, no UI."),
}


def post(url, payload, key):
    r = requests.post(url, headers={"Authorization": f"Key {key}", "Content-Type": "application/json"},
                      json=payload, timeout=600)
    if not r.ok:
        raise RuntimeError(f"{r.status_code}: {r.text[:300]}")
    return r.json()


def data_uri(path):
    mime = "image/png" if path.suffix == ".png" else "image/jpeg"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def gen(name, key, raw):
    dst = raw / f"{name}.png"
    if dst.exists():
        return name, "cached"
    if name in SPRITES:
        ref, pose = SPRITES[name]
        res = post(EDIT, {"prompt": pose + " " + STYLE, "image_urls": [data_uri(REFS / f"{ref}.jpg")],
                          "aspect_ratio": "3:4", "resolution": "1K", "num_images": 1,
                          "output_format": "png"}, key)
    else:
        ar, prompt = BACKGROUNDS[name]
        res = post(T2I, {"prompt": prompt, "aspect_ratio": ar, "resolution": "1K",
                         "num_images": 1, "output_format": "png"}, key)
    dst.write_bytes(requests.get(res["images"][0]["url"], timeout=600).content)
    return name, "generated"


def cutout(name, key, raw):
    dst = raw / f"{name}.cut.png"
    if dst.exists():
        return
    res = post(CUT, {"image_url": data_uri(raw / f"{name}.png"), "output_format": "png"}, key)
    dst.write_bytes(requests.get(res["image"]["url"], timeout=600).content)


def finish_sprite(name, raw, height=560):
    im = Image.open(raw / f"{name}.cut.png").convert("RGBA")
    box = im.getchannel("A").point(lambda a: 255 if a > 12 else 0).getbbox()
    im = im.crop(box)
    im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / f"{name}.webp", "WEBP", quality=88, method=6)
    return im.size, (OUT / f"{name}.webp").stat().st_size


def finish_bg(name, raw, width=720):
    im = Image.open(raw / f"{name}.png").convert("RGB")
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / f"{name}.webp", "WEBP", quality=82, method=6)
    return im.size, (OUT / f"{name}.webp").stat().st_size


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--only", nargs="*")
    a = ap.parse_args()
    key = os.environ.get("FAL_KEY") or sys.exit("FAL_KEY not set")
    raw = pathlib.Path(a.raw); raw.mkdir(parents=True, exist_ok=True)
    names = a.only or list(SPRITES) + list(BACKGROUNDS)
    with cf.ThreadPoolExecutor(4) as ex:
        for name, how in ex.map(lambda n: gen(n, key, raw), names):
            print(f"  {name}: {how}")
    for n in names:
        if n in SPRITES:
            cutout(n, key, raw)
            print(f"  {n}: {finish_sprite(n, raw)}")
        else:
            print(f"  {n}: {finish_bg(n, raw)}")


if __name__ == "__main__":
    main()
