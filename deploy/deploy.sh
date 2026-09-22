#!/usr/bin/env bash
# Desplegament de MY GYM. Cal executar `pnpm build` abans. Pensat per WSL o
# Linux amb `rsync` instal·lat (a Windows sense WSL, fes servir `scp -r`
# manualment — vegeu el README). Ordre: (1) puja tot EXCEPTE sw.js, (2)
# comprova el desplegament, (3) només si passa, publica sw.js i neteja
# fitxers orfes (mai els chunks de /_next/static/ d'una versió anterior:
# les pestanyes que encara hi facin servidor precisen poder-los carregar).
set -euo pipefail

HOST="${1:?Ús: deploy.sh usuari@servidor:/var/www/gym https://gym.example.com}"
URL="${2:?Ús: deploy.sh usuari@servidor:/var/www/gym https://gym.example.com}"

cd "$(dirname "$0")/.."

if [ ! -f out/sw.js ]; then
  echo "No hi ha out/sw.js — executa 'pnpm build' primer." >&2
  exit 1
fi

echo "1/3 Pujant l'aplicació (sw.js encara no)…"
rsync -az --chmod=D755,F644 --no-owner --no-group --exclude=/sw.js out/ "$HOST/"

echo "2/3 Comprovant el desplegament…"
node scripts/smoke.mjs "$URL"

echo "3/3 Publicant sw.js i netejant fitxers orfes…"
rsync -az --chmod=F644 --no-owner --no-group out/sw.js "$HOST/sw.js"
rsync -az --delete --chmod=D755,F644 --no-owner --no-group \
  --exclude=/_next/static/ --exclude=/sw.js \
  out/ "$HOST/"

echo "Fet."
