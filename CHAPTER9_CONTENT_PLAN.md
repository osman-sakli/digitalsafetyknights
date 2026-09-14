# Chapter 9 — Content Authority & Threat-Intelligence Plan

Companion to `RESEARCH_BANK.md` (the sourced research this plan is built
from) and `DSK_MASTER_STRATEGY.md` (business/product roadmap — this plan is
scoped to *content and site credibility*, not monetization or the Guardian
app, though item 9.6 below touches Guardian positioning directly).

**Goal:** close the gap between "well-designed education site" and "the
resource a journalist, school counselor, or state AG's office would actually
cite" — i.e., the "veteran security organization" positioning Osman asked
for. That comes from three things this plan targets: (1) naming and covering
threats the site currently misses entirely, (2) making every claim
traceable to a real source, and (3) demonstrating currency — showing the
site tracks *this month's* news, not just evergreen tactics.

---

## 9.1 — New Guide: Discord Parent Guide *(highest priority)*

**Why:** Discord is central to the single most active 2026 litigation wave
(Nevada, Texas, New Jersey suits, all in the last 16 months) and is the
platform where the 764 Network's escalation phase happens — yet DSK has
guides for Roblox, iPhone/Android, and general AI safety, but nothing
dedicated to Discord specifically, despite mentioning it in passing on 6+
pages already.

**Scope:** mirror the existing `roblox-parent-guide.pdf` structure —
server-privacy settings, DM restrictions, age gates (Discord's are known to
be weak — worth stating plainly), how predators use "safe" public servers to
funnel kids into private ones, what a parent should actually look at on
their kid's account in 10 minutes. Cross-link from the Roblox guide ("if your
child mentions a Discord server tied to a Roblox game, read this next").

**Deliverable:** `frontend/guides/discord-parent-guide.pdf` (+ Turkish/Spanish
versions, matching the existing 8-guide localization pattern), added to
`resources.html`, `index.html`, `academy.html`'s quest+guide path, and
`site-search.js`'s index.

---

## 9.2 — New Journal Issue: "The 764 Network" *(highest priority)*

**Why:** this is the single biggest content gap found in the research pass.
It's FBI-confirmed, spans all 56 field offices, has a documented child
death, and operates on exactly the two platforms DSK already teaches kids
about — but the network itself is never named on the site. Naming it
correctly (soberly, not sensationalized, matching the Journal's existing
tone) is exactly the kind of specific, current, sourced content that
signals "we track this space professionally" rather than "we have generic
safety tips."

**Scope:** October 2026 Journal issue (Volume 1, Issue 9), following the
established template (`journal/*.html`). Cover: what 764 is, how the
Roblox→Discord pipeline works, the specific manipulation tactics (peer
posing, shared-interest trust-building, blackmail escalation), what a parent
should watch for, and — critically — that "764" itself is not a name a
child needs to fear, the *pattern* is what matters (consistent with DSK's
"teach the pattern, not a boogeyman" voice already used for Glitch/predator
content).

**Note:** requires careful, non-sensationalized handling given a documented
death is involved — same care already applied to the September AI-chatbot
issue's discussion of the Character.AI suicide case (crisis resources box,
factual framing, no graphic detail).

---

## 9.3 — Incident-Response Guide Update: Federal TAKE IT DOWN Act

**Why:** the current `incident-response-guide.pdf` only references NCMEC's
own (older, voluntary) "Take It Down" hash-matching tool. The *federal law*
(enforcement began May 2026, mandatory 48-hour platform removal, FTC
penalties) is a materially stronger, more current tool for a parent dealing
with a live incident — and DSK isn't telling anyone it exists yet.

**Scope:** add a clearly-labeled section: "Federal law now requires
platforms to remove this within 48 hours" — what qualifies, how to file a
request, what to do if a platform misses the deadline (FTC complaint path).
Update in all three languages once written.

---

## 9.4 — Guide Refresh: Roblox & Snapchat-Specific Content

**Why:** two platform-specific gaps found in the research:
- **Roblox guide is now partially outdated in a good way** — several
  "here's how to manually enable X" steps (chat off for under-9, DM
  auto-block under 13) are now Roblox's *default* as of its April 2026
  safety rollout. Leaving the guide as-is makes DSK look behind the news;
  updating it to say "Roblox made this the default in April 2026 — verify
  it's still on, since defaults can be quietly reverted after account
  changes" is more accurate *and* more credible.
- **No Snapchat-specific guide exists at all**, despite Snapchat being
  named in DSK's own audit/journal content already. The most concrete,
  specific, actionable gap: **Snap Map location sharing** is the exact
  mechanism named in the "Sextortion Handbook" cited in active 2026
  litigation. "Turn off Snap Map" is a 30-second, high-value, specific
  action DSK isn't currently telling parents about anywhere.

**Scope:** revise `roblox-parent-guide.pdf` (note new defaults, reframe as
verification rather than pure setup); either fold Snapchat into a broader
guide or add it as guide #9 (`snapchat-parent-guide.pdf`) — recommend the
latter, matching the one-platform-per-guide pattern already established.

---

## 9.5 — Credibility Infrastructure (the actual "veteran company" ask)

This is the section that most directly answers "make us look like a real
security information veteran company." Four concrete additions:

### 9.5.a — Sources & Research page (`/sources.html` or `/research.html`)
A public-facing, human-readable version of `RESEARCH_BANK.md` — every
statistic DSK cites anywhere on the site (in guides, journal issues, audit
scoring rationale) gets one canonical, dated, linked source here. This is
standard practice for every organization DSK should be positioned next to
(NCMEC, Thorn, ConnectSafely, ikeepsafe) and is currently the single
starkest gap versus those orgs — right now DSK states facts with no visible
sourcing trail at all.

### 9.5.b — "By the Numbers" stats page
A single page (or homepage section) surfacing the highest-impact numbers
from `RESEARCH_BANK.md` in the visual style already used for Journal
stat-boxes: e.g. "1.4M online enticement reports in 2025 (+156% YoY)" ·
"137 financial sextortion reports every day" · "764: 350+ FBI subjects, 56
field offices." Update quarterly as NCMEC/FBI publish new figures. This is
also directly reusable as shareable social content (dsk-shorts/LinkedIn).

### 9.5.c — Legislative tracker (light-touch)
A short, plain-language "what's changing" list: KOSA/KIDS Act status, TAKE
IT DOWN Act (already live — tell parents what it means for them), App Store
Accountability Acts (which states, what they'll require, effective dates),
school phone-ban map. Doesn't need to be exhaustive — a parent-facing "here's
what's actually law right now vs. still pending" is valuable and rare; most
coverage of this space is written for lawyers, not parents.

### 9.5.d — Expert/advisory framing — DONE (2026-09-12)
Decision: no separate named advisor/board — extend the existing real
"DSK Research Team" byline (already used on Journal issues) to guides
instead of inventing a new credential. Implemented as a "✓ Reviewed by
DSK Research Team" line on all 10 downloadable guide cards on
`resources.html`, with matching `tr.json`/`es.json` translations
(`guide.reviewedBy`).

---

## 9.6 — Positioning Note for the Guardian App (P3 in `DSK_MASTER_STRATEGY.md`)

Ties back to the "should I build a separate app" question from earlier:
the competitive research (Section 6 of `RESEARCH_BANK.md`) confirms
Guardian's planned differentiation — on-device analysis, transparent to the
child, coaching not surveillance — is genuinely not claimed by Bark,
Qustodio, or Aura in 2026. That's a real, defensible gap, not just a nice
pitch. Worth pulling forward: the 764 Network and Discord-litigation content
above is a natural on-ramp to Guardian's beta recruitment messaging ("here's
the threat, here's the free education, here's the tool for real-time
coverage") once Guardian reaches its Q4 2026 private beta.

---

## Priority order (do in this sequence) — ALL ITEMS DONE as of 2026-09-12

1. **9.2 — 764 Network Journal issue.** DONE — covered in the October 2026
   Journal issue (already generated in S3, correctly held back from the
   live site until October actually arrives, per the Journal real-time-
   cadence rule).
2. **9.5.a + 9.5.b — Sources page + stats page.** DONE — merged into one
   page (`sources.html`), carrying the NCMEC/FBI/764 figures from
   `RESEARCH_BANK.md`.
3. **9.1 — Discord Parent Guide.** DONE — `guides/discord-parent-guide.pdf`
   (+ TR/ES) shipped, wired into `resources.html`.
4. **9.3 — Incident-response guide TAKE IT DOWN Act update.** DONE — the
   48-hour federal removal window is in the guide and its on-site summary.
5. **9.4 — Roblox refresh + Snapchat guide.** DONE — `snapchat-parent-guide.pdf`
   shipped; the Roblox guide PDF already reflected the April 2026 default-
   settings change, but its on-site "60-second" summary bullet was stale
   (still said "turn on," not "verify it's still on") — fixed 2026-09-12.
6. **9.5.c — Legislative tracker.** DONE — `legislative-tracker.html` live.
7. **9.5.d — Expert/advisory framing.** DONE (2026-09-12) — see above:
   extended the existing "DSK Research Team" byline to guides rather than
   inventing a new credential.

## Ongoing

- Treat `RESEARCH_BANK.md` as living — refresh monthly, feed directly into
  each new Monthly Journal issue's topic selection (already the site's best
  mechanism for "we're current," just needs a reliable input pipeline —
  this file is that pipeline).
- Every new guide/journal issue should get 2-3 citations from
  `RESEARCH_BANK.md` inline, matching the Journal's existing stat-box
  convention — this is the cheapest, highest-leverage way to compound the
  "veteran organization" positioning across all future content, not just
  the items above.
