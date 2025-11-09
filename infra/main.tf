terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# --- Default VPC (safer than vpc_id = null) ---
data "aws_vpc" "default" {
  default = true
}

# --- Ubuntu 22.04 LTS (Jammy) AMI by Canonical ---
# Canonical owner ID: 099720109477
data "aws_ami" "ubuntu_2204" {
  owners      = ["099720109477"]
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# --- SSH key pair from your local public key ---
resource "aws_key_pair" "deployer" {
  key_name   = var.key_name
  public_key = file(var.public_key_path)
}

# --- Security group: SSH (22) from your IP, HTTP (80), API (5000) ---
resource "aws_security_group" "qm_sg" {
  name        = "${var.stack_name}-sg"
  description = "Security group for Qualimind dev (frontend+api)"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH from your IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "API :8000"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description      = "All egress"
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

# --- EC2 instance (Ubuntu 22.04) with Docker + Compose plugin via cloud-init ---
resource "aws_instance" "qm_host" {
  ami                    = data.aws_ami.ubuntu_2204.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.deployer.key_name
  vpc_security_group_ids = [aws_security_group.qm_sg.id]
  associate_public_ip_address = true

  user_data = <<-CLOUDINIT
  #cloud-config
  package_update: true
  packages:
    - apt-transport-https
    - ca-certificates
    - curl
    - gnupg
    - lsb-release
  runcmd:
    - apt-get update -y
    - apt-get install -y docker.io docker-compose-plugin git tar unzip
    - systemctl enable docker
    - systemctl start docker
    - usermod -aG docker ubuntu
    - mkdir -p /opt/qualimind
    - chown -R ubuntu:ubuntu /opt/qualimind
  CLOUDINIT

  tags = {
    Name = var.stack_name
  }
}

# --- Generate the frontend predeploy.json with the live API URL ---
resource "local_file" "frontend_predeploy_json" {
  filename = var.frontend_deployment_json_path
  content  = templatefile("${path.module}/predeploy.json.tmpl", {
    apiBaseUrl = "http://${aws_instance.qm_host.public_ip}:5000"
  })
}