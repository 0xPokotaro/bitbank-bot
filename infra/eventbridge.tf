resource "aws_cloudwatch_event_rule" "woker_schedule" {
  name                = "${var.lambda_function_name}-schedule"
  description         = "Invoke woker Lambda every minute"
  schedule_expression = "rate(1 minute)"
}

resource "aws_cloudwatch_event_target" "woker" {
  rule      = aws_cloudwatch_event_rule.woker_schedule.name
  target_id = "WokerLambda"
  arn       = aws_lambda_function.woker.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.woker.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.woker_schedule.arn
}
