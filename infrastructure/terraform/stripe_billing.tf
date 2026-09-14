# Founding Knight subscription support: self-service Billing Portal and a
# webhook receiver that keeps dsk-members.founding_knight in sync with the
# real subscription state (cancellations, failed renewals) instead of only
# trusting the one-time success-page confirmation.
locals {
  dsk_lambda_layer_arn = "arn:aws:lambda:us-east-1:339712706640:layer:stripe-python:1"
}

data "archive_file" "billing_portal" {
  type        = "zip"
  output_path = "${path.module}/.build/billing_portal.zip"
  source {
    content  = file("${path.module}/../../backend/lambda_billing_portal.py")
    filename = "lambda_billing_portal.py"
  }
}

resource "aws_lambda_function" "billing_portal" {
  function_name    = "dsk-billing-portal"
  role             = data.aws_iam_role.dsk_lambda_role.arn
  handler          = "lambda_billing_portal.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256
  filename         = data.archive_file.billing_portal.output_path
  source_code_hash = data.archive_file.billing_portal.output_base64sha256
  layers           = [local.dsk_lambda_layer_arn]
}

resource "aws_apigatewayv2_integration" "billing_portal" {
  api_id                 = local.dsk_api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.billing_portal.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "billing_portal" {
  api_id    = local.dsk_api_id
  route_key = "POST /billing-portal"
  target    = "integrations/${aws_apigatewayv2_integration.billing_portal.id}"
}

resource "aws_lambda_permission" "billing_portal_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.billing_portal.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-east-1:339712706640:${local.dsk_api_id}/*/*/billing-portal"
}

data "archive_file" "stripe_webhook" {
  type        = "zip"
  output_path = "${path.module}/.build/stripe_webhook.zip"
  source {
    content  = file("${path.module}/../../backend/lambda_stripe_webhook.py")
    filename = "lambda_stripe_webhook.py"
  }
}

resource "aws_lambda_function" "stripe_webhook" {
  function_name    = "dsk-stripe-webhook"
  role             = data.aws_iam_role.dsk_lambda_role.arn
  handler          = "lambda_stripe_webhook.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256
  filename         = data.archive_file.stripe_webhook.output_path
  source_code_hash = data.archive_file.stripe_webhook.output_base64sha256
  layers           = [local.dsk_lambda_layer_arn]
}

resource "aws_apigatewayv2_integration" "stripe_webhook" {
  api_id                 = local.dsk_api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.stripe_webhook.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "stripe_webhook" {
  api_id    = local.dsk_api_id
  route_key = "POST /stripe-webhook"
  target    = "integrations/${aws_apigatewayv2_integration.stripe_webhook.id}"
}

resource "aws_lambda_permission" "stripe_webhook_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stripe_webhook.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-east-1:339712706640:${local.dsk_api_id}/*/*/stripe-webhook"
}

output "billing_portal_function_name" {
  value = aws_lambda_function.billing_portal.function_name
}

output "stripe_webhook_function_name" {
  value = aws_lambda_function.stripe_webhook.function_name
}
