# Chapter 10 — Site-Wide Consistency Pass

Companion to `CHAPTER9_CONTENT_PLAN.md`. Where Chapter 9 is about *what the
site says* (sourced content, named threats), Chapter 10 is about *whether
every page holds itself to the same bar* — the kind of drift that's invisible
page-by-page but reads as "small team" the moment someone compares two pages
side by side or shares a link and gets a broken preview.

Findings below are from actually grepping the 31 live pages, not guesswork.

---

## 10.1 — Open Graph tags missing on 29 of 31 pages *(highest priority)*

Only `index.html` and 2 others have `og:title`. Every other page — including
`audit.html` (the flagship tool), `quests.html`, `resources.html`, and every
guide/tool page — has **no Open Graph metadata at all**. Concretely: when
any of these 29 pages get shared on LinkedIn, Facebook, iMessage, Slack, or
Discord, the preview card shows either nothing or a broken/generic fallback.

This is the single most visible "small operation" tell on the list — a
100-engineer org's marketing/growth team would never ship a page without a
link-preview card, and DSK's own growth channels (LinkedIn per
`DSK_MASTER_STRATEGY.md`, the dsk-shorts social pipeline) depend on people
sharing site links.

**Fix:** add `og:title`, `og:description`, `og:image` (reuse `logo.png` or a
page-appropriate character image), and `og:url` to all 29 pages. Mechanical,
low-risk, high visible payoff — good first item.

## 10.2 — Meta descriptions missing on 6 pages

`audit.html`, `dashboard.html`, `certificate.html`, `login.html`,
`donation-success.html`, `404.html` have no `<meta name="description">`.
Audit and Dashboard are flagship pages — their absence here directly hurts
SEO (Google shows a random text fragment instead of a written description)
and compounds the OG-tag gap above (some OG fallback logic on social
platforms reuses the meta description when `og:description` is also
missing).

**Fix:** one-line addition per page, 6 pages total.

## 10.3 — Knight Points inconsistently wired across interactive pages

12 pages don't load `knight-points.js`. Some of that is correct by design
(login/404/donation-success/about/origin-story aren't interactive — no
points to award). But several are genuinely interactive, kid-facing tool
pages that plausibly *should* participate in the points/badge system for
consistency with the rest of the site's gamification, and currently don't:
`ask-shieldy.html`, `glitch-detector.html`, `password-dojo.html`,
`tactic-almanac.html`, `knights.html`, `knight-chronicles.html`,
`shieldys-journal.html`.

**Needs a decision, not just a fix:** for each of these 7, is the omission
intentional (e.g. Ask Shieldy is a reference/FAQ tool, arguably fine without
points) or a gap (Glitch Detector and Password Dojo are core interactive
tools — no points on those feels like an oversight)? Recommend: audit each
of the 7 individually rather than blanket-adding points everywhere.

## 10.4 — Search widget / Play-Now FAB coverage

4 pages lack `site-search.js` (404, certificate, donation-success, login) —
all defensible (transactional/error pages, not places you'd search from).
`game.html` lacking the Play-Now FAB is correct (it *is* the game). No real
gap here — listed for completeness since it was checked, not because it
needs work.

## 10.5 — Post-Spanish-launch re-sweep

Chapter 8 added Spanish across all 31 pages via parallel agents; Chapter 9
will add new pages (Discord guide, 764 Network journal issue, sources page,
stats page). Once Chapter 9 ships, re-run the same CDP-based QA sweep used
for the Turkish and Spanish rollouts (load every page in all 3 languages,
zero console errors, correct `lang` attribute, correct PDF link suffix) so
new pages don't silently miss localization the older ones already have.

---

## Priority order — ALL ITEMS DONE as of 2026-09-13

1. **10.1 — OG tags.** Found already done on all but 2 pages (`apply.html`,
   `stats.html` — both intentionally noindex/internal) by the time this was
   checked; this doc's "29 of 31 missing" finding was stale.
2. **10.2 — Meta descriptions.** DONE — added to all 6 pages (audit,
   dashboard, certificate, login, donation-success, 404), reusing each
   page's existing `og:description` text.
3. **10.3 — Knight Points audit.** Decision made: add to all 7 (not just
   the 2 recommended). `glitch-detector.html`, `password-dojo.html`, and
   `ask-shieldy.html` got real completion hooks (`markComboActivity`/
   `addPoints` on an actual check/answer-reveal event, guarded by
   `if(window.DSKPoints)` so nothing breaks if the script fails to load).
   `tactic-almanac.html`, `knights.html`, `knight-chronicles.html`, and
   `shieldys-journal.html` got `knight-points.js` loaded + a `checkStreak()`
   call so a visit still counts toward the daily streak, since they're
   reference/reading pages with no natural "activity" to mark.
4. **10.5 — Re-sweep.** Not run this pass — worth a dedicated CDP sweep
   (all pages × 3 languages, zero console errors) before the next content
   push, per the original recommendation.

---

## On "looks like 100 engineers" beyond code

Chapters 9 and 10 close the content-authority and technical-consistency
gaps — both are real and both are buildable. Two things raised in
conversation aren't, and are worth being direct about rather than folding
into a chapter that implies they're a build task:

**Third-party validation** (press, partnerships, a named advisor) — no
code produces this. Concrete, honest next steps that exist *right now*
without overstating anything:
- `DSK_MASTER_STRATEGY.md` already lists real partnership targets
  (ConnectSafely, Common Sense Media, NCMEC's education arm, National PTA,
  ikeepsafe) — reaching out to be *listed as a resource* by any one of them
  is a realistic, achievable near-term win and is the kind of third-party
  validation that actually matters (more than a testimonials page DSK wrote
  itself).
- The Finland pilot (mentioned in `DSK_MASTER_STRATEGY.md`'s Q3 2026 plan)
  becomes a genuine, honest partnership story the moment it happens — worth
  a dedicated Journal/press item when it does, not before.
- The MITdesignX/Le Rosey accelerator affiliation, if DSK is genuinely
  participating, is a legitimate credibility marker to surface on the site
  now (an "About" mention) — only if that's accurate to state.

**Scale signals** (support channel, testimonials, changelog) — mostly
require the thing to actually exist before the site can honestly show it:
- A public changelog/"what's new" log (the site already has a "What's New"
  banner mechanism from Chapter 7/8 work — extending it into a permanent,
  dated changelog page is a legitimate, low-effort scale signal that's
  *true* rather than performative).
- Testimonials require real users first — the school pilot kit (P4 in
  `DSK_MASTER_STRATEGY.md`) and the 3 free school pilots targeted for Q4
  2026 are the actual path to this, not a landing-page section written in
  advance of having any.

None of this should be faked — `DSK_MASTER_STRATEGY.md`'s own ethics
guardrails ("every safety claim sourced") extend naturally to "every
credibility claim is real." The honest version of "looks like 100
engineers" is: ship 9 and 10 now (both are true immediately), and let
partnerships/pilots/press compound the rest over the next 2-3 quarters as
they actually happen.
