#!/bin/sh
# Fails if the em dash character appears in any text file outside .git.
if grep -rIl --exclude-dir=.git --exclude-dir=node_modules "$(printf '\342\200\224')" .; then
  echo "Em dash found in the files above. Rewrite the sentence."; exit 1
fi
echo "No em dashes found."
