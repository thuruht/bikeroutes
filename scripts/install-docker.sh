#!/usr/bin/env bash
# scripts/install-docker.sh
# Install Docker Engine on Debian 13 (trixie) and add the current user to the docker group.
# Run with: bash scripts/install-docker.sh

set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
  echo "Run this script as a normal user with sudo access; it will prompt for sudo when needed."
  exit 1
fi

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  trixie stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

echo
echo "Docker installed. Log out and back in, then run: docker run hello-world"
