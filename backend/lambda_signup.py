import json
import boto3
import uuid
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
ses = boto3.client('ses', region_name='us-east-1')
table = dynamodb.Table('dsk-members')

def lambda_handler(event, context):
    # CORS headers — her response'da olmalı
    headers = {
        'Access-Control-Allow-Origin': 'https://digitalsafetyknights.org',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }

    # OPTIONS preflight request
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        # Body'yi parse et
        body = json.loads(event.get('body', '{}'))
        name    = body.get('name', '').strip()
        email   = body.get('email', '').strip().lower()
        country = body.get('country', 'Unknown')
        role    = body.get('role', 'Unknown')
        plan    = body.get('plan', 'Free Knight')

        # Validasyon
        if not name or not email or '@' not in email:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Name and valid email required.'})
            }

        # Zaten üye mi?
        existing = table.get_item(Key={'email': email})
        if 'Item' in existing:
            return {
                'statusCode': 409,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'This email is already registered.'})
            }

        # DynamoDB'ye kaydet
        member_id = str(uuid.uuid4())
        table.put_item(Item={
            'email':      email,
            'member_id':  member_id,
            'name':       name,
            'country':    country,
            'role':       role,
            'plan':       plan,
            'badge':      'Bronze Squire',
            'joined_at':  datetime.utcnow().isoformat(),
            'active':     True
        })

        # Hoşgeldin maili gönder
        send_welcome_email(email, name, plan)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': f'Welcome to DSK, {name}! Check your email.',
                'member_id': member_id
            })
        }

    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': 'Server error. Please try again.'})
        }


def send_welcome_email(email, name, plan):
    try:
        ses.send_email(
            Source='noreply@digitalsafetyknights.org',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': '⚔️ Welcome to Digital Safety Knights!'},
                'Body': {
                    'Html': {'Data': f'''
                    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6fb;padding:20px;">
                      <div style="background:#0d1b3e;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
                        <h1 style="color:#c9a84c;margin:0;">⚔️ Digital Safety Knights</h1>
                        <p style="color:#8899bb;margin:8px 0 0;">Global Digital Child Safety Organization</p>
                      </div>
                      <div style="background:white;padding:30px;border-radius:0 0 12px 12px;">
                        <h2 style="color:#0d1b3e;">Welcome, {name}! 🛡️</h2>
                        <p style="color:#555;line-height:1.7;">
                          You've joined the <strong>Digital Safety Knights</strong> as a 
                          <strong style="color:#c9a84c;">{plan}</strong> member.
                        </p>
                        <p style="color:#555;line-height:1.7;">
                          Your first badge <strong>🪙 Bronze Squire</strong> has been awarded!
                        </p>
                        <div style="background:#f4f6fb;border-radius:10px;padding:20px;margin:20px 0;">
                          <h3 style="color:#0d1b3e;margin:0 0 10px;">Your Next Steps:</h3>
                          <ul style="color:#555;line-height:2;margin:0;padding-left:20px;">
                            <li>Download your free <strong>Family Safety Guides</strong></li>
                            <li>Explore the <strong>Roblox Safety Lab</strong></li>
                            <li>Read the latest <strong>DSK Monthly Journal</strong></li>
                            <li>Complete modules to earn more <strong>badges</strong></li>
                          </ul>
                        </div>
                        <div style="text-align:center;margin-top:25px;">
                          <a href="https://digitalsafetyknights.org" 
                             style="background:#c9a84c;color:#0d1b3e;padding:14px 32px;
                                    border-radius:25px;text-decoration:none;font-weight:900;">
                            Visit DSK →
                          </a>
                        </div>
                        <p style="color:#aaa;font-size:0.8rem;margin-top:25px;text-align:center;">
                          © 2025 Digital Safety Knights · digitalsafetyknights.org
                        </p>
                      </div>
                    </div>
                    '''}
                }
            }
        )
    except Exception as e:
        print(f'Email error: {str(e)}')
        # Mail gönderilemese bile kayıt başarılı sayılır
