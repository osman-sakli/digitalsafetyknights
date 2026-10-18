# Roadmap

Work planned for the next months. Detail lives in the CHAPTER*_PLAN.md and DSK_*.md docs.

## Membership & community
- [ ] Knight Council: council-only voting (today it shares the open monthly poll)
- [ ] Live weekly "Ask a Knight" Discord event (today Q&A is only inside the weekly email)
- [ ] Decide on physical membership items (mailed card / pin) vs digital-only

## Content
- [ ] Turkish localization under `/tr` (BTK / İhbarWeb resources, localized character names)
- [ ] Finish Spanish coverage for all pages in `frontend/es`
- [ ] Short-video library integration on the site (videos synced from separate bucket)

## Engineering
- [ ] Tests for Lambda handlers (`backend/`) — currently none
- [ ] Move `backend/*.zip` build artifacts out of git, build them in CI
- [ ] Rebuild `lambda-layer/` from a pinned `requirements.txt` instead of vendoring
- [ ] Consistency pass across pages (see `CHAPTER10_CONSISTENCY_PLAN.md`)
- [ ] Accessibility audit (keyboard nav, contrast, alt text)
- [ ] Lighthouse / performance pass on the static pages

## Docs
- [ ] Architecture diagram for Lambda + API + DynamoDB + SES flow
- [ ] Contributor guide
