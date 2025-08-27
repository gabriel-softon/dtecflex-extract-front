#!/usr/bin/env bash
set -euo pipefail
# set -x  # (opcional) log verboso

# --- NVM ---
export NVM_DIR="/home/softon/.nvm"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Usa LTS; se não existir, instala
nvm use --lts >/dev/null 2>&1 || nvm install --lts

# Garante PATH correto para node/npm (algumas instalações precisam disso)
NODE_BIN="$(nvm which --lts)"
export PATH="$(dirname "$NODE_BIN"):$PATH"

# Sanidade
echo "[INFO] node: $(command -v node) -> $(node -v)"
echo "[INFO] npm:  $(command -v npm)  -> $(npm -v)"

FRONT_DIR="/home/softon/dtecflex-extract-front"
BACK_DIR="/home/softon/dtecflex-extract-api"
STATIC_DIR="$BACK_DIR/static"

cd "$FRONT_DIR"

# Dependências (ci se houver lock; senão install)
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

# Build de produção Angular
npm run build -- --configuration production

# Detecta pasta de build (Angular 15+ usa dist/<app>/browser)
BUILD_OUT="$(find dist -maxdepth 2 -type d -name browser -print -quit || true)"
if [[ -z "$BUILD_OUT" ]]; then
  BUILD_OUT="$(find dist -maxdepth 1 -type d -print -quit || true)"
fi
[[ -n "$BUILD_OUT" ]] || { echo "[ERRO] Não achei a pasta de build do Angular em dist/"; exit 12; }

# Publica no backend/static
mkdir -p "$STATIC_DIR"
if command -v rsync >/dev/null 2>&1; then
  rsync -av --delete "$BUILD_OUT"/ "$STATIC_DIR"/
else
  echo "[WARN] rsync não encontrado; copiando com cp"
  rm -rf "$STATIC_DIR"/*
  cp -a "$BUILD_OUT"/. "$STATIC_DIR"/
fi

echo "[OK] Front publicado em $STATIC_DIR"
