output "instance_public_ip" {
  value = aws_instance.qm_host.public_ip
}

output "ssh_command" {
  value = "ssh -i ~/.ssh/YOUR_PRIVATE_KEY ec2-user@${aws_instance.qm_host.public_ip}"
  description = "Replace with your private key path"
}
