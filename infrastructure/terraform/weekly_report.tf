# Weekly Knight Report — short weekly digest to the real dsk-members list,
# reusing the same SES sending path as the monthly newsletter. Runs every
# Monday. Reuses the existing shared dsk-lambda-role (SES + DynamoDB +
# CloudWatch Logs access) rather than provisioning a new IAM role.
data "aws_iam_role" "dsk_lambda_role" {
  name = "dsk-lambda-role"
}

data "archive_file" "weekly_report" {
  type        = "zip"
  output_path = "${path.module}/.build/weekly_report.zip"
  source {
    content  = file("${path.module}/../../backend/lambda_weekly_report.py")
    filename = "lambda_weekly_report.py"
  }
}

resource "aws_lambda_function" "weekly_report" {
  function_name    = "dsk-weekly-report"
  role             = data.aws_iam_role.dsk_lambda_role.arn
  handler          = "lambda_weekly_report.lambda_handler"
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 256
  filename         = data.archive_file.weekly_report.output_path
  source_code_hash = data.archive_file.weekly_report.output_base64sha256
}

resource "aws_cloudwatch_event_rule" "weekly_report" {
  name                = "dsk-weekly-newsletter"
  description         = "Sends the Weekly Knight Report every Monday"
  schedule_expression = "cron(0 14 ? * MON *)"
}

resource "aws_cloudwatch_event_target" "weekly_report" {
  rule = aws_cloudwatch_event_rule.weekly_report.name
  arn  = aws_lambda_function.weekly_report.arn
}

resource "aws_lambda_permission" "weekly_report_eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.weekly_report.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekly_report.arn
}

output "weekly_report_function_name" {
  value = aws_lambda_function.weekly_report.function_name
}
