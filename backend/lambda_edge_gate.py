"""
dsk-edge-gate: the API's door, as a Lambda authorizer on dsk-api.

Every route except POST /stripe-webhook (Stripe calls that one directly)
accepts calls only from Preclearance's edge, the firewall in front of the
site: its two fixed outgoing addresses. So nobody can go around the
firewall by calling the API's own address.

When the edge itself is down, Route 53 points api.digitalsafetyknights.org
straight at the API (the custom domain) and visitors arrive from their own
addresses. Then the door opens for everyone, so the site keeps working:
the edge's health is read live from Route 53's health checkers, at most
every 10 seconds. If that reading fails, the
door opens too: a working site comes first.

Results are cached by API Gateway per caller address for 10 seconds (the
2026-11-23 drill: with 60 s, a refusal cached just before the switch kept
the door shut for over a minute after it).
"""
import os
import time

import boto3

EDGE_EGRESS = {ip.strip() for ip in os.environ.get("EDGE_EGRESS_IPS", "63.185.255.22,63.186.219.69").split(",") if ip.strip()}
HEALTH_CHECK_ID = os.environ.get("EDGE_HEALTH_CHECK_ID", "")

_route53 = boto3.client("route53")
_health = {"at": 0.0, "up": True, "children": None}


def _children():
    if _health["children"] is None:
        cfg = _route53.get_health_check(HealthCheckId=HEALTH_CHECK_ID)["HealthCheck"]["HealthCheckConfig"]
        _health["children"] = cfg.get("ChildHealthChecks") or [HEALTH_CHECK_ID]
    return _health["children"]


def edge_up():
    """True while Route 53's own checkers see at least one edge address answering (cached 10 s).

    Read live from the checkers (GetHealthCheckStatus), not from CloudWatch:
    the metric trails by one to two minutes, which in the 2026-11-23 drill
    kept the door shut for 65 s after DNS had already sent visitors here.
    Route 53 counts a check healthy when more than 18% of its checkers do.
    """
    now = time.time()
    if now - _health["at"] < 10:
        return _health["up"]
    up = False
    try:
        for child in _children():
            obs = _route53.get_health_check_status(HealthCheckId=child)["HealthCheckObservations"]
            ok = sum(1 for o in obs if o.get("StatusReport", {}).get("Status", "").startswith("Success"))
            if obs and ok / len(obs) > 0.18:
                up = True
                break
    except Exception as err:  # noqa: BLE001 - any failure opens the door
        print(f"edge health unreadable, opening: {err}")
        _health["children"] = None  # the checks may have been replaced: read them again next time
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
