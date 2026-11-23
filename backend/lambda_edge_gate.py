"""
dsk-edge-gate: the API's door, as a Lambda authorizer on dsk-api.

Every route except POST /stripe-webhook (Stripe calls that one directly)
accepts calls only from Preclearance's edge, the firewall in front of the
site: its two fixed outgoing addresses. So nobody can go around the
firewall by calling the API's own address.

When the edge itself is down, Route 53 points api.digitalsafetyknights.org
straight at the API (the custom domain) and visitors arrive from their own
addresses. Then the door opens for everyone, so the site keeps working:
the edge's health is read from Route 53's health check (CloudWatch metric
HealthCheckStatus), at most every 30 seconds. If that reading fails, the
door opens too: a working site comes first.

Results are cached by API Gateway per caller address for 60 seconds.
"""
import datetime
import os
import time

import boto3

EDGE_EGRESS = {ip.strip() for ip in os.environ.get("EDGE_EGRESS_IPS", "63.185.255.22,63.186.219.69").split(",") if ip.strip()}
HEALTH_CHECK_ID = os.environ.get("EDGE_HEALTH_CHECK_ID", "")

_cloudwatch = boto3.client("cloudwatch", region_name="us-east-1")
_health = {"at": 0.0, "up": True}


def edge_up():
    """True while Route 53 sees the edge answering (cached 30 s)."""
    now = time.time()
    if now - _health["at"] < 30:
        return _health["up"]
    up = False
    try:
        end = datetime.datetime.now(datetime.timezone.utc)
        res = _cloudwatch.get_metric_data(
            StartTime=end - datetime.timedelta(minutes=4),
            EndTime=end,
            MetricDataQueries=[{
                "Id": "h",
                "MetricStat": {
                    "Metric": {"Namespace": "AWS/Route53", "MetricName": "HealthCheckStatus",
                               "Dimensions": [{"Name": "HealthCheckId", "Value": HEALTH_CHECK_ID}]},
                    "Period": 60,
                    "Stat": "Minimum",
                },
            }],
        )
        values = res["MetricDataResults"][0]["Values"]
        # Newest first; no reading at all counts as "not known to be up".
        up = bool(values) and values[0] >= 1
    except Exception as err:  # noqa: BLE001 - any failure opens the door
        print(f"edge health unreadable, opening: {err}")
        up = False
    _health.update(at=now, up=up)
    return up


def handler(event, _context):
    ip = (event.get("requestContext") or {}).get("http", {}).get("sourceIp", "")
    if ip in EDGE_EGRESS:
        return {"isAuthorized": True}
    if not HEALTH_CHECK_ID or not edge_up():
        return {"isAuthorized": True}
    return {"isAuthorized": False}
