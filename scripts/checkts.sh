#!/bin/bash

# Fail if a subcommand fails
set -e

# Print the commands
set -x

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd $SCRIPT_DIR/../frontend

npx eslint -c basic.eslint.config.js basic.eslint.config.js eslint.config.js
npx eslint src
npx tsc --noEmit

cd $SCRIPT_DIR/../builder

npx eslint -c basic.eslint.config.js basic.eslint.config.js eslint.config.js
npx eslint src
npx tsc --noEmit
