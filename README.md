# Digital Safety Knights

Free internet safety club for kids and their families. Live at **[digitalsafetyknights.org](https://digitalsafetyknights.org)**.

Kids learn online safety through short quests, mini games and a knight rank ladder (Bronze Squire → Digital Knight), with characters Sir Shieldy, Pixel, Glitch and Bot. Parents and schools get guides, a monthly journal, a weekly email report and a legislative tracker. Content is in English, Spanish and Turkish.

First commit: April 2026.

## Who it's for

- **Kids** (younger / older quest tracks): quests, games, certificates, member card
- **Parents**: guides, weekly "Knight Report" email, conversation starters
- **Schools / principals**: school programs, chapters, Digital Safety Week material

## Privacy rules (hard constraints)

- No personal data from children. Kid nickname and progress live in the browser (`localStorage`) only, never sent to a server.
- Email is only collected in parent-labeled sections.
- No third-party trackers on kid pages.
- This repository contains **no real user data**. Example data uses placeholders like `jane@example.com`.

## Stack

| Part | Tech |
|---|---|
| Frontend | Static HTML / CSS / vanilla JS (`frontend/`), i18n JSON in `frontend/content/` |
| Game | Standalone static site (`game-site/`) |
| Backend | AWS Lambda, Python 3.11 / 3.12 (`backend/lambda_*.py`) |
| Data | DynamoDB |
| Email | Amazon SES |
| Payments | Stripe (donations, sponsor invoices, Stripe Connect for chapters) |
| Hosting | S3 + CloudFront + Route 53 |
| Infra as code | Terraform (`infrastructure/terraform/`) |
| CI/CD | GitHub Actions (`.github/workflows/`) — deploys to S3 on push to `main` |

## Repo layout

```
frontend/          site pages (root = default, en/, es/ localized), assets, quest content
game-site/         standalone game
backend/           Lambda handlers (signup, login, newsletter, weekly report, polls, donations, ...)
lambda-layer/      vendored Python deps for the Lambdas (stripe, certifi)
infrastructure/    Terraform, deploy scripts, SEO build, CloudFront edge function
social/            LinkedIn daily card generator
*.md (root)        strategy, specs and roadmap docs
```

## Run locally

Frontend is plain static files, no build step:

```bash
cd frontend
python3 -m http.server 8000
# open http://localhost:8000
```

Pages that call the API (signup, login, polls, donations) need the backend deployed; the rest works offline.

## Deploy

1. Infra: `cd infrastructure/terraform && terraform init && terraform apply` (needs your own AWS account).
2. Site: push to `main`. GitHub Actions syncs `frontend/` to S3 and invalidates CloudFront.
   Required repo secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` (plus CloudFront distribution id used by the workflow).
3. Manual: `infrastructure/deploy.sh`, `infrastructure/deploy-game.sh`.

No secrets are stored in this repo. Keep `.env` and keys out (see `.gitignore`).

## Roadmap

See [ROADMAP.md](ROADMAP.md). Longer planning docs: `DSK_MASTER_STRATEGY.md`, `DSK_SITE_SPEC.md`, `CHAPTER9_CONTENT_PLAN.md`, `CHAPTER10_CONSISTENCY_PLAN.md`, `CHAPTER11_MEMBERSHIP_PLAN.md`.

## License

[MIT](LICENSE)

## Firewall (Preclearance edge)

Since 2026-11-23 the site's names go through Preclearance's edge, a web application firewall run for the site (dashboard: preclearance.ai/dashboard/sites/digitalsafetyknights.org). It starts in count-only mode.

- `digitalsafetyknights.org`: a Route 53 failover pair. Primary: the edge's two addresses, while Route 53's health check sees the edge; secondary: CloudFront (`d2dqzna61puppe.cloudfront.net`).
- `www.` and `api.`: CNAMEs to the site's own names under `edge.preclearance.ai`, which Preclearance points straight at CloudFront and at the API when the edge is down.
- `api.digitalsafetyknights.org` is an API Gateway custom domain for `dsk-api` (mapping `prod` → stage `prod`); the pages call `https://api.digitalsafetyknights.org/prod/<route>`.
- `backend/lambda_edge_gate.py` (`dsk-edge-gate`, authorizer `preclear-edge-gate`) admits only the edge's addresses to every route except `POST /stripe-webhook`, and everyone while the edge is down.
- To leave the edge: point `digitalsafetyknights.org` and `www.` back at the CloudFront distribution (A alias records) and `api.` at `d-g4h747qk14.execute-api.us-east-1.amazonaws.com`, then detach the authorizer from the routes.

