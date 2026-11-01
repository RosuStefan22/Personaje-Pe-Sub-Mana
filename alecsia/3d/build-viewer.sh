#!/bin/sh
# Reconstruieste viewer/viewer.js din viewer-src/main.js
cd "$(dirname "$0")/viewer-src" && npm install --silent && npm run build
