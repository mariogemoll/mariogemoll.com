#!/usr/bin/env sh
# verify_tsv_sha256_min.sh — TSV verifier (4+ fields), no stat, no awk.
# Format per line: path<TAB>size<TAB>sha256<TAB>ignored...
# Files are expected to be stored with their hash as the filename.
#
# Usage:
#   ./verify_tsv_sha256_min.sh manifest.tsv [base_dir]

set -eu

manifest="$1"
base="${2:-.}"

# choose hash tool
if command -v sha256sum >/dev/null 2>&1; then
  sha256_of() { sha256sum -- "$1" | sed 's/ .*//'; }
elif command -v shasum >/dev/null 2>&1; then
  sha256_of() { shasum -a 256 -- "$1" | sed 's/ .*//'; }
else
  sha256_of() { openssl dgst -sha256 -- "$1" | sed 's/^.* //'; }
fi

# filesize with wc -c
fsize() { wc -c < "$1"; }

fails=0
total=0

# read TSV, take first 3 fields, ignore rest
# shellcheck disable=SC2162
while IFS="$(printf '\t')" read -r path size hash _ || [ -n "${path-}" ]; do
  [ -z "${path-}" ] && continue
  total=$((total+1))
  full="${base%/}/$hash"

  if [ ! -e "$full" ]; then
    echo "FAIL,$path,missing (expected file: $hash)"
    fails=$((fails+1))
    continue
  fi

  asz=$(fsize "$full")
  h2=$(sha256_of "$full")

  ok=1
  reasons=

  [ "$asz" -eq "$size" ] || { ok=0; reasons="size_mismatch(expected=$size,actual=$asz)"; }
  [ "$h2" = "$hash" ] || { ok=0; reasons="${reasons:+$reasons; }hash_mismatch(expected=$hash,actual=$h2)"; }

  if [ "$ok" -eq 1 ]; then
    echo "OK,$path,$size,$hash"
  else
    echo "FAIL,$path,$reasons"
    fails=$((fails+1))
  fi
done < "$manifest"

if [ "$fails" -eq 0 ]; then
  echo "SUMMARY: $total entries verified, all OK"
  exit 0
else
  echo "SUMMARY: $total entries verified, $fails failed"
  exit 1
fi
