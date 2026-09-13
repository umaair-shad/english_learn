#!/usr/bin/env bash
# Run on a fresh Ubuntu 22.04/24.04 EC2 instance after uploading this repo.
# Needs: domain A-record pointing at this instance, ports 80/443 open.
set -euo pipefail

if [[ ! -f deploy/prod.env ]]; then
  echo "Copy deploy/prod.env.example to deploy/prod.env and edit it first."
  exit 1
fi

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

sudo docker compose -f docker-compose.prod.yml --env-file deploy/prod.env --profile local-db up -d --build
echo "Stack is up. Seed a teacher, restore or load the vocabulary DB, then open https://\$DOMAIN"
