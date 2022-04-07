#!/bin/bash

SCRIPT_DIR_PATH=$(dirname "$(readlink -f "$0")")

cd "$SCRIPT_DIR_PATH/../client"
npm run build
rm -rf ../static
mkdir ../static
mv build/* ../static
cd ../server
npm run package
rm -rf ../output
mkdir ../output
mv *.out ../output
rm -rf ../static
