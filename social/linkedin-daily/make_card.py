#!/usr/bin/env python3
"""Generates a 1080x1350 LinkedIn 'scenery' card: brand-gradient sky +
flat-design mountain silhouette, topic tag, bold headline, source line,
and the DSK logo/wordmark. Self-contained (bundled Roboto font + repo
logo) so it runs the same on macOS or a Linux cloud sandbox.

Usage:
  python3 make_card.py --style dawn|night|rise --tag "AI & Child Safety" \
      --headline "California just signed Adam's Law." --source "CBS News" \
      --out card.jpg
"""
import argparse
import os
import random

from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1350
FONT_BOLD = os.path.join(HERE, "fonts", "Roboto-Bold.ttf")
FONT_REG = os.path.join(HERE, "fonts", "Roboto-Regular.ttf")
LOGO_PATH = os.path.join(HERE, "..", "..", "frontend", "assets", "logo.png")

NAVY = (13, 27, 62)
NAVY2 = (26, 47, 110)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vertical_gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGB", size, top)
    px = img.load()
    for y in range(h):
        t = y / (h - 1)
        c = lerp(top, bottom, t)
        for x in range(0, w, 4):
            for dx in range(4):
                if x + dx < w:
                    px[x + dx, y] = c
    return img


def add_stars(img, count, area_top, area_bottom, seed):
    rnd = random.Random(seed)
    draw = ImageDraw.Draw(img, "RGBA")
    for _ in range(count):
        x = rnd.randint(0, W)
        y = rnd.randint(area_top, area_bottom)
        r = rnd.choice([1, 1, 1, 2])
        a = rnd.randint(60, 180)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))
    return img


def mountain_layer(img, base_y, amp, color, seed, points=7):
    rnd = random.Random(seed)
    w, h = img.size
    xs = [int(w * i / (points - 1)) for i in range(points)]
    ys = [base_y - rnd.randint(0, amp) for _ in range(points)]
    ys[0] = base_y - rnd.randint(0, amp // 3)
    ys[-1] = base_y - rnd.randint(0, amp // 3)
    poly = list(zip(xs, ys)) + [(w, h), (0, h)]
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.polygon(poly, fill=color)
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"), (0, 0))
    return img


def horizon_glow(img, cy, color, radius):
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.ellipse([W / 2 - radius, cy - radius, W / 2 + radius, cy + radius], fill=color)
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius / 2.2))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def wrap_text(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


STYLES = {
    "dawn": lambda: _dawn(),
    "night": lambda: _night(),
    "rise": lambda: _rise(),
}


def _dawn():
    img = vertical_gradient((W, H), NAVY, (74, 56, 40))
    img = horizon_glow(img, int(H * 0.62), (232, 197, 106, 130), 620)
    img = mountain_layer(img, int(H * 0.72), 90, (16, 30, 58, 235), seed=1)
    img = mountain_layer(img, int(H * 0.82), 70, (10, 20, 44, 255), seed=2)
    return img


def _night():
    img = vertical_gradient((W, H), (7, 13, 32), NAVY2)
    img = add_stars(img, 140, 0, int(H * 0.55), seed=7)
    img = horizon_glow(img, int(H * 0.78), (58, 90, 170, 90), 700)
    img = mountain_layer(img, int(H * 0.80), 60, (9, 16, 38, 255), seed=3)
    return img


def _rise():
    img = vertical_gradient((W, H), NAVY, (24, 70, 78))
    img = horizon_glow(img, int(H * 0.70), (120, 200, 190, 90), 650)
    img = mountain_layer(img, int(H * 0.66), 140, (14, 40, 50, 230), seed=4, points=9)
    img = mountain_layer(img, int(H * 0.80), 90, (9, 24, 32, 255), seed=5, points=9)
    return img


def compose(style, tag, headline, source, out):
    img = STYLES[style]()
    draw = ImageDraw.Draw(img, "RGBA")

    tag_font = ImageFont.truetype(FONT_BOLD, 30)
    tag_w = draw.textlength(tag.upper(), font=tag_font)
    pad_x, pad_y = 26, 14
    tag_y = 90
    draw.rounded_rectangle(
        [80, tag_y, 80 + tag_w + pad_x * 2, tag_y + 30 + pad_y * 2],
        radius=30, fill=(201, 168, 76, 230)
    )
    draw.text((80 + pad_x, tag_y + pad_y), tag.upper(), font=tag_font, fill=(13, 27, 62))

    head_font = ImageFont.truetype(FONT_BOLD, 74)
    lines = wrap_text(draw, headline, head_font, W - 160)
    ly = tag_y + 30 + pad_y * 2 + 50
    for line in lines:
        draw.text((80, ly), line, font=head_font, fill=(255, 255, 255))
        ly += 86

    src_font = ImageFont.truetype(FONT_REG, 34)
    draw.text((80, H - 190), f"Source: {source}", font=src_font, fill=(210, 218, 235))

    if os.path.exists(LOGO_PATH):
        logo = Image.open(LOGO_PATH).convert("RGBA")
        logo_h = 92
        logo_w = int(logo.width * logo_h / logo.height)
        logo = logo.resize((logo_w, logo_h))
        img.paste(logo, (80, H - 130), logo)
        brand_x = 80 + logo_w + 20
    else:
        brand_x = 80

    img_rgba = img.convert("RGBA")
    d2 = ImageDraw.Draw(img_rgba)
    brand_font = ImageFont.truetype(FONT_BOLD, 34)
    d2.text((brand_x, H - 118), "DIGITAL SAFETY KNIGHTS", font=brand_font, fill=(232, 197, 106))
    img = img_rgba.convert("RGB")

    img.save(out, quality=95)
    print("wrote", out)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--style", choices=list(STYLES.keys()), required=True)
    p.add_argument("--tag", required=True)
    p.add_argument("--headline", required=True)
    p.add_argument("--source", required=True)
    p.add_argument("--out", required=True)
    args = p.parse_args()
    compose(args.style, args.tag, args.headline, args.source, args.out)
