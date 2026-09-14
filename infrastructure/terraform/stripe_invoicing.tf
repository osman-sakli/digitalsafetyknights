# Sponsor / school invoicing — admin-triggered, not a public-facing form.
# Tax stays off: zero Stripe Tax registrations exist on this account today
# (verified via the Tax Registrations API), and enabling automatic_tax
# without one silently collects $0 tax instead of erroring, per Stripe's
# own guidance.
data "archive_file" "create_sponsor_invoice" {
  type        = "zip"
  output_path = "${path.module}/.build/create_sponsor_invoice.zip"
  source {
    content  = file("${path.module}/../../backend/lambda_create_sponsor_invoice.py")
    filename = "lambda_create_sponsor_invoice.py"
  }
}

resource "aws_lambda_function" "create_sponsor_invoice" {
  function_name    = "dsk-create-sponsor-invoice"
  role             = data.aws_iam_role.dsk_lambda_role.arn
  handler          = "lambda_create_sponsor_invoice.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256
  filename         = data.archive_file.create_sponsor_invoice.output_path
  source_code_hash = data.archive_file.create_sponsor_invoice.output_base64sha256
  layers           = [local.dsk_lambda_layer_arn]
}

resource "aws_apigatewayv2_integration" "create_sponsor_invoice" {
  api_id                 = local.dsk_api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.create_sponsor_invoice.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "create_sponsor_invoice" {
  api_id    = local.dsk_api_id
  route_key = "POST /create-sponsor-invoice"
  target    = "integrations/${aws_apigatewayv2_integration.create_sponsor_invoice.id}"
}

resource "aws_lambda_permission" "create_sponsor_invoice_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_sponsor_invoice.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-east-1:339712706640:${local.dsk_api_id}/*/*/create-sponsor-invoice"
}

output "create_sponsor_invoice_function_name" {
  value = aws_lambda_function.create_sponsor_invoice.function_name
}
