import json
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
members_table = dynamodb.Table('dsk-members')
kc_table = dynamodb.Table('dsk-knight-council-applications')


# ─────────────────────────────────────────
# Public, read-only aggregate counts for the Transparency page. Returns only
# counts and a distinct country list — never names, emails, or any other
# per-member field — so it's safe to expose with no auth. Scans are cheap at
# this org's current scale (single digits to low hundreds of members); this
# would need a DynamoDB counter item instead of a scan if membership ever
# grows into the thousands.
# ─────────────────────────────────────────

def scan_all(table):
    items = []
    resp = table.scan()
    items.extend(resp.get('Items', []))
    while 'LastEvaluatedKey' in resp:
        resp = table.scan(ExclusiveStartKey=resp['LastEvaluatedKey'])
        items.extend(resp.get('Items', []))
    return items


def lambda_handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': 'https://digitalsafetyknights.org',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Content-Type': 'application/json'
    }

    if event.get('httpMethod') == 'OPTIONS' or event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        members = scan_all(members_table)
        try:
            kc_applications = scan_all(kc_table)
        except Exception:
            kc_applications = []

        countries = sorted({
            (m.get('country') or '').strip()
            for m in members
            if (m.get('country') or '').strip() and m.get('country', '').strip().lower() != 'unknown'
        })

        body = {
            'members': len(members),
            'countries': len(countries),
            'knight_council_applications': len(kc_applications),
            'updated': datetime.utcnow().isoformat()
        }
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(body)}

    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500, 'headers': headers,
            'body': json.dumps({'success': False, 'message': 'Server error.'})
        }
