# "Digital Safety Watch" — live homepage news feed.
# Runs every 12 hours, scans Google News for child-digital-safety stories,
# resolves + verifies each link, summarizes, and publishes JSON to S3 for
# the homepage widget to render.
data "archive_file" "news_feed" {
  type        = "zip"
  output_path = "${path.module}/.build/news_feed.zip"
  source {
    content  = file("${path.module}/../../backend/lambda_news_feed.py")
    filename = "lambda_news_feed.py"
  }
}

resource "aws_iam_role" "news_feed" {
  name = "dsk-news-feed"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "news_feed_logs" {
  role       = aws_iam_role.news_feed.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "news_feed_permissions" {
  name = "news-feed-permissions"
  role = aws_iam_role.news_feed.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        # GetObject is needed to read the running archive back before
        # appending — without it the archive would be rebuilt from scratch
        # every run and lose all history.
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = ["arn:aws:s3:::digitalsafetyknights.org/content/*"]
      },
      {
        # Without ListBucket, S3 answers a *missing* key with AccessDenied
        # instead of NoSuchKey, so the "no archive yet" first-run path can't
        # be told apart from a real permissions failure.
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = ["arn:aws:s3:::digitalsafetyknights.org"]
      },
      {
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = ["arn:aws:cloudfront::339712706640:distribution/E1XP6H2UONLEBO"]
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = ["arn:aws:secretsmanager:us-east-1:339712706640:secret:dsk-shorts/fal-api-key-*"]
      }
    ]
  })
}

resource "aws_lambda_function" "news_feed" {
  function_name    = "dsk-news-feed"
  role             = aws_iam_role.news_feed.arn
  handler          = "lambda_news_feed.handler"
  runtime          = "python3.12"
  timeout          = 300
  memory_size      = 512
  filename         = data.archive_file.news_feed.output_path
  source_code_hash = data.archive_file.news_feed.output_base64sha256
}

resource "aws_cloudwatch_event_rule" "news_feed" {
  name                = "dsk-news-feed-12h"
  description         = "Refreshes the homepage Digital Safety Watch feed every 12 hours"
  schedule_expression = "cron(0 2,14 * * ? *)"
}

resource "aws_cloudwatch_event_target" "news_feed" {
  rule = aws_cloudwatch_event_rule.news_feed.name
  arn  = aws_lambda_function.news_feed.arn
}

resource "aws_lambda_permission" "news_feed_eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.news_feed.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.news_feed.arn
}

output "news_feed_function_name" {
  value = aws_lambda_function.news_feed.function_name
}
