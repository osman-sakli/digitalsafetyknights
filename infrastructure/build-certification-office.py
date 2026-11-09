#!/usr/bin/env python3
"""Generate the certification programme as real PowerPoint and Word files.

Osman asked for .pptx slides and .docx documents, not HTML. Everything is
built from content/certification/*.json, so the Office files and the website
never drift apart — rerun this after editing a track.

Per track: two .pptx decks (one per session, presenter notes in PowerPoint's
own notes pane), a facilitator guide .docx, a student exam .docx with no
answers in it, and a separate answer key .docx.

    python3 build_office.py
"""
import json
import pathlib
import shutil

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Emu, Inches, Pt

import docx
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches as DInches, Pt as DPt, RGBColor as DColor

SRC = pathlib.Path("/Users/osmansakli/digitalsafetyknights/frontend/content/certification")
# Osman keeps everything DSK under one Desktop folder and asked for the pack
# to live there rather than loose on the Desktop. Names are English because
# the pack gets shared with English-speaking schools; the one Turkish file is
# the internal how-to, named so it is obvious it is not for sharing.
DEST = pathlib.Path("/Users/osmansakli/Desktop/DIGITAL SAFETY KNIGHTS-ALL/DSK Certification Programme")
ORDER = ["squire", "knight", "sentinel", "guardian"]

NAVY = RGBColor(0x0D, 0x1B, 0x3E)
NAVY2 = RGBColor(0x1A, 0x2F, 0x6E)
GOLD = RGBColor(0xC9, 0xA8, 0x4C)
GOLD2 = RGBColor(0xE8, 0xC5, 0x6A)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BODY = RGBColor(0xE3, 0xE9, 0xF6)
MUTED = RGBColor(0xB9, 0xC6, 0xE2)
TEAL = RGBColor(0x3E, 0xC6, 0xC0)
TEALT = RGBColor(0x8F, 0xE6, 0xE2)
DANGER = RGBColor(0xE6, 0x39, 0x46)
SUCCESS = RGBColor(0x2A, 0x9D, 0x8F)

HEAD_FONT = "Trebuchet MS"
BODY_FONT = "Trebuchet MS"

W, H = Inches(13.333), Inches(7.5)
MARGIN = Inches(0.85)
CONTENT_W = W - 2 * MARGIN

# Bullet glyph and its colour, per slide kind
GLYPH = {
    "rules": ("▸", TEAL),
    "scenario": ("✕", DANGER),
    "recap": ("✚", SUCCESS),
}
DEFAULT_GLYPH = ("◆", GOLD)

# The site's Turkish rank names. Used only by the internal Turkish notes —
# the shared English documents must not carry them, which is what put
# "Squire (Yaver)" into a pack bound for an American school.
TR = {
    "squire": "Yaver", "knight": "Şövalye",
    "sentinel": "Nöbetçi", "guardian": "Muhafız",
}


# ───────────────────────────── PowerPoint ─────────────────────────────
def textbox(slide, left, top, width, height, anchor=MSO_ANCHOR.TOP):
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    return tf


def style(p, text, size, color, bold=True, font=BODY_FONT, space_after=0,
          align=PP_ALIGN.LEFT, line=None, italic=False):
    p.text = text
    p.alignment = align
    p.space_after = Pt(space_after)
    if line:
        p.line_spacing = line
    r = p.runs[0]
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.italic = italic
    r.font.color.rgb = color
    r.font.name = font
    return p


def band(slide, top, height, fill, line=None, line_w=Pt(0)):
    """A filled rectangle, used for the callout and 'ask the room' blocks."""
    from pptx.enum.shapes import MSO_SHAPE
    sh = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, MARGIN, top, CONTENT_W, height)
    sh.adjustments[0] = 0.06
    sh.fill.solid()
    sh.fill.fore_color.rgb = fill
    if line:
        sh.line.color.rgb = line
        sh.line.width = line_w or Pt(2.5)
    else:
        sh.line.fill.background()
    sh.shadow.inherit = False
    sh.text_frame.word_wrap = True
    sh.text_frame.margin_left = sh.text_frame.margin_right = Inches(0.26)
    sh.text_frame.margin_top = sh.text_frame.margin_bottom = Inches(0.14)
    sh.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    return sh


def title_size(text, big=False):
    n = len(text or "")
    if big:
        return 60 if n <= 26 else 50 if n <= 44 else 40
    return 40 if n <= 34 else 34 if n <= 58 else 29 if n <= 88 else 25


#   Everything below works in points, because that is the unit the font sizes
#   are in. Trebuchet averages a shade over half the point size per character,
#   so a box 838pt wide less the bullet indent fits about 1624/size characters
#   on a line. The estimate only has to be close: it decides the font size, and
#   erring small costs a little elegance where erring large runs text off the
#   bottom of the slide — which is what the first build did on three of the
#   Guardian slides.
BOX_PT = 838.0          # CONTENT_W in points
BULLET_INDENT_PT = 26.0


def wrapped_lines(text, size, width_pt=BOX_PT - BULLET_INDENT_PT):
    cpl = max(18, int(width_pt * 2 / size))
    return max(1, -(-len(text) // cpl))


def block_pt(text, size, pad=28.0, width_pt=BOX_PT - 38):
    """Height of a callout/ask box at a given size, in points."""
    return wrapped_lines(text, size, width_pt) * size * 1.25 + pad


def fit_bullets(bullets, avail_pt, max_size=23, min_size=12):
    """Largest font size at which the bullets still fit the space left."""
    for size in range(max_size, min_size - 1, -1):
        gap = 13.0 if size >= 18 else 10.0 if size >= 15 else 8.0
        lines = sum(wrapped_lines(b, size) for b in bullets)
        h = lines * size * 1.22 + len(bullets) * gap
        if h <= avail_pt:
            return size, gap, h
    gap = 8.0
    lines = sum(wrapped_lines(b, min_size) for b in bullets)
    return min_size, gap, lines * min_size * 1.22 + len(bullets) * gap


def add_slide(prs, s, track_label, idx, total):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = RGBColor(0x07, 0x0E, 0x24)

    kind = s.get("kind", "teach")
    centred = kind in ("title", "section", "stat")
    align = PP_ALIGN.CENTER if centred else PP_ALIGN.LEFT

    y = Inches(0.62)

    if s.get("eyebrow"):
        tf = textbox(slide, MARGIN, y, CONTENT_W, Inches(0.38))
        colour = TEALT if kind == "activity" else GOLD
        style(tf.paragraphs[0], s["eyebrow"].upper(), 13, colour, align=align)
        y += Inches(0.52)

    # Title (or the big number on a stat slide)
    if kind == "stat":
        tf = textbox(slide, MARGIN, y + Inches(0.5), CONTENT_W, Inches(2.1))
        style(tf.paragraphs[0], s.get("title", ""), 96, GOLD2, align=PP_ALIGN.CENTER, line=0.95)
        y += Inches(2.8)
    elif s.get("title"):
        size = title_size(s["title"], big=(kind == "section"))
        colour = GOLD2 if kind == "section" else SUCCESS if kind == "recap" else WHITE
        lines = max(1, len(s["title"]) // 42 + 1)
        h = Inches(0.52) * lines * (1.45 if size >= 50 else 1.15)
        if centred:
            y += Inches(0.9) if kind != "stat" else Inches(0)
        tf = textbox(slide, MARGIN, y, CONTENT_W, h)
        style(tf.paragraphs[0], s["title"], size, colour, align=align, line=1.1)
        y += h + Inches(0.18)

    if s.get("subtitle"):
        w = Inches(9.2) if centred else CONTENT_W
        left = MARGIN + (CONTENT_W - w) / 2 if centred else MARGIN
        tf = textbox(slide, left, y, w, Inches(1.2))
        style(tf.paragraphs[0], s["subtitle"], 21 if centred else 19, MUTED,
              bold=False, align=align, line=1.3)
        y += Inches(0.42) * max(1, len(s["subtitle"]) // 72 + 1) + Inches(0.22)

    bullets = s.get("bullets") or []

    # Space the bullets cannot have: the footer, a source line if there is one,
    # the "ask the room" box, and the callout. Size the bullets against what is
    # genuinely left rather than hoping.
    footer_pt = 46.0
    source_pt = 26.0 if s.get("source") else 0.0
    ask_size = 19
    ask_pt = block_pt(s["ask"], ask_size) + 19 if s.get("ask") else 0.0
    callout_size = 19 if not bullets or len(bullets) < 5 else 17
    callout_pt = block_pt(s["callout"], callout_size) + 15 if s.get("callout") else 0.0

    if s.get("ask"):
        sh = band(slide, y, Pt(ask_pt - 19), RGBColor(0x14, 0x3A, 0x3C), TEAL)
        style(sh.text_frame.paragraphs[0], s["ask"], ask_size, TEALT, line=1.25)
        y += Pt(ask_pt)

    if bullets:
        gl, gc = GLYPH.get(kind, DEFAULT_GLYPH)
        avail = Emu(H - y).pt - footer_pt - source_pt - callout_pt - 10
        size, gap, used = fit_bullets(bullets, avail)
        tf = textbox(slide, MARGIN, y, CONTENT_W, Pt(used + 6))
        for n, b in enumerate(bullets):
            p = tf.paragraphs[0] if n == 0 else tf.add_paragraph()
            p.alignment = PP_ALIGN.LEFT
            p.space_after = Pt(gap)
            p.line_spacing = 1.22
            g = p.add_run()
            g.text = gl + "   "
            g.font.size = Pt(size * 0.8)
            g.font.bold = True
            g.font.color.rgb = gc
            g.font.name = BODY_FONT
            t = p.add_run()
            t.text = b
            t.font.size = Pt(size)
            t.font.bold = False
            t.font.color.rgb = BODY
            t.font.name = BODY_FONT
        y += Pt(used + 14)

    if s.get("callout"):
        h = Pt(callout_pt - 15)
        # sit it under the bullets, or pin it above the footer, whichever is lower
        top = max(y, H - Pt(footer_pt) - h) if not bullets \
            else min(y, H - Pt(footer_pt) - h)
        sh = band(slide, top, h, RGBColor(0x30, 0x27, 0x10), GOLD)
        style(sh.text_frame.paragraphs[0], s["callout"], callout_size, GOLD2, line=1.25)
        y = top + h + Inches(0.14)

    if s.get("source"):
        tf = textbox(slide, MARGIN, H - Inches(0.92), CONTENT_W, Inches(0.34))
        style(tf.paragraphs[0], "Source: " + s["source"], 12,
              RGBColor(0x7F, 0x91, 0xB4), bold=False, italic=True, align=align)

    # footer: track + slide number
    tf = textbox(slide, MARGIN, H - Inches(0.52), CONTENT_W, Inches(0.3))
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = f"Digital Safety Knights  ·  {track_label}"
    r.font.size = Pt(10)
    r.font.bold = True
    r.font.color.rgb = RGBColor(0x55, 0x66, 0x88)
    r.font.name = BODY_FONT
    tf2 = textbox(slide, MARGIN, H - Inches(0.52), CONTENT_W, Inches(0.3))
    style(tf2.paragraphs[0], f"{idx} / {total}", 10, RGBColor(0x55, 0x66, 0x88),
          align=PP_ALIGN.RIGHT)

    # the facilitator note goes where PowerPoint expects it
    if s.get("notes"):
        slide.notes_slide.notes_text_frame.text = s["notes"]
    return slide


def build_deck(d, sess, out):
    prs = Presentation()
    prs.slide_width, prs.slide_height = W, H
    label = f"{d['track']} · Session {sess['n']}"
    slides = sess.get("slides", [])
    for i, s in enumerate(slides, 1):
        add_slide(prs, s, label, i, len(slides))

    core = prs.core_properties
    core.title = f"{d['track']} — Session {sess['n']}: {sess['title']}"
    core.author = "Digital Safety Knights"
    core.subject = f"Digital safety certification, ages {d['ages']}"
    core.comments = sess.get("goal", "")
    prs.save(str(out))
    return len(slides)


# ─────────────────────────────── Word ───────────────────────────────
def shade(el, hexfill):
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear")
    sh.set(qn("w:color"), "auto")
    sh.set(qn("w:fill"), hexfill)
    el.get_or_add_pPr().append(sh)


def left_bar(p, hexcolor):
    pPr = p._p.get_or_add_pPr()
    bdr = OxmlElement("w:pBdr")
    l = OxmlElement("w:left")
    l.set(qn("w:val"), "single")
    l.set(qn("w:sz"), "18")
    l.set(qn("w:space"), "8")
    l.set(qn("w:color"), hexcolor)
    bdr.append(l)
    pPr.append(bdr)


def para(doc, text, size=10.5, bold=False, italic=False, color=None,
         space_before=0, space_after=6, font=BODY_FONT, align=None,
         indent=None, fill=None, bar=None):
    p = doc.add_paragraph()
    if align is not None:
        p.alignment = align
    pf = p.paragraph_format
    pf.space_before = DPt(space_before)
    pf.space_after = DPt(space_after)
    if indent:
        pf.left_indent = DInches(indent)
    if fill:
        shade(p._p, fill)
    if bar:
        left_bar(p, bar)
    r = p.add_run(text)
    r.font.size = DPt(size)
    r.bold = bold
    r.italic = italic
    r.font.name = font
    if color:
        r.font.color.rgb = color
    return p


def rich(doc, lead, rest, size=10.5, fill=None, bar=None, indent=None,
         space_before=0, space_after=6):
    """A paragraph whose first words are bold — 'Facilitator note. ...'"""
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before = DPt(space_before)
    pf.space_after = DPt(space_after)
    if indent:
        pf.left_indent = DInches(indent)
    if fill:
        shade(p._p, fill)
    if bar:
        left_bar(p, bar)
    a = p.add_run(lead)
    a.bold = True
    a.font.size = DPt(size)
    a.font.name = BODY_FONT
    a.font.color.rgb = DColor(0x0D, 0x1B, 0x3E)
    b = p.add_run(rest)
    b.font.size = DPt(size)
    b.font.name = BODY_FONT
    return p


def heading(doc, text, size=15, color=DColor(0x0D, 0x1B, 0x3E), before=16, after=6,
            page_break=False):
    if page_break:
        doc.add_page_break()
    return para(doc, text, size=size, bold=True, color=color, font=HEAD_FONT,
                space_before=before, space_after=after)


def eyebrow(doc, text):
    return para(doc, text.upper(), size=8.5, bold=True,
                color=DColor(0xA8, 0x8A, 0x2E), font=HEAD_FONT, space_after=2)


def bullets(doc, items, size=10.5, indent=0.3):
    for b in items:
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.left_indent = DInches(indent)
        p.paragraph_format.space_after = DPt(3)
        r = p.add_run(b)
        r.font.size = DPt(size)
        r.font.name = BODY_FONT


def new_doc(title, subtitle, meta, warn=None):
    doc = docx.Document()
    for sec in doc.sections:
        sec.top_margin = sec.bottom_margin = DInches(0.7)
        sec.left_margin = sec.right_margin = DInches(0.85)
    st = doc.styles["Normal"]
    st.font.name = BODY_FONT
    st.font.size = DPt(10.5)

    para(doc, "DIGITAL SAFETY KNIGHTS", size=9, bold=True,
         color=DColor(0xC9, 0xA8, 0x4C), font=HEAD_FONT, space_after=2)
    para(doc, title, size=21, bold=True, color=DColor(0x0D, 0x1B, 0x3E),
         font=HEAD_FONT, space_after=3)
    if subtitle:
        para(doc, subtitle, size=12, color=DColor(0x46, 0x53, 0x6C), space_after=6)
    if meta:
        para(doc, meta, size=9.5, bold=True, color=DColor(0x6C, 0x75, 0x7D), space_after=10)
    if warn:
        rich(doc, "⚠  ", warn, size=10, fill="FDEEF0", bar="E63946", space_after=12)
    return doc


def run_sheet_table(doc, sess):
    t = doc.add_table(rows=1, cols=3)
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.LEFT
    hdr = t.rows[0].cells
    for c, txt, w in zip(hdr, ("Minutes", "Segment", "Slides"), (1.1, 4.6, 1.1)):
        c.width = DInches(w)
        shade(c.paragraphs[0]._p, "0D1B3E")
        r = c.paragraphs[0].add_run(txt)
        r.bold = True
        r.font.size = DPt(8.5)
        r.font.name = HEAD_FONT
        r.font.color.rgb = DColor(0xFF, 0xFF, 0xFF)
    for sg in sess.get("segments", []):
        cells = t.add_row().cells
        for c, txt, w, bold in zip(
            cells,
            (sg["minutes"], sg["label"], ", ".join(str(i) for i in sg.get("slides", []))),
            (1.1, 4.6, 1.1), (True, False, False),
        ):
            c.width = DInches(w)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = DPt(2)
            r = p.add_run(str(txt))
            r.bold = bold
            r.font.size = DPt(9.5)
            r.font.name = BODY_FONT
    para(doc, "", size=6, space_after=4)


def guide_doc(d, out):
    f = d.get("format", {})
    doc = new_doc(
        f"{d['track']} Track — Facilitator Guide",
        d.get("tagline", ""),
        f"Ages {d['ages']} · {d.get('level','')} · {f.get('sessions')} × "
        f"{f.get('minutesEach')} minutes · exam: {f.get('examQuestions')} questions, "
        f"{f.get('passMark')}% to pass",
        warn="Facilitator copy. The answer key is a separate file — do not hand this one to students.",
    )

    heading(doc, "Learning outcomes", before=10)
    para(doc, "By the end of the programme a participant can:", size=10,
         color=DColor(0x6C, 0x75, 0x7D), space_after=4)
    for n, o in enumerate(d.get("outcomes", []), 1):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = DInches(0.3)
        p.paragraph_format.space_after = DPt(3)
        a = p.add_run(f"{n}.  ")
        a.bold = True
        a.font.size = DPt(10.5)
        a.font.name = BODY_FONT
        b = p.add_run(o)
        b.font.size = DPt(10.5)
        b.font.name = BODY_FONT

    if d.get("prerequisites"):
        rich(doc, "Prerequisites.  ", d["prerequisites"], space_before=8)
    if d.get("materials"):
        para(doc, "What you need", size=11, bold=True, font=HEAD_FONT,
             space_before=8, space_after=3)
        bullets(doc, d["materials"], size=10)

    for sess in d.get("sessions", []):
        heading(doc, f"Session {sess['n']} — {sess['title']}", size=16, page_break=True)
        if sess.get("subtitle"):
            para(doc, sess["subtitle"], size=10.5, italic=True,
                 color=DColor(0x6C, 0x75, 0x7D), space_after=6)
        if sess.get("goal"):
            rich(doc, "Goal.  ", sess["goal"], fill="F4F6FB", bar="C9A84C", space_after=10)
        run_sheet_table(doc, sess)

        slides = sess.get("slides", [])
        for i, s in enumerate(slides, 1):
            para(doc, f"SLIDE {i} OF {len(slides)}  ·  {s.get('kind','teach').upper()}",
                 size=8.5, bold=True, color=DColor(0x1A, 0x2F, 0x6E),
                 font=HEAD_FONT, space_before=12, space_after=2)
            if s.get("eyebrow"):
                eyebrow(doc, s["eyebrow"])
            if s.get("title"):
                para(doc, s["title"], size=13, bold=True,
                     color=DColor(0x0D, 0x1B, 0x3E), font=HEAD_FONT, space_after=2)
            if s.get("subtitle"):
                para(doc, s["subtitle"], size=10.5, color=DColor(0x46, 0x53, 0x6C),
                     space_after=4)
            if s.get("ask"):
                rich(doc, "Ask the room.  ", s["ask"], size=10,
                     fill="E8F9F8", bar="3EC6C0", space_after=5)
            if s.get("bullets"):
                bullets(doc, s["bullets"], size=10.5)
            if s.get("callout"):
                rich(doc, "On screen.  ", s["callout"], size=10,
                     fill="FDF6E3", bar="C9A84C", space_before=4, space_after=5)
            if s.get("source"):
                para(doc, "Source: " + s["source"], size=8.5, italic=True,
                     color=DColor(0x6C, 0x75, 0x7D), space_after=4)
            if s.get("notes"):
                rich(doc, "Facilitator note.  ", s["notes"], size=10,
                     fill="F4F6FB", indent=0.18, space_after=4)

    cert = d.get("certificate", {})
    if cert:
        heading(doc, "The certificate", page_break=True)
        para(doc, cert.get("title", ""), size=13, bold=True,
             color=DColor(0x0D, 0x1B, 0x3E), font=HEAD_FONT, space_after=3)
        para(doc, cert.get("subtitle", ""), size=10.5, space_after=8)
        if cert.get("oath"):
            para(doc, "The oath printed on it", size=11, bold=True,
                 font=HEAD_FONT, space_after=3)
            para(doc, "“" + cert["oath"] + "”", size=10.5, italic=True,
                 fill="F4F6FB", space_after=8)

    heading(doc, "Always close on this")
    rich(doc, "Nobody is in trouble for asking for help.  ",
         "CyberTipline.org · 988 (call or text) · TakeItDown.NCMEC.org. Stay on the call "
         "for ten minutes after you finish — in our sessions, disclosures come after the "
         "end far more often than during.",
         fill="EAFAF7", bar="2A9D8F")
    doc.save(str(out))


def exam_doc(d, out, with_answers):
    f = d.get("format", {})
    ex = d.get("exam", {})
    qs = ex.get("questions", [])
    doc = new_doc(
        f"{d['track']} Examination" + (" — Answer Key" if with_answers else ""),
        None,
        f"Ages {d['ages']} · {len(qs)} questions · {ex.get('minutes', 25)} minutes · "
        f"{ex.get('passMark', 80)}% to pass · open book · unlimited retakes",
        warn=("Answer key. Do not give this to students."
              if with_answers else None),
    )

    if not with_answers:
        para(doc, "Name  ______________________________________      "
                  "Date  ____________________      Score  ________ / "
                  f"{len(qs)}",
             size=11, space_before=4, space_after=12)
        rich(doc, "How this works.  ",
             "Circle one answer per question. It is open book — you may look things up. "
             "An unanswered question is marked wrong, so answer every one. You need "
             f"{ex.get('passMark', 80)}% to pass, and you can sit it again as many times "
             "as you like. You can also take it online at "
             "digitalsafetyknights.org/certification-exam.html, which marks it for you "
             "and prints your certificate.",
             size=10, fill="F4F6FB", bar="C9A84C", space_after=12)
    else:
        rich(doc, "Note.  ",
             "The online exam shuffles both the questions and the answer options, so the "
             "letters below will not match a student's screen. Mark against the answer "
             "text, not the letter.",
             size=10, fill="F4F6FB", bar="C9A84C", space_after=12)

    for n, q in enumerate(qs, 1):
        if q.get("topic"):
            eyebrow(doc, q["topic"])
        p = doc.add_paragraph()
        p.paragraph_format.space_before = DPt(9 if q.get("topic") else 13)
        p.paragraph_format.space_after = DPt(4)
        a = p.add_run(f"{n}.  ")
        a.bold = True
        a.font.size = DPt(11)
        a.font.name = HEAD_FONT
        b = p.add_run(q["q"])
        b.bold = True
        b.font.size = DPt(11)
        b.font.name = HEAD_FONT
        b.font.color.rgb = DColor(0x0D, 0x1B, 0x3E)

        for ci, c in enumerate(q.get("choices", [])):
            right = with_answers and ci == q["answer"]
            cp = doc.add_paragraph()
            cp.paragraph_format.left_indent = DInches(0.4)
            cp.paragraph_format.space_after = DPt(2)
            m = cp.add_run(("✓  " if right else "○  ") + "ABCD"[ci] + ".  ")
            m.bold = True
            m.font.size = DPt(10.5)
            m.font.name = BODY_FONT
            if right:
                m.font.color.rgb = DColor(0x1D, 0x7A, 0x6F)
            t = cp.add_run(c)
            t.font.size = DPt(10.5)
            t.font.name = BODY_FONT
            t.bold = bool(right)
            if right:
                t.font.color.rgb = DColor(0x1D, 0x7A, 0x6F)

        if with_answers and q.get("why"):
            rich(doc, "Why.  ", q["why"], size=9.5, fill="F4F6FB",
                 indent=0.4, space_before=3, space_after=4)

    doc.save(str(out))


# ──────────── what we teach: topics and headings ────────────
#
# Each topic is matched against the track's own JSON, so the matrix follows
# the content instead of being asserted alongside it. Keyword matching gets a
# few rows wrong, though, and a wrong tick in a document a principal reads is
# worse than no matrix — so every questionable row was checked against the
# slides by hand and corrected in OVERRIDES below, with the slide named.
TOPICS = [
    ("Strangers and unsolicited contact", ["stranger", "messaged you first", "new follower", "never met"]),
    ("Grooming as a named, four-stage pattern", ["grooming", "four-stage", "trust-building"]),
    ("“Keep it secret” as the red flag", ["secret", "don't tell your parents"]),
    ("Being moved to another app", ["another app", "different app", "second app", "off-platform"]),
    ("Never meeting someone from online", ["meet", "in person", "somewhere private"]),
    ("Financial sextortion, stage by stage", ["sextortion"]),
    ("AI-generated intimate images (nudify apps)", ["nudify", "fake intimate", "generated intimate"]),
    ("Free-currency scams (Robux, skins, V-Bucks)", ["robux", "v-bucks", "free skin", "skins"]),
    ("“Go first and I’ll send after”", ["go first"]),
    ("Irreversible payment (gift cards, crypto, Zelle)", ["gift card", "crypto", "zelle", "cash app", "irreversible"]),
    ("Money-mule recruitment", ["money mule", "launder"]),
    ("Urgency and countdowns as a tactic", ["urgency", "hurry", "countdown", "rushed", "clock is"]),
    ("Passwords and passphrases", ["password", "passphrase", "four random"]),
    ("Two-factor authentication and passkeys", ["two-factor", "2fa", "passkey", "authenticator"]),
    ("Account recovery as the real way in", ["recovery email", "recovery phone", "recovery route", "security question"]),
    ("Privacy and safety settings, named", ["friends-only", "account restrictions", "private account",
                                           "settings →", "family center", "family pairing", "lock the doors"]),
    ("Your own digital footprint", ["footprint", "search yourself", "public profile", "logged-out"]),
    ("Location sharing", ["location", "ghost mode", "snap map"]),
    ("AI that sounds certain and is wrong", ["100% certain", "sounds certain", "confidence isn't proof",
                                             "double check", "confidently wrong"]),
    ("AI voice cloning and the family code word", ["code word", "voice clon", "cloned voice"]),
    ("Deepfakes: judge provenance, not appearance", ["provenance", "deepfake", "where it came from", "posted it first"]),
    ("AI companions and systems built to agree", ["companion", "agrees with", "always agree"]),
    ("Cyberbullying and group chats", ["cyberbully", "group chat", "picked on", "bullying"]),
    ("The bystander move (a student skill)", ["bystander", "don't forward", "speak up", "did not make it worse"]),
    ("Consent before sharing anyone’s photo", ["consent", "ask them first", "ask first", "do not forward"]),
    ("Screen time and balance", ["screen time", "screen-time", "autoplay", "offline time"]),
    ("Telling a trusted adult — never in trouble", ["trusted adult", "tell a grown-up", "one adult", "never in trouble"]),
    ("Reporting routes (CyberTipline, Take It Down, 988)", ["cybertipline", "takeitdown", "take it down", "stopncii", "988"]),
    ("The law and real consequences", ["offence", "mandated reporter", "take it down act", "csam",
                                       "child sexual abuse material"]),
    ("Parental controls, honestly assessed", ["parental control", "family link", "seatbelt"]),
    ("Why a child does not tell", ["why children do not tell", "device-removal", "take the phone",
                                   "first sentence", "second adult"]),
    ("The first sixty seconds of a disclosure", ["first sixty seconds", "thank you for telling me", "disclosure"]),
]

# (topic, track) -> True/False, each checked against the slides by hand.
OVERRIDES = {
    # Sentinel S2 #3-#11 are the settings segment: passkeys, 2FA, recovery,
    # logged-in devices, follower audit, precise location off.
    ("Privacy and safety settings, named", "sentinel"): True,
    # Sentinel S2 #17 "An image of someone in your year lands in the chat"
    # and #21 "Three lines that keep you clear".
    ("Consent before sharing anyone’s photo", "sentinel"): True,
    # Sentinel S2 #14 "Script the sentence" — "the knowledge is never the
    # problem, the first sentence is" — and #15 "You are allowed a second adult".
    ("Why a child does not tell", "sentinel"): True,
    # Guardian covers mandatory reporting instead; the bystander move is
    # taught to students, not to the adults.
    ("The bystander move (a student skill)", "guardian"): False,
}


def taught_text(d):
    """Only what is actually taught: the slides, the exam and the outcomes.

    Scanning the whole track object swept in the logistics metadata too, and
    Squire's groupSize note — "up to 60 with a second adult in the room" —
    matched the "second adult" keyword and put a tick against "why a child
    does not tell" in a track that never discusses it.
    """
    parts = [json.dumps(d.get("outcomes", []), ensure_ascii=False),
             json.dumps(d.get("sessions", []), ensure_ascii=False),
             json.dumps(d.get("exam", {}), ensure_ascii=False),
             json.dumps(d.get("certificate", {}), ensure_ascii=False)]
    return " ".join(parts).lower()


def covers(d, topic, keys):
    key = (topic, d["id"])
    if key in OVERRIDES:
        return OVERRIDES[key]
    blob = taught_text(d)
    return any(k.lower() in blob for k in keys)


def teaching_doc(tracks, out):
    doc = new_doc(
        "What We Teach — Topics and Headings",
        "Every topic the certification programme covers, which age band covers it, and "
        "the title of every slide in order. The one document to send a head teacher.",
        "Digital Safety Knights · 4 tracks · "
        f"{sum(len(s['slides']) for d in tracks for s in d['sessions'])} slides · "
        f"{sum(len(d['exam']['questions']) for d in tracks)} exam questions",
    )
    rich(doc, "What this document is.  ",
         "What the programme teaches, and every heading in it. First the topic table: "
         "which topic is taught in which age band. Then every slide title of every "
         "session, in order, under its timed segment. For the slide text itself and the "
         "presenter notes, see the \u201cFacilitator Guide\u201d in each track folder.",
         size=10, fill="F4F6FB", bar="C9A84C", space_after=12)

    # ── the matrix ──
    heading(doc, "Topic coverage by age band", before=6)
    para(doc, "A tick means the track teaches it outright. A dash is deliberate, not an "
              "oversight — what a child is told is banded on purpose, and the policy is "
              "stated at the end of this document.",
         size=9.5, color=DColor(0x6C, 0x75, 0x7D), space_after=7)

    t = doc.add_table(rows=1, cols=5)
    t.style = "Table Grid"
    widths = (4.05, 0.72, 0.72, 0.72, 0.72)
    heads = ["Topic"] + [f"{d['track']}\n{d['ages']}" for d in tracks]
    for c, txt, w in zip(t.rows[0].cells, heads, widths):
        c.width = DInches(w)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT if txt == "Topic" else WD_ALIGN_PARAGRAPH.CENTER
        shade(p._p, "0D1B3E")
        r = p.add_run(txt)
        r.bold = True
        r.font.size = DPt(7.5)
        r.font.name = HEAD_FONT
        r.font.color.rgb = DColor(0xFF, 0xFF, 0xFF)

    for topic, keys in TOPICS:
        cells = t.add_row().cells
        cells[0].width = DInches(widths[0])
        p = cells[0].paragraphs[0]
        p.paragraph_format.space_after = DPt(1)
        r = p.add_run(topic)
        r.font.size = DPt(9)
        r.font.name = BODY_FONT
        for n, d in enumerate(tracks, 1):
            yes = covers(d, topic, keys)
            cells[n].width = DInches(widths[n])
            cp = cells[n].paragraphs[0]
            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            cp.paragraph_format.space_after = DPt(1)
            rr = cp.add_run("✓" if yes else "–")
            rr.bold = yes
            rr.font.size = DPt(10)
            rr.font.name = BODY_FONT
            rr.font.color.rgb = DColor(0x1D, 0x7A, 0x6F) if yes else DColor(0xB0, 0xB8, 0xC6)

    counts = ", ".join(
        f"{d['track']} {sum(1 for tp, k in TOPICS if covers(d, tp, k))}" for d in tracks)
    para(doc, f"Topics per track — {counts} of {len(TOPICS)}.",
         size=9, italic=True, color=DColor(0x6C, 0x75, 0x7D), space_before=6, space_after=4)

    # ── headings, track by track ──
    for d in tracks:
        f = d["format"]
        heading(doc, f"{d.get('emoji','')} {d['track']} — every heading",
                size=16, page_break=True)
        para(doc, f"Ages {d['ages']} · {f['sessions']} × {f['minutesEach']} minutes · "
                  f"{f['examQuestions']}-question exam · {f['passMark']}% to pass",
             size=9.5, bold=True, color=DColor(0x6C, 0x75, 0x7D), space_after=8)

        para(doc, "What a participant can do afterwards", size=11, bold=True,
             font=HEAD_FONT, space_after=3)
        bullets(doc, d.get("outcomes", []), size=9.5, indent=0.26)

        for sess in d["sessions"]:
            para(doc, f"Session {sess['n']} — {sess['title']}", size=12, bold=True,
                 color=DColor(0x1A, 0x2F, 0x6E), font=HEAD_FONT,
                 space_before=13, space_after=2)
            if sess.get("goal"):
                rich(doc, "Goal.  ", sess["goal"], size=9.5, fill="F4F6FB",
                     bar="C9A84C", space_after=6)
            slides = sess.get("slides", [])
            for sg in sess.get("segments", []):
                para(doc, f"{sg['minutes']} min  ·  {sg['label']}", size=10, bold=True,
                     color=DColor(0x0D, 0x1B, 0x3E), font=HEAD_FONT,
                     space_before=7, space_after=2)
                for n in sg.get("slides", []):
                    if not 1 <= n <= len(slides):
                        continue
                    sl = slides[n - 1]
                    p = doc.add_paragraph()
                    p.paragraph_format.left_indent = DInches(0.3)
                    p.paragraph_format.space_after = DPt(1)
                    a = p.add_run(f"{n}. ")
                    a.bold = True
                    a.font.size = DPt(9.5)
                    a.font.name = BODY_FONT
                    a.font.color.rgb = DColor(0x1A, 0x2F, 0x6E)
                    b = p.add_run(sl.get("title", ""))
                    b.font.size = DPt(9.5)
                    b.font.name = BODY_FONT
                    c = p.add_run(f"   [{sl.get('kind', 'teach')}]")
                    c.font.size = DPt(8)
                    c.font.name = BODY_FONT
                    c.font.color.rgb = DColor(0x8A, 0x93, 0xA6)

        ex = d.get("exam", {})
        para(doc, "Exam — what it tests", size=12, bold=True,
             color=DColor(0x1A, 0x2F, 0x6E), font=HEAD_FONT, space_before=13, space_after=3)
        seen, order = set(), []
        for q in ex.get("questions", []):
            tp = q.get("topic", "")
            if tp and tp not in seen:
                seen.add(tp)
                order.append(tp)
        counts = {tp: sum(1 for q in ex["questions"] if q.get("topic") == tp) for tp in order}
        bullets(doc, [f"{tp} — {counts[tp]} question{'s' if counts[tp] > 1 else ''}"
                      for tp in order], size=9.5, indent=0.26)

    # ── the banding policy ──
    heading(doc, "What is said at which age, and why", page_break=True)
    rich(doc, "This is the part to read before booking.  ",
         "The dashes in the table are a safeguarding decision, not a shortcut. The same "
         "danger is taught at every age; how much of it is named changes.", space_after=9)
    rich(doc, "Sentinel (14–17) and Guardian (adults).  ",
         "Financial sextortion is named and walked through stage by stage, including the "
         "actual wording of the threat. Nudify apps are named, so that a student who sent "
         "nothing understands they can still be targeted. The law on forwarding an image "
         "of a classmate is stated plainly. 988, Take It Down and StopNCII are given.",
         size=10, fill="F4F6FB", bar="1A2F6E", space_after=7)
    rich(doc, "Knight (10–13).  ",
         "Grooming is taught as a four-stage pattern and the move to another app is named "
         "as the tell. The image and secrecy danger is covered in exactly one sentence — "
         "“if anyone ever asks you for a photo, or sends you one, or says keep it secret "
         "from your parents, that is the moment you stop and tell a grown-up, every single "
         "time, and you are never in trouble for it” — and the facilitator note instructs "
         "the presenter to read it once and not elaborate or follow questions into detail. "
         "Sextortion is not named. The resources given are CyberTipline and a trusted adult.",
         size=10, fill="F4F6FB", bar="C9A84C", space_after=7)
    rich(doc, "Squire (6–9).  ",
         "Never goes near it. Five rules: your name and school stay offline, a password is "
         "a secret only a parent is told, “free” plus “hurry” is a trap, you never meet "
         "someone from a game, and telling a grown-up is never the wrong answer. The only "
         "resource is a trusted adult.",
         size=10, fill="F4F6FB", bar="3EC6C0", space_after=9)
    rich(doc, "In every session, at every age.  ",
         "No student is ever asked to describe their own experience in front of the group. "
         "A private channel to the facilitator stays open throughout. We stay on the call "
         "for ten minutes after the end, because disclosures come after the end far more "
         "often than during. Anything that needs escalating goes to the school's designated "
         "safeguarding lead immediately, and we do not run an investigation ourselves. "
         "Every session closes on the same line: nobody is in trouble for asking for help.",
         size=10, fill="EAFAF7", bar="2A9D8F")

    doc.save(str(out))


def internal_notes_doc(tracks, out):
    """The Turkish operating notes. Kept out of the shared documents and named
    so it is obvious it stays behind — Osman shares this pack with
    English-speaking schools."""
    doc = new_doc(
        "TÜRKÇE NOTLAR — Sertifika Paketi",
        "Bu dosya paylaşılmak için değil. Paketin nasıl kullanılacağı, neyin "
        "paylaşılacağı ve neyin sizde kalacağı.",
        "Digital Safety Knights · iç kullanım",
        warn="Bu dosyayı okula göndermeyin. Paketteki diğer bütün dosyalar İngilizce ve paylaşılabilir.",
    )

    heading(doc, "Hangi dosya ne işe yarıyor", before=8)
    rich(doc, "1 - Programme Overview and Pricing.  ",
         "Okula/müdüre gönderilecek genel tanıtım: dört parça, dakika dakika akış, "
         "fiyatlandırma, dürüst sınırlar. Tek dosya göndereceksen bu.", size=10, space_after=4)
    rich(doc, "2 - What We Teach - Topics and Headings.  ",
         "Konu tablosu (hangi konu hangi yaşta) ve 172 slayt başlığının tamamı. "
         "“Tam olarak ne anlatıyorsunuz?” diye soran müdüre bu gider.", size=10, space_after=4)
    rich(doc, "Parça klasörleri (3-6).  ",
         "Her birinde iki PowerPoint, eğitmen kılavuzu, öğrenci sınavı ve cevap "
         "anahtarı. İlk grup Sentinel (14-17), İngilizce, canlı Zoom.", size=10, space_after=4)
    rich(doc, "7 - Everything in One File.  ",
         "PowerPoint'siz bir makinede tarayıcıda sunmak ya da tek dosya e-postalamak "
         "için. İçinde cevap anahtarı da var, öğrenciye verme.", size=10, space_after=10)

    heading(doc, "Sunarken")
    bullets(doc, [
        "PowerPoint → Slide Show → Presenter View. Notlar sizde kalır, oda görmez. "
        "Zoom'da ekran paylaşırken mutlaka bunu kullanın.",
        "Oturum 1 ile Oturum 2 arasında bir hafta olsun; ikinci oturum telefonla "
        "yapılıyor, öğrencilere getirmelerini önceden söyleyin.",
        "Bitişte on dakika çağrıda kalın. Açılmalar oturum sırasında değil, "
        "bittikten sonra geliyor.",
        "Hiçbir öğrenciye grubun önünde kendi yaşadığını anlattırmayın. "
        "Baştan özel mesaj kanalını açık tutun.",
        "Ciddi bir şey çıkarsa okulun çocuk koruma sorumlusuna aynı gün gider. "
        "Soruşturmayı kendiniz yürütmeyin.",
    ], size=10)

    heading(doc, "Sınav ve sertifika")
    bullets(doc, [
        "Geçme notu %80, açık kitap, tekrar sınırsız. Amaç elemek değil, kalıcı olması.",
        "Online sınav soruları VE şıkları karıştırıyor — kâğıttaki A/B/C/D öğrencinin "
        "ekranıyla uyuşmaz. Harfe değil, cevap metnine göre değerlendirin.",
        "Online sınav: digitalsafetyknights.org/certification-exam.html — kendisi "
        "değerlendirip sertifikayı basıyor, hiçbir veri cihazdan çıkmıyor.",
        "Ücretsiz sertifika “kendi düzenlediği” sertifika: sınavı kimin girdiğini "
        "doğrulamıyoruz. Okulun doğrulanmış belgeye ihtiyacı varsa ücretli program.",
    ], size=10)

    heading(doc, "Ücret, tek satırda")
    rich(doc, "Hiçbir şey ücretli değil.  ",
         "Kurs da, sertifikalar da, dört oturumluk uzun sürüm de. Ücretli bir katman yok. "
         "Önceden bir fiyatlandırma hazırlanmıştı (öğrenci başına 6 USD) ama Osman "
         "2026-11-09'da kaldırdı — sitede, Office paketinde ve SSS'lerde hiçbir yerde "
         "ücretten söz edilmiyor. Biri bizim adımıza para isterse o biz değiliz.",
         size=10, fill="FDF6E3", bar="C9A84C", space_after=8)
    rich(doc, "Yine de önceden ayarlanması gereken tek şey.  ",
         "Gözetimli sınav, listeden düzenlenen ve teyit edebileceğimiz referanslı "
         "sertifikalar, ve okul sitesine mühür. Bunlar da ücretsiz, sadece rezervasyon "
         "sırasında istenmesi gerekiyor — self-servis sertifikada sınava kimin girdiğini "
         "görmediğimiz için teyit edemiyoruz.",
         size=10, space_after=8)

    heading(doc, "Yaş bandı politikası — en önemli kısım")
    rich(doc, "Tabloda “–” olan yerler eksiklik değil, karar.  ",
         "Sentinel (14-17) cinsel şantajı, nudify uygulamalarını ve yasayı açık açık "
         "adlandırıyor. Knight (10-13) tek bir cümlede duruyor ve slaydın notu "
         "sunucuya “bir kez oku, açma, soruları detaya taşıma” diyor. Squire (6-9) "
         "konuya hiç yaklaşmıyor. Bir yaş grubuna diğerinin materyalini anlatmayın.",
         size=10, fill="F4F6FB", bar="1A2F6E", space_after=8)

    heading(doc, "Paketi yeniden üretmek")
    rich(doc, "İçerik tek kaynaktan geliyor.  ",
         "frontend/content/certification/*.json. Bir slaydı ya da soruyu değiştirmek "
         "istersen orada değiştir, sonra şu ikisini çalıştır — hem Office dosyaları "
         "hem site aynı kaynaktan yenilenir, birbirinden kopmaz:",
         size=10, space_after=4)
    para(doc, "python3 infrastructure/build-certification-office.py", size=9.5,
         font="Menlo", fill="F4F6FB", space_after=2)
    para(doc, "python3 infrastructure/build-certification-onefile.py", size=9.5,
         font="Menlo", fill="F4F6FB", space_after=8)

    doc.save(str(out))


def overview_doc(tracks, out):
    doc = new_doc(
        "Digital Safety Certification — Programme Overview",
        "A two-hour course delivered live online as one hour plus one hour a week apart, "
        "ending in a certificate. Four age tracks, from a six-year-old to a staff room.",
        "Digital Safety Knights · digitalsafetyknights.org/certification.html",
    )

    heading(doc, "How this pack is organised", before=8)
    rich(doc, "Five files per track.  ",
         "Two PowerPoint decks (one per session), a facilitator guide, a student exam, "
         "and a separate answer key. They sit in the numbered track folders.",
         size=10, space_after=5)
    rich(doc, "Presenter notes are inside the PowerPoint.  ",
         "Every slide carries its note in PowerPoint's own Notes pane. Use Slide Show → "
         "Presenter View: you see the note, the room does not. That is what to use when "
         "sharing your screen on Zoom.", size=10, space_after=5)
    rich(doc, "Do not hand the answer key to students.  ",
         "That is why it is a separate file. Students get the \u201cExam (Student Copy)\u201d, "
         "which contains no answers, or they sit it online at "
         "digitalsafetyknights.org/certification-exam.html, which marks it and issues the "
         "certificate automatically.", size=10, space_after=5)
    rich(doc, "Language.  ",
         "The course content is written in English. The live session can also be delivered "
         "in Spanish, French or Turkish, and the programme page on our website is published "
         "in all four.", size=10, space_after=12)

    heading(doc, "The four tracks")
    t = doc.add_table(rows=1, cols=5)
    t.style = "Table Grid"
    widths = (1.5, 1.5, 1.35, 1.3, 1.2)
    for c, txt, w in zip(t.rows[0].cells,
                         ("Track", "Ages", "Length", "Exam", "Pass mark"), widths):
        c.width = DInches(w)
        shade(c.paragraphs[0]._p, "0D1B3E")
        r = c.paragraphs[0].add_run(txt)
        r.bold = True
        r.font.size = DPt(8.5)
        r.font.name = HEAD_FONT
        r.font.color.rgb = DColor(0xFF, 0xFF, 0xFF)
    for d in tracks:
        f = d["format"]
        cells = t.add_row().cells
        vals = (f"{d.get('emoji','')} {d['track']}",
                d["ages"],
                f"{f['sessions']} × {f['minutesEach']} min",
                f"{f['examQuestions']} questions",
                f"{f['passMark']}%")
        for c, v, w in zip(cells, vals, widths):
            c.width = DInches(w)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = DPt(2)
            r = p.add_run(str(v))
            r.font.size = DPt(9.5)
            r.font.name = BODY_FONT

    para(doc, "", size=6, space_after=6)
    rich(doc, "Why the younger tracks are shorter.  ",
         "A two-hour block is right for a sixteen-year-old and wrong for a seven-year-old. "
         "A 60-minute online session with six-year-olds does not work, so the Squire track "
         "is 2 × 30 and its exam is 12 questions with three options each.",
         size=10, space_after=10)
    rich(doc, "What a child is told changes by band, deliberately.  ",
         "The Sentinel track names financial sextortion, nudify apps and the law outright. "
         "The Knight track stops at one sentence — “if anyone ever asks you for a photo, or "
         "sends you one, or says keep it secret from your parents, that is the moment you "
         "stop and tell a grown-up” — and its facilitator note tells the presenter to read "
         "it once and not elaborate. The Squire track never goes near it. Reporting routes "
         "are banded the same way: 988 and Take It Down appear in Sentinel and Guardian "
         "only; Knight gets CyberTipline; Squire gets “tell a grown-up”.",
         size=10, space_after=10)

    heading(doc, "How a cohort runs")
    bullets(doc, [
        "Pick a track. A class sits one track together; a parent evening sits Guardian.",
        "Session 1 — what happens. The threats, named precisely and age-appropriately.",
        "Session 2, a week later — what to do. Hands-on: settings changed, protocols "
        "rehearsed, the first sentence to an adult scripted.",
        "The exam, then the certificate. Open book, 80% to pass, unlimited free retakes.",
    ], size=10.5)

    # The whole programme, minute by minute, in one place — so this single
    # document answers "what actually happens in the two hours" without
    # anyone having to open four separate facilitator guides.
    heading(doc, "The programme in detail", page_break=True)
    para(doc, "Every session, minute by minute. The facilitator guide for each track "
              "carries the same run sheet plus every slide and every presenter note.",
         size=10, color=DColor(0x6C, 0x75, 0x7D), space_after=10)

    for d in tracks:
        f = d["format"]
        para(doc, f"{d.get('emoji','')} {d['track']} · ages {d['ages']} · "
                  f"{f['sessions']} × {f['minutesEach']} min",
             size=13, bold=True, color=DColor(0x0D, 0x1B, 0x3E), font=HEAD_FONT,
             space_before=14, space_after=3)
        para(doc, d.get("tagline", ""), size=10, italic=True,
             color=DColor(0x46, 0x53, 0x6C), space_after=7)

        for sess in d["sessions"]:
            para(doc, f"Session {sess['n']} — {sess['title']}", size=11, bold=True,
                 color=DColor(0x1A, 0x2F, 0x6E), font=HEAD_FONT,
                 space_before=7, space_after=2)
            if sess.get("goal"):
                rich(doc, "Goal.  ", sess["goal"], size=9.5, fill="F4F6FB",
                     bar="C9A84C", space_after=5)
            for sg in sess.get("segments", []):
                p = doc.add_paragraph()
                p.paragraph_format.left_indent = DInches(0.28)
                p.paragraph_format.space_after = DPt(2)
                a = p.add_run(f"{sg['minutes']} min" + " " * max(1, 11 - len(sg["minutes"])))
                a.bold = True
                a.font.size = DPt(9.5)
                a.font.name = BODY_FONT
                a.font.color.rgb = DColor(0x1A, 0x2F, 0x6E)
                b = p.add_run(sg["label"])
                b.font.size = DPt(9.5)
                b.font.name = BODY_FONT
                c = p.add_run(f"   ({len(sg.get('slides', []))} slides)")
                c.font.size = DPt(8.5)
                c.font.name = BODY_FONT
                c.font.color.rgb = DColor(0x6C, 0x75, 0x7D)

        para(doc, "Covered in this track", size=10, bold=True, font=HEAD_FONT,
             space_before=7, space_after=3)
        bullets(doc, d.get("outcomes", []), size=9.5, indent=0.28)

    heading(doc, "What it costs", page_break=True)
    rich(doc, "Nothing. Not the course, not the certificates, not the longer version.  ",
         "We are a nonprofit and this is what we exist to do. There is no paid tier, no "
         "upgrade and nothing held back. A school that wants the two-hour course, the "
         "four-session version, verified certificates for every student and a parent "
         "evening on top pays nothing for any of it.",
         fill="EAFAF7", bar="2A9D8F", space_after=8)
    rich(doc, "What is included, free.  ",
         "A live cohort for your class; or 4 × 60 minutes over four weeks if you want the "
         "longer version. Every slide deck and facilitator guide. The exam, open book, with "
         "unlimited retakes. A certificate with each student's name on it. A pre- and "
         "post-assessment. A class report for the teacher. A parent-evening Guardian "
         "session. English, Spanish, French or Turkish. No account, no login, and no "
         "student data collected by the self-serve route.",
         space_after=8)
    rich(doc, "One thing worth asking for in advance.  ",
         "A proctored sitting, certificates issued from your roster each carrying a "
         "reference we can confirm, and a \u201cDigital Safety Certified\u201d seal for your "
         "website. Also free \u2014 it just needs arranging, because the self-serve "
         "certificate is issued in the student's own browser and we did not watch them sit "
         "the exam. If you need a credential an authority can rely on, say so when you book.",
         fill="FDF6E3", bar="C9A84C", space_after=8)
    rich(doc, "Why we say this so loudly.  ",
         "Child online safety has a small industry around it now, and a head teacher with a "
         "budget line and no time is an easy sell. We would rather you compared us to a "
         "quote and found the free option was not the lesser one. We take donations, and "
         "that is the only money involved anywhere \u2014 we come as volunteers rather than "
         "vendors, and if anyone ever asks you to pay for something in our name, that is "
         "not us.",
         space_after=10)

    heading(doc, "Honest limits")
    bullets(doc, [
        "This is a certificate of completion from a nonprofit, not a credential from an "
        "awarding body. It is not an accredited qualification and we will not claim it is.",
        "A self-issued certificate records that the exam was passed in that student's "
        "browser. We did not watch them sit it, so we cannot vouch for who did — that is "
        "what the verified school programme is for.",
        "The slides and guides are published in English for now. The live session can be "
        "delivered in Turkish, Spanish or French.",
    ], size=10.5)

    heading(doc, "If something comes up in a session")
    bullets(doc, [
        "Never ask a student to describe their own experience in front of the group.",
        "Keep a private channel open throughout so anyone can message you alone.",
        "Stay on the call for ten minutes after the end — disclosures come after the end "
        "far more often than during.",
        "Anything that needs escalating goes to the school's designated safeguarding lead "
        "immediately. Do not run an investigation yourself.",
        "Always close on the resources: CyberTipline.org · 988 · TakeItDown.NCMEC.org.",
    ], size=10.5)

    doc.save(str(out))


# ─────────────────────────────── build ───────────────────────────────
def main():
    tracks = [json.loads((SRC / f"{t}.json").read_text()) for t in ORDER]

    # Only remove what this script generates. An earlier version rmtree'd the
    # whole destination, which is fine when the folder is ours and destructive
    # the moment Osman drops something of his own in beside it.
    DEST.mkdir(parents=True, exist_ok=True)
    for old in list(DEST.glob("*.docx")) + list(DEST.glob("*.pptx")) + list(DEST.glob("*.html")):
        old.unlink()
    for d in tracks:
        for pat in (f"*{d['track']} (*", f"*- {d['track']} *"):
            for folder in DEST.glob(pat):
                if folder.is_dir():
                    shutil.rmtree(folder)

    made = []
    internal_notes_doc(tracks, DEST / "0 - TURKCE NOTLAR (paylasmayin).docx")
    made.append("0 - TURKCE NOTLAR (paylasmayin).docx")
    overview_doc(tracks, DEST / "1 - Programme Overview.docx")
    made.append("1 - Programme Overview.docx")
    teaching_doc(tracks, DEST / "2 - What We Teach - Topics and Headings.docx")
    made.append("2 - What We Teach - Topics and Headings.docx")

    for n, d in enumerate(tracks, 1):
        ages = d["ages"].replace("–", "-")
        ages = ages if "Parents" in ages else f"ages {ages}"
        folder = DEST / f"{n + 2} - {d['track']} ({ages})"
        folder.mkdir()
        label = d["track"]
        for sess in d["sessions"]:
            out = folder / f"{label} - Session {sess['n']} - Slides.pptx"
            cnt = build_deck(d, sess, out)
            made.append(f"{folder.name}/{out.name}  ({cnt} slides)")
        g = folder / f"{label} - Facilitator Guide.docx"
        guide_doc(d, g)
        made.append(f"{folder.name}/{g.name}")
        s = folder / f"{label} - Exam (Student Copy).docx"
        exam_doc(d, s, with_answers=False)
        made.append(f"{folder.name}/{s.name}")
        k = folder / f"{label} - Exam (Answer Key).docx"
        exam_doc(d, k, with_answers=True)
        made.append(f"{folder.name}/{k.name}")

    print(f"wrote {DEST}\n")
    for m in made:
        print("  " + m)
    total = sum(1 for _ in DEST.rglob("*.*"))
    size = sum(p.stat().st_size for p in DEST.rglob("*.*"))
    print(f"\n{total} files, {size/1024/1024:.1f} MB")


if __name__ == "__main__":
    main()
