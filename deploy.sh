#!/usr/bin/env bash
#
# Deploy ATÔMICO do Catálogo Digital (Nginx + PM2 + MariaDB), na PRÓPRIA VPS.
#
# Por que atômico: `next build` regenera o `.next` por baixo do processo que
# está no ar. Como o Next carrega chunks "lazy" do disco sob demanda (Turbopack
# + output:standalone), durante o build o processo antigo pode tropeçar
# (ChunkLoadError / MODULE_NOT_FOUND) em rotas ainda não visitadas, até o reload.
#
# Solução: o build vai pra uma RELEASE nova (cópia do standalone); um symlink
# `current` aponta pra ela e o PM2 roda de `current/server.js`. O processo
# antigo continua lendo a release ANTIGA (que o build não toca) até drenar.
#
# Pré-requisitos (uma vez — ver README / passos de migração):
#   - UPLOAD_DIR ABSOLUTO no .env (uploads fora do projeto), pois o app passa a
#     rodar a partir da pasta de release, não da raiz do projeto.
#   - ecosystem.config.js com script = "$CURRENT_LINK/server.js".
#
# Uso:   ./deploy.sh                (git pull + migrate + build + release + reload)
#        ./deploy.sh --no-pull      (não roda git pull)
#        ./deploy.sh --no-migrate   (não roda prisma migrate deploy)
#        (flags combináveis, em qualquer ordem)
#
set -euo pipefail

DO_PULL=1
DO_MIGRATE=1
for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=0 ;;
    --no-migrate) DO_MIGRATE=0 ;;
    *) echo "!! opção desconhecida: $arg (use --no-pull e/ou --no-migrate)" >&2; exit 1 ;;
  esac
done

PROJECT_DIR="${PROJECT_DIR:-/var/www/catalogo-digital}"
RELEASES_DIR="${RELEASES_DIR:-/var/www/catalogo-releases}"
CURRENT_LINK="${CURRENT_LINK:-/var/www/catalogo-current}"
PM2_APP="${PM2_APP:-catalogo-digital}"
KEEP="${KEEP:-5}" # quantas releases manter (a anterior PRECISA sobreviver até o processo antigo drenar)

cd "$PROJECT_DIR"
echo "==> Catálogo Digital — deploy atômico"

[ -f .env ] || { echo "!! .env não encontrado em $PROJECT_DIR" >&2; exit 1; }

if [ "$DO_PULL" = 1 ] && [ -d .git ]; then
  echo "==> git pull"
  git pull --ff-only
fi

echo "==> npm ci"
npm ci

if [ "$DO_MIGRATE" = 1 ]; then
  echo "==> prisma migrate deploy"
  npx prisma migrate deploy
else
  echo "==> pulando migrations (--no-migrate)"
fi

echo "==> next build (gera .next/standalone + copia static/public)"
npm run build

STANDALONE="$PROJECT_DIR/.next/standalone"
[ -f "$STANDALONE/server.js" ] || { echo "!! build sem $STANDALONE/server.js" >&2; exit 1; }

# Monta a release a partir do standalone COMPLETO (server.js + node_modules +
# .next/server + .next/static + public).
TS="$(date +%Y%m%d-%H%M%S)"
REL="$RELEASES_DIR/$TS"
echo "==> criando release: $REL"
mkdir -p "$REL"
cp -a "$STANDALONE/." "$REL/"
[ -f "$REL/server.js" ] || { echo "!! release sem server.js" >&2; exit 1; }

# Troca ATÔMICA do symlink current -> nova release.
ln -sfn "$REL" "$CURRENT_LINK"
echo "==> current -> $(readlink -f "$CURRENT_LINK")"

echo "==> PM2 reload (processo novo lê a release nova; o antigo drena a antiga)"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
    pm2 reload "$PM2_APP" --update-env
  else
    pm2 start ecosystem.config.js --update-env
  fi
  pm2 save
else
  echo "!! PM2 não instalado. Rode: npm i -g pm2" >&2
  exit 1
fi

# Limpa releases antigas, mantendo as $KEEP mais recentes (a anterior fica para
# o processo que ainda está drenando).
echo "==> limpando releases antigas (mantendo $KEEP)"
ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -rf

echo "==> Deploy atômico concluído."
