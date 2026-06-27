#!/usr/bin/env bash
# Première installation Natus sur VPS Ubuntu (Contabo, etc.)
# Usage sur le serveur : bash deploy/vps-first-install.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/natus}"
REPO="${REPO:-https://github.com/fleapouissal-lang/natus-sys.git}"
BRANCH="${BRANCH:-master}"

echo "==> Natus VPS — installation (${APP_DIR})"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ca-certificates build-essential

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  echo "→ Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

echo "→ Node $(node -v) · npm $(npm -v)"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "→ PM2"
  npm install -g pm2
fi

mkdir -p "$(dirname "$APP_DIR")"
if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "→ git clone"
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
else
  echo "→ git pull"
  cd "$APP_DIR"
  git fetch origin "$BRANCH"
  git reset --hard "origin/${BRANCH}"
fi

cd "$APP_DIR"

if [[ ! -f .env.local ]]; then
  echo "Erreur: .env.local manquant dans ${APP_DIR}"
  echo "Copiez votre .env.local depuis la machine locale avant de relancer."
  exit 1
fi

echo "→ npm install"
npm install

echo "→ migrations (si token configuré)"
npm run db:migrate:optional

echo "→ npm run build"
npm run build

echo "→ PM2"
if pm2 describe natus >/dev/null 2>&1; then
  pm2 restart natus --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi

pm2 save
if command -v systemctl >/dev/null 2>&1; then
  pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 | bash || true
fi

if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 3002/tcp >/dev/null 2>&1 || true
fi

echo ""
echo "✓ Natus démarré en production (port 3002)"
pm2 status natus
echo ""
echo "URL : $(grep -E '^NEXT_PUBLIC_APP_URL=' .env.local | cut -d= -f2- || echo 'http://VOTRE_IP:3002')"
