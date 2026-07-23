# "This Month in Digital Safety" — automated monthly news digest.
# Runs daily from the 28th onward; the Lambda itself checks whether today is
# actually the last day of the month (tomorrow rolls into a new month) and
# no-ops otherwise. This avoids relying on a fixed day-of-month that doesn't
# exist in every month (e.g. the 31st).
data "archive_file" "monthly_report" {
  type        = "zip"
  output_path = "${path.module}/.build/monthly_report.zip"
  source {
    content  = file("${path.module}/../../backend/lambda_monthly_report.py")
    filename = "lambda_monthly_report.py"
  }
}

resource "aws_iam_role" "monthly_report" {
  name = "dsk-monthly-report"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "monthly_report_logs" {
  role       = aws_iam_role.monthly_report.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "monthly_report_permissions" {
  name = "monthly-report-permissions"
  role = aws_iam_role.monthly_report.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = ["arn:aws:s3:::digitalsafetyknights.org/monthly-report/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = ["arn:aws:cloudfront::339712706640:distribution/E1XP6H2UONLEBO"]
      }
    ]
  })
}

resource "aws_lambda_function" "monthly_report" {
  function_name    = "dsk-monthly-report"
  role             = aws_iam_role.monthly_report.arn
  handler          = "lambda_monthly_report.handler"
  runtime          = "python3.12"
  timeout          = 60
  memory_size      = 256
  filename         = data.archive_file.monthly_report.output_path
  source_code_hash = data.archive_file.monthly_report.output_base64sha256
}

resource "aws_cloudwatch_event_rule" "monthly_report" {
  name                = "dsk-monthly-report-check"
  description         = "Fires daily late in the month; Lambda no-ops except on the actual last day"
  schedule_expression = "cron(0 20 28-31 * ? *)"
}

resource "aws_cloudwatch_event_target" "monthly_report" {
  rule = aws_cloudwatch_event_rule.monthly_report.name
  arn  = aws_lambda_function.monthly_report.arn
}

resource "aws_lambda_permission" "monthly_report_eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.monthly_report.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.monthly_report.arn
}

output "monthly_report_function_name" {
  value = aws_lambda_function.monthly_report.function_name
}
