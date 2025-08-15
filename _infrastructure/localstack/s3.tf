resource "aws_s3_bucket" "dndbeyond_feywild_maps" {
  bucket = "dndbeyond-feywild-maps-${var.env}"

  tags = {
    Name        = "dndbeyond-feywild-maps"
    Environment = "dev"
  }
}

resource "aws_s3_bucket_acl" "dndbeyond_feywild_maps_acl" {
  bucket = aws_s3_bucket.dndbeyond_feywild_maps.bucket
  acl    = "private"
}

resource "aws_s3_bucket_notification" "dndbeyond_feywild_maps_s3_trigger" {
  bucket = aws_s3_bucket.dndbeyond_feywild_maps.id

  queue {
    queue_arn     = aws_sqs_queue.omd_thumbnailer_queue.arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "official/"
  }
}
