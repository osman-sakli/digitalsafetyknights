import json
import boto3
import stripe

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
chapters = dynamodb.Table('dsk-chapters')


def get_stripe_key():
    client = boto3.client('secretsmanager', region_name='us-east-1')
    return client.get_secret_value(SecretId='dsk/stripe/secret-key')['SecretString']


stripe.api_key = get_stripe_key()


def lambda_handler(event, context):
    """Destination-charge checkout for a sponsor/parent paying a specific
    regional chapter (e.g. a workshop fee). DSK is merchant of record;
    the chapter's share auto-transfers to their connected account on
    payment success, minus DSK's platform fee.
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
        chapter_id = body.get('chapter_id', '').strip()
        amount = int(body.get('amount', 0))  # cents
        email = body.get('email', '').strip().lower()
        description = body.get('description', 'DSK Chapter Program Payment').strip()

        if amount < 100:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Minimum payment is $1.'})}
        if not email or '@' not in email:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Valid email required.'})}

        chapter = chapters.get_item(Key={'chapter_id': chapter_id}).get('Item')
        if not chapter:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Chapter not found.'})}
        if chapter.get('status') != 'active':
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'This chapter has not completed onboarding yet.'})}

        fee_percent = int(chapter.get('platform_fee_percent', 10))
        application_fee_amount = round(amount * fee_percent / 100)

        session = stripe.checkout.Session.create(
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f"{chapter['chapter_name']} — DSK Chapter Program",
                        'description': description,
                    },
                    'unit_amount': amount,
                },
                'quantity': 1,
            }],
            mode='payment',
            customer_email=email,
            payment_intent_data={
                'application_fee_amount': application_fee_amount,
                'transfer_data': {
                    'destination': chapter['stripe_account_id'],
                },
            },
            metadata={
                'chapter_id': chapter_id,
                'chapter_name': chapter['chapter_name'],
            },
            success_url='https://digitalsafetyknights.org/donation-success.html?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://digitalsafetyknights.org/#membership',
        )

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'checkout_url': session.url, 'session_id': session.id})}

    except stripe.error.StripeError as e:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': str(e)})}
    except Exception as e:
        print(f'Error: {str(e)}')
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Server error.'})}
