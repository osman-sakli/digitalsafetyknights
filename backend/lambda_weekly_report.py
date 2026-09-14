import json
import boto3
from datetime import datetime
import time

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
ses = boto3.client('ses', region_name='us-east-1')
members = dynamodb.Table('dsk-members')


# ─────────────────────────────────────────
# Weekly Knight Report — short weekly digest, reusing the same
# dsk-members list and SES sending path as the monthly newsletter
# (lambda_newsletter.py). Content rotates by ISO week number so no
# external state is needed to avoid repeats for ~3-4 months.
# ─────────────────────────────────────────
TIPS = [
    {
        'icon': '🎮',
        'title': 'Check who your child added on Roblox this week',
        'content': 'A 60-second habit: open the friends list together and ask "Who is this?" for anyone new. Remove anyone they haven\'t met in real life.',
        'link': 'https://digitalsafetyknights.org/guides/roblox-parent-guide.pdf'
    },
    {
        'icon': '👻',
        'title': 'Turn on Discord\'s Ghost Mode restrictions',
        'content': 'Ghost Mode lets strangers message minors without adding them as a friend first. Family Center + server-join restrictions close that gap.',
        'link': 'https://digitalsafetyknights.org/guides/discord-parent-guide.pdf'
    },
    {
        'icon': '🎰',
        'title': 'Loot boxes use the same design as slot machines',
        'content': 'Random-reward mechanics are built to feel like gambling because they are. Talk to your kid about the difference between a purchase and a bet.',
        'link': 'https://digitalsafetyknights.org/glossary.html'
    },
    {
        'icon': '👤',
        'title': 'A checkmark is not proof of anything',
        'content': 'Verification badges can be faked or bought. Teach your child to judge people by behavior over time, never by a blue check.',
        'link': 'https://digitalsafetyknights.org/guides/incident-response-guide.pdf'
    },
    {
        'icon': '📸',
        'title': '"Disappearing" messages can still be screenshotted',
        'content': 'Snapchat and similar apps do not make content unrecoverable. Anything sent can be captured before it disappears — plan accordingly.',
        'link': 'https://digitalsafetyknights.org/guides/snapchat-parent-guide.pdf'
    },
    {
        'icon': '🗣️',
        'title': 'Agree on a family code word',
        'content': 'AI voice cloning is cheap and convincing now. A private code word verifies identity fast if anyone calls claiming to be family in an emergency.',
        'link': 'https://digitalsafetyknights.org/guides/talk-to-your-kids-guide.pdf'
    },
    {
        'icon': '🤖',
        'title': 'Audit AI companion apps this week',
        'content': 'Character.AI, Replika, and similar "roleplay" apps have documented harm cases involving minors. If installed, review together or remove.',
        'link': 'https://digitalsafetyknights.org/guides/safe-ai-usage-guide.pdf'
    },
    {
        'icon': '⏱️',
        'title': 'The TAKE IT DOWN Act gives a 48-hour removal window',
        'content': 'If a real or AI-generated intimate image of a minor is posted online, platforms must remove it within 48 hours of a valid request.',
        'link': 'https://digitalsafetyknights.org/guides/incident-response-guide.pdf'
    },
]

ASK_A_KNIGHT = [
    {
        'q': '"My kid says everyone in their class has a Discord — is that actually true?"',
        'a': 'It feels that way to them, but "everyone" almost never means everyone. Ask which specific friends, and start there — real usage is usually smaller and more knowable than it seems.',
    },
    {
        'q': '"Is it overkill to look through my teenager\'s phone?"',
        'a': 'Blanket surveillance erodes trust and rarely catches real risk. Targeted checks — friends lists, new apps, unknown numbers — protect without turning into full-time monitoring.',
    },
    {
        'q': '"My child got a scary message from a stranger. What do I do right now?"',
        'a': 'Don\'t reply. Screenshot everything first (in case it gets deleted), block the account, and report it on the platform. Our Incident Response Guide has the exact next steps.',
    },
    {
        'q': '"Are AI chatbot friends actually dangerous, or is that overblown?"',
        'a': 'Not all of them, but several mainstream "companion" apps have real, documented cases of harmful conversations with minors. Know which apps are installed before deciding it\'s fine.',
    },
    {
        'q': '"My kid wants to livestream gameplay. Is that safe?"',
        'a': 'It can be, with settings locked down first: no real name or school shown on screen, chat moderated or off, and location services disabled on the streaming app.',
    },
]


def build_report_html(name, tip, ask):
    return f'''
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6fb;padding:20px;">
      <div style="background:#0d1b3e;padding:26px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="color:#c9a84c;margin:0;font-size:1.5rem;">⚔️ Weekly Knight Report</h1>
        <p style="color:#8899bb;margin:8px 0 0;font-size:0.82rem;">Digital Safety Knights</p>
      </div>

      <div style="background:white;padding:30px;border-radius:0 0 12px 12px;">
        <p style="color:#0d1b3e;font-size:1.05rem;font-weight:800;margin-bottom:20px;">Hi {name},</p>

        <div style="background:#f4f6fb;border-radius:14px;padding:20px;margin-bottom:18px;border-left:4px solid #c9a84c;">
          <div style="font-size:1.6rem;margin-bottom:6px;">{tip['icon']}</div>
          <h3 style="color:#0d1b3e;font-size:0.98rem;margin-bottom:8px;">{tip['title']}</h3>
          <p style="color:#444;line-height:1.65;font-size:0.88rem;margin-bottom:10px;">{tip['content']}</p>
          <a href="{tip['link']}" style="color:#c9a84c;text-decoration:none;font-weight:800;font-size:0.82rem;">Read more →</a>
        </div>

        <div style="background:linear-gradient(135deg,#0d1b3e,#1a2f6e);border-radius:14px;padding:20px;margin-bottom:8px;">
          <h3 style="color:#c9a84c;font-size:0.92rem;margin-bottom:10px;">🛡️ Ask a Knight</h3>
          <p style="color:#e8c56a;font-size:0.86rem;font-style:italic;margin-bottom:8px;">{ask['q']}</p>
          <p style="color:#a8b8d8;font-size:0.86rem;line-height:1.6;">{ask['a']}</p>
          <p style="margin-top:14px;">
            <a href="https://discord.gg/RmMZqnF4e" style="color:#c9a84c;text-decoration:none;font-weight:800;font-size:0.8rem;">Have a question? Ask it in our Discord →</a>
          </p>
        </div>

        <div style="margin-top:26px;padding-top:18px;border-top:1px solid #eee;text-align:center;">
          <p style="color:#666;font-size:0.82rem;line-height:1.6;">
            <a href="https://digitalsafetyknights.org/#guides" style="color:#c9a84c;text-decoration:none;">📚 Guides</a> ·
            <a href="https://digitalsafetyknights.org/member-id.html" style="color:#c9a84c;text-decoration:none;">🪪 Member Card</a> ·
            <a href="https://discord.gg/RmMZqnF4e" style="color:#c9a84c;text-decoration:none;">💬 Discord</a> ·
            <a href="https://digitalsafetyknights.org/dashboard.html" style="color:#c9a84c;text-decoration:none;">⚔️ Dashboard</a>
          </p>
          <p style="color:#aaa;font-size:0.72rem;margin-top:14px;line-height:1.6;">
            © 2026 Digital Safety Knights · digitalsafetyknights.org<br>
            <a href="https://digitalsafetyknights.org/unsubscribe.html?email={name}" style="color:#999;text-decoration:underline;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </div>
    '''


def lambda_handler(event, context):
    """Triggered weekly by EventBridge (Mondays)."""
    now = datetime.utcnow()
    week_num = now.isocalendar()[1]
    tip = TIPS[week_num % len(TIPS)]
    ask = ASK_A_KNIGHT[week_num % len(ASK_A_KNIGHT)]

    print(f'Weekly report started: {now.isoformat()} (ISO week {week_num})')

    sent = 0
    failed = 0
    skipped = 0

    try:
        response = members.scan()
        all_members = response.get('Items', [])
        while 'LastEvaluatedKey' in response:
            response = members.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            all_members.extend(response.get('Items', []))

        print(f'Total members: {len(all_members)}')

        subject = f"⚔️ Weekly Knight Report — {now.strftime('%B %-d, %Y')}"

        for member in all_members:
            email = member.get('email')
            name = member.get('name', 'Knight')
            active = member.get('active', True)
            unsubscribed = member.get('unsubscribed', False)

            if not email or not active or unsubscribed:
                skipped += 1
                continue

            try:
                html = build_report_html(name, tip, ask)
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

        result = {'success': True, 'sent': sent, 'failed': failed, 'skipped': skipped, 'total': len(all_members)}
        print(f'Weekly report complete: {result}')
        return result

    except Exception as e:
        print(f'Weekly report error: {str(e)}')
        return {'success': False, 'error': str(e)}
