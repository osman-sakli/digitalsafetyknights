import json
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
ses = boto3.client('ses', region_name='us-east-1')
table = dynamodb.Table('dsk-knight-council-applications')

ADMIN_EMAIL = 'osmansakli@yahoo.com'


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
        age     = body.get('age')
        country = body.get('country', 'Unknown').strip()
        why     = body.get('why', '').strip()

        try:
            age = int(age)
        except (TypeError, ValueError):
            age = 0

        if not name or not email or '@' not in email:
            return {
                'statusCode': 400, 'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Name and valid email required.'})
            }
        if age < 13 or age > 17:
            return {
                'statusCode': 400, 'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Knight Council is open to ages 13–17.'})
            }
        if len(why) < 20:
            return {
                'statusCode': 400, 'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Tell us a bit more about why you want to join (at least 20 characters).'})
            }

        existing = table.get_item(Key={'email': email})
        if 'Item' in existing:
            return {
                'statusCode': 409, 'headers': headers,
                'body': json.dumps({'success': False, 'message': 'You have already applied with this email.'})
            }

        table.put_item(Item={
            'email':      email,
            'name':       name,
            'age':        age,
            'country':    country,
            'why':        why,
            'status':     'pending',
            'applied_at': datetime.utcnow().isoformat()
        })

        send_applicant_confirmation(email, name)
        send_admin_notification(name, email, age, country, why)

        return {
            'statusCode': 200, 'headers': headers,
            'body': json.dumps({'success': True, 'message': f'Thanks, {name}! Your Knight Council application is in. We review applications every two weeks and will email you either way.'})
        }

    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500, 'headers': headers,
            'body': json.dumps({'success': False, 'message': 'Server error. Please try again.'})
        }


def send_applicant_confirmation(email, name):
    try:
        ses.send_email(
            Source='noreply@digitalsafetyknights.org',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': '⚔️ Your Knight Council application was received'},
                'Body': {'Html': {'Data': f'''
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6fb;padding:20px;">
                  <div style="background:#0d1b3e;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
                    <h1 style="color:#c9a84c;margin:0;">⚔️ Digital Safety Knights</h1>
                    <p style="color:#8899bb;margin:8px 0 0;">Knight Council Application</p>
                  </div>
                  <div style="background:white;padding:30px;border-radius:0 0 12px 12px;">
                    <h2 style="color:#0d1b3e;">Thanks, {name}! 🛡️</h2>
                    <p style="color:#555;line-height:1.7;">
                      We received your Knight Council application. We review new applications every two weeks
                      and will email you either way — accepted or not — so you're never left wondering.
                    </p>
                    <p style="color:#555;line-height:1.7;">
                      In the meantime, keep building your Knight Points and check out our
                      <a href="https://discord.gg/RmMZqnF4e" style="color:#c9a84c;">Discord</a> to meet other Knights.
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


def send_admin_notification(name, email, age, country, why):
    try:
        ses.send_email(
            Source='noreply@digitalsafetyknights.org',
            Destination={'ToAddresses': [ADMIN_EMAIL]},
            Message={
                'Subject': {'Data': f'New Knight Council application: {name}'},
                'Body': {'Text': {'Data': (
                    f"Name: {name}\nEmail: {email}\nAge: {age}\nCountry: {country}\n\n"
                    f"Why they want to join:\n{why}\n\n"
                    f"Review in DynamoDB table dsk-knight-council-applications."
                )}}
            }
        )
    except Exception as e:
        print(f'Admin notification error: {str(e)}')
