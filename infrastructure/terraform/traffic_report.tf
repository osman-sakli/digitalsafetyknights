# Daily traffic report — reads CloudFront access logs, emails Osman a real
# visitor count, and publishes a 30-day rolling JSON for the stats page.
# Server-side only: no analytics script, no cookies, no third party, which
# keeps the site's "no tracking" promise true.
data "archive_file" "traffic_report" {
  type        = "zip"
  output_path = "${path.module}/.build/traffic_report.zip"
  source {
    content  = file("${path.module}/../../backend/lambda_traffic_report.py")
    filename = "lambda_traffic_report.py"
  }
}

resource "aws_iam_role" "traffic_report" {
  name = "dsk-traffic-report"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "traffic_report_logs" {
  role       = aws_iam_role.traffic_report.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "traffic_report_permissions" {
  name = "traffic-report-permissions"
  role = aws_iam_role.traffic_report.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::dsk-cf-logs-339712706640",
          "arn:aws:s3:::dsk-cf-logs-339712706640/*"
        ]
      },
      {
        # Reads the previous stats file back before appending the new day.
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = ["arn:aws:s3:::digitalsafetyknights.org/content/*"]
      },
      {
        # Needed so a missing stats file returns NoSuchKey, not AccessDenied.
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = ["arn:aws:s3:::digitalsafetyknights.org"]
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "traffic_report" {
  function_name    = "dsk-traffic-report"
  role             = aws_iam_role.traffic_report.arn
  handler          = "lambda_traffic_report.handler"
  runtime          = "python3.12"
  timeout          = 300
  memory_size      = 1024
  filename         = data.archive_file.traffic_report.output_path
  source_code_hash = data.archive_file.traffic_report.output_base64sha256
}

# 09:00 UTC — yesterday's logs are fully delivered by then.
resource "aws_cloudwatch_event_rule" "traffic_report" {
  name                = "dsk-traffic-report-daily"
  description         = "Emails the daily DSK visitor report"
  schedule_expression = "cron(0 9 * * ? *)"
}

resource "aws_cloudwatch_event_target" "traffic_report" {
  rule = aws_cloudwatch_event_rule.traffic_report.name
  arn  = aws_lambda_function.traffic_report.arn
}

resource "aws_lambda_permission" "traffic_report_eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.traffic_report.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.traffic_report.arn
}

output "traffic_report_function_name" {
  value = aws_lambda_function.traffic_report.function_name
}
