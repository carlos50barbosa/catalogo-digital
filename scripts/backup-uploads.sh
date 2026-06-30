#!/usr/bin/env bash
#
# Backup das imagens enviadas (logos e fotos de produto = UPLOAD_DIR).
# Roda na VPS, ideal via cron. Lê o UPLOAD_DIR do .env do projeto e gera um
# .tar.gz com data, mantendo os últimos N backups (rotação).
#
# Uso:    ./scripts/backup-uploads.sh
# Ajuste por variáveis de ambiente (opcional):
#   PROJECT_DIR  raiz do projeto         (default: /var/www/catalogo-digital)
#   BACKUP_DIR   onde salvar os backups  (default: /var/backups/catalogo-uploads)
#   KEEP         quantos backups manter  (default: 14)
#
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/catalogo-digital}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/catalogo-uploads}"
KEEP="${KEEP:-14}"

# Descobre o UPLOAD_DIR do .env (default "./uploads"). Resolve relativo -> raiz
# do projeto (mesma regra do resolveUploadDir do app).
RAW="$(grep -E '^UPLOAD_DIR=' "$PROJECT_DIR/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' || true)"
RAW="${RAW:-./uploads}"
case "$RAW" in
  /*) SRC="$RAW" ;;
  *)  SRC="$PROJECT_DIR/${RAW#./}" ;;
esac

if [ ! -d "$SRC" ]; then
  echo "[backup-uploads] Pasta de uploads não encontrada: $SRC" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/uploads-$STAMP.tar.gz"

tar -czf "$OUT" -C "$(dirname "$SRC")" "$(basename "$SRC")"
echo "[backup-uploads] Criado: $OUT ($(du -h "$OUT" | cut -f1)) — origem: $SRC"

# Rotação: mantém apenas os $KEEP mais recentes.
ls -1t "$BACKUP_DIR"/uploads-*.tar.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f
echo "[backup-uploads] Mantendo os $KEEP backups mais recentes em $BACKUP_DIR."
