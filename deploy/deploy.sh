#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BRANCH="${DEPLOY_BRANCH:-master}"

echo "==> Natus deploy (${BRANCH}) — $(pwd)"

if [ ! -f .env.local ]; then
  echo "Erreur: .env.local manquant. Copiez-le avant le déploiement."
  exit 1
fi

if ! grep -qE '^SUPABASE_ACCESS_TOKEN=' .env.local 2>/dev/null; then
  echo "Attention: SUPABASE_ACCESS_TOKEN absent de .env.local — npm run db:migrate échouera"
fi

if ! grep -qE '^SUPABASE_DB_PASSWORD=' .env.local 2>/dev/null; then
  echo "Attention: SUPABASE_DB_PASSWORD absent de .env.local — npm run db:migrate échouera"
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "→ git pull origin ${BRANCH}"
  git pull origin "${BRANCH}"
else
  echo "Attention: pas de dépôt git — pull ignoré"
fi

echo "→ npm install"
npm install

echo "→ npm run db:migrate"
npm run db:migrate

echo "→ npm run build"
npm run build

echo "→ pm2"
if pm2 describe natus >/dev/null 2>&1; then
  pm2 restart natus --update-env
else
  pm2 start deploy/ecosystem.config.cjs
  pm2 save
fi

echo "✓ Déploiement terminé"
pm2 status natus
