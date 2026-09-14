import json
import boto3
from datetime import datetime
import stripe


def get_stripe_key():
    client = boto3.client('secretsmanager', region_name='us-east-1')
    secret = client.get_secret_value(SecretId='dsk/stripe/secret-key')
    return secret['SecretString']


stripe.api_key = get_stripe_key()
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
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
        session_id = body.get('session_id', '').strip()
        if not session_id:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'session_id required.'})}

        # Ask Stripe directly whether this session was actually paid — never
        # trust the client's own claim, since this endpoint is reachable by
        # anyone who lands on the success page.
        session = stripe.checkout.Session.retrieve(session_id)

        if session.payment_status != 'paid':
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': False, 'founding_knight': False, 'message': 'Payment not completed.'})}

        metadata = session.metadata or {}
        is_founding = metadata.get('founding_knight') == 'true'
        email = (metadata.get('donor_email') or session.customer_email or '').strip().lower()
        name = metadata.get('donor_name') or 'Knight'

        if is_founding and email:
            # Founding Knight is a subscription — most one-off site donors
            # aren't already in dsk-members, so create the record here if
            # needed rather than silently dropping the badge.
            update_fields = {
                'founding_knight': True,
                'founding_knight_since': datetime.utcnow().isoformat(),
                'stripe_customer_id': session.customer,
            }
            if session.mode == 'subscription' and session.subscription:
                update_fields['stripe_subscription_id'] = session.subscription

            existing = members.get_item(Key={'email': email})
            if 'Item' in existing:
                expr_names = {f'#{k}': k for k in update_fields}
                expr_values = {f':{k}': v for k, v in update_fields.items()}
                members.update_item(
                    Key={'email': email},
                    UpdateExpression='SET ' + ', '.join(f'#{k} = :{k}' for k in update_fields),
                    ExpressionAttributeNames=expr_names,
                    ExpressionAttributeValues=expr_values,
                )
            else:
                members.put_item(Item={
                    'email': email,
                    'name': name,
                    'country': 'Unknown',
                    'role': 'Unknown',
                    'plan': 'Founding Knight',
                    'badge': 'Bronze Squire',
                    'joined_at': datetime.utcnow().isoformat(),
                    'active': True,
                    **update_fields,
                })

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True, 'founding_knight': is_founding})
        }

    except stripe.error.StripeError as e:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': str(e)})}
    except Exception as e:
        print(f'Error: {str(e)}')
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Server error.'})}
