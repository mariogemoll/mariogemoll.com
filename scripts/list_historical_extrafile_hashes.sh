#!/usr/bin/env sh
# SPDX-FileCopyrightText: 2026 Mario Gemoll
# SPDX-License-Identifier: 0BSD

# Prints each distinct SHA-256 hash found in the third column of every
# reachable historical revision of an extrafiles TSV manifest. It can also
# report hashes that are absent from a directory of hash-named files or files
# in that directory that have no historical manifest entry.

set -eu

usage() {
  echo "Usage: $(basename "$0") [--manifest manifest-path] [--compare directory]"
  echo
  echo "Prints unique hashes from column three of every Git revision of a TSV manifest."
  echo "The manifest path is relative to the repository root."
  echo
  echo "Options:"
  echo "  --manifest PATH      Manifest path (default: content/extrafiles.tsv)"
  echo "  --compare DIRECTORY  Report missing historical hashes and superfluous files."
  echo "                       Use host:/path for a directory on an SSH host."
}

manifest="content/extrafiles.tsv"
compare_directory=""

while [ $# -gt 0 ]; do
  case "$1" in
    --manifest)
      [ $# -ge 2 ] || { echo "ERROR: --manifest requires a path" >&2; exit 2; }
      manifest="$2"
      shift 2
      ;;
    --compare)
      [ $# -ge 2 ] || { echo "ERROR: --compare requires a directory" >&2; exit 2; }
      compare_directory="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

repo_root=$(git rev-parse --show-toplevel)

case "$manifest" in
  /*)
    echo "ERROR: manifest path must be relative to the repository root" >&2
    exit 2
    ;;
esac

historical_entries() {
  git -C "$repo_root" log --all --full-history --format='%H' -- "$manifest" |
  while IFS= read -r commit; do
    git -C "$repo_root" show "$commit:$manifest" 2>/dev/null || true
  done |
  awk -F '\t' '
    NF >= 3 {
      description = $4
      for (field = 5; field <= NF; field++) {
        description = description FS $field
      }
      print $3 FS $1 FS description
    }
  ' |
  LC_ALL=C sort -u
}

if [ -z "$compare_directory" ]; then
  historical_entries | cut -f 1 | LC_ALL=C sort -u
  exit 0
fi

tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/historical-extrafile-hashes.XXXXXX")
trap 'rm -rf "$tmp_dir"' EXIT HUP INT TERM

historical_entries > "$tmp_dir/metadata"
cut -f 1 "$tmp_dir/metadata" | LC_ALL=C sort -u > "$tmp_dir/historical"

case "$compare_directory" in
  *:*)
    ssh_host=${compare_directory%%:*}
    remote_directory=${compare_directory#*:}
    [ -n "$ssh_host" ] && [ -n "$remote_directory" ] || {
      echo "ERROR: SSH directories must use host:/path syntax" >&2
      exit 2
    }
    quoted_directory=$(printf '%s' "$remote_directory" | sed "s/'/'\\\\''/g; s/^/'/; s/$/'/")
    ssh "$ssh_host" "find $quoted_directory -maxdepth 1 -type f -exec basename {} \\;" > "$tmp_dir/available"
    ;;
  *)
    [ -d "$compare_directory" ] || {
      echo "ERROR: directory not found: $compare_directory" >&2
      exit 2
    }
    find "$compare_directory" -maxdepth 1 -type f -exec basename {} \; > "$tmp_dir/available"
    ;;
esac

LC_ALL=C sort -u "$tmp_dir/available" -o "$tmp_dir/available"
comm -23 "$tmp_dir/historical" "$tmp_dir/available" > "$tmp_dir/missing"
comm -13 "$tmp_dir/historical" "$tmp_dir/available" > "$tmp_dir/superfluous"

print_report() {
  report_type="$1"
  hash_file="$2"

  awk -F '\t' -v report_type="$report_type" '
    NR == FNR {
      entry_details = $2
      for (field = 3; field <= NF; field++) {
        entry_details = entry_details FS $field
      }
      if (known[$1] == "") {
        known[$1] = entry_details
      } else {
        known[$1] = known[$1] "\034" entry_details
      }
      next
    }
    {
      if ($1 in known) {
        count = split(known[$1], entry_list, "\034")
        for (entry_index = 1; entry_index <= count; entry_index++) {
          print report_type FS $1 FS entry_list[entry_index]
        }
      } else {
        print report_type FS $1 FS "(no manifest entry)"
      }
    }
  ' "$tmp_dir/metadata" "$hash_file"
}

historical_count=$(wc -l < "$tmp_dir/historical" | tr -d ' ')
present_count=$(comm -12 "$tmp_dir/historical" "$tmp_dir/available" | wc -l | tr -d ' ')
missing_count=$(wc -l < "$tmp_dir/missing" | tr -d ' ')
superfluous_count=$(wc -l < "$tmp_dir/superfluous" | tr -d ' ')

if [ "$missing_count" -eq 0 ] && [ "$superfluous_count" -eq 0 ]; then
  echo "All $historical_count historical hashes are present, with no superfluous files."
  exit 0
fi

print_report "MISSING" "$tmp_dir/missing"
print_report "SUPERFLUOUS" "$tmp_dir/superfluous"
echo "SUMMARY: $present_count of $historical_count historical hashes present; $missing_count missing; $superfluous_count superfluous." >&2
exit 1
