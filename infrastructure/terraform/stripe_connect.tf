# Regional Chapter / Partner Educator payouts via Stripe Connect.
# Marketplace pattern: destination charges, DSK is merchant of record,
# platform owns fees + negative-balance liability, chapters get the
# lightweight Express dashboard. See CHAPTER11_MEMBERSHIP_PLAN.md-adjacent
# discovery notes — no chapters are onboarded yet, this is the mechanism
# for when the first one is.
resource "aws_dynamodb_table" "chapters" {
  name         = "dsk-chapters"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "chapter_id"

  attribute {
    name = "chapter_id"
    type = "S"
  }
}

data "archive_file" "connect_onboard_chapter" {
  type        = "zip"
  output_path = "${path.module}/.build/connect_onboard_chapter.zip"
  source {
    content  = file("${path.module}/../../backend/lambda_connect_onboard_chapter.py")
    filename = "lambda_connect_onboard_chapter.py"
  }
}

resource "aws_lambda_function" "connect_onboard_chapter" {
  function_name    = "dsk-connect-onboard-chapter"
  role             = data.aws_iam_role.dsk_lambda_role.arn
  handler          = "lambda_connect_onboard_chapter.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256
  filename         = data.archive_file.connect_onboard_chapter.output_path
  source_code_hash = data.archive_file.connect_onboard_chapter.output_base64sha256
  layers           = [local.dsk_lambda_layer_arn]
}

resource "aws_apigatewayv2_integration" "connect_onboard_chapter" {
  api_id                 = local.dsk_api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.connect_onboard_chapter.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "connect_onboard_chapter" {
  api_id    = local.dsk_api_id
  route_key = "POST /connect-onboard-chapter"
  target    = "integrations/${aws_apigatewayv2_integration.connect_onboard_chapter.id}"
}

resource "aws_lambda_permission" "connect_onboard_chapter_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.connect_onboard_chapter.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-east-1:339712706640:${local.dsk_api_id}/*/*/connect-onboard-chapter"
}

data "archive_file" "connect_checkout" {
  type        = "zip"
  output_path = "${path.module}/.build/connect_checkout.zip"
  source {
    content  = file("${path.module}/../../backend/lambda_connect_checkout.py")
    filename = "lambda_connect_checkout.py"
  }
}

resource "aws_lambda_function" "connect_checkout" {
  function_name    = "dsk-connect-checkout"
  role             = data.aws_iam_role.dsk_lambda_role.arn
  handler          = "lambda_connect_checkout.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256
  filename         = data.archive_file.connect_checkout.output_path
  source_code_hash = data.archive_file.connect_checkout.output_base64sha256
  layers           = [local.dsk_lambda_layer_arn]
}

resource "aws_apigatewayv2_integration" "connect_checkout" {
  api_id                 = local.dsk_api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.connect_checkout.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "connect_checkout" {
  api_id    = local.dsk_api_id
  route_key = "POST /connect-checkout"
  target    = "integrations/${aws_apigatewayv2_integration.connect_checkout.id}"
}

resource "aws_lambda_permission" "connect_checkout_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.connect_checkout.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-east-1:339712706640:${local.dsk_api_id}/*/*/connect-checkout"
}

output "connect_onboard_chapter_function_name" {
  value = aws_lambda_function.connect_onboard_chapter.function_name
}

output "connect_checkout_function_name" {
  value = aws_lambda_function.connect_checkout.function_name
}
