import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
members = dynamodb.Table('dsk-members')


def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError


def top_leaderboard(limit=10):
    resp = members.scan(
        ProjectionExpression='#n, game_high_score',
        ExpressionAttributeNames={'#n': 'name'},
        FilterExpression='attribute_exists(game_high_score) AND game_high_score > :z',
        ExpressionAttributeValues={':z': 0}
    )
    rows = resp.get('Items', [])
    rows.sort(key=lambda r: r.get('game_high_score', 0), reverse=True)
    return [{'name': r.get('name', 'Knight'), 'score': r.get('game_high_score', 0)} for r in rows[:limit]]


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
        score = int(body.get('score', 0))

        if not email or '@' not in email:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Valid email required.'})}
        if score < 0 or score > 100000:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Invalid score.'})}

        existing = members.get_item(Key={'email': email})
        if 'Item' not in existing:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Member not found.'})}

        current_best = int(existing['Item'].get('game_high_score', 0))
        new_best = max(current_best, score)

        if new_best > current_best:
            members.update_item(
                Key={'email': email},
                UpdateExpression='SET game_high_score = :s',
                ExpressionAttributeValues={':s': new_best}
            )

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'game_high_score': new_best,
                'is_new_best': new_best > current_best,
                'leaderboard': top_leaderboard()
            }, default=decimal_default)
        }

    except Exception as e:
        print(f'Error: {str(e)}')
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Server error.'})}
