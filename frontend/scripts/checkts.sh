#!/bin/bash
# SPDX-FileCopyrightText: 2026 Mario Gemoll
# SPDX-License-Identifier: 0BSD


# Fail if a subcommand fails
set -e

# Print the commands
set -x

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd "$SCRIPT_DIR/.."

if command -v nproc >/dev/null 2>&1; then
  max_jobs=$(nproc)
elif command -v sysctl >/dev/null 2>&1; then
  max_jobs=$(sysctl -n hw.ncpu)
else
  max_jobs=4
fi

if [ "$max_jobs" -lt 1 ]; then
  max_jobs=1
fi

configs=(
  tsconfig.pages/vae.json
  tsconfig.pages/parallel-corpus-viewer.json
  tsconfig.pages/normalizing-flows.json
  tsconfig.pages/attention-is-all-you-need.json
  tsconfig.pages/flow-matching.json
  tsconfig.pages/diffusion.json
  tsconfig.pages/reinforcement-learning.json
)

printf '%s\n' "${configs[@]}" | xargs -n 1 -P "$max_jobs" sh -c '
  pnpm exec tsc --noEmit -p "$1"
' sh
