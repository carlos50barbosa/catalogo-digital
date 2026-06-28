#!/usr/bin/env bash
#
# Deploy do Catálogo Digital numa VPS (Nginx + PM2 + MariaDB).
# Rode na RAIZ do projeto, NA PRÓPRIA VPS (Linux) — o build precisa rodar no
# mesmo SO de produção por causa do engine binário do Prisma.
#
# Uso:   ./deploy.sh           (atualiza: git pull + migrate + build + reload)
#        ./deploy.sh --no-pull (não roda git pull)
#
set -euo pipefail

echo "==> Catálogo Digital — deploy"

if [ -f .env ]; then
  echo "==> .env encontrado."
else
  echo "!! .env não encontrado. Copie de .env.example e configure antes de seguir." >&2
  exit 1
fi

if [ "${1:-}" != "--no-pull" ] && [ -d .git ]; then
  echo "==> git pull"
  git pull --ff-only
fi

echo "==> Instalando dependências (npm ci)"
npm ci

echo "==> Aplicando migrations (prisma migrate deploy)"
npx prisma migrate deploy

echo "==> Build de produção (gera standalone + copia static/public)"
npm run build

echo "==> (Re)iniciando no PM2"
if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrReload ecosystem.config.js --update-env
  pm2 save
else
  echo "!! PM2 não instalado. Rode: npm i -g pm2" >&2
  exit 1
fi

echo "==> Deploy concluído com sucesso."
