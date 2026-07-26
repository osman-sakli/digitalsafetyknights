# DSK Master Strategy — Product, Revenue & Growth Roadmap

Digital Safety Knights → from free content site to a **product-led, revenue-generating global child-safety organization**.
Companion to `DSK_SITE_SPEC.md` (site implementation). This file is the strategy bible.

---

## 1. The Flywheel (how everything connects)

```
 Daily Shorts (TikTok/YT/IG/FB)          "Kids love it"
        │ "Play today's quest"                 │
        ▼                                      ▼
 Site: Quests + Badges (FREE, kids) ──► Parents see value ──► Weekly Knight Report (email)
        │                                      │
        │ trust built                          ▼
        ▼                          DSK GUARDIAN app (PREMIUM $) ◄─── the revenue engine
 Schools ask for it ──► School licenses ($) ──► Grants & partnerships ($)
```

One rule: **the free core for kids is never paywalled.** Money comes from adults (parents, schools, funders) — never from a child's safety.

---

## 2. Product Portfolio (build in this order)

### P1 — DSK Quests + Badges (free · kids · engagement engine)
Already specified in `DSK_SITE_SPEC.md` Phases 1–2. This is the product demo for the accelerator.

### P2 — Glitch Detector (free · viral wedge · NEW)
A public tool: paste a suspicious message / upload a screenshot → instant kid-friendly verdict:
"🚩 3 red flags: urgency, secrecy, personal question. This looks like a trap. Here's why…"
- Uses an LLM with a locked safety prompt; teaches the *pattern*, never just yes/no.
- Kids use it, parents use it, teachers project it. Every result has a "Share how Shieldy caught this" card → organic growth.
- Nobody offers a kid-friendly "is this a trap?" checker. This is DSK's viral utility — the way people *discover* DSK.
- Build: single page + API route; rate-limited; no accounts needed; no message storage (privacy = brand).

### P3 — DSK Guardian (premium app · THE revenue engine)
The existing Python MVP (screen-capture → OCR → on-device LLM analysis for Roblox etc.) productized:
- **Differentiators vs Bark/Qustodio/Aura:**
  1. **On-device AI** — chats never leave the family's computer (privacy-first, GDPR/COPPA story).
  2. **Render-layer coverage** — sees in-game chat that network filters and app-level tools miss.
  3. **Transparent, not spyware** — "Shieldy watches WITH you": the kid knows, consents, and earns badges for safe behavior. Monitoring as coaching, not surveillance. No competitor has this framing.
- Tiers: **Free** (1 device, weekly digest) · **Family $6.99/mo or $59/yr** (real-time alerts, multi-device, evidence vault, guided NCMEC reporting) · **Family+ $99/yr** (priority support, expert Q&A sessions).
- Roadmap: private beta with 50 Discord families (Q4 2026) → public launch (Q1 2027).

### P4 — DSK for Schools (B2B SaaS)
Free tier stays (worksheets, curriculum PDFs). Paid adds:
- Classroom quest mode + student progress dashboards + counselor alerts + policy templates + Digital Safety Week event kit.
- Pricing: **$299/yr small school · $699/yr large · district custom.** Target: 3 free pilots (Q4 2026) → 10 paying (Q2 2027).

### P5 — AI Trust Tutor (differentiator · fold into quests)
A sandbox where kids interrogate a deliberately-wrong AI ("Bot") and earn points for catching hallucinations. Nobody teaches AI-skepticism to kids as a game. Ship as a quest type first; spin out if it resonates.

---

## 3. Revenue Model (ranked by realism)

| # | Stream | Mechanics | 12-mo target |
|---|--------|-----------|--------------|
| 1 | Guardian subscriptions | $59/yr family plans | 200 paying ≈ $12K ARR |
| 2 | School licenses | $299–699/yr | 10 schools ≈ $4–7K |
| 3 | **Grants** | 501(c)(3) unlocks: state internet-safety funds, children's foundations, Google.org, Craig Newmark (trust & safety), Comcast digital equity | $25–50K |
| 4 | Recurring donations | Upgrade the existing $5–50 buttons → "Guardian Circle" monthly | $3–5K |
| 5 | Paid workshops | PTA/school webinars $250–500/session | $3–5K |
| 6 | Ethical sponsorships | Vetted only (password managers, family routers); clearly labeled; never on kid pages | opportunistic |
| 7 | YouTube AdSense | Long-form parent content | minor |

**Structure decision (bring to MITdesignX mentors):** hybrid — nonprofit (501(c)(3)) holds the mission, education, grants; a small LLC ships Guardian. Common, clean, fundable. File for 501(c)(3) in Q3–Q4 2026.

---

## 4. Channel Playbook (role · cadence · KPI)

| Channel | Audience & role | Cadence | KPI |
|---|---|---|---|
| **TikTok** | Teens+parents · discovery | 1 short/day (pipeline: dsk-shorts repo) | follows → site clicks |
| **YouTube** | Parents · authority + revenue | Daily Shorts + **1 weekly 8–10 min deep-dive** ("Inside Roblox" series, journal articles as video) | watch time, subs, AdSense |
| **Instagram** | Parents · trust | Reels (same shorts) + 2 carousel infographics/wk (guide excerpts) | saves/shares, bio-link → audit tool |
| **Facebook** | Worried parents (the real buyer) | DSK Parents group + weekly live Q&A; serve existing parenting groups helpfully (no spam) | group members, email signups |
| **LinkedIn** | Schools, funders, press | 2 posts/wk: Osman (SRE→child-safety founder story, threat analyses), Ayşe (youth co-founder journey — **press magnet**) | school leads, partnership DMs |
| **Discord** | Core community | Structure existing server: roles, #daily-quest, weekly "Ask a Knight" event, **Knight Council** | weekly actives |

Cross-cutting rules: every short ends "Play today's quest → digitalsafetyknights.org"; UTM per platform; kid-facing YouTube marked *Made for Kids* (COPPA), parent content kept on separate uploads.

**Knight Council (innovative + press-worthy):** teen ambassador program led by Ayşe — 13–17, parental consent, moderated. Students bring DSK into their own schools. Student-led = school doors open + media loves it.

---

## 5. Signature Campaigns

1. **Family Code Word Friday** — monthly viral challenge: set a family code word against voice-clone scams; share the ritual (not the word).
2. **Digital Safety Week school kit** — October (Cybersecurity Awareness Month): posters, 5 daily quests, assembly deck. Free kit = school lead generator.
3. **Finland pilot** — during the September trip, pitch 1–2 Finnish schools/educators as the first international pilot (Finland = ed-innovation brand; a Finnish pilot is gold for credibility and grants).
4. **Press push** — the 16-year-old co-founder story: local NJ outlets → parenting press → tech press at Guardian launch.

**Partnership targets:** ConnectSafely, Common Sense Media, NCMEC education arm, National PTA, Discord & Roblox trust-and-safety/education programs, ikeepsafe.

---

## 6. 12-Month Roadmap

**Q3 2026 (now → Sep)** — *Product foundation*
- Site Phases 1–3 live (quests, badges, parent email) · shorts daily on 4 channels · Glitch Detector v1
- Accelerator starts · Finland trip → pilot seed · 501(c)(3) decision + filing
- Metrics live (privacy-first analytics)

**Q4 2026** — *Proof*
- Guardian private beta (50 Discord families) · 3 free school pilots · Digital Safety Week campaign
- Knight Council launch · first grant applications · YouTube long-form weekly

**Q1 2027** — *Monetize*
- Guardian public launch ($59/yr) · school license sales open · TR localization live
- Accelerator demo day → grants/seed conversations

**Q2 2027** — *Scale*
- 10 paying schools · 200 Guardian subs · FI/FR localization · second grant round
- Decide: raise, grow on revenue+grants, or both

**North-star metrics:** weekly active kids in quests · badges earned · Guardian paying families · schools live. (Vanity followers are fuel, not the goal.)

---

## 7. Ethics Guardrails (non-negotiable, also the brand)

1. Free safety core for every child, forever.
2. Never monetize fear — no scare-marketing, no dark patterns, no countdown timers.
3. Children's data: local-first, minimal, never sold, never ad-targeted.
4. Guardian is transparent to the child — coaching, not covert surveillance.
5. Sponsorships vetted and labeled; none on kid-facing pages.
6. Every safety claim sourced; AI content human-reviewed.

*These guardrails are the moat: Big Tech can't out-trust a mission-driven family nonprofit.*

---

## Next actions (this week)
1. Claude Code: run `DSK_SITE_SPEC.md` Phase 0–1 (quests live).
2. Start daily shorts (dsk-shorts repo: `batch.sh` → schedule uploads).
3. Add Glitch Detector to the site spec as Phase 1.5 (single page + guarded LLM API).
4. Draft Finnish school pilot one-pager before the September trip.
5. Book a 501(c)(3) consult (or ask accelerator mentors first).

Shield up! 🛡️
