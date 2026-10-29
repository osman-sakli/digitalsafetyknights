# Roadmap

Work planned for the next months. Detail lives in the CHAPTER*_PLAN.md and DSK_*.md docs.

## Membership & community
- [ ] Knight Council: council-only voting (today it shares the open monthly poll)
- [ ] Live weekly "Ask a Knight" Discord event (today Q&A is only inside the weekly email)
- [ ] Decide on physical membership items (mailed card / pin) vs digital-only

## Content
- [ ] Turkish localization under `/tr` (BTK / İhbarWeb resources, localized character names)
- [ ] Finish Spanish coverage for all pages in `frontend/es`
- [x] Short-video library integration on the site (videos synced from separate bucket) — `topics.html` + `quiz.html`, daily auto-sync from the render pipeline
- [x] Free workshop offer: homepage band + hero/nav CTAs, QR on the deck's resources slide
- [ ] Public "recent sessions" list on the site, once partners agree to be named
- [ ] Outreach list: NJ/NY schools, libraries, PTAs, community orgs — send the poster + proposal

## Engineering
- [x] Fix deploy `--delete` wiping generated files (videos/, traffic-stats.json) — see exclude list in deploy.yml
- [ ] Tests for Lambda handlers (`backend/`) — currently none
- [ ] Move `backend/*.zip` build artifacts out of git, build them in CI
- [ ] Rebuild `lambda-layer/` from a pinned `requirements.txt` instead of vendoring
- [ ] Consistency pass across pages (see `CHAPTER10_CONSISTENCY_PLAN.md`)
- [ ] Accessibility audit (keyboard nav, contrast, alt text)
- [ ] Lighthouse / performance pass on the static pages

## Docs
- [ ] Architecture diagram for Lambda + API + DynamoDB + SES flow
- [ ] Contributor guide
