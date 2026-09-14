import json
import uuid
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
ses = boto3.client('ses', region_name='us-east-1')
table = dynamodb.Table('dsk-volunteer-applications')

TEAM_EMAIL = 'team@digitalsafetyknights.org'

ROLE_LABELS = {
    'school_partnerships': 'Director, School & Community Partnerships',
    'content_research': 'Content & Research Lead',
    'community_engagement': 'Community & Digital Engagement Manager',
    'volunteer_coordinator': 'Volunteer & Knight Council Coordinator',
    'other': 'Other / Not Sure Yet',
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
        role    = body.get('role', '').strip().lower()
        name    = body.get('name', '').strip()
        email   = body.get('email', '').strip().lower()
        message = body.get('message', '').strip()

        if role not in ROLE_LABELS:
            role = 'other'
        if not name or not email or '@' not in email:
            return {
                'statusCode': 400, 'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Name and a valid email are required.'})
            }

        application_id = str(uuid.uuid4())
        table.put_item(Item={
            'application_id': application_id,
            'role':           role,
            'role_label':     ROLE_LABELS[role],
            'name':           name,
            'email':          email,
            'message':        message,
            'status':         'new',
            'applied_at':     datetime.utcnow().isoformat()
        })

        send_team_notification(application_id, role, name, email, message)
        send_applicant_confirmation(email, name, role)

        return {
            'statusCode': 200, 'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': f"Thanks, {name}! We received your interest in {ROLE_LABELS[role]}. We'll be in touch."
            })
        }

    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500, 'headers': headers,
            'body': json.dumps({'success': False, 'message': 'Server error. Please try again.'})
        }


def send_team_notification(application_id, role, name, email, message):
    try:
        ses.send_email(
            Source='noreply@digitalsafetyknights.org',
            Destination={'ToAddresses': [TEAM_EMAIL]},
            Message={
                'Subject': {'Data': f'🛡️ New team interest: {ROLE_LABELS[role]}'},
                'Body': {'Text': {'Data': (
                    f"Role:  {ROLE_LABELS[role]}\n"
                    f"Name:  {name}\n"
                    f"Email: {email}\n\n"
                    f"Message:\n{message or '(none)'}\n\n"
                    f"Application ID: {application_id}\n"
                    f"Full list: DynamoDB table dsk-volunteer-applications"
                )}}
            }
        )
    except Exception as e:
        print(f'Team notification error: {str(e)}')


def send_applicant_confirmation(email, name, role):
    try:
        ses.send_email(
            Source='noreply@digitalsafetyknights.org',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': '⚔️ Thanks for your interest in Digital Safety Knights'},
                'Body': {'Html': {'Data': f'''
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6fb;padding:20px;">
                  <div style="background:#0d1b3e;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
                    <h1 style="color:#c9a84c;margin:0;">⚔️ Digital Safety Knights</h1>
                  </div>
                  <div style="background:white;padding:30px;border-radius:0 0 12px 12px;">
                    <h2 style="color:#0d1b3e;">Thanks, {name}! 🛡️</h2>
                    <p style="color:#555;line-height:1.7;">
                      We received your interest in <strong>{ROLE_LABELS[role]}</strong>. We're a small,
                      still-growing team, so we personally review every message — we'll follow up directly
                      at this address.
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
        print(f'Applicant confirmation error: {str(e)}')
