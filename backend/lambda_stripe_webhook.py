import json
import base64
import boto3
import stripe
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
members = dynamodb.Table('dsk-members')

_secrets = boto3.client('secretsmanager', region_name='us-east-1')
stripe.api_key = _secrets.get_secret_value(SecretId='dsk/stripe/secret-key')['SecretString']
WEBHOOK_SECRET = _secrets.get_secret_value(SecretId='dsk/stripe/webhook-secret')['SecretString']


def lambda_handler(event, context):
    """Source of truth for subscription lifecycle — the success-page-driven
    confirm endpoint (lambda_donation_confirm) covers the happy path, but
    cancellations and failed renewals only ever reach us here.
    """
    raw_body = event.get('body', '')
    if event.get('isBase64Encoded'):
        raw_body = base64.b64decode(raw_body)
    elif isinstance(raw_body, str):
        raw_body = raw_body.encode('utf-8')

    sig_header = (event.get('headers') or {}).get('stripe-signature', '')

    try:
        stripe_event = stripe.Webhook.construct_event(raw_body, sig_header, WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        print(f'Webhook signature verification failed: {e}')
        return {'statusCode': 400, 'body': 'Invalid signature'}

    event_type = stripe_event['type']
    data = stripe_event['data']['object']
    print(f'Stripe webhook received: {event_type}')

    try:
        if event_type == 'customer.subscription.deleted':
            _set_founding_knight_by_customer(data['customer'], False)

        elif event_type == 'customer.subscription.updated':
            # Stripe marks a subscription 'past_due'/'unpaid' before eventually
            # cancelling it — treat anything not active/trialing as lapsed.
            active = data.get('status') in ('active', 'trialing')
            _set_founding_knight_by_customer(data['customer'], active)

        elif event_type == 'invoice.payment_failed':
            print(f"Payment failed for customer {data.get('customer')} — subscription.updated will follow if it lapses.")

    except Exception as e:
        print(f'Error handling {event_type}: {e}')
        # Still 200 — Stripe retries on non-2xx, and we don't want infinite
        # retries for a bug in our own bookkeeping to block their webhook queue.

    return {'statusCode': 200, 'body': json.dumps({'received': True})}


def _set_founding_knight_by_customer(customer_id, is_active):
    if not customer_id:
        return
    response = members.scan(
        FilterExpression='stripe_customer_id = :c',
        ExpressionAttributeValues={':c': customer_id}
    )
    for item in response.get('Items', []):
        members.update_item(
            Key={'email': item['email']},
            UpdateExpression='SET founding_knight = :f, founding_knight_updated = :d',
            ExpressionAttributeValues={':f': is_active, ':d': datetime.utcnow().isoformat()}
        )
