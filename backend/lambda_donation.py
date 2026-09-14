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

# Subscriptions must reference a real Price object, not inline price_data —
# inline recurring price_data on a subscription-mode Checkout Session creates
# the Session fine via the API, but intermittently fails to render on
# Stripe's hosted Checkout page ("Something went wrong"). A stable
# lookup_key makes this self-healing across cold starts/redeploys without
# hardcoding a price ID.
FOUNDING_KNIGHT_LOOKUP_KEY = 'dsk_founding_knight_annual'
FOUNDING_KNIGHT_AMOUNT = 499  # $4.99/yr — fixed, not user-editable (see index.html donate(4.99, true))


def get_founding_knight_price_id():
    existing = stripe.Price.list(lookup_keys=[FOUNDING_KNIGHT_LOOKUP_KEY], active=True, limit=1)
    if existing.data:
        return existing.data[0].id
    product = stripe.Product.create(
        name='DSK Founding Knight — Annual Support',
        description='Renews yearly. Cancel anytime — nothing on DSK is ever locked behind this.',
    )
    price = stripe.Price.create(
        product=product.id,
        currency='usd',
        unit_amount=FOUNDING_KNIGHT_AMOUNT,
        recurring={'interval': 'year'},
        lookup_key=FOUNDING_KNIGHT_LOOKUP_KEY,
    )
    return price.id


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
        founding_knight = bool(body.get('founding_knight', False))

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

        # Create Stripe Checkout Session.
        # Founding Knight is a real recurring annual subscription (not a
        # one-time charge) — the button promises "$4.99/yr", so it has to
        # actually renew yearly and be cancellable via the Billing Portal.
        common_kwargs = dict(
            customer_email=email,
            metadata={
                'donor_name': name,
                'donor_email': email,
                'founding_knight': 'true' if founding_knight else 'false',
            },
            success_url='https://digitalsafetyknights.org/donation-success.html?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://digitalsafetyknights.org/#membership',
        )

        if founding_knight:
            session = stripe.checkout.Session.create(
                line_items=[{
                    'price': get_founding_knight_price_id(),
                    'quantity': 1,
                }],
                mode='subscription',
                **common_kwargs,
            )
        else:
            session = stripe.checkout.Session.create(
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
                **common_kwargs,
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
