#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TEMP_DIR}"' EXIT

PAGES_DIR="${TEMP_DIR}/pages"
SITE_DIR="${TEMP_DIR}/site"
mkdir -p "${PAGES_DIR}/previews/pr-99" "${SITE_DIR}/assets"
touch "${PAGES_DIR}/.git"
printf 'old production' > "${PAGES_DIR}/old.txt"
printf 'existing preview' > "${PAGES_DIR}/previews/pr-99/index.html"
printf 'new production' > "${SITE_DIR}/index.html"
printf 'asset' > "${SITE_DIR}/assets/app.js"

"${ROOT_DIR}/scripts/sync-pages-content.sh" production "${PAGES_DIR}" "${SITE_DIR}"
test ! -e "${PAGES_DIR}/old.txt"
test "$(<"${PAGES_DIR}/index.html")" = "new production"
test "$(<"${PAGES_DIR}/previews/pr-99/index.html")" = "existing preview"

printf 'preview 45' > "${SITE_DIR}/index.html"
"${ROOT_DIR}/scripts/sync-pages-content.sh" preview "${PAGES_DIR}" "${SITE_DIR}" 45
test "$(<"${PAGES_DIR}/index.html")" = "new production"
test "$(<"${PAGES_DIR}/previews/pr-45/index.html")" = "preview 45"

"${ROOT_DIR}/scripts/sync-pages-content.sh" cleanup "${PAGES_DIR}" "" 45
test ! -e "${PAGES_DIR}/previews/pr-45"
test "$(<"${PAGES_DIR}/previews/pr-99/index.html")" = "existing preview"

echo "pages-preview tests passed"
