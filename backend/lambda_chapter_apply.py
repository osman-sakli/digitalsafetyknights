import json
import uuid
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
ses = boto3.client('ses', region_name='us-east-1')
table = dynamodb.Table('dsk-chapter-applications')

ADMIN_EMAIL = 'osmansakli@yahoo.com'

ROLE_LABELS = {
    'parent': 'Parent',
    'teacher': 'Teacher / Educator',
    'student': 'Student (18+)',
    'community_leader': 'Community / Youth Organization Leader',
    'other': 'Other',
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
        name    = body.get('name', '').strip()
        email   = body.get('email', '').strip().lower()
        country = body.get('country', '').strip()
        city    = body.get('city', '').strip()
        role    = body.get('role', '').strip().lower()
        why     = body.get('why', '').strip()

        if role not in ROLE_LABELS:
            role = 'other'

        if not name or not email or '@' not in email:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Name and a valid email are required.'})}
        if not country:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Country is required.'})}
        if len(why) < 20:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Tell us a bit more about why you want to start a chapter (at least 20 characters).'})}

        application_id = str(uuid.uuid4())
        table.put_item(Item={
            'application_id': application_id,
            'name':           name,
            'email':          email,
            'country':        country,
            'city':           city,
            'role':           role,
            'role_label':     ROLE_LABELS[role],
            'why':            why,
            'status':         'pending',
            'applied_at':     datetime.utcnow().isoformat()
        })

        send_applicant_confirmation(email, name, country)
        send_admin_notification(application_id, name, email, country, city, role, why)

        return {
            'statusCode': 200, 'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': f"Thanks, {name}! Your chapter application for {country} is in. We review every application personally and will follow up by email."
            })
        }

    except Exception as e:
        print(f'Error: {str(e)}')
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Server error. Please try again.'})}


def send_applicant_confirmation(email, name, country):
    try:
        ses.send_email(
            Source='team@digitalsafetyknights.org',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': '⚔️ Your Digital Safety Knights chapter application was received'},
                'Body': {'Html': {'Data': f'''
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6fb;padding:20px;">
                  <div style="background:#0d1b3e;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
                    <h1 style="color:#c9a84c;margin:0;">⚔️ Digital Safety Knights</h1>
                    <p style="color:#8899bb;margin:8px 0 0;">Chapter Application</p>
                  </div>
                  <div style="background:white;padding:30px;border-radius:0 0 12px 12px;">
                    <h2 style="color:#0d1b3e;">Thanks, {name}! 🛡️</h2>
                    <p style="color:#555;line-height:1.7;">
                      We received your application to start a Digital Safety Knights chapter in <strong>{country}</strong>.
                      We review every chapter application personally — since this involves real local
                      responsibility, we'll likely follow up with a few questions or a short call before
                      anything is finalized.
                    </p>
                    <p style="color:#555;line-height:1.7;">
                      In the meantime, feel free to explore the rest of the site and join our
                      <a href="https://discord.gg/RmMZqnF4e" style="color:#c9a84c;">Discord</a>.
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
        print(f'Applicant email error: {str(e)}')


def send_admin_notification(application_id, name, email, country, city, role, why):
    try:
        ses.send_email(
            Source='noreply@digitalsafetyknights.org',
            Destination={'ToAddresses': [ADMIN_EMAIL]},
            Message={
                'Subject': {'Data': f'🌍 New chapter application: {country}'},
                'Body': {'Text': {'Data': (
                    f"Name:    {name}\n"
                    f"Email:   {email}\n"
                    f"Country: {country}\n"
                    f"City:    {city or '(none given)'}\n"
                    f"Role:    {ROLE_LABELS[role]}\n\n"
                    f"Why they want to start a chapter:\n{why}\n\n"
                    f"Application ID: {application_id}\n"
                    f"Full list: DynamoDB table dsk-chapter-applications\n\n"
                    f"To approve: onboard them via the existing Stripe Connect chapter "
                    f"onboarding flow (lambda_connect_onboard_chapter), then set their entry "
                    f"in dsk-chapters status to 'active' so they show up on /chapters.html."
                )}}
            }
        )
    except Exception as e:
        print(f'Admin notification error: {str(e)}')
