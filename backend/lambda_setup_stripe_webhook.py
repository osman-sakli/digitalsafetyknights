import boto3
import stripe


def get_secret(name):
    client = boto3.client('secretsmanager', region_name='us-east-1')
    return client.get_secret_value(SecretId=name)['SecretString']


stripe.api_key = get_secret('dsk/stripe/secret-key')

WEBHOOK_URL = 'https://w6dqaq0l33.execute-api.us-east-1.amazonaws.com/prod/stripe-webhook'
EVENTS = [
    'checkout.session.completed',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_failed',
]


def lambda_handler(event, context):
    """One-off admin utility: registers the DSK webhook endpoint with Stripe
    and writes the resulting signing secret straight to Secrets Manager.
    The secret is never included in this function's return value or logs —
    Stripe only ever shows it once, at creation time, so it goes directly
    into Secrets Manager instead of anywhere a human (or log) would see it.
    """
    existing = stripe.WebhookEndpoint.list(limit=100)
    endpoint = next((e for e in existing.auto_paging_iter() if e.url == WEBHOOK_URL), None)

    if endpoint:
        return {
            'success': True,
            'action': 'existing',
            'endpoint_id': endpoint.id,
            'note': ('Endpoint already existed — its signing secret was NOT re-shown by Stripe. '
                     'If dsk/stripe/webhook-secret is missing or stale, delete this endpoint in the '
                     'Stripe Dashboard and re-run this Lambda to get a fresh secret.')
        }

    endpoint = stripe.WebhookEndpoint.create(
        url=WEBHOOK_URL,
        enabled_events=EVENTS,
        description='DSK backend — subscription lifecycle sync',
    )

    secrets_client = boto3.client('secretsmanager', region_name='us-east-1')
    try:
        secrets_client.put_secret_value(SecretId='dsk/stripe/webhook-secret', SecretString=endpoint.secret)
    except secrets_client.exceptions.ResourceNotFoundException:
        secrets_client.create_secret(Name='dsk/stripe/webhook-secret', SecretString=endpoint.secret)

    return {
        'success': True,
        'action': 'created',
        'endpoint_id': endpoint.id,
        'events': EVENTS,
    }
