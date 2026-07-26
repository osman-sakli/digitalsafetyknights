# DSK Site — Phase 0 Discovery

## Stack
- **Frontend:** plain static HTML/CSS/vanilla JS (no framework, no build step). Files: `index.html` (852 lines, main landing page), `audit.html` (504 lines, Family Safety Audit tool), `dashboard.html` (318 lines), `login.html` (103 lines), `donation-success.html` (51 lines). Assets in `frontend/assets/` (logo, favicon).
- **Backend:** Python AWS Lambda functions (no framework, raw `lambda_*.py` handlers), zipped for deploy: `lambda_login.py`, `lambda_signup.py`, `lambda_verify.py`, `lambda_newsletter.py`, `lambda_donation.py` (Stripe), `lambda_audit.py`, `lambda_email.py`. A prebuilt Lambda layer (`lambda-layer/`) bundles `boto3`, `stripe`, `requests`, `certifi`, etc.
- **Hosting/deploy:** `infrastructure/deploy.sh` — manual bash script, **not Terraform**. It `aws s3 sync`s `frontend/` to bucket `digitalsafetyknights.org` with public-read ACL + S3 static website hosting. Its own "next steps" comment says ACM/CloudFront/Route53 are not yet wired (or done manually outside this script). The `infrastructure/terraform/*.tf` files (main, s3, cloudfront, lambda, route53) all exist but are **empty (0 bytes)** — Terraform is aspirational/unused right now, plain `aws s3 sync` is the real deploy path.
- **Persistence:** no database visible — Lambdas likely use S3/DynamoDB/SES directly per-function (not yet inspected line-by-line); no ORM/config found.

## Page inventory vs. SITE_SPEC
| Existing today | SITE_SPEC feature | Status |
|---|---|---|
| `index.html` — marketing/landing, threats, programs, badges section (static, not a real system), guides, journal, emergency hotlines by country, Discord/join CTA | — | live |
| `audit.html` | not in spec directly, but is the existing "Family Safety Audit" — closest existing analogue to a quest-like interactive tool | live, reusable pattern |
| `login.html`, `dashboard.html` | — | live (real accounts exist — signup/login/verify/newsletter/donation Lambdas all present) |
| **Quest engine `/quests`** (Phase 1) | ❌ not built | new |
| **Badge system + certificates** (Phase 2) | index.html has a static "badges" nav anchor/section only — no earning logic, no localStorage profile | new |
| **Parent loop / Weekly Knight Report email** (Phase 3) | newsletter Lambda exists but is generic signup, not the weekly-report content loop described | partially new |
| **School kit `/schools`** (Phase 4) | ❌ not built | new |
| **Turkish i18n** (Phase 5) | ❌ no locale system | new |
| **Metrics** (Phase 6) | ❌ no analytics wired (no GA, no Plausible) | new |
| **Glitch Detector** (strategy Phase 1.5) | ❌ not built | new |

## Blockers / things to confirm before Phase 1 code
1. **No database.** Spec says "no DB in Phase 1–2, localStorage only" — compatible with current static-site stack, no blocker.
2. **No analytics provider chosen yet** (Plausible vs self-hosted umami) — needed for Phase 6, and touches privacy commitments; needs owner pick before wiring.
3. **Email provider for Weekly Knight Report** (Phase 3) — spec says confirm with owner (Buttondown/Mailerlite vs current newsletter Lambda+SES path). Reusing the existing `lambda_newsletter.py`/SES path avoids a new paid dependency — recommend that, pending your OK.
4. **Deploy path mismatch:** real deploys go through `deploy.sh` (raw S3 sync, public ACLs, no CloudFront/HTTPS termination confirmed), not the empty Terraform files. New static pages (`/quests`, `/schools`, etc.) can just be added to `frontend/` and will ship via the existing script — no new infra needed for Phase 1–2. Worth eventually reconciling the empty `terraform/` folder (delete or actually fill in) so it stops implying infra-as-code exists when it doesn't.
5. Character SVGs referenced as reusable from `dsk-shorts/src/characters/*.tsx` (React/Remotion components) — will need porting to plain SVG/vanilla JS for this static site, not a direct copy-paste.

**No new backend service, database, or paid dependency proposed here — Phase 1–2 quest/badge engine fits entirely in the existing static-file + localStorage model.**
