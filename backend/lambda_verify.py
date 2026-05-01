import json
import boto3
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
sessions = dynamodb.Table('dsk-sessions')
members = dynamodb.Table('dsk-members')


def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError


def calculate_badges(member):
    """Calculate which badges a member has earned."""
    badges = ['Bronze Squire']  # Everyone starts here

    guides_downloaded = len(member.get('guides_downloaded', []))
    journal_read = len(member.get('journal_read', []))
    referrals = int(member.get('referrals_count', 0))
    audit_completed = member.get('audit_completed', False)

    # Member since
    joined_str = member.get('joined_at', '')
    days_member = 0
    if joined_str:
        try:
            joined = datetime.fromisoformat(joined_str.replace('Z', '+00:00'))
            days_member = (datetime.utcnow() - joined.replace(tzinfo=None)).days
        except:
            days_member = 0

    if guides_downloaded >= 3 or audit_completed:
        badges.append('Silver Guard')

    if guides_downloaded >= 6 and journal_read >= 1:
        badges.append('Gold Sentinel')

    if referrals >= 5:
        badges.append('Diamond Defender')

    if days_member >= 365:
        badges.append('Digital Knight')

    return badges


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
        token = body.get('token', '').strip()

        if not token:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Token required.'})
            }

        # Look up token
        result = sessions.get_item(Key={'token': token})
        if 'Item' not in result:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Invalid or expired login link.'})
            }

        session = result['Item']

        # Check expiry
        expires_at = datetime.fromisoformat(session['expires_at'])
        if datetime.utcnow() > expires_at:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'This login link has expired. Please request a new one.'})
            }

        # Check if already used
        if session.get('used', False):
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'This login link has already been used.'})
            }

        # Mark as used
        sessions.update_item(
            Key={'token': token},
            UpdateExpression='SET used = :u',
            ExpressionAttributeValues={':u': True}
        )

        # Get member profile
        email = session['email']
        member_result = members.get_item(Key={'email': email})
        if 'Item' not in member_result:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Member profile not found.'})
            }

        member = member_result['Item']

        # Calculate badges
        badges = calculate_badges(member)

        # Build profile response
        profile = {
            'email': email,
            'name': member.get('name', 'Knight'),
            'plan': member.get('plan', 'Free Knight'),
            'country': member.get('country', ''),
            'role': member.get('role', ''),
            'joined_at': member.get('joined_at', ''),
            'badges': badges,
            'guides_downloaded': member.get('guides_downloaded', []),
            'journal_read': member.get('journal_read', []),
            'audit_completed': member.get('audit_completed', False),
            'referrals_count': member.get('referrals_count', 0)
        }

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'profile': profile}, default=decimal_default)
        }

    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': 'Server error.'})
        }
