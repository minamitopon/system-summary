#!/usr/bin/env bash

set -euo pipefail

node scripts/test-document-structure.mjs
node scripts/test-text-formatting.mjs
node scripts/test-preview-changes.mjs
node scripts/test-preview-rendering.mjs
./scripts/test-pages-preview.sh
