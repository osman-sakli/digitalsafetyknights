# Knight Council — teen ambassador program (ages 13-17), open self-application
# reviewed manually every two weeks. Reuses the existing dsk-lambda-role and
# wires a new route onto the existing HTTP API (w6dqaq0l33) that already
# serves /signup, /login, etc.
locals {
  dsk_api_id = "w6dqaq0l33"
}

resource "aws_dynamodb_table" "knight_council_applications" {
  name         = "dsk-knight-council-applications"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "email"

  attribute {
    name = "email"
    type = "S"
  }
}

data "archive_file" "knight_council" {
  type        = "zip"
  output_path = "${path.module}/.build/knight_council.zip"
  source {
    content  = file("${path.module}/../../backend/lambda_knight_council.py")
    filename = "lambda_knight_council.py"
  }
}

resource "aws_lambda_function" "knight_council" {
  function_name    = "dsk-knight-council"
  role             = data.aws_iam_role.dsk_lambda_role.arn
  handler          = "lambda_knight_council.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256
  filename         = data.archive_file.knight_council.output_path
  source_code_hash = data.archive_file.knight_council.output_base64sha256
}

resource "aws_apigatewayv2_integration" "knight_council" {
  api_id                 = local.dsk_api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.knight_council.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "knight_council" {
  api_id    = local.dsk_api_id
  route_key = "POST /knight-council-apply"
  target    = "integrations/${aws_apigatewayv2_integration.knight_council.id}"
}

resource "aws_lambda_permission" "knight_council_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.knight_council.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-east-1:339712706640:${local.dsk_api_id}/*/*/knight-council-apply"
}

output "knight_council_function_name" {
  value = aws_lambda_function.knight_council.function_name
}
