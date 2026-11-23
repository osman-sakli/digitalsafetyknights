
# The edge gate (backend/lambda_edge_gate.py): a Lambda authorizer on dsk-api
# that admits only Preclearance's edge, and everyone while the edge is down.
# Made with the AWS CLI on 2026-11-23, so Terraform does not create it; the
# routes below refer to it so an apply keeps them locked.
locals {
  edge_gate_authorizer_id = "58o4c5"
}
