import json
import uuid
import boto3
import stripe
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
chapters = dynamodb.Table('dsk-chapters')


def get_stripe_key():
    client = boto3.client('secretsmanager', region_name='us-east-1')
    return client.get_secret_value(SecretId='dsk/stripe/secret-key')['SecretString']


stripe_client = stripe.StripeClient(get_stripe_key())

# Regional chapter / partner educator payouts. Per the destination-charges
# marketplace pattern: DSK is merchant of record, so the platform (not
# Stripe) owns both fee collection and negative-balance liability, and
# chapters get the lightweight, cobranded Express dashboard rather than a
# fully independent Stripe account.
DASHBOARD = 'express'
FEES_COLLECTOR = 'application'
LOSSES_COLLECTOR = 'application'
PLATFORM_FEE_PERCENT = 10  # DSK keeps 10% of each chapter payment


def lambda_handler(event, context):
    """Admin-triggered: onboards a new regional chapter / partner educator as
    a Stripe Connect recipient account and returns a hosted onboarding link
    for them to complete identity verification. Not exposed in site nav —
    Osman runs this directly when bringing on a new chapter partner.
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
        chapter_name  = body.get('chapter_name', '').strip()
        contact_email = body.get('contact_email', '').strip().lower()
        country       = body.get('country', 'US').strip().upper()

        if not chapter_name or not contact_email or '@' not in contact_email:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'chapter_name and valid contact_email required.'})}

        account = stripe_client.v2.core.accounts.create({
            'contact_email': contact_email,
            'display_name': chapter_name,
            'dashboard': DASHBOARD,
            'configuration': {
                'recipient': {
                    'capabilities': {
                        'stripe_balance': {
                            'stripe_transfers': {'requested': True}
                        }
                    }
                }
            },
            'defaults': {
                'currency': 'usd',
                'responsibilities': {
                    'fees_collector': FEES_COLLECTOR,
                    'losses_collector': LOSSES_COLLECTOR,
                },
            },
            'identity': {
                'country': country,
            },
        })

        onboarding_link = stripe_client.v2.core.account_links.create({
            'account': account.id,
            'use_case': {
                'type': 'account_onboarding',
                'account_onboarding': {
                    'configurations': ['recipient'],
                    'refresh_url': 'https://digitalsafetyknights.org/chapter-onboarding.html?refresh=1',
                    'return_url': 'https://digitalsafetyknights.org/chapter-onboarding.html?done=1',
                },
            },
        })

        chapter_id = str(uuid.uuid4())
        chapters.put_item(Item={
            'chapter_id': chapter_id,
            'chapter_name': chapter_name,
            'contact_email': contact_email,
            'country': country,
            'stripe_account_id': account.id,
            'platform_fee_percent': PLATFORM_FEE_PERCENT,
            'status': 'onboarding',
            'created_at': datetime.utcnow().isoformat(),
        })

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'chapter_id': chapter_id,
                'stripe_account_id': account.id,
                'onboarding_url': onboarding_link.url,
            })
        }

    except stripe.error.StripeError as e:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': str(e)})}
    except Exception as e:
        print(f'Error: {str(e)}')
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Server error.'})}
