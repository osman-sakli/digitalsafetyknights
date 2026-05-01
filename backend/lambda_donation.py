import json
import os
import stripe
import boto3

# Get Stripe secret key from AWS Secrets Manager
def get_stripe_key():
    client = boto3.client('secretsmanager', region_name='us-east-1')
    secret = client.get_secret_value(SecretId='dsk/stripe/secret-key')
    return secret['SecretString']

stripe.api_key = get_stripe_key()
ses = boto3.client('ses', region_name='us-east-1')


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
        amount = int(body.get('amount', 0))  # in cents
        email = body.get('email', '').strip().lower()
        name = body.get('name', 'Anonymous Donor').strip()

        if amount < 100:  # min $1
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Minimum donation is $1.'})
            }

        if not email or '@' not in email:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Valid email required.'})
            }

        # Create Stripe Checkout Session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Digital Safety Knights Donation',
                        'description': 'Supporting child digital safety education worldwide.',
                    },
                    'unit_amount': amount,
                },
                'quantity': 1,
            }],
            mode='payment',
            customer_email=email,
            metadata={
                'donor_name': name,
                'donor_email': email,
            },
            success_url='https://digitalsafetyknights.org/donation-success.html?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://digitalsafetyknights.org/#membership',
        )

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'checkout_url': session.url,
                'session_id': session.id
            })
        }

    except stripe.error.StripeError as e:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': str(e)})
        }
    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': 'Server error. Please try again.'})
        }
