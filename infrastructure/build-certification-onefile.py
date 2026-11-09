#!/usr/bin/env python3
"""Build ONE self-contained HTML file holding the whole certification
programme, for the Desktop.

The site's own pages fetch content/certification/*.json, which a browser
refuses to do from a file:// URL — so a copy of those pages on the Desktop
would open to an empty shell. This inlines all four tracks instead, so the
file works by double-clicking, with no server and no internet.

It is both documents at once: a readable/printable facilitator guide, and a
live presenter deck (the "Present" button on any session takes over the
screen and is keyboard-driven, exactly like the deck on the site).

    python3 build_master.py
"""
import html
import json
import pathlib

SRC = pathlib.Path("/Users/osmansakli/digitalsafetyknights/frontend/content/certification")
OUT = pathlib.Path("/Users/osmansakli/Desktop/DIGITAL SAFETY KNIGHTS-ALL/DSK Certification Programme/7 - Everything in One File (browser, no PowerPoint).html")
ORDER = ["squire", "knight", "sentinel", "guardian"]

TRACK_COLOR = {"squire": "#3EC6C0", "knight": "#c9a84c",
               "sentinel": "#1a2f6e", "guardian": "#8A5FBF"}


def e(s):
    return html.escape("" if s is None else str(s), quote=False)


tracks = [json.loads((SRC / f"{t}.json").read_text()) for t in ORDER]


# ─────────────────────────── document body ───────────────────────────
def slide_block(s, n, tid, sess_n):
    h = [f'<div class="sl" id="s-{tid}-{sess_n}-{n}">']
    h.append(f'<div class="sl-top"><span class="sl-n">{n}</span>'
             f'<span class="sl-kind">{e(s.get("kind","teach"))}</span>'
             f'<button type="button" class="sl-go" data-t="{tid}" data-s="{sess_n}" data-i="{n}">▶ present from here</button></div>')
    if s.get("eyebrow"):
        h.append(f'<div class="sl-eyebrow">{e(s["eyebrow"])}</div>')
    if s.get("title"):
        h.append(f'<h4>{e(s["title"])}</h4>')
    if s.get("subtitle"):
        h.append(f'<p class="sl-sub">{e(s["subtitle"])}</p>')
    if s.get("ask"):
        h.append(f'<div class="sl-ask"><b>Ask the room:</b> {e(s["ask"])}</div>')
    if s.get("bullets"):
        h.append("<ul>" + "".join(f"<li>{e(b)}</li>" for b in s["bullets"]) + "</ul>")
    if s.get("callout"):
        h.append(f'<div class="sl-callout">{e(s["callout"])}</div>')
    if s.get("source"):
        h.append(f'<div class="sl-src">Source: {e(s["source"])}</div>')
    if s.get("notes"):
        h.append(f'<div class="sl-note"><b>Facilitator note.</b> {e(s["notes"])}</div>')
    h.append("</div>")
    return "".join(h)


def track_section(d):
    tid, f = d["id"], d.get("format", {})
    col = TRACK_COLOR.get(tid, "#c9a84c")
    h = [f'<section class="trk" id="t-{tid}" style="--tc:{col}">']
    h.append(f'<div class="trk-head"><span class="trk-em">{e(d.get("emoji",""))}</span>'
             f'<div><h2>{e(d["track"])} Track</h2>'
             f'<div class="trk-meta">Ages {e(d["ages"])} · {e(d.get("level",""))} · '
             f'{f.get("sessions")} × {f.get("minutesEach")} min · '
             f'{f.get("examQuestions")} questions · {f.get("passMark")}% to pass</div></div></div>')
    h.append(f'<p class="trk-tag">{e(d.get("tagline",""))}</p>')

    if d.get("outcomes"):
        h.append('<h3>Learning outcomes</h3><p class="lead">By the end of the programme a participant can:</p><ol class="outc">')
        h += [f"<li>{e(o)}</li>" for o in d["outcomes"]]
        h.append("</ol>")
    if d.get("prerequisites"):
        h.append(f'<p class="small"><b>Prerequisites.</b> {e(d["prerequisites"])}</p>')
    if d.get("materials"):
        h.append('<p class="small"><b>What you need.</b></p><ul class="small">'
                 + "".join(f"<li>{e(m)}</li>" for m in d["materials"]) + "</ul>")

    for sess in d.get("sessions", []):
        sn = sess["n"]
        h.append(f'<h3 class="sess">Session {sn} — {e(sess["title"])}'
                 f'<button type="button" class="present" data-t="{tid}" data-s="{sn}" data-i="1">▶ Present this session</button></h3>')
        if sess.get("subtitle"):
            h.append(f'<p class="sess-sub">{e(sess["subtitle"])}</p>')
        if sess.get("goal"):
            h.append(f'<div class="goal"><b>Goal.</b> {e(sess["goal"])}</div>')
        if sess.get("segments"):
            h.append('<table class="run"><thead><tr><th>Minutes</th><th>Segment</th><th>Slides</th></tr></thead><tbody>')
            for sg in sess["segments"]:
                sl = sg.get("slides", [])
                links = ", ".join(f'<a href="#s-{tid}-{sn}-{i}">{i}</a>' for i in sl)
                h.append(f'<tr><td>{e(sg["minutes"])}</td><td>{e(sg["label"])}</td><td>{links}</td></tr>')
            h.append("</tbody></table>")
        h.append('<div class="slides">')
        h += [slide_block(s, i + 1, tid, sn) for i, s in enumerate(sess.get("slides", []))]
        h.append("</div>")

    ex = d.get("exam", {})
    qs = ex.get("questions", [])
    if qs:
        h.append(f'<h3 class="sess">Examination — answer key</h3>'
                 f'<div class="goal">{len(qs)} questions · {ex.get("minutes",25)} minutes · '
                 f'{ex.get("passMark",80)}% to pass · open book · unlimited retakes 24 hours apart. '
                 f'Students sit it at <b>digitalsafetyknights.org/certification-exam.html?track={tid}</b>. '
                 f'<b>Do not hand this page to students.</b></div>')
        for n, q in enumerate(qs, 1):
            h.append('<div class="q">')
            h.append(f'<div class="sl-top"><span class="sl-n">Q{n}</span>'
                     f'<span class="sl-kind">{e(q.get("topic",""))}</span></div>')
            h.append(f'<h4>{e(q["q"])}</h4><ul class="choices">')
            for ci, c in enumerate(q.get("choices", [])):
                right = ci == q["answer"]
                h.append(f'<li class="{"ok" if right else ""}">{"✓" if right else "○"} {e(c)}</li>')
            h.append("</ul>")
            if q.get("why"):
                h.append(f'<div class="sl-note"><b>Why.</b> {e(q["why"])}</div>')
            h.append("</div>")

    cert = d.get("certificate", {})
    if cert:
        h.append('<h3 class="sess">The certificate</h3>')
        h.append(f'<div class="goal"><b>{e(cert.get("title",""))}</b><br>{e(cert.get("subtitle",""))}</div>')
        if cert.get("oath"):
            h.append(f'<div class="oath">“{e(cert["oath"])}”</div>')

    h.append("</section>")
    return "".join(h)


toc = "".join(
    f'<a href="#t-{d["id"]}" style="--tc:{TRACK_COLOR[d["id"]]}">'
    f'<span class="em">{e(d.get("emoji",""))}</span>'
    f'<b>{e(d["track"])}</b>'
    f'<span>Ages {e(d["ages"])}</span>'
    f'<span>{d["format"]["sessions"]} × {d["format"]["minutesEach"]} min · '
    f'{d["format"]["examQuestions"]} q</span></a>'
    for d in tracks
)

total_slides = sum(len(s["slides"]) for d in tracks for s in d["sessions"])
total_q = sum(len(d["exam"]["questions"]) for d in tracks)

DATA = json.dumps({d["id"]: d for d in tracks}, ensure_ascii=False, separators=(",", ":"))

DOC = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DSK Certification Programme — Complete Facilitator Pack</title>
<style>
  :root {{
    --navy:#0d1b3e; --navy2:#1a2f6e; --gold:#c9a84c; --gold2:#e8c56a;
    --light:#f4f6fb; --danger:#e63946; --success:#2a9d8f; --gray:#6c757d;
    --text:#2d3748; --teal:#3EC6C0; --purple:#8A5FBF;
  }}
  *{{margin:0;padding:0;box-sizing:border-box}}
  html{{scroll-behavior:smooth}}
  body{{font-family:'Nunito Sans','Segoe UI',system-ui,sans-serif;background:var(--light);color:var(--text);line-height:1.6}}
  [hidden]{{display:none!important}}

  .cover{{background:linear-gradient(140deg,#0d1b3e,#1a2f6e);color:#fff;padding:3.2rem 1.5rem 3rem;text-align:center}}
  .cover .eyebrow{{color:var(--gold);font-weight:900;letter-spacing:2.6px;font-size:.73rem;text-transform:uppercase}}
  .cover h1{{font-size:clamp(1.7rem,5.2vw,2.5rem);font-weight:900;margin:12px 0 10px;text-wrap:balance}}
  .cover p{{color:#c3cee6;max-width:60ch;margin:0 auto;font-size:.97rem}}
  .cover .nums{{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:22px}}
  .cover .nums span{{background:rgba(255,255,255,.1);border:1px solid rgba(201,168,76,.42);color:var(--gold2);font-weight:800;font-size:.79rem;padding:7px 14px;border-radius:20px}}

  .wrap{{max-width:900px;margin:0 auto;padding:34px 18px 70px}}

  .howto{{background:#fff;border-left:5px solid var(--gold);border-radius:0 14px 14px 0;padding:20px 24px;box-shadow:0 2px 18px rgba(13,27,62,.07)}}
  .howto h2{{font-size:1.05rem;color:var(--navy);margin-bottom:10px}}
  .howto p{{font-size:.9rem;margin-bottom:9px}}
  .howto p:last-child{{margin-bottom:0}}
  .howto kbd{{background:var(--light);border:1px solid #d7dded;border-radius:5px;padding:1px 6px;font-family:ui-monospace,monospace;font-size:.82rem}}
  .howto b{{color:var(--navy)}}

  .toc{{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));margin-top:26px}}
  .toc a{{background:#fff;border-radius:15px;padding:17px 18px;text-decoration:none;color:inherit;border-top:5px solid var(--tc);box-shadow:0 2px 16px rgba(13,27,62,.07);display:block}}
  .toc a .em{{font-size:1.7rem;display:block;line-height:1}}
  .toc a b{{display:block;color:var(--navy);font-size:1.05rem;margin:8px 0 3px}}
  .toc a span{{display:block;font-size:.78rem;color:var(--gray)}}

  .pricing{{background:var(--navy);color:#c3cee6;border-radius:16px;padding:22px 25px;margin-top:26px}}
  .pricing h2{{color:var(--gold2);font-size:1.03rem;margin-bottom:10px}}
  .pricing p{{font-size:.89rem}}
  .pricing p+p{{margin-top:9px}}
  .pricing b{{color:#fff}}

  .trk{{background:#fff;border-radius:18px;padding:26px 26px 30px;margin-top:30px;box-shadow:0 2px 20px rgba(13,27,62,.07);border-top:6px solid var(--tc);scroll-margin-top:14px}}
  .trk-head{{display:flex;gap:15px;align-items:center}}
  .trk-em{{font-size:2.5rem;line-height:1}}
  .trk-head h2{{font-size:1.5rem;color:var(--navy);line-height:1.15}}
  .trk-meta{{font-size:.8rem;color:var(--gray);font-weight:700;margin-top:3px}}
  .trk-tag{{font-size:.95rem;margin-top:14px;color:#46536c}}
  .trk h3{{font-size:1.12rem;color:var(--navy);margin:28px 0 8px;padding-top:18px;border-top:2px solid var(--light)}}
  .trk h3.sess{{display:flex;align-items:center;gap:12px;flex-wrap:wrap;border-top-color:var(--tc)}}
  .sess-sub{{font-size:.87rem;color:var(--gray);margin-top:-3px}}
  .lead{{font-size:.88rem;color:var(--gray)}}
  ol.outc{{margin:8px 0 0 22px;font-size:.88rem}}
  ol.outc li{{margin-bottom:5px}}
  .small{{font-size:.84rem;color:#46536c;margin-top:11px}}
  ul.small{{margin-left:22px}}

  .present,.sl-go{{background:var(--navy);color:var(--gold2);border:none;border-radius:9px;padding:7px 13px;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}}
  .present:hover,.sl-go:hover{{background:var(--gold);color:var(--navy)}}
  .sl-go{{background:transparent;color:var(--gray);border:1px solid #dfe4ee;font-size:.7rem;padding:4px 9px;margin-left:auto}}

  .goal{{background:var(--light);border-left:4px solid var(--tc,var(--gold));padding:12px 16px;font-size:.87rem;border-radius:0 10px 10px 0;margin:12px 0 16px}}

  table.run{{width:100%;border-collapse:collapse;font-size:.85rem;margin:0 0 20px}}
  table.run th{{text-align:left;background:var(--navy);color:#fff;padding:8px 11px;font-size:.69rem;text-transform:uppercase;letter-spacing:1.1px}}
  table.run td{{padding:8px 11px;border-bottom:1px solid #edf0f7;vertical-align:top}}
  table.run td:first-child{{white-space:nowrap;font-weight:800;color:var(--navy2);font-variant-numeric:tabular-nums}}
  table.run td a{{color:var(--navy2);font-weight:800;text-decoration:none;padding:0 2px}}
  table.run td a:hover{{text-decoration:underline}}

  .slides{{display:flex;flex-direction:column;gap:12px}}
  .sl,.q{{border:1px solid #e3e8f2;border-radius:12px;padding:15px 17px;break-inside:avoid;scroll-margin-top:14px}}
  .sl-top{{display:flex;align-items:center;gap:9px;margin-bottom:7px}}
  .sl-n{{background:var(--navy);color:var(--gold2);font-weight:900;font-size:.7rem;padding:2px 9px;border-radius:20px}}
  .sl-kind{{font-size:.66rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--gray);font-weight:900}}
  .sl-eyebrow{{color:var(--gold);font-weight:900;letter-spacing:1.8px;font-size:.67rem;text-transform:uppercase;margin-bottom:4px}}
  .sl h4,.q h4{{font-size:1.04rem;color:var(--navy);line-height:1.3;margin-bottom:5px}}
  .sl-sub{{font-size:.88rem;color:var(--gray)}}
  .sl ul{{margin:9px 0 0 21px;font-size:.87rem}}
  .sl ul li{{margin-bottom:4px}}
  .sl-callout{{margin-top:10px;background:#fdf6e3;color:#8a6d16;font-weight:800;font-size:.86rem;padding:9px 13px;border-radius:8px}}
  .sl-ask{{margin-top:9px;background:#e8f9f8;color:#166c68;font-size:.86rem;padding:9px 13px;border-radius:8px}}
  .sl-src{{font-size:.76rem;color:var(--gray);font-style:italic;margin-top:8px}}
  .sl-note{{margin-top:11px;padding-top:9px;border-top:1px dashed #cfd7e6;font-size:.85rem;color:#3d4a63}}
  .sl-note b{{color:var(--navy)}}

  .q{{margin-bottom:11px}}
  ul.choices{{list-style:none;margin:8px 0 0}}
  ul.choices li{{font-size:.87rem;padding:3px 0}}
  ul.choices li.ok{{font-weight:900;color:#1d7a6f}}
  .oath{{font-style:italic;background:var(--light);border-radius:11px;padding:15px 19px;font-size:.88rem;color:#46536c;margin-top:10px}}

  footer{{text-align:center;padding:2.4rem 1.5rem;color:var(--gray);font-size:.84rem}}

  /* ─────────── presenter overlay ─────────── */
  #deck{{position:fixed;inset:0;z-index:999;background:#070e24;display:flex;flex-direction:column}}
  #deck .stage{{flex:1;display:flex;align-items:center;justify-content:center;padding:3vh 4vw;min-height:0}}
  #deck .slide{{width:100%;max-width:1100px;max-height:100%;overflow-y:auto}}
  #deck .d-eyebrow{{color:var(--gold);font-weight:900;letter-spacing:2.5px;font-size:clamp(.62rem,1.1vw,.8rem);text-transform:uppercase;margin-bottom:14px}}
  #deck .d-title{{color:#fff;font-weight:900;line-height:1.12;text-wrap:balance;font-size:clamp(1.5rem,4.4vw,3.1rem)}}
  #deck .d-sub{{color:#b9c6e2;font-size:clamp(.95rem,1.7vw,1.3rem);line-height:1.55;margin-top:16px;max-width:46ch}}
  #deck .d-big{{color:var(--gold2);font-weight:900;line-height:1;font-size:clamp(3.2rem,12vw,9rem);font-variant-numeric:tabular-nums}}
  #deck ul.d-b{{list-style:none;margin-top:26px;display:flex;flex-direction:column;gap:14px}}
  #deck ul.d-b li{{color:#e3e9f6;font-size:clamp(.95rem,1.65vw,1.32rem);line-height:1.5;padding-left:34px;position:relative}}
  #deck ul.d-b li::before{{content:"◆";position:absolute;left:0;top:.08em;color:var(--gold);font-size:.75em}}
  #deck .d-callout{{margin-top:30px;background:rgba(201,168,76,.14);border-left:5px solid var(--gold);border-radius:0 12px 12px 0;padding:16px 22px;color:var(--gold2);font-weight:800;font-size:clamp(.95rem,1.6vw,1.26rem);line-height:1.5}}
  #deck .d-ask{{margin-top:24px;background:rgba(62,198,192,.14);border-left:5px solid var(--teal);border-radius:0 12px 12px 0;padding:16px 22px;color:#8fe6e2;font-weight:800;font-size:clamp(.95rem,1.6vw,1.26rem);line-height:1.5}}
  #deck .d-src{{margin-top:22px;color:#7f91b4;font-size:clamp(.7rem,1vw,.84rem);font-style:italic}}
  #deck .slide[data-kind="title"],#deck .slide[data-kind="section"],#deck .slide[data-kind="stat"]{{text-align:center}}
  #deck .slide[data-kind="title"] .d-sub,#deck .slide[data-kind="section"] .d-sub,#deck .slide[data-kind="stat"] .d-sub{{margin-left:auto;margin-right:auto}}
  #deck .slide[data-kind="section"] .d-title{{color:var(--gold2);font-size:clamp(2rem,6.5vw,4.4rem)}}
  #deck .slide[data-kind="rules"] ul.d-b li::before{{content:"▸";color:var(--teal)}}
  #deck .slide[data-kind="scenario"] ul.d-b li::before{{content:"✕";color:var(--danger);font-size:.85em}}
  #deck .slide[data-kind="recap"] ul.d-b li::before{{content:"✚";color:var(--success)}}
  #deck .slide[data-kind="recap"] .d-title{{color:var(--success)}}
  #deck .prog{{height:4px;background:rgba(255,255,255,.1)}}
  #deck .prog>i{{display:block;height:100%;background:var(--gold);transition:width .22s ease}}
  #deck .bar{{background:#050a1b;border-top:1px solid rgba(255,255,255,.09);padding:9px 14px;display:flex;align-items:center;gap:11px;flex-wrap:wrap;font-size:.78rem;color:#8fa3cc}}
  #deck .bar .who{{font-weight:900;color:var(--gold)}}
  #deck .bar .seg{{color:#c3cee6}}
  #deck .bar .sp{{flex:1}}
  #deck .bar button{{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#dbe3f3;border-radius:8px;padding:6px 11px;font:inherit;font-weight:800;cursor:pointer}}
  #deck .bar button:hover{{background:rgba(201,168,76,.25);border-color:var(--gold)}}
  #deck .bar button[aria-pressed="true"]{{background:var(--gold);color:var(--navy);border-color:var(--gold)}}
  #deck .bar .cnt{{font-variant-numeric:tabular-nums;font-weight:900;color:#fff}}
  #deck #dnotes{{background:#0f1830;border-top:2px solid var(--gold);padding:15px 21px;max-height:32vh;overflow-y:auto}}
  #deck #dnotes .lbl{{color:var(--gold);font-weight:900;font-size:.67rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}}
  #deck #dnotes p{{color:#d6ddee;font-size:.95rem;line-height:1.68;max-width:92ch}}

  :focus-visible{{outline:3px solid var(--gold);outline-offset:2px}}

  @media print{{
    body{{background:#fff}}
    .cover{{background:#0d1b3e!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    .wrap{{max-width:none;padding:0}}
    .present,.sl-go,.noprint,#deck{{display:none!important}}
    .trk{{box-shadow:none;border-radius:0;padding:0;margin-top:0;break-before:page}}
    .trk h3.sess{{break-before:page}}
    .toc,.pricing,.howto{{break-inside:avoid}}
  }}
  @media (max-width:620px){{
    #deck .bar .hide-sm{{display:none}}
  }}
</style>
</head>
<body>

<div class="cover">
  <div class="eyebrow">Digital Safety Knights</div>
  <h1>Certification Programme — Complete Facilitator Pack</h1>
  <p>Everything needed to run the course: the minute-by-minute run sheet, every slide,
  every presenter note, the full exam with its answer key, and a live presenter deck —
  all in this one file, working offline.</p>
  <div class="nums">
    <span>4 tracks · ages 6 to adult</span>
    <span>{total_slides} slides</span>
    <span>{total_q} exam questions</span>
    <span>No internet needed</span>
  </div>
</div>

<div class="wrap">

  <div class="howto">
    <h2>Nasıl kullanılır</h2>
    <p><b>Bu dosya tek başına çalışır.</b> İnternet, sunucu, kurulum gerekmiyor — çift tıklayın,
    tarayıcıda açılır. USB'ye atabilir, e-postayla gönderebilir, okula verebilirsiniz.</p>
    <p><b>Sunmak için:</b> herhangi bir oturumun yanındaki <b>▶ Present this session</b> düğmesine
    basın. Tam ekran deck açılır. <kbd>→</kbd> <kbd>Boşluk</kbd> ileri, <kbd>←</kbd> geri,
    <kbd>N</kbd> sunucu notları, <kbd>F</kbd> tam ekran, <kbd>Esc</kbd> çıkış.
    Zoom'da ekranı paylaşırken notları <b>kapalı</b> tutun; notlar sizin için, oda için değil.</p>
    <p><b>Yazdırmak için:</b> ⌘P. Her parça yeni sayfadan başlar, düğmeler basılmaz.
    PDF olarak kaydedip internetsiz sınıfta kullanabilirsiniz.</p>
    <p><b>Dikkat:</b> cevap anahtarı bu dosyanın içinde. <b>Öğrencilere bu dosyayı vermeyin</b> —
    onlar sınava <b>digitalsafetyknights.org/certification-exam.html</b> adresinden girer.</p>
    <p><b>Dil:</b> ders içeriği İngilizce yazıldı (ilk grup İngilizce olacağı için). Canlı oturum
    Türkçe, İspanyolca ve Fransızca da verilebilir; sitedeki tanıtım sayfası dört dilde.</p>
  </div>

  <div class="toc">{toc}</div>

  <div class="pricing">
    <h2>What it costs</h2>
    <p><b>Nothing. Not the course, not the certificates, not the longer version.</b> We are a
    nonprofit and this is what we exist to do. There is no paid tier, no upgrade and nothing
    held back — a school that wants the two-hour course, the four-session version, verified
    certificates for every student and a parent evening on top pays nothing for any of it.</p>
    <p><b>Included, free:</b> a live cohort for your class, or 4 × 60 minutes over four weeks
    if you want the longer version; every slide deck and facilitator guide; the exam, open
    book, with unlimited retakes; a certificate with each student's name on it; a pre- and
    post-assessment; a class report for the teacher; a parent-evening Guardian session.
    English, Spanish, French or Turkish. No account, no login, no student data collected by
    the self-serve route.</p>
    <p><b>One thing worth arranging in advance:</b> a proctored sitting, certificates issued
    from your roster each carrying a reference we can confirm, and a “Digital Safety
    Certified” seal for your website. Also free — it just needs asking for, because the
    self-serve certificate is issued in the student's own browser and we did not watch them
    sit the exam.</p>
    <p>We take donations, and that is the only money involved anywhere. We come as volunteers
    rather than vendors. If anyone ever asks you to pay for something in our name, that is
    not us — please tell us.</p>
  </div>

{"".join(track_section(d) for d in tracks)}

</div>

<footer>⚔️ Digital Safety Knights · digitalsafetyknights.org · Certification Programme, complete facilitator pack</footer>

<!-- ─────────── presenter overlay ─────────── -->
<div id="deck" hidden>
  <div class="stage"><div class="slide" id="dslide" tabindex="-1"></div></div>
  <div class="prog"><i id="dprog"></i></div>
  <div class="bar">
    <span class="who" id="dwho"></span>
    <span class="seg hide-sm" id="dseg"></span>
    <span class="sp"></span>
    <button type="button" id="dprev" aria-label="Previous">←</button>
    <span class="cnt"><span id="di">1</span>/<span id="dn">1</span></span>
    <button type="button" id="dnext" aria-label="Next">→</button>
    <button type="button" id="dnotesbtn" aria-pressed="false" title="Presenter notes (N)">📝 <span class="hide-sm">Notes</span></button>
    <button type="button" id="dfull" title="Fullscreen (F)">⛶</button>
    <button type="button" id="dclose" title="Close (Esc)">✕ <span class="hide-sm">Close</span></button>
  </div>
  <div id="dnotes" hidden><div class="lbl">Presenter notes</div><p id="dnotesbody"></p></div>
</div>

<script id="dsk-data" type="application/json">{DATA}</script>
<script>
(function () {{
  'use strict';
  var DATA = JSON.parse(document.getElementById('dsk-data').textContent);
  var el = function (id) {{ return document.getElementById(id); }};
  function esc(s) {{
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }}

  var cur = null, i = 0, notesOn = false, lastFocus = null;

  function body(s) {{
    var h = '';
    if (s.eyebrow) h += '<div class="d-eyebrow">' + esc(s.eyebrow) + '</div>';
    if (s.kind === 'stat') {{
      h += '<div class="d-big">' + esc(s.title) + '</div>';
      if (s.subtitle) h += '<div class="d-sub">' + esc(s.subtitle) + '</div>';
    }} else {{
      if (s.title) h += '<h2 class="d-title">' + esc(s.title) + '</h2>';
      if (s.subtitle) h += '<div class="d-sub">' + esc(s.subtitle) + '</div>';
    }}
    if (s.ask) h += '<div class="d-ask">' + esc(s.ask) + '</div>';
    if (s.bullets && s.bullets.length) {{
      h += '<ul class="d-b">' + s.bullets.map(function (b) {{ return '<li>' + esc(b) + '</li>'; }}).join('') + '</ul>';
    }}
    if (s.callout) h += '<div class="d-callout">' + esc(s.callout) + '</div>';
    if (s.source) h += '<div class="d-src">Source: ' + esc(s.source) + '</div>';
    return h;
  }}

  function segFor(n) {{
    var segs = cur.sess.segments || [];
    for (var k = 0; k < segs.length; k++) {{
      if ((segs[k].slides || []).indexOf(n) !== -1) return segs[k].minutes + ' · ' + segs[k].label;
    }}
    return cur.sess.title;
  }}

  function draw() {{
    var s = cur.slides[i];
    var node = el('dslide');
    node.setAttribute('data-kind', s.kind || 'teach');
    node.innerHTML = body(s);
    node.scrollTop = 0;
    el('di').textContent = i + 1;
    el('dn').textContent = cur.slides.length;
    el('dseg').textContent = segFor(i + 1);
    el('dprog').style.width = ((i + 1) / cur.slides.length * 100) + '%';
    el('dnotesbody').textContent = s.notes || '— no note for this slide —';
    el('dprev').disabled = i === 0;
    el('dnext').disabled = i === cur.slides.length - 1;
  }}

  function go(n) {{ i = Math.max(0, Math.min(cur.slides.length - 1, n)); draw(); }}

  function open(tid, sn, start) {{
    var d = DATA[tid];
    if (!d) return;
    var sess = d.sessions.filter(function (s) {{ return s.n === sn; }})[0];
    if (!sess) return;
    cur = {{ d: d, sess: sess, slides: sess.slides || [] }};
    if (!cur.slides.length) return;
    i = Math.max(0, Math.min(cur.slides.length - 1, (start || 1) - 1));
    el('dwho').textContent = (d.emoji || '') + ' ' + d.track + ' · Session ' + sn;
    lastFocus = document.activeElement;
    el('deck').hidden = false;
    document.body.style.overflow = 'hidden';
    draw();
    el('dslide').focus();
  }}

  function close() {{
    el('deck').hidden = true;
    document.body.style.overflow = '';
    if (document.fullscreenElement) document.exitFullscreen();
    cur = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }}

  // Every "present" button in the document, including the per-slide ones.
  Array.prototype.forEach.call(document.querySelectorAll('.present, .sl-go'), function (b) {{
    b.addEventListener('click', function () {{
      open(b.getAttribute('data-t'),
           parseInt(b.getAttribute('data-s'), 10),
           parseInt(b.getAttribute('data-i'), 10));
    }});
  }});

  el('dprev').onclick = function () {{ go(i - 1); }};
  el('dnext').onclick = function () {{ go(i + 1); }};
  el('dclose').onclick = close;
  el('dnotesbtn').onclick = function () {{
    notesOn = !notesOn;
    el('dnotes').hidden = !notesOn;
    el('dnotesbtn').setAttribute('aria-pressed', String(notesOn));
  }};
  el('dfull').onclick = function () {{
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  }};

  document.addEventListener('keydown', function (ev) {{
    if (el('deck').hidden) return;
    var k = ev.key;
    if (k === 'ArrowRight' || k === ' ' || k === 'PageDown') {{ ev.preventDefault(); go(i + 1); }}
    else if (k === 'ArrowLeft' || k === 'PageUp') {{ ev.preventDefault(); go(i - 1); }}
    else if (k === 'Home') {{ ev.preventDefault(); go(0); }}
    else if (k === 'End') {{ ev.preventDefault(); go(cur.slides.length - 1); }}
    else if (k === 'Escape') {{ ev.preventDefault(); close(); }}
    else if (k === 'n' || k === 'N') {{ el('dnotesbtn').click(); }}
    else if (k === 'f' || k === 'F') {{ el('dfull').click(); }}
  }});

  // swipe, for presenting from a tablet
  var x0 = null;
  el('deck').addEventListener('touchstart', function (ev) {{ x0 = ev.touches[0].clientX; }}, {{ passive: true }});
  el('deck').addEventListener('touchend', function (ev) {{
    if (x0 === null) return;
    var dx = ev.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 55) go(i + (dx < 0 ? 1 : -1));
    x0 = null;
  }}, {{ passive: true }});
}})();
</script>
</body>
</html>
"""

OUT.write_text(DOC, encoding="utf-8")
print(f"wrote {OUT}")
print(f"  {OUT.stat().st_size/1024:.0f} KB")
print(f"  {len(tracks)} tracks · {total_slides} slides · {total_q} exam questions")
