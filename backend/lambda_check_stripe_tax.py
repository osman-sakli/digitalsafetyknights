import boto3
import stripe


def get_secret(name):
    client = boto3.client('secretsmanager', region_name='us-east-1')
    return client.get_secret_value(SecretId=name)['SecretString']


stripe.api_key = get_secret('dsk/stripe/secret-key')


def lambda_handler(event, context):
    registrations = stripe.tax.Registration.list(limit=100)
    return {
        'count': len(registrations.data),
        'registrations': [
            {'country': r.country, 'status': r.status, 'active_from': r.active_from}
            for r in registrations.data
        ],
    }
