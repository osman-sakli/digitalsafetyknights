import json
import uuid
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
ses = boto3.client('ses', region_name='us-east-1')
table = dynamodb.Table('dsk-concern-reports')

TEAM_EMAIL = 'team@digitalsafetyknights.org'

VALID_CATEGORIES = {
    'safety_concern',
    'site_bug',
    'content_feedback',
    'school_org',
    'other',
}


def lambda_handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': 'https://digitalsafetyknights.org',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        body = json.loads(event.get('body', '{}'))
        category = body.get('category', '').strip().lower()
        message  = body.get('message', '').strip()
        name     = body.get('name', '').strip()
        email    = body.get('email', '').strip().lower()

        if category not in VALID_CATEGORIES:
            category = 'other'
        if not message:
            return {
                'statusCode': 400, 'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Please include a message.'})
            }
        if email and '@' not in email:
            return {
                'statusCode': 400, 'headers': headers,
                'body': json.dumps({'success': False, 'message': 'That email address doesn\'t look right.'})
            }

        report_id = str(uuid.uuid4())
        table.put_item(Item={
            'report_id':   report_id,
            'category':    category,
            'message':     message,
            'name':        name or 'Not given',
            'email':       email or 'Not given',
            'status':      'new',
            'reported_at': datetime.utcnow().isoformat()
        })

        send_team_notification(report_id, category, message, name, email)
        if email:
            send_reporter_confirmation(email, name)

        return {
            'statusCode': 200, 'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': 'Thank you — this has been sent to our team. If you shared your email, we\'ll follow up.'
            })
        }

    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500, 'headers': headers,
            'body': json.dumps({'success': False, 'message': 'Server error. Please try again.'})
        }


CATEGORY_LABELS = {
    'safety_concern': 'A safety concern about my child',
    'site_bug': 'Something broken on the site',
    'content_feedback': 'Feedback on our content',
    'school_org': 'School / organization inquiry',
    'other': 'Other',
}


def send_team_notification(report_id, category, message, name, email):
    try:
        ses.send_email(
            Source='noreply@digitalsafetyknights.org',
            Destination={'ToAddresses': [TEAM_EMAIL]},
            Message={
                'Subject': {'Data': f'🛡️ New report: {CATEGORY_LABELS.get(category, "Other")}'},
                'Body': {'Text': {'Data': (
                    f"Category: {CATEGORY_LABELS.get(category, 'Other')}\n"
                    f"Name:     {name or 'Not given'}\n"
                    f"Email:    {email or 'Not given'}\n\n"
                    f"Message:\n{message}\n\n"
                    f"Report ID: {report_id}\n"
                    f"Full list: DynamoDB table dsk-concern-reports"
                )}}
            }
        )
    except Exception as e:
        print(f'Team notification error: {str(e)}')


def send_reporter_confirmation(email, name):
    try:
        greeting = f'Hi {name}' if name else 'Hi'
        ses.send_email(
            Source='noreply@digitalsafetyknights.org',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': '⚔️ We received your message — Digital Safety Knights'},
                'Body': {'Html': {'Data': f'''
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6fb;padding:20px;">
                  <div style="background:#0d1b3e;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
                    <h1 style="color:#c9a84c;margin:0;">⚔️ Digital Safety Knights</h1>
                  </div>
                  <div style="background:white;padding:30px;border-radius:0 0 12px 12px;">
                    <h2 style="color:#0d1b3e;">{greeting} — we got it 🛡️</h2>
                    <p style="color:#555;line-height:1.7;">
                      Thanks for reaching out. A real person on our small team reads every message that
                      comes through this form, and we'll get back to you directly at this address.
                    </p>
                    <p style="color:#555;line-height:1.7;">
                      If this is urgent — a child is in immediate danger — please contact local emergency
                      services or the <a href="https://digitalsafetyknights.org/#emergency" style="color:#c9a84c;">emergency
                      resources on our site</a> first; this inbox is checked by humans, not monitored 24/7.
                    </p>
                    <p style="color:#aaa;font-size:0.8rem;margin-top:25px;text-align:center;">
                      © 2026 Digital Safety Knights · digitalsafetyknights.org
                    </p>
                  </div>
                </div>
                '''}}
            }
        )
    except Exception as e:
        print(f'Reporter confirmation error: {str(e)}')
