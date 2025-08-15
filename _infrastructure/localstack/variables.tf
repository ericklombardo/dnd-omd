variable "env" {
  description = "Environment TF is running in"
  default     = "dev"
  type        = string
}

variable "region" {
  description = "Region of Deployment"
  default     = "us-east-2"
  type        = string
}
