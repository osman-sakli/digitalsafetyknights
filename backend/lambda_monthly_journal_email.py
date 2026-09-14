import json
import boto3
from datetime import datetime
import time

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
ses = boto3.client('ses', region_name='us-east-1')
s3 = boto3.client('s3', region_name='us-east-1')
members = dynamodb.Table('dsk-members')
state = dynamodb.Table('dsk-journal-digest-state')

SITE_BUCKET = 'digitalsafetyknights.org'


# ─────────────────────────────────────────
# Monthly Journal digest — reuses the same dsk-members list and SES sending
# path as lambda_weekly_report.py. Runs daily, but only ever sends once per
# real calendar month, and only once that month's actual PDF is confirmed
# to exist in S3 (an S3 HEAD check, not a date calculation) — the Journal
# pipeline has pre-generated future months' PDFs weeks ahead of time before
# (September/October/November all sat in S3 in early August), and the site
# once linked to one of those early. This Lambda must never repeat that: it
# announces a month only once that month has actually arrived and the file
# is actually there, tracked via dsk-journal-digest-state so a re-run the
# same month is a no-op.
# ─────────────────────────────────────────

def build_email_html(name, month_label, pdf_url):
    return f'''
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6fb;padding:20px;">
      <div style="background:#0d1b3e;padding:26px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="color:#c9a84c;margin:0;font-size:1.5rem;">📰 The {month_label} Journal Is Up</h1>
        <p style="color:#8899bb;margin:8px 0 0;font-size:0.82rem;">Digital Safety Knights</p>
      </div>

      <div style="background:white;padding:30px;border-radius:0 0 12px 12px;">
        <p style="color:#0d1b3e;font-size:1.05rem;font-weight:800;margin-bottom:14px;">Hi {name},</p>
        <p style="color:#444;line-height:1.7;font-size:0.92rem;margin-bottom:20px;">
          This month's DSK Journal is ready — the latest laws, real incidents, and what
          actually changed for families this month, in plain language.
        </p>

        <div style="text-align:center;margin:24px 0;">
          <a href="{pdf_url}" target="_blank"
             style="background:#c9a84c;color:#0d1b3e;padding:14px 32px;border-radius:25px;
                    text-decoration:none;font-weight:900;display:inline-block;">
            Read the {month_label} Journal →
          </a>
        </div>

        <div style="margin-top:26px;padding-top:18px;border-top:1px solid #eee;text-align:center;">
          <p style="color:#666;font-size:0.82rem;line-height:1.6;">
            <a href="https://digitalsafetyknights.org/journal-archive.html" style="color:#c9a84c;text-decoration:none;">📚 Full Archive</a> ·
            <a href="https://digitalsafetyknights.org/member-id.html" style="color:#c9a84c;text-decoration:none;">🪪 Member Card</a> ·
            <a href="https://digitalsafetyknights.org/dashboard.html" style="color:#c9a84c;text-decoration:none;">⚔️ Dashboard</a>
          </p>
          <p style="color:#aaa;font-size:0.72rem;margin-top:14px;line-height:1.6;">
            © {datetime.utcnow().year} Digital Safety Knights · digitalsafetyknights.org
          </p>
        </div>
      </div>
    </div>
    '''


def lambda_handler(event, context):
    """Triggered daily by EventBridge. No-ops unless this month's Journal
    PDF is confirmed live in S3, and never sends twice for the same month."""
    now = datetime.utcnow()
    month_key = now.strftime('%Y-%m')
    month_label = now.strftime('%B %Y')
    pdf_key = f"journal/{now.strftime('%B').lower()}-{now.year}.pdf"

    state_item = state.get_item(Key={'pk': 'journal_digest'}).get('Item', {})
    if state_item.get('last_sent_month') == month_key:
        print(f'Already sent for {month_key}, skipping.')
        return {'success': True, 'skipped': 'already_sent', 'month': month_key}

    try:
        s3.head_object(Bucket=SITE_BUCKET, Key=pdf_key)
    except Exception:
        print(f'{pdf_key} not published yet, skipping.')
        return {'success': True, 'skipped': 'not_published_yet', 'month': month_key}

    pdf_url = f'https://digitalsafetyknights.org/{pdf_key}'

    sent = 0
    failed = 0
    skipped = 0

    try:
        response = members.scan()
        all_members = response.get('Items', [])
        while 'LastEvaluatedKey' in response:
            response = members.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            all_members.extend(response.get('Items', []))

        subject = f"📰 The {month_label} DSK Journal is up"

        for member in all_members:
            email = member.get('email')
            name = member.get('name', 'Knight')
            active = member.get('active', True)
            unsubscribed = member.get('unsubscribed', False)

            if not email or not active or unsubscribed:
                skipped += 1
                continue

            try:
                html = build_email_html(name, month_label, pdf_url)
                ses.send_email(
                    Source='noreply@digitalsafetyknights.org',
                    Destination={'ToAddresses': [email]},
                    Message={
                        'Subject': {'Data': subject},
                        'Body': {'Html': {'Data': html}}
                    }
                )
                sent += 1
                time.sleep(0.1)
            except Exception as e:
                print(f'Failed to send to {email}: {str(e)}')
                failed += 1

        state.put_item(Item={
            'pk': 'journal_digest',
            'last_sent_month': month_key,
            'sent_at': now.isoformat()
        })

        result = {'success': True, 'sent': sent, 'failed': failed, 'skipped': skipped, 'total': len(all_members), 'month': month_key}
        print(f'Monthly journal digest complete: {result}')
        return result

    except Exception as e:
        print(f'Monthly journal digest error: {str(e)}')
        return {'success': False, 'error': str(e)}
