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

# Latest Amazon Linux 2023 AMI (x86_64)
data "aws_ami" "al2023" {
  owners      = ["137112412989"] # Amazon
  most_recent = true
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

# SSH key pair (uploaded to AWS from your local public key)
resource "aws_key_pair" "deployer" {
  key_name   = var.key_name
  public_key = file(var.public_key_path)
}

# Security group: SSH (your IP), HTTP (80), API (5000)
resource "aws_security_group" "qm_sg" {
  name        = "${var.stack_name}-sg"
  description = "Security group for Qualimind dev (frontend+api)"
  vpc_id      = null # default VPC

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
    description = "All egress"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

# EC2 instance with Docker + compose plugin installed via cloud-init
resource "aws_instance" "qm_host" {
  ami           = data.aws_ami.al2023.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.deployer.key_name

  vpc_security_group_ids      = [aws_security_group.qm_sg.id]
  associate_public_ip_address = true

  user_data = <<-CLOUDINIT
#cloud-config
packages:
  - docker
  - git
  - tar
  - unzip
runcmd:
  - systemctl enable docker
  - systemctl start docker
  - usermod -aG docker ec2-user
  - dnf install -y docker-compose-plugin
  - mkdir -p /opt/qualimind
  - chown -R ec2-user:ec2-user /opt/qualimind
CLOUDINIT

  tags = {
    Name = var.stack_name
  }
}

# Generate the frontend deployment.json with the live API URL
resource "local_file" "frontend_deployment_json" {
  filename = var.frontend_deployment_json_path
  content  = templatefile("${path.module}/predeploy.json.tmpl", {
    apiBaseUrl = "http://${aws_instance.qm_host.public_ip}:8000/api"
  })
}
