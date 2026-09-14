# Chapter 11 — Membership & Organization (make it feel like a real club)

Added to the queue per Osman's request: make membership more active and
professional — modeled on real member organizations (Lions Clubs, Scouts,
4-H), not just a free content site with a login. Researched all three below
for what actually transfers to a free, kid-facing, child-safety org.

**Where DSK already stands today** (checked against the live site before
writing this): membership is Individual/Family/School, all free, via a
signup modal → a solo per-user Dashboard (points, badges, stats). There's a
real Discord server already linked site-wide. There is **no** recurring
event, no member ID/card, no member-count social proof, no youth voice
mechanism, and no formalized "level up" ceremony beyond a toast notification.
`DSK_MASTER_STRATEGY.md` already *plans* several of the highest-leverage
fixes here (Weekly Knight Report email, Knight Council teen-ambassador
program, structured Discord roles) — this chapter's job is mostly to pull
those forward from "planned" to "built," plus add what the research below
surfaces as missing.

---

## What real membership orgs do that DSK doesn't yet

**Lions Clubs International:**
- Distinct membership *types* with different roles (Active, Family,
  Student, and — most relevant — **Leo membership**, ages 12-30, explicitly
  for young people who want to serve their community). DSK's planned
  **Knight Council** (teen ambassadors, per `DSK_MASTER_STRATEGY.md`) is
  already this pattern; it just isn't built yet.
- A visible **hierarchy** (club → zone → district → international) that
  gives individual members a sense of belonging to something much bigger
  than their local group.
  [Source](https://www.lionsclubs.org/en/about-us/our-membership/how-our-membership-works)

**Girl Scouts / Scouts BSA:**
- **Age-based membership levels** with a real "bridging" ceremony when a
  member advances (Daisy → Brownie → Junior → Cadette → Senior →
  Ambassador). DSK's badge ladder (Bronze Squire → Digital Knight) is the
  same shape but currently just unlocks quietly — no ceremony moment.
- **Youth-led troops, adult-supported** — kids run it, adults guide safety.
  [Source](https://en.wikipedia.org/wiki/Membership_levels_of_the_Girl_Scouts_of_the_USA)

**4-H:**
- **Youth-led governance** — members vote on activities, elect officers,
  help decide what the club does next. This is the single most transferable
  idea DSK doesn't do at all right now: every interaction today is
  one-directional (DSK publishes, member consumes).
- Structures engagement around four pillars: meetings, social events,
  service projects, leadership opportunities — a useful checklist for what
  "active" membership actually requires beyond content.
  [Source](https://extension.purdue.edu/4-H/about/types-of-involvement.html)

---

## The plan

### 11.1 — Ship the Parent Loop that's already planned but not built
`DSK_MASTER_STRATEGY.md` Phase 3 already specifies a **Weekly Knight
Report** email (one threat + one conversation starter per week) and a
weekly Discord "Ask a Knight" event. Neither exists yet. This is the
single highest-leverage item — a real, recurring touchpoint is what every
org above has and DSK doesn't. Needs a decision from Osman first: which
email provider (Buttondown/Mailerlite vs. reusing the existing
`lambda_newsletter.py`/SES path — the site's own `DISCOVERY.md` already
recommended reusing SES to avoid a new paid dependency).

### 11.2 — Build the Knight Council (teen ambassador program)
Already named and scoped in `DSK_MASTER_STRATEGY.md` as a press-worthy,
youth-led differentiator, led by Ayşe. This is DSK's direct equivalent of
Lions' Leo membership and Scouts' youth-led-troop model. Concretely: an
application/nomination flow on the site, a distinct Discord role, and —
borrowing from 4-H — actual decision-making power (e.g., Knight Council
members vote monthly on the next quest topic or Journal focus, not just
receive content).

### 11.3 — A real member ID / certificate, not just a dashboard
DSK already has `certificate.html` for quest-completion certificates —
extend that same infrastructure into a **Member ID Card**: member's chosen
nickname, join date, current rank/badge, member number, printable/shareable,
generated client-side (same COPPA-safe, no-PII pattern already used for
quest certificates). This is the site's cheapest path to the tangible
"membership artifact" every one of the researched orgs has (Scout card,
Lions pin, 4-H pin).

### 11.4 — Formalize the rank-up moment into a real ceremony
Right now leveling up (Squire → Knight → Sentinel → Champion, per
`knight-points.js`) is a toast notification. Borrowing Scouts' "bridging"
ceremony: give it a real on-site moment — a full-screen celebration with
the new rank's art, a shareable card ("I just became a Champion Knight!"),
and an update to the Member ID Card (11.3) reflecting the new rank.

### 11.5 — Visible member-count social proof
Every researched org makes its scale visible (Lions' international
membership count, Scout troop rosters). Add a real, honest count — total
signed-up members — to the homepage stats-ticker (already exists,
`index.html`'s rotating facts widget) once real signup numbers exist to
show. **Do not fabricate a number before there's a real one to show** —
this is exactly the kind of credibility claim `DSK_MASTER_STRATEGY.md`'s
ethics guardrails rule out. Ship this only when the underlying count is
real and pulled from actual signup data.

### 11.6 — Youth voice mechanism (the 4-H lesson)
The most transferable, least-built idea: give members actual input, not
just content. Simplest version: a monthly lightweight poll (e.g., "Vote:
what should next month's Knight Rule short be about?") surfaced on the
Dashboard and in the Discord server, results feeding real content decisions
DSK actually makes. Turns membership from passive to participatory with
minimal engineering — no new backend needed if implemented as a
Discord-poll + a `localStorage`-recorded "I voted" badge.

---

## Priority order — status as of 2026-09-13

1. **11.1 — Weekly Knight Report.** DONE — `dsk-weekly-report` Lambda,
   live every Monday, reuses SES (no new provider needed). Its "Ask a
   Knight" section is folded into the email itself rather than a separate
   live Discord event.
2. **11.3 — Member ID Card.** DONE — `member-id.html` live.
3. **11.4 — Rank-up ceremony.** DONE — `showRankUpCeremony` in
   `knight-points.js` was a full-screen celebration but had no shareable
   moment; added a Share button (Web Share API, clipboard-copy fallback)
   2026-09-13.
4. **11.2 — Knight Council.** Partially done — application flow
   (`knight-council.html` + `dsk-knight-council` Lambda) is live, but the
   4-H-style "actual decision-making power" piece was never built as its
   own mechanism. In practice this is now satisfied by 11.6's monthly poll
   (open to all members, not Council-exclusive) rather than a separate
   Council-only vote — a real gap only if Osman wants voting power
   specifically restricted to Council members.
5. **11.6 — Monthly member vote.** DONE — live poll widget on the
   homepage, backed by `dsk-monthly-poll` + `dsk-monthly-poll-votes`.
   Zero votes cast so far (distribution problem, same as Knight Council's
   zero applications — not a missing-feature problem).
6. **11.5 — Member-count social proof.** DONE — homepage stats show the
   real founding-member count (fixed during the Realm redesign), not a
   fabricated number.

**Still genuinely open:** whether Knight Council should get its own
Council-only voting power (vs. the shared open poll), the live weekly
"Ask a Knight" Discord *event* (as opposed to the emailed Q&A), and
physical membership items — all three need Osman's decision, not more
building on spec.

## What needs Osman's decision before any of this is built
- Email provider for 11.1 (reuse existing SES/`lambda_newsletter.py`, or a
  new provider).
- Whether Knight Council (11.2) launches with an application form or an
  invite/nomination model (Lions' model) — affects how much moderation
  overhead it creates.
- Whether printed physical membership items (an actual mailed card or pin)
  are ever in scope, or everything stays digital/printable-at-home — changes
  cost and logistics substantially.
