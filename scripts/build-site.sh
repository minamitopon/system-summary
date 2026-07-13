#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${ROOT_DIR}/_site"

rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}/assets" "${OUTPUT_DIR}/Oklahoma"

cp "${ROOT_DIR}/index.html" "${OUTPUT_DIR}/index.html"
cp "${ROOT_DIR}/assets/app.js" "${OUTPUT_DIR}/assets/app.js"
cp "${ROOT_DIR}/assets/styles.css" "${OUTPUT_DIR}/assets/styles.css"
cp "${ROOT_DIR}/Oklahoma/README.md" "${OUTPUT_DIR}/Oklahoma/README.md"

while IFS= read -r source_file; do
  relative_path="${source_file#${ROOT_DIR}/}"
  destination="${OUTPUT_DIR}/${relative_path}"
  mkdir -p "$(dirname "${destination}")"
  cp "${source_file}" "${destination}"
done < <(find "${ROOT_DIR}/Oklahoma" -type f -name 'index.bml' | sort)

touch "${OUTPUT_DIR}/.nojekyll"

test -s "${OUTPUT_DIR}/index.html"
test -s "${OUTPUT_DIR}/assets/app.js"
test -s "${OUTPUT_DIR}/assets/styles.css"
