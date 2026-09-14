import json
import boto3
import stripe

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
members = dynamodb.Table('dsk-members')


def get_stripe_key():
    client = boto3.client('secretsmanager', region_name='us-east-1')
    secret = client.get_secret_value(SecretId='dsk/stripe/secret-key')
    return secret['SecretString']


stripe.api_key = get_stripe_key()


def lambda_handler(event, context):
    """Lets a Founding Knight manage or cancel their subscription without
    needing an admin — required for any real recurring billing setup.
    """
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
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Valid email required.'})}

        member = members.get_item(Key={'email': email}).get('Item')
        customer_id = member.get('stripe_customer_id') if member else None

        if not customer_id:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'No Founding Knight subscription found for this email.'})}

        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url='https://digitalsafetyknights.org/dashboard.html',
        )

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'portal_url': portal_session.url})}

    except stripe.error.StripeError as e:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': str(e)})}
    except Exception as e:
        print(f'Error: {str(e)}')
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Server error.'})}
