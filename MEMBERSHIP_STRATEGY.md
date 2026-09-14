# Membership & Revenue Strategy — research-backed recommendation

_Written 2026-08-09. Grounded in live production numbers, not estimates._

## The numbers we actually have

Pulled from AWS + Stripe before writing anything here:

| Metric | Real value |
| --- | --- |
| Email members (`dsk-members`) | **6** |
| Knight Council applications | **0** |
| School program requests | **0** |
| Active paid subscriptions | **0** |
| Lifetime Stripe revenue | **$5.00** (1 charge, almost certainly a test) |
| Stripe balance | **-$0.45** (fees exceeded revenue) |

Everything below follows from this table. The features are built, deployed
and working — Knight Council, School Programs, Member ID Card, quests, the
game, the 12-hour news pipeline. They have **zero** uptake. That is the
single most important fact about DSK right now.

## Answer to the direct question: should membership become paid?

**No. Not now, and probably not ever for the core content.** Three
independent reasons:

1. **Arithmetic.** A paywall converts a percentage of traffic. Our traffic
   produces 6 members and 1 charge. Any percentage of ~0 is ~0. Charging
   would not raise money; it would remove the only thing we currently have
   going for us — zero friction.
2. **It contradicts the org's own stated guardrail.** `DSK_MASTER_STRATEGY.md`
   commits to everything staying free forever. That promise is on the site.
   Breaking it for ~$0 in revenue trades the brand's main asset for nothing.
3. **The closest analogue proves the other model.** Khan Academy — the same
   shape of organisation (nonprofit, free educational content, kid-facing) —
   runs on roughly **$120M/yr, of which ~$90M is contributions and grants
   and only ~$22M is earned revenue from *school district partnerships*, not
   from charging families.** Its consumer content is free and ad-free. It
   monetises institutions, never the child.
   ([Class Central analysis](https://www.classcentral.com/report/khan-academy-tax-returns-analysis/),
   [FourWeekMBA](https://fourweekmba.com/how-does-khan-academy-make-money/))

Sector research also warns specifically against this move: nonprofits get
tax advantages on the premise of public benefit, and paywalling educational
content risks both the mission and the audience trust that built it — the
Salt Lake Tribune removed its paywall in May 2026 for exactly this reason.
([What Works](https://whatworks.news/2024/09/05/why-paywalls-for-nonprofit-news-though-rare-are-not-going-away-anytime-soon/),
[Nieman Lab](https://www.niemanlab.org/2026/04/the-nonprofit-salt-lake-tribune-is-ready-to-tear-down-its-paywall/))

## What the real problem is

**Distribution, not product, and not pricing.** Zero Knight Council
applications and zero school requests for features that are live and
working is not a conversion problem — it means essentially nobody has seen
them. Sector data confirms the channel has genuinely got harder: nonprofit
organic search traffic fell from 43% to 26% over 2025 as AI overviews and
zero-click results absorbed the clicks.
([Nonprofit News Feed](https://nonprofitnewsfeed.com/resource/new-search-data-show-why-nonprofit-traffic-is-screwed/))

So the honest framing is: DSK has built a genuinely good product that
nobody has been introduced to yet. Changing the price of something nobody
has seen does nothing.

## Recommendation — three moves, in order

### 1. Keep everything free. Change what "membership" *means*.
Research is blunt about why members leave: **"I didn't feel the value" is
the number one reason by far**, and engagement — not price — is the
strongest predictor of retention.
([Neon One](https://neonone.com/resources/blog/membership-retention-strategies-for-your-nonprofit-neo/),
[Mimeo](https://www.mimeo.com/blog/member-retention-strategies/))

Today DSK membership is a signup form and a dashboard. It should become a
**recurring reason to come back**:
- The Weekly Knight Report already exists (`lambda_weekly_report.py`) — it
  is our single best retention asset and currently mails 6 people. It only
  matters once step 2 works.
- Add the monthly member vote (Chapter 11.6, still unbuilt) — the research
  on contribution-linked influence is the one membership idea DSK has never
  tried, and it is cheap.
- Ship the rank-up/streak loop we already have into the emails, so the
  member's own progress is the content.

### 2. Fix distribution — this is the whole game right now.
Nothing else matters until people arrive. Concretely, in priority order:
- **Schools are the highest-leverage channel and the page is already
  built.** One accepted school seminar puts DSK in front of hundreds of
  families at once. Zero requests so far means outreach hasn't started —
  this is a cold-email/phone job to NJ-area districts and PTAs, not a code
  job.
- The daily short-video pipeline already runs on 4 platforms. That is the
  top of the funnel; it needs consistency more than new features.
- The news feed + archive (just built) is genuinely good SEO/AI-answer
  surface — real sourced links updated twice a day is exactly the kind of
  page that still earns citations.

### 3. Fund the org from grants and institutions, not from families.
This is where the money for this exact category actually is:
- **Safe Online** has deployed **$100M+ across 180+ projects in 100+
  countries** specifically on preventing online child sexual exploitation,
  and in the latest round gave **$8M to 30 grantees**, explicitly including
  AI-generated harms and prevention work — DSK's exact subject matter.
  ([Safe Online](https://safeonline.global/new-safe-online-grantees-2026/))
- US federal/state paths exist too (Internet Crimes Against Children
  program, school-safety enhancement grants).
- The Khan model again: **paid institutional programs, free consumer
  content.** If DSK ever charges, it should charge a *school district or
  sponsor* for a program — never a parent for a safety guide.

### What to do with the existing $4.99 "Founding Knight"
Keep it, but reframe it honestly as what it is: **a donation with a badge**,
not a membership tier that unlocks anything. It currently unlocks nothing
and should keep unlocking nothing. That is the correct design — it lets
people who want to support do so, without ever gating safety information.

## The one-line version
Do not paywall a product that nobody has found yet. Keep it free, make
membership mean *recurring engagement* instead of *a signup*, put the
effort into schools and distribution, and fund the organisation from grants
and institutions the way every comparable org does.
