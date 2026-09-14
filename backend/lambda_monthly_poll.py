"""Monthly member vote — gives members a real say in what DSK makes next.

One POST endpoint does both jobs:
  POST /poll {}                -> current poll + live results
  POST /poll {"choice": "..."} -> record a vote, then return the results

Design notes:
- The poll definition lives here, not on the frontend, so the choices being
  displayed and the choices being counted can never drift apart.
- Counting uses DynamoDB's atomic ADD on a top-level numeric attribute per
  choice, so concurrent votes can't clobber each other.
- Duplicate-vote prevention is a localStorage flag on the client. That is
  deliberately honest rather than un-gameable: the site has no accounts and
  collects no PII from children (COPPA), so there is no identity to dedupe
  on. The number is a signal of member preference, not an election result,
  and the UI says so.
"""
import json
import boto3

TABLE = "dsk-monthly-poll-votes"

# Bump POLL_ID when the question changes — results are keyed on it, so a new
# id starts a clean count and old votes stay archived under the old id.
POLL_ID = "2026-08"

POLL = {
    "id": POLL_ID,
    "question": {
        "en": "What should next month's Knight Rule be about?",
        "tr": "Gelecek ayın Şövalye Kuralı ne hakkında olsun?",
        "es": "¿Sobre qué debería tratar la Regla del Caballero del próximo mes?",
    },
    "choices": [
        {"key": "groupchat", "emoji": "💬",
         "label": {"en": "Group chats & drama", "tr": "Grup sohbetleri ve dramalar", "es": "Chats grupales y dramas"}},
        {"key": "livestream", "emoji": "🎥",
         "label": {"en": "Livestreaming safely", "tr": "Güvenli canlı yayın", "es": "Transmitir en vivo con seguridad"}},
        {"key": "aihomework", "emoji": "🤖",
         "label": {"en": "AI homework helpers", "tr": "Yapay zeka ödev yardımcıları", "es": "Ayudantes de tareas con IA"}},
        {"key": "passwords", "emoji": "🔑",
         "label": {"en": "Passwords & account theft", "tr": "Şifreler ve hesap çalınması", "es": "Contraseñas y robo de cuentas"}},
    ],
}
VALID_KEYS = {c["key"] for c in POLL["choices"]}

dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
table = dynamodb.Table(TABLE)


def read_counts():
    resp = table.get_item(Key={"poll_id": POLL_ID})
    item = resp.get("Item", {})
    return {k: int(item.get(k, 0)) for k in VALID_KEYS}


def record_vote(choice):
    """Atomic per-choice increment — safe under concurrent votes."""
    table.update_item(
        Key={"poll_id": POLL_ID},
        UpdateExpression="ADD #c :one",
        ExpressionAttributeNames={"#c": choice},
        ExpressionAttributeValues={":one": 1},
    )


def lambda_handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": "https://digitalsafetyknights.org",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Content-Type": "application/json",
    }
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
        choice = (body.get("choice") or "").strip()

        voted = False
        if choice:
            if choice not in VALID_KEYS:
                return {
                    "statusCode": 400, "headers": headers,
                    "body": json.dumps({"success": False, "message": "Unknown choice."}),
                }
            record_vote(choice)
            voted = True

        counts = read_counts()
        return {
            "statusCode": 200, "headers": headers,
            "body": json.dumps({
                "success": True,
                "voted": voted,
                "poll": POLL,
                "counts": counts,
                "total": sum(counts.values()),
            }),
        }
    except Exception as e:  # noqa: BLE001
        print(f"Error: {e}")
        return {
            "statusCode": 500, "headers": headers,
            "body": json.dumps({"success": False, "message": "Server error. Please try again."}),
        }
