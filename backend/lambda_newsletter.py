import json
import boto3
from datetime import datetime
import time

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
ses = boto3.client('ses', region_name='us-east-1')
members = dynamodb.Table('dsk-members')


# ─────────────────────────────────────────
# MONTHLY CONTENT — Update each month
# ─────────────────────────────────────────
NEWSLETTER_CONTENT = {
    'month': datetime.utcnow().strftime('%B %Y'),
    'subject': '🛡️ DSK Monthly Tips — {month}',
    'headline': "This Month's Family Safety Tips",
    'intro': "Three quick actions to make your family safer online this month. Each one takes less than 10 minutes.",
    'tips': [
        {
            'icon': '🎮',
            'title': 'Tip 1: Check Your Child\'s Roblox Friends List',
            'content': 'Sit with your child this week and review their Roblox friends list together. Ask "Who is this person?" for each one. Anyone they don\'t know in real life should be removed. This single conversation prevents many grooming attempts.',
            'link': 'https://digitalsafetyknights.org/guides/roblox-parent-guide.pdf',
            'link_text': 'Download Roblox Guide →'
        },
        {
            'icon': '🤖',
            'title': 'Tip 2: Audit Your AI Apps',
            'content': 'Open your child\'s phone and check installed AI apps. If you see Character.AI, Replika, or any AI "roleplay" or "companion" apps — remove them immediately. These platforms have documented harm cases involving minors.',
            'link': 'https://digitalsafetyknights.org/guides/safe-ai-usage-guide.pdf',
            'link_text': 'Download AI Safety Guide →'
        },
        {
            'icon': '💬',
            'title': 'Tip 3: Establish a Family Code Word',
            'content': 'Pick a word only your family knows. Use it to verify identity if anyone calls or messages claiming to be a family member with an emergency. With AI voice cloning so accessible now, this simple practice protects against sophisticated scams targeting children.',
            'link': 'https://digitalsafetyknights.org/guides/talk-to-your-kids-guide.pdf',
            'link_text': 'Download Communication Guide →'
        }
    ],
    'cta_title': 'Take Your Family Safety Audit',
    'cta_text': 'Get a personalized score and action plan in 5 minutes.',
    'cta_link': 'https://digitalsafetyknights.org/audit.html'
}


def build_email_html(name, content):
    tips_html = ''
    for tip in content['tips']:
        tips_html += f'''
        <div style="background:#f4f6fb;border-radius:14px;padding:22px;margin-bottom:16px;border-left:4px solid #c9a84c;">
          <div style="font-size:2rem;margin-bottom:8px;">{tip['icon']}</div>
          <h3 style="color:#0d1b3e;font-size:1.05rem;margin-bottom:10px;">{tip['title']}</h3>
          <p style="color:#444;line-height:1.7;font-size:0.92rem;margin-bottom:12px;">{tip['content']}</p>
          <a href="{tip['link']}" style="color:#c9a84c;text-decoration:none;font-weight:800;font-size:0.85rem;">{tip['link_text']}</a>
        </div>
        '''

    return f'''
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6fb;padding:20px;">
      <div style="background:#0d1b3e;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="color:#c9a84c;margin:0;font-size:1.8rem;">⚔️ Digital Safety Knights</h1>
        <p style="color:#8899bb;margin:8px 0 0;font-size:0.85rem;">Monthly Family Safety Tips · {content['month']}</p>
      </div>

      <div style="background:white;padding:35px;border-radius:0 0 12px 12px;">
        <h2 style="color:#0d1b3e;font-size:1.4rem;margin-bottom:6px;">Hi {name},</h2>
        <h3 style="color:#c9a84c;font-size:1.1rem;margin-bottom:12px;">{content['headline']}</h3>
        <p style="color:#555;line-height:1.7;font-size:0.95rem;margin-bottom:25px;">{content['intro']}</p>

        {tips_html}

        <div style="background:linear-gradient(135deg,#0d1b3e,#1a2f6e);border-radius:14px;padding:24px;text-align:center;margin-top:25px;">
          <h3 style="color:#c9a84c;font-size:1.1rem;margin-bottom:8px;">{content['cta_title']}</h3>
          <p style="color:#a8b8d8;font-size:0.9rem;margin-bottom:16px;">{content['cta_text']}</p>
          <a href="{content['cta_link']}" style="display:inline-block;background:#c9a84c;color:#0d1b3e;padding:12px 28px;border-radius:24px;text-decoration:none;font-weight:900;font-size:0.95rem;">
            🛡️ Take Audit →
          </a>
        </div>

        <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;text-align:center;">
          <p style="color:#666;font-size:0.85rem;line-height:1.6;">
            <a href="https://digitalsafetyknights.org/#guides" style="color:#c9a84c;text-decoration:none;">📚 Guides</a> ·
            <a href="https://digitalsafetyknights.org/#journal" style="color:#c9a84c;text-decoration:none;">📰 Journal</a> ·
            <a href="https://discord.gg/RmMZqnF4e" style="color:#c9a84c;text-decoration:none;">💬 Discord</a> ·
            <a href="https://digitalsafetyknights.org/dashboard.html" style="color:#c9a84c;text-decoration:none;">⚔️ Dashboard</a>
          </p>
          <p style="color:#aaa;font-size:0.75rem;margin-top:15px;line-height:1.6;">
            © 2026 Digital Safety Knights · digitalsafetyknights.org<br>
            <a href="https://digitalsafetyknights.org/unsubscribe.html?email={name}" style="color:#999;text-decoration:underline;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </div>
    '''


def lambda_handler(event, context):
    """Triggered by EventBridge on the 1st of each month."""

    print(f'Newsletter started: {datetime.utcnow().isoformat()}')

    sent = 0
    failed = 0
    skipped = 0

    try:
        # Scan all members
        response = members.scan()
        all_members = response.get('Items', [])

        # Handle pagination if more than 1MB of data
        while 'LastEvaluatedKey' in response:
            response = members.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            all_members.extend(response.get('Items', []))

        print(f'Total members: {len(all_members)}')

        subject = NEWSLETTER_CONTENT['subject'].format(month=NEWSLETTER_CONTENT['month'])

        for member in all_members:
            email = member.get('email')
            name = member.get('name', 'Knight')
            active = member.get('active', True)
            unsubscribed = member.get('unsubscribed', False)

            if not email or not active or unsubscribed:
                skipped += 1
                continue

            try:
                html = build_email_html(name, NEWSLETTER_CONTENT)

                ses.send_email(
                    Source='noreply@digitalsafetyknights.org',
                    Destination={'ToAddresses': [email]},
                    Message={
                        'Subject': {'Data': subject},
                        'Body': {'Html': {'Data': html}}
                    }
                )
                sent += 1

                # SES rate limit safety (1 email/second on starter, 14/sec on production)
                time.sleep(0.1)

            except Exception as e:
                print(f'Failed to send to {email}: {str(e)}')
                failed += 1

        result = {
            'success': True,
            'sent': sent,
            'failed': failed,
            'skipped': skipped,
            'total': len(all_members),
            'month': NEWSLETTER_CONTENT['month']
        }
        print(f'Newsletter complete: {result}')
        return result

    except Exception as e:
        print(f'Newsletter error: {str(e)}')
        return {'success': False, 'error': str(e)}
