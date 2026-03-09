data "archive_file" "woker" {
  type        = "zip"
  source_dir  = "${path.module}/../apps/woker/dist"
  output_path = "${path.module}/build/woker.zip"
}

resource "aws_iam_role" "woker" {
  name = "${var.lambda_function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "woker_basic" {
  role       = aws_iam_role.woker.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "woker" {
  filename         = data.archive_file.woker.output_path
  function_name    = var.lambda_function_name
  role             = aws_iam_role.woker.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.woker.output_base64sha256
  runtime          = "nodejs20.x"
}
