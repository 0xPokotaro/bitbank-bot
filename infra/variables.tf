variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-northeast-1"
}

variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "woker"
}
