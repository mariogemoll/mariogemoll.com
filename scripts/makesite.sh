#!/bin/bash

# Fail if a subcommand fails
set -e

# Print the commands
set -x

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

$SCRIPT_DIR/../frontend/scripts/build.sh

cd $SCRIPT_DIR/../builder
npx tsc
node dist/makesite.js
