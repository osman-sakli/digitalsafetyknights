# DSK Threat Intelligence & Policy Research Bank

Compiled 2026-08-02, last refreshed 2026-09-27. Covers the last ~10 months of
child-online-safety news (Oct 2025 – Sep 2026), weighted toward the most
recent 4-6 weeks. Sourced via web search — every claim below has a citation.
This is a living reference: update it monthly (it's also the natural
raw-material source for future Monthly Journal issues and guide revisions —
see `CHAPTER9_CONTENT_PLAN.md` for how this translates into site work).

---

## 0. September 2026 Refresh — What's New Since the August Compile

### Legislation & policy
- **EU KIDS Act (proposed)** — the European Commission formally published its
  "Keeping Internet Digital Spaces Accountable and Trustworthy" Act proposal
  on **Sept 17, 2026**, following up on the July expert-panel recommendations
  already logged below. Framed explicitly as heading off a patchwork of
  national social-media age laws across the EU. Not yet law — needs European
  Parliament + Council approval.
  [Bird & Bird](https://www.twobirds.com/en/insights/2026/the-eu-kids-act-a-new-generation-of-rules-for-child-online-safety)
- **App Store Accountability Acts — status corrected.** Texas's law is
  **in effect and enforceable**, not blocked: the Fifth Circuit **stayed**
  the preliminary injunction, letting it take effect Jan 1, 2026; the Texas
  AG can enforce it now. Louisiana's law took effect **July 1, 2026**.
  **California's DAAA** (not previously tracked) takes effect **Jan 1, 2027**
  — the largest state to adopt this model. Utah's compliance deadline was
  pushed to **May 6, 2027**, and it was amended so a **private lawsuit is
  the only enforcement mechanism** (no state-agency enforcement).
  [MoFo](https://www.mofo.com/resources/insights/251111-texas-targets-app-stores-with-new-accountability-law) ·
  [Wiley](https://www.wiley.law/alert-Key-Developments-With-State-App-Store-Accountability-Acts-as-Texas-Act-Takes-Effect)
- **Kentucky v. Character Technologies** — first-in-nation state AG lawsuit
  against an AI chatbot company, filed **Jan 8, 2026** in Franklin Circuit
  Court by AG Russell Coleman. Alleges Character.AI exposed minors to
  unwanted sexual content and encouraged self-harm/substance abuse,
  violating Kentucky consumer-protection and data-privacy law. Names
  Character Technologies' founders (ex-Google engineers Noam Shazeer,
  Daniel De Freitas) directly.
  [The Record](https://therecord.media/kentucky-character-ai-chatbot) ·
  [AG complaint PDF](https://www.ag.ky.gov/Press%20Release%20Attachments/CTI%20Complaint%20Motion%20and%20Order%20Filed.pdf)

### Platform changes parents can act on right now
- **Meta Teen Accounts settlement rollout** — following an August 2026
  litigation settlement, Meta is rolling in concrete new limits on
  Instagram/Facebook for under-18 accounts: a **default 2-hour/day time
  limit** (parent-adjustable), an automatic **midnight–6am block**,
  notifications blocked **8am–3pm** on school days, parent alerts when a
  teen opens a new account or is contacted by a flagged adult account, and
  a pledge to respond to 90% of teen abuse reports within 6 hours. Rolling
  out over the following 6-12 months, not a future promise.
  [Washington Post](https://www.washingtonpost.com/technology/2026/08/26/how-meta-new-rules-will-affect-teens-use-instagram-facebook/) ·
  [Meta Newsroom](https://about.fb.com/news/2026/06/strengthening-teen-accounts-with-new-safety-updates-on-instagram-and-facebook/)

### Watchdog reporting / advocacy
- **NCOSE 2026 "Dirty Dozen List"** — released March 31, 2026. Full list:
  Amazon, Android, Apple, Google Chromebooks, Discord, Grok, Snapchat, Steam,
  Telegram, TikTok, X — plus **Mark Zuckerberg named individually** (ranked
  #1) for Meta's handling of sexual exploitation on its platforms. Annual
  campaign since 2013; not a legal finding, but a widely-cited advocacy
  report with real reputational/policy impact.
  [NCOSE](https://endsexualexploitation.org/dirty-dozen-list-2026/)

### Litigation — AI-generated CSAM
- **xAI/Grok class action** — filed **March 16, 2026** (N.D. Cal.) by Lieff
  Cabraser + Baehr-Jones Law on behalf of 3 victims whose real photos were
  used to generate CSAM via Grok. Cites a Center for Countering Digital Hate
  analysis: over an 11-day window (Dec 2025–Jan 2026), Grok generated **3M+
  sexualized images**, at least **23,000 appearing to depict children**. A
  related Arkansas case names a photographer (Russell Bloodworth) who
  allegedly used Grok to turn legitimate school photos of 6 children into
  sexually explicit deepfakes; a June 2026 search of his home found ~1,700
  such images/videos.
  [CyberScoop](https://cyberscoop.com/xai-grok-csam-class-action-lawsuit/) ·
  [classaction.org](https://www.classaction.org/news/grok-lawsuit-claims-xai-failed-to-safeguard-against-sexually-explicit-deepfakes-of-children)

**Site follow-up from this refresh:** legislative-tracker.html corrected
(Texas status, +Louisiana, +California DAAA, +Kentucky suit, Utah deadline,
+Meta settlement, EU KIDS Act) and a new Instagram/Facebook parent guide
shipped to cover the Meta settlement — see git log for exact commits.
NCOSE Dirty Dozen and the Grok case are queued for sources.html; not yet
added as of this refresh.

---

## 1. Legislation & Policy

### Federal (US)
- **KIDS Act (House)** — passed 267-117 in June 2026, consolidating 14 bills
  including KOSA and COPPA 2.0. Notably **drops KOSA's duty-of-care
  provision** — the standard that would let platforms be held liable for
  algorithm/design choices that harm minors. Senate sponsors (Blackburn,
  Blumenthal) have called the House version "dead" in the Senate.
  [Congress.gov S.1748](https://www.congress.gov/bill/119th-congress/senate-bill/1748) ·
  [Crowell & Moring](https://www.crowell.com/en/insights/client-alerts/house-advances-bipartisan-kids-online-safety-bill-but-senate-showdown-looms)
- **Senate Commerce Committee** took up kids' online safety + AI bills the
  first week of August 2026.
  [Washington Times](https://www.washingtontimes.com/news/2026/jul/23/senate-panel-take-kids-online-safety-ai-bills-early-august/)
- **TAKE IT DOWN Act (TIDA)** — signed May 19, 2025; FTC enforcement began
  May 19, 2026. Requires platforms to remove reported non-consensual intimate
  imagery (including AI-generated deepfakes) within **48 hours**, integrate
  with NCMEC for cases involving minors. Penalty: **$53,088/violation**.
  First conviction: Ohio, April 2026. 9 of 10 platforms don't publish
  compliance data, making the 48-hour standard hard to verify externally.
  [Orrick](https://www.orrick.com/en/Insights/2026/06/Nonconsensual-Intimate-Images-Online-Take-It-Down-Act-Enforcement-In-Full-Swing) ·
  [WilmerHale](https://www.wilmerhale.com/en/insights/client-alerts/20260615-the-take-it-down-act-goes-live) ·
  [FTC compliance guide](https://www.ftc.gov/business-guidance/resources/complying-take-it-down-act)

### State
- **New York SAFE for Kids Act** — final rules published July 29, 2026;
  effective **January 25, 2027**. Defines age-verification and parental
  consent standards for "addictive feeds."
  [NY AG press release](https://ag.ny.gov/press-release/2026/attorney-general-james-and-governor-hochul-release-final-safe-kids-act-rules)
- **App Store Accountability Acts** (parental-consent-at-download laws):
  - **Utah** — first state, effective May 2025; amended (HB 498) after
    constitutional challenges; now enforceable **only via private lawsuit**;
    implementation **postponed from May 2026 to 2027**.
  - **Texas** — enjoined on First Amendment grounds days before its Jan 1,
    2026 effective date; state has appealed; expected to reach SCOTUS.
  - **Louisiana** — similar framework in force.
  - Common requirement across all three: age-band classification (**<13,
    13-15, 16-17, 18+**) and parental consent for every download/purchase.
    [Deseret News](https://www.deseret.com/politics/2026/04/27/apple-meta-google-drop-lawsuit-against-utah-app-store-verification-act-after-winning-lawsuit-against-similar-law-in-texas/) ·
    [Bass Berry & Sims](https://www.bassberry.com/news/apps-and-minors-new-compliance-frontiers-and-risks-in-louisiana-utah-and-texas/) ·
    [Loeb & Loeb](https://www.loeb.com/en/insights/passle/2026/05/update-on-utah-app-store-law--another-waiting-game)
- **45 US states + not-DC** now criminalize AI-generated/computer-edited CSAM
  (5 states + DC don't); most enacted 2024-2025.
  [Enough Abuse state tracker](https://enoughabuse.org/get-vocal/laws-by-state/state-laws-criminalizing-ai-generated-or-computer-edited-child-sexual-abuse-material-csam/)
- **School phone bans** — 26 states now mandate full "bell-to-bell" bans; 35
  states + DC have some policy. July 2026: Illinois (SB 2427). Feb 2026:
  Michigan (HB 4141), effective 2026-2027 school year. Strictest bans: TX,
  NY, VA, LA, AL, NE.
  [Newsweek map](https://www.newsweek.com/map-shows-us-states-with-school-phone-bans-in-2026-11335155) ·
  [Ballotpedia tracker](https://ballotpedia.org/State_policies_on_cellphone_use_in_K-12_public_schools)

### International
- **EU** — European Commission expert panel (Mar-Jun 2026) published
  recommendations on child online safety; DSA enforcement context.
  [European Commission](https://commission.europa.eu/news-and-media/news/europeans-concerned-about-child-safety-online-new-report-publishes-recommendations-2026-07-13_en)

---

## 2. Litigation Landscape

### AI companion / chatbot platforms
- **Character.AI + Google** settled with **5 families** (Jan 2026) whose
  children died by suicide or suffered mental-health crises tied to the
  product. Terms undisclosed.
- **Kentucky AG** — first-in-nation state lawsuit vs. Character.AI (Character
  Technologies + founders Noam Shazeer, Daniel De Freitas + Google), alleging
  the product prioritized engagement/profit over child safety, encouraged
  sexualized conversations and isolation from family.
- **Florida AG** sued **OpenAI + Sam Altman** June 2, 2026 — first state
  lawsuit against an AI company generally (not just companion apps).
  [ConsumerNotice](https://www.consumernotice.org/legal/ai-chatbot-lawsuit/) ·
  [TruLaw Character.AI tracker](https://trulaw.com/ai-suicide-lawsuit/character-ai-lawsuit/)

### Roblox
- **LA County** sued Feb 2026 — first California government body to sue
  Roblox over child safety.
- **Oklahoma AG** (Gentner Drummond) sued May 2026 — "predator playground,"
  profit over safety.
- Response: Roblox rolled out (April 2026) expanded age verification +
  parental controls; under-9 chat off by default; auto DM-blocks for <13;
  "social hangout" experiences restricted to 13+.
  [Malwarebytes](https://www.malwarebytes.com/blog/news/2026/02/roblox-gives-predators-powerful-tools-to-target-children-says-la-county) ·
  [Hoodline](https://hoodline.com/2026/05/oklahoma-ag-rips-roblox-as-predator-playground-in-explosive-child-safety-suit/)

### Discord
- **No settlement yet** as of mid-2026; multiple active suits: **Nevada**
  (May 2026, "go-to chat option for child abusers"), **Texas** (May 2026,
  deceptive marketing under Texas DTPA), **New Jersey** (April 2025, misled
  parents about safety). FTC secured a **$49M settlement** in 2023
  (unrelated matter). Bellwether trials proceeding in CA federal court.
  [Texas AG](https://www.texasattorneygeneral.gov/news/releases/attorney-general-ken-paxton-files-landmark-lawsuit-against-discord-deceiving-parents-and-exposing)

### Snapchat
- **6 states** have sued Snap since 2024 (incl. Arkansas). June 2026:
  Missouri family lawsuit re: a 12-year-old groomed via **Snap Map, Quick
  Add, Bitmoji, disappearing messages** — evidence cited a **133-page
  "Sextortion Handbook"** circulating on the dark web that instructs
  predators to use Snap Map to find students near named schools.
  Snapchat made its **5th appearance** on NCOSE's "Dirty Dozen List" in 2026.
  [Yahoo Finance](https://finance.yahoo.com/markets/stocks/articles/snap-snap-faces-major-lawsuit-210852572.html) ·
  [Daily Citizen](https://dailycitizen.focusonthefamily.com/lawsuit-against-snapchat-latest-in-social-media-accountability-push/)

### Algorithm/addiction (Meta, TikTok, YouTube, Snap)
- **TikTok/ByteDance** confidentially settled with a Florida teen (finalized
  June 30, 2026) over algorithmic design/addictive-use claims.
- **YouTube/Google** confidentially settled a parallel Florida case.
- **Meta + Snap** remain in litigation — MDL judge denied Meta's motion to
  dismiss the ~30-state-AG case; heading to a jury trial in LA.
- **Aug 1, 2026** (yesterday relative to this compile): 4 families sued
  **Meta, TikTok, Snap, and YouTube** together over 4 teen suicides —
  "years of escalating harms."
  [Fortune](https://fortune.com/2026/08/01/4-teen-suicides-spark-new-lawsuit-against-meta-tiktok-snap-youtube/) ·
  [BT Times](https://www.btimesonline.com/articles/177954/20260701/tiktok-settles-teen-mental-health-lawsuit-ahead-of-trial-as-thousands-of-social-media-cases-continue.htm)

### AI-generated CSAM
- Class actions filed **March 16, 2026** against **xAI** re: Grok being used
  to generate CSAM from real children's photos, alleging refusal to
  implement industry-standard prevention measures.
  [CyberScoop](https://cyberscoop.com/deepfake-csam-lawsuit-grok-xai-expands-stability-ai/)

---

## 3. Threat Data & Statistics (citable, for guides/journal credibility)

**NCMEC CyberTipline, 2025 full-year data:**
- **1.5M+** total reports with a nexus to generative AI / child exploitation.
- **1.4M** online enticement reports (**+156%** YoY); 800+ involved an
  offender traveling to meet a child in person; 80,000+ concerned sextortion.
- **53,000+** reports escalated as urgent/imminent danger.
- **Financial sextortion**: 137 reports/day average (**+37%** YoY vs. 2024's
  ~36,000/year). **91% of US victims are male**; ages **14-17** are the most
  targeted minor age group.
- **Child sex trafficking** reports: 105,877 (**+1,100%** — reflects expanded
  mandatory reporting requirements taking full effect).
- **61.8 million** images/videos/files submitted with reports.
- 32,167 missing-children cases assisted; **90%** recovery rate.
  [NCMEC 2025 data blog](https://www.missingkids.org/blog/2026/the-work-never-stops-first-look-at-ncmecs-2025-data)

**AI-generated CSAM growth:**
- **+1,325%** increase in reports, 2023 → 2024 (67,000 reports).
- **440,419** reports by June 2025 (preliminary); **~1.5 million** by end of
  2025.
  [IWF AI CSAM report](https://www.iwf.org.uk/about-us/why-we-exist/our-research/how-ai-is-being-abused-to-create-child-sexual-abuse-imagery)

**764 Network** (see Section 4 — this is the single most important gap in
DSK's current content and deserves its own feature):
- FBI investigating **350+ individuals** across all **56 field offices**;
  **28+ DOJ charges** to date.
- Operates primarily via **Roblox → Discord** (Roblox for initial contact,
  Discord for private, harder-to-monitor escalation).
- Tactics: pose as a peer, build trust via shared games/interests, move to
  private/encrypted apps, coerce CSAM/self-harm/violence via blackmail and
  humiliation.
- Documented death: 13-year-old (Jay), pushed toward suicide by a
  Germany-based 764-affiliated member; wrongful-death suit filed vs. Discord.
  [Global Project Against Hate and Extremism](https://globalextremism.org/post/764-network/) ·
  [FBI/local coverage](https://www.wsaw.com/2026/04/25/fbi-warns-parents-about-online-predator-networks-targeting-children/)

**AI voice cloning:**
- ~**1 in 4** people have encountered or know someone who's encountered a
  voice-cloning scam; losses reported up to **$15,000**.
- Source audio is commonly harvested from public social-media clips/voicemail.
- Best defense per researchers: hang up, call back on a known number, and a
  family-only **"safe word"** — this validates DSK's existing "family code
  word" guidance.
  [Consumer Reports coverage](https://www.wsls.com/news/2026/06/02/consumer-reports-ai-voice-cloning-scams-on-the-rise/)

**Youth AI usage / literacy:**
- FOSI: **45%** of surveyed teens use a generative-AI tool more than once a
  week.
  [FOSI 2026](https://fosi.org/online-safety-in-2026-the-work-of-catching-up/)

---

## 4. Named Emerging Threats DSK Doesn't Yet Cover By Name

1. **The 764 Network** — a real, FBI-investigated, named predator network
   operating exactly on the two platforms DSK already covers (Roblox,
   Discord), with a documented child death and an active Discord lawsuit.
   Zero mention on the current site. **Highest-priority content gap.**
2. **The "Sextortion Handbook"** — a specific dark-web predator manual cited
   in active Snapchat litigation, instructing use of Snap Map to locate
   victims near named schools. Directly actionable: "turn off Snap Map
   location sharing" is a concrete, specific parent action DSK isn't
   currently telling people about.
3. **NCOSE "Dirty Dozen List"** — an annual, citable, independent watchdog
   report DSK could reference for platform-risk credibility (Snapchat is on
   it for the 5th year running in 2026).

---

## 5. Platform Feature Changes Worth Reflecting in Existing Guides

- **Instagram/Facebook Teen Accounts** (Meta, June 2026 update): private by
  default, contact restricted to known accounts, no nighttime notifications,
  AI age-assurance placing teens in age-appropriate experience tiers, parent
  notifications on repeated self-harm/suicide search terms. DSK's
  `safe-ai-usage-guide` and general social-media guidance predates this.
- **Roblox** (April 2026): under-9 chat off by default; auto DM-block <13;
  13+-only "social hangout" experiences; expanded age verification. DSK's
  `roblox-parent-guide.pdf` should be checked against these defaults — some
  of its "here's how to manually enable X" steps may now be Roblox's
  out-of-the-box default, which is worth calling out as a **win** to keep
  the guide feeling current and trustworthy, not just prescriptive.

---

## 6. Competitive / Positioning Context

- **Parental control app market 2026**: Bark, Qustodio, Aura, Norton Family,
  FamilyKeeper are the recognized leaders. Bark = passive monitoring +
  alerts; Qustodio = active controls (filtering, time limits, location).
  Relevant directly to `DSK_MASTER_STRATEGY.md`'s planned **Guardian**
  product (P3) — positioning should lean into "on-device, transparent to the
  child, coaching not surveillance," which none of Bark/Qustodio/Aura claim.
  [SafeWise 2026 roundup](https://www.safewise.com/kids-safety/parental-control-apps/)

---

*Update cadence: refresh this file monthly (or whenever a major settlement/
law lands) — treat it as the sourcing layer for Monthly Journal issues, guide
revisions, and any press/LinkedIn content DSK publishes. Every stat used
publicly should trace back to a line in this file with its source link.*
