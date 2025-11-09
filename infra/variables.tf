variable "aws_region" {
  type    = string
  default = "eu-central-1"
}

variable "stack_name" {
  type    = string
  default = "qualimind-predeploy"
}

# t3.micro is free-tier eligible in many regions (t2.micro is also fine)
variable "instance_type" {
  type    = string
  default = "t3.micro"
}

# Use an existing public key on your machine
variable "key_name" {
  type        = string
  description = "AWS key pair name to create/use for SSH"
}

variable "public_key_path" {
  type        = string
  description = "Path to your local .pub key (e.g. ~/.ssh/qualimind-dev.pub)"
}

# Your public IP in CIDR (opens SSH)
variable "my_ip_cidr" {
  type        = string
  description = "Your public IP in CIDR format (e.g. 203.0.113.5/32)"
}

# Where Terraform will write the frontend JSON (relative to infra/)
variable "frontend_deployment_json_path" {
  type        = string
  default     = "../frontend/src/config/predeploy.json"
}
