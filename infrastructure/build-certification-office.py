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
DEST = pathlib.Path("/Users/osmansakli/Desktop/DSK Sertifika Programi")
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


def overview_doc(tracks, out):
    doc = new_doc(
        "Digital Safety Certification — Programme Overview",
        "A two-hour course delivered live online as one hour plus one hour a week apart, "
        "ending in a certificate. Four age tracks, from a six-year-old to a staff room.",
        "Digital Safety Knights · digitalsafetyknights.org/certification.html",
    )

    heading(doc, "Nasıl kullanılır", before=8)
    rich(doc, "Her parça için beş dosya var.  ",
         "İki PowerPoint (her oturum için bir tane), bir eğitmen kılavuzu (Word), "
         "öğrenciye verilecek sınav (Word) ve ayrı bir cevap anahtarı (Word). "
         "Parça klasörlerinin içinde duruyorlar.", size=10, space_after=5)
    rich(doc, "Sunucu notları PowerPoint'in içinde.  ",
         "Her slaytın notu, PowerPoint'in kendi “Konuşmacı Notları” alanında. "
         "Sunum Görünümü'nde (Slide Show → Presenter View) siz görürsünüz, oda görmez. "
         "Zoom'da ekran paylaşırken bu yüzden Presenter View kullanın.", size=10,
         space_after=5)
    rich(doc, "Cevap anahtarını öğrenciye vermeyin.  ",
         "“Sinav - Cevap Anahtari” dosyaları ayrı tutuldu, tam bu yüzden. "
         "Öğrenciye “Sinav - Ogrenci” dosyası verilir; o dosyada cevap yok.", size=10,
         space_after=5)
    rich(doc, "Dil.  ",
         "Ders içeriği İngilizce yazıldı, çünkü ilk grup İngilizce olacak. Canlı oturum "
         "Türkçe, İspanyolca ve Fransızca da verilebilir; sitedeki tanıtım sayfası dört "
         "dilde yayında.", size=10, space_after=12)

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
        vals = (f"{d.get('emoji','')} {d['track']} ({TR[d['id']]})",
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
        para(doc, f"{d.get('emoji','')} {d['track']} ({TR[d['id']]}) · ages {d['ages']} · "
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

    heading(doc, "What is free, and what is not", page_break=True)
    rich(doc, "Free, forever, for anyone, anywhere.  ",
         "The live two-hour cohort, every slide deck and facilitator guide, the exam with "
         "unlimited retakes, and a self-issued certificate carrying the student's name. "
         "English, Spanish, French or Turkish. No account, no login, no student data "
         "collected — the online exam runs entirely in the browser.",
         fill="EAFAF7", bar="2A9D8F", space_after=8)
    rich(doc, "School Certification Programme — $6 per student, $120 minimum, "
              "$600 capped per school, one school year.  ",
         "Four hours instead of two (4 × 60 minutes over four weeks), a pre- and "
         "post-assessment so you can show what changed, a proctored sitting scheduled with "
         "your teacher, verified certificates issued from your roster each carrying a "
         "reference we can confirm on request, a class report for the teacher, a "
         "“Digital Safety Certified” seal for your school's website, and a parent-evening "
         "Guardian session at no extra cost.",
         fill="FDF6E3", bar="C9A84C", space_after=8)
    rich(doc, "The fee is waived in full for any school that asks.  ",
         "No application, no means test, no questions, and we will not ask you to justify "
         "it. We would rather certify a thousand students for nothing than turn one school "
         "away over money.",
         fill="F4F6FB", bar="1A2F6E", space_after=8)
    rich(doc, "Why there is a fee at all.  ",
         "A certificate that nobody checks is a PDF. The moment a school wants to put a "
         "credential in a student file, show it to an authority, or publish a seal on its "
         "website, somebody has to hold a roster, proctor a sitting, keep a reference and "
         "answer the phone when a parent rings in two years' time. That is administration, "
         "and it is the only thing we charge for. Our workshops are free, our materials are "
         "free, the self-issued certificate is free, and we still come to your school as "
         "volunteers rather than vendors.",
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

    if DEST.exists():
        shutil.rmtree(DEST)
    DEST.mkdir(parents=True)

    made = []
    overview_doc(tracks, DEST / "0 - Program Ozeti ve Fiyatlandirma.docx")
    made.append("0 - Program Ozeti ve Fiyatlandirma.docx")

    for n, d in enumerate(tracks, 1):
        folder = DEST / f"{n} - {d['track']} ({TR[d['id']]}) - {d['ages'].replace('–','-')}"
        folder.mkdir()
        label = d["track"]
        for sess in d["sessions"]:
            out = folder / f"{label} - Oturum {sess['n']} - Slaytlar.pptx"
            cnt = build_deck(d, sess, out)
            made.append(f"{folder.name}/{out.name}  ({cnt} slides)")
        g = folder / f"{label} - Egitmen Kilavuzu.docx"
        guide_doc(d, g)
        made.append(f"{folder.name}/{g.name}")
        s = folder / f"{label} - Sinav - Ogrenci.docx"
        exam_doc(d, s, with_answers=False)
        made.append(f"{folder.name}/{s.name}")
        k = folder / f"{label} - Sinav - Cevap Anahtari.docx"
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
