resource "aws_sqs_queue" "omd_thumbnailer_queue" {

  name                      = "omd-thumbnailer-${var.env}-queue"
  delay_seconds             = 0
  max_message_size          = 1024
  message_retention_seconds = 600
  receive_wait_time_seconds = 0

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.omd_thumbnailer_queue_deadletter.arn
    maxReceiveCount     = 2
  })
}

output queue_arn {
  value       = aws_sqs_queue.omd_thumbnailer_queue.arn
}


resource "aws_sqs_queue" "omd_thumbnailer_queue_deadletter" {

  name                      = "omd-thumbnailer-${var.env}-queue-deadletter"
  delay_seconds             = 0
  max_message_size          = 1024
  message_retention_seconds = 604800 # retain deadletter messages for 7 days, to troubleshoot
  receive_wait_time_seconds = 0
}
