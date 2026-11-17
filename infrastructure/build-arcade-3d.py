#!/usr/bin/env python3
"""Generate the 3D assets for the arcade's 3D games.

Osman asked for real games — "Roblox gibi, top oyunları gibi" — not flat
illustrations. The film characters already exist as images; this turns them
(and a few props) into textured 3D models with fal's TRELLIS image-to-3D,
then shrinks them for the web with gltf-transform: welded vertices, WebP
textures, capped texture size. Seamless ground and wall textures come from
the same image model the films use.

Raw downloads are cached under --raw, so re-running only pays for what is
missing.

    FAL_KEY=... python3 infrastructure/build-arcade-3d.py --raw /tmp/art3d
Requires node/npx (for @gltf-transform/cli).
"""
import argparse, base64, concurrent.futures as cf, os, pathlib, subprocess, sys
import requests
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
REFS = ROOT / "dsk-shorts" / "content" / "character-refs"
OUT = ROOT / "frontend" / "assets" / "arcade3d"
T2I = "https://fal.run/fal-ai/nano-banana-pro"
TO3D = "https://fal.run/fal-ai/trellis"

PROP = ("Single object only, centred, whole object visible, three-quarter view from slightly "
        "above. Stylised 3D animated-film game asset, bright saturated colours, soft studio "
        "light. Plain pure white background, no shadow, no ground, no text.")

# name -> (source, texture px, simplify ratio). source is a character ref file, or a prompt
# that is first rendered to an image.
MODELS = {
    "shieldy": ("ref:shieldy.jpg", 1024, 0.6),
    "glitch":  ("ref:glitch.jpg", 512, 0.4),
    "crate":   ("A sturdy wooden treasure crate with iron corner bands and a golden lock, cartoon "
                "castle style. " + PROP, 512, 0.15),
    "lantern": ("A tall black iron medieval lamp post with a glowing warm yellow lantern at the top "
                "and a small navy and gold pennant flag, cartoon castle style. " + PROP, 512, 0.4),
    "tower":   ("A small round stone castle tower with a pointed navy blue cone roof, a golden flag on "
                "top and two glowing warm windows, cartoon fairy-tale style. " + PROP, 512, 0.4),
    "coin":    ("A thick round gold coin with a raised shield emblem and a lightning bolt in the "
                "middle, shiny, cartoon game pickup. " + PROP, 256, 0.08),
    # Shield Toss: the friends who walk up to the gate (and whom Glitch disguises
    # himself as), Sprout cheering from the wall, and the shield Shieldy throws.
    "bot":     ("ref:bot.jpg", 512, 0.4),
    "pixel":   ("ref:pixel.jpg", 512, 0.4),
    "dame":    ("ref:dame-noble.jpg", 512, 0.4),
    "sprout":  ("ref:sprout.jpg", 512, 0.22),
    "shield":  ("A round golden knight's shield seen from the front, slightly angled, navy blue rim, "
                "a big white lightning bolt emblem in the middle, shiny, cartoon game item. " + PROP, 512, 0.2),
    # Shieldy Run: something that rolls across the lanes.
    "barrel":  ("A sturdy round wooden barrel lying on its side, dark iron hoops, cartoon castle "
                "style. " + PROP, 512, 0.2),
    # The Lost Sprout: each of the four yards is its own place. Garden, forest,
    # marsh, storm rocks — the scenery darkens as the trick on Sprout does.
    "fountain": ("A round two-tier stone garden fountain full of sparkling bright blue water, small "
                 "flowers around its base, cartoon fairy-tale style. " + PROP, 512, 0.12),
    "blossom":  ("A round cartoon cherry blossom tree with a thick brown trunk and a big fluffy pink "
                 "blossom canopy, fairy-tale style. " + PROP, 512, 0.07, 0.02),
    "flowers":  ("A low round flower bed bursting with red, yellow and purple tulips and white daisies "
                 "inside a ring of small grey stones, cartoon style. " + PROP, 512, 0.05, 0.02),
    "pine":     ("A tall dark green fairy-tale pine tree with thick layered branches and a short brown "
                 "trunk, cartoon style. " + PROP, 512, 0.07, 0.02),
    "mushroom": ("A cluster of three giant fairy-tale mushrooms with glowing teal-blue caps with pale "
                 "spots and thick cream stems, cartoon style. " + PROP, 512, 0.2),
    "deadtree": ("A crooked leafless old swamp tree with thick twisted grey branches, hanging green "
                 "moss and gnarled roots, cartoon spooky style. " + PROP, 512, 0.12, 0.02),
    "ruin":     ("A broken mossy ancient stone pillar ruin with fallen blocks at its base, cartoon "
                 "fairy-tale style. " + PROP, 512, 0.2),
    "crystal":  ("A cluster of sharp glowing purple and magenta crystals growing out of a dark rock "
                 "base, cartoon game style. " + PROP, 512, 0.2),
    "rock":     ("A big jagged dark slate boulder with sharp edges and thin cracks glowing faint "
                 "purple, cartoon game style. " + PROP, 512, 0.2),
}
TEXTURES = {
    "road":  "Seamless tileable texture, straight top-down view, of a fairy-tale castle cobblestone "
             "road: rounded grey and warm beige stones, moss in some cracks, soft even lighting, "
             "stylised hand-painted game texture, no perspective, no shadows, no objects.",
    "wall":  "Seamless tileable texture, flat front view, of a fairy-tale castle stone wall: large "
             "light grey-blue blocks with darker mortar, a little ivy, soft even lighting, stylised "
             "hand-painted game texture, no perspective, no windows, no objects.",
    "grass": "Seamless tileable texture, straight top-down view, of short lush green cartoon grass "
             "with tiny yellow flowers, soft even lighting, stylised hand-painted game texture.",
    "forest": "Seamless tileable texture, straight top-down view, of a dark fairy-tale forest floor: "
              "deep green moss, fallen brown leaves, tiny ferns, soft even lighting, stylised hand-painted game texture, no perspective, no shadows, no objects.",
    "marsh":  "Seamless tileable texture, straight top-down view, of murky swamp ground: dark teal "
              "shallow water, olive mud patches, a few small lily pads, soft even lighting, stylised hand-painted game texture, no perspective, no shadows, no objects.",
    "rock":   "Seamless tileable texture, straight top-down view, of dark cracked slate rock ground "
              "with thin faint purple glowing veins, soft even lighting, stylised hand-painted game texture, no perspective, no shadows, no objects.",
    "dirt":   "Seamless tileable texture, straight top-down view, of a packed earth forest footpath "
              "with small pebbles and thin roots, soft even lighting, stylised hand-painted game texture, no perspective, no shadows, no objects.",
    "planks": "Seamless tileable texture, straight top-down view, of an old weathered wooden boardwalk: "
              "horizontal grey-brown planks with nails and gaps, soft even lighting, stylised hand-painted game texture, no perspective, no shadows, no objects.",
    "slate":  "Seamless tileable texture, straight top-down view, of dark blue-grey flagstone paving "
              "with deep cracks, soft even lighting, stylised hand-painted game texture, no perspective, no shadows, no objects.",
}


def post(url, payload, key, timeout=900):
    r = requests.post(url, headers={"Authorization": f"Key {key}", "Content-Type": "application/json"},
                      json=payload, timeout=timeout)
    if not r.ok:
        raise RuntimeError(f"{url}: {r.status_code}: {r.text[:300]}")
    return r.json()


def uri(path):
    mime = "image/png" if path.suffix == ".png" else "image/jpeg"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def model(name, key, raw):
    src, px, ratio, *rest = MODELS[name]
    err = rest[0] if rest else 0.003   # foliage needs a looser bound before it will shed triangles
    glb = raw / f"{name}.glb"
    if not glb.exists():
        if src.startswith("ref:"):
            img = REFS / src[4:]
        else:
            img = raw / f"{name}-src.png"
            if not img.exists():
                res = post(T2I, {"prompt": src, "aspect_ratio": "1:1", "resolution": "1K",
                                 "num_images": 1, "output_format": "png"}, key)
                img.write_bytes(requests.get(res["images"][0]["url"], timeout=600).content)
        res = post(TO3D, {"image_url": uri(img)}, key)
        glb.write_bytes(requests.get(res["model_mesh"]["url"], timeout=600).content)
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"{name}.glb"
    tmp1, tmp2, tmp3 = raw / f"{name}.w.glb", raw / f"{name}.p.glb", raw / f"{name}.r.glb"
    npx = ["npx", "--yes", "@gltf-transform/cli@4"]
    for cmd in ([*npx, "weld", str(glb), str(tmp1)],
                [*npx, "webp", str(tmp1), str(tmp2), "--quality", "82"],
                [*npx, "resize", str(tmp2), str(tmp3), "--width", str(px), "--height", str(px)],
                # TRELLIS meshes are dense; a coin does not need 30k triangles.
                [*npx, "simplify", str(tmp3), str(out), "--ratio", str(ratio), "--error", str(err)]):
        subprocess.run(cmd, check=True, capture_output=True)
    return name, out.stat().st_size


def texture(name, key, raw, px=512):
    png = raw / f"tex-{name}.png"
    if not png.exists():
        res = post(T2I, {"prompt": TEXTURES[name], "aspect_ratio": "1:1", "resolution": "1K",
                         "num_images": 1, "output_format": "png"}, key)
        png.write_bytes(requests.get(res["images"][0]["url"], timeout=600).content)
    OUT.mkdir(parents=True, exist_ok=True)
    im = Image.open(png).convert("RGB").resize((px, px), Image.LANCZOS)
    out = OUT / f"tex-{name}.webp"
    im.save(out, "WEBP", quality=82, method=6)
    return f"tex-{name}", out.stat().st_size


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--only", nargs="*")
    a = ap.parse_args()
    key = os.environ.get("FAL_KEY") or sys.exit("FAL_KEY not set")
    raw = pathlib.Path(a.raw); raw.mkdir(parents=True, exist_ok=True)
    want = a.only or list(MODELS) + [f"tex-{t}" for t in TEXTURES]
    jobs = []
    with cf.ThreadPoolExecutor(5) as ex:
        for n in want:
            if n.startswith("tex-"):
                jobs.append(ex.submit(texture, n[4:], key, raw))
            else:
                jobs.append(ex.submit(model, n, key, raw))
        for j in cf.as_completed(jobs):
            n, size = j.result()
            print(f"  {n:10} {size // 1024} KB")


if __name__ == "__main__":
    main()
