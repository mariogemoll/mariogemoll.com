#!/bin/bash

# Fail if a subcommand fails
set -e

# Print the commands
set -x

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

$SCRIPT_DIR/checkmd.sh
$SCRIPT_DIR/checkcss.sh
$SCRIPT_DIR/checkts.sh
