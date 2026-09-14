import json
import uuid
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
ses = boto3.client('ses', region_name='us-east-1')
table = dynamodb.Table('dsk-studio-submissions')

ADMIN_EMAIL = 'osmansakli@yahoo.com'
MAX_TIP_LEN = 240
MIN_TIP_LEN = 10


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
        nickname = body.get('nickname', '').strip()
        tip = body.get('tip', '').strip()

        if not nickname or len(nickname) > 24:
            return {
                'statusCode': 400, 'headers': headers,
                'body': json.dumps({'success': False, 'message': 'A Knight name (up to 24 characters) is required.'})
            }
        if len(tip) < MIN_TIP_LEN or len(tip) > MAX_TIP_LEN:
            return {
                'statusCode': 400, 'headers': headers,
                'body': json.dumps({'success': False, 'message': f'Your tip must be between {MIN_TIP_LEN} and {MAX_TIP_LEN} characters.'})
            }

        submission_id = str(uuid.uuid4())
        table.put_item(Item={
            'submission_id': submission_id,
            'nickname': nickname,
            'tip': tip,
            'status': 'pending',
            'submitted_at': datetime.utcnow().isoformat()
        })

        send_admin_notification(submission_id, nickname, tip)

        return {
            'statusCode': 200, 'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': f"Thanks, {nickname}! Your tip is in for review. If it's approved, it'll show up on the Knight Wall."
            })
        }

    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500, 'headers': headers,
            'body': json.dumps({'success': False, 'message': 'Server error. Please try again.'})
        }


def send_admin_notification(submission_id, nickname, tip):
    try:
        ses.send_email(
            Source='noreply@digitalsafetyknights.org',
            Destination={'ToAddresses': [ADMIN_EMAIL]},
            Message={
                'Subject': {'Data': f'New Knight Studio submission from {nickname}'},
                'Body': {'Text': {'Data': (
                    f"Nickname: {nickname}\n\nTip:\n{tip}\n\n"
                    f"Submission ID: {submission_id}\n\n"
                    f"To approve, run:\n"
                    f"aws dynamodb update-item --table-name dsk-studio-submissions "
                    f"--key '{{\"submission_id\":{{\"S\":\"{submission_id}\"}}}}' "
                    f"--update-expression 'SET #s = :a' --expression-attribute-names '{{\"#s\":\"status\"}}' "
                    f"--expression-attribute-values '{{\":a\":{{\"S\":\"approved\"}}}}'"
                )}}
            }
        )
    except Exception as e:
        print(f'Admin notification error: {str(e)}')
