#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-}"
PAGES_DIR="${2:-}"
SITE_DIR="${3:-}"
PR_NUMBER="${4:-}"

if [[ ! -d "${PAGES_DIR}" ]]; then
  echo "Pages directory does not exist: ${PAGES_DIR}" >&2
  exit 1
fi

validate_site_dir() {
  if [[ ! -s "${SITE_DIR}/index.html" ]]; then
    echo "Built site is missing index.html: ${SITE_DIR}" >&2
    exit 1
  fi
}

validate_pr_number() {
  if [[ ! "${PR_NUMBER}" =~ ^[0-9]+$ ]]; then
    echo "PR number must be numeric" >&2
    exit 1
  fi
}

case "${MODE}" in
  production)
    validate_site_dir
    find "${PAGES_DIR}" -mindepth 1 -maxdepth 1 ! -name .git ! -name previews -exec rm -rf {} +
    cp -R "${SITE_DIR}/." "${PAGES_DIR}/"
    ;;
  preview)
    validate_site_dir
    validate_pr_number
    PREVIEW_DIR="${PAGES_DIR}/previews/pr-${PR_NUMBER}"
    rm -rf "${PREVIEW_DIR}"
    mkdir -p "${PREVIEW_DIR}"
    cp -R "${SITE_DIR}/." "${PREVIEW_DIR}/"
    ;;
  cleanup)
    validate_pr_number
    rm -rf "${PAGES_DIR}/previews/pr-${PR_NUMBER}"
    ;;
  *)
    echo "Usage: $0 production|preview|cleanup PAGES_DIR [SITE_DIR] [PR_NUMBER]" >&2
    exit 1
    ;;
esac
