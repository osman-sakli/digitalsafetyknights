#!/usr/bin/env python3
"""Record a chapter enquiry that arrived by email instead of through the form.

People write to us directly, and an enquiry that only exists in an inbox
cannot be reviewed consistently or found again six months later. The first
Uganda enquiry, in November 2026, was sitting in Osman's mail with nothing
in dsk-chapter-applications at all.

This writes the same record the form writes, marked source="email" and
status="enquiry" rather than "pending" — because an emailed note has not
given us a host organisation, a reference, an age confirmation or acceptance
of the standards, and must not be mistaken later for an application that
did. Ask them to fill the form; this is only so the enquiry is not lost.

    python3 log-chapter-application.py \
        --name "Ivan Sajjabi" --email ivansajjabi26@gmail.com \
        --country Uganda --why "..." [--city Kampala] [--role other] [--dry-run]
"""
import argparse
import json
import sys
import uuid
from datetime import datetime, timezone

import boto3

TABLE = "dsk-chapter-applications"
ROLE_LABELS = {
    "parent": "Parent",
    "teacher": "Teacher / Educator",
    "student": "Student (18+)",
    "community_leader": "Community / Youth Organization Leader",
    "other": "Other",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--email", required=True)
    ap.add_argument("--country", required=True)
    ap.add_argument("--why", required=True, help="What they actually wrote, verbatim.")
    ap.add_argument("--city", default="")
    ap.add_argument("--role", default="other", choices=sorted(ROLE_LABELS))
    ap.add_argument("--received", default="", help="ISO date the email arrived; defaults to today.")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if "@" not in args.email:
        sys.exit("that does not look like an email address")

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    item = {
        "application_id": str(uuid.uuid4()),
        "name": args.name.strip(),
        "email": args.email.strip().lower(),
        "country": args.country.strip(),
        "city": args.city.strip(),
        "role": args.role,
        "role_label": ROLE_LABELS[args.role],
        "why": args.why.strip(),
        # Deliberately empty: an email cannot have supplied these, and
        # pretending otherwise would let an unvetted enquiry look vetted.
        "host_org": "",
        "reference": "",
        "over18": False,
        "accepted_standards": False,
        "source": "email",
        "status": "enquiry",
        "applied_at": args.received.strip() or now,
        "logged_at": now,
        "note": "Arrived by direct email, not through the form. Not a complete "
                "application: no host organisation, no reference, no age "
                "confirmation, standards not accepted. Ask them to complete "
                "the form at /chapters.html before any review.",
    }

    print(json.dumps(item, indent=2, ensure_ascii=False))
    if args.dry_run:
        print("\n[dry run] nothing written")
        return

    boto3.resource("dynamodb", region_name="us-east-1").Table(TABLE).put_item(Item=item)
    print(f"\nwritten to {TABLE} as status=enquiry")
    print("Next: ask them to complete the form, then the review runs as normal.")


if __name__ == "__main__":
    main()
