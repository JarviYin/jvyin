#!/usr/bin/env bash
# 打包 Lambda 代码（esbuild bundle → zip）
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p dist/aws/api dist/aws/events

echo "==> bundling lambda/api.mjs"
npx esbuild lambda/api.mjs --bundle --platform=node --format=cjs --target=node22 \
  --outfile=dist/aws/api/index.cjs --minify --log-level=warning

echo "==> bundling lambda/events.mjs"
npx esbuild lambda/events.mjs --bundle --platform=node --format=cjs --target=node22 \
  --outfile=dist/aws/events/index.cjs --minify --log-level=warning

echo "==> zipping"
(cd dist/aws/api && zip -q -X -r ../api.zip index.cjs)
(cd dist/aws/events && zip -q -X -r ../events.zip index.cjs)
ls -lh dist/aws/*.zip
