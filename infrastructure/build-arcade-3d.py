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
    # Knight City: an open city to walk and drive around. Cars, buildings, street things.
    "car-hero":   ("A shiny golden-yellow cartoon sports coupe with a navy blue racing stripe and a small round "
                   "shield emblem on the bonnet. Clean cartoon toy-car style, four wheels visible, no people inside, no text, no logos. " + PROP, 512, 0.2, 0.012),
    "car-sedan":  ("A sky-blue cartoon family sedan car. Clean cartoon toy-car style, four wheels visible, no people inside, no text, no logos. " + PROP, 512, 0.25, 0.01),
    "car-hatch":  ("A cherry-red small cartoon hatchback car. Clean cartoon toy-car style, four wheels visible, no people inside, no text, no logos. " + PROP, 512, 0.1, 0.02),
    "car-pickup": ("A mint-green cartoon pickup truck with an empty open bed. Clean cartoon toy-car style, four wheels visible, no people inside, no text, no logos. " + PROP, 512, 0.25, 0.01),
    "car-taxi":   ("An orange cartoon city taxi car with a small plain light box on the roof. Clean cartoon toy-car style, four wheels visible, no people inside, no text, no logos. " + PROP, 512, 0.25, 0.01),
    "car-bus":    ("A long teal and white cartoon city bus with many windows. Clean cartoon toy-car style, four wheels visible, no people inside, no text, no logos. " + PROP, 512, 0.25, 0.01),
    "car-van":    ("A dark purple cartoon delivery van with bright green zigzag glitch stripes on its sides "
                   "and tinted windows. Clean cartoon toy-car style, four wheels visible, no people inside, no text, no logos. " + PROP, 512, 0.25, 0.01),
    "car-glitch": ("A low sleek dark purple cartoon supercar with glowing green neon underglow and a big "
                   "rear wing. Clean cartoon toy-car style, four wheels visible, no people inside, no text, no logos. " + PROP, 512, 0.25, 0.01),
    "b-glass":    ("A tall modern glass skyscraper with teal mirrored windows and a white frame. Stylised cartoon city game building, whole building from ground to roof, no text, no signs with letters. " + PROP, 512, 0.2, 0.012),
    "b-deco":     ("A tall pastel pink and mint art deco beachfront hotel tower with rounded corners and "
                   "balconies. Stylised cartoon city game building, whole building from ground to roof, no text, no signs with letters. " + PROP, 512, 0.2, 0.012),
    "b-office":   ("A tall sandy-beige office tower with rows of blue windows and a flat roof with a water tank. Stylised cartoon city game building, whole building from ground to roof, no text, no signs with letters. " + PROP, 512, 0.2, 0.012),
    "b-apart":    ("A five-storey pastel yellow apartment block with white balconies and a flat roof. Stylised cartoon city game building, whole building from ground to roof, no text, no signs with letters. " + PROP, 512, 0.14, 0.03),
    "b-apart2":   ("A four-storey coral-orange apartment block with teal shutters and a roof garden. Stylised cartoon city game building, whole building from ground to roof, no text, no signs with letters. " + PROP, 512, 0.08, 0.06),
    "b-house":    ("A small white beach house with a turquoise roof, a porch and a little garden fence. Stylised cartoon city game building, whole building from ground to roof, no text, no signs with letters. " + PROP, 512, 0.08, 0.06),
    "b-house2":   ("A small pastel pink bungalow house with a terracotta tiled roof and a garage door. Stylised cartoon city game building, whole building from ground to roof, no text, no signs with letters. " + PROP, 512, 0.14, 0.03),
    "b-house3":   ("A two-storey lemon-yellow family house with a blue front door and a red roof. Stylised cartoon city game building, whole building from ground to roof, no text, no signs with letters. " + PROP, 512, 0.14, 0.03),
    "b-shop":     ("A one-storey corner shop with a big red and white striped awning and large display windows. Stylised cartoon city game building, whole building from ground to roof, no text, no signs with letters. " + PROP, 512, 0.1, 0.03),
    "b-cafe":     ("A small beach cafe with a mint-green roof, an open terrace with two parasols and round tables. Stylised cartoon city game building, whole building from ground to roof, no text, no signs with letters. " + PROP, 512, 0.12, 0.03),
    "b-arcade":   ("A fun two-storey game arcade building with glowing pink and blue neon tubes around the "
                   "roof and a giant joystick on top. Stylised cartoon city game building, whole building from ground to roof, no text, no signs with letters. " + PROP, 512, 0.18, 0.02),
    "b-library":  ("A grand white stone public library with four columns, wide steps and a green copper dome. Stylised cartoon city game building, whole building from ground to roof, no text, no signs with letters. " + PROP, 512, 0.12, 0.03),
    "b-school":   ("A friendly red brick school building with a clock tower with no numbers and a yellow door. Stylised cartoon city game building, whole building from ground to roof, no text, no signs with letters. " + PROP, 512, 0.08, 0.06),
    "b-hq":       ("A small golden and navy castle-shaped headquarters building with two round towers, a big "
                   "garage door and a large round shield emblem above it. Stylised cartoon city game building, whole building from ground to roof, no text, no signs with letters. " + PROP, 512, 0.1, 0.03),
    "palm":       ("A tall cartoon palm tree with a curved trunk and big green fronds. " + PROP, 512, 0.15, 0.02),
    "citytree":   ("A simple smooth low-poly cartoon street tree: one big round solid green canopy like a smooth ball of clay, "
                   "a short thick brown trunk, no separate leaves, toy style. " + PROP, 512, 0.25, 0.01),
    "streetlamp": ("A tall modern grey cartoon street lamp post with a curved arm and a glowing warm lamp. " + PROP, 512, 0.2, 0.01),
    "trafficlight": ("A cartoon traffic light on a dark pole with red, yellow and green lamps. " + PROP, 512, 0.2, 0.01),
    "bench":      ("A wooden cartoon park bench with dark iron legs. " + PROP, 256, 0.2, 0.01),
    "hydrant":    ("A bright red cartoon fire hydrant. " + PROP, 256, 0.15, 0.01),
    "ramp":       ("A wooden stunt jump ramp with orange and white chevron stripes on its sides, a simple wedge. " + PROP, 512, 0.15, 0.01),
    "kiosk":      ("A purple cartoon street kiosk booth with a big cracked glowing green screen with no text and "
                   "antennas on its roof, slightly sinister. " + PROP, 512, 0.25, 0.01),
    "drone":      ("A dark purple cartoon quadcopter drone with four rotors and one big glowing green eye. " + PROP, 512, 0.25, 0.01),
    "parasol":    ("A red and white striped cartoon beach parasol with a sun lounger under it. " + PROP, 512, 0.15, 0.015),
    "boat":       ("A small white and turquoise cartoon speedboat. " + PROP, 512, 0.2, 0.01),
    "citizen-a":  ("A friendly cartoon teenage girl with curly dark hair, a yellow hoodie, jeans and a backpack, "
                   "standing straight, arms relaxed, full body, 3D animated-film character. " + PROP, 512, 0.1, 0.01),
    "citizen-b":  ("A friendly cartoon boy with a red baseball cap, a green t-shirt, shorts and sneakers, "
                   "standing straight, arms relaxed, full body, 3D animated-film character. " + PROP, 512, 0.3),
    "citizen-c":  ("A friendly cartoon grandmother with grey hair in a bun, round glasses, a lilac cardigan and a "
                   "handbag, standing straight, full body, 3D animated-film character. " + PROP, 512, 0.3),
    "citizen-d":  ("A friendly cartoon man with a short beard, a blue postal worker uniform and a shoulder bag, "
                   "standing straight, arms relaxed, full body, 3D animated-film character. " + PROP, 512, 0.3),
    # Knight City's story: Nova's mum, the kids Glitch befriends, and the places the story goes.
    "citizen-e":  ("A kind cartoon woman in her forties with shoulder-length brown hair, a teal blazer and white trousers, standing straight, arms relaxed, full body, 3D animated-film character. " + PROP, 512, 0.25, 0.008),
    "citizen-f":  ("A cheerful cartoon girl about nine years old with two pigtails, a purple dress and yellow rain boots, standing straight, arms relaxed, full body, 3D animated-film character. " + PROP, 512, 0.25, 0.008),
    "citizen-g":  ("A shy cartoon boy about ten years old with round glasses, a blue hoodie and grey trousers, standing straight, arms relaxed, full body, 3D animated-film character. " + PROP, 512, 0.25, 0.008),
    "citizen-h":  ("A cool cartoon teenage boy with big orange headphones round his neck, a striped t-shirt and a skateboard under one arm, standing straight, arms relaxed, full body, 3D animated-film character. " + PROP, 512, 0.25, 0.008),
    "antenna":    ("A sinister dark purple cartoon radio relay mast with a satellite dish, blinking green lights and thick cables at its base. " + PROP, 512, 0.2, 0.01),
    "stage":      ("A small outdoor cartoon concert stage with a purple roof, two big speakers and coloured spotlights, empty, no people, no text. " + PROP, 512, 0.07, 0.04),
    "polaroid":   ("A single thick cartoon instant photo card with a white frame showing a simple picture of a little house and a tree, slightly tilted. " + PROP, 256, 0.2, 0.01),
    "lighthouse": ("A tall red and white striped cartoon lighthouse on a small rock base with a glowing lamp room. " + PROP, 512, 0.2, 0.012),
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
    "asphalt": "Seamless tileable texture, straight top-down view, of clean dark grey city asphalt with fine "
               "grain and a few faint cracks, no road markings, no lines, soft even lighting, stylised hand-painted game texture, no perspective, no shadows, no objects.",
    "pavers":  "Seamless tileable texture, straight top-down view, of light warm-grey square city pavement "
               "slabs with thin joints, soft even lighting, stylised hand-painted game texture, no perspective, no shadows, no objects.",
    "sand":    "Seamless tileable texture, straight top-down view, of pale golden beach sand with soft "
               "ripples and a few tiny shells, soft even lighting, stylised hand-painted game texture, no perspective, no shadows, no objects.",
    "water":   "Seamless tileable texture, straight top-down view, of bright turquoise tropical sea water "
               "with soft white caustic light ripples, soft even lighting, stylised hand-painted game texture, no perspective, no shadows, no objects.",
    "plaza":   "Seamless tileable texture, straight top-down view, of terracotta and cream checkered plaza "
               "tiles, soft even lighting, stylised hand-painted game texture, no perspective, no shadows, no objects.",
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
    with cf.ThreadPoolExecutor(8) as ex:
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
