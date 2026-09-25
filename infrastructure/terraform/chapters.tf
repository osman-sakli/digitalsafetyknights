# Public chapter application intake (/chapters.html) + a public read-only
# listing of active chapters. Separate from lambda_connect_onboard_chapter
# (admin-only, financial onboarding once a chapter is approved) — this is
# the front door: anyone can apply, Osman reviews and decides, and only
# then runs the existing Stripe Connect onboarding to make it official.

resource "aws_dynamodb_table" "chapter_applications" {
  name         = "dsk-chapter-applications"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "application_id"

  attribute {
    name = "application_id"
    type = "S"
  }
}

data "archive_file" "chapter_apply" {
  type        = "zip"
  output_path = "${path.module}/.build/chapter_apply.zip"
  source {
    content  = file("${path.module}/../../backend/lambda_chapter_apply.py")
    filename = "lambda_chapter_apply.py"
  }
}

resource "aws_lambda_function" "chapter_apply" {
  function_name    = "dsk-chapter-apply"
  role             = data.aws_iam_role.dsk_lambda_role.arn
  handler          = "lambda_chapter_apply.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256
  filename         = data.archive_file.chapter_apply.output_path
  source_code_hash = data.archive_file.chapter_apply.output_base64sha256
}

resource "aws_apigatewayv2_integration" "chapter_apply" {
  api_id                 = local.dsk_api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.chapter_apply.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "chapter_apply" {
  api_id    = local.dsk_api_id
  route_key = "POST /chapter-apply"
  target    = "integrations/${aws_apigatewayv2_integration.chapter_apply.id}"
}

resource "aws_lambda_permission" "chapter_apply_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chapter_apply.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-east-1:339712706640:${local.dsk_api_id}/*/*/chapter-apply"
}

data "archive_file" "chapters_list" {
  type        = "zip"
  output_path = "${path.module}/.build/chapters_list.zip"
  source {
    content  = file("${path.module}/../../backend/lambda_chapters_list.py")
    filename = "lambda_chapters_list.py"
  }
}

resource "aws_lambda_function" "chapters_list" {
  function_name    = "dsk-chapters-list"
  role             = data.aws_iam_role.dsk_lambda_role.arn
  handler          = "lambda_chapters_list.lambda_handler"
  runtime          = "python3.11"
  timeout          = 15
  memory_size      = 256
  filename         = data.archive_file.chapters_list.output_path
  source_code_hash = data.archive_file.chapters_list.output_base64sha256
}

resource "aws_apigatewayv2_integration" "chapters_list" {
  api_id                 = local.dsk_api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.chapters_list.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "chapters_list" {
  api_id    = local.dsk_api_id
  route_key = "GET /chapters-list"
  target    = "integrations/${aws_apigatewayv2_integration.chapters_list.id}"
}

resource "aws_lambda_permission" "chapters_list_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chapters_list.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-east-1:339712706640:${local.dsk_api_id}/*/*/chapters-list"
}

output "chapter_apply_function_name" {
  value = aws_lambda_function.chapter_apply.function_name
}

output "chapters_list_function_name" {
  value = aws_lambda_function.chapters_list.function_name
}
