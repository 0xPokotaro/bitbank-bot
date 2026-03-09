output "lambda_function_name" {
  description = "Name of the woker Lambda function"
  value       = aws_lambda_function.woker.function_name
}

output "lambda_function_arn" {
  description = "ARN of the woker Lambda function"
  value       = aws_lambda_function.woker.arn
}
