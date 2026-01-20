#!/bin/bash
# SPDX-FileCopyrightText: 2025 Mario Gemoll
# SPDX-License-Identifier: 0BSD


# Fail if a subcommand fails
set -e

# Print the commands
set -x

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd $SCRIPT_DIR/../builder
npx stylelint '../content/**/*.css'
