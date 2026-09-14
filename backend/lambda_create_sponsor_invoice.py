import json
import boto3
import stripe


def get_stripe_key():
    client = boto3.client('secretsmanager', region_name='us-east-1')
    return client.get_secret_value(SecretId='dsk/stripe/secret-key')['SecretString']


stripe.api_key = get_stripe_key()

# No Stripe Tax registration exists on this account yet (checked via the
# Tax Registrations API — zero results). Per Stripe's own guidance,
# automatic_tax must stay off until a registration exists: turning it on
# without one means Stripe silently calculates and collects $0 tax while
# looking configured. Enable it here only after adding a registration in
# the Stripe Dashboard (Settings > Tax).
AUTOMATIC_TAX_ENABLED = False


def lambda_handler(event, context):
    """Admin-triggered: creates and sends a Stripe Invoice to a sponsor or
    school for a sponsorship package or guide-bundle license. Not exposed
    in site nav — Osman runs this directly per sponsor deal.
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
        org_name    = body.get('org_name', '').strip()
        email       = body.get('email', '').strip().lower()
        description = body.get('description', '').strip()
        amount      = int(body.get('amount', 0))  # cents
        days_until_due = int(body.get('days_until_due', 30))

        if not org_name or not email or '@' not in email:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'org_name and valid email required.'})}
        if amount < 100:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Minimum invoice amount is $1.'})}
        if not description:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'description required (line item shown on the invoice).'})}

        existing_customers = stripe.Customer.list(email=email, limit=1)
        if existing_customers.data:
            customer = existing_customers.data[0]
        else:
            customer = stripe.Customer.create(name=org_name, email=email)

        invoice = stripe.Invoice.create(
            customer=customer.id,
            collection_method='send_invoice',
            days_until_due=days_until_due,
            automatic_tax={'enabled': AUTOMATIC_TAX_ENABLED},
            description=f'Digital Safety Knights — {org_name}',
        )

        stripe.InvoiceItem.create(
            customer=customer.id,
            invoice=invoice.id,
            amount=amount,
            currency='usd',
            description=description,
        )

        invoice = stripe.Invoice.finalize_invoice(invoice.id)
        stripe.Invoice.send_invoice(invoice.id)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'invoice_id': invoice.id,
                'hosted_invoice_url': invoice.hosted_invoice_url,
                'tax_applied': AUTOMATIC_TAX_ENABLED,
            })
        }

    except stripe.error.StripeError as e:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'success': False, 'message': str(e)})}
    except Exception as e:
        print(f'Error: {str(e)}')
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'success': False, 'message': 'Server error.'})}
