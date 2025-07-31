#!/bin/bash

# Fail if a subcommand fails
set -e

# Print the commands
set -x

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd $SCRIPT_DIR/..

# Get the current commit hash
COMMIT_HASH=$(git rev-parse HEAD)

npx esbuild src/vae/vae.ts --bundle --format=esm --outfile=dist/vae/vae.js --minify --sourcemap \
  --source-root=https://github.com/mariogemoll/mariogemoll.com/tree/$COMMIT_HASH/frontend/src/vae \
