import json
import boto3
import secrets
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
ses = boto3.client('ses', region_name='us-east-1')
sessions = dynamodb.Table('dsk-sessions')
members = dynamodb.Table('dsk-members')


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
        email = body.get('email', '').strip().lower()

        if not email or '@' not in email:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Valid email required.'})
            }

        # Check if user is a member
        existing = members.get_item(Key={'email': email})
        if 'Item' not in existing:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'No account found. Please join DSK first.'})
            }

        member = existing['Item']

        # Generate secure token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(minutes=15)

        # Save token to sessions table (15 min expiry)
        sessions.put_item(Item={
            'token': token,
            'email': email,
            'expires_at': expires_at.isoformat(),
            'used': False
        })

        # Build magic link
        magic_link = f'https://digitalsafetyknights.org/dashboard.html?token={token}'

        # Send email
        ses.send_email(
            Source='noreply@digitalsafetyknights.org',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': '🛡️ Your DSK Login Link'},
                'Body': {
                    'Html': {'Data': f'''
                    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6fb;padding:20px;">
                      <div style="background:#0d1b3e;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
                        <h1 style="color:#c9a84c;margin:0;font-size:1.6rem;">⚔️ Digital Safety Knights</h1>
                      </div>
                      <div style="background:white;padding:35px;border-radius:0 0 12px 12px;text-align:center;">
                        <h2 style="color:#0d1b3e;margin-bottom:10px;">Welcome back, {member.get('name', 'Knight')}!</h2>
                        <p style="color:#555;line-height:1.7;margin-bottom:25px;">
                          Click the button below to securely log in to your DSK dashboard.
                          This link expires in <strong>15 minutes</strong>.
                        </p>
                        <a href="{magic_link}"
                           style="display:inline-block;background:#c9a84c;color:#0d1b3e;
                                  padding:16px 40px;border-radius:28px;text-decoration:none;
                                  font-weight:900;font-size:1rem;box-shadow:0 4px 16px rgba(201,168,76,0.4);">
                          🔐 Log In to Dashboard
                        </a>
                        <p style="color:#999;font-size:0.78rem;margin-top:30px;line-height:1.6;">
                          If you didn't request this, you can safely ignore it.<br>
                          The link won't work after 15 minutes.
                        </p>
                        <p style="color:#aaa;font-size:0.72rem;margin-top:20px;border-top:1px solid #eee;padding-top:15px;">
                          © 2026 Digital Safety Knights · digitalsafetyknights.org
                        </p>
                      </div>
                    </div>
                    '''}
                }
            }
        )

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'message': 'Login link sent! Check your email.'})
        }

    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': 'Server error.'})
        }
