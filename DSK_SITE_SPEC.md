# DSK Site Enrichment — Implementation Spec

Project: **digitalsafetyknights.org** (Digital Safety Knights — free child-safety org)
Goal: turn the site from a content site into an **interactive product** kids use daily, before the MITdesignX Le Rosey accelerator begins.

> **Claude Code: read this whole file first.** Then run Phase 0 (discovery), report findings, and proceed phase by phase. Ask before adding any backend service, database, or paid dependency.

---

## Brand & world (fixed — do not change)

- Colors: navy `#16243F`, navy2 `#203353`, gold `#E2B248`, gold-soft `#F4D998`, cloud `#F4F6FB`, red (threats only) `#C2453B`, teal (Pixel) `#3EC6C0`, purple (Glitch) `#8A5FBF`
- Characters: **Sir Shieldy** (gold shield knight, hero/teacher), **Pixel** (teal kid, makes mistakes), **Glitch** (purple static blob, comic villain — never scary), **Bot** (confidently-wrong AI robot)
- Badge ladder: Bronze Squire → Silver Guard → Gold Sentinel → Diamond Defender → Digital Knight
- Signature line: **"Shield up!"** — ends every quest/certificate
- Tone: fun, empowering, never fear-based. Teach judgment, not restriction.

## Hard constraints (privacy / COPPA)

1. **No PII from children. Ever.** No email, no last name, no age input for kids. First name / nickname only, stored **locally** (localStorage) — never sent to a server.
2. Parent email capture is allowed **only** in clearly parent-labeled sections.
3. No third-party trackers on kid-facing pages. Analytics must be cookieless/privacy-first (Plausible or self-hosted umami). No Google Analytics.
4. No external chat, no comments, no user-generated content on kid pages.
5. All AI-generated content must be human-reviewed before publish (mark drafts clearly).

---

## Phase 0 — Discovery (do this first)

1. Inspect the repo/site: identify the stack (static HTML / Next.js / WordPress / other), hosting, build pipeline, existing pages and nav.
2. Produce a short `DISCOVERY.md`: stack, page inventory, where each feature below should live, any blockers.
3. **Stop and confirm the plan** before writing feature code.

If the site is plain static HTML: implement features as self-contained pages/components (vanilla JS or a single lightweight bundle). If Next.js/React: use components + static generation. Do not introduce a database in Phase 1–2; localStorage is the persistence layer for kid progress.

---

## Phase 1 — Interactive Quest Engine (core product)

**What:** scenario quizzes where kids make choices in stories featuring the 4 characters.

- Data-driven: quests defined in JSON (`/content/quests/*.json`), engine renders any quest.
- Quest JSON shape:
  ```json
  {
    "id": "glitch-free-robux",
    "title": "Glitch Alert: Free Robux",
    "badgeTrack": "bronze-squire",
    "questions": [
      {
        "narrator": "GLITCH",
        "prompt": "FREE ROBUX! Click meee! Only ten seconds left!",
        "choices": [
          { "text": "Click it fast!", "correct": false, "coach": "Free PLUS urgent equals TRAP. Real free things never rush you." },
          { "text": "Close it and tell a grown-up", "correct": true, "coach": "Knight move! Scams use hurry to stop you from thinking." },
          { "text": "Ask for more time", "correct": false, "coach": "Talking to a scam keeps the trap open. Close it instead." }
        ]
      }
    ]
  }
  ```
- Flow: intro card → 5–7 questions → per-choice coaching from Shieldy → score screen → badge progress → "Shield up!" outro.
- Character art: simple SVG components exist in the `dsk-shorts` repo (`src/characters/*.tsx`) — port/adapt them (or inline SVGs for vanilla JS).
- Mobile-first, big tap targets, readable at age 8+. Sound optional, off by default.
- **Seed content: create 6 quests**, one per existing program: Roblox Safety Lab, AI Threat Awareness, Grooming Watch, Parental Controls (parent-facing), Family Cyber Defense, Digital Citizenship. Reuse scenarios from the shorts scripts (free Robux, "what school do you go to", vegetarian sharks / AI hallucination, voice clone, password secret, fake friend request).

**Acceptance:** a child can open `/quests`, pick a quest, complete it, see score + badge progress; progress survives page reload (localStorage); works on a phone.

## Phase 2 — Real Badge System

- Local profile: nickname (kid-chosen, e.g. "PixelKnight99") + progress in localStorage.
- Badge rules: Bronze Squire = complete first quest; Silver Guard = 3 quests; Gold Sentinel = all 6; Diamond Defender & Digital Knight = placeholders ("coming soon") for now.
- Badge screen: earned badges glow gold; unearned are silhouettes.
- **Printable certificate:** client-side PDF or print-styled page — nickname, badge, date, Shieldy art, "Shield up!" (no server, no PII sent anywhere).
- "Today's Quest" widget on the homepage: rotates through quests by day; links the shorts audience ("From TikTok? Play today's quest!").

**Acceptance:** finishing quests visibly unlocks badges; certificate prints cleanly; homepage shows Today's Quest.

## Phase 3 — Parent Loop

- "Weekly Knight Report" email signup (parents section only): one threat + one conversation starter per week. Use a privacy-respecting provider (Buttondown/Mailerlite) or a simple double-opt-in form; confirm choice with owner first.
- Parent page: "What your child is learning" — explains quests/badges, links the 6 guides.
- Add per-quest "Parent talk prompt" (one question to ask at dinner) shown on the quest result screen behind a "For parents" toggle.

## Phase 4 — School Pilot Kit

- `/schools` page: pitch for teachers + downloadable 6-week lesson plan (one program per week; PDF), classroom mode note, contact CTA.
- **Classroom mode** for quests: teacher projects, class votes by show of hands, teacher clicks the class answer — same engine, bigger fonts, no profile needed (`?mode=classroom`).
- One-pager PDF for principals (mission, what students learn, free, COPPA-safe).

## Phase 5 — Turkish localization (i18n)

- String-catalog approach (JSON per locale); translate UI + all 6 quests to Turkish (`tr`). Language toggle in header, remembered locally.
- Keep architecture ready for `fi` and `fr` later.

## Phase 6 — Metrics

- Privacy-first analytics (Plausible/umami) on all pages; custom events: `quest_started`, `quest_completed`, `badge_earned`, `certificate_printed` — **no user identifiers**, counts only.
- Simple public `/stats` page (optional): total quests completed, badges earned — social proof for the accelerator.

---

## Working agreements for Claude Code

- Small PR-sized commits per feature with clear messages.
- Every phase ends with: what shipped, how to test it, what's next.
- Never weaken the privacy constraints to make a feature easier.
- Visual QA on mobile viewport (390×844) before calling anything done.
- If a decision isn't covered here (hosting, email provider, framework migration), ask the owner — don't assume.

## Definition of done (accelerator demo)

A 16-year-old can visit the site on a phone, pick a nickname, complete "Glitch Alert: Free Robux" in Turkish or English, earn Bronze Squire, print the certificate — and a teacher can run the same quest in classroom mode. Shield up! 🛡️
