import json
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
chapters_table = dynamodb.Table('dsk-chapters')


# ─────────────────────────────────────────
# Public, read-only list of active chapters for /chapters.html. Returns only
# chapter_name, country, and the year it went active — never contact_email
# or stripe_account_id, which live in the same table but are never safe to
# expose. A chapter only appears here once Osman manually flips its status
# to 'active' after the real Stripe Connect onboarding (lambda_connect_
# onboard_chapter) is complete — no chapter is ever listed before it's real.
# ─────────────────────────────────────────

def lambda_handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': 'https://digitalsafetyknights.org',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Content-Type': 'application/json'
    }

    if event.get('httpMethod') == 'OPTIONS' or event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        items = []
        resp = chapters_table.scan()
        items.extend(resp.get('Items', []))
        while 'LastEvaluatedKey' in resp:
            resp = chapters_table.scan(ExclusiveStartKey=resp['LastEvaluatedKey'])
            items.extend(resp.get('Items', []))

        active = [
            {
                'chapter_name': i.get('chapter_name', ''),
                'country': i.get('country', ''),
                'since': (i.get('created_at') or '')[:4],
            }
            for i in items
            if i.get('status') == 'active'
        ]
        active.sort(key=lambda c: c['chapter_name'])

        body = {'chapters': active, 'count': len(active), 'updated': datetime.utcnow().isoformat()}
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(body)}

    except Exception as e:
        print(f'Error: {str(e)}')
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Server error.'})}
