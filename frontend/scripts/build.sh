#!/bin/bash

# Fail if a subcommand fails
set -e

# Print the commands
set -x

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd $SCRIPT_DIR/..

# Get the current commit hash
COMMIT_HASH=$(git rev-parse HEAD)

pnpm exec esbuild src/vae/vae.ts --bundle --format=esm --outfile=dist/vae/vae.js --minify --sourcemap \
  --source-root=https://github.com/mariogemoll/mariogemoll.com/tree/$COMMIT_HASH/frontend/src/vae \

pnpm exec esbuild src/parallel-corpus-viewer/parallel-corpus-viewer.ts --bundle --format=esm \
  --outfile=dist/parallel-corpus-viewer/parallel-corpus-viewer.js --minify --sourcemap \
  --source-root=https://github.com/mariogemoll/mariogemoll.com/tree/$COMMIT_HASH/frontend/src/parallel-corpus-viewer

pnpm exec esbuild src/normalizing-flows/normalizing-flows.ts --bundle --format=esm \
  --outfile=dist/normalizing-flows/normalizing-flows.js --minify --sourcemap \
  --source-root=https://github.com/mariogemoll/mariogemoll.com/tree/$COMMIT_HASH/frontend/src/normalizing-flows

pnpm exec esbuild src/attention-is-all-you-need/attention-is-all-you-need.ts --bundle --format=esm \
  --outfile=dist/attention-is-all-you-need/attention-is-all-you-need.js --minify --sourcemap \
  --source-root=https://github.com/mariogemoll/mariogemoll.com/tree/$COMMIT_HASH/frontend/src/attention-is-all-you-need \
  --alias:web-ui-common=./node_modules/web-ui-common/src

pnpm exec esbuild src/flow-matching/flow-matching.ts --bundle --format=esm \
  --outfile=dist/flow-matching/flow-matching.js --minify --sourcemap \
  --source-root=https://github.com/mariogemoll/mariogemoll.com/tree/$COMMIT_HASH/frontend/src/flow-matching
