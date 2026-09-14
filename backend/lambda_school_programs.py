import json
import uuid
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
ses = boto3.client('ses', region_name='us-east-1')
table = dynamodb.Table('dsk-school-program-requests')

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
        school_name   = body.get('school_name', '').strip()
        contact_name  = body.get('contact_name', '').strip()
        email         = body.get('email', '').strip().lower()
        phone         = body.get('phone', '').strip()
        city          = body.get('city', '').strip()
        state         = body.get('state', '').strip()
        grade_levels  = body.get('grade_levels', '').strip()
        format_pref   = body.get('format', 'either').strip().lower()  # 'in_person' | 'virtual' | 'either' | 'materials_only'
        message       = body.get('message', '').strip()

        if not school_name or not contact_name or not email or '@' not in email:
            return {
                'statusCode': 400, 'headers': headers,
                'body': json.dumps({'success': False, 'message': 'School name, contact name, and a valid email are required.'})
            }
        if format_pref not in ('in_person', 'virtual', 'either', 'materials_only'):
            format_pref = 'either'

        request_id = str(uuid.uuid4())
        table.put_item(Item={
            'request_id':    request_id,
            'school_name':   school_name,
            'contact_name':  contact_name,
            'email':         email,
            'phone':         phone,
            'city':          city,
            'state':         state,
            'grade_levels':  grade_levels,
            'format':        format_pref,
            'message':       message,
            'status':        'pending',
            'requested_at':  datetime.utcnow().isoformat()
        })

        send_requester_confirmation(email, contact_name, school_name, format_pref)
        send_admin_notification(request_id, school_name, contact_name, email, phone, city, state, grade_levels, format_pref, message)

        follow_up = ("We'll email your materials directly." if format_pref == 'materials_only'
                     else "We'll email you within a few business days to schedule.")
        return {
            'statusCode': 200, 'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': f"Thanks, {contact_name}! We received your request for {school_name}. {follow_up}"
            })
        }

    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500, 'headers': headers,
            'body': json.dumps({'success': False, 'message': 'Server error. Please try again.'})
        }


def send_requester_confirmation(email, contact_name, school_name, format_pref='either'):
    try:
        if format_pref == 'materials_only':
            body_copy = (
                f"We received your request for <strong>{school_name}</strong>. We personally review every "
                "request and will email your organization our guides and educational materials directly — "
                "no session needed on your end."
            )
        else:
            body_copy = (
                f"We received your request for <strong>{school_name}</strong>. We personally review every "
                "request and will email you back within a few business days to discuss dates, format "
                "(in-person or virtual), and topics."
            )
        ses.send_email(
            Source='noreply@digitalsafetyknights.org',
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': '⚔️ Your DSK School & Organization Program request was received'},
                'Body': {'Html': {'Data': f'''
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6fb;padding:20px;">
                  <div style="background:#0d1b3e;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
                    <h1 style="color:#c9a84c;margin:0;">⚔️ Digital Safety Knights</h1>
                    <p style="color:#8899bb;margin:8px 0 0;">School &amp; Organization Programs</p>
                  </div>
                  <div style="background:white;padding:30px;border-radius:0 0 12px 12px;">
                    <h2 style="color:#0d1b3e;">Thanks, {contact_name}! 🏫</h2>
                    <p style="color:#555;line-height:1.7;">{body_copy}</p>
                    <p style="color:#555;line-height:1.7;">
                      In the meantime, feel free to browse our free
                      <a href="https://digitalsafetyknights.org/#guides" style="color:#c9a84c;">parent &amp; educator guides</a>
                      — the same topics we cover in our sessions and materials.
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
        print(f'Requester email error: {str(e)}')


def send_admin_notification(request_id, school_name, contact_name, email, phone, city, state, grade_levels, format_pref, message):
    try:
        ses.send_email(
            Source='noreply@digitalsafetyknights.org',
            Destination={'ToAddresses': [ADMIN_EMAIL]},
            Message={
                'Subject': {'Data': f'New school program request: {school_name}'},
                'Body': {'Text': {'Data': (
                    f"School: {school_name}\nContact: {contact_name}\nEmail: {email}\nPhone: {phone}\n"
                    f"Location: {city}, {state}\nGrade levels: {grade_levels}\nFormat: {format_pref}\n\n"
                    f"Message:\n{message}\n\n"
                    f"Request ID: {request_id}\nReview in DynamoDB table dsk-school-program-requests."
                )}}
            }
        )
    except Exception as e:
        print(f'Admin notification error: {str(e)}')
